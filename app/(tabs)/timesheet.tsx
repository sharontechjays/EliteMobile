import React from "react";
import { router } from "expo-router";
import { TimesheetScreen } from "@modules/timesheet/ui/screens/TimesheetScreen";

export default function Timesheet() {
  return <TimesheetScreen onSubmitted={() => router.navigate("/home")} />;
}
