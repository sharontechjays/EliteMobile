import { renderHook, waitFor } from "@testing-library/react-native";
import { File } from "expo-file-system";
// Imported from the mock's own relative path (not the "expo-file-system" specifier) so
// TypeScript resolves this test-only helper against the mock's types — the real package's
// types don't export it, even though Jest resolves the specifier itself to the mock below.
import { __resetFakeFileSystem } from "../../../__mocks__/expo-file-system";
import { useCachedVideoSource } from "./useCachedVideoSource";

// jest-expo's own setup already calls jest.mock("expo-file-system", ...) with the legacy
// string-path API this project no longer uses — override it here with the project's manual
// mock of the new Paths/Directory/File API (see __mocks__/expo-file-system.ts). jest.mock calls
// are hoisted above imports by babel-jest, so this takes effect before the imports above resolve.
jest.mock("expo-file-system", () => jest.requireActual("../../../__mocks__/expo-file-system"));

const REMOTE_URI = "https://example.com/videos/site-walkthrough.mp4";
const REMOTE_URI_2 = "https://example.com/videos/second-clip.mp4";
const LOCAL_URI = "file:///captured/clip.mov";

beforeEach(() => __resetFakeFileSystem());

describe("useCachedVideoSource", () => {
  it("resolves a local file:// uri immediately, with no download and no resolving state", () => {
    const { result } = renderHook(() => useCachedVideoSource(LOCAL_URI));

    expect(result.current.isResolving).toBe(false);
    expect(result.current.resolvedUri).toBe(LOCAL_URI);
    expect(File.downloadFileAsync).not.toHaveBeenCalled();
  });

  it("downloads a remote uri once, then resolves to the cached local file", async () => {
    const { result } = renderHook(() => useCachedVideoSource(REMOTE_URI));

    expect(result.current.isResolving).toBe(true);

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.resolvedUri).toContain("fake-cache");
    expect(File.downloadFileAsync).toHaveBeenCalledTimes(1);
  });

  it("does not re-download or re-show a loading state for a uri already resolved this session", async () => {
    const first = renderHook(() => useCachedVideoSource(REMOTE_URI_2));
    await waitFor(() => expect(first.result.current.isResolving).toBe(false));

    const second = renderHook(() => useCachedVideoSource(REMOTE_URI_2));

    expect(second.result.current.isResolving).toBe(false);
    expect(second.result.current.resolvedUri).toBe(first.result.current.resolvedUri);
    expect(File.downloadFileAsync).toHaveBeenCalledTimes(1);
  });

  it("returns null with no resolving state when uri is null", () => {
    const { result } = renderHook(() => useCachedVideoSource(null));

    expect(result.current.resolvedUri).toBeNull();
    expect(result.current.isResolving).toBe(false);
  });
});
