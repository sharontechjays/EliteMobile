import { Result, ok, fail } from "@/types/Result";
import { DeviceIdentityKeyPair, DeviceIdentityKeyStore } from "../ports/DeviceIdentityKeyStore.port";

export class GetOrCreateDeviceKeyPairUseCase {
  constructor(private readonly keyStore: DeviceIdentityKeyStore) {}

  async execute(): Promise<Result<DeviceIdentityKeyPair, { type: "KEY_GENERATION_FAILED" }>> {
    try {
      return ok(await this.keyStore.getOrCreateKeyPair());
    } catch {
      // Collapses whatever the native Secure Enclave call actually threw into one generic error
      // — the UI only ever shows a single "couldn't set up this device" message regardless of
      // cause, so preserving the native error's specifics wouldn't currently be surfaced anyway.
      return fail({ type: "KEY_GENERATION_FAILED" });
    }
  }
}
