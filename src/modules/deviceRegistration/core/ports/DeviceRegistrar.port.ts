import { Result } from "@/types/Result";
import { DeviceRegistration } from "../entities/DeviceRegistration.entity";

export interface DeviceRegistrar {
  read(): Promise<Result<DeviceRegistration | null, { type: "READ_FAILED" }>>;
  register(registration: DeviceRegistration): Promise<Result<DeviceRegistration, { type: "REGISTER_FAILED" }>>;
}
