import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";

// Adapts this app's existing (synchronous, MMKV-backed, encrypted) KeyValueStore to the
// AsyncStorage<string> shape @tanstack/query-async-storage-persister expects. Its interface
// allows either a value or a Promise of one, so returning the value directly is enough — no
// actual async wrapping needed, and no second storage system (e.g. AsyncStorage) is introduced
// just for this.
export function keyValueStoreAsAsyncStorage(keyValueStore: KeyValueStore) {
  return {
    getItem: (key: string) => keyValueStore.getString(key),
    setItem: (key: string, value: string) => keyValueStore.setString(key, value),
    removeItem: (key: string) => keyValueStore.removeString(key),
  };
}
