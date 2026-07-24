import { MAX_NOTIF_LOG } from "@/constants/appConstants";

export interface NotifLogEntry {
  id: string;
  icon: string;
  title: string;
  body: string;
  createdAt: number;
}

export interface NotificationsState {
  log: NotifLogEntry[];
}

export type NotificationsAction = { type: "PUSH"; entry: NotifLogEntry };

export const initialNotificationsState: NotificationsState = { log: [] };

export function notificationsReducer(state: NotificationsState, action: NotificationsAction): NotificationsState {
  switch (action.type) {
    case "PUSH":
      return { log: [action.entry, ...state.log].slice(0, MAX_NOTIF_LOG) };
    default:
      return state;
  }
}
