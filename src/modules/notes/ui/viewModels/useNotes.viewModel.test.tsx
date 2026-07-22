import React from "react";
import { ActionSheetIOS } from "react-native";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok, fail } from "@/types/Result";
import { en } from "@app/react/language/translations/en";
import { MediaCapture } from "@modules/tickets/core/ports/MediaCapture.port";
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

function buildTestDeps(captureMedia: MediaCapture["captureMedia"]): Dependencies {
  return {
    keyValueStore: new FakeKeyValueStore(),
    noteSaver: { save: async () => ok(undefined) },
    mediaCapture: { captureMedia },
  } as unknown as Dependencies;
}

function wrapperWithCapture(captureMedia: MediaCapture["captureMedia"]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DependenciesProvider dependencies={buildTestDeps(captureMedia)}>
        <LanguageProvider>{children}</LanguageProvider>
      </DependenciesProvider>
    );
  };
}

// Simulates the crew leader tapping "Take Photo" (index 0) unless a test picks a different index.
function mockActionSheet(buttonIndex = 0) {
  return jest
    .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
    .mockImplementation((_options, callback) => callback(buttonIndex));
}

describe("useNotesViewModel — photo/video tiles", () => {
  afterEach(() => jest.restoreAllMocks());

  it("starts with no tiles — nothing shows until the crew leader actually captures something", () => {
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper: wrapperWithCapture(async () =>
        ok({ kind: "photo", uri: "file://x.jpg", width: 1080, height: 1920, thumbnailUri: "file://x.jpg" }),
      ),
    });
    expect(result.current.state.photos).toEqual([]);
  });

  it("onRemovePhoto removes exactly the captured tile with the matching id", async () => {
    mockActionSheet(0);
    const captureMedia = jest.fn(async () =>
      ok({ kind: "photo" as const, uri: "file://x.jpg", width: 1080, height: 1920, thumbnailUri: "file://x.jpg" }),
    );
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper: wrapperWithCapture(captureMedia),
    });
    await act(async () => result.current.handlers.onAddPhoto());
    const idToRemove = result.current.state.photos[0].id;

    act(() => result.current.handlers.onRemovePhoto(idToRemove));

    expect(result.current.state.photos.find((p) => p.id === idToRemove)).toBeUndefined();
    expect(result.current.state.photos).toHaveLength(0);
  });

  it("shows the Photo/Video/Cancel action sheet and captures a real photo when Take Photo is chosen", async () => {
    mockActionSheet(0);
    const captureMedia = jest.fn(async () =>
      ok({
        kind: "photo" as const,
        uri: "file://captured.jpg",
        width: 1080,
        height: 1920,
        thumbnailUri: "file://captured.jpg",
      }),
    );
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper: wrapperWithCapture(captureMedia),
    });

    await act(async () => result.current.handlers.onAddPhoto());

    expect(ActionSheetIOS.showActionSheetWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [en.notes.takePhotoOption, en.notes.recordVideoOption, en.common.cancel],
      }),
      expect.any(Function),
    );
    expect(captureMedia).toHaveBeenCalledWith("photo");
    const added = result.current.state.photos.at(-1);
    expect(added).toMatchObject({ kind: "photo", uri: "file://captured.jpg" });
  });

  it("captures a real video when Record Video is chosen", async () => {
    mockActionSheet(1);
    const captureMedia = jest.fn(async () =>
      ok({
        kind: "video" as const,
        uri: "file://clip.mov",
        width: 1080,
        height: 1920,
        thumbnailUri: "file://clip.mov",
      }),
    );
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper: wrapperWithCapture(captureMedia),
    });

    await act(async () => result.current.handlers.onAddPhoto());

    expect(captureMedia).toHaveBeenCalledWith("video");
    expect(result.current.state.photos.at(-1)).toMatchObject({ kind: "video", uri: "file://clip.mov" });
  });

  it("adds no tile and shows no error when the action sheet is cancelled", async () => {
    mockActionSheet(2); // Cancel
    const captureMedia = jest.fn(async () =>
      ok({ kind: "photo" as const, uri: "file://x.jpg", width: 1080, height: 1920, thumbnailUri: "file://x.jpg" }),
    );
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper: wrapperWithCapture(captureMedia),
    });
    const before = result.current.state.photos.length;

    await act(async () => result.current.handlers.onAddPhoto());

    expect(captureMedia).not.toHaveBeenCalled();
    expect(result.current.state.photos).toHaveLength(before);
    expect(result.current.state.attachmentErrorMessage).toBeNull();
  });

  it("shows a permission-denied message and does not add a tile", async () => {
    mockActionSheet(0);
    const captureMedia = jest.fn(async () => fail({ type: "PERMISSION_DENIED" as const }));
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper: wrapperWithCapture(captureMedia),
    });
    const before = result.current.state.photos.length;

    await act(async () => result.current.handlers.onAddPhoto());

    expect(result.current.state.photos).toHaveLength(before);
    expect(result.current.state.attachmentErrorIsPermission).toBe(true);
    expect(result.current.state.attachmentErrorMessage).toBe(en.notes.attachmentErrorPermissionDenied);
  });

  it("onAddPhoto still respects the max-photos cap, even across repeated captures", async () => {
    mockActionSheet(0);
    const captureMedia = jest.fn(async () =>
      ok({ kind: "photo" as const, uri: "file://x.jpg", width: 1080, height: 1920, thumbnailUri: "file://x.jpg" }),
    );
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper: wrapperWithCapture(captureMedia),
    });
    const before = result.current.state.photos.length;
    const max = result.current.state.maxPhotos;

    for (let i = 0; i < max + 2; i++) {
      await act(async () => result.current.handlers.onAddPhoto());
    }

    expect(result.current.state.photos.length).toBeLessThanOrEqual(max);
    expect(result.current.state.photos.length).toBeGreaterThanOrEqual(before);
  });

  it("opens and closes a preview for a captured tile", async () => {
    mockActionSheet(0);
    const captureMedia = jest.fn(async () =>
      ok({
        kind: "photo" as const,
        uri: "file://captured.jpg",
        width: 1080,
        height: 1920,
        thumbnailUri: "file://captured.jpg",
      }),
    );
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), {
      wrapper: wrapperWithCapture(captureMedia),
    });

    await act(async () => result.current.handlers.onAddPhoto());
    const captured = result.current.state.photos.at(-1)!;

    act(() => result.current.handlers.onPreviewPhoto(captured));
    expect(result.current.state.previewMedia).toEqual(captured);

    act(() => result.current.handlers.onClosePreview());
    expect(result.current.state.previewMedia).toBeNull();
  });
});
