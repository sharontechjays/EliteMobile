# Phase 3 — Missing Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two missing core workflows the prototype-fidelity audit found: Timesheet's crew acknowledgement/dispute flow (currently the screen only submits the logged-in user's own hours, with no crew review step at all) and Roster's missing "add worker from directory" flow plus its incorrect footer buttons (a "Hand off/Sign out" action currently occupies a slot that should be "clock selected workers").

**Architecture:** Clean-architecture module pattern, matching Phases 1-2. Reuse Phase 1's `useNotifications` for toasts on ack/dispute/incomplete-submit and on directory-add. No new state-management library.

**Tech Stack:** React Native 0.81 / Expo SDK 54 / expo-router 6 / TypeScript 5.9 / jest-expo.

## Global Constraints

- Do NOT modify `src/ui/components/atoms/GlassSurface.tsx` or `app/(tabs)/_layout.tsx`.
- No magic numbers.
- This project has NO git repository — skip "git add"/"git commit" steps.
- Match existing patterns: `GlassSurface`, `PillButton`/`BackButton`, `colors`/`typography`, `Pressable` + `expo-haptics`, `Result<T,E>` usecases.
- New screen copy should be localized through `useLanguage()` where practical, per standing project guidance — but don't block correctness-focused delivery on a full strings table if that becomes a large separate effort.

---

## Task 1: Timesheet crew acknowledgement/dispute workflow

**Files:**
- Modify: `src/modules/timesheet/core/entities/TimesheetEntry.entity.ts`
- Modify: `src/modules/timesheet/core/usecases/GetDailyTimesheet.usecase.ts`
- Modify: `src/modules/timesheet/infrastructure/adapters/InMemoryTimesheet.adapter.ts`
- Modify: `src/modules/timesheet/ui/viewModels/useTimesheet.viewModel.tsx`
- Create: `src/modules/timesheet/ui/viewModels/useTimesheet.viewModel.test.tsx`
- Modify: `src/modules/timesheet/ui/screens/TimesheetScreen.tsx`

**Interfaces:**
- Consumes: `useNotifications().push(...)` (Phase 1).
- Produces: `DailyTimesheet` becomes `{ crew: CrewMemberTimesheet[] }` where
  `CrewMemberTimesheet = { id: string; name: string; entries: TimesheetEntry[]; totalHoursLabel: string }`.
  `TimesheetEntry.statusKind` gains a `"neutral"` value (maps to `colors.faint`) for clock-in/out
  markers. `useTimesheetViewModel`'s state gains `{ workerName, progressLabel, pending, allDone,
  reason }`; handlers gain `{ onAck, onChangeReason, onDispute }`. This is a breaking change to
  the module's data shape — no other module depends on `DailyTimesheet`, confirmed by grep before
  starting.

**Prototype reference:** per the decoded prototype's actual JS logic (not assumption): the
acknowledge toggle (`onTsAck`) advances immediately and unconditionally acknowledges the CURRENT
crew member, while the dispute reason textarea is **always visible** alongside it (not
conditionally revealed by the toggle) — either action advances to the next crew member. `tsIdx`
tracks progress through `CREW`; `tsResponses` records `'ack'` or `'dispute: <reason>'` per worker.
Submitting early (before all crew have responded) shows an "Acknowledgements incomplete" toast
rather than blocking the tap outright.

- [ ] **Step 1: Extend the entity, usecase, and mock adapter**

Modify `src/modules/timesheet/core/entities/TimesheetEntry.entity.ts`:
```typescript
export interface TimesheetEntry {
  time: string;
  label: string;
  statusKind: "job" | "travel" | "idle" | "off" | "neutral";
}

export interface CrewMemberTimesheet {
  id: string;
  name: string;
  entries: TimesheetEntry[];
  totalHoursLabel: string;
}

export interface DailyTimesheet {
  crew: CrewMemberTimesheet[];
}
```

Modify `src/modules/timesheet/infrastructure/adapters/InMemoryTimesheet.adapter.ts` — replace the
single-worker mock with a small crew, using names consistent with the Roster/Attestation mock data
established in Phase 2 (`Roy Brown`, `Brent M.`), and fix the Clock-in/Clock-out rows to use the
new `"neutral"` kind instead of `"job"`/`"off"`:
```typescript
import { Result, ok } from "@/types/Result";
import { DailyTimesheet } from "../../core/entities/TimesheetEntry.entity";
import { TimesheetReader } from "../../core/ports/TimesheetReader.port";

