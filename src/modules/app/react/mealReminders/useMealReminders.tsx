import { useContext } from "react";
import { MealReminderContext } from "./MealReminderProvider";

export const useMealReminders = () => {
  const ctx = useContext(MealReminderContext);
  if (!ctx) throw new Error("useMealReminders must be used within a MealReminderProvider");
  return ctx;
};
