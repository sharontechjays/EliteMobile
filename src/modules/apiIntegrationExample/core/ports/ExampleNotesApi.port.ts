import { Result } from "@/types/Result";
import { ExampleNote, NewExampleNote } from "../entities/ExampleNote.entity";

export interface ExampleNotesApi {
  list(): Promise<Result<ExampleNote[], { type: "READ_FAILED" }>>;
  create(note: NewExampleNote): Promise<Result<ExampleNote, { type: "WRITE_FAILED" }>>;
}
