import { useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { GetAppReadinessUseCase } from "../../core/usecases/GetAppReadiness.usecase";
import { GetDeviceRegistrationUseCase } from "@modules/deviceRegistration/core/usecases/GetDeviceRegistration.usecase";

const formatLastSync = (iso: string | null): string => {
  if (!iso) return "Not yet synced";
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const useSplashViewModel = () => {
  const { appReadinessReader, deviceRegistrar } = useDependencies();
  const [progress, setProgress] = useState(0.15);
  const [lastSyncLabel, setLastSyncLabel] = useState("Checking last sync…");
  const [ready, setReady] = useState(false);
  const [alreadyApproved, setAlreadyApproved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const usecase = new GetAppReadinessUseCase(appReadinessReader);

    usecase.execute().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setLastSyncLabel(formatLastSync(result.data.lastSyncAt));
      }
    });

    new GetDeviceRegistrationUseCase(deviceRegistrar).execute().then((result) => {
      if (cancelled) return;
      if (result.success) setAlreadyApproved(result.data?.status === "approved");
    });

    const timer = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(1, p + 0.17);
        if (next >= 1) {
          clearInterval(timer);
          setReady(true);
        }
        return next;
      });
    }, 220);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state: { progress, lastSyncLabel, ready, alreadyApproved },
  };
};
