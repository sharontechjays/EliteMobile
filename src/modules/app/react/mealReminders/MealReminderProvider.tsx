import React, { createContext, useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useTimer } from "@app/react/timer/useTimer";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { useLanguage } from "@app/react/language/useLanguage";
import {
  buildMealBreakCascade,
  getNextDueMealBreakCheckpoint,
  MealBreakAlertAudience,
  MealBreakCheckpoint,
} from "@modules/tickets/core/usecases/deriveMealBreakAlert.usecase";
import {
  FIRST_MEAL_ESCALATION_INTERVAL_MINUTES,
  FIRST_MEAL_MAX_ALERTS,
  FIRST_MEAL_REMINDER_HOUR,
  MEAL_REMINDER_MODE,
  MEAL_REMINDER_TEST_ESCALATION_INTERVAL_SECONDS,
  MEAL_REMINDER_TEST_MAX_ALERTS,
  MEAL_REMINDER_TEST_START_SECONDS,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  TIMER_TICK_INTERVAL_MS,
} from "@/constants/appConstants";
import { WorkerId } from "@/types/ids";
import { initialMealReminderState, mealReminderReducer, MealReminderState } from "./mealReminderReducer";

// A worker whose meal-reminder cascade has fired at least one alert — surfaced so screens other
// than the one that fired the push (e.g. Home) can show it too, not just the push notification
// itself. audience mirrors the most recent checkpoint that fired for that worker.
export interface ActiveMealReminder {
  workerId: WorkerId;
  workerName: string;
  audience: MealBreakAlertAudience;
}

export interface MealReminderContextValue {
  activeReminders: ActiveMealReminder[];
  startReminder(workerId: WorkerId, workerName: string): void;
  stopReminder(workerId: WorkerId): void;
}

export const MealReminderContext = createContext<MealReminderContextValue | null>(null);

const mealReminderTimerId = (workerId: string) => `meal-reminder:${workerId}`;

const STORAGE_KEY = "mealReminders.v1";

function loadPersisted(getString: (key: string) => string | null): MealReminderState {
  const raw = getString(STORAGE_KEY);
  if (!raw) return initialMealReminderState;
  try {
    return JSON.parse(raw) as MealReminderState;
  } catch {
    // A corrupted/unparseable persisted blob drops in-progress reminder tracking rather than
    // crashing app startup — mirrors TimerProvider's own loadPersisted fallback.
    return initialMealReminderState;
  }
}

// Same cascade shape as the tickets module's own FIRST_MEAL_CASCADE (one crew-only reminder,
// then crew+supervisor escalations up to a max), but driven off MEAL_REMINDER_MODE so a tester
// can see it fire in seconds instead of hours — see appConstants.ts.
const CLOCK_IN_MEAL_CASCADE: MealBreakCheckpoint[] = buildMealBreakCascade(
  MEAL_REMINDER_MODE === "testing"
    ? {
        startSeconds: MEAL_REMINDER_TEST_START_SECONDS,
        escalationIntervalSeconds: MEAL_REMINDER_TEST_ESCALATION_INTERVAL_SECONDS,
        maxAlerts: MEAL_REMINDER_TEST_MAX_ALERTS,
        firstAlertAudience: "crew",
      }
    : {
        startSeconds: FIRST_MEAL_REMINDER_HOUR * SECONDS_PER_HOUR,
        escalationIntervalSeconds: FIRST_MEAL_ESCALATION_INTERVAL_MINUTES * SECONDS_PER_MINUTE,
        maxAlerts: FIRST_MEAL_MAX_ALERTS,
        firstAlertAudience: "crew",
      },
);

// Starts a per-worker meal-reminder cascade the moment they're clocked IN (see
// ConfirmAttestation.usecase.ts's caller in useAttestation.viewModel.tsx), independent of any
// specific ticket's own job timer — this fires regardless of which screen is open, since it's
// mounted once at the app root alongside TimerProvider/NotificationsProvider. Exposes
// activeReminders (reactive state, not just the one-shot push) so any screen — e.g. Home — can
// also display a currently-overdue reminder, not only whoever was looking at a push banner.
export function MealReminderProvider({ children }: { children: React.ReactNode }) {
  const { keyValueStore } = useDependencies();
  const timer = useTimer();
  const { push } = useNotifications();
  const { strings } = useLanguage();
  const t = strings.ticketDetail;

  const [state, dispatch] = useReducer(mealReminderReducer, initialMealReminderState, () =>
    loadPersisted(keyValueStore.getString.bind(keyValueStore)),
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    keyValueStore.setString(STORAGE_KEY, JSON.stringify(state));
  }, [state, keyValueStore]);

  useEffect(() => {
    const interval = setInterval(() => {
      for (const [workerId, entry] of Object.entries(stateRef.current.entries)) {
        const elapsedSeconds = timer.getSeconds(mealReminderTimerId(workerId));
        const dueIndex = getNextDueMealBreakCheckpoint(CLOCK_IN_MEAL_CASCADE, elapsedSeconds, entry.alertsFired);
        if (dueIndex === null) continue;

        const checkpoint = CLOCK_IN_MEAL_CASCADE[dueIndex];
        if (checkpoint.audience === "crew") {
          push({ icon: "◔", title: t.mealReminderTitle, body: t.mealReminderBody });
        } else {
          push({ icon: "▲", title: t.mealEscalationTitle, body: t.mealEscalationBody(entry.workerName) });
        }
        dispatch({ type: "ALERT_FIRED", workerId, alertsFired: dueIndex + 1 });
      }
    }, TIMER_TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [timer, push, t]);

  const startReminder = useCallback(
    (workerId: WorkerId, workerName: string) => {
      const timerId = mealReminderTimerId(workerId);
      timer.reset(timerId);
      timer.start(timerId);
      dispatch({ type: "START", workerId, workerName });
    },
    [timer],
  );

  const stopReminder = useCallback(
    (workerId: WorkerId) => {
      const timerId = mealReminderTimerId(workerId);
      timer.pause(timerId);
      timer.reset(timerId);
      dispatch({ type: "STOP", workerId });
    },
    [timer],
  );

  // A worker only shows up once their first alert has actually fired (alertsFired > 0) — before
  // that they're just ticking toward the first threshold, with nothing due to display yet.
  const activeReminders = useMemo<ActiveMealReminder[]>(
    () =>
      Object.entries(state.entries)
        .filter(([, entry]) => entry.alertsFired > 0)
        .map(([workerId, entry]) => ({
          workerId: workerId as WorkerId,
          workerName: entry.workerName,
          audience: CLOCK_IN_MEAL_CASCADE[entry.alertsFired - 1].audience,
        })),
    [state.entries],
  );

  const value = useMemo<MealReminderContextValue>(
    () => ({ activeReminders, startReminder, stopReminder }),
    [activeReminders, startReminder, stopReminder],
  );

  return <MealReminderContext.Provider value={value}>{children}</MealReminderContext.Provider>;
}
