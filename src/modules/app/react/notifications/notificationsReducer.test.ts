import { notificationsReducer, initialNotificationsState, MAX_NOTIF_LOG, NotifLogEntry } from "./notificationsReducer";

const entry = (id: string): NotifLogEntry => ({ id, icon: "✓", title: `Title ${id}`, body: `Body ${id}`, createdAt: 0 });

describe("notificationsReducer", () => {
  it("pushes a new entry to the front of the log", () => {
    const state = notificationsReducer(initialNotificationsState, { type: "PUSH", entry: entry("1") });
    expect(state.log).toEqual([entry("1")]);
  });

  it("newest entries stay at the front", () => {
    let state = notificationsReducer(initialNotificationsState, { type: "PUSH", entry: entry("1") });
    state = notificationsReducer(state, { type: "PUSH", entry: entry("2") });
    expect(state.log.map((e) => e.id)).toEqual(["2", "1"]);
  });

  it(`caps the log at ${MAX_NOTIF_LOG} entries, dropping the oldest`, () => {
    let state = initialNotificationsState;
    for (let i = 1; i <= MAX_NOTIF_LOG + 2; i++) {
      state = notificationsReducer(state, { type: "PUSH", entry: entry(String(i)) });
    }
    expect(state.log).toHaveLength(MAX_NOTIF_LOG);
    expect(state.log[0].id).toBe(String(MAX_NOTIF_LOG + 2));
    expect(state.log[state.log.length - 1].id).toBe("3");
  });
});
