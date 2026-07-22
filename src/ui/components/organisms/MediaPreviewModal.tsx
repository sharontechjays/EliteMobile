import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/ui/theme/colors";
import { MediaItem } from "@/ui/utils/MediaItem.type";
import { CachedVideoPlayer } from "./CachedVideoPlayer";

const FALLBACK_ASPECT_RATIO = 16 / 9;

interface MediaPreviewModalProps {
  media: MediaItem | null;
  closeLabel: string;
  onClose: () => void;
}

export function MediaPreviewModal({ media, closeLabel, onClose }: MediaPreviewModalProps) {
  // Sized to the media's own portrait/landscape aspect ratio (capped by maxHeight below), rather
  // than a fixed box, so a portrait capture previews tall and a landscape one previews wide.
  const aspectRatio = media && media.width > 0 && media.height > 0 ? media.width / media.height : FALLBACK_ASPECT_RATIO;

  return (
    <Modal visible={media != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.content, { aspectRatio }]}>
          {media?.kind === "photo" ? (
            <Image source={{ uri: media.uri }} style={styles.media} contentFit="contain" cachePolicy="memory-disk" />
          ) : media ? (
            <CachedVideoPlayer uri={media.uri} autoPlay />
          ) : null}
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>{closeLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 18,
  },
  content: {
    width: "100%",
    maxHeight: "78%",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 11,
    backgroundColor: colors.surface70,
  },
  closeButtonText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.ink,
    textTransform: "uppercase",
  },
});
