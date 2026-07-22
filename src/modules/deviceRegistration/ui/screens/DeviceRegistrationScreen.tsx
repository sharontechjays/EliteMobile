import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET_DIRECT } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useDeviceRegistrationViewModel } from "../viewModels/useDeviceRegistration.viewModel";

interface DeviceRegistrationScreenProps {
  onContinue: () => void;
}

export function DeviceRegistrationScreen({ onContinue }: DeviceRegistrationScreenProps) {
  const { state, handlers } = useDeviceRegistrationViewModel({ onContinue });
  const { status, nickname, deviceModel, appVersion, steps, canRegister, securingFailed } = state;
  const { strings } = useLanguage();
  const t = strings.deviceRegistration;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={[typography.largeDate, { color: colors.ink }]}>{t.title}</Text>
        <Text style={[typography.body, { color: colors.dim }]}>{t.subtitle}</Text>

        <GlassSurface radius={18} style={styles.card}>
          {steps.map((step) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: step.done ? colors.jobBg : colors.divider }]}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: step.done ? colors.job : colors.faint }}>
                  {step.done ? "✓" : "·"}
                </Text>
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepTitle, { color: step.done ? colors.ink : colors.faint }]}>{step.title}</Text>
                <Text style={styles.stepSub}>{step.sub}</Text>
              </View>
            </View>
          ))}
        </GlassSurface>

        <GlassSurface radius={18} style={styles.card}>
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>{t.deviceInfoLabel}</Text>
          <View style={[styles.infoRow, styles.infoRowSeparator]}>
            <Text style={styles.infoLabel}>{t.nicknameLabel}</Text>
            <TextInput
              value={nickname}
              onChangeText={handlers.onChangeNickname}
              placeholder={t.nicknamePlaceholder}
              placeholderTextColor={colors.faint}
              style={styles.nicknameInput}
              editable={status === "registering"}
            />
          </View>
          <View style={[styles.infoRow, styles.infoRowSeparator]}>
            <Text style={styles.infoLabel}>{t.modelLabel}</Text>
            <Text style={styles.infoValue}>{deviceModel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.appVersionLabel}</Text>
            <Text style={styles.infoValue}>{appVersion}</Text>
          </View>
        </GlassSurface>

        {status === "registering" && (
          <PillButton
            label={securingFailed ? t.retryButton : canRegister ? t.registerButton : t.securingButton}
            onPress={securingFailed ? handlers.onRetrySecure : handlers.onRegister}
            disabled={!canRegister && !securingFailed}
          />
        )}

        {status === "pending" && (
          <>
            <View style={styles.pendingBanner}>
              <Text style={styles.bannerIcon}>⏳</Text>
              <View style={styles.stepTextCol}>
                <Text style={styles.pendingTitle}>{t.pendingTitle}</Text>
                <Text style={styles.pendingSubtitle}>{t.pendingSubtitle}</Text>
              </View>
            </View>
            <Pressable style={styles.demoButton} onPress={handlers.onDemoApprove}>
              <Text style={styles.demoButtonLabel}>{t.demoApproveButton}</Text>
            </Pressable>
          </>
        )}

        {status === "approved" && (
          <>
            <View style={styles.approvedBanner}>
              <Text style={styles.bannerIcon}>✓</Text>
              <Text style={styles.approvedText}>{t.approvedText}</Text>
            </View>
            <PillButton label={t.continueButton} onPress={handlers.onContinue} />
          </>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 13, paddingHorizontal: 18, paddingTop: SCREEN_TOP_INSET_DIRECT, paddingBottom: 22 },
  card: { padding: 15, gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  stepIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepTextCol: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 13, fontWeight: "700" },
  stepSub: { fontSize: 11, color: colors.faint, lineHeight: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 5 },
  infoRowSeparator: { borderBottomWidth: 1, borderBottomColor: colors.hairline12 },
  infoLabel: { fontSize: 12, color: colors.faint, flexShrink: 0 },
  infoValue: { fontSize: 12, fontWeight: "700", color: colors.ink },
  nicknameInput: {
    flex: 1,
    minWidth: 0,
    textAlign: "right",
    fontWeight: "700",
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.surface70,
    borderWidth: 1,
    borderColor: colors.hairline25,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: colors.idleCardBg,
    borderWidth: 1.5,
    borderColor: colors.idleCardBorder,
    borderRadius: 18,
    padding: 13,
  },
  bannerIcon: { fontSize: 15 },
  pendingTitle: { fontSize: 13, fontWeight: "800", color: colors.idle },
  pendingSubtitle: { fontSize: 11.5, color: colors.idleCardSubtext, lineHeight: 16 },
  approvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.approvedCardBg,
    borderWidth: 1.5,
    borderColor: colors.approvedCardBorder,
    borderRadius: 18,
    padding: 13,
  },
  approvedText: { fontSize: 13, fontWeight: "800", color: colors.job },
  demoButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline45,
    borderStyle: "dashed",
    backgroundColor: colors.surface35,
    paddingVertical: 12,
    alignItems: "center",
  },
  demoButtonLabel: { fontSize: 11.5, fontWeight: "700", color: colors.dim },
});
