import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { MMKV_ENCRYPTION_KEY_BYTE_COUNT } from "@/constants/appConstants";

const SECURE_STORE_KEY = "mmkv.encryptionKey";

// Hermes doesn't guarantee a global `btoa`, so this encodes without relying on one.
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toBase64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    result += BASE64_ALPHABET[b0 >> 2];
    result += BASE64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    result += b1 === undefined ? "=" : BASE64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)];
    result += b2 === undefined ? "=" : BASE64_ALPHABET[b2 & 0x3f];
  }
  return result;
}

// MMKV needs the identical key on every launch to decrypt what it wrote last time, so the
// generated key is persisted in the platform's Keychain (iOS) / Keystore-backed
// EncryptedSharedPreferences (Android) via expo-secure-store — never inside MMKV itself,
// which would be circular, and never as a plain JS constant, which would defeat the point.
export function getOrCreateMmkvEncryptionKey(): string {
  const existing = SecureStore.getItem(SECURE_STORE_KEY);
  if (existing) return existing;

  const key = toBase64(Crypto.getRandomBytes(MMKV_ENCRYPTION_KEY_BYTE_COUNT));
  SecureStore.setItem(SECURE_STORE_KEY, key);
  return key;
}
