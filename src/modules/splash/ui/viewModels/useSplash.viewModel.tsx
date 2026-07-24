import { useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { SPLASH_INITIAL_PROGRESS, SPLASH_PROGRESS_INTERVAL_MS, SPLASH_PROGRESS_STEP } from "@/constants/appConstants";
import { GetAppReadinessUseCase } from "../../core/usecases/GetAppReadiness.usecase";
import { GetDeviceRegistrationUseCase } from "@modules/deviceRegistration/core/usecases/GetDeviceRegistration.usecase";

export const useSplashViewModel = () => {
  const { appReadinessReader, deviceRegistrar } = useDependencies();
  const { strings } = useLanguage();
  const t = strings.splash;
  const [progress, setProgress] = useState(SPLASH_INITIAL_PROGRESS);
  const [lastSyncLabel, setLastSyncLabel] = useState(t.checkingSync);
  const [ready, setReady] = useState(false);
  const [alreadyApproved, setAlreadyApproved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const usecase = new GetAppReadinessUseCase(appReadinessReader);

    usecase.execute().then((result) => {
      if (cancelled) return;
      if (result.success) {
        const iso = result.data.lastSyncAt;
        setLastSyncLabel(
          iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : t.notYetSynced,
        );
      }
    });

    new GetDeviceRegistrationUseCase(deviceRegistrar).execute().then((result) => {
      if (cancelled) return;
      if (result.success) setAlreadyApproved(result.data?.status === "approved");
    });

    const timer = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(1, p + SPLASH_PROGRESS_STEP);
        if (next >= 1) {
          clearInterval(timer);
          setReady(true);
        }
        return next;
      });
    }, SPLASH_PROGRESS_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // Deliberately runs once on mount only — appReadinessReader/deviceRegistrar are DI-provided
    // singletons stable for the app's lifetime, and re-running this on every render would restart
    // the progress animation and re-fire both reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state: { progress, lastSyncLabel, ready, alreadyApproved },
  };
};
