import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import * as Crypto from "expo-crypto";
import { useDependencies } from "@app/react/useDependencies";
import { useTimer } from "@app/react/timer/useTimer";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { useLanguage } from "@app/react/language/useLanguage";
import { GetTicketDetailUseCase } from "../../core/usecases/GetTicketDetail.usecase";
import { GetTicketAttachmentsUseCase } from "../../core/usecases/GetTicketAttachments.usecase";
import { CaptureTicketAttachmentUseCase } from "../../core/usecases/CaptureTicketAttachment.usecase";
import { buildMealBreakCascade, getNextDueMealBreakCheckpoint } from "../../core/usecases/deriveMealBreakAlert.usecase";
import {
  FIRST_MEAL_ESCALATION_INTERVAL_MINUTES,
  FIRST_MEAL_MAX_ALERTS,
  FIRST_MEAL_REMINDER_HOUR,
  MEAL_BREAK_MINIMUM_SECONDS,
  SECOND_MEAL_CASCADE_START_HOUR,
  SECOND_MEAL_ESCALATION_INTERVAL_MINUTES,
  SECOND_MEAL_MAX_ALERTS,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from "@/constants/appConstants";
import { JobTicket } from "../../core/entities/JobTicket.entity";
import { TicketAttachment, TicketAttachmentKind } from "../../core/entities/TicketAttachment.entity";

const MEAL_MINIMUM_SECONDS = MEAL_BREAK_MINIMUM_SECONDS;
const MEAL_SUGGEST_AFTER_HOURS = FIRST_MEAL_REMINDER_HOUR;

// Crew-only reminder at the 4h mark, then crew+supervisor escalations every 15 min up to 4
// alerts total (4h/4h15/4h30/4h45) — see src/constants/appConstants.ts for the tunable values.
const FIRST_MEAL_CASCADE = buildMealBreakCascade({
  startSeconds: FIRST_MEAL_REMINDER_HOUR * SECONDS_PER_HOUR,
  escalationIntervalSeconds: FIRST_MEAL_ESCALATION_INTERVAL_MINUTES * SECONDS_PER_MINUTE,
  maxAlerts: FIRST_MEAL_MAX_ALERTS,
  firstAlertAudience: "crew",
});

// Second meal-break cascade: starts at the 11th hour (ahead of the 12th-hour CA penalty
// point), crew+supervisor from the first alert since this is already past the manual flow's
// own "suggest" nudge.
const SECOND_MEAL_CASCADE = buildMealBreakCascade({
  startSeconds: SECOND_MEAL_CASCADE_START_HOUR * SECONDS_PER_HOUR,
  escalationIntervalSeconds: SECOND_MEAL_ESCALATION_INTERVAL_MINUTES * SECONDS_PER_MINUTE,
  maxAlerts: SECOND_MEAL_MAX_ALERTS,
  firstAlertAudience: "crewAndSupervisor",
});

interface UseTicketDetailViewModelArgs {
  ticketId: string;
  onGoNotes: (ticketName: string) => void;
  onGoTravel: (fromTicketId: string, toTicketId: string) => void;
}

type MealPhase = "none" | "suggest" | "active" | "done";

interface MealComplianceState {
  mealPhase: MealPhase;
  mealBreaksCompletedCount: number;
  firstMealAlertsFired: number;
  secondMealAlertsFired: number;
}

const INITIAL_MEAL_COMPLIANCE_STATE: MealComplianceState = {
  mealPhase: "none",
  mealBreaksCompletedCount: 0,
  firstMealAlertsFired: 0,
  secondMealAlertsFired: 0,
};

const mealComplianceStorageKey = (ticketId: string) => `mealCompliance.v1:${ticketId}`;

// Mirrors TimerProvider's own persisted-state pattern: without this, an app crash/kill/restart
// mid-shift would reset mealPhase and the alert-fired counters back to defaults on next launch,
// even though the job/meal timers themselves (persisted separately, keyed off a wall-clock
// startedAt) still correctly remember elapsed time. That mismatch would either re-fire alerts
// already delivered before the restart, or forget that a break was genuinely in progress.
function loadPersistedMealCompliance(getString: (key: string) => string | null, ticketId: string): MealComplianceState {
  const raw = getString(mealComplianceStorageKey(ticketId));
  if (!raw) return INITIAL_MEAL_COMPLIANCE_STATE;
  try {
    return { ...INITIAL_MEAL_COMPLIANCE_STATE, ...(JSON.parse(raw) as Partial<MealComplianceState>) };
  } catch {
    // A corrupted/unparseable persisted blob restarts compliance tracking from scratch rather
    // than crashing this screen.
    return INITIAL_MEAL_COMPLIANCE_STATE;
  }
}

const formatTimer = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const useTicketDetailViewModel = ({ ticketId, onGoNotes, onGoTravel }: UseTicketDetailViewModelArgs) => {
  const { ticketsReader, mediaCapture, ticketAttachmentsStore, keyValueStore } = useDependencies();
  const timer = useTimer();
  const { push } = useNotifications();
  const { strings } = useLanguage();
  const t = strings.ticketDetail;
  const mock = strings.mockData;
  const [ticket, setTicket] = useState<JobTicket | null>(null);
  // Read once per ticket, not per render — loadPersistedMealCompliance is a synchronous MMKV
  // read, and useState below only consults this initial value on the very first render anyway.
  const persistedMealCompliance = useMemo(
    () => loadPersistedMealCompliance(keyValueStore.getString.bind(keyValueStore), ticketId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ticketId],
  );
  const [mealPhase, setMealPhase] = useState<MealPhase>(persistedMealCompliance.mealPhase);
  const [, forceRerender] = useState(0);
  const [nextTicketSite, setNextTicketSite] = useState<string | null>(null);
  const [travelPromptDismissed, setTravelPromptDismissed] = useState(false);
  // Tracks whether the job has actually been started-then-stopped at least once via
  // onToggleJob, as distinct from simply "not currently running" — a freshly loaded ticket is
  // also !jobRunning before any work has happened, and the travel prompt must not appear then.
  // (Elapsed job seconds alone can't be used as this signal: a job started and stopped within
  // the same tick can still read 0 accumulated seconds, since the timer engine's accumulated
  // time is derived from real wall-clock deltas — see timerReducer's elapsedSecondsSince.)
  const [jobHasBeenStopped, setJobHasBeenStopped] = useState(false);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachment | null>(null);
  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState<string | null>(null);
  const [attachmentErrorIsPermission, setAttachmentErrorIsPermission] = useState(false);
  // How many meal breaks have been fully logged on this ticket so far — determines which
  // automatic compliance cascade (first vs. second) is currently being monitored below.
  const [mealBreaksCompletedCount, setMealBreaksCompletedCount] = useState(
    persistedMealCompliance.mealBreaksCompletedCount,
  );
  const [firstMealAlertsFired, setFirstMealAlertsFired] = useState(persistedMealCompliance.firstMealAlertsFired);
  const [secondMealAlertsFired, setSecondMealAlertsFired] = useState(persistedMealCompliance.secondMealAlertsFired);

  // Persists on every change so a crash/kill/restart resumes from exactly where compliance
  // tracking left off — see loadPersistedMealCompliance above for why this is necessary.
  useEffect(() => {
    const value: MealComplianceState = {
      mealPhase,
      mealBreaksCompletedCount,
      firstMealAlertsFired,
      secondMealAlertsFired,
    };
    keyValueStore.setString(mealComplianceStorageKey(ticketId), JSON.stringify(value));
  }, [ticketId, keyValueStore, mealPhase, mealBreaksCompletedCount, firstMealAlertsFired, secondMealAlertsFired]);

  const jobTimerId = `job:${ticketId}`;
  const mealTimerId = `meal:${ticketId}`;

  const load = useCallback(async () => {
    const result = await new GetTicketDetailUseCase(ticketsReader).execute(ticketId);
    if (result.success) setTicket(result.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    new GetTicketAttachmentsUseCase(ticketAttachmentsStore).execute(ticketId).then((result) => {
      if (cancelled) return;
      if (result.success) setAttachments(result.data);
      else setAttachmentErrorMessage(t.attachmentErrorGeneric);
    });
    return () => {
      cancelled = true;
    };
  }, [ticketId, ticketAttachmentsStore, t]);

  useEffect(() => {
    if (!ticket?.nextTicketId) {
      setNextTicketSite(null);
      return;
    }
    let cancelled = false;
    new GetTicketDetailUseCase(ticketsReader).execute(ticket.nextTicketId).then((result) => {
      if (!cancelled && result.success) setNextTicketSite(result.data.site);
    });
    return () => {
      cancelled = true;
    };
  }, [ticket?.nextTicketId, ticketsReader]);

  // Re-render once a second so the visible timers (job/meal) stay live while this screen is
  // mounted — getSeconds/isRunning read from a ref internally and don't trigger re-renders on
  // their own (see TimerProvider.tsx's own documentation of this).
  useEffect(() => {
    const interval = setInterval(() => forceRerender((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // jobTimerRunning reflects the underlying timer engine's own start/pause state (used to decide
  // what onToggleJob should do next). jobPaused/jobRunning are the screen-facing concepts: the
  // job is considered "paused" for the whole duration of the meal-break sub-flow (suggest ->
  // active -> done), not only while the meal timer itself is actively ticking — the job clock is
  // stopped the moment "Pause for meal break" is pressed, before a break is even confirmed. And
  // the job is considered "running" (in the sense of "underway, not stopped") across that same
  // pause window, so the Start/Stop Job button stays in its "Stop Job" (disabled) state instead
  // of flipping back to "Start Job" while a break is in progress.
  const jobTimerRunning = timer.isRunning(jobTimerId);
  const jobSeconds = timer.getSeconds(jobTimerId);
  const jobPaused = mealPhase !== "none";
  const jobRunning = jobTimerRunning || jobPaused;
  const estimatedSeconds = (ticket?.estimatedHours ?? 0) * SECONDS_PER_HOUR;
  const jobOverEstimate = estimatedSeconds > 0 && jobSeconds > estimatedSeconds;

  // The crew member whose meal break is being tracked — the on-job crew member's name, so the
  // escalation copy ("<name> has not taken a meal break") reads as a specific person rather than
  // a generic warning. Falls back to a generic label if no crew member is currently marked onJob.
  const onJobMemberName = ticket?.crew.find((member) => member.onJob)?.name ?? t.mealAlertFallbackMemberName;

  // Automatic, time-based compliance reminders — distinct from the manual "Pause for meal
  // break" flow above. Runs alongside it: once the crew leader engages that flow at all
  // (mealPhase leaves "none"), the automated cascade stops, since the manual flow's own UI is
  // already prompting them. The first cascade (4h-5h) monitors the first meal break; once one
  // has been logged, the second cascade (11h, ahead of the 12th-hour CA penalty) takes over.
  useEffect(() => {
    if (!ticket || mealPhase !== "none") return;
    if (mealBreaksCompletedCount === 0) {
      const dueIndex = getNextDueMealBreakCheckpoint(FIRST_MEAL_CASCADE, jobSeconds, firstMealAlertsFired);
      if (dueIndex === null) return;
      const checkpoint = FIRST_MEAL_CASCADE[dueIndex];
      if (checkpoint.audience === "crew") {
        push({ icon: "◔", title: t.mealReminderTitle, body: t.mealReminderBody });
      } else {
        push({ icon: "▲", title: t.mealEscalationTitle, body: t.mealEscalationBody(onJobMemberName) });
      }
      setFirstMealAlertsFired(dueIndex + 1);
    } else if (mealBreaksCompletedCount === 1) {
      const dueIndex = getNextDueMealBreakCheckpoint(SECOND_MEAL_CASCADE, jobSeconds, secondMealAlertsFired);
      if (dueIndex === null) return;
      push({ icon: "▲", title: t.mealEscalationTitle, body: t.mealEscalationBody(onJobMemberName) });
      setSecondMealAlertsFired(dueIndex + 1);
    }
  }, [
    ticket,
    mealPhase,
    mealBreaksCompletedCount,
    jobSeconds,
    firstMealAlertsFired,
    secondMealAlertsFired,
    push,
    t,
    onJobMemberName,
  ]);

  const onToggleJob = useCallback(() => {
    if (jobTimerRunning) {
      timer.pause(jobTimerId);
      // Stopping (not starting) is what makes the travel prompt eligible to show again for
      // this stop, and marks that the job has genuinely been run at least once.
      setTravelPromptDismissed(false);
      setJobHasBeenStopped(true);
    } else {
      timer.start(jobTimerId);
    }
    // Unlike the other handlers below (which all call setMealPhase and so already trigger a
    // re-render of their own), toggling the job timer touches only the external timer engine's
    // state. The engine's own context value is a stable ref (see TimerProvider) that never
    // changes identity, so nothing else here would force this hook to observe the new
    // isRunning()/getSeconds() values until the next 1s poll tick. Bump immediately so
    // start/stop feels instant rather than delayed by up to a second.
    forceRerender((c) => c + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTimerRunning, jobTimerId]);

  const onToggleJobPause = useCallback(() => {
    if (mealPhase !== "none") return;
    timer.pause(jobTimerId);
    setMealPhase("suggest");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealPhase, jobTimerId]);

  const onStartMeal = useCallback(() => {
    timer.pause(jobTimerId);
    timer.start(mealTimerId);
    setMealPhase("active");
    push({ icon: "◔", title: t.mealBreakStartedTitle, body: t.mealBreakStartedBody });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTimerId, mealTimerId, push, t]);

  const onEndMeal = useCallback(() => {
    if (timer.getSeconds(mealTimerId) < MEAL_MINIMUM_SECONDS) return;
    timer.pause(mealTimerId);
    setMealPhase("done");
    // Advances which automatic compliance cascade (first vs. second) is monitored next — see
    // the effect above.
    setMealBreaksCompletedCount((count) => count + 1);
    push({
      icon: "✓",
      title: t.mealBreakLoggedTitle,
      body: t.mealBreakLoggedBody(formatTimer(timer.getSeconds(mealTimerId))),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealTimerId, push, t]);

  const onContinueJob = useCallback(() => {
    timer.reset(mealTimerId);
    setMealPhase("none");
    timer.start(jobTimerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealTimerId, jobTimerId]);

  // "Active ticket" (the capture entry condition) maps onto this screen's existing jobRunning
  // concept — the job clock has to actually be running, not merely "on this ticket's screen" —
  // so attaching media before Start Job (or after Stop Job) is refused the same way starting a
  // meal break or ending one out of order already is elsewhere in this view model.
  const onCaptureMedia = useCallback(
    async (kind: TicketAttachmentKind) => {
      const result = await new CaptureTicketAttachmentUseCase(
        mediaCapture,
        ticketAttachmentsStore,
        () => Crypto.randomUUID(),
        () => Date.now(),
      ).execute({ ticketId, kind, isTicketActive: jobRunning });

      if (result.success) {
        setAttachments((current) => [...current, result.data]);
        // A later successful capture clears any stale error banner left over from an earlier
        // failed attempt — it would otherwise linger displayed indefinitely.
        setAttachmentErrorMessage(null);
        setAttachmentErrorIsPermission(false);
        return;
      }
      if (result.error.type === "CANCELLED") return;

      const messageByErrorType: Record<Exclude<typeof result.error.type, "CANCELLED">, string> = {
        NO_ACTIVE_TICKET: t.attachmentErrorNoActiveTicket,
        PERMISSION_DENIED: t.attachmentErrorPermissionDenied,
        CAPTURE_FAILED: t.attachmentErrorGeneric,
        SAVE_FAILED: t.attachmentErrorGeneric,
      };
      setAttachmentErrorIsPermission(result.error.type === "PERMISSION_DENIED");
      setAttachmentErrorMessage(messageByErrorType[result.error.type]);
    },
    [ticketId, jobRunning, mediaCapture, ticketAttachmentsStore, t],
  );

  const onCapturePhoto = useCallback(() => onCaptureMedia("photo"), [onCaptureMedia]);
  const onCaptureVideo = useCallback(() => onCaptureMedia("video"), [onCaptureMedia]);
  const onPreviewAttachment = useCallback((attachment: TicketAttachment) => setPreviewAttachment(attachment), []);
  const onClosePreview = useCallback(() => setPreviewAttachment(null), []);
  const onDismissAttachmentError = useCallback(() => setAttachmentErrorMessage(null), []);
  const onOpenSettingsForPermission = useCallback(() => {
    Linking.openSettings();
    setAttachmentErrorMessage(null);
  }, []);

  const mealSeconds = timer.getSeconds(mealTimerId);

  // The prompt is only eligible once the job has actually been stopped (not merely "not
  // currently running", which is also true before the job has ever been started), it hasn't
  // been dismissed for this stop, and there's a next ticket to compare sites against.
  const sameSite = ticket?.site != null && nextTicketSite != null && ticket.site === nextTicketSite;
  const travelPrompt =
    jobHasBeenStopped && !jobRunning && !travelPromptDismissed && ticket?.nextTicketId
      ? sameSite
        ? { title: t.jobCompleteSameSiteTitle, body: t.jobCompleteSameSiteBody, buttonLabel: t.continueNextJobButton }
        : { title: t.jobCompleteTravelTitle, body: t.jobCompleteTravelBody, buttonLabel: t.startTravelButton }
      : null;

  const onDismissTravelPrompt = useCallback(() => setTravelPromptDismissed(true), []);

  const onStartTravelToNext = useCallback(() => {
    if (ticket?.nextTicketId) onGoTravel(ticket.id, ticket.nextTicketId);
  }, [ticket?.id, ticket?.nextTicketId, onGoTravel]);

  // ticket.sub is mock English content (see InMemoryTickets.adapter.ts's own comment) — the
  // real translated text is derived here from the language-neutral site/estimatedHours fields.
  const translatedTicket = ticket
    ? {
        ...ticket,
        sub:
          ticket.site === "yard"
            ? mock.ticketYardEstimate(String(ticket.estimatedHours))
            : mock.ticketJobSiteEstimate(String(ticket.estimatedHours)),
      }
    : null;

  return {
    state: {
      ticket: translatedTicket,
      jobRunning,
      jobPaused,
      jobTimerLabel: jobOverEstimate ? strings.common.jobTimeLabelOverEstimate : strings.common.jobTimeLabel,
      jobTimerValue: formatTimer(jobSeconds),
      jobOverEstimate,
      mealPhase,
      mealTimerValue: formatTimer(mealSeconds),
      mealCanEnd: mealSeconds >= MEAL_MINIMUM_SECONDS,
      mealSuggestVisible: mealPhase === "suggest" && jobSeconds >= MEAL_SUGGEST_AFTER_HOURS * SECONDS_PER_HOUR,
      travelPrompt,
      attachments,
      previewAttachment,
      attachmentErrorMessage,
      attachmentErrorIsPermission,
    },
    handlers: {
      onGoNotes: () => onGoNotes(ticket?.name ?? ""),
      onToggleJob,
      onToggleJobPause,
      onStartMeal,
      onEndMeal,
      onContinueJob,
      onStartTravelToNext,
      onDismissTravelPrompt,
      onCapturePhoto,
      onCaptureVideo,
      onPreviewAttachment,
      onClosePreview,
      onDismissAttachmentError,
      onOpenSettingsForPermission,
    },
  };
};
