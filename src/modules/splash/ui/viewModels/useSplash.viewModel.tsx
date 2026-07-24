import { useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { SPLASH_INITIAL_PROGRESS, SPLASH_PROGRESS_INTERVAL_MS, SPLASH_PROGRESS_STEP } from "@/constants/appConstants";
import { ISO8601 } from "@/types/common";
import { GetAppReadinessUseCase } from "../../core/usecases/GetAppReadiness.usecase";
import { GetDeviceRegistrationUseCase } from "@modules/deviceRegistration/core/usecases/GetDeviceRegistration.usecase";

// Raw sync-check outcome, not a pre-localized string — lastSyncLabel is derived from this (plus
// the current language's strings) at render time below, so a language switch mid-check or after
// the check has already resolved always reflects the current language, and a failed read
// transitions out of "checking" instead of getting stuck there forever.
type SyncCheck = { status: "loading" } | { status: "resolved"; lastSyncAt: ISO8601 | null } | { status: "failed" };

export const useSplashViewModel = () => {
  const { appReadinessReader, deviceRegistrar } = useDependencies();
  const { strings } = useLanguage();
  const t = strings.splash;
  const [progress, setProgress] = useState(SPLASH_INITIAL_PROGRESS);
  const [syncCheck, setSyncCheck] = useState<SyncCheck>({ status: "loading" });
  const [ready, setReady] = useState(false);
  const [alreadyApproved, setAlreadyApproved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const usecase = new GetAppReadinessUseCase(appReadinessReader);

    usecase.execute().then((result) => {
      if (cancelled) return;
      setSyncCheck(result.success ? { status: "resolved", lastSyncAt: result.data.lastSyncAt } : { status: "failed" });
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

  const lastSyncLabel =
    syncCheck.status === "loading"
      ? t.checkingSync
      : syncCheck.status === "failed" || !syncCheck.lastSyncAt
        ? t.notYetSynced
        : new Date(syncCheck.lastSyncAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return {
    state: { progress, lastSyncLabel, ready, alreadyApproved },
  };
};
