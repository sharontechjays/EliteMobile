import { timerReducer, initialTimersState, TimersState } from "./timerReducer";

const NOW = 1_700_000_000_000;

describe("timerReducer", () => {
  it("starts a timer at 0 accumulated seconds when it doesn't exist yet", () => {
    const state = timerReducer(initialTimersState, { type: "START", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 0, startedAt: NOW });
  });

  it("resumes a paused timer without resetting its accumulated seconds", () => {
    const paused: TimersState = { entries: { job: { accumulatedSeconds: 42, startedAt: null } } };
    const state = timerReducer(paused, { type: "START", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 42, startedAt: NOW });
  });

  it("starting an already-running timer is a no-op (keeps the original startedAt)", () => {
    const running: TimersState = { entries: { job: { accumulatedSeconds: 0, startedAt: NOW - 5000 } } };
    const state = timerReducer(running, { type: "START", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 0, startedAt: NOW - 5000 });
  });

  it("pause folds elapsed time into accumulatedSeconds and clears startedAt", () => {
    const running: TimersState = { entries: { job: { accumulatedSeconds: 10, startedAt: NOW - 5000 } } };
    const state = timerReducer(running, { type: "PAUSE", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 15, startedAt: null });
  });

  it("pausing an already-paused timer is a no-op", () => {
    const paused: TimersState = { entries: { job: { accumulatedSeconds: 10, startedAt: null } } };
    const state = timerReducer(paused, { type: "PAUSE", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 10, startedAt: null });
  });

  it("reset zeroes accumulatedSeconds and clears startedAt", () => {
    const running: TimersState = { entries: { job: { accumulatedSeconds: 99, startedAt: NOW - 1000 } } };
    const state = timerReducer(running, { type: "RESET", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 0, startedAt: null });
  });

  it("HYDRATE replaces the whole state wholesale (used to restore persisted state on launch)", () => {
    const persisted: TimersState = { entries: { travel: { accumulatedSeconds: 30, startedAt: NOW - 2000 } } };
    const state = timerReducer(initialTimersState, { type: "HYDRATE", state: persisted });
    expect(state).toEqual(persisted);
  });
});
