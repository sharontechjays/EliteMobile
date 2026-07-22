import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET_DIRECT } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useTravelViewModel } from "../viewModels/useTravel.viewModel";

interface TravelScreenProps {
  fromTicketId: string;
  toTicketId: string;
  onGoBack: () => void;
  onStartJobAfterTravel: (toTicketId: string) => void;
}

export function TravelScreen({ fromTicketId, toTicketId, onGoBack, onStartJobAfterTravel }: TravelScreenProps) {
  const { state, handlers } = useTravelViewModel({ fromTicketId, toTicketId, onStartJobAfterTravel });
  const { fromTicket, toTicket, travelRunning, travelDone, travelTimerValue } = state;
  const { strings } = useLanguage();
  const t = strings.travel;

  if (!toTicket) return null;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={onGoBack} />
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>{t.headerLabel}</Text>
        </View>

        <Text style={styles.title}>{t.title}</Text>

        {travelDone ? (
          <GlassSurface radius={18} style={styles.card}>
            <Text style={styles.doneLabel}>{t.travelDone(travelTimerValue)}</Text>
            <View>
              <Text style={[typography.cardTitle, { fontSize: 19, color: colors.ink }]}>{toTicket.name}</Text>
              <Text style={[typography.body, { color: colors.dim, marginTop: 2 }]}>{toTicket.sub}</Text>
            </View>
            <View style={styles.loggedRow}>
              <Text style={styles.loggedLabel}>{t.travelLogged}</Text>
              <Text style={[styles.loggedValue, { fontFamily: fontMono }]}>{travelTimerValue}</Text>
            </View>
            <Pressable onPress={handlers.onStartJobAfterTravel} style={styles.startJobButton}>
              <Text style={styles.startJobButtonText}>{t.startJobButton}</Text>
            </Pressable>
          </GlassSurface>
        ) : (
          <Pressable
            onPress={handlers.onToggleTravel}
            style={[
              styles.toggleButton,
              {
                backgroundColor: travelRunning ? colors.offBg : colors.travelBg,
                borderColor: travelRunning ? colors.offBorder : colors.travelBorder,
              },
            ]}
          >
            <Text style={[styles.toggleButtonText, { color: travelRunning ? colors.off : colors.travel }]}>
              {travelRunning ? t.stopTravelButton : t.startTravelButton}
            </Text>
          </Pressable>
        )}

        {travelRunning && !travelDone && (
          <Pressable onPress={handlers.onConfirmArrived} style={styles.arrivedButton}>
            <Text style={styles.arrivedButtonText}>{t.endTravelArrivedButton}</Text>
          </Pressable>
        )}

        <View style={styles.runningBlock}>
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>{t.running}</Text>
          <Text style={[styles.timerValue, { fontFamily: fontMono }]}>{travelTimerValue}</Text>
        </View>

        <Text style={styles.fromTo}>{t.fromTo(fromTicket?.name ?? "—", toTicket.name)}</Text>

        <View style={styles.footerBanner}>
          <Text style={styles.footerBannerText}>{t.footerBody}</Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { gap: 13, paddingHorizontal: 18, paddingTop: SCREEN_TOP_INSET_DIRECT, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 26, fontWeight: "800", color: colors.travel },
  card: { padding: 15, gap: 11 },
  doneLabel: { fontSize: 12, fontWeight: "800", color: colors.job },
  loggedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hairline15,
  },
  loggedLabel: { fontSize: 12, color: colors.faint },
  loggedValue: { fontSize: 12, fontWeight: "600", color: colors.ink },
  startJobButton: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  startJobButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.accentInk,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleButton: { borderRadius: 18, borderWidth: 1.5, paddingVertical: 18, alignItems: "center" },
  toggleButtonText: { fontSize: 16, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  arrivedButton: {
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: colors.travelBg,
    borderWidth: 1.5,
    borderColor: colors.travelBorder,
  },
  arrivedButtonText: { fontSize: 12.5, fontWeight: "800", color: colors.travel, textTransform: "uppercase" },
  runningBlock: { alignItems: "center", gap: 2 },
  timerValue: { fontSize: 30, fontWeight: "600", color: colors.ink },
  fromTo: { fontSize: 12.5, color: colors.dim, textAlign: "center" },
  footerBanner: {
    backgroundColor: colors.travelCardBg,
    borderWidth: 1,
    borderColor: colors.travelCardBorder,
    borderRadius: 16,
    padding: 12,
  },
  footerBannerText: { fontSize: 11.5, color: colors.travel, lineHeight: 16 },
});
