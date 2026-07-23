import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { GlassSurface } from "./GlassSurface";
import { colors } from "../../theme/colors";
import { fontMono } from "../../theme/typography";
import {
  KEYPAD_COLUMNS,
  KEYPAD_GAP,
  KEYPAD_KEY_HEIGHT,
  KEYPAD_KEY_RADIUS,
  KEYPAD_KEY_WIDTH,
} from "@/constants/appConstants";

const GRID_WIDTH = KEYPAD_KEY_WIDTH * KEYPAD_COLUMNS + KEYPAD_GAP * (KEYPAD_COLUMNS - 1);

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
              radius={KEYPAD_KEY_RADIUS}
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
    gap: KEYPAD_GAP,
    alignSelf: "center",
  },
  keySlot: { width: KEYPAD_KEY_WIDTH, height: KEYPAD_KEY_HEIGHT, alignItems: "center", justifyContent: "center" },
  disabledKey: { opacity: 0.5 },
  key: { width: KEYPAD_KEY_WIDTH, height: KEYPAD_KEY_HEIGHT },
  keyContent: { width: KEYPAD_KEY_WIDTH, height: KEYPAD_KEY_HEIGHT, alignItems: "center", justifyContent: "center" },
  keyLabel: { fontSize: 23, fontWeight: "400", color: colors.ink },
  backspaceLabel: { color: colors.dim, fontSize: 25 },
});
