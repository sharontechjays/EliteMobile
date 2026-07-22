import React from "react";
import { router } from "expo-router";
import { SignInScreen } from "@modules/auth/ui/screens/SignInScreen";

export default function SignIn() {
  return <SignInScreen onSignedIn={() => router.replace("/(tabs)/home")} />;
}
