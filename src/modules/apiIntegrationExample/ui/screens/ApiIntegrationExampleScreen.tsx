import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useIsMutating } from "@tanstack/react-query";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET_DIRECT } from "@/ui/theme/layout";
import { useExampleNotesQuery } from "../hooks/useExampleNotesQuery";
import { useCreateExampleNoteMutation } from "../hooks/useCreateExampleNoteMutation";
import { useIsOnline } from "../hooks/useIsOnline";

interface ApiIntegrationExampleScreenProps {
  onGoBack: () => void;
}

// Reference screen (not linked from any real app flow) proving the REST + offline pattern end
// to end against a real network call: pull-to-see-cached-data, submit while offline to see a
// mutation queue and auto-resume once connectivity returns. Delete this whole module
// (src/modules/apiIntegrationExample/) once a real backend integration replaces it — it exists
// only so the pattern is something to point at and copy, not a feature meant to ship.
export function ApiIntegrationExampleScreen({ onGoBack }: ApiIntegrationExampleScreenProps) {
  const { data: notes, isLoading, isError, refetch, isFetching } = useExampleNotesQuery();
  const createNote = useCreateExampleNoteMutation();
  const pendingMutationCount = useIsMutating();
  const isOnline = useIsOnline();
  const [title, setTitle] = useState("");

  const onSubmit = () => {
    if (!title.trim()) return;
    createNote.mutate({ title: title.trim(), body: "Created from the API integration example screen." });
    setTitle("");
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={onGoBack} />
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>API integration example</Text>
        </View>

        <View style={[styles.statusRow, { backgroundColor: isOnline ? colors.approvedCardBg : colors.idleCardBg }]}>
          <Text style={{ color: isOnline ? colors.job : colors.idle, fontWeight: "700", fontSize: 12.5 }}>
            {isOnline ? "● Online" : "○ Offline"}
          </Text>
          {pendingMutationCount > 0 && (
            <Text style={{ color: colors.idle, fontSize: 12 }}>{pendingMutationCount} pending sync</Text>
          )}
        </View>

        <GlassSurface radius={16} style={styles.card}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="New note title…"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
          <PillButton
            label={createNote.isPending ? "Sending…" : "Add note (POST)"}
            onPress={onSubmit}
            disabled={!title.trim()}
          />
          {createNote.isPaused && <Text style={styles.pausedNote}>Queued — will send once back online.</Text>}
        </GlassSurface>

        <Pressable onPress={() => refetch()} style={styles.refreshRow}>
          <Text style={{ color: colors.dim, fontSize: 12 }}>
            {isFetching ? "Refreshing…" : "Pull to refresh (tap)"}
          </Text>
        </Pressable>

        {isLoading && <Text style={{ color: colors.faint }}>Loading…</Text>}
        {isError && <Text style={{ color: colors.off }}>Could not load — showing cached data if any.</Text>}

        {notes?.map((note) => (
          <GlassSurface key={note.id} radius={14} style={styles.noteCard}>
            <Text style={[typography.cardTitle, { color: colors.ink }]}>{note.title}</Text>
            <Text style={{ color: colors.dim, fontSize: 12, marginTop: 2 }}>{note.body}</Text>
          </GlassSurface>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingHorizontal: 18, paddingTop: SCREEN_TOP_INSET_DIRECT, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  card: { padding: 14, gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline25,
    backgroundColor: colors.surface70,
    borderRadius: 10,
    padding: 11,
    fontSize: 13,
    color: colors.ink,
  },
  pausedNote: { fontSize: 11.5, color: colors.idle, fontWeight: "600" },
  refreshRow: { alignItems: "center", paddingVertical: 6 },
  noteCard: { padding: 12 },
});
