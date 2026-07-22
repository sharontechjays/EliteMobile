import { Result } from "@/types/Result";
import { ProfileSummary } from "../entities/ProfileSummary.entity";

export interface ProfileReader {
  read(): Promise<Result<ProfileSummary, { type: "READ_FAILED" }>>;
}
