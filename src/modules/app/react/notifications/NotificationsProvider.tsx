import React, { createContext, useCallback, useEffect, useReducer, useRef } from "react";
import * as Notifications from "expo-notifications";
import { initialNotificationsState, notificationsReducer, NotifLogEntry } from "./notificationsReducer";

export interface NotificationsContextValue {
  log: NotifLogEntry[];
  push(entry: { icon: string; title: string; body: string }): void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// Foreground alerts are suppressed by default on iOS/Android unless a handler opts in —
// this must be registered once at module load, not inside the component (setting it on
// every render/mount would just redundantly reassign the same global handler).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationsReducer, initialNotificationsState);
  const idCounter = useRef(0);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  const push = useCallback((entry: { icon: string; title: string; body: string }) => {
    idCounter.current += 1;
    const full: NotifLogEntry = { ...entry, id: `notif-${idCounter.current}`, createdAt: Date.now() };
    dispatch({ type: "PUSH", entry: full });
    Notifications.scheduleNotificationAsync({
      content: { title: `${entry.icon} ${entry.title}`, body: entry.body },
      trigger: null,
    });
  }, []);

  return <NotificationsContext.Provider value={{ log: state.log, push }}>{children}</NotificationsContext.Provider>;
}
