import { Result } from "@/types/Result";
import { CrewLeaderSession } from "../entities/CrewLeaderSession.entity";
import { SessionAuthenticator } from "../ports/SessionAuthenticator.port";

export class SignInUseCase {
  constructor(private readonly authenticator: SessionAuthenticator) {}

  async execute(employeeCode: string): Promise<Result<CrewLeaderSession, { type: "INVALID_CODE" }>> {
    return this.authenticator.signIn(employeeCode);
  }
}
