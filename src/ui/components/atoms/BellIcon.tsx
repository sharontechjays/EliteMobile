import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/colors";
import {
  BELL_ICON_DEFAULT_SIZE,
  BELL_ICON_STROKE_WIDTH,
  BELL_ICON_VIEWBOX_HEIGHT,
  BELL_ICON_VIEWBOX_WIDTH,
} from "@/constants/appConstants";

interface BellIconProps {
  color?: string;
  size?: number;
}

// Matches the prototype's hand-drawn line-art bell exactly (same viewBox and path data),
// rather than an emoji glyph whose look varies by platform/font. `size` scales the icon
// uniformly (the viewBox stays fixed, preserving the original 13:14 aspect ratio).
export function BellIcon({ color = colors.dim, size = BELL_ICON_DEFAULT_SIZE }: BellIconProps) {
  const height = (size / BELL_ICON_VIEWBOX_WIDTH) * BELL_ICON_VIEWBOX_HEIGHT;
  return (
    <Svg width={size} height={height} viewBox={`0 0 ${BELL_ICON_VIEWBOX_WIDTH} ${BELL_ICON_VIEWBOX_HEIGHT}`}>
      <Path
        d="M6.5 1 C4 1 2.8 3 2.8 5.4 L2.8 8.2 L1.6 10.4 L11.4 10.4 L10.2 8.2 L10.2 5.4 C10.2 3 9 1 6.5 1 Z"
        fill="none"
        stroke={color}
        strokeWidth={BELL_ICON_STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Path
        d="M5.1 12 C5.4 12.8 7.6 12.8 7.9 12"
        fill="none"
        stroke={color}
        strokeWidth={BELL_ICON_STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}
