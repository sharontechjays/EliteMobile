import { Result, ok, fail } from "@/types/Result";
import { DeviceIdentityKeyPair, DeviceIdentityKeyStore } from "../ports/DeviceIdentityKeyStore.port";

export class GetOrCreateDeviceKeyPairUseCase {
  constructor(private readonly keyStore: DeviceIdentityKeyStore) {}

  async execute(): Promise<Result<DeviceIdentityKeyPair, { type: "KEY_GENERATION_FAILED" }>> {
    try {
      return ok(await this.keyStore.getOrCreateKeyPair());
    } catch {
      return fail({ type: "KEY_GENERATION_FAILED" });
    }
  }
}
