import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { NotesScreen } from "@modules/notes/ui/screens/NotesScreen";

export default function Notes() {
  const { ticketName } = useLocalSearchParams<{ ticketName?: string }>();
  return <NotesScreen ticketName={ticketName ?? ""} onGoBack={() => router.back()} />;
}
