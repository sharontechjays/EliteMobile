import DeviceIdentityModule from "@native/expo-device-identity";
import { DeviceIdentityKeyPair, DeviceIdentityKeyStore } from "../../core/ports/DeviceIdentityKeyStore.port";

// Wraps the expo-device-identity native module: a P-256 keypair generated inside the Secure
// Enclave (iOS) or hardware Keystore (Android). The private key never leaves the chip and is
// never exposed to JavaScript — only the public key and a hardware-backed flag cross the bridge.
export class NativeDeviceIdentityKeyStoreAdapter implements DeviceIdentityKeyStore {
  async getOrCreateKeyPair(): Promise<DeviceIdentityKeyPair> {
    const publicKey = DeviceIdentityModule.hasKeyPair()
      ? await DeviceIdentityModule.getPublicKey()
      : await DeviceIdentityModule.generateKeyPair();

    return { publicKey, hardwareBacked: DeviceIdentityModule.isHardwareBacked() };
  }
}
