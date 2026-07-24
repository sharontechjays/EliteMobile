import { WorkerId } from "@/types/ids";
import { InMemoryCrewRosterAdapter } from "./InMemoryCrewRoster.adapter";

describe("InMemoryCrewRosterAdapter — applyPunch", () => {
  it("updates a worker's statusKind to job after an IN punch, reflected on the next read()", async () => {
    const adapter = new InMemoryCrewRosterAdapter();

    const before = await adapter.read();
    expect(before.success && before.data.find((w) => w.id === "luis-t")?.statusKind).toBe("idle");

    const result = await adapter.applyPunch("luis-t" as WorkerId, "IN");
    expect(result.success).toBe(true);

    const after = await adapter.read();
    expect(after.success && after.data.find((w) => w.id === "luis-t")?.statusKind).toBe("job");
  });

  it("updates a worker's statusKind back to idle after an OUT punch", async () => {
    const adapter = new InMemoryCrewRosterAdapter();

    await adapter.applyPunch("roy-brown" as WorkerId, "OUT");
    const after = await adapter.read();

    expect(after.success && after.data.find((w) => w.id === "roy-brown")?.statusKind).toBe("idle");
  });

  it("fails when the workerId doesn't exist in the roster", async () => {
    const adapter = new InMemoryCrewRosterAdapter();

    const result = await adapter.applyPunch("nobody" as WorkerId, "IN");

    expect(result).toEqual({ success: false, error: { type: "UPDATE_FAILED" } });
  });
});
