import { buildMealBreakCascade, getNextDueMealBreakCheckpoint } from "./deriveMealBreakAlert.usecase";
import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/constants/appConstants";

describe("buildMealBreakCascade", () => {
  it("builds one checkpoint per hour+interval step, first alert using the given audience", () => {
    const cascade = buildMealBreakCascade({
      startHour: 4,
      escalationIntervalMinutes: 15,
      maxAlerts: 4,
      firstAlertAudience: "crew",
    });

    expect(cascade).toEqual([
      { atSeconds: 4 * SECONDS_PER_HOUR, audience: "crew" },
      { atSeconds: 4 * SECONDS_PER_HOUR + 15 * SECONDS_PER_MINUTE, audience: "crewAndSupervisor" },
      { atSeconds: 4 * SECONDS_PER_HOUR + 30 * SECONDS_PER_MINUTE, audience: "crewAndSupervisor" },
      { atSeconds: 4 * SECONDS_PER_HOUR + 45 * SECONDS_PER_MINUTE, audience: "crewAndSupervisor" },
    ]);
  });

  it("uses crewAndSupervisor for every checkpoint when that's the first-alert audience too", () => {
    const cascade = buildMealBreakCascade({
      startHour: 11,
      escalationIntervalMinutes: 15,
      maxAlerts: 4,
      firstAlertAudience: "crewAndSupervisor",
    });

    expect(cascade.every((checkpoint) => checkpoint.audience === "crewAndSupervisor")).toBe(true);
  });
});

describe("getNextDueMealBreakCheckpoint", () => {
  const cascade = buildMealBreakCascade({
    startHour: 4,
    escalationIntervalMinutes: 15,
    maxAlerts: 4,
    firstAlertAudience: "crew",
  });

  it("returns null before the first checkpoint's threshold is reached", () => {
    expect(getNextDueMealBreakCheckpoint(cascade, 3 * SECONDS_PER_HOUR, 0)).toBeNull();
  });

  it("returns the first checkpoint's index once its threshold is reached", () => {
    expect(getNextDueMealBreakCheckpoint(cascade, 4 * SECONDS_PER_HOUR, 0)).toBe(0);
  });

  it("does not re-fire a checkpoint already counted in alertsFiredCount", () => {
    expect(getNextDueMealBreakCheckpoint(cascade, 4 * SECONDS_PER_HOUR, 1)).toBeNull();
  });

  it("fires the next checkpoint once elapsed time reaches it", () => {
    expect(getNextDueMealBreakCheckpoint(cascade, 4 * SECONDS_PER_HOUR + 15 * SECONDS_PER_MINUTE, 1)).toBe(1);
  });

  it("returns null once every checkpoint in the cascade has fired", () => {
    expect(getNextDueMealBreakCheckpoint(cascade, 10 * SECONDS_PER_HOUR, 4)).toBeNull();
  });

  it("skips ahead correctly if a large time jump crosses more than one threshold at once", () => {
    // Still only ever returns the *next* unfired checkpoint, one at a time — the caller is
    // expected to re-invoke after firing it to pick up any further checkpoints already due.
    expect(getNextDueMealBreakCheckpoint(cascade, 5 * SECONDS_PER_HOUR, 0)).toBe(0);
  });
});
