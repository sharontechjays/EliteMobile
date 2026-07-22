import React from "react";
import { router } from "expo-router";
import { RosterScreen } from "@modules/roster/ui/screens/RosterScreen";
import { setAttestationQueue } from "@app/react/attestationHandoff";

export default function Roster() {
  return (
    <RosterScreen
      onGoHome={() => router.navigate("/home")}
      onStartAttestation={(queue) => {
        setAttestationQueue(queue);
        router.push("/attestation");
      }}
    />
  );
}
