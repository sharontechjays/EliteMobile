import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { TravelScreen } from "@modules/tickets/ui/screens/TravelScreen";

export default function Travel() {
  const { fromTicketId, toTicketId } = useLocalSearchParams<{ fromTicketId: string; toTicketId: string }>();

  return (
    <TravelScreen
      fromTicketId={fromTicketId}
      toTicketId={toTicketId}
      onGoBack={() => router.back()}
      onStartJobAfterTravel={(toTicketId) =>
        router.replace({ pathname: "/ticket-detail", params: { ticketId: toTicketId } })
      }
    />
  );
}
