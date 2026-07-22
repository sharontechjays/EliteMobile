import React from "react";
import { router } from "expo-router";
import { TicketsScreen } from "@modules/tickets/ui/screens/TicketsScreen";

export default function Tickets() {
  return (
    <TicketsScreen onOpenTicket={(ticketId) => router.push({ pathname: "/ticket-detail", params: { ticketId } })} />
  );
}
