import React from "react";
import { View } from "react-native";
import { colors } from "../../theme/colors";

interface ProgressBarProps {
  progress: number; // 0..1
  width?: number;
}

export function ProgressBar({ progress, width = 190 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width, height: 5, backgroundColor: colors.progressTrack, borderRadius: 3, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${clamped * 100}%`, backgroundColor: colors.accent, borderRadius: 3 }} />
    </View>
  );
}
