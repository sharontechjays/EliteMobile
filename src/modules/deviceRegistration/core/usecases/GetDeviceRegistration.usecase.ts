import { Result } from "@/types/Result";
import { DeviceRegistration } from "../entities/DeviceRegistration.entity";
import { DeviceRegistrar } from "../ports/DeviceRegistrar.port";

export class GetDeviceRegistrationUseCase {
  constructor(private readonly registrar: DeviceRegistrar) {}

  async execute(): Promise<Result<DeviceRegistration | null, { type: "READ_FAILED" }>> {
    return this.registrar.read();
  }
}
