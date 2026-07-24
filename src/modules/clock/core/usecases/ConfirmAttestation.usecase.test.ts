import { ok, fail } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { ConfirmAttestationUseCase } from "./ConfirmAttestation.usecase";

const WORKER_ID = "luis-t" as WorkerId;

describe("ConfirmAttestationUseCase", () => {
  it("records the punch and applies the resulting status update", async () => {
    const recordPunch = jest.fn().mockResolvedValue(ok(undefined));
    const applyPunch = jest.fn().mockResolvedValue(ok(undefined));
    const usecase = new ConfirmAttestationUseCase({ recordPunch }, { applyPunch });

    const result = await usecase.execute(WORKER_ID, "IN");

    expect(result).toEqual(ok(undefined));
    expect(recordPunch).toHaveBeenCalledWith(WORKER_ID, "IN");
    expect(applyPunch).toHaveBeenCalledWith(WORKER_ID, "IN");
  });

  it("does not apply a status update when recording the punch fails", async () => {
    const recordPunch = jest.fn().mockResolvedValue(fail({ type: "RECORD_FAILED" as const }));
    const applyPunch = jest.fn().mockResolvedValue(ok(undefined));
    const usecase = new ConfirmAttestationUseCase({ recordPunch }, { applyPunch });

    const result = await usecase.execute(WORKER_ID, "OUT");

    expect(result).toEqual(fail({ type: "RECORD_FAILED" }));
    expect(applyPunch).not.toHaveBeenCalled();
  });
});