const MOCK_TIMESHEET: DailyTimesheet = {
  crew: [
    {
      id: "roy-brown",
      name: "Roy Brown",
      totalHoursLabel: "8.5h",
      entries: [
        { time: "7:02", label: "Clock-in", statusKind: "neutral" },
        { time: "7:02", label: "Chesterfield Remodel", statusKind: "job" },
        { time: "11:00", label: "Lunch", statusKind: "idle" },
        { time: "11:30", label: "Chesterfield Remodel", statusKind: "job" },
        { time: "3:15", label: "Travel", statusKind: "travel" },
        { time: "3:45", label: "Cornerstone Mall", statusKind: "job" },
        { time: "4:30", label: "Clock-out", statusKind: "neutral" },
      ],
    },
    {
      id: "brent-m",
      name: "Brent M.",
      totalHoursLabel: "7.0h",
      entries: [
        { time: "7:05", label: "Clock-in", statusKind: "neutral" },
        { time: "7:05", label: "Chesterfield Remodel", statusKind: "job" },
        { time: "11:00", label: "Lunch", statusKind: "idle" },
        { time: "11:30", label: "Chesterfield Remodel", statusKind: "job" },
        { time: "2:05", label: "Clock-out", statusKind: "neutral" },
      ],
    },
  ],
};

export class InMemoryTimesheetAdapter implements TimesheetReader {
  async read(): Promise<Result<DailyTimesheet, { type: "READ_FAILED" }>> {
    return ok(MOCK_TIMESHEET);
  }
}
```

`GetDailyTimesheetUseCase` itself doesn't need code changes (still a 1:1 pass-through to
`reader.read()`) — its return type just now carries the new shape via the entity change.

- [ ] **Step 2: Write the failing viewModel test**

Create `src/modules/timesheet/ui/viewModels/useTimesheet.viewModel.test.tsx`. First read
`src/modules/timesheet/core/ports/TimesheetReader.port.ts` to confirm the exact port shape, then:

```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { DailyTimesheet } from "../../core/entities/TimesheetEntry.entity";
import { useTimesheetViewModel } from "./useTimesheet.viewModel";

const TIMESHEET: DailyTimesheet = {
  crew: [
    { id: "roy-brown", name: "Roy Brown", totalHoursLabel: "8.5h", entries: [{ time: "7:02", label: "Clock-in", statusKind: "neutral" }] },
    { id: "brent-m", name: "Brent M.", totalHoursLabel: "7.0h", entries: [{ time: "7:05", label: "Clock-in", statusKind: "neutral" }] },
  ],
};

function buildTestDeps(): Dependencies {
  return { timesheetReader: { read: async () => ok(TIMESHEET) } } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DependenciesProvider dependencies={buildTestDeps()}>
      <NotificationsProvider>{children}</NotificationsProvider>
    </DependenciesProvider>
  );
}

