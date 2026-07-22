import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useTimer } from "@app/react/timer/useTimer";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { useLanguage } from "@app/react/language/useLanguage";
import { GetTicketDetailUseCase } from "../../core/usecases/GetTicketDetail.usecase";
import { JobTicket } from "../../core/entities/JobTicket.entity";

interface UseTravelViewModelArgs {
  fromTicketId: string;
  toTicketId: string;
  onStartJobAfterTravel: (toTicketId: string) => void;
}

const formatTimer = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const useTravelViewModel = ({ fromTicketId, toTicketId, onStartJobAfterTravel }: UseTravelViewModelArgs) => {
  const { ticketsReader } = useDependencies();
  const timer = useTimer();
  const { push } = useNotifications();
  const { strings } = useLanguage();
  const mock = strings.mockData;
  const [fromTicket, setFromTicket] = useState<JobTicket | null>(null);
  const [toTicket, setToTicket] = useState<JobTicket | null>(null);
  const [travelDone, setTravelDone] = useState(false);
  const [, forceRerender] = useState(0);

  const travelTimerId = `travel:${fromTicketId}:${toTicketId}`;

  useEffect(() => {
    new GetTicketDetailUseCase(ticketsReader).execute(fromTicketId).then((r) => r.success && setFromTicket(r.data));
    new GetTicketDetailUseCase(ticketsReader).execute(toTicketId).then((r) => r.success && setToTicket(r.data));
  }, [fromTicketId, toTicketId, ticketsReader]);

  useEffect(() => {
    const interval = setInterval(() => forceRerender((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const travelRunning = timer.isRunning(travelTimerId);
  const travelSeconds = timer.getSeconds(travelTimerId);

  const onToggleTravel = useCallback(() => {
    if (travelRunning) timer.pause(travelTimerId);
    else timer.start(travelTimerId);
    // The timer engine's context value is a stable ref (see TimerProvider) that never changes
    // identity, so toggling it alone wouldn't cause this hook to observe the new
    // isRunning()/getSeconds() values until the next 1s poll tick (same issue documented in
    // useTicketDetail.viewModel's onToggleJob). Bump immediately so start/stop feels instant.
    forceRerender((c) => c + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelRunning, travelTimerId]);

  const onConfirmArrived = useCallback(() => {
    timer.pause(travelTimerId);
    setTravelDone(true);
    push({ icon: "✓", title: strings.travel.travelDoneNotifTitle, body: strings.travel.travelDoneNotifBody(formatTimer(timer.getSeconds(travelTimerId))) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelTimerId, push, strings]);

  const onStartJobAfterTravelHandler = useCallback(() => {
    onStartJobAfterTravel(toTicketId);
  }, [onStartJobAfterTravel, toTicketId]);

  // toTicket.sub is mock English content (see InMemoryTickets.adapter.ts's own comment) — the
  // real translated text is derived here from the language-neutral site/estimatedHours fields.
  const translatedToTicket = toTicket
    ? {
        ...toTicket,
        sub: toTicket.site === "yard" ? mock.ticketYardEstimate(String(toTicket.estimatedHours)) : mock.ticketJobSiteEstimate(String(toTicket.estimatedHours)),
      }
    : null;

  return {
    state: {
      fromTicket,
      toTicket: translatedToTicket,
      travelRunning,
      travelDone,
      travelTimerValue: formatTimer(travelSeconds),
    },
    handlers: {
      onToggleTravel,
      onConfirmArrived,
      onStartJobAfterTravel: onStartJobAfterTravelHandler,
    },
  };
};
