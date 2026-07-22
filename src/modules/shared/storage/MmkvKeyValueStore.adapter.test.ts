import { createMMKV } from "react-native-mmkv";
import { MmkvKeyValueStoreAdapter } from "./MmkvKeyValueStore.adapter";

describe("MmkvKeyValueStoreAdapter", () => {
  it("returns null for a key that was never set", () => {
    const store = new MmkvKeyValueStoreAdapter();
    expect(store.getString("missing")).toBeNull();
  });

  it("returns a previously set value", () => {
    const store = new MmkvKeyValueStoreAdapter();
    store.setString("greeting", "hello");
    expect(store.getString("greeting")).toBe("hello");
  });

  it("overwrites an existing value", () => {
    const store = new MmkvKeyValueStoreAdapter();
    store.setString("greeting", "hello");
    store.setString("greeting", "goodbye");
    expect(store.getString("greeting")).toBe("goodbye");
  });

  // Real MMKV instances are singletons per-id: createMMKV() with no config always
  // resolves to the same default instance id, so two MmkvKeyValueStoreAdapter()
  // instances (e.g. one built before an app restart, one built after) read and
  // write the same underlying native storage. A mock that handed back a fresh,
  // disconnected Map on every createMMKV() call would incorrectly show data loss
  // here where a real device would show persistence — see Task 7 review.
  it("shares persisted data across separate adapter instances (simulated app restart)", () => {
    const beforeRestart = new MmkvKeyValueStoreAdapter();
    beforeRestart.setString("session-token", "abc123");

    const afterRestart = new MmkvKeyValueStoreAdapter();

    expect(afterRestart.getString("session-token")).toBe("abc123");
  });

  it("still isolates storage for an explicitly different MMKV instance id", () => {
    const defaultInstance = createMMKV();
    const otherInstance = createMMKV({ id: "some-other-instance" });

    defaultInstance.set("only-in-default", "value");

    expect(otherInstance.getString("only-in-default")).toBeUndefined();
  });
});
