import React from "react";
import { router } from "expo-router";
import { ApiIntegrationExampleScreen } from "@modules/apiIntegrationExample/ui/screens/ApiIntegrationExampleScreen";

export default function ApiIntegrationExample() {
  return <ApiIntegrationExampleScreen onGoBack={() => router.back()} />;
}
