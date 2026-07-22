import React from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET_DIRECT } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useNotesViewModel } from "../viewModels/useNotes.viewModel";

interface NotesScreenProps {
  ticketName: string;
  onGoBack: () => void;
}

export function NotesScreen({ ticketName, onGoBack }: NotesScreenProps) {
  const { state, handlers } = useNotesViewModel({ ticketName, onSaved: onGoBack });
  const { text, photos, maxPhotos, extraWorkFlag, saving } = state;
  const { strings } = useLanguage();
  const t = strings.notes;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton onPress={onGoBack} />
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>{t.headerLabel}</Text>
        </View>

        <Text style={[typography.body, { color: colors.dim }]}>{t.ticketLabel(ticketName)}</Text>

        <GlassSurface radius={16} style={styles.noteCard}>
          <TextInput
            value={text}
            onChangeText={handlers.onChangeText}
            multiline
            placeholder={t.notesPlaceholder}
            placeholderTextColor={colors.faint}
            style={[typography.body, styles.noteInput]}
          />
        </GlassSurface>

        <View style={styles.photoRow}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoTile}>
              <View style={styles.photoStripes} />
              <Text style={styles.photoLabel}>{photo.kind === "photo" ? t.photoLabel : t.videoLabel}</Text>
              <Pressable onPress={() => handlers.onRemovePhoto(photo.id)} style={styles.removeButton} hitSlop={6}>
                <Text style={styles.removeButtonText}>✕</Text>
              </Pressable>
            </View>
          ))}
          {photos.length < maxPhotos && (
            <Pressable onPress={handlers.onAddPhoto} style={styles.addPhotoTile}>
              <Text style={styles.addPhotoLabel}>+</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.extraWorkCard}>
          <View style={styles.extraWorkTextCol}>
            <Text style={styles.extraWorkTitle}>{t.extraWorkLabel}</Text>
            <Text style={styles.extraWorkSubtitle}>{t.extraWorkHint}</Text>
          </View>
          <Switch
            value={extraWorkFlag}
            onValueChange={handlers.onToggleExtraWork}
            trackColor={{ false: colors.switchTrackOff, true: colors.idle }}
          />
        </View>

        <PillButton label={saving ? t.savingButton : t.saveQueuedButton} onPress={handlers.onSave} disabled={saving} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 13, paddingHorizontal: 18, paddingTop: SCREEN_TOP_INSET_DIRECT, paddingBottom: 22 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  noteCard: { padding: 4 },
  noteInput: { color: colors.ink, minHeight: 52, padding: 10 },
  photoRow: { flexDirection: "row", gap: 8 },
  photoTile: {
    width: 66,
    height: 66,
    borderRadius: 10,
    backgroundColor: colors.divider,
    borderWidth: 1,
    borderColor: colors.progressTrack,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoStripes: {
    position: "absolute",
    top: -20,
    left: -20,
    width: 40,
    height: 110,
    backgroundColor: colors.hairline08,
    transform: [{ rotate: "45deg" }],
  },
  photoLabel: { fontSize: 9, color: colors.faint },
  removeButton: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.inkOverlay55,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: { fontSize: 9, fontWeight: "700", color: colors.paper },
  addPhotoTile: {
    width: 66,
    height: 66,
    borderRadius: 10,
    backgroundColor: colors.sunk,
    borderWidth: 1,
    borderColor: colors.hairline45,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoLabel: { fontSize: 20, color: colors.dim },
  extraWorkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.idleCardBg,
    borderWidth: 1,
    borderColor: colors.idleCardBorder,
    borderRadius: 16,
    padding: 13,
  },
  extraWorkTextCol: { flex: 1 },
  extraWorkTitle: { fontSize: 12, fontWeight: "700", color: colors.idle },
  extraWorkSubtitle: { fontSize: 11, fontWeight: "500", color: colors.idleCardSubtext, marginTop: 2 },
});
