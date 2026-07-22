import { Result, ok } from "@/types/Result";
import { NoteDraft } from "../../core/entities/NoteDraft.entity";
import { NoteSaver } from "../../core/ports/NoteSaver.port";

export class InMemoryNoteSaverAdapter implements NoteSaver {
  async save(_note: NoteDraft): Promise<Result<void, { type: "SAVE_FAILED" }>> {
    return ok(undefined);
  }
}
