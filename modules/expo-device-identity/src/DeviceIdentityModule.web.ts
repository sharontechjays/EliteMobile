import { registerWebModule, NativeModule } from "expo";

import { DeviceIdentityModuleEvents } from "./DeviceIdentity.types";

const UNSUPPORTED_MESSAGE = "Hardware-backed device identity is not available on web.";

class DeviceIdentityModule extends NativeModule<DeviceIdentityModuleEvents> {
  isHardwareBacked(): boolean {
    return false;
  }
  hasKeyPair(): boolean {
    return false;
  }
  async generateKeyPair(): Promise<string> {
    throw new Error(UNSUPPORTED_MESSAGE);
  }
  async getPublicKey(): Promise<string> {
    throw new Error(UNSUPPORTED_MESSAGE);
  }
  async signChallenge(_challenge: string): Promise<string> {
    throw new Error(UNSUPPORTED_MESSAGE);
  }
  async deleteKeyPair(): Promise<void> {
    throw new Error(UNSUPPORTED_MESSAGE);
  }
}

export default registerWebModule(DeviceIdentityModule, "DeviceIdentityModule");
