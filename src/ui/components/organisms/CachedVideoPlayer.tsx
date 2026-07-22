import React from "react";
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { colors } from "@/ui/theme/colors";
import { useCachedVideoSource } from "@/ui/utils/useCachedVideoSource";

interface CachedVideoPlayerProps {
  uri: string;
  autoPlay?: boolean;
  // Sizing is the caller's responsibility (e.g. an aspect-ratio box matching the video's own
  // portrait/landscape dimensions) — this component always fills whatever box it's given.
  style?: StyleProp<ViewStyle>;
}

// Plays a local (file://) video directly. Plays a remote (http/https) video from an on-device
// cache — the first view downloads it once via useCachedVideoSource, every later view (this
// session or after an app restart) reads the already-downloaded file, so the loading spinner
// below only ever appears on that first view of a given video. `nativeControls` gives the
// platform's own playback chrome (play/pause, scrubber/seek, current time and duration).
export function CachedVideoPlayer({ uri, autoPlay = false, style }: CachedVideoPlayerProps) {
  const { resolvedUri, isResolving } = useCachedVideoSource(uri);

  if (isResolving || !resolvedUri) {
    return (
      <View style={[styles.fill, styles.loadingContainer, style]}>
        <ActivityIndicator color={colors.dim} />
      </View>
    );
  }

  return <ResolvedVideoPlayer uri={resolvedUri} autoPlay={autoPlay} style={style} />;
}

function ResolvedVideoPlayer({
  uri,
  autoPlay,
  style,
}: {
  uri: string;
  autoPlay: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    if (autoPlay) instance.play();
  });

  return <VideoView style={[styles.fill, style]} player={player} contentFit="contain" nativeControls />;
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
    borderRadius: 12,
  },
});
