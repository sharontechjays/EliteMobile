import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

// A small bridge from React Query's onlineManager (kept live by setupOnlineManager.ts, which
// subscribes it to real NetInfo connectivity events) to a React-subscribable value, so any
// screen can show a real, live "offline" indicator instead of only inferring it indirectly from
// a failed/paused query.
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
  );
}
