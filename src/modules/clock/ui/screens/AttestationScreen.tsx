import React from "react";
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono, fontDisplay } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET_DIRECT } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useAttestationViewModel, MAX_CODE_LENGTH } from "../viewModels/useAttestation.viewModel";
import { AttestationWorker } from "../../core/entities/AttestationWorker.entity";

interface AttestationScreenProps {
  queue: AttestationWorker[];
  onGoRoster: () => void;
  onDone: () => void;
}

const formatNow = (): string => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const CODE_INPUT_ACCESSORY_ID = "attestation-code-input-accessory";

export function AttestationScreen({ queue, onGoRoster, onDone }: AttestationScreenProps) {
  const { state, handlers } = useAttestationViewModel({ queue, onDone });
  const { current, position, total, confirming, code, codeError, canConfirm } = state;
  const { strings } = useLanguage();
  const t = strings.attestation;

  if (!current) return null;

  const isIn = current.direction === "IN";
  const tone = isIn
    ? { bg: colors.jobBg, color: colors.job, border: colors.jobBorder }
    : { bg: colors.offBg, color: colors.off, border: colors.offBorder };
  const disabled = confirming || !canConfirm;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton onPress={onGoRoster} />
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>{t.headerLabel}</Text>
        </View>

        <Text style={[typography.body, { color: colors.dim }]}>{t.workerOf(position, total, current.name)}</Text>

        <GlassSurface radius={18} style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{current.initials}</Text>
          </View>
          <Text style={styles.nameText}>{current.name}</Text>
          <Text style={[typography.body, styles.confirmText]}>
            {t.confirmClockingPrefix}{" "}
            <Text style={styles.confirmDir}>{isIn ? strings.common.directionIn : strings.common.directionOut}</Text>
          </Text>
          <View style={styles.verifiedRow}>
            <Text style={styles.gpsLine}>{t.gpsCaptured}</Text>
            <Text style={styles.gpsLine}>{t.deviceVerified}</Text>
          </View>
          <Text style={styles.deviceLine}>{t.deviceLine}</Text>
          <Text style={[styles.clockTime, { fontFamily: fontMono }]}>{formatNow()}</Text>
        </GlassSurface>

        <GlassSurface radius={18} style={styles.codeCard}>
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>{t.codeSectionLabel}</Text>
          <TextInput
            value={code}
            onChangeText={handlers.onCodeChange}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={MAX_CODE_LENGTH}
            placeholder="• • • •"
            placeholderTextColor={colors.faint}
            style={[styles.codeInput, { borderColor: codeError ? colors.off : colors.hairline25 }]}
            inputAccessoryViewID={Platform.OS === "ios" ? CODE_INPUT_ACCESSORY_ID : undefined}
          />
          {codeError ? <Text style={styles.codeError}>{t.codeMismatch(current.name)}</Text> : null}
          <Text style={styles.codeHelper}>{t.codeHelper(current.name)}</Text>
        </GlassSurface>

        <Pressable
          onPress={() => {
            if (disabled) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handlers.onConfirm();
          }}
          disabled={disabled}
          style={[styles.confirmButton, { backgroundColor: tone.bg, borderColor: tone.border, opacity: disabled ? 0.45 : 1 }]}
        >
          <Text style={[typography.buttonLabel, { color: tone.color }]}>{isIn ? t.clockInButton : t.clockOutButton}</Text>
        </Pressable>

        {Platform.OS === "ios" && (
          <InputAccessoryView nativeID={CODE_INPUT_ACCESSORY_ID}>
            <View style={styles.keyboardAccessory}>
              <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8}>
                <Text style={styles.keyboardAccessoryDone}>{t.doneKey}</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 14, paddingHorizontal: 18, paddingTop: SCREEN_TOP_INSET_DIRECT, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { alignItems: "center", gap: 10, paddingVertical: 22, paddingHorizontal: 12 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: { fontSize: 21, fontWeight: "800", color: colors.dim },
  nameText: { fontFamily: fontDisplay, fontSize: 20, fontWeight: "800", color: colors.ink },
  confirmText: { color: colors.dim, textAlign: "center" },
  confirmDir: { fontWeight: "800", color: colors.ink },
  verifiedRow: { flexDirection: "row", gap: 12 },
  gpsLine: { fontSize: 12, fontWeight: "700", color: colors.job },
  deviceLine: { fontSize: 10.5, color: colors.faint, fontFamily: fontMono },
  clockTime: { fontSize: 28, fontWeight: "600", color: colors.ink },
  codeCard: { gap: 9, padding: 14 },
  codeInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 13,
    fontFamily: fontMono,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
    color: colors.ink,
    backgroundColor: colors.surface70,
  },
  codeError: { fontSize: 11.5, fontWeight: "700", color: colors.off },
  codeHelper: { fontSize: 10.5, color: colors.faint, lineHeight: 15 },
  confirmButton: { borderRadius: 18, borderWidth: 1.5, paddingVertical: 18, alignItems: "center" },
  keyboardAccessory: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.hairline20,
  },
  keyboardAccessoryDone: { fontSize: 15, fontWeight: "700", color: colors.accent },
});
