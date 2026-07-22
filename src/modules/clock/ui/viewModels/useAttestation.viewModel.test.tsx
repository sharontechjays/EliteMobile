import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { useAttestationViewModel } from "./useAttestation.viewModel";
import { AttestationWorker } from "../../core/entities/AttestationWorker.entity";
import { WorkerId } from "@/types/ids";

const QUEUE: AttestationWorker[] = [
  { id: "roy-brown" as WorkerId, name: "Roy Brown", initials: "RB", direction: "IN", employeeCode: "4821" },
  { id: "brent-m" as WorkerId, name: "Brent M.", initials: "BM", direction: "OUT", employeeCode: "7734" },
];

function buildTestDeps(): Dependencies {
  return {
    punchRecorder: { recordPunch: async () => ok(undefined) },
  } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <DependenciesProvider dependencies={buildTestDeps()}>{children}</DependenciesProvider>;
}

describe("useAttestationViewModel — employee code verification", () => {
  it("does not advance and sets codeError when the code doesn't match", async () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useAttestationViewModel({ queue: QUEUE, onDone }), { wrapper });

    act(() => result.current.handlers.onCodeChange("0000"));
    await act(async () => result.current.handlers.onConfirm());

    expect(result.current.state.current?.id).toBe("roy-brown");
    expect(result.current.state.codeError).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("advances to the next worker and clears the code when it matches", async () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useAttestationViewModel({ queue: QUEUE, onDone }), { wrapper });

    act(() => result.current.handlers.onCodeChange("4821"));
    await act(async () => result.current.handlers.onConfirm());

    expect(result.current.state.current?.id).toBe("brent-m");
    expect(result.current.state.code).toBe("");
    expect(result.current.state.codeError).toBe(false);
  });

  it("clears a stale error once the code is edited again", async () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useAttestationViewModel({ queue: QUEUE, onDone }), { wrapper });

    act(() => result.current.handlers.onCodeChange("0000"));
    await act(async () => result.current.handlers.onConfirm());
    expect(result.current.state.codeError).toBe(true);

    act(() => result.current.handlers.onCodeChange("482"));
    expect(result.current.state.codeError).toBe(false);
  });

  it("calls onDone after the last worker confirms with the correct code", async () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useAttestationViewModel({ queue: [QUEUE[1]], onDone }), { wrapper });

    act(() => result.current.handlers.onCodeChange("7734"));
    await act(async () => result.current.handlers.onConfirm());

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
