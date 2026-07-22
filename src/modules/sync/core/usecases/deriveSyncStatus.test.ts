import { deriveSyncStatus } from "./deriveSyncStatus";
import { SyncQueueItem } from "../entities/SyncQueueItem.entity";

const queued = (id: string): SyncQueueItem => ({
  id,
  time: "1:00",
  label: `item ${id}`,
  status: "queued",
  kind: "note",
});
const rejected = (id: string): SyncQueueItem => ({
  id,
  time: "1:00",
  label: `item ${id}`,
  status: "rejected",
  rejectionReason: "OVERLAP",
  kind: "rejectedOverlap",
});

describe("deriveSyncStatus", () => {
  it("reports synced with zero counts for an empty queue", () => {
    expect(deriveSyncStatus([])).toEqual({ state: "synced", pendingCount: 0, rejectedCount: 0 });
  });

  it("reports pending when there are queued items", () => {
    expect(deriveSyncStatus([queued("1"), queued("2")])).toEqual({
      state: "pending",
      pendingCount: 2,
      rejectedCount: 0,
    });
  });

  it("reports pending when there are only rejected items", () => {
    expect(deriveSyncStatus([rejected("1")])).toEqual({ state: "pending", pendingCount: 0, rejectedCount: 1 });
  });

  it("counts queued and rejected items separately", () => {
    expect(deriveSyncStatus([queued("1"), rejected("2"), queued("3")])).toEqual({
      state: "pending",
      pendingCount: 2,
      rejectedCount: 1,
    });
  });
});
