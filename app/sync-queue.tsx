import React from "react";
import { router } from "expo-router";
import { SyncQueueScreen } from "@modules/sync/ui/screens/SyncQueueScreen";

export default function SyncQueue() {
  return <SyncQueueScreen onGoBack={() => router.back()} />;
}