describe("useTimesheetViewModel — crew acknowledgement/dispute", () => {
  it("starts on the first crew member, pending", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});
    expect(result.current.state.workerName).toBe("Roy Brown");
    expect(result.current.state.progressLabel).toBe("0 of 2 done");
    expect(result.current.state.pending).toBe(true);
    expect(result.current.state.allDone).toBe(false);
  });

  it("onAck advances to the next crew member and clears the reason", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onChangeReason("typing something first"));
    act(() => result.current.handlers.onAck());

    expect(result.current.state.workerName).toBe("Brent M.");
    expect(result.current.state.progressLabel).toBe("1 of 2 done");
    expect(result.current.state.reason).toBe("");
  });

  it("onDispute is a no-op with an empty reason", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onDispute());
    expect(result.current.state.workerName).toBe("Roy Brown");
  });

  it("onDispute with a reason advances to the next crew member", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onChangeReason("Missing travel time"));
    act(() => result.current.handlers.onDispute());

    expect(result.current.state.workerName).toBe("Brent M.");
  });

  it("allDone becomes true once every crew member has responded", async () => {
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onAck());
    act(() => result.current.handlers.onAck());

    expect(result.current.state.allDone).toBe(true);
    expect(result.current.state.pending).toBe(false);
  });

  it("onSubmit does not call onSubmitted while acknowledgements are incomplete", async () => {
    const onSubmitted = jest.fn();
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted }), { wrapper });
    await act(async () => {});

    await act(async () => result.current.handlers.onSubmit());
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("onSubmit calls onSubmitted once all crew have responded", async () => {
    const onSubmitted = jest.fn();
    const { result } = renderHook(() => useTimesheetViewModel({ onSubmitted }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onAck());
    act(() => result.current.handlers.onAck());
    await act(async () => result.current.handlers.onSubmit());

    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2b: Run test to verify it fails**

Run: `npx jest src/modules/timesheet/ui/viewModels/useTimesheet.viewModel.test.tsx`
Expected: FAIL — current viewModel has no `onAck`/`onDispute`/`workerName`/etc. in this shape.

- [ ] **Step 3: Rewrite `useTimesheet.viewModel.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { colors } from "@/ui/theme/colors";
import { GetDailyTimesheetUseCase } from "../../core/usecases/GetDailyTimesheet.usecase";
import { CrewMemberTimesheet, DailyTimesheet, TimesheetEntry } from "../../core/entities/TimesheetEntry.entity";

const STATUS_KIND_COLOR: Record<TimesheetEntry["statusKind"], string> = {
  job: colors.job,
  travel: colors.travel,
  idle: colors.idle,
  off: colors.off,
  neutral: colors.faint,
};

interface UseTimesheetViewModelArgs {
  onSubmitted: () => void;
}

export const useTimesheetViewModel = ({ onSubmitted }: UseTimesheetViewModelArgs) => {
  const { timesheetReader } = useDependencies();
  const { push } = useNotifications();
  const [timesheet, setTimesheet] = useState<DailyTimesheet | null>(null);
  const [idx, setIdx] = useState(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await new GetDailyTimesheetUseCase(timesheetReader).execute();
    if (result.success) setTimesheet(result.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const crew = timesheet?.crew ?? [];
  const pending = idx < crew.length;
  const allDone = !pending;
  const current: CrewMemberTimesheet | null = crew[Math.min(idx, crew.length - 1)] ?? null;

  const rows = (current?.entries ?? []).map((entry, index) => ({
    id: `${entry.time}-${index}`,
    time: entry.time,
    label: entry.label,
    dotColor: STATUS_KIND_COLOR[entry.statusKind],
  }));

  const advance = (worker: CrewMemberTimesheet, nextIdx: number) => {
    setIdx(nextIdx);
    setReason("");
    const nextWorker = crew[nextIdx];
    push({
      icon: "✓",
      title: `${worker.name} acknowledged`,
      body: nextWorker ? `Next: ${nextWorker.name}` : "All crew responded — ready to submit",
    });
  };

  const onAck = useCallback(() => {
    if (!pending || !current) return;
    advance(current, idx + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, current, idx, crew]);

  const onDispute = useCallback(() => {
    if (!pending || !current || !reason.trim()) return;
    setIdx(idx + 1);
    setReason("");
    push({ icon: "!", title: "Dispute recorded", body: `${current.name}: ${reason.trim()}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, current, idx, reason]);

  const onSubmit = async () => {
    if (submitting) return;
    if (pending) {
      push({
        icon: "!",
        title: "Acknowledgements incomplete",
        body: `${crew.length - idx} crew member(s) still need to respond`,
      });
      return;
    }
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setSubmitting(false);
    onSubmitted();
  };

  return {
    state: {
      workerName: current?.name ?? "",
      progressLabel: `${Math.min(idx, crew.length)} of ${crew.length} done`,
      pending,
      allDone,
      reason,
      rows,
      totalHoursLabel: current?.totalHoursLabel ?? "",
      submitting,
      refreshing,
    },
    handlers: { onAck, onDispute, onChangeReason: setReason, onSubmit, onRefresh },
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/timesheet/ui/viewModels/useTimesheet.viewModel.test.tsx`
Expected: `PASS` (7 tests).

- [ ] **Step 5: Rewrite `TimesheetScreen.tsx`**

Replace the invented blue "Approval happens after submission, not here." banner with the ack
toggle + always-visible dispute textarea (while `pending`), and the green all-done completion
banner (while `allDone`):

```tsx
import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { useTimesheetViewModel } from "../viewModels/useTimesheet.viewModel";

interface TimesheetScreenProps {
  onSubmitted: () => void;
}

export function TimesheetScreen({ onSubmitted }: TimesheetScreenProps) {
  const { state, handlers } = useTimesheetViewModel({ onSubmitted });
  const { workerName, progressLabel, pending, allDone, reason, rows, totalHoursLabel, submitting, refreshing } = state;
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlers.onRefresh} tintColor={colors.dim} />}
        >
          <Text style={[typography.largeDate, { color: colors.ink }]}>Daily timesheet</Text>

          <GlassSurface radius={16} style={styles.workerRow}>
            <Text style={[typography.body, { color: colors.ink, fontWeight: "600" }]}>{workerName}</Text>
            <Text style={styles.progressLabel}>{progressLabel}</Text>
          </GlassSurface>

          <GlassSurface radius={18} style={styles.entriesCard}>
            {rows.map((row, index) => (
              <View key={row.id} style={[styles.entryRow, index < rows.length - 1 && styles.entrySeparator]}>
                <Text style={[styles.entryTime, { fontFamily: fontMono }]}>{row.time}</Text>
                <Text style={[styles.entryDot, { color: row.dotColor }]}>●</Text>
                <Text style={[typography.body, { flex: 1, color: colors.ink, fontWeight: "600" }]}>{row.label}</Text>
              </View>
            ))}
          </GlassSurface>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total · no gaps ✓</Text>
            <Text style={[styles.totalValue, { fontFamily: fontMono }]}>{totalHoursLabel}</Text>
          </View>

          {pending && (
            <GlassSurface radius={18} style={styles.ackCard}>
              <View style={styles.ackRow}>
                <Text style={styles.ackLabel}>I acknowledge these hours are accurate</Text>
                <Switch value={false} onValueChange={handlers.onAck} />
              </View>
              <Text style={styles.disputeLabel}>Not acknowledging — tell us why</Text>
              <TextInput
                value={reason}
                onChangeText={handlers.onChangeReason}
                placeholder="e.g. Missing travel time after lunch…"
                placeholderTextColor={colors.faint}
                multiline
                numberOfLines={3}
                style={styles.disputeInput}
              />
              <Pressable
                onPress={handlers.onDispute}
                disabled={!reason.trim()}
                style={[styles.disputeButton, { opacity: reason.trim() ? 1 : 0.45 }]}
              >
                <Text style={styles.disputeButtonText}>Submit reason &amp; continue</Text>
              </Pressable>
            </GlassSurface>
          )}

          {allDone && (
            <View style={styles.doneBanner}>
              <Text style={styles.doneBannerText}>
                All crew members have responded. Submit to send for supervisor approval.
              </Text>
            </View>
          )}

          <PillButton label={submitting ? "Submitting…" : "Submit"} onPress={handlers.onSubmit} disabled={submitting} />
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 100 },
  scroll: { flex: 1 },
  scrollContent: { gap: 13, paddingHorizontal: 18, paddingBottom: 16 },
  workerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 14 },
  progressLabel: { fontSize: 11, fontWeight: "700", color: colors.faint },
  entriesCard: { paddingHorizontal: 14 },
  entryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  entrySeparator: { borderBottomWidth: 1, borderBottomColor: "#ece9de" },
  entryTime: { fontSize: 11.5, color: colors.dim, width: 46 },
  entryDot: { fontSize: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 2 },
  totalLabel: { fontSize: 11, color: colors.dim, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  totalValue: { fontSize: 17, fontWeight: "700", color: colors.job },
  ackCard: { padding: 14, gap: 9 },
  ackRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  ackLabel: { fontSize: 13, fontWeight: "700", color: colors.ink, flex: 1 },
  disputeLabel: { fontSize: 11, fontWeight: "700", color: colors.off },
  disputeInput: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(120,120,100,0.25)",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.ink,
    minHeight: 64,
    textAlignVertical: "top",
  },
  disputeButton: { backgroundColor: colors.offBg, borderWidth: 1.5, borderColor: colors.offBorder, borderRadius: 11, paddingVertical: 12, alignItems: "center" },
  disputeButtonText: { fontSize: 12.5, fontWeight: "800", letterSpacing: 0.5, color: colors.off, textTransform: "uppercase" },
  doneBanner: { backgroundColor: colors.approvedCardBg, borderWidth: 1, borderColor: colors.approvedCardBorder, borderRadius: 16, padding: 12 },
  doneBannerText: { fontSize: 11.5, color: colors.job, lineHeight: 16 },
});
```

Note for the implementer: the prototype renders the ack control as a custom toggle-pill, not a
native `Switch` — using RN's built-in `Switch` here is a reasonable, lower-effort substitute that
preserves the same on/off semantics and existing-codebase-consistency (no other screen has built a
custom toggle component yet); don't build a bespoke toggle component just to match the prototype's
exact pixel shape for this one control.

- [ ] **Step 6: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (7 new).

- [ ] **Step 7: Commit** — skip (no git repository).

---

## Task 2: Roster — add-worker directory flow, footer button fixes, eligibility styling

**Files:**
- Modify: `src/modules/roster/core/ports/RosterReader.port.ts`
- Create: `src/modules/roster/core/entities/DirectoryWorker.entity.ts`
- Modify: `src/modules/roster/infrastructure/adapters/InMemoryCrewRoster.adapter.ts`
- Create: `src/modules/roster/core/usecases/GetDirectory.usecase.ts`
- Create: `src/modules/roster/core/usecases/GetDirectory.usecase.test.ts`
- Modify: `src/modules/roster/ui/viewModels/useRoster.viewModel.tsx`
- Create: `src/modules/roster/ui/viewModels/useRoster.viewModel.test.tsx`
- Modify: `src/modules/roster/ui/screens/RosterScreen.tsx`
- Modify: `src/modules/roster/core/entities/RosterWorker.entity.ts`

**Interfaces:**
- Consumes: `useNotifications().push(...)` (Phase 1).
- Produces: `RosterReader` port gains `readDirectory(): Promise<Result<DirectoryWorker[], {type:"READ_FAILED"}>>`.
  `useRosterViewModel`'s state gains `{ requestOpen, requestQuery, requestResults, currentDirection,
  eligibleSelectedCount, bulkLabel, selectedLabel, canClockSelected }`; handlers gain
  `{ onToggleRequest, onChangeRequestQuery, onAddFromDirectory, onClockSelected, onClockBulk }`.
  The footer's old "Hand off / Sign out" button is removed from this screen entirely (it already
  exists on Profile via the same `confirmSignOut` util — confirmed by reading
  `src/modules/profile/ui/screens/ProfileScreen.tsx` first, which already has one; this task does
  not need to add sign-out anywhere, only remove the duplicate from Roster).

**Design decision made explicit (not left ambiguous):** "eligibility" is derived from whichever
direction the CURRENTLY selected workers share — selecting a worker locks in that direction; a
worker whose direction doesn't match a non-empty active selection cannot be selected (dimmed,
tap is a no-op) until the selection is cleared. The bulk button always targets whichever direction
has more not-yet-in-that-state workers: "Clock everyone in" if any worker is idle/off, otherwise
"Clock everyone out" once every worker is already in a job/travel state. This is a reasonable,
self-consistent reconstruction of the prototype's underspecified bulk-direction behavior — flag
any better alternative you find in the prototype's JS while implementing, but don't block on it.

- [ ] **Step 1: Add `DirectoryWorker` entity and extend the roster port/adapter**

Create `src/modules/roster/core/entities/DirectoryWorker.entity.ts`:
```typescript
export interface DirectoryWorker {
  id: string;
  name: string;
  assignedTo: string | null;
}
```

Modify `src/modules/roster/core/ports/RosterReader.port.ts` — read it first, then add:
```typescript
  readDirectory(): Promise<Result<DirectoryWorker[], { type: "READ_FAILED" }>>;
