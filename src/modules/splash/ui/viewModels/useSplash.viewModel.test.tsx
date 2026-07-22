import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { DeviceRegistration } from "@modules/deviceRegistration/core/entities/DeviceRegistration.entity";
import { useSplashViewModel } from "./useSplash.viewModel";

function buildTestDeps(registration: DeviceRegistration | null): Dependencies {
  return {
    appReadinessReader: { read: async () => ok({ lastSyncAt: null }) },
    deviceRegistrar: { read: async () => ok(registration), register: async (r: DeviceRegistration) => ok(r) },
  } as unknown as Dependencies;
}

function wrapperFor(registration: DeviceRegistration | null) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <DependenciesProvider dependencies={buildTestDeps(registration)}>{children}</DependenciesProvider>;
  };
}

describe("useSplashViewModel — device approval check", () => {
  it("alreadyApproved is false when no device registration exists yet", async () => {
    const { result } = renderHook(() => useSplashViewModel(), { wrapper: wrapperFor(null) });
    await waitFor(() => expect(result.current.state.alreadyApproved).toBe(false));
  });

  it("alreadyApproved is false when the device is still pending", async () => {
    const registration: DeviceRegistration = {
      deviceName: "d",
      status: "pending",
      publicKey: "k",
      hardwareBacked: true,
    };
    const { result } = renderHook(() => useSplashViewModel(), { wrapper: wrapperFor(registration) });
    await waitFor(() => expect(result.current.state.alreadyApproved).toBe(false));
  });

  it("alreadyApproved is true when the device was previously approved", async () => {
    const registration: DeviceRegistration = {
      deviceName: "d",
      status: "approved",
      publicKey: "k",
      hardwareBacked: true,
    };
    const { result } = renderHook(() => useSplashViewModel(), { wrapper: wrapperFor(registration) });
    await waitFor(() => expect(result.current.state.alreadyApproved).toBe(true));
  });
});
