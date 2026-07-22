import { NativeModule, requireNativeModule } from 'expo';

import { DeviceIdentityModuleEvents } from './DeviceIdentity.types';

declare class DeviceIdentityModule extends NativeModule<DeviceIdentityModuleEvents> {
  isHardwareBacked(): boolean;
  hasKeyPair(): boolean;
  generateKeyPair(): Promise<string>;
  getPublicKey(): Promise<string>;
  signChallenge(challenge: string): Promise<string>;
  deleteKeyPair(): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<DeviceIdentityModule>('DeviceIdentity');
