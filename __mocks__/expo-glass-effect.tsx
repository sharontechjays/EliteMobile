// Manual Jest mock for expo-glass-effect.
//
// jest-expo/react-native's jest preset resolves haste platform files with `defaultPlatform:
// "ios"`, so importing this package under Jest always pulls in the `.ios.tsx`/`.ios.ts`
// variants — the ones that call `requireNativeModule("ExpoGlassEffect")` at module-eval time.
// That native module doesn't exist under Jest (no `mocks/ExpoGlassEffect.js` ships with the
// package), so any component that imports expo-glass-effect crashes immediately with
// "Cannot find native module 'ExpoGlassEffect'" — even before rendering.
//
// This mock mirrors the package's own non-iOS fallback behavior (see GlassView.tsx /
// isGlassEffectAPIAvailable.ts, the platform-less counterparts to the .ios files): report the
// Liquid Glass API as unavailable and render GlassView/GlassContainer as plain Views. Consumers
// (e.g. GlassSurface) already have a blur+tint fallback path for exactly this case.
import React from "react";
import { View, ViewProps } from "react-native";

export function isGlassEffectAPIAvailable(): boolean {
  return false;
}

export function isLiquidGlassAvailable(): boolean {
  return false;
}

export function GlassView(props: ViewProps) {
  return <View {...props} />;
}

export function GlassContainer(props: ViewProps) {
  return <View {...props} />;
}
