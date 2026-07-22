import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

// React Query's default online detection is web-only (window.addEventListener("online"/"offline")),
// which never fires in React Native — without this, the library would think the device is always
// online and never pause/retry mutations or queries during a real connectivity drop. NetInfo is
// the standard way to get real connectivity state in React Native.
//
// `state.isConnected` (device has a network interface — e.g. Wi-Fi/cellular is on) is combined
// with `state.isInternetReachable` (that network can actually reach the internet, not just a
// local Wi-Fi with no uplink) — a field crew van can be connected to a hotspot with no signal,
// which `isConnected` alone wouldn't catch.
export function setupOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
  });
}
