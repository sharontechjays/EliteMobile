import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok, fail } from "@/types/Result";
import { useSignInViewModel, SESSION_EMPLOYEE_CODE_KEY } from "./useSignIn.viewModel";

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string) {
    this.map.set(key, value);
  }
}

function buildTestDeps(validCode: string, keyValueStore: FakeKeyValueStore = new FakeKeyValueStore()): Dependencies {
  return {
    keyValueStore,
    sessionAuthenticator: {
      signIn: async (code: string) =>
        code === validCode ? ok({ crewLeaderName: "Test", employeeCode: code }) : fail({ type: "INVALID_CODE" }),
    },
  } as unknown as Dependencies;
}

function wrapperWith(keyValueStore: FakeKeyValueStore) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <DependenciesProvider dependencies={buildTestDeps("12345", keyValueStore)}>{children}</DependenciesProvider>;
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <DependenciesProvider dependencies={buildTestDeps("12345")}>{children}</DependenciesProvider>;
}

describe("useSignInViewModel — explicit confirm key", () => {
  it("does not submit while digits are entered, only when ✓ is pressed with a full code", async () => {
    const onSignedIn = jest.fn();
    const { result } = renderHook(() => useSignInViewModel({ onSignedIn }), { wrapper });

    act(() => {
      "12345".split("").forEach((d) => result.current.handlers.onKeyPress(d));
    });
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(result.current.state.code).toBe("12345");

    await act(async () => result.current.handlers.onKeyPress("✓"));
    expect(onSignedIn).toHaveBeenCalledTimes(1);
  });

  it("✓ with an incomplete code is a no-op", async () => {
    const onSignedIn = jest.fn();
    const { result } = renderHook(() => useSignInViewModel({ onSignedIn }), { wrapper });

    act(() => {
      "123".split("").forEach((d) => result.current.handlers.onKeyPress(d));
    });
    await act(async () => result.current.handlers.onKeyPress("✓"));

    expect(onSignedIn).not.toHaveBeenCalled();
    expect(result.current.state.code).toBe("123");
  });

  it("✓ with a wrong full code sets hasError and clears after the delay", async () => {
    jest.useFakeTimers();
    const onSignedIn = jest.fn();
    const { result } = renderHook(() => useSignInViewModel({ onSignedIn }), { wrapper });

    act(() => {
      "00000".split("").forEach((d) => result.current.handlers.onKeyPress(d));
    });
    await act(async () => result.current.handlers.onKeyPress("✓"));

    expect(result.current.state.hasError).toBe(true);
    act(() => jest.advanceTimersByTime(350));
    expect(result.current.state.hasError).toBe(false);
    expect(result.current.state.code).toBe("");
    jest.useRealTimers();
  });

  it("backspace removes the last digit", async () => {
    const { result } = renderHook(() => useSignInViewModel({ onSignedIn: jest.fn() }), { wrapper });

    act(() => result.current.handlers.onKeyPress("1"));
    act(() => result.current.handlers.onKeyPress("2"));
    act(() => result.current.handlers.onKeyPress("⌫"));

    expect(result.current.state.code).toBe("1");
  });

  it("persists the real employee code to the key-value store on a successful sign-in", async () => {
    const keyValueStore = new FakeKeyValueStore();
    const onSignedIn = jest.fn();
    const { result } = renderHook(() => useSignInViewModel({ onSignedIn }), { wrapper: wrapperWith(keyValueStore) });

    act(() => {
      "12345".split("").forEach((d) => result.current.handlers.onKeyPress(d));
    });
    await act(async () => result.current.handlers.onKeyPress("✓"));

    expect(onSignedIn).toHaveBeenCalledTimes(1);
    expect(keyValueStore.getString(SESSION_EMPLOYEE_CODE_KEY)).toBe("12345");
  });
});
