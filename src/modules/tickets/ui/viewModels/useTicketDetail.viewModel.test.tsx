import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { JobTicket } from "../../core/entities/JobTicket.entity";
import { useTicketDetailViewModel } from "./useTicketDetail.viewModel";

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

const JOB_A: JobTicket = {
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
  nextTicketId: "cornerstone-mall",
};
const JOB_B: JobTicket = {
  id: "cornerstone-mall",
  name: "Cornerstone Mall",
  tag: "E",
  sub: "Job site · est 3h",
  statusLabel: "Not started",
  statusKind: "idle",
  site: "cornerstone",
  address: "100 Main St",
  estimatedHours: 3,
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
    ticketsReader: { read: async () => ok([TICKET]), readOne: async () => ok(TICKET) },
  } as unknown as Dependencies;
}

function buildTravelTestDeps(): Dependencies {
  const tickets = [JOB_A, JOB_B];
  return {
    keyValueStore: new FakeKeyValueStore(),
    ticketsReader: {
      read: async () => ok(tickets),
      readOne: async (id: string) => {
        const found = tickets.find((t) => t.id === id);
        return found ? ok(found) : ok(JOB_A);
      },
    },
  } as unknown as Dependencies;
}

function travelWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DependenciesProvider dependencies={buildTravelTestDeps()}>
      <LanguageProvider>
        <TimerProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </TimerProvider>
      </LanguageProvider>
    </DependenciesProvider>
  );
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

describe("useTicketDetailViewModel — job timer", () => {
  it("starts not running, and onToggleJob starts it", async () => {
    const { result } = renderHook(
      () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
      { wrapper },
    );
    await act(async () => {});
    expect(result.current.state.jobRunning).toBe(false);

    act(() => result.current.handlers.onToggleJob());
    expect(result.current.state.jobRunning).toBe(true);
  });

  it("pausing the job stops the timer without resetting it", async () => {
    const { result } = renderHook(
      () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
      { wrapper },
    );
    await act(async () => {});

    act(() => result.current.handlers.onToggleJob());
    act(() => result.current.handlers.onToggleJobPause());
    expect(result.current.state.jobRunning).toBe(true);
    expect(result.current.state.jobPaused).toBe(true);
  });

  describe("with fake timers (real-time counting behavior)", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("actually counts the job timer up over real elapsed time, not just a running flag", async () => {
      const { result } = renderHook(
        () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
        { wrapper },
      );
      await act(async () => {});

      act(() => result.current.handlers.onToggleJob());
      expect(result.current.state.jobTimerValue).toBe("00:00");

      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(result.current.state.jobTimerValue).toBe("00:05");
    });

    it("pausing for a meal break stops the job clock without resetting accumulated time", async () => {
      const { result } = renderHook(
        () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
        { wrapper },
      );
      await act(async () => {});

      act(() => result.current.handlers.onToggleJob());
      act(() => jest.advanceTimersByTime(10000));
      expect(result.current.state.jobTimerValue).toBe("00:10");

      act(() => result.current.handlers.onToggleJobPause());
      act(() => jest.advanceTimersByTime(20000));
      // Job clock stayed frozen at 10s while paused for the break — it did not keep
      // accumulating, and it was not reset back to 0 either.
      expect(result.current.state.jobTimerValue).toBe("00:10");
    });

    it("cannot end the meal break before the 30-minute minimum has really elapsed — the guard rejects the call, not just disables a button", async () => {
      const { result } = renderHook(
        () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
        { wrapper },
      );
      await act(async () => {});

      act(() => result.current.handlers.onToggleJob());
      act(() => result.current.handlers.onToggleJobPause());
      act(() => result.current.handlers.onStartMeal());
      expect(result.current.state.mealPhase).toBe("active");

      // Try to end it after only 29 minutes — should be rejected.
      act(() => jest.advanceTimersByTime(29 * 60 * 1000));
      expect(result.current.state.mealCanEnd).toBe(false);
      act(() => result.current.handlers.onEndMeal());
      expect(result.current.state.mealPhase).toBe("active");

      // Cross the 30-minute minimum — now it's allowed.
      act(() => jest.advanceTimersByTime(60 * 1000));
      expect(result.current.state.mealCanEnd).toBe(true);
      act(() => result.current.handlers.onEndMeal());
      expect(result.current.state.mealPhase).toBe("done");
    });

    it("'Continue Job' resets the meal timer and resumes the job timer", async () => {
      const { result } = renderHook(
        () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
        { wrapper },
      );
      await act(async () => {});

      act(() => result.current.handlers.onToggleJob());
      act(() => jest.advanceTimersByTime(60 * 1000)); // job at 1:00
      act(() => result.current.handlers.onToggleJobPause());
      act(() => result.current.handlers.onStartMeal());
      act(() => jest.advanceTimersByTime(30 * 60 * 1000));
      act(() => result.current.handlers.onEndMeal());
      expect(result.current.state.mealPhase).toBe("done");

      act(() => result.current.handlers.onContinueJob());
      expect(result.current.state.mealPhase).toBe("none");
      expect(result.current.state.mealTimerValue).toBe("00:00");
      expect(result.current.state.jobRunning).toBe(true);

      act(() => jest.advanceTimersByTime(5000));
      // Job timer resumed counting up from where it was frozen (1:00), not from 0.
      expect(result.current.state.jobTimerValue).toBe("01:05");
    });
  });

  describe("over-estimate detection", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("jobOverEstimate stays false until elapsed job time exceeds the ticket's estimatedHours, then flips true", async () => {
      const { result } = renderHook(
        () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
        { wrapper },
      );
      await act(async () => {});
      // TICKET.estimatedHours is 1, i.e. 3600 seconds.

      act(() => result.current.handlers.onToggleJob());
      act(() => jest.advanceTimersByTime(3599 * 1000));
      expect(result.current.state.jobOverEstimate).toBe(false);

      act(() => jest.advanceTimersByTime(2 * 1000));
      expect(result.current.state.jobOverEstimate).toBe(true);
    });
  });
});

