import React from "react";
import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { GlassSurface } from "./GlassSurface";

const PRIMARY_SHADOW_STYLE = {
  shadowColor: colors.accentShadow50,
  shadowOpacity: 1,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "glass" | "dark";
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

// Maps to the design's full-width CTA ("CONTINUE", "CLOCK IN / OUT") and the
// secondary glass action ("Start Travel").
export function PillButton({ label, onPress, variant = "primary", icon, disabled, style, labelStyle }: PillButtonProps) {
  const handlePress = () => {
    const impact = variant === "glass" ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium;
    Haptics.impactAsync(impact);
    onPress();
  };

  const content = (
    <>
      {icon ? <Text style={[styles.icon, variant === "primary" && { color: colors.accentInk }]}>{icon}</Text> : null}
      <Text
        style={[
          typography.buttonLabel,
          styles.label,
          variant === "primary" && { color: colors.accentInk },
          variant === "dark" && { color: colors.accent },
          variant === "glass" && { color: colors.ink },
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </>
  );

  if (variant === "glass") {
    return (
      <Pressable onPress={handlePress} disabled={disabled} style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
        <GlassSurface radius={22} style={[styles.button]}>
          {content}
        </GlassSurface>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.button,
        { borderRadius: 22, backgroundColor: variant === "dark" ? colors.ink : colors.accent },
        variant === "primary" && PRIMARY_SHADOW_STYLE,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  icon: { fontSize: 17 },
  label: { textTransform: "uppercase" },
});
