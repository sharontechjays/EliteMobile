import React from "react";
import { router } from "expo-router";
import { DeviceRegistrationScreen } from "@modules/deviceRegistration/ui/screens/DeviceRegistrationScreen";

export default function DeviceRegistration() {
  return <DeviceRegistrationScreen onContinue={() => router.replace("/sign-in")} />;
}
