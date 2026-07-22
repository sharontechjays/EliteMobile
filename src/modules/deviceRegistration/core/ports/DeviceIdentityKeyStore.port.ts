export interface DeviceIdentityKeyPair {
  publicKey: string;
  hardwareBacked: boolean;
}

export interface DeviceIdentityKeyStore {
  // Returns the device's existing keypair, or generates a fresh one (in the Secure Enclave /
  // hardware Keystore where available) if this is the first time the device is registering.
  getOrCreateKeyPair(): Promise<DeviceIdentityKeyPair>;
}
