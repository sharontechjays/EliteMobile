import { mealReminderReducer, initialMealReminderState, MealReminderState } from "./mealReminderReducer";

describe("mealReminderReducer", () => {
  it("starts tracking a worker at 0 alerts fired", () => {
    const state = mealReminderReducer(initialMealReminderState, {
      type: "START",
      workerId: "luis-t",
      workerName: "Luis T.",
    });
    expect(state.entries["luis-t"]).toEqual({ workerName: "Luis T.", alertsFired: 0 });
  });

  it("restarting an already-tracked worker resets their alert count", () => {
    const tracking: MealReminderState = { entries: { "luis-t": { workerName: "Luis T.", alertsFired: 2 } } };
    const state = mealReminderReducer(tracking, { type: "START", workerId: "luis-t", workerName: "Luis T." });
    expect(state.entries["luis-t"]).toEqual({ workerName: "Luis T.", alertsFired: 0 });
  });

  it("stop removes the worker from tracking entirely", () => {
    const tracking: MealReminderState = { entries: { "luis-t": { workerName: "Luis T.", alertsFired: 1 } } };
    const state = mealReminderReducer(tracking, { type: "STOP", workerId: "luis-t" });
    expect(state.entries["luis-t"]).toBeUndefined();
  });

  it("stopping a worker that isn't tracked is a no-op", () => {
    const state = mealReminderReducer(initialMealReminderState, { type: "STOP", workerId: "luis-t" });
    expect(state).toEqual(initialMealReminderState);
  });

  it("ALERT_FIRED bumps only the given worker's alert count", () => {
    const tracking: MealReminderState = {
      entries: {
        "luis-t": { workerName: "Luis T.", alertsFired: 0 },
        "roy-brown": { workerName: "Roy Brown", alertsFired: 1 },
      },
    };
    const state = mealReminderReducer(tracking, { type: "ALERT_FIRED", workerId: "luis-t", alertsFired: 1 });
    expect(state.entries["luis-t"].alertsFired).toBe(1);
    expect(state.entries["roy-brown"].alertsFired).toBe(1);
  });

  it("ALERT_FIRED for an untracked worker is a no-op", () => {
    const state = mealReminderReducer(initialMealReminderState, {
      type: "ALERT_FIRED",
      workerId: "luis-t",
      alertsFired: 1,
    });
    expect(state).toEqual(initialMealReminderState);
  });
});
