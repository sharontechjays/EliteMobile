import React, { createContext, useEffect, useReducer, useRef } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { initialTimersState, MS_PER_SECOND, timerReducer, TimersState } from "./timerReducer";

export interface TimerContextValue {
  getSeconds(id: string): number;
  isRunning(id: string): boolean;
  start(id: string): void;
  pause(id: string): void;
  reset(id: string): void;
}

export const TimerContext = createContext<TimerContextValue | null>(null);

const STORAGE_KEY = "timers.v1";
const TICK_INTERVAL_MS = 1000;

function loadPersisted(getString: (key: string) => string | null): TimersState {
  const raw = getString(STORAGE_KEY);
  if (!raw) return initialTimersState;
  try {
    return JSON.parse(raw) as TimersState;
  } catch {
    return initialTimersState;
  }
}

// Timer entries store a startedAt timestamp (not a running counter), so elapsed time is always
// computed fresh from the wall clock — this is what makes it correct across app backgrounding
// (the JS interval below is paused/suspended by the OS, but getSeconds still returns the right
// value once resumed) and app kill/restart (persisted accumulatedSeconds + startedAt are
// rehydrated on next launch; if the app was killed while a timer was running, that timer's
// elapsed-since-restart time is still folded in correctly by the same now-startedAt math).
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { keyValueStore } = useDependencies();
  const [state, dispatch] = useReducer(timerReducer, initialTimersState, () =>
    loadPersisted(keyValueStore.getString.bind(keyValueStore)),
  );
  const stateRef = useRef<TimersState>(state);
  stateRef.current = state;

  useEffect(() => {
    keyValueStore.setString(STORAGE_KEY, JSON.stringify(state));
  }, [state, keyValueStore]);

  // Periodic re-render bump only — does not mutate timer state. Elapsed seconds are always
  // derived from wall-clock time in getSeconds, so this exists purely so a future reactive
  // consumer (not built in this task) has something to subscribe to; it is not required for
  // getSeconds/isRunning correctness.
  const [, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => {
    const interval = setInterval(bump, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const value = useRef<TimerContextValue>({
    getSeconds: (id) => {
      const entry = stateRef.current.entries[id];
      if (!entry) return 0;
      const running = entry.startedAt !== null ? Math.floor((Date.now() - entry.startedAt) / MS_PER_SECOND) : 0;
      return entry.accumulatedSeconds + running;
    },
    isRunning: (id) => stateRef.current.entries[id]?.startedAt != null,
    start: (id) => dispatch({ type: "START", id, now: Date.now() }),
    pause: (id) => dispatch({ type: "PAUSE", id, now: Date.now() }),
    reset: (id) => dispatch({ type: "RESET", id, now: Date.now() }),
  }).current;

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
