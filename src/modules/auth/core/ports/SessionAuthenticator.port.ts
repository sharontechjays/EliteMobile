import { Result } from "@/types/Result";
import { CrewLeaderSession } from "../entities/CrewLeaderSession.entity";

export interface SessionAuthenticator {
  signIn(employeeCode: string): Promise<Result<CrewLeaderSession, { type: "INVALID_CODE" }>>;
}