```
(keep the existing `read()` signature unchanged; import `DirectoryWorker` alongside `RosterWorker`).

Modify `src/modules/roster/infrastructure/adapters/InMemoryCrewRoster.adapter.ts` — add mock
directory data and implement `readDirectory`:
```typescript
const MOCK_DIRECTORY: DirectoryWorker[] = [
  { id: "maria-g", name: "Maria Gonzalez", assignedTo: null },
  { id: "kevin-t", name: "Kevin Tran", assignedTo: "North Ridge HOA crew" },
  { id: "jake-p", name: "Jake Porter", assignedTo: null },
  { id: "luis-r", name: "Luis Reyes", assignedTo: "Westgate Plaza crew" },
  { id: "anna-k", name: "Anna Kim", assignedTo: null },
];

// ...inside InMemoryCrewRosterAdapter:
  async readDirectory(): Promise<Result<DirectoryWorker[], { type: "READ_FAILED" }>> {
    return ok(MOCK_DIRECTORY);
  }
```

- [ ] **Step 2: Write the failing usecase test**

Create `src/modules/roster/core/usecases/GetDirectory.usecase.test.ts`:
```typescript
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
```

- [ ] **Step 3: Run test to verify it fails, then write `GetDirectory.usecase.ts`**

Run: `npx jest src/modules/roster/core/usecases/GetDirectory.usecase.test.ts` → FAIL (module not found).

```typescript
import { Result } from "@/types/Result";
import { DirectoryWorker } from "../entities/DirectoryWorker.entity";
import { RosterReader } from "../ports/RosterReader.port";

