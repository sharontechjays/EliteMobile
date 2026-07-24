export interface MealReminderEntryState {
  workerName: string;
  alertsFired: number;
}

export interface MealReminderState {
  entries: Record<string, MealReminderEntryState>;
}

export type MealReminderAction =
  | { type: "START"; workerId: string; workerName: string }
  | { type: "STOP"; workerId: string }
  | { type: "ALERT_FIRED"; workerId: string; alertsFired: number };

export const initialMealReminderState: MealReminderState = { entries: {} };

export function mealReminderReducer(state: MealReminderState, action: MealReminderAction): MealReminderState {
  switch (action.type) {
    case "START":
      return {
        entries: { ...state.entries, [action.workerId]: { workerName: action.workerName, alertsFired: 0 } },
      };
    case "STOP": {
      if (!(action.workerId in state.entries)) return state;
      const entries = { ...state.entries };
      delete entries[action.workerId];
      return { entries };
    }
    case "ALERT_FIRED": {
      const entry = state.entries[action.workerId];
      if (!entry) return state;
      return { entries: { ...state.entries, [action.workerId]: { ...entry, alertsFired: action.alertsFired } } };
    }
    default:
      return state;
  }
}
