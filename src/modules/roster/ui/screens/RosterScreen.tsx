import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { WorkerRow } from "@/ui/components/molecules/WorkerRow";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useRosterViewModel } from "../viewModels/useRoster.viewModel";
import { AttestationWorker } from "@modules/clock/core/entities/AttestationWorker.entity";

interface RosterScreenProps {
  onGoHome: () => void;
  onStartAttestation: (queue: AttestationWorker[]) => void;
}

export function RosterScreen({ onGoHome, onStartAttestation }: RosterScreenProps) {
  const { state, handlers } = useRosterViewModel();
  const { rows, canClockSelected, selectedLabel, bulkLabel, requestOpen, requestQuery, requestResults } = state;
  const insets = useSafeAreaInsets();
  const { strings } = useLanguage();
  const t = strings.roster;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <BackButton onPress={onGoHome} />
            <Text style={[typography.sectionLabel, styles.headerLabel]}>{t.headerLabel}</Text>
          </View>

          <Text style={[typography.largeDate, { color: colors.ink }]}>{t.title}</Text>
          <Text style={[typography.body, styles.subtitle]}>{t.subtitle}</Text>

          <View style={styles.list}>
            {rows.map((row) => (
              <WorkerRow
                key={row.id}
                initials={row.initials}
                name={row.name}
                statusText={row.pendingApproval ? `○ ${row.statusText}` : `${row.selected ? "●" : "○"} ${row.statusText}`}
                statusColor={row.statusColor}
                selected={row.selected}
                disabled={!row.eligible}
                onPress={() => handlers.onToggleWorker(row.id)}
              />
            ))}
          </View>

          <Pressable onPress={handlers.onToggleRequest} style={styles.addWorker}>
            <Text style={[typography.body, { color: colors.dim, fontWeight: "700" }]}>
              {requestOpen ? t.cancelRequestButton : t.addWorkerButton}
            </Text>
          </Pressable>

          {requestOpen && (
            <GlassSurface radius={16} style={styles.requestPanel}>
              <TextInput
                value={requestQuery}
                onChangeText={handlers.onChangeRequestQuery}
                placeholder={t.searchPlaceholder}
                placeholderTextColor={colors.faint}
                style={styles.requestInput}
              />
              {requestQuery.trim().length > 0 && requestResults.length === 0 && (
                <Text style={styles.requestEmpty}>{t.noMatches}</Text>
              )}
              {requestResults.map((result) => (
                <View key={result.id} style={styles.requestRow}>
                  <Text style={[typography.body, { color: colors.ink, flex: 1 }]}>{result.name}</Text>
                  {result.assignedTo ? (
                    <Text style={styles.requestBusy}>{t.busyWith(result.assignedTo)}</Text>
                  ) : (
                    <Pressable onPress={() => handlers.onAddFromDirectory(result.id)}>
                      <Text style={styles.requestAdd}>{t.addLink}</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </GlassSurface>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 60 }]}>
          <PillButton
            label={selectedLabel}
            variant="glass"
            disabled={!canClockSelected}
            onPress={() => onStartAttestation(handlers.buildSelectedAttestationQueue())}
          />
          <PillButton label={bulkLabel} variant="dark" onPress={() => onStartAttestation(handlers.buildBulkAttestationQueue())} />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: SCREEN_TOP_INSET },
  scroll: { flex: 1 },
  scrollContent: { gap: 13, paddingHorizontal: 18, paddingBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLabel: { color: colors.faint, flex: 1 },
  subtitle: { color: colors.dim, marginTop: -6 },
  list: { gap: 8 },
  addWorker: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline45,
    borderStyle: "dashed",
    paddingVertical: 12,
    alignItems: "center",
  },
  requestPanel: { padding: 13, gap: 9 },
  requestInput: { backgroundColor: colors.surface70, borderWidth: 1, borderColor: colors.hairline25, borderRadius: 10, padding: 11, fontSize: 13, color: colors.ink },
  requestEmpty: { fontSize: 12, color: colors.faint },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  requestBusy: { fontSize: 11, color: colors.faint, fontStyle: "italic" },
  requestAdd: { fontSize: 12.5, fontWeight: "800", color: colors.job },
  footer: { paddingHorizontal: 18, paddingTop: 8, gap: 9 },
});
