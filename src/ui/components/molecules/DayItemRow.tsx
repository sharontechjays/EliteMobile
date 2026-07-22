import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { useLanguage } from "@app/react/language/useLanguage";
import { GlassSurface } from "../atoms/GlassSurface";

export interface DayItemButton {
  label: string;
  bg: string;
  color: string;
  border: string;
  opacity: number;
  onPress: () => void;
}

interface DayItemRowProps {
  name: string;
  statusText: string;
  statusColor: string;
  timer: string;
  button: DayItemButton;
  location: string;
  startTime: string;
  endTime: string;
  open: boolean;
  onToggleOpen: () => void;
}

// "Yard & training" day entries — timer + a status-colored action button. Tapping the row
// (outside the button) expands a detail panel with location/start/end time, matching the
// original prototype's per-row disclosure behavior.
export function DayItemRow({
  name,
  statusText,
  statusColor,
  timer,
  button,
  location,
  startTime,
  endTime,
  open,
  onToggleOpen,
}: DayItemRowProps) {
  const { strings } = useLanguage();
  return (
    <GlassSurface radius={18} style={styles.card}>
      <Pressable onPress={onToggleOpen} style={styles.row}>
        <View style={styles.textCol}>
          <Text style={[typography.cardTitle, { fontSize: 13.5, color: colors.ink }]}>{name}</Text>
          <Text style={[typography.body, { fontSize: 11, fontWeight: "600", color: statusColor, marginTop: 2 }]}>
            {statusText}
          </Text>
        </View>
        <Text style={[typography.monoTime, { color: colors.dim }]}>{timer}</Text>
        <Pressable
          onPress={button.onPress}
          style={[styles.button, { backgroundColor: button.bg, borderColor: button.border, opacity: button.opacity }]}
        >
          <Text style={[typography.tabLabel, { fontSize: 11.5, color: button.color, textTransform: "uppercase" }]}>
            {button.label}
          </Text>
        </Pressable>
        <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open && (
        <View style={styles.detail}>
          <View style={[styles.detailRow, styles.detailRowSeparator]}>
            <Text style={styles.detailLabel}>{strings.home.locationLabel}</Text>
            <Text style={styles.detailValue}>{location}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowSeparator]}>
            <Text style={styles.detailLabel}>{strings.home.startTimeLabel}</Text>
            <Text style={[styles.detailValue, { fontFamily: typography.monoTime.fontFamily }]}>{startTime}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{strings.home.endTimeLabel}</Text>
            <Text style={[styles.detailValue, { fontFamily: typography.monoTime.fontFamily }]}>{endTime}</Text>
          </View>
        </View>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: 11 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  textCol: { flex: 1, minWidth: 0 },
  button: { borderRadius: 9, borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 13 },
  chevron: { fontSize: 11, color: colors.faint, width: 16, textAlign: "center" },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.hairline18, paddingTop: 4 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8 },
  detailRowSeparator: { borderBottomWidth: 1, borderBottomColor: colors.hairline12 },
  detailLabel: { fontSize: 12, color: colors.faint },
  detailValue: { fontSize: 12, fontWeight: "700", color: colors.ink },
});
