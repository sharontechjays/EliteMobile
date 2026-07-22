import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

// A small bridge from React Query's onlineManager (kept live by setupOnlineManager.ts) to a
// React-subscribable value, so UI can show a real "offline" indicator instead of only inferring
// it indirectly from a failed/paused query.
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
  );
}
