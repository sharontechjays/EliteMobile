import { Result, ok } from "@/types/Result";
import { DeviceRegistration } from "../../core/entities/DeviceRegistration.entity";
import { DeviceRegistrar } from "../../core/ports/DeviceRegistrar.port";
import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";

const DEVICE_REGISTRATION_KEY = "deviceRegistration.record";

export class LocalDeviceRegistrarAdapter implements DeviceRegistrar {
  constructor(private readonly store: KeyValueStore) {}

  async read(): Promise<Result<DeviceRegistration | null, { type: "READ_FAILED" }>> {
    const raw = this.store.getString(DEVICE_REGISTRATION_KEY);
    return ok(raw ? (JSON.parse(raw) as DeviceRegistration) : null);
  }

  async register(registration: DeviceRegistration): Promise<Result<DeviceRegistration, { type: "REGISTER_FAILED" }>> {
    this.store.setString(DEVICE_REGISTRATION_KEY, JSON.stringify(registration));
    return ok(registration);
  }
}