export class GetDirectoryUseCase {
  constructor(private readonly reader: RosterReader) {}

  async execute(): Promise<Result<DirectoryWorker[], { type: "READ_FAILED" }>> {
    return this.reader.readDirectory();
  }
}
```

Run again → `PASS` (1 test).

- [ ] **Step 4: Write the failing roster viewModel test**

Create `src/modules/roster/ui/viewModels/useRoster.viewModel.test.tsx`. First read
`src/modules/roster/core/entities/RosterWorker.entity.ts` (has `employeeCode` from Phase 2) to
build correct fixtures, then:

```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { RosterWorker } from "../../core/entities/RosterWorker.entity";
import { DirectoryWorker } from "../../core/entities/DirectoryWorker.entity";
import { useRosterViewModel } from "./useRoster.viewModel";

const WORKERS: RosterWorker[] = [
  { id: "roy-brown" as WorkerId, name: "Roy Brown", initials: "RB", statusText: "Clocked in", statusKind: "job", employeeCode: "4821" },
  { id: "luis-t" as WorkerId, name: "Luis T.", initials: "LT", statusText: "Not clocked in", statusKind: "idle", employeeCode: "1029" },
];
const DIRECTORY: DirectoryWorker[] = [
  { id: "maria-g", name: "Maria Gonzalez", assignedTo: null },
  { id: "kevin-t", name: "Kevin Tran", assignedTo: "North Ridge HOA crew" },
];

function buildTestDeps(): Dependencies {
  return {
    rosterReader: { read: async () => ok(WORKERS), readDirectory: async () => ok(DIRECTORY) },
  } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DependenciesProvider dependencies={buildTestDeps()}>
      <NotificationsProvider>{children}</NotificationsProvider>
    </DependenciesProvider>
  );
}

