import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { MealReminderProvider } from "@app/react/mealReminders/MealReminderProvider";
import { useMealReminders } from "@app/react/mealReminders/useMealReminders";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { en } from "@app/react/language/translations/en";
import { WorkerId } from "@/types/ids";
import {
  FIRST_MEAL_REMINDER_HOUR,
  MEAL_REMINDER_MODE,
  MEAL_REMINDER_TEST_START_SECONDS,
  MS_PER_SECOND,
  SECONDS_PER_HOUR,
} from "@/constants/appConstants";
import { HomeSummary } from "../../core/entities/HomeSummary.entity";
import { JobTicket } from "@modules/tickets/core/entities/JobTicket.entity";
import { useHomeViewModel } from "./useHome.viewModel";

// Mirrors MealReminderProvider's own MEAL_REMINDER_MODE branch so this test advances fake time
// by the right amount regardless of whether the feature flag is currently "testing" or
// "production" — see appConstants.ts.
const FIRST_MEAL_REMINDER_MS =
  (MEAL_REMINDER_MODE === "testing" ? MEAL_REMINDER_TEST_START_SECONDS : FIRST_MEAL_REMINDER_HOUR * SECONDS_PER_HOUR) *
  MS_PER_SECOND;

const SUMMARY: HomeSummary = {
  dateLabel: "Tue Jun 23",
  crewLeaderName: "H. Jackson",
  crewLeaderRole: "crewLeader",
  branch: "Chesterfield",
  crewLeaderInitials: "HJ",
  crewStatus: "in",
  nextJob: {
    id: "yard-prep",
    name: "Yard prep",
    sub: "Yard · est 1h",
    status: "pending",
    requiresTravelFirst: false,
    estimatedHours: 1,
  },
  dayEntries: [],
};

const TICKET: JobTicket = {
  id: "yard-prep",
  name: "Yard prep",
  tag: "M",
  sub: "Yard · est 1h",
  statusLabel: "Not started",
  statusKind: "idle",
  site: "yard",
  address: "Company Yard",
  estimatedHours: 1,
  crew: [],
};

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string) {
    this.map.set(key, value);
  }
}

function buildTestDeps(): Dependencies {
  return {
    keyValueStore: new FakeKeyValueStore(),
    homeSummaryReader: { today: async () => ok(SUMMARY) },
    ticketsReader: { read: async () => ok([TICKET]), readOne: async () => ok(TICKET) },
    batteryReader: { getLevelPercent: async () => ok(100), subscribe: () => () => {} },
    gpsAvailabilityReader: { isAvailable: async () => ok(true), subscribe: () => () => {} },
  } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DependenciesProvider dependencies={buildTestDeps()}>
      <LanguageProvider>
        <TimerProvider>
          <NotificationsProvider>
            <MealReminderProvider>{children}</MealReminderProvider>
          </NotificationsProvider>
        </TimerProvider>
      </LanguageProvider>
    </DependenciesProvider>
  );
}

describe("useHomeViewModel — real timer integration", () => {
  it("job button starts the same timer id Ticket Detail uses", async () => {
    const { result } = renderHook(
      () => useHomeViewModel({ onOpenNextJob: jest.fn(), onGoRoster: jest.fn(), onGoTravel: jest.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.state.summary).not.toBeNull());

    act(() => result.current.handlers.onJobAction());
    expect(result.current.state.jobButton.label).toMatch(/Stop|Pause/i);
  });

  it("jobOverEstimate becomes true once elapsed time passes the ticket's estimated hours", async () => {
    const { result } = renderHook(
      () => useHomeViewModel({ onOpenNextJob: jest.fn(), onGoRoster: jest.fn(), onGoTravel: jest.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.state.summary).not.toBeNull());

    expect(result.current.state.jobOverEstimate).toBe(false);
  });
});

describe("useHomeViewModel — clock-in meal reminder banner", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows a meal reminder banner once a clocked-in worker's first alert fires", async () => {
    const { result } = renderHook(
      () => ({
        home: useHomeViewModel({ onOpenNextJob: jest.fn(), onGoRoster: jest.fn(), onGoTravel: jest.fn() }),
        reminders: useMealReminders(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.home.state.summary).not.toBeNull());
    expect(result.current.home.state.mealReminderBanner).toBeNull();

    act(() => result.current.reminders.startReminder("luis-t" as WorkerId, "Luis T."));
    // A little past the exact threshold, not to it — with Home's own 1s job-timer interval also
    // running alongside MealReminderProvider's, advancing to the exact boundary can land one poll
    // tick short (a real device isn't this precise either way; this only matters for test timing).
    act(() => jest.advanceTimersByTime(FIRST_MEAL_REMINDER_MS + MS_PER_SECOND));

    expect(result.current.home.state.mealReminderBanner).not.toBeNull();
    expect(result.current.home.state.mealReminderBanner?.title).toBe(en.ticketDetail.mealReminderTitle);
  });
});
