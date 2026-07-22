export type DeviceRegistrationStatus = "registering" | "pending" | "approved";

export interface DeviceRegistration {
  deviceName: string;
  status: DeviceRegistrationStatus;
  publicKey: string;
  hardwareBacked: boolean;
}
