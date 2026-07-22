import { getOrCreateMmkvEncryptionKey } from "./getOrCreateMmkvEncryptionKey";

describe("getOrCreateMmkvEncryptionKey", () => {
  it("returns a 32-character key, fitting react-native-mmkv's AES-256 byte limit", () => {
    const key = getOrCreateMmkvEncryptionKey();
    expect(key).toHaveLength(32);
  });

  it("returns the same key on every call (persisted, not regenerated)", () => {
    const first = getOrCreateMmkvEncryptionKey();
    const second = getOrCreateMmkvEncryptionKey();
    expect(second).toBe(first);
  });

  it("only ever produces base64-safe characters", () => {
    const key = getOrCreateMmkvEncryptionKey();
    expect(key).toMatch(/^[A-Za-z0-9+/]+$/);
  });
});
