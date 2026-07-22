import { Result } from "@/types/Result";
import { JobTicket } from "../entities/JobTicket.entity";

export interface TicketsReader {
  read(): Promise<Result<JobTicket[], { type: "READ_FAILED" }>>;
  readOne(id: string): Promise<Result<JobTicket, { type: "NOT_FOUND" } | { type: "READ_FAILED" }>>;
}
