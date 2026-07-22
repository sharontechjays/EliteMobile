import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

interface WorkerRowProps {
  initials: string;
  name: string;
  statusText: string;
  statusColor: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function WorkerRow({ initials, name, statusText, statusColor, selected, disabled, onPress }: WorkerRowProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[
        styles.row,
        { backgroundColor: selected ? colors.selectedRowBg : colors.surface, borderColor: selected ? colors.accent : colors.border },
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarLabel}>{initials}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={[typography.cardTitle, { color: colors.ink }]}>{name}</Text>
        <Text style={[typography.body, { fontSize: 11, fontWeight: "600", color: statusColor, marginTop: 2 }]}>
          {statusText}
        </Text>
      </View>
      <View
        style={[
          styles.ring,
          { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accent : "transparent" },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 18, borderWidth: 1.5, padding: 11 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: { fontSize: 11, fontWeight: "800", color: colors.dim },
  textCol: { flex: 1, minWidth: 0 },
  ring: { width: 19, height: 19, borderRadius: 10, borderWidth: 2 },
  disabled: { opacity: 0.45 },
});
