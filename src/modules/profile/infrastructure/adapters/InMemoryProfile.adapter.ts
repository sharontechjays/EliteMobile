import { Result, ok } from "@/types/Result";
import { ProfileSummary } from "../../core/entities/ProfileSummary.entity";
import { ProfileReader } from "../../core/ports/ProfileReader.port";
import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";

const SESSION_EMPLOYEE_CODE_KEY = "session.employeeCode";

// Stays language-neutral by design (see InMemoryHomeSummary.adapter.ts's own comment for the
// full rationale) — `language` and the `notifications[].title/body` below are mock English
// content never actually displayed; useProfile.viewModel.tsx re-derives the real, translated
// language name and notification text (keyed by each notification's fixed `id`).
const MOCK_PROFILE: ProfileSummary = {
  crewLeaderName: "H. Jackson",
  employeeCode: "•••45",
  device: "TABLET-04",
  branch: "Chesterfield",
  language: "English",
  lastSyncLabel: "6:58 AM",
  notifications: [
    { id: "1", title: "Meal break reminder", body: "4 hours worked — remind the crew to take lunch." },
    { id: "2", title: "Second jobsite", body: "Arrived at Cornerstone Mall — confirm clock-in." },
  ],
};

export class InMemoryProfileAdapter implements ProfileReader {
  constructor(private readonly keyValueStore: KeyValueStore) {}

  async read(): Promise<Result<ProfileSummary, { type: "READ_FAILED" }>> {
    const realCode = this.keyValueStore.getString(SESSION_EMPLOYEE_CODE_KEY);
    return ok(realCode ? { ...MOCK_PROFILE, employeeCode: realCode } : MOCK_PROFILE);
  }
}
