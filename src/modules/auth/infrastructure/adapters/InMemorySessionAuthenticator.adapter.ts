import { Result, ok, fail } from "@/types/Result";
import { CrewLeaderSession } from "../../core/entities/CrewLeaderSession.entity";
import { SessionAuthenticator } from "../../core/ports/SessionAuthenticator.port";

const DEMO_CODE = "12345";
const DEMO_SESSION_BASE = { crewLeaderName: "H. Jackson", branchName: "Chesterfield" };

export class InMemorySessionAuthenticatorAdapter implements SessionAuthenticator {
  async signIn(employeeCode: string): Promise<Result<CrewLeaderSession, { type: "INVALID_CODE" }>> {
    if (employeeCode === DEMO_CODE) return ok({ ...DEMO_SESSION_BASE, employeeCode });
    return fail({ type: "INVALID_CODE" });
  }
}
