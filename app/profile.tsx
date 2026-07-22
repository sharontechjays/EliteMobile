import React from "react";
import { router } from "expo-router";
import { ProfileScreen } from "@modules/profile/ui/screens/ProfileScreen";

export default function Profile() {
  return <ProfileScreen onGoHome={() => router.back()} />;
}
