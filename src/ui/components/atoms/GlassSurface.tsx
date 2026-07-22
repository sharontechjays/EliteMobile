import React, { useMemo } from "react";
import { ColorValue, StyleSheet, View, ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";

// GlassView already falls back to a plain View on iOS <26, but some iOS 26 betas ship without
// the Liquid Glass API and crash if it's used anyway — isGlassEffectAPIAvailable guards against
// that (see expo/expo#40911). BlurView covers both cases: pre-26 devices and glass-less 26 betas.
const canUseGlass = isGlassEffectAPIAvailable();

const SHADOW_STYLE = {
  shadowColor: "rgba(30,30,15,1)",
  shadowOpacity: 0.16,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 9 },
  elevation: 4,
};

interface GlassSurfaceProps extends ViewProps {
  radius?: number;
  tintOpacity?: number;
  /** Lets the native iOS 26 Liquid Glass material react to touch/scroll. Ignored on the blur fallback. */
  interactive?: boolean;
  /** Colors the glass material itself (native) or the tint overlay (fallback). */
  tintColor?: ColorValue;
  /** 'clear' (default) for the light, minimal native glass look; 'regular' for a heavier frost
   * where a surface needs more contrast against a busy background. */
  glassEffectStyle?: "regular" | "clear";
  /** Cards/buttons float above the background and want the drop shadow; flush controls (keypad
   * keys, in-line chips) sit level with their surroundings and look wrong with one. */
  shadow?: boolean;
}

// Frosted translucent card. Uses real native iOS 26 Liquid Glass (UIGlassEffect) when
// available; falls back to a backdrop blur + soft white tint + specular border elsewhere.
//
// The shadow lives on an OUTER, unclipped view and the corner-clipped glass content on an
// INNER view — putting overflow:"hidden" and a shadow on the same layer clips the shadow away
// entirely on iOS, which is why cards read as flat instead of elevated above the background.
export function GlassSurface({
  radius = 18,
  tintOpacity = 0.28,
  interactive = false,
  tintColor,
  glassEffectStyle = "clear",
  shadow = true,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const flatStyle = useMemo(() => StyleSheet.flatten(style) ?? {}, [style]);
  // Layout AND padding props must reach the content wrapper, not the outer shell. Padding in
  // particular has to inset the children FROM the glass edges while the glass material itself
  // still spans the full pill — putting it on the outer shell instead shrinks the glass by the
  // padding amount and leaves the children flush against its (now smaller) edges.
  const {
    flexDirection,
    alignItems,
    justifyContent,
    flexWrap,
    gap,
    rowGap,
    columnGap,
    padding,
    paddingVertical,
    paddingHorizontal,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingStart,
    paddingEnd,
    ...shellStyle
  } = flatStyle;
  const contentLayoutStyle = {
    flexDirection,
    alignItems,
    justifyContent,
    flexWrap,
    gap,
    rowGap,
    columnGap,
    padding,
    paddingVertical,
    paddingHorizontal,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingStart,
    paddingEnd,
  };

  return (
    <View style={[shadow && SHADOW_STYLE, { borderRadius: radius }, shellStyle]} {...rest}>
      {/* "clip" stays a plain default-stretch container — giving IT the content's flexDirection/
          alignItems here would override that stretch and shrink-wrap the whole glass to its
          content size instead of filling the width its parent gives it. */}
      <View style={[styles.clip, { borderRadius: radius }]}>
        {canUseGlass ? (
          // Give GlassView one plain View holding all real children, rather than spreading them
          // as direct children — keeps this in line with every other glass usage in the app and
          // avoids depending on GlassView's multi-child mounting for content that also needs its
          // own layout props (flexDirection/gap/padding) applied uniformly.
          <GlassView
            style={{ borderRadius: radius, overflow: "hidden" }}
            glassEffectStyle={glassEffectStyle}
            isInteractive={interactive}
            tintColor={tintColor as string | undefined}
          >
            <View style={contentLayoutStyle}>{children}</View>
          </GlassView>
        ) : (
          <>
            <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: tintColor ?? `rgba(255,255,255,${tintOpacity})` }]}
            />
            <View style={contentLayoutStyle}>{children}</View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
});
