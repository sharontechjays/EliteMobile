import { useCallback, useEffect, useState } from "react";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { GetOrCreateDeviceKeyPairUseCase } from "../../core/usecases/GetOrCreateDeviceKeyPair.usecase";
import { RegisterDeviceUseCase } from "../../core/usecases/RegisterDevice.usecase";
import { DeviceRegistrationStatus } from "../../core/entities/DeviceRegistration.entity";

// Mock seed value standing in for whatever a real device-naming flow would default to — not a
// meaningful business rule, just placeholder content matching this prototype's other mock data
// (see elite-mobile-clean-architecture's localization section on mock-data conventions).
const DEFAULT_NICKNAME = "Chesterfield – Device 2";

type SecuringStatus = "securing" | "secured" | "failed";

interface DeviceStep {
  done: boolean;
  title: string;
  sub: string;
}

interface UseDeviceRegistrationViewModelArgs {
  onContinue: () => void;
}

export const useDeviceRegistrationViewModel = ({ onContinue }: UseDeviceRegistrationViewModelArgs) => {
  const { deviceIdentityKeyStore, deviceRegistrar } = useDependencies();
  const { strings } = useLanguage();
  const t = strings.deviceRegistration;
  const [status, setStatus] = useState<DeviceRegistrationStatus>("registering");
  const [nickname, setNickname] = useState(DEFAULT_NICKNAME);
  const [securingStatus, setSecuringStatus] = useState<SecuringStatus>("securing");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [hardwareBacked, setHardwareBacked] = useState(false);

  // Device.osName falls back to "iOS" specifically (not a generic "unknown OS" string) because
  // this app is iOS-only for now — an Android build would need this fallback revisited.
  const deviceModel = `${Device.modelName ?? t.unknownDevice} · ${Device.osName ?? "iOS"} ${Device.osVersion ?? t.unknownVersion}`;
  const appVersion = Constants.expoConfig?.version ?? t.unknownVersion;

  // Every device generates its own P-256 keypair on first launch — inside the Secure Enclave
  // (iOS) or hardware Keystore (Android) when the chip supports it, otherwise a software-backed
  // fallback (e.g. the simulator). The private key never leaves this call; only the public key
  // goes on to the registration request below.
  const secureDevice = useCallback(async () => {
    setSecuringStatus("securing");
    const usecase = new GetOrCreateDeviceKeyPairUseCase(deviceIdentityKeyStore);
    const result = await usecase.execute();
    if (result.success) {
      setPublicKey(result.data.publicKey);
      setHardwareBacked(result.data.hardwareBacked);
      setSecuringStatus("secured");
    } else {
      setSecuringStatus("failed");
    }
    // Empty deps deliberately: this must run exactly once per mount (plus on manual retry via
    // onRetrySecure below), never automatically re-run on a re-render — deviceIdentityKeyStore is
    // a DI-provided singleton stable for the app's lifetime, so omitting it is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    secureDevice();
  }, [secureDevice]);

  const steps: DeviceStep[] = [
    {
      done: securingStatus === "secured",
      title: t.stepSecuredTitle,
      sub:
        securingStatus === "securing"
          ? t.stepSecuringBody
          : securingStatus === "failed"
            ? t.stepSecureFailedBody
            : hardwareBacked
              ? t.stepSecureHardwareBody
              : t.stepSecureSoftwareBody,
    },
    { done: status !== "registering", title: t.stepRegisteredTitle, sub: t.stepRegisteredBody },
    { done: status === "approved", title: t.stepApprovalTitle, sub: t.stepApprovalBody },
  ];

  const onRegister = useCallback(async () => {
    if (!publicKey) return;
    setStatus("pending");
    const usecase = new RegisterDeviceUseCase(deviceRegistrar);
    await usecase.execute({ deviceName: nickname, status: "pending", publicKey, hardwareBacked });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname, publicKey, hardwareBacked]);

  // Demo-only affordance standing in for the office's approval console — this whole app runs
  // on in-memory mock adapters, so there's no real backend to approve the device from.
  const onDemoApprove = useCallback(async () => {
    if (!publicKey) return;
    setStatus("approved");
    const usecase = new RegisterDeviceUseCase(deviceRegistrar);
    await usecase.execute({ deviceName: nickname, status: "approved", publicKey, hardwareBacked });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname, publicKey, hardwareBacked]);

  return {
    state: {
      status,
      nickname,
      deviceModel,
      appVersion,
      steps,
      canRegister: securingStatus === "secured",
      securingFailed: securingStatus === "failed",
    },
    handlers: {
      onChangeNickname: setNickname,
      onRegister,
      onDemoApprove,
      onContinue,
      onRetrySecure: secureDevice,
    },
  };
};
