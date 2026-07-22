import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { useLanguage } from "@app/react/language/useLanguage";
import { GlassSurface } from "../atoms/GlassSurface";
import { PillButton } from "../atoms/PillButton";

interface NotifyOfficePanelProps {
  quickOptions: readonly string[];
  onQuickTap: (label: string) => void;
  onOther: () => void;
  composerOpen: boolean;
  message: string;
  onChangeMessage: (value: string) => void;
  onCancel: () => void;
  onSend: () => void;
}

// Home's "flag the office" affordance — a quick-reply chip row, or (once "Other…" is tapped)
// a free-text composer. Matches the prototype's inline expand/collapse panel under the
// crew-status banner.
export function NotifyOfficePanel({
  quickOptions,
  onQuickTap,
  onOther,
  composerOpen,
  message,
  onChangeMessage,
  onCancel,
  onSend,
}: NotifyOfficePanelProps) {
  const { strings } = useLanguage();
  const t = strings.notifyOfficePanel;
  return (
    <GlassSurface radius={18} style={styles.card}>
      <Text style={[typography.sectionLabel, { color: colors.dim }]}>{t.title}</Text>

      {composerOpen ? (
        <>
          <TextInput
            value={message}
            onChangeText={onChangeMessage}
            placeholder={t.placeholder}
            placeholderTextColor={colors.faint}
            multiline
            style={styles.input}
          />
          <View style={styles.composerActions}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={[typography.buttonLabelSm, { color: colors.dim }]}>{t.cancelButton}</Text>
            </Pressable>
            <PillButton
              label={t.sendButton}
              onPress={onSend}
              variant="dark"
              disabled={message.trim().length === 0}
              style={styles.sendButton}
            />
          </View>
        </>
      ) : (
        <View style={styles.chipRow}>
          {quickOptions.map((option) => (
            <Pressable key={option} onPress={() => onQuickTap(option)} style={styles.chip}>
              <Text style={[typography.buttonLabelSm, { fontSize: 12, color: colors.ink }]}>{option}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onOther} style={styles.otherChip}>
            <Text style={[typography.buttonLabelSm, { fontSize: 12, color: colors.dim }]}>{t.otherButton}</Text>
          </Pressable>
        </View>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface70,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  otherChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.hairline40,
    backgroundColor: colors.sunk,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  input: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.hairline22,
    backgroundColor: colors.surface70,
    padding: 10,
    fontSize: 13,
    color: colors.ink,
    textAlignVertical: "top",
  },
  composerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: colors.surface50,
    borderWidth: 1,
    borderColor: colors.hairline25,
  },
  sendButton: { flex: 1, paddingVertical: 9 },
});
