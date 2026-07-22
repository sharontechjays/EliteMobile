import React from "react";
import { router } from "expo-router";
import { HomeScreen } from "@modules/home/ui/screens/HomeScreen";

export default function Home() {
  return (
    <HomeScreen
      onOpenNextJob={(ticketId) => router.push({ pathname: "/ticket-detail", params: { ticketId } })}
      onOpenProfile={() => router.push("/profile")}
      onGoRoster={() => router.navigate("/roster")}
      onGoTravel={(fromTicketId, toTicketId) =>
        router.push({ pathname: "/travel", params: { fromTicketId, toTicketId } })
      }
    />
  );
}
