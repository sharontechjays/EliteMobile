import { createMMKV, type MMKV } from "react-native-mmkv";
import { KeyValueStore } from "./KeyValueStore.port";
import { getOrCreateMmkvEncryptionKey } from "./getOrCreateMmkvEncryptionKey";

// react-native-mmkv v4 replaced the v2/v3 `new MMKV()` class with a `createMMKV()`
// factory (the package moved to a Nitro-modules-based native binding). `MMKV` is now
// exported as a type only. `createMMKV()` internally detects a Jest/Vitest worker
// (via `JEST_WORKER_ID`/`VITEST_WORKER_ID`) and transparently returns an in-memory
// mock instance in that case, so no manual Jest mock is required for this adapter.
//
// Encrypted at rest: everything this adapter stores (timer state, device registration,
// session data) is written through MMKV's AES-256 encryption, keyed by a value generated
// once and kept in the platform Keychain/Keystore (see getOrCreateMmkvEncryptionKey) —
// never in plaintext source, never inside MMKV itself.
export class MmkvKeyValueStoreAdapter implements KeyValueStore {
  private readonly storage: MMKV = createMMKV({
    id: "mmkv.default",
    encryptionKey: getOrCreateMmkvEncryptionKey(),
    encryptionType: "AES-256",
  });

  getString(key: string): string | null {
    return this.storage.getString(key) ?? null;
  }

  setString(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeString(key: string): void {
    this.storage.remove(key);
  }
}
