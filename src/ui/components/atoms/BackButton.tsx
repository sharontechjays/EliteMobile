import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme/colors";
import { GlassSurface } from "./GlassSurface";

interface BackButtonProps {
  onPress: () => void;
}

const SIZE = 44;

// Matches Apple's iOS 26 circular Liquid Glass back control (seen in Photos, Safari, Maps) —
// a round glass chip with a bold chevron, floating over content rather than sitting in a flat
// bar. Reuses GlassSurface so it gets real native UIGlassEffect where available, same as every
// other glass surface in the app.
//
// GlassSurface's inner layers auto-size to their content along the main axis (they only stretch
// on the cross axis), so a width/height set on GlassSurface's own `style` never reaches them —
// with just a Text child they'd shrink to the chevron's line height, giving a wide oval instead
// of a circle. Giving the child itself an explicit SIZE x SIZE box makes every ancestor's
// content-based auto-sizing resolve to the same square, all the way out.
export function BackButton({ onPress }: BackButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <GlassSurface radius={SIZE / 2} interactive style={styles.outer}>
        <View style={styles.button}>
          <Text style={styles.chevron}>‹</Text>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: SIZE,
    height: SIZE,
  },
  button: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    marginTop: -1,
  },
});
