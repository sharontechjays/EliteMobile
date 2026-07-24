import { useCallback, useState } from "react";
import * as Haptics from "expo-haptics";
import { useDependencies } from "@app/react/useDependencies";
import { ATTESTATION_MIN_CODE_LENGTH } from "@/constants/appConstants";
import { ConfirmAttestationUseCase } from "../../core/usecases/ConfirmAttestation.usecase";
import { AttestationWorker } from "../../core/entities/AttestationWorker.entity";

interface UseAttestationViewModelArgs {
  queue: AttestationWorker[];
  onDone: () => void;
}

export const useAttestationViewModel = ({ queue, onDone }: UseAttestationViewModelArgs) => {
  const { punchRecorder } = useDependencies();
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  const current = queue[index] ?? null;

  const onCodeChange = useCallback((value: string) => {
    setCode(value);
    setCodeError(false);
  }, []);

  const onConfirm = useCallback(async () => {
    // confirming guards against a double-tap re-submitting the same worker's attestation while
    // the async punchRecorder call from a previous tap is still in flight.
    if (!current || confirming) return;
    if (code.length < ATTESTATION_MIN_CODE_LENGTH) return;

    if (code !== current.employeeCode) {
      setCodeError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setConfirming(true);
    const usecase = new ConfirmAttestationUseCase(punchRecorder);
    await usecase.execute(current.id, current.direction);
    setConfirming(false);

    setCode("");
    setCodeError(false);

    if (index + 1 >= queue.length) {
      onDone();
      return;
    }
    setIndex(index + 1);
  }, [current, confirming, code, punchRecorder, index, queue.length, onDone]);

  return {
    state: {
      current,
      position: index + 1,
      total: queue.length,
      confirming,
      code,
      codeError,
      canConfirm: code.length >= ATTESTATION_MIN_CODE_LENGTH,
    },
    handlers: { onConfirm, onCodeChange },
  };
};
