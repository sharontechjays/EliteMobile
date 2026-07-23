import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useTimer } from "@app/react/timer/useTimer";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { useMealReminders } from "@app/react/mealReminders/useMealReminders";
import { useLanguage } from "@app/react/language/useLanguage";
import { Translations } from "@app/react/language/translations/Translations.type";
import { colors } from "@/ui/theme/colors";
import { DEFAULT_BATTERY_PERCENT, LOW_BATTERY_WARNING_THRESHOLD, SECONDS_PER_HOUR } from "@/constants/appConstants";
import { GetHomeSummaryUseCase } from "../../core/usecases/GetHomeSummary.usecase";
import { GetTicketDetailUseCase } from "@modules/tickets/core/usecases/GetTicketDetail.usecase";
import { CrewStatus, DayEntry, HomeSummary } from "../../core/entities/HomeSummary.entity";

const ROLE_LABEL: Record<HomeSummary["crewLeaderRole"], (t: Translations["home"]) => string> = {
  crewLeader: (t) => t.roleCrewLeader,
  supervisor: (t) => t.roleSupervisor,
};

export interface HomeBanner {
  icon: string;
  title: string;
  body: string;
  bg: string;
  border: string;
  accent: string;
}

// The mock adapter always seeds exactly these three day entries — this maps each entry's
// language-neutral id to its translated display name (the adapter's own `name` field is mock
// English content, not read here; see InMemoryHomeSummary.adapter.ts's own comment).
const DAY_ENTRY_NAME: Record<string, (t: Translations["mockData"]) => string> = {
  yard: (t) => t.yardEntryName,
  training: (t) => t.trainingEntryName,
  shop: (t) => t.shopEntryName,
};
const DAY_ENTRY_LOCATION: Record<string, (t: Translations["mockData"]) => string> = {
  yard: (t) => `${t.yardLocation} — Chesterfield`,
  training: (t) => `${t.yardLocation} — Chesterfield`,
  shop: (t) => `${t.shopLocation} — Chesterfield`,
};

const STATUS_KIND_COLOR: Record<DayEntry["statusKind"], { text: string; bg: string; border: string }> = {
  job: { text: colors.job, bg: colors.jobBg, border: colors.jobBorder },
  travel: { text: colors.travel, bg: colors.travelBg, border: colors.travelBorder },
  idle: { text: colors.idle, bg: colors.idleBg, border: colors.idleBorder },
  off: { text: colors.off, bg: colors.offBg, border: colors.offBorder },
};

const bannerForStatus = (status: CrewStatus, t: Translations["home"]): HomeBanner => {
  switch (status) {
    case "out":
      return {
        icon: "●",
        title: t.bannerOutTitle,
        body: t.bannerOutBody,
        bg: colors.idleBg,
        border: colors.idleBorder,
        accent: colors.idle,
      };
    case "in":
      return {
        icon: "→",
        title: t.bannerInTitle,
        body: t.bannerInBody,
        bg: colors.travelBg,
        border: colors.travelBorder,
        accent: colors.travel,
      };
    case "travel":
      return {
        icon: "→",
        title: t.bannerTravelTitle,
        body: t.bannerTravelBody,
        bg: colors.travelBg,
        border: colors.travelBorder,
        accent: colors.travel,
      };
    case "job":
      return {
        icon: "●",
        title: t.bannerJobTitle,
        body: t.bannerJobBody,
        bg: colors.jobBg,
        border: colors.jobBorder,
        accent: colors.job,
      };
    case "lunch":
      return {
        icon: "◔",
        title: t.bannerLunchTitle,
        body: t.bannerLunchBody,
        bg: colors.idleBg,
        border: colors.idleBorder,
        accent: colors.idle,
      };
  }
};

