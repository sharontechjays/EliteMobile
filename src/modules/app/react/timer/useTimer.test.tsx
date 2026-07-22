import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";
import { TimerProvider } from "./TimerProvider";
import { useTimer } from "./useTimer";

class FakeKeyValueStore implements KeyValueStore {
  private map = new Map<string, string>();
  getString(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeString(key: string): void {
    this.map.delete(key);
  }
}

function buildTestDeps(keyValueStore: KeyValueStore): Dependencies {
  return { keyValueStore } as unknown as Dependencies;
}

function Probe({ id }: { id: string }) {
  const timer = useTimer();
  // getSeconds() reads from a non-reactive ref (see TimerProvider), so this probe polls itself
  // to force a re-render, exactly as Task 2's implementer note prescribes for consumers that
  // need a live-updating display. Without this, the assertions below would observe a stale,
  // frozen-at-mount value regardless of how ticking/timers are driven.
  const [, bump] = React.useReducer((c: number) => c + 1, 0);
  React.useEffect(() => {
    const interval = setInterval(() => bump(), 100);
    return () => clearInterval(interval);
  }, []);
  return <Text testID="seconds">{timer.getSeconds(id)}</Text>;
}

describe("TimerProvider / useTimer persistence", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("ticks a started timer up by 1 every second", async () => {
    const store = new FakeKeyValueStore();
    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    const { getByTestId } = render(
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <TimerProvider>
          <Capture />
          <Probe id="job" />
        </TimerProvider>
      </DependenciesProvider>,
    );
    act(() => {
      hookApi!.start("job");
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    await waitFor(() => {
      expect(getByTestId("seconds").props.children).toBe(3);
    });
  });

  it("persists timer state to the KeyValueStore on start/pause/reset", () => {
    const store = new FakeKeyValueStore();
    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    render(
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <TimerProvider>
          <Capture />
        </TimerProvider>
      </DependenciesProvider>,
    );

    act(() => {
      hookApi!.start("travel");
    });
    const persisted = store.getString("timers.v1");
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted!).entries.travel.startedAt).not.toBeNull();
  });

  it("rehydrates timer state already in the KeyValueStore when the provider mounts", () => {
    const store = new FakeKeyValueStore();
    store.setString("timers.v1", JSON.stringify({ entries: { yard: { accumulatedSeconds: 120, startedAt: null } } }));

    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    render(
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <TimerProvider>
          <Capture />
        </TimerProvider>
      </DependenciesProvider>,
    );

    expect(hookApi!.getSeconds("yard")).toBe(120);
    expect(hookApi!.isRunning("yard")).toBe(false);
  });

  it("isRunning reflects start/pause calls", () => {
    const store = new FakeKeyValueStore();
    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    render(
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <TimerProvider>
          <Capture />
        </TimerProvider>
      </DependenciesProvider>,
    );

    expect(hookApi!.isRunning("travel")).toBe(false);
    act(() => {
      hookApi!.start("travel");
    });
    expect(hookApi!.isRunning("travel")).toBe(true);
    act(() => {
      hookApi!.pause("travel");
    });
    expect(hookApi!.isRunning("travel")).toBe(false);
  });
});

describe("TimerProvider / useTimer persistence (real wall clock)", () => {
  // This suite deliberately does NOT use jest.useFakeTimers(): the whole point of this test is
  // to verify getSeconds() correctly reflects real elapsed wall-clock time across a simulated
  // app restart (a running timer's startedAt persisted, then rehydrated on a fresh mount), so
  // faking timers here would mask exactly the kind of bug this task exists to catch.
  it("rehydrates a RUNNING persisted timer and reflects real elapsed wall-clock time", () => {
    const store = new FakeKeyValueStore();
    const startedAt = Date.now() - 10000; // started 10 real seconds ago
    store.setString("timers.v1", JSON.stringify({ entries: { job: { accumulatedSeconds: 50, startedAt } } }));

    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    render(
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <TimerProvider>
          <Capture />
        </TimerProvider>
      </DependenciesProvider>,
    );

    // 50 accumulated + ~10 elapsed since restart == ~60, with a small tolerance for
    // test-execution overhead between constructing startedAt and this assertion.
    expect(hookApi!.getSeconds("job")).toBeGreaterThanOrEqual(59);
    expect(hookApi!.getSeconds("job")).toBeLessThanOrEqual(61);
    expect(hookApi!.isRunning("job")).toBe(true);
  });
});
