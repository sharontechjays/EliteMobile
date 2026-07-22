import { Result, ok, fail } from "@/types/Result";
import { ExampleNotesApi } from "../../core/ports/ExampleNotesApi.port";
import { ExampleNote, NewExampleNote } from "../../core/entities/ExampleNote.entity";

// Reference REST adapter — real `fetch` calls against a public test API (jsonplaceholder), used
// only to prove out the pattern for a real backend integration: same Result<T,E> return shape as
// every InMemory* adapter in this app, same "implements a port" contract, so a real production
// adapter (e.g. HttpRosterApi.adapter.ts) is a drop-in swap for whichever mock it replaces —
// nothing above the adapter (usecases, viewModels, screens) needs to change.
const BASE_URL = "https://jsonplaceholder.typicode.com";

export class HttpExampleNotesAdapter implements ExampleNotesApi {
  async list(): Promise<Result<ExampleNote[], { type: "READ_FAILED" }>> {
    try {
      const response = await fetch(`${BASE_URL}/posts?_limit=10`);
      if (!response.ok) return fail({ type: "READ_FAILED" });
      const data: ExampleNote[] = await response.json();
      return ok(data);
    } catch {
      return fail({ type: "READ_FAILED" });
    }
  }

  async create(note: NewExampleNote): Promise<Result<ExampleNote, { type: "WRITE_FAILED" }>> {
    try {
      const response = await fetch(`${BASE_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
      if (!response.ok) return fail({ type: "WRITE_FAILED" });
      const data: ExampleNote = await response.json();
      return ok(data);
    } catch {
      return fail({ type: "WRITE_FAILED" });
    }
  }
}
