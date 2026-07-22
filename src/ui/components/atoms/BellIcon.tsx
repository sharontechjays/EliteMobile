import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/colors";

const VIEWBOX_WIDTH = 13;
const VIEWBOX_HEIGHT = 14;
const STROKE_WIDTH = 1.3;
const DEFAULT_SIZE = 13;

interface BellIconProps {
  color?: string;
  size?: number;
}

// Matches the prototype's hand-drawn line-art bell exactly (same viewBox and path data),
// rather than an emoji glyph whose look varies by platform/font. `size` scales the icon
// uniformly (the viewBox stays fixed, preserving the original 13:14 aspect ratio).
export function BellIcon({ color = colors.dim, size = DEFAULT_SIZE }: BellIconProps) {
  const height = (size / VIEWBOX_WIDTH) * VIEWBOX_HEIGHT;
  return (
    <Svg width={size} height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}>
      <Path
        d="M6.5 1 C4 1 2.8 3 2.8 5.4 L2.8 8.2 L1.6 10.4 L11.4 10.4 L10.2 8.2 L10.2 5.4 C10.2 3 9 1 6.5 1 Z"
        fill="none"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Path
        d="M5.1 12 C5.4 12.8 7.6 12.8 7.9 12"
        fill="none"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}
