import { useEffect, useState } from "react";
import { Directory, File, Paths } from "expo-file-system";

const VIDEO_CACHE_DIRNAME = "ticket-video-cache";
const DEFAULT_VIDEO_EXTENSION = ".mp4";

// Resolved URIs are kept for the lifetime of the app process, so remounting a player for the
// same remote video (e.g. navigating away and back) never re-shows a loading state — only the
// very first resolution of a given URI touches disk/network.
const resolvedThisSession = new Map<string, string>();

function isRemoteUri(uri: string): boolean {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

function cacheFileNameFor(uri: string): string {
  const withoutQuery = uri.split("?")[0];
  const extensionMatch = /\.[a-zA-Z0-9]+$/.exec(withoutQuery);
  const extension = extensionMatch ? extensionMatch[0] : DEFAULT_VIDEO_EXTENSION;
  let hash = 0;
  for (let i = 0; i < uri.length; i += 1) {
    hash = (hash * 31 + uri.charCodeAt(i)) | 0;
  }
  return `${Math.abs(hash)}${extension}`;
}

async function resolveToLocalUri(uri: string): Promise<string> {
  const cacheDir = new Directory(Paths.cache, VIDEO_CACHE_DIRNAME);
  if (!cacheDir.exists) cacheDir.create({ intermediates: true });

  const localFile = new File(cacheDir, cacheFileNameFor(uri));
  if (localFile.exists) return localFile.uri;

  const downloaded = await File.downloadFileAsync(uri, localFile);
  return downloaded.uri;
}

interface CachedVideoSource {
  resolvedUri: string | null;
  isResolving: boolean;
}

// Local (file://) sources play directly with no caching step. Remote (http/https) sources are
// downloaded once to the on-device cache and played from disk on every subsequent mount, so
// network streaming only ever happens the first time a given video is viewed.
export function useCachedVideoSource(uri: string | null): CachedVideoSource {
  const initialResolved = uri && !isRemoteUri(uri) ? uri : uri ? (resolvedThisSession.get(uri) ?? null) : null;
  const [resolvedUri, setResolvedUri] = useState<string | null>(initialResolved);
  const [isResolving, setIsResolving] = useState(() => uri != null && isRemoteUri(uri) && initialResolved == null);

  useEffect(() => {
    if (!uri) {
      setResolvedUri(null);
      setIsResolving(false);
      return;
    }
    if (!isRemoteUri(uri)) {
      setResolvedUri(uri);
      setIsResolving(false);
      return;
    }
    const cached = resolvedThisSession.get(uri);
    if (cached) {
      setResolvedUri(cached);
      setIsResolving(false);
      return;
    }

    let cancelled = false;
    setIsResolving(true);
    resolveToLocalUri(uri).then((finalUri) => {
      if (cancelled) return;
      resolvedThisSession.set(uri, finalUri);
      setResolvedUri(finalUri);
      setIsResolving(false);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return { resolvedUri, isResolving };
}
