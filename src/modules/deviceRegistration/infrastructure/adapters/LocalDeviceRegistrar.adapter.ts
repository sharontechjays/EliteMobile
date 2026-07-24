import { Result, ok, fail } from "@/types/Result";
import { DeviceRegistration } from "../../core/entities/DeviceRegistration.entity";
import { DeviceRegistrar } from "../../core/ports/DeviceRegistrar.port";
import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";

const DEVICE_REGISTRATION_KEY = "deviceRegistration.record";

export class LocalDeviceRegistrarAdapter implements DeviceRegistrar {
  constructor(private readonly store: KeyValueStore) {}

  async read(): Promise<Result<DeviceRegistration | null, { type: "READ_FAILED" }>> {
    const raw = this.store.getString(DEVICE_REGISTRATION_KEY);
    if (!raw) return ok(null);
    try {
      return ok(JSON.parse(raw) as DeviceRegistration);
    } catch {
      // Guards against corrupted/malformed stored JSON (e.g. from a prior app version's
      // different shape) actually reaching this port's declared READ_FAILED case instead of
      // throwing an uncaught SyntaxError out of an otherwise Result-typed method.
      return fail({ type: "READ_FAILED" });
    }
  }

  // Overwrites rather than merges — the caller always passes the full record it wants stored
  // (first with status "pending", later replaced wholesale with status "approved"), so there's
  // never a partial-update case to merge against.
  async register(registration: DeviceRegistration): Promise<Result<DeviceRegistration, { type: "REGISTER_FAILED" }>> {
    this.store.setString(DEVICE_REGISTRATION_KEY, JSON.stringify(registration));
    return ok(registration);
  }
}
