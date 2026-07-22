import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { ProfileSummary } from "../../core/entities/ProfileSummary.entity";
import { useProfileViewModel } from "./useProfile.viewModel";

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string) {
    this.map.set(key, value);
  }
}

const MOCK_PROFILE: ProfileSummary = {
  crewLeaderName: "H. Jackson",
  employeeCode: "•••45",
  device: "TABLET-04",
  branch: "Chesterfield",
  language: "English",
  lastSyncLabel: "6:58 AM",
  notifications: [],
};

function buildTestDeps(store: FakeKeyValueStore): Dependencies {
  return {
    keyValueStore: store,
    profileReader: { read: async () => ok(MOCK_PROFILE) },
    deviceRegistrar: { read: async () => ok(null), register: async () => ok({} as never) },
  } as unknown as Dependencies;
}

function wrapperFor(store: FakeKeyValueStore) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <LanguageProvider>{children}</LanguageProvider>
      </DependenciesProvider>
    );
  };
}

describe("useProfileViewModel — real employee code", () => {
  it("falls back to the mock code when no session was persisted", async () => {
    const { result } = renderHook(() => useProfileViewModel(), { wrapper: wrapperFor(new FakeKeyValueStore()) });
    await waitFor(() => expect(result.current.state.profile).not.toBeNull());
    expect(result.current.state.profile?.employeeCode).toBe("•••45");
  });
});
