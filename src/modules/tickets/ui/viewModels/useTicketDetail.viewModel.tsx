import { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";
import * as Crypto from "expo-crypto";
import { useDependencies } from "@app/react/useDependencies";
import { useTimer } from "@app/react/timer/useTimer";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { useLanguage } from "@app/react/language/useLanguage";
import { GetTicketDetailUseCase } from "../../core/usecases/GetTicketDetail.usecase";
import { GetTicketAttachmentsUseCase } from "../../core/usecases/GetTicketAttachments.usecase";
import { CaptureTicketAttachmentUseCase } from "../../core/usecases/CaptureTicketAttachment.usecase";
import { JobTicket } from "../../core/entities/JobTicket.entity";
import { TicketAttachment, TicketAttachmentKind } from "../../core/entities/TicketAttachment.entity";

const MEAL_MINIMUM_MINUTES = 30;
const MEAL_MINIMUM_SECONDS = MEAL_MINIMUM_MINUTES * 60;
const MEAL_SUGGEST_AFTER_HOURS = 4;
const SECONDS_PER_HOUR = 3600;

interface UseTicketDetailViewModelArgs {
  ticketId: string;
  onGoNotes: (ticketName: string) => void;
  onGoTravel: (fromTicketId: string, toTicketId: string) => void;
}

type MealPhase = "none" | "suggest" | "active" | "done";

const formatTimer = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const useTicketDetailViewModel = ({ ticketId, onGoNotes, onGoTravel }: UseTicketDetailViewModelArgs) => {
  const { ticketsReader, mediaCapture, ticketAttachmentsStore } = useDependencies();
  const timer = useTimer();
  const { push } = useNotifications();
  const { strings } = useLanguage();
  const t = strings.ticketDetail;
  const mock = strings.mockData;
  const [ticket, setTicket] = useState<JobTicket | null>(null);
  const [mealPhase, setMealPhase] = useState<MealPhase>("none");
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
      if (!cancelled && result.success) setAttachments(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [ticketId, ticketAttachmentsStore]);

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
