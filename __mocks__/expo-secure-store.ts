// Manual Jest mock for expo-secure-store — a plain in-memory Map standing in for the real
// Keychain/Keystore-backed storage, so tests can deterministically verify "generate once,
// reuse thereafter" behavior (see getOrCreateMmkvEncryptionKey) without touching real
// platform secure storage.
const store = new Map<string, string>();

export function getItem(key: string): string | null {
  return store.get(key) ?? null;
}

export function setItem(key: string, value: string): void {
  store.set(key, value);
}
