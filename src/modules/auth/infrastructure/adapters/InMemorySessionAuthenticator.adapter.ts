import { Result, ok, fail } from "@/types/Result";
import { CrewLeaderSession } from "../../core/entities/CrewLeaderSession.entity";
import { SessionAuthenticator } from "../../core/ports/SessionAuthenticator.port";

// Stand-in for a real auth backend: exactly one employee code is "valid" and always resolves to
// the same fixed crew leader — there's no real credential store yet (see
// elite-mobile-clean-architecture: every adapter today is an in-memory mock).
const DEMO_CODE = "12345";
const DEMO_SESSION_BASE = { crewLeaderName: "H. Jackson", branchName: "Chesterfield" };

export class InMemorySessionAuthenticatorAdapter implements SessionAuthenticator {
  async signIn(employeeCode: string): Promise<Result<CrewLeaderSession, { type: "INVALID_CODE" }>> {
    if (employeeCode === DEMO_CODE) return ok({ ...DEMO_SESSION_BASE, employeeCode });
    return fail({ type: "INVALID_CODE" });
  }
}
