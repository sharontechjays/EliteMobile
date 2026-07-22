import React from "react";
import { router } from "expo-router";
import { AttestationScreen } from "@modules/clock/ui/screens/AttestationScreen";
import { getAttestationQueue } from "@app/react/attestationHandoff";

export default function Attestation() {
  return (
    <AttestationScreen
      queue={getAttestationQueue()}
      onGoRoster={() => router.back()}
      onDone={() => router.navigate("/home")}
    />
  );
}
