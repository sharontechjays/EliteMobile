import React, { createContext, useEffect, useReducer, useRef } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { MS_PER_SECOND, TIMER_TICK_INTERVAL_MS } from "@/constants/appConstants";
import { initialTimersState, timerReducer, TimerEntryState, TimersState } from "./timerReducer";

export interface TimerContextValue {
  getSeconds(id: string): number;
  isRunning(id: string): boolean;
  start(id: string): void;
  pause(id: string): void;
  reset(id: string): void;
}

export const TimerContext = createContext<TimerContextValue | null>(null);

const STORAGE_KEY = "timers.v1";

function isValidEntry(value: unknown): value is TimerEntryState {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<TimerEntryState>;
  return (
    typeof entry.accumulatedSeconds === "number" && (entry.startedAt === null || typeof entry.startedAt === "number")
  );
}

function isValidTimersState(value: unknown): value is TimersState {
  if (!value || typeof value !== "object") return false;
  const entries = (value as Partial<TimersState>).entries;
  if (!entries || typeof entries !== "object") return false;
  return Object.values(entries).every(isValidEntry);
}

function loadPersisted(getString: (key: string) => string | null): TimersState {
  const raw = getString(STORAGE_KEY);
  if (!raw) return initialTimersState;
  try {
    const parsed: unknown = JSON.parse(raw);
    // A corrupted/unparseable/malformed-shape persisted blob resets all timers to initial state
    // rather than crashing app startup — silently losing in-progress timer state is an acceptable
    // trade-off against the app failing to launch at all, or crashing later on a bad entry.
    return isValidTimersState(parsed) ? parsed : initialTimersState;
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
    const interval = setInterval(bump, TIMER_TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Built once via useRef (not recreated each render) and its methods close over stateRef rather
  // than state directly — this keeps the context value's identity stable across every tick/bump,
  // so consumers reading it via useContext don't re-render just because the provider did, while
  // still reading fresh data on each call through stateRef.current.
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
