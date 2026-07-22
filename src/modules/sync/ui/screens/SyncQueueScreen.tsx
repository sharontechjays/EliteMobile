import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useSyncQueueViewModel } from "../viewModels/useSyncQueue.viewModel";

interface SyncQueueScreenProps {
  onGoBack: () => void;
}

export function SyncQueueScreen({ onGoBack }: SyncQueueScreenProps) {
  const { state, handlers } = useSyncQueueViewModel();
  const { items, syncing } = state;
  const { strings } = useLanguage();
  const t = strings.syncQueue;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <BackButton onPress={onGoBack} />
            <Text style={[typography.sectionLabel, { color: colors.faint }]}>{t.headerLabel}</Text>
          </View>

          <Text style={[typography.largeDate, { color: colors.ink }]}>{t.title}</Text>

          <GlassSurface radius={18} style={styles.card}>
            {items.map((item, index) => (
              <View key={item.id} style={[styles.row, index < items.length - 1 && styles.rowSeparator]}>
                <Text
                  style={[
                    styles.rowTime,
                    { fontFamily: fontMono, color: item.status === "rejected" ? colors.off : colors.dim },
                  ]}
                >
                  {item.time}
                </Text>
                <Text
                  style={[
                    typography.body,
                    { fontSize: 12, flex: 1, color: item.status === "rejected" ? colors.off : colors.ink },
                  ]}
                >
                  {item.label}
                </Text>
                {item.status === "queued" ? (
                  <Text style={styles.queuedLabel}>{t.queuedLabel}</Text>
                ) : (
                  <Pressable style={styles.fixButton}>
                    <Text style={styles.fixLabel}>{t.fixButton}</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </GlassSurface>

          <Text style={[typography.body, { color: colors.dim }]}>{t.cachedNote}</Text>

          <PillButton
            label={syncing ? t.syncingButton : t.syncNowButton}
            onPress={handlers.onSyncNow}
            disabled={syncing}
            labelStyle={{ fontSize: 14.5, letterSpacing: 0.9 }}
          />
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: SCREEN_TOP_INSET },
  scroll: { flex: 1 },
  scrollContent: { gap: 13, paddingHorizontal: 18, paddingBottom: 22 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  rowSeparator: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowTime: { fontSize: 11, width: 42 },
  queuedLabel: { fontSize: 11, fontWeight: "700", color: colors.idle },
  fixButton: {
    borderWidth: 1,
    borderColor: colors.offCardBorder,
    backgroundColor: colors.offCardBg,
    borderRadius: 7,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  fixLabel: { fontSize: 11, fontWeight: "800", color: colors.off },
});
