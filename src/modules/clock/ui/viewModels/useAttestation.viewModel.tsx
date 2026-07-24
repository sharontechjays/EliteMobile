import { useCallback, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { useDependencies } from "@app/react/useDependencies";
import { useMealReminders } from "@app/react/mealReminders/useMealReminders";
import { useTimer } from "@app/react/timer/useTimer";
import { ATTESTATION_MIN_CODE_LENGTH, DAY_TIMER_ID } from "@/constants/appConstants";
import { ConfirmAttestationUseCase } from "../../core/usecases/ConfirmAttestation.usecase";
import { AttestationWorker } from "../../core/entities/AttestationWorker.entity";

interface UseAttestationViewModelArgs {
  queue: AttestationWorker[];
  onDone: () => void;
}

export const useAttestationViewModel = ({ queue, onDone }: UseAttestationViewModelArgs) => {
  const { punchRecorder, workerStatusRecorder } = useDependencies();
  const { startReminder, stopReminder } = useMealReminders();
  const timer = useTimer();
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  // React state updates aren't synchronous — a double-tap before the `confirming` state's
  // re-render lands could read the old `false` value twice and submit the same worker's
  // attestation twice. This ref is set/cleared synchronously around the async work instead.
  const confirmingRef = useRef(false);

  const current = queue[index] ?? null;

  const onCodeChange = useCallback((value: string) => {
    setCode(value);
    setCodeError(false);
  }, []);

  const onConfirm = useCallback(async () => {
    if (!current || confirmingRef.current) return;
    if (code.length < ATTESTATION_MIN_CODE_LENGTH) return;

    if (code !== current.employeeCode) {
      setCodeError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    confirmingRef.current = true;
    setConfirming(true);
    try {
      const usecase = new ConfirmAttestationUseCase(punchRecorder, workerStatusRecorder);
      await usecase.execute(current.id, current.direction);

      // Clocking IN starts this worker's meal-reminder cascade (see MealReminderProvider);
      // clocking OUT stops and clears it so a later clock-in restarts fresh.
      if (current.direction === "IN") startReminder(current.id, current.name);
      else stopReminder(current.id);

      // The app-wide "day timer" (TopBar, every screen) starts on the day's first IN punch —
      // timer.start() is a no-op if it's already running, so later punches (this worker or any
      // other) never restart it, and it keeps ticking regardless of individual clock-outs.
      if (current.direction === "IN") timer.start(DAY_TIMER_ID);

      setCode("");
      setCodeError(false);

      if (index + 1 >= queue.length) {
        onDone();
        return;
      }
      setIndex(index + 1);
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
    }
  }, [
    current,
    code,
    punchRecorder,
    workerStatusRecorder,
    startReminder,
    stopReminder,
    timer,
    index,
    queue.length,
    onDone,
  ]);

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
