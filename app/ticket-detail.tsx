import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { TicketDetailScreen } from "@modules/tickets/ui/screens/TicketDetailScreen";

export default function TicketDetail() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();

  return (
    <TicketDetailScreen
      ticketId={ticketId}
      onGoTickets={() => router.back()}
      onGoNotes={(ticketName) => router.push({ pathname: "/notes", params: { ticketName } })}
      onGoTravel={(fromTicketId, toTicketId) =>
        router.push({ pathname: "/travel", params: { fromTicketId, toTicketId } })
      }
    />
  );
}
