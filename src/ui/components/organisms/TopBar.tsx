import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BellIcon } from "@/ui/components/atoms/BellIcon";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { GetSyncQueueUseCase } from "@modules/sync/core/usecases/GetSyncQueue.usecase";
import { deriveSyncStatus, SyncStatus } from "@modules/sync/core/usecases/deriveSyncStatus.usecase";
import { TOPBAR_BELL_ICON_SIZE, TOPBAR_BELL_SIZE } from "@/constants/appConstants";

interface TopBarProps {
  showSyncPill?: boolean;
}

const SYNCED_STATUS: SyncStatus = { state: "synced", pendingCount: 0, rejectedCount: 0 };

export function TopBar({ showSyncPill = true }: TopBarProps) {
  const { syncQueueReader } = useDependencies();
  const { language, setLanguage, strings } = useLanguage();
  const { log } = useNotifications();
  const insets = useSafeAreaInsets();
  // Optimistically starts "synced" rather than a neutral/loading state — this bar renders on
  // every screen, so a loading flicker on every navigation would be more visually noisy than the
  // brief window (until the effect below resolves) where a genuinely pending queue is
  // momentarily shown as synced.
  const [status, setStatus] = useState<SyncStatus>(SYNCED_STATUS);

  useEffect(() => {
    let cancelled = false;
    new GetSyncQueueUseCase(syncQueueReader).execute().then((result) => {
      if (!cancelled && result.success) setStatus(deriveSyncStatus(result.data));
    });
    return () => {
      cancelled = true;
    };
  }, [syncQueueReader]);

  const pending = status.state === "pending";
  const pendingTotal = status.pendingCount + status.rejectedCount;

  return (
    <View style={[styles.container, { top: insets.top + 4 }]} pointerEvents="box-none">
      {showSyncPill ? (
        <Pressable onPress={() => router.push("/sync-queue")}>
          <View style={styles.syncPill}>
            <View style={[styles.dot, { backgroundColor: pending ? colors.idle : colors.job }]} />
            <Text
              style={[
                typography.caption,
                { fontFamily: fontMono, fontSize: 12.5, color: pending ? colors.idle : colors.dim },
              ]}
            >
              {pending ? strings.topBar.pending(pendingTotal) : strings.topBar.synced}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View />
      )}

      <View style={styles.right}>
        <Pressable onPress={() => router.push("/profile")} accessibilityLabel={strings.topBar.notificationsA11yLabel}>
          <GlassSurface radius={999} style={styles.bell}>
            <View style={styles.bellInner}>
              <BellIcon size={TOPBAR_BELL_ICON_SIZE} />
              {log.length > 0 ? <View style={styles.bellDot} /> : null}
            </View>
          </GlassSurface>
        </Pressable>
        <GlassSurface radius={999} style={styles.langGroup}>
          <Pressable onPress={() => setLanguage("EN")}>
            <View style={[styles.langPill, language === "EN" && styles.langPillActive]}>
              <Text style={[styles.langText, language === "EN" && styles.langTextActive]}>EN</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setLanguage("ES")}>
            <View style={[styles.langPill, language === "ES" && styles.langPillActive]}>
              <Text style={[styles.langText, language === "ES" && styles.langTextActive]}>ES</Text>
            </View>
          </Pressable>
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  syncPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 7, paddingHorizontal: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  bell: { width: TOPBAR_BELL_SIZE, height: TOPBAR_BELL_SIZE },
  bellInner: { width: TOPBAR_BELL_SIZE, height: TOPBAR_BELL_SIZE, alignItems: "center", justifyContent: "center" },
  bellDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.off,
    borderWidth: 1.5,
    borderColor: colors.surfaceStrong,
  },
  langGroup: { flexDirection: "row", gap: 3, padding: 4 },
  langPill: { borderRadius: 18, paddingVertical: 5, paddingHorizontal: 13 },
  langPillActive: { backgroundColor: colors.ink },
  langText: { fontSize: 12.5, fontWeight: "800", letterSpacing: 0.5, color: colors.dim },
  langTextActive: { color: colors.accent },
});
