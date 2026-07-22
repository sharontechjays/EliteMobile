// Manual Jest mock for react-native-mmkv.
//
// react-native-mmkv v4 is a Nitro-modules-based native binding: its `createMMKV()`
// factory (node_modules/react-native-mmkv/lib/createMMKV/createMMKV.js) does have an
// internal Jest/Vitest detection branch (`isTest()`, keyed on `JEST_WORKER_ID` /
// `VITEST_WORKER_ID`) that returns an in-memory mock instance — but that branch never
// gets a chance to run under this project's jest-expo preset, because the *module*
// itself eagerly requires `react-native-nitro-modules` at import time
// (getMMKVFactory.js -> react-native-nitro-modules/src/index.ts), which in turn calls
// `TurboModuleRegistry.getEnforcing("NitroModules")` at module-eval time. That native
// TurboModule doesn't exist under Jest, so any file that imports react-native-mmkv
// crashes immediately with "'NitroModules' could not be found" — before rendering,
// same failure mode Task 5 found for expo-glass-effect (see
// __mocks__/expo-glass-effect.tsx), just one level deeper in the require graph.
//
// This mock mirrors the real package's public shape as used by
// MmkvKeyValueStoreAdapter: a `createMMKV()` factory function (not a `new MMKV()`
// class — v4 dropped that in favor of the factory) returning an object with
// `getString`/`set`.
//
// Instance sharing semantics: real MMKV instances are singletons keyed by `id`.
// Calling `createMMKV()` with no config defaults to the factory's
// `defaultMMKVInstanceId` (`'mmkv.default'` — see
// node_modules/react-native-mmkv/src/specs/MMKVFactory.nitro.ts and
// node_modules/react-native-mmkv/src/createMMKV/createMMKV.ts), and two calls that
// resolve to the same id share the same underlying native storage — e.g. a second
// `MmkvKeyValueStoreAdapter()` instantiated later (simulating an app restart) sees
// data written via the first one. A naive mock that hands back a brand-new Map on
// every call would mask that and create a false "data loss on restart" test result,
// so this mock keeps a module-level registry of one Map per id and returns the same
// Map for repeat calls with the same id.
export interface Configuration {
  id?: string;
}

export interface MMKV {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const DEFAULT_MMKV_INSTANCE_ID = "mmkv.default";

// id -> underlying key/value storage, shared across every createMMKV() call that
// resolves to that id (mirrors real MMKV's per-id singleton semantics).
const instanceRegistry = new Map<string, Map<string, string>>();

export function createMMKV(configuration?: Configuration): MMKV {
  const id = configuration?.id ?? DEFAULT_MMKV_INSTANCE_ID;

  let store = instanceRegistry.get(id);
  if (!store) {
    store = new Map<string, string>();
    instanceRegistry.set(id, store);
  }

  return {
    getString(key: string): string | undefined {
      return store.get(key);
    },
    set(key: string, value: string): void {
      store.set(key, value);
    },
    remove(key: string): void {
      store.delete(key);
    },
  };
}
