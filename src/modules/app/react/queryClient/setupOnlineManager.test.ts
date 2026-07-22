import { onlineManager } from "@tanstack/react-query";
// Imported from the mock file directly (not the "@react-native-community/netinfo" specifier) so
// TypeScript resolves __simulateNetInfoChange's real type — it's a test-only helper this
// project's manual mock adds, not part of the actual NetInfo package's public API.
import { __simulateNetInfoChange } from "../../../../../__mocks__/@react-native-community/netinfo";
import { setupOnlineManager } from "./setupOnlineManager";

describe("setupOnlineManager", () => {
  it("reports online when connected with internet reachable", () => {
    setupOnlineManager();
    __simulateNetInfoChange({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("reports offline when not connected", () => {
    setupOnlineManager();
    __simulateNetInfoChange({ isConnected: false, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
  });

  it("reports offline when connected to a network with no internet reachability (e.g. a dead hotspot)", () => {
    setupOnlineManager();
    __simulateNetInfoChange({ isConnected: true, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
  });

  it("treats an unknown reachability (null, still resolving) as online rather than blocking sync", () => {
    setupOnlineManager();
    __simulateNetInfoChange({ isConnected: true, isInternetReachable: null });
    expect(onlineManager.isOnline()).toBe(true);
  });
});