// Picks which active clock-in meal reminder (see MealReminderProvider) to surface on Home when
// more than one crew member has one outstanding — an overdue crew+supervisor escalation is more
// urgent than a still-fresh crew-only reminder, so it wins regardless of arrival order.
const mealReminderBannerFor = (
  reminders: { workerName: string; audience: "crew" | "crewAndSupervisor" }[],
  t: Translations["ticketDetail"],
): HomeBanner | null => {
  if (reminders.length === 0) return null;
  const escalated = reminders.find((r) => r.audience === "crewAndSupervisor");
  if (escalated) {
    return {
      icon: "▲",
      title: t.mealEscalationTitle,
      body: t.mealEscalationBody(escalated.workerName),
      bg: colors.offBg,
      border: colors.offBorder,
      accent: colors.off,
    };
  }
  return {
    icon: "◔",
    title: t.mealReminderTitle,
    body: t.mealReminderBody,
    bg: colors.idleBg,
    border: colors.idleBorder,
    accent: colors.idle,
  };
};

const formatTimer = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

interface UseHomeViewModelArgs {
  onOpenNextJob: (ticketId: string) => void;
  onGoRoster: () => void;
  onGoTravel: (fromTicketId: string, toTicketId: string) => void;
}

export const useHomeViewModel = ({ onOpenNextJob, onGoRoster, onGoTravel }: UseHomeViewModelArgs) => {
  const { homeSummaryReader, ticketsReader, batteryReader, gpsAvailabilityReader } = useDependencies();
  const timer = useTimer();
  const { push } = useNotifications();
  const { activeReminders } = useMealReminders();
  const { strings } = useLanguage();
  const home = strings.home;
  const mock = strings.mockData;
  const ticketDetail = strings.ticketDetail;
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [nextTicketId, setNextTicketId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openDayItemId, setOpenDayItemId] = useState<string | null>(null);
  const [notifyPanelOpen, setNotifyPanelOpen] = useState(false);
  const [notifyComposerOpen, setNotifyComposerOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [, forceRerender] = useState(0);
  // Real device signals, not mock data — both default to "no warning" until the first real
  // reading arrives (see the showBatteryWarning/showGpsWarning comment below for why).
  const [batteryPercent, setBatteryPercent] = useState(DEFAULT_BATTERY_PERCENT);
  const [gpsAvailable, setGpsAvailable] = useState(true);

  const load = useCallback(async () => {
    const result = await new GetHomeSummaryUseCase(homeSummaryReader).execute();
    if (result.success) {
      setSummary(result.data);
      const ticketResult = await new GetTicketDetailUseCase(ticketsReader).execute(result.data.nextJob.id);
      if (ticketResult.success) setNextTicketId(ticketResult.data.nextTicketId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-render once a second so the job timer stays live — getSeconds/isRunning read from a ref
  // internally and don't trigger re-renders on their own (see TimerProvider.tsx's own note).
  useEffect(() => {
    const interval = setInterval(() => forceRerender((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Real, continuously-observed device signals — an initial read plus a live subscription, so
  // the banners below update the moment the device's actual battery/GPS state changes, not just
  // on next screen focus.
  useEffect(() => {
    batteryReader.getLevelPercent().then((result) => {
      if (result.success) setBatteryPercent(result.data);
    });
    return batteryReader.subscribe(setBatteryPercent);
  }, [batteryReader]);

  useEffect(() => {
    gpsAvailabilityReader.isAvailable().then((result) => {
      if (result.success) setGpsAvailable(result.data);
    });
    return gpsAvailabilityReader.subscribe(setGpsAvailable);
  }, [gpsAvailabilityReader]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const showBatteryWarning = batteryPercent < LOW_BATTERY_WARNING_THRESHOLD;
  const showGpsWarning = !gpsAvailable;
  const banner = summary ? bannerForStatus(summary.crewStatus, home) : null;
  const mealReminderBanner = mealReminderBannerFor(activeReminders, ticketDetail);

  // Each day entry (yard/training/shop) gets its own independent timer, keyed off the same
  // generic engine job/travel already use — id/name/location come from the mock entry, but the
  // running state, elapsed time, and status/button all derive live from the timer, not the
  // mock's static placeholder fields (statusText/timer/buttonLabel), matching how job/travel
  // never trust their own mock "sub" text either.
  const dayItems = (summary?.dayEntries ?? []).map((entry) => {
    const dayTimerId = `day:${entry.id}`;
    const dayRunning = timer.isRunning(dayTimerId);
    const daySeconds = timer.getSeconds(dayTimerId);
    const tone = STATUS_KIND_COLOR[dayRunning ? "job" : "idle"];
    return {
      id: entry.id,
      name: DAY_ENTRY_NAME[entry.id]?.(mock) ?? entry.name,
      statusText: dayRunning ? strings.travel.running : daySeconds > 0 ? home.pausedButton : mock.homeNotStarted,
      statusColor: tone.text,
      timer: formatTimer(daySeconds),
      location: DAY_ENTRY_LOCATION[entry.id]?.(mock) ?? entry.location,
      startTime: entry.startTime,
      endTime: entry.endTime,
      open: openDayItemId === entry.id,
      onToggleOpen: () => setOpenDayItemId((prev) => (prev === entry.id ? null : entry.id)),
      button: {
        label: dayRunning ? home.stopButton : home.startButton,
        bg: tone.bg,
        color: tone.text,
        border: tone.border,
        opacity: 1,
        onPress: () => {
          if (dayRunning) timer.pause(dayTimerId);
          else timer.start(dayTimerId);
          // Same instant-feedback bump onToggleJob/onJobAction use — the timer engine's context
          // value is a stable ref, so this hook wouldn't otherwise see the new isRunning() value
          // until the next 1s poll tick.
          forceRerender((c) => c + 1);
        },
      },
    };
  });

  const jobTimerId = summary ? `job:${summary.nextJob.id}` : null;
  const travelTimerId = summary && nextTicketId ? `travel:${summary.nextJob.id}:${nextTicketId}` : null;

  const jobSeconds = jobTimerId ? timer.getSeconds(jobTimerId) : 0;
  const jobRunning = jobTimerId ? timer.isRunning(jobTimerId) : false;
  const estimatedSeconds = (summary?.nextJob.estimatedHours ?? 0) * SECONDS_PER_HOUR;
  // Gated on estimatedSeconds > 0 so a job with no estimate set (falls back to 0) never shows as
  // "over estimate" — there's nothing to be over.
  const jobOverEstimate = estimatedSeconds > 0 && jobSeconds > estimatedSeconds;

  const travelRunning = travelTimerId ? timer.isRunning(travelTimerId) : false;
  const travelSeconds = travelTimerId ? timer.getSeconds(travelTimerId) : 0;
  // There's no explicit travel-status field — "done" is inferred purely from elapsed time plus
  // running state: some time has accumulated (travel was actually started at some point) but it's
  // not currently running (it was paused/stopped, not just never begun).
  const travelDone = travelTimerId ? travelSeconds > 0 && !travelRunning : false;
  // All four conditions must hold to still need travel: the job hasn't started yet ("pending"),
  // travel isn't already in progress, this job actually requires travel first (some don't), and
  // travel hasn't already been completed — any one of these being false means either travel is
  // irrelevant or already handled.
  const needsTravel =
    summary?.nextJob.status === "pending" && !travelRunning && summary?.nextJob.requiresTravelFirst && !travelDone;

  const jobButton = (() => {
    if (travelRunning)
      return { label: home.travellingButton, bg: colors.travelBg, color: colors.travel, border: colors.travelBorder };
    if (needsTravel)
      return { label: home.startTravelButton, bg: colors.travelBg, color: colors.travel, border: colors.travelBorder };
    if (jobRunning) return { label: home.stopButton, bg: colors.offBg, color: colors.off, border: colors.offBorder };
    if (jobSeconds > 0)
      return { label: home.pausedButton, bg: colors.jobBg, color: colors.job, border: colors.jobBorder };
    return { label: home.startButton, bg: colors.jobBg, color: colors.job, border: colors.jobBorder };
  })();
  const jobButtonOpacity = summary?.crewStatus === "out" ? 0.5 : 1;

  const onJobAction = () => {
    if (!summary || !jobTimerId) return;
    // Clocked out entirely: this taps enforces "clock in before starting a job" as a business
    // rule rather than starting the job timer anyway — it redirects to Roster (where clock-in
    // happens) instead of acting on the job at all.
    if (summary.crewStatus === "out") {
      push({
        icon: "!",
        title: strings.notifications.clockInFirstTitle,
        body: strings.notifications.clockInFirstJobBody,
      });
      onGoRoster();
      return;
    }
    // Silent no-op while travel is in progress — the travel chip (showTravelChip below) is the
    // only affordance to stop travel; this button intentionally does nothing until travel ends.
    if (travelRunning) return;
    if (needsTravel && travelTimerId) {
      timer.start(travelTimerId);
      forceRerender((c) => c + 1);
      return;
    }
    if (jobRunning) timer.pause(jobTimerId);
    else timer.start(jobTimerId);
    // The timer engine's context value is a stable ref (see TimerProvider) that never changes
    // identity, so starting/pausing it alone wouldn't cause this hook to observe the new
    // isRunning()/getSeconds() values until the next 1s poll tick (same issue documented in
    // useTicketDetail.viewModel's onToggleJob and useTravel.viewModel's onToggleTravel). Bump
    // immediately so start/stop feels instant rather than delayed by up to a second.
    forceRerender((c) => c + 1);
  };

  const onNotifyQuickTap = (label: string) => {
    push({
      icon: "⚑",
      title: strings.notifications.officeNotifiedTitle,
      body: strings.notifications.officeNotifiedBody(label),
    });
  };

  const onNotifySend = () => {
    if (!notifyMessage.trim()) return;
    push({
      icon: "⚑",
      title: strings.notifications.officeNotifiedTitle,
      body: strings.notifications.officeNotifiedBody(notifyMessage.trim()),
    });
    setNotifyComposerOpen(false);
    setNotifyMessage("");
    setNotifyPanelOpen(false);
  };

  return {
    state: {
      summary: summary
        ? {
            ...summary,
            dateLabel: mock.homeDateLabel,
            crewLeaderRoleLabel: ROLE_LABEL[summary.crewLeaderRole](home),
            nextJob: { ...summary.nextJob, sub: mock.ticketJobSiteEstimate(String(summary.nextJob.estimatedHours)) },
          }
        : null,
      banner,
      mealReminderBanner,
      batteryPercent,
      showBatteryWarning,
      showGpsWarning,
      dayItems,
      refreshing,
      jobButton,
      jobButtonOpacity,
      jobOverEstimate,
      jobTimerValue: formatTimer(jobSeconds),
      showTravelChip: travelRunning,
      travelChipTitle: travelRunning ? home.travelChipTitle(formatTimer(travelSeconds)) : undefined,
      travelChipHint: home.travelChipHint,
      notifyPanelOpen,
      notifyComposerOpen,
      notifyMessage,
      notifyQuickOptions: [
        strings.notifyOfficePanel.quickRunningLate,
        strings.notifyOfficePanel.quickEquipmentIssue,
        strings.notifyOfficePanel.quickNeedMaterials,
        strings.notifyOfficePanel.quickWeatherDelay,
      ],
    },
    handlers: {
      onClockInOut: onGoRoster,
      onOpenNextJob: () => onOpenNextJob(summary?.nextJob.id ?? ""),
      onOpenTravel: () => {
        if (summary && nextTicketId) onGoTravel(summary.nextJob.id, nextTicketId);
      },
      onJobAction,
      onRefresh,
      onToggleNotifyPanel: () => setNotifyPanelOpen((prev) => !prev),
      onNotifyQuickTap,
      onNotifyOther: () => {
        setNotifyComposerOpen(true);
        setNotifyMessage("");
      },
      onChangeNotifyMessage: setNotifyMessage,
      onNotifyCancel: () => {
        setNotifyComposerOpen(false);
        setNotifyMessage("");
      },
      onNotifySend,
    },
  };
};
