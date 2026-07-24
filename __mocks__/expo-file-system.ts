// Manual Jest mock for expo-file-system's class-based Paths/Directory/File API — a tiny in-memory
// "filesystem" (a Set of URIs considered to exist) so useCachedVideoSource's cache-hit/miss logic
// and downloadFileAsync call count can be asserted without touching the real native module.
const existingUris = new Set<string>();

function joinUri(parts: (string | { uri: string })[]): string {
  return parts
    .map((part) => (typeof part === "string" ? part : part.uri))
    .join("/")
    .replace(/([^:])\/{2,}/g, "$1/");
}

class FakeFileSystemNode {
  uri: string;
  constructor(...uris: (string | { uri: string })[]) {
    this.uri = joinUri(uris);
  }
  get exists(): boolean {
    return existingUris.has(this.uri);
  }
}

export class Directory extends FakeFileSystemNode {
  create(): void {
    existingUris.add(this.uri);
  }
}

export class File extends FakeFileSystemNode {
  static downloadFileAsync = jest.fn(async (_url: string, destination: Directory | File) => {
    existingUris.add(destination.uri);
    return new File(destination.uri);
  });
}

export const Paths = {
  cache: new Directory("file:///fake-cache/"),
};

export function __resetFakeFileSystem(): void {
  existingUris.clear();
  File.downloadFileAsync.mockClear();
}
