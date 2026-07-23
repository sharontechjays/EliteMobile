import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/constants/appConstants";

export type MealBreakAlertAudience = "crew" | "crewAndSupervisor";

export interface MealBreakCheckpoint {
  atSeconds: number;
  audience: MealBreakAlertAudience;
}

export interface MealBreakCascadeConfig {
  startHour: number;
  escalationIntervalMinutes: number;
  maxAlerts: number;
  firstAlertAudience: MealBreakAlertAudience;
}

// Builds the ordered list of time thresholds (in elapsed job seconds) at which a cascade's
// alerts fire. Only the first checkpoint can use a "crew"-only audience — every escalation
// after it goes to crew+supervisor, matching the compliance story's cascade shape.
export function buildMealBreakCascade(config: MealBreakCascadeConfig): MealBreakCheckpoint[] {
  return Array.from({ length: config.maxAlerts }, (_, index) => ({
    atSeconds: config.startHour * SECONDS_PER_HOUR + index * config.escalationIntervalMinutes * SECONDS_PER_MINUTE,
    audience: index === 0 ? config.firstAlertAudience : "crewAndSupervisor",
  }));
}

// Returns the index of the next checkpoint that elapsed time has reached but that hasn't
// fired yet, or null if nothing new is due. `alertsFiredCount` is a monotonic pointer into
// the cascade, so calling this once per tick as elapsedSeconds grows fires each checkpoint
// exactly once, even though the caller re-checks every second.
export function getNextDueMealBreakCheckpoint(
  cascade: MealBreakCheckpoint[],
  elapsedSeconds: number,
  alertsFiredCount: number,
): number | null {
  if (alertsFiredCount >= cascade.length) return null;
  const next = cascade[alertsFiredCount];
  return elapsedSeconds >= next.atSeconds ? alertsFiredCount : null;
}