describe("useRosterViewModel", () => {
  it("selecting a worker locks in that direction, making the opposite-direction worker ineligible", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleWorker("roy-brown")); // job -> OUT direction
    const luis = result.current.state.rows.find((r) => r.id === "luis-t");
    expect(luis?.eligible).toBe(false);
  });

  it("clearing the selection restores eligibility for everyone", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleWorker("roy-brown"));
    act(() => result.current.handlers.onToggleWorker("roy-brown"));
    const luis = result.current.state.rows.find((r) => r.id === "luis-t");
    expect(luis?.eligible).toBe(true);
  });

  it("filters the directory by query when the request panel is open", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleRequest());
    act(() => result.current.handlers.onChangeRequestQuery("mar"));

    expect(result.current.state.requestResults.map((r) => r.name)).toEqual(["Maria Gonzalez"]);
  });

  it("adding a directory worker inserts them into rows as pending approval", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleRequest());
    act(() => result.current.handlers.onChangeRequestQuery("mar"));
    act(() => result.current.handlers.onAddFromDirectory("maria-g"));

    const added = result.current.state.rows.find((r) => r.id === "maria-g");
    expect(added?.pendingApproval).toBe(true);
    expect(result.current.state.requestOpen).toBe(false);
  });

  it("a busy directory worker cannot be added", async () => {
    const { result } = renderHook(() => useRosterViewModel(), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleRequest());
    act(() => result.current.handlers.onChangeRequestQuery("kevin"));
    act(() => result.current.handlers.onAddFromDirectory("kevin-t"));

    expect(result.current.state.rows.find((r) => r.id === "kevin-t")).toBeUndefined();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx jest src/modules/roster/ui/viewModels/useRoster.viewModel.test.tsx`
Expected: FAIL — `eligible`/`onToggleRequest`/etc. don't exist yet.

- [ ] **Step 6: Rewrite `useRoster.viewModel.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { colors } from "@/ui/theme/colors";
import { GetCrewRosterUseCase } from "../../core/usecases/GetCrewRoster.usecase";
import { GetDirectoryUseCase } from "../../core/usecases/GetDirectory.usecase";
import { RosterWorker } from "../../core/entities/RosterWorker.entity";
import { DirectoryWorker } from "../../core/entities/DirectoryWorker.entity";

const STATUS_KIND_COLOR: Record<RosterWorker["statusKind"], string> = {
  job: colors.job,
  travel: colors.travel,
  idle: colors.idle,
  off: colors.off,
};

// Workers already on a job/travel are being clocked OUT; idle/off workers are clocked IN.
const DIRECTION_FOR_STATUS: Record<RosterWorker["statusKind"], "IN" | "OUT"> = {
  job: "OUT",
  travel: "OUT",
  idle: "IN",
  off: "IN",
};

interface ProvisionalWorker {
  id: string;
  name: string;
}

export const useRosterViewModel = () => {
  const { rosterReader } = useDependencies();
  const { push } = useNotifications();
  const [workers, setWorkers] = useState<RosterWorker[]>([]);
  const [directory, setDirectory] = useState<DirectoryWorker[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [provisional, setProvisional] = useState<ProvisionalWorker[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestQuery, setRequestQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      new GetCrewRosterUseCase(rosterReader).execute(),
      new GetDirectoryUseCase(rosterReader).execute(),
    ]).then(([rosterResult, directoryResult]) => {
      if (cancelled) return;
      if (rosterResult.success) setWorkers(rosterResult.data);
      if (directoryResult.success) setDirectory(directoryResult.data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentDirection: "IN" | "OUT" | null =
    selectedIds.size === 0 ? null : DIRECTION_FOR_STATUS[workers.find((w) => selectedIds.has(w.id))?.statusKind ?? "idle"];

  const toggleWorker = (id: string) => {
    const worker = workers.find((w) => w.id === id);
    if (!worker) return;
    const direction = DIRECTION_FOR_STATUS[worker.statusKind];
    if (currentDirection !== null && direction !== currentDirection && !selectedIds.has(id)) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows = [
    ...workers.map((worker) => {
      const direction = DIRECTION_FOR_STATUS[worker.statusKind];
      const eligible = currentDirection === null || direction === currentDirection || selectedIds.has(worker.id);
      return {
        id: worker.id,
        initials: worker.initials,
        name: worker.name,
        statusText: worker.statusText,
        statusColor: STATUS_KIND_COLOR[worker.statusKind],
        selected: selectedIds.has(worker.id),
        eligible,
        pendingApproval: false,
      };
    }),
    ...provisional.map((p) => ({
      id: p.id,
      initials: p.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      name: p.name,
      statusText: "Pending approval",
      statusColor: colors.idle,
      selected: false,
      eligible: false,
      pendingApproval: true,
    })),
  ];

  const requestResults =
    requestOpen && requestQuery.trim().length > 0
      ? directory.filter((d) => d.name.toLowerCase().includes(requestQuery.trim().toLowerCase()))
      : [];

  const onAddFromDirectory = (id: string) => {
    const worker = directory.find((d) => d.id === id);
    if (!worker || worker.assignedTo) return;
    setProvisional((prev) => [...prev, { id: worker.id, name: worker.name }]);
    setRequestOpen(false);
    setRequestQuery("");
    push({ icon: "＋", title: `${worker.name} added`, body: "Pending supervisor approval." });
  };

  const buildQueueFor = (ids: string[]) =>
    workers
      .filter((w) => ids.includes(w.id))
      .map((worker) => ({
        id: worker.id,
        name: worker.name,
        initials: worker.initials,
        direction: DIRECTION_FOR_STATUS[worker.statusKind],
        employeeCode: worker.employeeCode,
      }));

  const eligibleSelectedIds = workers.filter((w) => selectedIds.has(w.id)).map((w) => w.id);
  const bulkDirection: "IN" | "OUT" = workers.some((w) => DIRECTION_FOR_STATUS[w.statusKind] === "IN") ? "IN" : "OUT";
  const bulkIds = workers.filter((w) => DIRECTION_FOR_STATUS[w.statusKind] === bulkDirection).map((w) => w.id);

  return {
    state: {
      rows,
      selectedCount: selectedIds.size,
      canClockSelected: eligibleSelectedIds.length > 0,
      selectedLabel: currentDirection === "OUT" ? `Clock out selected (${eligibleSelectedIds.length})` : `Clock in selected (${eligibleSelectedIds.length})`,
      bulkLabel: bulkDirection === "IN" ? "Clock everyone in" : "Clock everyone out",
      requestOpen,
      requestQuery,
      requestResults,
    },
    handlers: {
      onToggleWorker: toggleWorker,
      onToggleRequest: () => setRequestOpen((prev) => !prev),
      onChangeRequestQuery: setRequestQuery,
      onAddFromDirectory,
      buildSelectedAttestationQueue: () => buildQueueFor(eligibleSelectedIds),
      buildBulkAttestationQueue: () => buildQueueFor(bulkIds),
    },
  };
};
```

Note for the implementer: `directory.find((d) => d.id === "kevin-t")`'s `assignedTo` check guards
against adding a busy worker — the test in Step 4 confirms this. `DirectoryWorker` objects with a
non-null `assignedTo` should still appear in `requestResults` (so the UI can render the "busy,
cannot add" state per the design), just be unaddable — the filter for `requestResults` doesn't
exclude busy workers, only `onAddFromDirectory` does.

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest src/modules/roster/ui/viewModels/useRoster.viewModel.test.tsx`
Expected: `PASS` (5 tests).

- [ ] **Step 8: Rewrite `RosterScreen.tsx`**

Remove the "Hand off / Sign out" button and `confirmSignOut` import entirely. Replace the single
merged footer button with two direction-aware buttons. Add the request/search panel. Fix the
selected-row background to `#fdf6e3` and keep the status-glyph prefix:

```tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { WorkerRow } from "@/ui/components/molecules/WorkerRow";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { useRosterViewModel } from "../viewModels/useRoster.viewModel";
import { AttestationWorker } from "@modules/clock/core/entities/AttestationWorker.entity";

interface RosterScreenProps {
  onGoHome: () => void;
  onStartAttestation: (queue: AttestationWorker[]) => void;
}

export function RosterScreen({ onGoHome, onStartAttestation }: RosterScreenProps) {
  const { state, handlers } = useRosterViewModel();
  const { rows, canClockSelected, selectedLabel, bulkLabel, requestOpen, requestQuery, requestResults } = state;
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <BackButton onPress={onGoHome} />
            <Text style={[typography.sectionLabel, styles.headerLabel]}>Crew roster</Text>
          </View>

          <Text style={[typography.largeDate, { color: colors.ink }]}>Who&apos;s punching?</Text>
          <Text style={[typography.body, styles.subtitle]}>
            Select crew members, or punch everyone at once. Each worker confirms with their own attestation.
          </Text>

          <View style={styles.list}>
            {rows.map((row) => (
              <WorkerRow
                key={row.id}
                initials={row.initials}
                name={row.name}
                statusText={row.pendingApproval ? `○ ${row.statusText}` : `${row.selected ? "●" : "○"} ${row.statusText}`}
                statusColor={row.statusColor}
                selected={row.selected}
                disabled={!row.eligible}
                onPress={() => handlers.onToggleWorker(row.id)}
              />
            ))}
          </View>

          <Pressable onPress={handlers.onToggleRequest} style={styles.addWorker}>
            <Text style={[typography.body, { color: colors.dim, fontWeight: "700" }]}>
              {requestOpen ? "Cancel" : "+ Add worker"}
            </Text>
          </Pressable>

          {requestOpen && (
            <GlassSurface radius={16} style={styles.requestPanel}>
              <TextInput
                value={requestQuery}
                onChangeText={handlers.onChangeRequestQuery}
                placeholder="Search by name…"
                placeholderTextColor={colors.faint}
                style={styles.requestInput}
              />
              {requestQuery.trim().length > 0 && requestResults.length === 0 && (
                <Text style={styles.requestEmpty}>No matches.</Text>
              )}
              {requestResults.map((result) => (
                <View key={result.id} style={styles.requestRow}>
                  <Text style={[typography.body, { color: colors.ink, flex: 1 }]}>{result.name}</Text>
                  {result.assignedTo ? (
                    <Text style={styles.requestBusy}>On {result.assignedTo} — cannot add</Text>
                  ) : (
                    <Pressable onPress={() => handlers.onAddFromDirectory(result.id)}>
                      <Text style={styles.requestAdd}>Add</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </GlassSurface>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 60 }]}>
          <PillButton label={selectedLabel} variant="glass" disabled={!canClockSelected} onPress={() => onStartAttestation(handlers.buildSelectedAttestationQueue())} />
          <PillButton label={bulkLabel} variant="dark" onPress={() => onStartAttestation(handlers.buildBulkAttestationQueue())} />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 100 },
  scroll: { flex: 1 },
  scrollContent: { gap: 13, paddingHorizontal: 18, paddingBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLabel: { color: colors.faint, flex: 1 },
  subtitle: { color: colors.dim, marginTop: -6 },
  list: { gap: 8 },
  addWorker: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(120,120,100,0.45)",
    borderStyle: "dashed",
    paddingVertical: 12,
    alignItems: "center",
  },
  requestPanel: { padding: 13, gap: 9 },
  requestInput: { backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "rgba(120,120,100,0.25)", borderRadius: 10, padding: 11, fontSize: 13, color: colors.ink },
  requestEmpty: { fontSize: 12, color: colors.faint },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  requestBusy: { fontSize: 11, color: colors.faint, fontStyle: "italic" },
  requestAdd: { fontSize: 12.5, fontWeight: "800", color: colors.job },
  footer: { paddingHorizontal: 18, paddingTop: 8, gap: 9 },
});
```

Note for the implementer: `WorkerRow` needs a new `disabled?: boolean` prop (dim/no-op when
ineligible) and its selected-background fix (`#fdf6e3` instead of `colors.surfaceStrong`) — modify
`src/ui/components/molecules/WorkerRow.tsx` accordingly:
```tsx
interface WorkerRowProps {
  initials: string;
  name: string;
  statusText: string;
  statusColor: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function WorkerRow({ initials, name, statusText, statusColor, selected, disabled, onPress }: WorkerRowProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[
        styles.row,
        { backgroundColor: selected ? "#fdf6e3" : colors.surface, borderColor: selected ? colors.accent : colors.border },
        disabled && styles.disabled,
      ]}
    >
      {/* ...unchanged... */}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ...unchanged entries...
  disabled: { opacity: 0.45 },
});
```

- [ ] **Step 9: Update `app/(tabs)/roster.tsx`**

Remove the now-unused `onOpenSyncQueue`-adjacent concerns if any remain from Phase 1 Task 6's
cleanup (there shouldn't be any left — confirm by reading the current file first); this task
doesn't change `RosterScreenProps` beyond removing sign-out, which this route file never passed
anyway (confirmed by Phase 1's Task 6 report, which only found `onOpenSyncQueue` there — already
removed).

- [ ] **Step 10: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (6 new: 1 usecase + 5 viewModel).

- [ ] **Step 11: Commit** — skip (no git repository).

## Self-review notes

- **Spec coverage:** Task 1 covers the Timesheet crew acknowledgement/dispute workflow and the
  Clock-in/Clock-out color fix. Task 2 covers Roster's add-worker-from-directory flow, footer
  button separation (removing the misplaced sign-out action, already present on Profile), and
  eligibility-based row dimming.
- **Known simplifications, disclosed:** the ack control uses RN's native `Switch` rather than a
  custom toggle-pill matching the prototype's exact shape; the bulk-clock direction is a
  reasonable reconstruction (majority-not-yet-in-that-state), not a byte-exact copy of ambiguous
  prototype logic — both are flagged inline above, not silently decided.
- **Type consistency:** `CrewMemberTimesheet`/`DailyTimesheet` (Task 1) and `DirectoryWorker`/the
  `useRosterViewModel` state shape (Task 2) are used identically across their respective tasks.
- **No magic numbers:** no new numeric thresholds were introduced in this phase beyond what
  already exists; if an implementer introduces one (e.g. a debounce delay for the directory
  search), it must be a named constant per standing project guidance.
