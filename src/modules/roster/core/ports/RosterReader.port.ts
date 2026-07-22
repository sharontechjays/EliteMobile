import { Result } from "@/types/Result";
import { RosterWorker } from "../entities/RosterWorker.entity";
import { DirectoryWorker } from "../entities/DirectoryWorker.entity";

export interface RosterReader {
  read(): Promise<Result<RosterWorker[], { type: "READ_FAILED" }>>;
  readDirectory(): Promise<Result<DirectoryWorker[], { type: "READ_FAILED" }>>;
}
