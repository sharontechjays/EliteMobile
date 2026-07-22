import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { typography, fontMono } from "../../theme/typography";
import { GlassSurface } from "../atoms/GlassSurface";

export interface HomeJobButton {
  label: string;
  bg: string;
  color: string;
  border: string;
  opacity: number;
}

interface HomeJobCardProps {
  name: string;
  sub: string;
  dotColor: string;
  onOpen: () => void;
  timerLabel: string;
  timerValue: string;
  overEstimate?: boolean;
  button: HomeJobButton;
  onJobAction: () => void;
  travelChipTitle?: string;
  travelHint?: string;
  onOpenTravel?: () => void;
}

// Home's job-ticket card: a tappable header row (dot/name/sub/chevron) opens the ticket, a
// divider, then the job-time tracker with its state-driven action button (Start/Paused/Stop,
// or Start Travel/Travelling… when GPS says the crew hasn't arrived at the site yet), and an
// optional travel-in-progress chip.
export function HomeJobCard({
  name,
  sub,
  dotColor,
  onOpen,
  timerLabel,
  timerValue,
  overEstimate,
  button,
  onJobAction,
  travelChipTitle,
  travelHint,
  onOpenTravel,
}: HomeJobCardProps) {
  return (
    <GlassSurface radius={18} style={styles.card}>
      <Pressable onPress={onOpen} style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.textCol}>
          <Text style={[typography.cardTitle, { fontSize: 17, color: colors.ink }]}>{name}</Text>
          <Text style={[typography.body, { fontSize: 11.5, color: colors.dim, marginTop: 2 }]}>{sub}</Text>
        </View>
        <Text style={styles.chevron}>{"›"}</Text>
      </Pressable>

      <View style={styles.timerRow}>
        <View style={styles.timerTextCol}>
          <Text style={[typography.sectionLabel, { fontSize: 10.5, color: overEstimate ? colors.off : colors.faint }]}>
            {timerLabel}
          </Text>
          <Text style={[styles.timerValue, { fontFamily: fontMono, color: overEstimate ? colors.off : colors.ink }]}>{timerValue}</Text>
        </View>
        <Pressable
          onPress={onJobAction}
          style={[
            styles.actionButton,
            { backgroundColor: button.bg, borderColor: button.border, opacity: button.opacity },
          ]}
        >
          <Text style={[typography.buttonLabelSm, { fontSize: 12.5, color: button.color }]}>{button.label}</Text>
        </Pressable>
      </View>

      {travelChipTitle && (
        <Pressable onPress={onOpenTravel} style={styles.travelChip}>
          <Text style={styles.travelArrow}>→</Text>
          <View style={styles.travelTextCol}>
            <Text style={styles.travelTitle}>{travelChipTitle}</Text>
            {travelHint && <Text style={styles.travelHint}>{travelHint}</Text>}
          </View>
          <Text style={styles.travelArrow}>{"›"}</Text>
        </Pressable>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: 15, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  textCol: { flex: 1, minWidth: 0 },
  chevron: { color: colors.faint, fontSize: 15 },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hairline15,
    paddingTop: 11,
  },
  timerTextCol: { gap: 1 },
  timerValue: { fontSize: 22, fontWeight: "600", color: colors.ink },
  actionButton: { borderRadius: 13, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 18 },
  travelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.travelBg,
    borderWidth: 1.5,
    borderColor: colors.travelBorder,
    borderRadius: 14,
    padding: 13,
  },
  travelArrow: { fontSize: 15, color: colors.travel },
  travelTextCol: { flex: 1, minWidth: 0, gap: 1 },
  travelTitle: { fontSize: 13, fontWeight: "800", color: colors.travel },
  travelHint: { fontSize: 10.5, fontWeight: "600", color: colors.dim },
});
