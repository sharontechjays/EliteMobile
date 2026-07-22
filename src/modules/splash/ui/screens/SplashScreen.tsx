import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { ProgressBar } from "@/ui/components/atoms/ProgressBar";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { useLanguage } from "@app/react/language/useLanguage";
import { useSplashViewModel } from "../viewModels/useSplash.viewModel";

interface SplashScreenProps {
  onContinue: (alreadyApproved: boolean) => void;
}

export function SplashScreen({ onContinue }: SplashScreenProps) {
  const { state } = useSplashViewModel();
  const { strings } = useLanguage();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.logo}>
          <Text style={styles.logoLetter}>E</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[typography.brandTitle, styles.title]}>Elite Mobile</Text>
          <Text style={[typography.brandSubtitle, styles.subtitle]}>{strings.splash.tagline}</Text>
        </View>

        <View style={styles.loadingBlock}>
          <Text style={[typography.caption, { color: colors.dim }]}>{strings.splash.loading}</Text>
          <ProgressBar progress={state.progress} />
        </View>

        <Text style={[typography.caption, styles.syncCaption]}>{strings.splash.lastSync(state.lastSyncLabel)}</Text>

        <PillButton
          label={strings.splash.continueButton}
          onPress={() => onContinue(state.alreadyApproved)}
          style={styles.continueButton}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 54,
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accentShadow55,
    shadowOpacity: 1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  logoLetter: { fontSize: 44, fontWeight: "800", color: colors.accentInk },
  titleBlock: { alignItems: "center" },
  title: { color: colors.ink, textTransform: "uppercase" },
  subtitle: { color: colors.faint, marginTop: 5, textTransform: "uppercase" },
  loadingBlock: { alignItems: "center", gap: 9 },
  syncCaption: { color: colors.faint, textAlign: "center" },
  continueButton: { width: "100%" },
});
