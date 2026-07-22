import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { useNotesViewModel } from "./useNotes.viewModel";

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string) {
    this.map.set(key, value);
  }
}

function buildTestDeps(): Dependencies {
  return {
    keyValueStore: new FakeKeyValueStore(),
    noteSaver: { save: async () => ok(undefined) },
  } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DependenciesProvider dependencies={buildTestDeps()}>
      <LanguageProvider>{children}</LanguageProvider>
    </DependenciesProvider>
  );
}

describe("useNotesViewModel — photo/video tiles", () => {
  it("starts with the two seeded tiles, one photo and one video", () => {
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper,
    });
    expect(result.current.state.photos.map((p) => p.kind)).toEqual(["photo", "video"]);
  });

  it("onRemovePhoto removes exactly the tile with the matching id", () => {
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper,
    });
    const idToRemove = result.current.state.photos[0].id;

    act(() => result.current.handlers.onRemovePhoto(idToRemove));

    expect(result.current.state.photos.find((p) => p.id === idToRemove)).toBeUndefined();
    expect(result.current.state.photos).toHaveLength(1);
  });

  it("onAddPhoto still respects the max-photos cap", () => {
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper,
    });
    const before = result.current.state.photos.length;
    const max = result.current.state.maxPhotos;

    for (let i = 0; i < max + 2; i++) {
      act(() => result.current.handlers.onAddPhoto());
    }

    expect(result.current.state.photos.length).toBeLessThanOrEqual(max);
    expect(result.current.state.photos.length).toBeGreaterThanOrEqual(before);
  });
});
