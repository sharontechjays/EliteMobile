import { Result } from "@/types/Result";
import { NoteDraft } from "../entities/NoteDraft.entity";

export interface NoteSaver {
  save(note: NoteDraft): Promise<Result<void, { type: "SAVE_FAILED" }>>;
}
