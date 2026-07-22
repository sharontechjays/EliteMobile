import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { Keypad } from "@/ui/components/atoms/Keypad";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET_DIRECT } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useSignInViewModel } from "../viewModels/useSignIn.viewModel";
import { CrewLeaderSession } from "../../core/entities/CrewLeaderSession.entity";

interface SignInScreenProps {
  onSignedIn: (session: CrewLeaderSession) => void;
}

export function SignInScreen({ onSignedIn }: SignInScreenProps) {
  const { state, handlers } = useSignInViewModel({ onSignedIn });
  const { code, codeLength, hasError } = state;
  const { strings } = useLanguage();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={[typography.largeDate, styles.title]}>{strings.signIn.title}</Text>

        <View style={styles.verifiedRow}>
          <View style={styles.verifiedDot} />
          <Text style={styles.verifiedText}>{strings.signIn.deviceVerified}</Text>
        </View>

        <View style={styles.pinBlock}>
          <Text style={[typography.sectionLabel, styles.codeLabel]}>{strings.signIn.employeeCodeLabel}</Text>

          <View style={styles.dotsRow}>
            {Array.from({ length: codeLength }).map((_, index) => {
              const filled = index < code.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    filled && { backgroundColor: hasError ? colors.off : colors.accent },
                    { borderColor: hasError ? colors.off : filled ? colors.accent : colors.dotUnfilled },
                  ]}
                />
              );
            })}
          </View>

          <Keypad onKeyPress={handlers.onKeyPress} disabled={hasError} />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 13, paddingHorizontal: 20, paddingTop: SCREEN_TOP_INSET_DIRECT, paddingBottom: 22 },
  title: { color: colors.ink },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifiedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.job },
  verifiedText: { fontSize: 11, fontWeight: "700", color: colors.job },
  pinBlock: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },
  codeLabel: { color: colors.faint, textTransform: "uppercase" },
  dotsRow: { flexDirection: "row", gap: 13, justifyContent: "center" },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5 },
});
