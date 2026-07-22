import { Result } from "@/types/Result";
import { DeviceRegistration } from "../entities/DeviceRegistration.entity";
import { DeviceRegistrar } from "../ports/DeviceRegistrar.port";

export class RegisterDeviceUseCase {
  constructor(private readonly registrar: DeviceRegistrar) {}

  async execute(registration: DeviceRegistration): Promise<Result<DeviceRegistration, { type: "REGISTER_FAILED" }>> {
    return this.registrar.register(registration);
  }
}
