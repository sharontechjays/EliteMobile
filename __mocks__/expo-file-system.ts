// Manual Jest mock for expo-file-system's class-based Paths/Directory/File API — a tiny in-memory
// "filesystem" (a Set of URIs considered to exist) so useCachedVideoSource's cache-hit/miss logic
// and downloadFileAsync call count can be asserted without touching the real native module.
const existingUris = new Set<string>();

function joinUri(parts: (string | { uri: string })[]): string {
  const joined = parts.map((part) => (typeof part === "string" ? part : part.uri)).join("/");
  // Collapsing duplicate slashes must not touch the scheme separator itself — file:// and
  // https:// URIs need their own "//" preserved (three total for file:///path) — so only the
  // portion after the scheme gets deduplicated.
  const schemeMatch = joined.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)(.*)$/);
  if (!schemeMatch) return joined.replace(/\/{2,}/g, "/");
  const [, scheme, rest] = schemeMatch;
  return scheme + rest.replace(/\/{2,}/g, "/");
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
