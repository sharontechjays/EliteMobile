import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useTicketsViewModel } from "../viewModels/useTickets.viewModel";

interface TicketsScreenProps {
  onOpenTicket: (ticketId: string) => void;
}

export function TicketsScreen({ onOpenTicket }: TicketsScreenProps) {
  const { state, handlers } = useTicketsViewModel({ onOpenTicket });
  const { rows, refreshing } = state;
  const insets = useSafeAreaInsets();
  const { strings } = useLanguage();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlers.onRefresh} tintColor={colors.dim} />}
        >
          <Text style={[typography.largeDate, { color: colors.ink }]}>{strings.ticketsList.title}</Text>

          <View style={styles.list}>
            {rows.map((row) => (
              <Pressable key={row.id} onPress={row.onPress} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: row.dotColor }]} />
                <View style={styles.textCol}>
                  <View style={styles.nameRow}>
                    <Text style={[typography.cardTitle, { color: colors.ink }]}>{row.name}</Text>
                    <Text style={[styles.tag, { fontFamily: fontMono }]}>{row.tag}</Text>
                  </View>
                  <Text style={[typography.body, { color: colors.dim, marginTop: 2 }]}>{row.sub}</Text>
                  <Text style={[styles.statusLabel, { color: row.dotColor }]}>{row.statusLabel}</Text>
                </View>
                <Text style={{ color: colors.faint, fontSize: 15 }}>›</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: SCREEN_TOP_INSET },
  scroll: { flex: 1 },
  scrollContent: { gap: 14, paddingHorizontal: 18, paddingBottom: 16 },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 13,
  },
  dot: { width: 9, height: 9, borderRadius: 4.5, marginTop: 5 },
  textCol: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  tag: { fontSize: 9.5, fontWeight: "700", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.divider, color: colors.dim },
  statusLabel: { fontSize: 11, fontWeight: "700", marginTop: 3 },
});