const SAME_SITE_JOB: JobTicket = {
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
  nextTicketId: "yard-followup",
};
const SAME_SITE_NEXT: JobTicket = {
  id: "yard-followup",
  name: "Yard follow-up",
  tag: "M",
  sub: "Yard · est 1h",
  statusLabel: "Not started",
  statusKind: "idle",
  site: "yard",
  address: "Company Yard",
  estimatedHours: 1,
  crew: [],
};

function buildSameSiteTestDeps(): Dependencies {
  const tickets = [SAME_SITE_JOB, SAME_SITE_NEXT];
  return {
    keyValueStore: new FakeKeyValueStore(),
    ticketsReader: {
      read: async () => ok(tickets),
      readOne: async (id: string) => {
        const found = tickets.find((t) => t.id === id);
        return found ? ok(found) : ok(SAME_SITE_JOB);
      },
    },
  } as unknown as Dependencies;
}

function sameSiteWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DependenciesProvider dependencies={buildSameSiteTestDeps()}>
      <LanguageProvider>
        <TimerProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </TimerProvider>
      </LanguageProvider>
    </DependenciesProvider>
  );
}

describe("useTicketDetailViewModel — travel prompt", () => {
  it("shows a travel prompt with 'start travel' copy once the job is stopped, when the next job is at a different site", async () => {
    const { result } = renderHook(
      () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
      { wrapper: travelWrapper },
    );
    await act(async () => {});

    act(() => result.current.handlers.onToggleJob()); // start
    act(() => result.current.handlers.onToggleJob()); // stop

    expect(result.current.state.travelPrompt).not.toBeNull();
    expect(result.current.state.travelPrompt?.buttonLabel).toMatch(/travel/i);
  });

  it("shows a travel prompt with 'continue next job' copy once the job is stopped, when the next job is at the same site", async () => {
    const { result } = renderHook(
      () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
      { wrapper: sameSiteWrapper },
    );
    await act(async () => {});

    act(() => result.current.handlers.onToggleJob()); // start
    act(() => result.current.handlers.onToggleJob()); // stop

    expect(result.current.state.travelPrompt).not.toBeNull();
    expect(result.current.state.travelPrompt?.buttonLabel).toMatch(/continue next job/i);
  });

  it("dismissing the prompt clears it without navigating", async () => {
    const onGoTravel = jest.fn();
    const { result } = renderHook(
      () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel }),
      { wrapper: travelWrapper },
    );
    await act(async () => {});

    act(() => result.current.handlers.onToggleJob());
    act(() => result.current.handlers.onToggleJob());
    act(() => result.current.handlers.onDismissTravelPrompt());

    expect(result.current.state.travelPrompt).toBeNull();
    expect(onGoTravel).not.toHaveBeenCalled();
  });

  it("tapping the prompt's primary action navigates with the current and next ticket ids", async () => {
    const onGoTravel = jest.fn();
    const { result } = renderHook(
      () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel }),
      { wrapper: travelWrapper },
    );
    await act(async () => {});

    act(() => result.current.handlers.onToggleJob());
    act(() => result.current.handlers.onToggleJob());
    act(() => result.current.handlers.onStartTravelToNext());

    expect(onGoTravel).toHaveBeenCalledWith("yard-prep", "cornerstone-mall");
  });

  it("stopping the job again after dismissing re-shows the prompt (dismissal resets per-stop)", async () => {
    const { result } = renderHook(
      () => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn(), onGoTravel: jest.fn() }),
      { wrapper: travelWrapper },
    );
    await act(async () => {});

    act(() => result.current.handlers.onToggleJob()); // start
    act(() => result.current.handlers.onToggleJob()); // stop
    act(() => result.current.handlers.onDismissTravelPrompt());
    expect(result.current.state.travelPrompt).toBeNull();

    act(() => result.current.handlers.onToggleJob()); // start again
    act(() => result.current.handlers.onToggleJob()); // stop again
    expect(result.current.state.travelPrompt).not.toBeNull();
  });
});
