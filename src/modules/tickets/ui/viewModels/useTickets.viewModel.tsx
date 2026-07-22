import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { colors } from "@/ui/theme/colors";
import { GetTodaysTicketsUseCase } from "../../core/usecases/GetTodaysTickets.usecase";
import { JobTicket } from "../../core/entities/JobTicket.entity";

const STATUS_KIND_COLOR: Record<JobTicket["statusKind"], string> = {
  job: colors.job,
  travel: colors.travel,
  idle: colors.idle,
  off: colors.off,
};

interface UseTicketsViewModelArgs {
  onOpenTicket: (ticketId: string) => void;
}

export const useTicketsViewModel = ({ onOpenTicket }: UseTicketsViewModelArgs) => {
  const { ticketsReader } = useDependencies();
  const { strings } = useLanguage();
  const mock = strings.mockData;
  const [tickets, setTickets] = useState<JobTicket[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await new GetTodaysTicketsUseCase(ticketsReader).execute();
    if (result.success) setTickets(result.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ticket.sub/statusLabel are mock English content (see InMemoryTickets.adapter.ts's own
  // comment) — the real translated text is derived here from the language-neutral site/
  // statusKind/estimatedHours fields the adapter is meant to be read through.
  const rows = tickets.map((ticket) => ({
    id: ticket.id,
    name: ticket.name,
    tag: ticket.tag,
    sub:
      ticket.site === "yard"
        ? mock.ticketYardEstimate(String(ticket.estimatedHours))
        : mock.ticketJobSiteEstimate(String(ticket.estimatedHours)),
    statusLabel: ticket.statusKind === "job" ? mock.ticketStatusInProgress : mock.ticketStatusNotStarted,
    dotColor: STATUS_KIND_COLOR[ticket.statusKind],
    onPress: () => onOpenTicket(ticket.id),
  }));

  return {
    state: { rows, refreshing },
    handlers: { onRefresh },
  };
};
