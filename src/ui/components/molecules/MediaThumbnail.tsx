import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/ui/theme/colors";
import { MediaItem } from "@/ui/utils/MediaItem.type";

const THUMBNAIL_SIZE = 64;

interface MediaThumbnailProps {
  media: MediaItem;
  onPress: () => void;
}

export function MediaThumbnail({ media, onPress }: MediaThumbnailProps) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* thumbnailUri is the photo itself for a photo, or a generated still frame for a video
          (see MediaCapture.port.ts) — either way it's always a real, renderable image, never a
          placeholder, so the play glyph below is only ever an overlay on top of it. */}
      <Image source={{ uri: media.thumbnailUri }} style={styles.media} contentFit="cover" cachePolicy="memory-disk" />
      {media.kind === "video" && (
        <View style={styles.playGlyphOverlay}>
          <Text style={styles.playGlyph}>▶</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 10,
    overflow: "hidden",
  },
  media: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  playGlyphOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.inkOverlay35,
    alignItems: "center",
    justifyContent: "center",
  },
  playGlyph: {
    color: colors.white,
    fontSize: 18,
  },
});
