import { GetDirectoryUseCase } from "./GetDirectory.usecase";
import { RosterReader } from "../ports/RosterReader.port";
import { ok } from "@/types/Result";
import { DirectoryWorker } from "../entities/DirectoryWorker.entity";

const DIRECTORY: DirectoryWorker[] = [{ id: "maria-g", name: "Maria Gonzalez", assignedTo: null }];

describe("GetDirectoryUseCase", () => {
  it("returns the directory list", async () => {
    const reader: RosterReader = {
      read: async () => ok([]),
      readDirectory: async () => ok(DIRECTORY),
    };
    const result = await new GetDirectoryUseCase(reader).execute();
    expect(result).toEqual(ok(DIRECTORY));
  });
});
