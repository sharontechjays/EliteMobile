import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../../theme/typography";
import { colors } from "../../theme/colors";

export interface StatusBannerTone {
  bg: string;
  border: string;
  accent: string;
}

const NOTIFY_ICON = "⚑";

interface StatusBannerProps {
  icon: string;
  title: string;
  body: string;
  tone: StatusBannerTone;
  onNotifyPress?: () => void;
}

// Home's crew-status card — tone/copy driven by crew state (out / in / travel / alert).
// The optional trailing flag button opens the Notify Office panel.
export function StatusBanner({ icon, title, body, tone, onNotifyPress }: StatusBannerProps) {
  return (
    <View
      style={[styles.container, { backgroundColor: tone.bg, borderColor: tone.border, borderLeftColor: tone.accent }]}
    >
      <View style={styles.iconBox}>
        <Text style={[styles.iconText, { color: tone.accent }]}>{icon}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={[typography.cardTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[typography.body, { color: tone.accent, marginTop: 2 }]}>{body}</Text>
      </View>
      {onNotifyPress && (
        <Pressable onPress={onNotifyPress} style={styles.notifyButton} hitSlop={8}>
          <Text style={[styles.notifyIcon, { color: tone.accent }]}>{NOTIFY_ICON}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    minHeight: 60,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 16, fontWeight: "800" },
  textCol: { flex: 1, gap: 2 },
  notifyButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  notifyIcon: { fontSize: 14 },
});
