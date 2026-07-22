import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassSurface } from "../atoms/GlassSurface";
import { colors } from "../../theme/colors";
import { useLanguage } from "@app/react/language/useLanguage";

interface MapPreviewProps {
  address: string;
}

export function MapPreview({ address }: MapPreviewProps) {
  const { strings } = useLanguage();
  const t = strings.mapPreview;

  const openInMaps = () => {
    Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(address)}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.gridLines} />
      <View style={styles.road} />
      <View style={styles.buildingA} />
      <View style={styles.buildingB} />
      <View style={styles.pinWrap}>
        <View style={styles.pinDot} />
        <View style={styles.pinShadow} />
      </View>
      <GlassSurface radius={7} style={styles.addressChip}>
        <Text style={styles.addressText}>{address}</Text>
      </GlassSurface>
      <Pressable onPress={openInMaps} style={styles.openButton}>
        <Text style={styles.openButtonText}>{t.openInMaps}</Text>
      </Pressable>
      <Text style={styles.badge}>{t.badge}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 132, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.progressTrack, backgroundColor: colors.mapBackground },
  gridLines: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  road: { position: "absolute", top: -14, left: "56%", width: 9, height: "170%", backgroundColor: colors.mapRoad, transform: [{ rotate: "24deg" }], borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.mapRoadBorder },
  buildingA: { position: "absolute", top: 24, left: 8, width: 64, height: 38, borderRadius: 8, backgroundColor: colors.mapBuildingA },
  buildingB: { position: "absolute", bottom: 14, right: 14, width: 52, height: 30, borderRadius: 7, backgroundColor: colors.mapBuildingB },
  pinWrap: { position: "absolute", top: "50%", left: "50%", marginLeft: -11, marginTop: -19, alignItems: "center", gap: 2 },
  pinDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.white },
  pinShadow: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.inkOverlay18 },
  addressChip: { position: "absolute", top: 9, left: 9, paddingVertical: 4, paddingHorizontal: 8 },
  addressText: { fontSize: 10, fontWeight: "700", color: colors.ink },
  openButton: { position: "absolute", bottom: 9, left: 9, backgroundColor: colors.ink, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  openButtonText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5, color: colors.paper, textTransform: "uppercase" },
  badge: { position: "absolute", top: 9, right: 9, fontSize: 9, color: colors.faint, backgroundColor: colors.border, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 6 },
});
