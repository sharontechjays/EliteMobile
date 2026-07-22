import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { MapPreview } from "@/ui/components/molecules/MapPreview";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET_DIRECT } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useTicketDetailViewModel } from "../viewModels/useTicketDetail.viewModel";

interface TicketDetailScreenProps {
  ticketId: string;
  onGoTickets: () => void;
  onGoNotes: (ticketName: string) => void;
  onGoTravel: (fromTicketId: string, toTicketId: string) => void;
}

export function TicketDetailScreen({ ticketId, onGoTickets, onGoNotes, onGoTravel }: TicketDetailScreenProps) {
  const { state, handlers } = useTicketDetailViewModel({ ticketId, onGoNotes, onGoTravel });
  const { ticket } = state;
  const { strings } = useLanguage();
  const t = strings.ticketDetail;

  if (!ticket) return null;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={onGoTickets} />
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>{t.headerLabel}</Text>
        </View>

        <GlassSurface radius={22} style={styles.card}>
          {state.travelPrompt && (
            <View style={styles.travelPromptCard}>
              <Text style={styles.travelPromptTitle}>{state.travelPrompt.title}</Text>
              <Text style={styles.travelPromptBody}>{state.travelPrompt.body}</Text>
              <View style={styles.travelPromptRow}>
                <Pressable onPress={handlers.onStartTravelToNext} style={styles.travelPromptPrimary}>
                  <Text style={styles.travelPromptPrimaryText}>{state.travelPrompt.buttonLabel}</Text>
                </Pressable>
                <Pressable onPress={handlers.onDismissTravelPrompt} style={styles.travelPromptSecondary}>
                  <Text style={styles.travelPromptSecondaryText}>{t.notNowButton}</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View>
            <View style={styles.titleRow}>
              <Text style={[typography.cardTitle, { fontSize: 18, color: colors.ink }]}>{ticket.name}</Text>
              <Text style={[styles.tag, { fontFamily: fontMono }]}>{ticket.tag}</Text>
            </View>
            <Text style={[typography.body, { color: colors.dim, marginTop: 2 }]}>{ticket.sub}</Text>
          </View>

          <MapPreview address={ticket.address} />

          <View>
            <Text style={[typography.sectionLabel, { color: colors.faint, marginBottom: 7 }]}>{t.crewLabel}</Text>
            <View style={styles.crewRow}>
              {ticket.crew.map((member) => (
                <View key={member.id} style={styles.crewChip}>
                  <View style={[styles.crewRing, member.onJob ? styles.crewRingOn : styles.crewRingOff]} />
                  <Text style={styles.crewName}>{member.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.jobRow}>
            <Pressable
              onPress={handlers.onToggleJob}
              disabled={state.jobPaused}
              style={[styles.jobButton, state.jobPaused && { opacity: 0.5 }]}
            >
              <Text style={styles.jobButtonText}>{state.jobRunning ? t.stopJobButton : t.startJobButton}</Text>
            </Pressable>
            <View style={[styles.timerBox, state.jobOverEstimate && { backgroundColor: colors.offBg }]}>
              <Text style={[styles.timerLabel, state.jobOverEstimate && { color: colors.off }]}>
                {state.jobTimerLabel}
              </Text>
              <Text
                style={[styles.timerValue, { fontFamily: fontMono }, state.jobOverEstimate && { color: colors.off }]}
              >
                {state.jobTimerValue}
              </Text>
            </View>
          </View>

          {state.jobRunning && state.mealPhase === "none" && (
            <Pressable onPress={handlers.onToggleJobPause} style={styles.pauseButton}>
              <Text style={styles.pauseButtonText}>{t.pauseForMealButton}</Text>
            </Pressable>
          )}

          {state.mealPhase === "suggest" && (
            <View style={[styles.mealCard, { backgroundColor: colors.idleCardBg, borderColor: colors.idleCardBorder }]}>
              <Text style={[styles.mealTitle, { color: colors.idle }]}>{t.mealComingUpTitle}</Text>
              <Text style={[styles.mealBody, { color: colors.idleCardSubtext }]}>{t.mealComingUpBody}</Text>
              <Pressable onPress={handlers.onStartMeal} style={styles.mealAction}>
                <Text style={styles.mealActionText}>{t.startMealButton}</Text>
              </Pressable>
            </View>
          )}

          {state.mealPhase === "active" && (
            <View style={[styles.mealCard, { backgroundColor: colors.idleCardBg, borderColor: colors.idleCardBorder }]}>
              <View style={styles.mealActiveRow}>
                <Text style={[styles.mealTitle, { color: colors.idle }]}>{t.mealActiveTitle}</Text>
                <Text style={[styles.mealActiveTimer, { fontFamily: fontMono }]}>{state.mealTimerValue}</Text>
              </View>
              <Pressable
                onPress={handlers.onEndMeal}
                disabled={!state.mealCanEnd}
                style={[styles.mealAction, !state.mealCanEnd && { opacity: 0.5 }]}
              >
                <Text style={styles.mealActionText}>{t.endMealButton}</Text>
              </Pressable>
            </View>
          )}

          {state.mealPhase === "done" && (
            <View
              style={[
                styles.mealCard,
                { backgroundColor: colors.approvedCardBg, borderColor: colors.approvedCardBorder },
              ]}
            >
              <Text style={[styles.mealTitle, { color: colors.job }]}>{t.mealDoneTitle(state.mealTimerValue)}</Text>
              <Text style={styles.mealBody}>{t.mealDoneBody}</Text>
              <Pressable onPress={handlers.onContinueJob} style={styles.mealAction}>
                <Text style={styles.mealActionText}>{t.continueJobButton}</Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={handlers.onGoNotes} style={styles.notesButton}>
            <Text style={styles.notesButtonText}>{t.notesButton}</Text>
          </Pressable>
        </GlassSurface>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { gap: 13, paddingHorizontal: 18, paddingTop: SCREEN_TOP_INSET_DIRECT, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { padding: 15, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: {
    fontSize: 9.5,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: colors.divider,
    color: colors.dim,
  },
  crewRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  crewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.progressTrack,
    borderRadius: 22,
    paddingVertical: 5,
    paddingHorizontal: 10,
    paddingLeft: 6,
  },
  crewRing: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  crewRingOn: { borderColor: colors.job, backgroundColor: colors.jobBg },
  crewRingOff: { borderColor: colors.dotUnfilled, backgroundColor: "transparent" },
  crewName: { fontSize: 11.5, fontWeight: "600", color: colors.ink },
  notesButton: {
    paddingVertical: 13,
    borderRadius: 11,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.progressTrack,
    alignItems: "center",
  },
  notesButtonText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.ink,
    textTransform: "uppercase",
  },

  jobRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  jobButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 11,
    backgroundColor: colors.jobBg,
    borderWidth: 1,
    borderColor: colors.jobBorder,
    alignItems: "center",
  },
  jobButtonText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.job,
    textTransform: "uppercase",
  },
  timerBox: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.progressTrack,
    alignItems: "center",
    minWidth: 92,
  },
  timerLabel: { fontSize: 9.5, fontWeight: "700", letterSpacing: 0.3, color: colors.faint, textTransform: "uppercase" },
  timerValue: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: 2 },

  pauseButton: {
    paddingVertical: 13,
    borderRadius: 11,
    backgroundColor: colors.idleBg,
    borderWidth: 1,
    borderColor: colors.idleBorder,
    alignItems: "center",
  },
  pauseButtonText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.idle,
    textTransform: "uppercase",
  },

  mealCard: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  mealTitle: { fontSize: 13.5, fontWeight: "800" },
  mealBody: { fontSize: 12.5, color: colors.dim, lineHeight: 17 },
  mealAction: {
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  mealActionText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.ink,
    textTransform: "uppercase",
  },
  mealActiveRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mealActiveTimer: { fontSize: 16, fontWeight: "700", color: colors.idle },

  travelPromptCard: {
    backgroundColor: colors.travelCardBg,
    borderColor: colors.travelCardBorder,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  travelPromptTitle: { fontSize: 13.5, fontWeight: "800", color: colors.travel },
  travelPromptBody: { fontSize: 12, color: colors.dim, lineHeight: 17 },
  travelPromptRow: { flexDirection: "row", gap: 9 },
  travelPromptPrimary: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },
  travelPromptPrimaryText: { fontSize: 13, fontWeight: "800", color: colors.accentInk, textTransform: "uppercase" },
  travelPromptSecondary: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.progressTrack,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },
  travelPromptSecondaryText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.ink,
    textTransform: "uppercase",
  },
});
