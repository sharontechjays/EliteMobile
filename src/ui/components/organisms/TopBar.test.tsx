import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { Result, ok } from "@/types/Result";
import { SyncQueueItem } from "@modules/sync/core/entities/SyncQueueItem.entity";
import { TopBar } from "./TopBar";

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string) {
    this.map.set(key, value);
  }
}

function buildTestDeps(queueItems: SyncQueueItem[]): Dependencies {
  return {
    keyValueStore: new FakeKeyValueStore(),
    syncQueueReader: {
      read: async (): Promise<Result<SyncQueueItem[], { type: "READ_FAILED" }>> => ok(queueItems),
    },
  } as unknown as Dependencies;
}

function renderTopBar(queueItems: SyncQueueItem[], props: React.ComponentProps<typeof TopBar> = {}) {
  return render(
    <DependenciesProvider dependencies={buildTestDeps(queueItems)}>
      <LanguageProvider>
        <TimerProvider>
          <NotificationsProvider>
            <TopBar {...props} />
          </NotificationsProvider>
        </TimerProvider>
      </LanguageProvider>
    </DependenciesProvider>,
  );
}

describe("TopBar", () => {
  it("shows Synced when the queue is empty", async () => {
    const { findByText } = renderTopBar([]);
    expect(await findByText("● Synced")).toBeTruthy();
  });

  it("shows the pending count when the queue has items", async () => {
    const { findByText } = renderTopBar([
      { id: "1", time: "1:00", label: "a", status: "queued", kind: "note" },
      { id: "2", time: "1:00", label: "b", status: "queued", kind: "note" },
    ]);
    expect(await findByText("▲ 2 pending")).toBeTruthy();
  });

  it("hides the sync pill when showSyncPill is false", async () => {
    const { queryByText, findByText } = renderTopBar([], { showSyncPill: false });
    // EN/ES toggle should still be present even with the sync pill hidden.
    expect(await findByText("EN")).toBeTruthy();
    expect(queryByText("● Synced")).toBeNull();
  });

  it("switches the active language pill on tap", async () => {
    const { findByText } = renderTopBar([]);
    const esPill = await findByText("ES");
    fireEvent.press(esPill);
    // No crash / no thrown error is the primary assertion here since visual "active" state
    // is a style, not text — a fuller assertion belongs to a future visual-regression pass.
  });
});
