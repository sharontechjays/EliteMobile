import { ViewStyle } from "react-native";
import { colors } from "./colors";

// Liquid-glass card shell: pair with <BlurView intensity={40} tint="light"> for the real blur.
export const glassCard: ViewStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: "hidden",
  shadowColor: colors.glassShadow,
  shadowOpacity: 0.14,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};

export const glassPill: ViewStyle = {
  ...glassCard,
  borderRadius: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
};
