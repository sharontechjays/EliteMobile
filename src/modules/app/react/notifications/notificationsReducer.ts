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

// The notifications log/panel only ever shows a short recent list, not a paginated history — 6
// keeps it scrollable on one screen without a "load more" affordance. Older entries beyond this
// cap are silently dropped (see PUSH below), not archived anywhere.
export const MAX_NOTIF_LOG = 6;

export const initialNotificationsState: NotificationsState = { log: [] };

export function notificationsReducer(state: NotificationsState, action: NotificationsAction): NotificationsState {
  switch (action.type) {
    case "PUSH":
      return { log: [action.entry, ...state.log].slice(0, MAX_NOTIF_LOG) };
    default:
      return state;
  }
}
