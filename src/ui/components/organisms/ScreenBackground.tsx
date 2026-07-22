import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { colors } from "../../theme/colors";
import { BackgroundTexture } from "../atoms/BackgroundTexture";

// Reproduces the prototype's diagonal cream gradient + soft radial glows, plus a fine dot-grid
// texture so glass elements have real detail behind them to blur/refract.
export function ScreenBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={colors.screenGradient}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <BackgroundTexture />
      <LinearGradient
        colors={[colors.glowAmber, "transparent"]}
        style={[styles.glow, { top: -100, right: -110, width: 420, height: 420, borderRadius: 210 }]}
      />
      <LinearGradient
        colors={[colors.glowBlue, "transparent"]}
        style={[styles.glow, { top: "26%", left: -140, width: 420, height: 420, borderRadius: 210 }]}
      />
      <LinearGradient
        colors={[colors.glowPink, "transparent"]}
        style={[styles.glow, { top: "55%", right: -120, width: 360, height: 360, borderRadius: 180 }]}
      />
      <LinearGradient
        colors={[colors.glowGreen, "transparent"]}
        style={[styles.glow, { bottom: -90, right: -90, width: 420, height: 420, borderRadius: 210 }]}
      />
      {/* Dedicated glow behind the floating tab bar so its glass has color to refract. */}
      <LinearGradient
        colors={[colors.glowAmber, "transparent"]}
        style={[styles.glow, { bottom: -70, left: "50%", marginLeft: -260, width: 520, height: 260, borderRadius: 260 }]}
      />
      <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />

      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute", width: 280, height: 280, borderRadius: 140 },
});
