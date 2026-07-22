import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { JobTicket } from "../../core/entities/JobTicket.entity";
import { useTravelViewModel } from "./useTravel.viewModel";

const FROM: JobTicket = {
  id: "yard-prep",
  name: "Yard prep",
  tag: "M",
  sub: "",
  statusLabel: "",
  statusKind: "idle",
  site: "yard",
  address: "Company Yard",
  estimatedHours: 1,
  crew: [],
};
const TO: JobTicket = {
  id: "cornerstone-mall",
  name: "Cornerstone Mall",
  tag: "E",
  sub: "",
  statusLabel: "",
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
    ticketsReader: {
      read: async () => ok([FROM, TO]),
      readOne: async (id: string) => ok(id === FROM.id ? FROM : TO),
    },
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

describe("useTravelViewModel", () => {
  it("loads both tickets and starts not travelling", async () => {
    const { result } = renderHook(
      () =>
        useTravelViewModel({
          fromTicketId: "yard-prep",
          toTicketId: "cornerstone-mall",
          onStartJobAfterTravel: jest.fn(),
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.state.toTicket).not.toBeNull());
    expect(result.current.state.fromTicket?.name).toBe("Yard prep");
    expect(result.current.state.travelRunning).toBe(false);
  });

  it("onToggleTravel starts and stops the travel timer", async () => {
    const { result } = renderHook(
      () =>
        useTravelViewModel({
          fromTicketId: "yard-prep",
          toTicketId: "cornerstone-mall",
          onStartJobAfterTravel: jest.fn(),
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.state.toTicket).not.toBeNull());

    act(() => result.current.handlers.onToggleTravel());
    expect(result.current.state.travelRunning).toBe(true);

    act(() => result.current.handlers.onToggleTravel());
    expect(result.current.state.travelRunning).toBe(false);
  });

  it("onConfirmArrived stops travel and shows the travel-done state", async () => {
    const { result } = renderHook(
      () =>
        useTravelViewModel({
          fromTicketId: "yard-prep",
          toTicketId: "cornerstone-mall",
          onStartJobAfterTravel: jest.fn(),
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.state.toTicket).not.toBeNull());

    act(() => result.current.handlers.onToggleTravel());
    act(() => result.current.handlers.onConfirmArrived());

    expect(result.current.state.travelDone).toBe(true);
    expect(result.current.state.travelRunning).toBe(false);
  });

  it("onStartJobAfterTravel calls the navigation callback with the destination ticket id", async () => {
    const onStartJobAfterTravel = jest.fn();
    const { result } = renderHook(
      () => useTravelViewModel({ fromTicketId: "yard-prep", toTicketId: "cornerstone-mall", onStartJobAfterTravel }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.state.toTicket).not.toBeNull());

    act(() => result.current.handlers.onToggleTravel());
    act(() => result.current.handlers.onConfirmArrived());
    act(() => result.current.handlers.onStartJobAfterTravel());

    expect(onStartJobAfterTravel).toHaveBeenCalledWith("cornerstone-mall");
  });
});
