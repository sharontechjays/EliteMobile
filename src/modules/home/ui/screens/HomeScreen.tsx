import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { StatusBanner } from "@/ui/components/molecules/StatusBanner";
import { NotifyOfficePanel } from "@/ui/components/molecules/NotifyOfficePanel";
import { HomeJobCard } from "@/ui/components/molecules/HomeJobCard";
import { DayItemRow } from "@/ui/components/molecules/DayItemRow";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { SCREEN_TOP_INSET } from "@/ui/theme/layout";
import { useLanguage } from "@app/react/language/useLanguage";
import { useHomeViewModel } from "../viewModels/useHome.viewModel";

interface HomeScreenProps {
  onOpenNextJob: (ticketId: string) => void;
  onOpenProfile: () => void;
  onGoRoster: () => void;
  onGoTravel: (fromTicketId: string, toTicketId: string) => void;
}

export function HomeScreen({ onOpenNextJob, onOpenProfile, onGoRoster, onGoTravel }: HomeScreenProps) {
  const { state, handlers } = useHomeViewModel({ onOpenNextJob, onGoRoster, onGoTravel });
  const {
    summary,
    banner,
    showBatteryWarning,
    showGpsWarning,
    dayItems,
    refreshing,
    jobButton,
    jobButtonOpacity,
    jobOverEstimate,
    jobTimerValue,
    travelChipTitle,
    travelChipHint,
    notifyPanelOpen,
    notifyComposerOpen,
    notifyMessage,
    notifyQuickOptions,
  } = state;
  const insets = useSafeAreaInsets();
  const { strings } = useLanguage();
  const t = strings.home;

  if (!summary || !banner) return null;

  const jobDotColor = summary.nextJob.status === "pending" ? colors.faint : colors.job;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlers.onRefresh} tintColor={colors.dim} />}
        >
          <View style={styles.header}>
            <View>
              <Text style={[typography.largeDate, { color: colors.ink }]}>{summary.dateLabel}</Text>
              <Text style={[typography.body, { color: colors.dim }]}>{summary.crewLeaderLine}</Text>
            </View>
            <Pressable style={styles.avatar} onPress={onOpenProfile}>
              <Text style={styles.avatarLabel}>{summary.crewLeaderInitials}</Text>
            </Pressable>
          </View>

          {showBatteryWarning && (
            <StatusBanner
              icon="▮"
              title={t.batteryTitle(summary.batteryPercent)}
              body={t.batteryBody}
              tone={{ bg: colors.offBg, border: colors.offBorder, accent: colors.off }}
            />
          )}

          {showGpsWarning && (
            <StatusBanner
              icon="◎"
              title={t.gpsTitle}
              body={t.gpsBody}
              tone={{ bg: colors.offBg, border: colors.offBorder, accent: colors.off }}
            />
          )}

          <StatusBanner
            icon={banner.icon}
            title={banner.title}
            body={banner.body}
            tone={banner}
            onNotifyPress={handlers.onToggleNotifyPanel}
          />

          {notifyPanelOpen && (
            <NotifyOfficePanel
              quickOptions={notifyQuickOptions}
              onQuickTap={handlers.onNotifyQuickTap}
              onOther={handlers.onNotifyOther}
              composerOpen={notifyComposerOpen}
              message={notifyMessage}
              onChangeMessage={handlers.onChangeNotifyMessage}
              onCancel={handlers.onNotifyCancel}
              onSend={handlers.onNotifySend}
            />
          )}

          <Text style={[typography.sectionLabel, styles.sectionLabel]}>{t.daySectionLabel}</Text>
          <View style={styles.dayList}>
            {dayItems.map((item) => (
              <DayItemRow
                key={item.id}
                name={item.name}
                statusText={item.statusText}
                statusColor={item.statusColor}
                timer={item.timer}
                button={item.button}
                location={item.location}
                startTime={item.startTime}
                endTime={item.endTime}
                open={item.open}
                onToggleOpen={item.onToggleOpen}
              />
            ))}
          </View>

          <Text style={[typography.sectionLabel, styles.sectionLabel]}>{t.clockSectionLabel}</Text>
          <PillButton label={t.clockButtonLabel} icon="●" onPress={handlers.onClockInOut} />

          <Text style={[typography.sectionLabel, styles.sectionLabel]}>{t.jobSectionLabel}</Text>
          <HomeJobCard
            name={summary.nextJob.name}
            sub={summary.nextJob.sub}
            dotColor={jobDotColor}
            onOpen={handlers.onOpenNextJob}
            timerLabel={jobOverEstimate ? strings.common.jobTimeLabelOverEstimate : strings.common.jobTimeLabel}
            timerValue={jobTimerValue}
            overEstimate={jobOverEstimate}
            button={{ ...jobButton, opacity: jobButtonOpacity }}
            onJobAction={handlers.onJobAction}
            travelChipTitle={travelChipTitle}
            travelHint={travelChipHint}
            onOpenTravel={handlers.onOpenTravel}
          />
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: SCREEN_TOP_INSET },
  scroll: { flex: 1 },
  scrollContent: { gap: 14, paddingHorizontal: 18, paddingBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: { color: colors.paper, fontSize: 12, fontWeight: "700" },
  sectionLabel: { color: colors.faint, textTransform: "uppercase", marginTop: 2 },
  dayList: { gap: 8 },
});
