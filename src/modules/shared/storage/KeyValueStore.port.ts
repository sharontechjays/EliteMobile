export interface KeyValueStore {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  removeString(key: string): void;
}
