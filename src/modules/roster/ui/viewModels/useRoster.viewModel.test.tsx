import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { RosterWorker } from "../../core/entities/RosterWorker.entity";
import { DirectoryWorker } from "../../core/entities/DirectoryWorker.entity";
import { useRosterViewModel } from "./useRoster.viewModel";

const WORKERS: RosterWorker[] = [
  { id: "roy-brown" as WorkerId, name: "Roy Brown", initials: "RB", statusText: "Clocked in", statusKind: "job", employeeCode: "4821" },
  { id: "luis-t" as WorkerId, name: "Luis T.", initials: "LT", statusText: "Not clocked in", statusKind: "idle", employeeCode: "1029" },
];
const DIRECTORY: DirectoryWorker[] = [
  { id: "maria-g", name: "Maria Gonzalez", assignedTo: null },
  { id: "kevin-t", name: "Kevin Tran", assignedTo: "North Ridge HOA crew" },
];

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
    rosterReader: { read: async () => ok(WORKERS), readDirectory: async () => ok(DIRECTORY) },
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

describe("useRosterViewModel", () => {
  it("selecting a worker locks in that direction, making the opposite-direction worker ineligible", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleWorker("roy-brown")); // job -> OUT direction
    const luis = result.current.state.rows.find((r) => r.id === "luis-t");
    expect(luis?.eligible).toBe(false);
  });

  it("clearing the selection restores eligibility for everyone", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleWorker("roy-brown"));
    act(() => result.current.handlers.onToggleWorker("roy-brown"));
    const luis = result.current.state.rows.find((r) => r.id === "luis-t");
    expect(luis?.eligible).toBe(true);
  });

  it("filters the directory by query when the request panel is open", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleRequest());
    act(() => result.current.handlers.onChangeRequestQuery("mar"));

    expect(result.current.state.requestResults.map((r) => r.name)).toEqual(["Maria Gonzalez"]);
  });

  it("adding a directory worker inserts them into rows as pending approval", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleRequest());
    act(() => result.current.handlers.onChangeRequestQuery("mar"));
    act(() => result.current.handlers.onAddFromDirectory("maria-g"));

    const added = result.current.state.rows.find((r) => r.id === "maria-g");
    expect(added?.pendingApproval).toBe(true);
    expect(result.current.state.requestOpen).toBe(false);
  });

  it("a busy directory worker cannot be added", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleRequest());
    act(() => result.current.handlers.onChangeRequestQuery("kevin"));
    act(() => result.current.handlers.onAddFromDirectory("kevin-t"));

    expect(result.current.state.rows.find((r) => r.id === "kevin-t")).toBeUndefined();
  });
});
