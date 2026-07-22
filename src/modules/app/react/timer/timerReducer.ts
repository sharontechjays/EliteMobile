export interface TimerEntryState {
  accumulatedSeconds: number;
  startedAt: number | null;
}

export interface TimersState {
  entries: Record<string, TimerEntryState>;
}

export type TimerAction =
  | { type: "START"; id: string; now: number }
  | { type: "PAUSE"; id: string; now: number }
  | { type: "RESET"; id: string; now: number }
  | { type: "HYDRATE"; state: TimersState };

export const initialTimersState: TimersState = { entries: {} };

export const MS_PER_SECOND = 1000;

const entryOrDefault = (state: TimersState, id: string): TimerEntryState =>
  state.entries[id] ?? { accumulatedSeconds: 0, startedAt: null };

const elapsedSecondsSince = (startedAt: number, now: number): number => Math.floor((now - startedAt) / MS_PER_SECOND);

export function timerReducer(state: TimersState, action: TimerAction): TimersState {
  switch (action.type) {
    case "START": {
      const entry = entryOrDefault(state, action.id);
      if (entry.startedAt !== null) return state;
      return { entries: { ...state.entries, [action.id]: { ...entry, startedAt: action.now } } };
    }
    case "PAUSE": {
      const entry = entryOrDefault(state, action.id);
      if (entry.startedAt === null) return state;
      return {
        entries: {
          ...state.entries,
          [action.id]: {
            accumulatedSeconds: entry.accumulatedSeconds + elapsedSecondsSince(entry.startedAt, action.now),
            startedAt: null,
          },
        },
      };
    }
    case "RESET":
      return { entries: { ...state.entries, [action.id]: { accumulatedSeconds: 0, startedAt: null } } };
    case "HYDRATE":
      return action.state;
    default:
      return state;
  }
}
