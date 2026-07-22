import { Result } from "@/types/Result";
import { NoteDraft } from "../entities/NoteDraft.entity";
import { NoteSaver } from "../ports/NoteSaver.port";

export class SaveNoteUseCase {
  constructor(private readonly saver: NoteSaver) {}

  async execute(note: NoteDraft): Promise<Result<void, { type: "SAVE_FAILED" }>> {
    return this.saver.save(note);
  }
}
