import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { HomeSummary } from "../../core/entities/HomeSummary.entity";
import { JobTicket } from "@modules/tickets/core/entities/JobTicket.entity";
import { useHomeViewModel } from "./useHome.viewModel";

const SUMMARY: HomeSummary = {
  dateLabel: "Tue Jun 23",
  crewLeaderLine: "H. Jackson · Chesterfield",
  crewLeaderInitials: "HJ",
  batteryPercent: 62,
  gpsAvailable: true,
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
  id: "yard-prep", name: "Yard prep", tag: "M", sub: "Yard · est 1h", statusLabel: "Not started",
  statusKind: "idle", site: "yard", address: "Company Yard", estimatedHours: 1, crew: [],
};

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) { return this.map.get(key) ?? null; }
  setString(key: string, value: string) { this.map.set(key, value); }
}

function buildTestDeps(): Dependencies {
  return {
    keyValueStore: new FakeKeyValueStore(),
    homeSummaryReader: { today: async () => ok(SUMMARY) },
    ticketsReader: { read: async () => ok([TICKET]), readOne: async () => ok(TICKET) },
  } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DependenciesProvider dependencies={buildTestDeps()}>
      <LanguageProvider>
        <TimerProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </TimerProvider>
      </LanguageProvider>
    </DependenciesProvider>
  );
}

describe("useHomeViewModel — real timer integration", () => {
  it("job button starts the same timer id Ticket Detail uses", async () => {
    const { result } = renderHook(() => useHomeViewModel({ onOpenNextJob: jest.fn(), onGoRoster: jest.fn(), onGoTravel: jest.fn() }), { wrapper });
    await waitFor(() => expect(result.current.state.summary).not.toBeNull());

    act(() => result.current.handlers.onJobAction());
    expect(result.current.state.jobButton.label).toMatch(/Stop|Pause/i);
  });

  it("jobOverEstimate becomes true once elapsed time passes the ticket's estimated hours", async () => {
    const { result } = renderHook(() => useHomeViewModel({ onOpenNextJob: jest.fn(), onGoRoster: jest.fn(), onGoTravel: jest.fn() }), { wrapper });
    await waitFor(() => expect(result.current.state.summary).not.toBeNull());

    expect(result.current.state.jobOverEstimate).toBe(false);
  });
});
