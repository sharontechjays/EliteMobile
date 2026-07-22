// Manual Jest mock for expo-crypto — deterministic-enough fake random bytes so tests don't
// depend on the real native RNG (which isn't available under Jest).
export function getRandomBytes(byteCount: number): Uint8Array {
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}
