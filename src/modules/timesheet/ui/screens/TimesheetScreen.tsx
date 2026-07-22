import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useTimesheetViewModel } from "../viewModels/useTimesheet.viewModel";

interface TimesheetScreenProps {
  onSubmitted: () => void;
}

export function TimesheetScreen({ onSubmitted }: TimesheetScreenProps) {
  const { state, handlers } = useTimesheetViewModel({ onSubmitted });
  const { workerName, progressLabel, pending, allDone, reason, rows, totalHoursLabel, submitting, refreshing } = state;
  const insets = useSafeAreaInsets();
  const { strings } = useLanguage();
  const t = strings.timesheet;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlers.onRefresh} tintColor={colors.dim} />}
        >
          <Text style={[typography.largeDate, { color: colors.ink }]}>{t.title}</Text>

          <GlassSurface radius={16} style={styles.workerRow}>
            <Text style={[typography.body, { color: colors.ink, fontWeight: "600" }]}>{workerName}</Text>
            <Text style={styles.progressLabel}>{progressLabel}</Text>
          </GlassSurface>

          <GlassSurface radius={18} style={styles.entriesCard}>
            {rows.map((row, index) => (
              <View key={row.id} style={[styles.entryRow, index < rows.length - 1 && styles.entrySeparator]}>
                <Text style={[styles.entryTime, { fontFamily: fontMono }]}>{row.time}</Text>
                <Text style={[styles.entryDot, { color: row.dotColor }]}>●</Text>
                <Text style={[typography.body, { flex: 1, color: colors.ink, fontWeight: "600" }]}>{row.label}</Text>
              </View>
            ))}
          </GlassSurface>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t.totalLabel}</Text>
            <Text style={[styles.totalValue, { fontFamily: fontMono }]}>{totalHoursLabel}</Text>
          </View>

          {pending && (
            <GlassSurface radius={18} style={styles.ackCard}>
              <View style={styles.ackRow}>
                <Text style={styles.ackLabel}>{t.ackLabel}</Text>
                <Switch testID="ack-toggle" value={false} onValueChange={handlers.onAck} />
              </View>
              <Text style={styles.disputeLabel}>{t.disputeLabel}</Text>
              <TextInput
                value={reason}
                onChangeText={handlers.onChangeReason}
                placeholder={t.disputePlaceholder}
                placeholderTextColor={colors.faint}
                multiline
                numberOfLines={3}
                style={styles.disputeInput}
              />
              <Pressable
                onPress={handlers.onDispute}
                disabled={!reason.trim()}
                style={[styles.disputeButton, { opacity: reason.trim() ? 1 : 0.45 }]}
              >
                <Text style={styles.disputeButtonText}>{t.disputeSubmit}</Text>
              </Pressable>
            </GlassSurface>
          )}

          {allDone && (
            <View style={styles.doneBanner}>
              <Text style={styles.doneBannerText}>{t.allDoneBanner}</Text>
            </View>
          )}

          <PillButton label={submitting ? t.submittingButton : t.submitButton} onPress={handlers.onSubmit} disabled={submitting} />
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: SCREEN_TOP_INSET },
  scroll: { flex: 1 },
  scrollContent: { gap: 13, paddingHorizontal: 18, paddingBottom: 16 },
  workerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 14 },
  progressLabel: { fontSize: 11, fontWeight: "700", color: colors.faint },
  entriesCard: { paddingHorizontal: 14 },
  entryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  entrySeparator: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  entryTime: { fontSize: 11.5, color: colors.dim, width: 46 },
  entryDot: { fontSize: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 2 },
  totalLabel: { fontSize: 11, color: colors.dim, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  totalValue: { fontSize: 17, fontWeight: "700", color: colors.job },
  ackCard: { padding: 14, gap: 9 },
  ackRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  ackLabel: { fontSize: 13, fontWeight: "700", color: colors.ink, flex: 1 },
  disputeLabel: { fontSize: 11, fontWeight: "700", color: colors.off },
  disputeInput: {
    backgroundColor: colors.surface70,
    borderWidth: 1,
    borderColor: colors.hairline25,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.ink,
    minHeight: 64,
    textAlignVertical: "top",
  },
  disputeButton: { backgroundColor: colors.offBg, borderWidth: 1.5, borderColor: colors.offBorder, borderRadius: 11, paddingVertical: 12, alignItems: "center" },
  disputeButtonText: { fontSize: 12.5, fontWeight: "800", letterSpacing: 0.5, color: colors.off, textTransform: "uppercase" },
  doneBanner: { backgroundColor: colors.approvedCardBg, borderWidth: 1, borderColor: colors.approvedCardBorder, borderRadius: 16, padding: 12 },
  doneBannerText: { fontSize: 11.5, color: colors.job, lineHeight: 16 },
});
