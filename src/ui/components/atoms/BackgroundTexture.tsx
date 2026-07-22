import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";

const COLUMNS = 10;
const ROWS = 20;
const SPACING = 40;

interface Dot {
  key: string;
  left: number;
  top: number;
  size: number;
  opacity: number;
}

// A fine dot-grid layered into the backdrop so glass elements have actual detail to blur/
// refract — a smooth gradient alone produces no visible frosting when blurred.
export function BackgroundTexture() {
  const dots = useMemo<Dot[]>(() => {
    const result: Dot[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        // Deterministic pseudo-variation so the grid doesn't look mechanically uniform.
        const wobble = Math.sin(row * 1.7 + col * 2.3);
        result.push({
          key: `${row}-${col}`,
          left: col * SPACING + (row % 2 === 0 ? 0 : SPACING / 2),
          top: row * SPACING,
          size: 2.5 + wobble * 1.2,
          opacity: 0.1 + Math.abs(wobble) * 0.1,
        });
      }
    }
    return result;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((dot) => (
        <View
          key={dot.key}
          style={[
            styles.dot,
            {
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              opacity: dot.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: "absolute", backgroundColor: colors.ink },
});
