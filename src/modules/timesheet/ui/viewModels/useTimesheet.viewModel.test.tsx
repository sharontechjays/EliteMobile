import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { DailyTimesheet } from "../../core/entities/TimesheetEntry.entity";
import { useTimesheetViewModel } from "./useTimesheet.viewModel";

const TIMESHEET: DailyTimesheet = {
  crew: [
    {
      id: "roy-brown",
      name: "Roy Brown",
      totalHoursLabel: "8.5h",
      entries: [{ time: "7:02", label: "Clock-in", statusKind: "neutral" }],
    },
    {
      id: "brent-m",
      name: "Brent M.",
      totalHoursLabel: "7.0h",
      entries: [{ time: "7:05", label: "Clock-in", statusKind: "neutral" }],
    },
  ],
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
    timesheetReader: { read: async () => ok(TIMESHEET) },
  } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DependenciesProvider dependencies={buildTestDeps()}>
      <LanguageProvider>
        <NotificationsProvider>{children}</NotificationsProvider>
      </LanguageProvider>
    </DependenciesProvider>
  );
}

describe("useTimesheetViewModel — crew acknowledgement/dispute", () => {
  it("starts on the first crew member, pending", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});
    expect(result.current.state.workerName).toBe("Roy Brown");
    expect(result.current.state.progressLabel).toBe("0 of 2 done");
    expect(result.current.state.pending).toBe(true);
    expect(result.current.state.allDone).toBe(false);
  });

  it("onAck advances to the next crew member and clears the reason", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onChangeReason("typing something first"));
    act(() => result.current.handlers.onAck());

    expect(result.current.state.workerName).toBe("Brent M.");
    expect(result.current.state.progressLabel).toBe("1 of 2 done");
    expect(result.current.state.reason).toBe("");
  });

  it("onDispute is a no-op with an empty reason", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onDispute());
    expect(result.current.state.workerName).toBe("Roy Brown");
  });

  it("onDispute with a reason advances to the next crew member", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onChangeReason("Missing travel time"));
    act(() => result.current.handlers.onDispute());

    expect(result.current.state.workerName).toBe("Brent M.");
  });

  it("allDone becomes true once every crew member has responded", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onAck());
    act(() => result.current.handlers.onAck());

    expect(result.current.state.allDone).toBe(true);
    expect(result.current.state.pending).toBe(false);
  });

  it("onSubmit does not call onSubmitted while acknowledgements are incomplete", async () => {
    const onSubmitted = jest.fn();
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted }), { wrapper });
    await act(async () => {});

    await act(async () => result.current.handlers.onSubmit());
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("onSubmit calls onSubmitted once all crew have responded", async () => {
    const onSubmitted = jest.fn();
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onAck());
    act(() => result.current.handlers.onAck());
    await act(async () => result.current.handlers.onSubmit());

    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });
});
