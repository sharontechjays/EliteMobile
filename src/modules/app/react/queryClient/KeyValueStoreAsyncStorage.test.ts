import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";
import { keyValueStoreAsAsyncStorage } from "./KeyValueStoreAsyncStorage";

class FakeKeyValueStore implements KeyValueStore {
  private map = new Map<string, string>();
  getString(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeString(key: string): void {
    this.map.delete(key);
  }
}

describe("keyValueStoreAsAsyncStorage", () => {
  it("getItem returns null for a key that was never set", () => {
    const storage = keyValueStoreAsAsyncStorage(new FakeKeyValueStore());
    expect(storage.getItem("missing")).toBeNull();
  });

  it("setItem then getItem round-trips the value", () => {
    const storage = keyValueStoreAsAsyncStorage(new FakeKeyValueStore());
    storage.setItem("reactQuery.cache", "{}");
    expect(storage.getItem("reactQuery.cache")).toBe("{}");
  });

  it("removeItem clears a previously set value", () => {
    const storage = keyValueStoreAsAsyncStorage(new FakeKeyValueStore());
    storage.setItem("reactQuery.cache", "{}");
    storage.removeItem("reactQuery.cache");
    expect(storage.getItem("reactQuery.cache")).toBeNull();
  });
});
