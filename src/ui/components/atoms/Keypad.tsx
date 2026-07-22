import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { GlassSurface } from "./GlassSurface";
import { colors } from "../../theme/colors";
import { fontMono } from "../../theme/typography";

const KEY_WIDTH = 68;
const KEY_HEIGHT = 68;
const KEY_RADIUS = 21;
const GAP = 16;
const COLUMNS = 3;
const GRID_WIDTH = KEY_WIDTH * COLUMNS + GAP * (COLUMNS - 1);

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

interface KeypadProps {
  onKeyPress: (key: string) => void;
  disabled?: boolean;
}

// Matches the design's fixed-order numeric keypad with an explicit confirm key — 1-9 in row-major
// order, then ⌫/0/✓ on the last row. Unlike a shuffled security keypad, this layout is fixed and
// predictable, matching the prototype's spec exactly (rectangular keys, not circular).
export function Keypad({ onKeyPress, disabled }: KeypadProps) {
  const handlePress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onKeyPress(key);
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((key) => {
        if (key === "⌫") {
          return (
            <Pressable
              key={key}
              disabled={disabled}
              onPress={() => handlePress(key)}
              style={[styles.keySlot, disabled && styles.disabledKey]}
            >
              <Text style={styles.backspaceLabel}>⌫</Text>
            </Pressable>
          );
        }

        const isConfirm = key === "✓";
        return (
          <Pressable
            key={key}
            disabled={disabled}
            onPress={() => handlePress(key)}
            style={[styles.keySlot, disabled && styles.disabledKey]}
          >
            <GlassSurface
              radius={KEY_RADIUS}
              interactive
              shadow={false}
              tintColor={isConfirm ? colors.jobBg : undefined}
              style={[styles.key, isConfirm && { borderWidth: 1.5, borderColor: colors.jobBorder }]}
            >
              <View style={styles.keyContent}>
                <Text
                  style={[styles.keyLabel, { fontFamily: fontMono }, isConfirm && { color: colors.job, fontSize: 27 }]}
                >
                  {key}
                </Text>
              </View>
            </GlassSurface>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: GRID_WIDTH,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    alignSelf: "center",
  },
  keySlot: { width: KEY_WIDTH, height: KEY_HEIGHT, alignItems: "center", justifyContent: "center" },
  disabledKey: { opacity: 0.5 },
  key: { width: KEY_WIDTH, height: KEY_HEIGHT },
  keyContent: { width: KEY_WIDTH, height: KEY_HEIGHT, alignItems: "center", justifyContent: "center" },
  keyLabel: { fontSize: 23, fontWeight: "400", color: colors.ink },
  backspaceLabel: { color: colors.dim, fontSize: 25 },
});
