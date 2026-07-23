import { useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { GetAppReadinessUseCase } from "../../core/usecases/GetAppReadiness.usecase";
import { GetDeviceRegistrationUseCase } from "@modules/deviceRegistration/core/usecases/GetDeviceRegistration.usecase";

// Fake progress bar: starts partially filled (rather than 0) so the splash screen never shows a
// completely empty bar on first paint, and advances in fixed steps rather than being tied to any
// real loading signal — the actual readiness check (GetAppReadinessUseCase) resolves independently
// and doesn't gate this animation.
const INITIAL_PROGRESS = 0.15;
const PROGRESS_STEP = 0.17;
const PROGRESS_INTERVAL_MS = 220;

export const useSplashViewModel = () => {
  const { appReadinessReader, deviceRegistrar } = useDependencies();
  const { strings } = useLanguage();
  const t = strings.splash;
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
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
        const next = Math.min(1, p + PROGRESS_STEP);
        if (next >= 1) {
          clearInterval(timer);
          setReady(true);
        }
        return next;
      });
    }, PROGRESS_INTERVAL_MS);

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
