import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { confirmSignOut } from "@/ui/utils/confirmSignOut";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useProfileViewModel } from "../viewModels/useProfile.viewModel";

interface ProfileScreenProps {
  onGoHome: () => void;
}

export function ProfileScreen({ onGoHome }: ProfileScreenProps) {
  const { state } = useProfileViewModel();
  const { profile } = state;
  const { strings } = useLanguage();
  const t = strings.profile;

  if (!profile) return null;

  const rows = [
    { label: t.employeeCodeLabel, value: profile.employeeCode },
    { label: t.deviceLabel, value: profile.device },
    { label: t.languageLabel, value: `${profile.language} ▾` },
    { label: t.lastSyncLabel, value: profile.lastSyncLabel },
  ];

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <BackButton onPress={onGoHome} />
            <Text style={[typography.sectionLabel, { fontSize: 11, letterSpacing: 0.1, color: colors.faint }]}>{t.settingsSectionLabel}</Text>
          </View>

          <Text style={[typography.largeDate, { color: colors.ink }]}>{profile.crewLeaderName}</Text>

          <GlassSurface radius={18} style={styles.card}>
            {rows.map((row, index) => (
              <View key={row.label} style={[styles.row, index < rows.length - 1 && styles.rowSeparator]}>
                <Text style={[typography.body, { color: colors.dim }]}>{row.label}</Text>
                <Text style={[typography.body, { color: colors.ink, fontWeight: "700" }]}>{row.value}</Text>
              </View>
            ))}
          </GlassSurface>

          <Text style={[typography.sectionLabel, { fontSize: 10.5, letterSpacing: 0.12, color: colors.faint }]}>{t.notificationsSectionLabel}</Text>

          {profile.notifications.length === 0 ? (
            <Text style={[typography.body, { color: colors.faint }]}>{t.noNotifications}</Text>
          ) : (
            <View style={styles.notifList}>
              {profile.notifications.map((notif) => (
                <GlassSurface key={notif.id} radius={16} style={styles.notifCard}>
                  <Text style={[typography.cardTitle, { color: colors.ink }]}>{notif.title}</Text>
                  <Text style={[typography.body, { color: colors.dim, marginTop: 2 }]}>{notif.body}</Text>
                </GlassSurface>
              ))}
            </View>
          )}

          <PillButton
            label={t.signOutButton}
            variant="glass"
            onPress={() =>
              confirmSignOut(onGoHome, {
                title: t.signOutConfirmTitle,
                body: t.signOutConfirmBody,
                cancel: t.signOutConfirmCancel,
                destructive: t.signOutConfirmDestructive,
              })
            }
          />

          {/* Dev-only: reference screen for the REST + offline-queue pattern, not part of the translated app UI. */}
          <Pressable onPress={() => router.push("/api-integration-example")} style={styles.devLinkRow}>
            <Text style={styles.devLinkText}>Dev: API integration example →</Text>
          </Pressable>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: SCREEN_TOP_INSET },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingHorizontal: 18, paddingBottom: 22 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  rowSeparator: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  notifList: { gap: 8 },
  notifCard: { paddingVertical: 10, paddingHorizontal: 12 },
  devLinkRow: { alignItems: "center", paddingVertical: 8 },
  devLinkText: { color: colors.faint, fontSize: 11.5 },
});
