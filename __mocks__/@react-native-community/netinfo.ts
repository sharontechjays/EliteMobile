// Manual Jest mock for @react-native-community/netinfo.
//
// The package ships its own official mock (node_modules/@react-native-community/netinfo/jest/
// netinfo-mock.js), but its addEventListener is a plain jest.fn() that never actually invokes
// the registered callback — fine for "don't crash," but it can't exercise
// setupOnlineManager.ts's actual mapping logic (isConnected/isInternetReachable -> online/
// offline). This mock keeps a real listener registry so a test can call
// __simulateNetInfoChange(...) to drive that logic directly.
export interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

type Listener = (state: NetInfoState) => void;

const listeners = new Set<Listener>();

function addEventListener(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Test-only helper (not part of the real NetInfo API) — lets a test simulate a connectivity
// change without needing real device network state.
export function __simulateNetInfoChange(state: NetInfoState): void {
  listeners.forEach((listener) => listener(state));
}

export default { addEventListener };
