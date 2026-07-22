import React from "react";
import { router } from "expo-router";
import { SplashScreen } from "@modules/splash/ui/screens/SplashScreen";

export default function Index() {
  return (
    <SplashScreen
      onContinue={(alreadyApproved) => router.replace(alreadyApproved ? "/sign-in" : "/device-registration")}
    />
  );
}
