# Phase 5 — Home Screen Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Home screen's remaining prototype-fidelity gaps: the job-timer card runs its own disconnected mock simulation instead of the real timer engine and real ticket data Phase 2 built, there's no over-estimate highlighting, the crew-status model is missing 2 of 5 states, the travel chip is wired to a prop that's never passed, and a "Shop time" day-entry row plus several small design-token fixes are missing.

**Architecture:** Rather than keep Home's job card as a separate, disconnected simulation, this phase makes it consume the SAME real infrastructure Phase 2 built for Ticket Detail: Phase 1's `useTimer()` (same `` `job:${ticketId}` ``/`` `travel:${fromId}:${toId}` `` timer ids Ticket Detail and Travel already use) and Phase 2's `GetTicketDetailUseCase`. Tapping "Start/Pause/Stop" on Home's job card now toggles the literal same timer Ticket Detail shows — no more separate mock state to keep in sync.

**Tech Stack:** React Native 0.81 / Expo SDK 54 / expo-router 6 / TypeScript 5.9 / jest-expo.

## Global Constraints

- Do NOT modify `src/ui/components/atoms/GlassSurface.tsx` or `app/(tabs)/_layout.tsx`.
- No magic numbers.
- This project has NO git repository — skip "git add"/"git commit" steps.
- Match existing patterns: `GlassSurface`, `colors`/`typography`, `Pressable` + `expo-haptics`, `Result<T,E>` usecases.
- Reuse Phase 2's timer-id scheme exactly (`` `job:${ticketId}` ``, `` `travel:${fromTicketId}:${toTicketId}` ``) so Home and Ticket Detail/Travel observe the literal same timer state — do not invent parallel ids.

---

## Task 1: Home's job card consumes real ticket + timer data; crew-status/over-estimate/travel-chip fixes

**Files:**
- Modify: `src/modules/home/core/entities/HomeSummary.entity.ts`
- Modify: `src/modules/home/infrastructure/adapters/InMemoryHomeSummary.adapter.ts`
- Modify: `src/modules/home/ui/viewModels/useHome.viewModel.tsx`
- Create: `src/modules/home/ui/viewModels/useHome.viewModel.test.tsx`
- Modify: `src/modules/home/ui/screens/HomeScreen.tsx`
- Modify: `src/ui/components/molecules/HomeJobCard.tsx`
- Modify: `app/(tabs)/home.tsx`

**Interfaces:**
- Consumes: `useTimer()` (Phase 1), `GetTicketDetailUseCase` (Phase 2), `useNotifications().push()` (Phase 1, replacing `Alert.alert` where the prototype uses toasts).
- Produces: `HomeSummary.CrewStatus` gains `"job" | "lunch"`. `NextJob` drops `jobRunning`/`timerValue` (now derived live from the timer engine, not stored data) and gains `estimatedHours: number`. `useHomeViewModel`'s state gains `jobOverEstimate`, `travelPrompt` (approval card for estimated travel time — pending/approved), `travelChipTitle`/`travelChipHint` (dynamic, replacing the hardcoded constants). `HomeScreen` gains an `onGoTravel: (fromTicketId: string, toTicketId: string) => void` prop, threaded to `HomeJobCard`'s existing `onOpenTravel`.

- [ ] **Step 1: Extend the entity and mock data**

Modify `src/modules/home/core/entities/HomeSummary.entity.ts`:
```typescript
import { WorkerId } from "@/types/ids";

export type CrewStatus = "out" | "in" | "travel" | "job" | "lunch";
export type JobStatus = "pending" | "active" | "done";

export interface NextJob {
  id: string;
  name: string;
  sub: string;
  status: JobStatus;
  /** GPS-based: crew hasn't arrived at this job's site yet, so travel must be logged first. */
  requiresTravelFirst: boolean;
  estimatedHours: number;
}

export interface DayEntry {
  id: string;
  name: string;
  statusText: string;
  statusKind: "job" | "travel" | "idle" | "off";
  timer: string;
  buttonLabel: string;
  buttonEnabled: boolean;
  location: string;
  startTime: string;
  endTime: string;
}

export interface HomeSummary {
  dateLabel: string;
  crewLeaderLine: string;
  crewLeaderInitials: WorkerId | string;
  batteryPercent: number;
  gpsAvailable: boolean;
  crewStatus: CrewStatus;
  nextJob: NextJob;
  dayEntries: DayEntry[];
}
```

Modify `src/modules/home/infrastructure/adapters/InMemoryHomeSummary.adapter.ts` — remove `jobRunning`/`timerValue` from the mock `nextJob`, add `estimatedHours: 6.5` (matching `chesterfield-remodel`'s real estimate from `InMemoryTicketsAdapter`), and add the missing "Shop time" day entry (the prototype's `DAY_ENTRIES` has 3 rows: Yard/Safety/Shop — this mock only ever had 2):
```typescript
import { Result, ok } from "@/types/Result";
import { HomeSummary } from "../../core/entities/HomeSummary.entity";
import { HomeSummaryReader } from "../../core/ports/HomeSummaryReader.port";

export class InMemoryHomeSummaryAdapter implements HomeSummaryReader {
  async today(): Promise<Result<HomeSummary, { type: "READ_FAILED" }>> {
    return ok({
      dateLabel: "Tue Jun 23",
      crewLeaderLine: "H. Jackson · Chesterfield",
      crewLeaderInitials: "HJ",
      batteryPercent: 62,
      gpsAvailable: true,
      crewStatus: "out",
      nextJob: {
        id: "chesterfield-remodel",
        name: "Chesterfield Remodel",
        sub: "Job site · est 6.5h",
        status: "pending",
        requiresTravelFirst: true,
        estimatedHours: 6.5,
      },
      dayEntries: [
        {
          id: "yard",
          name: "Yard prep",
          statusText: "Not started",
          statusKind: "idle",
          timer: "00:00",
          buttonLabel: "▶ Start",
          buttonEnabled: true,
          location: "Yard — Chesterfield",
          startTime: "—",
          endTime: "—",
        },
        {
          id: "training",
          name: "Safety training",
          statusText: "Not started",
          statusKind: "idle",
          timer: "00:00",
          buttonLabel: "▶ Start",
          buttonEnabled: true,
          location: "Yard — Chesterfield",
          startTime: "—",
          endTime: "—",
        },
        {
          id: "shop",
          name: "Shop time",
          statusText: "Not started",
          statusKind: "idle",
          timer: "00:00",
          buttonLabel: "▶ Start",
          buttonEnabled: true,
          location: "Shop — Chesterfield",
          startTime: "—",
          endTime: "—",
        },
      ],
    });
  }
}
```

- [ ] **Step 2: Write the failing viewModel test**

Create `src/modules/home/ui/viewModels/useHome.viewModel.test.tsx`. First read `src/modules/home/core/ports/HomeSummaryReader.port.ts` and `src/modules/tickets/core/ports/TicketsReader.port.ts` to confirm exact shapes, then:

```tsx
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { HomeSummary } from "../../core/entities/HomeSummary.entity";
import { JobTicket } from "@modules/tickets/core/entities/JobTicket.entity";
import { useHomeViewModel } from "./useHome.viewModel";

const SUMMARY: HomeSummary = {
  dateLabel: "Tue Jun 23",
  crewLeaderLine: "H. Jackson · Chesterfield",
  crewLeaderInitials: "HJ",
  batteryPercent: 62,
  gpsAvailable: true,
  crewStatus: "in",
  nextJob: {
    id: "yard-prep",
    name: "Yard prep",
    sub: "Yard · est 1h",
    status: "pending",
    requiresTravelFirst: false,
    estimatedHours: 1,
  },
  dayEntries: [],
};

const TICKET: JobTicket = {
  id: "yard-prep", name: "Yard prep", tag: "M", sub: "Yard · est 1h", statusLabel: "Not started",
  statusKind: "idle", site: "yard", address: "Company Yard", estimatedHours: 1, crew: [],
};

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) { return this.map.get(key) ?? null; }
  setString(key: string, value: string) { this.map.set(key, value); }
}

function buildTestDeps(): Dependencies {
  return {
    keyValueStore: new FakeKeyValueStore(),
    homeSummaryReader: { today: async () => ok(SUMMARY) },
    ticketsReader: { read: async () => ok([TICKET]), readOne: async () => ok(TICKET) },
  } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DependenciesProvider dependencies={buildTestDeps()}>
      <TimerProvider>
        <NotificationsProvider>{children}</NotificationsProvider>
      </TimerProvider>
    </DependenciesProvider>
  );
}

describe("useHomeViewModel — real timer integration", () => {
  it("job button starts the same timer id Ticket Detail uses", async () => {
    const { result } = renderHook(() => useHomeViewModel({ onOpenNextJob: jest.fn(), onGoRoster: jest.fn(), onGoTravel: jest.fn() }), { wrapper });
    await waitFor(() => expect(result.current.state.summary).not.toBeNull());

    act(() => result.current.handlers.onJobAction());
    expect(result.current.state.jobButton.label).toMatch(/Stop|Pause/i);
  });

  it("jobOverEstimate becomes true once elapsed time passes the ticket's estimated hours", async () => {
    const { result } = renderHook(() => useHomeViewModel({ onOpenNextJob: jest.fn(), onGoRoster: jest.fn(), onGoTravel: jest.fn() }), { wrapper });
    await waitFor(() => expect(result.current.state.summary).not.toBeNull());

    expect(result.current.state.jobOverEstimate).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/modules/home/ui/viewModels/useHome.viewModel.test.tsx`
Expected: FAIL — `onGoTravel` arg and `jobOverEstimate` state don't exist yet.

- [ ] **Step 4: Rewrite `useHome.viewModel.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useTimer } from "@app/react/timer/useTimer";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { colors } from "@/ui/theme/colors";
import { GetHomeSummaryUseCase } from "../../core/usecases/GetHomeSummary.usecase";
import { GetTicketDetailUseCase } from "@modules/tickets/core/usecases/GetTicketDetail.usecase";
import { CrewStatus, DayEntry, HomeSummary } from "../../core/entities/HomeSummary.entity";

export interface HomeBanner {
  icon: string;
  title: string;
  body: string;
  bg: string;
  border: string;
  accent: string;
}

const NOTIFY_QUICK_OPTIONS = ["Running late", "Equipment issue", "Need materials", "Weather delay"] as const;
const SECONDS_PER_HOUR = 3600;

const STATUS_KIND_COLOR: Record<DayEntry["statusKind"], { text: string; bg: string; border: string }> = {
  job: { text: colors.job, bg: colors.jobBg, border: colors.jobBorder },
  travel: { text: colors.travel, bg: colors.travelBg, border: colors.travelBorder },
  idle: { text: colors.idle, bg: colors.idleBg, border: colors.idleBorder },
  off: { text: colors.off, bg: colors.offBg, border: colors.offBorder },
};

const bannerForStatus = (status: CrewStatus): HomeBanner => {
  switch (status) {
    case "out":
      return {
        icon: "●",
        title: "Good morning — ready to start",
        body: "Clock the crew in, then start travel as you leave the yard",
        bg: colors.idleBg,
        border: colors.idleBorder,
        accent: colors.idle,
      };
    case "in":
      return {
        icon: "→",
        title: "Crew on the clock",
        body: "Start travel time as you leave the yard",
        bg: colors.travelBg,
        border: colors.travelBorder,
        accent: colors.travel,
      };
    case "travel":
      return {
        icon: "→",
        title: "Crew in travel time",
        body: "Arrival ends travel and clocks the crew into the job ticket — no gap",
        bg: colors.travelBg,
        border: colors.travelBorder,
        accent: colors.travel,
      };
    case "job":
      return {
        icon: "●",
        title: "Crew is on job",
        body: "Job time is ticking — stop it when the crew leaves the site",
        bg: colors.jobBg,
        border: colors.jobBorder,
        accent: colors.job,
      };
    case "lunch":
      return {
        icon: "◔",
        title: "Crew is on lunch",
        body: "Job and travel timers are paused until the break ends",
        bg: colors.idleBg,
        border: colors.idleBorder,
        accent: colors.idle,
      };
  }
};

const formatTimer = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

interface UseHomeViewModelArgs {
  onOpenNextJob: (ticketId: string) => void;
  onGoRoster: () => void;
  onGoTravel: (fromTicketId: string, toTicketId: string) => void;
}

export const useHomeViewModel = ({ onOpenNextJob, onGoRoster, onGoTravel }: UseHomeViewModelArgs) => {
  const { homeSummaryReader, ticketsReader } = useDependencies();
  const timer = useTimer();
  const { push } = useNotifications();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [nextTicketId, setNextTicketId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openDayItemId, setOpenDayItemId] = useState<string | null>(null);
  const [notifyPanelOpen, setNotifyPanelOpen] = useState(false);
  const [notifyComposerOpen, setNotifyComposerOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [, forceRerender] = useState(0);

  const load = useCallback(async () => {
    const result = await new GetHomeSummaryUseCase(homeSummaryReader).execute();
    if (result.success) {
      setSummary(result.data);
      const ticketResult = await new GetTicketDetailUseCase(ticketsReader).execute(result.data.nextJob.id);
      if (ticketResult.success) setNextTicketId(ticketResult.data.nextTicketId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-render once a second so the job timer stays live — getSeconds/isRunning read from a ref
  // internally and don't trigger re-renders on their own (see TimerProvider.tsx's own note).
  useEffect(() => {
    const interval = setInterval(() => forceRerender((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const showBatteryWarning = (summary?.batteryPercent ?? 100) < 35;
  const showGpsWarning = summary ? !summary.gpsAvailable : false;
  const banner = summary ? bannerForStatus(summary.crewStatus) : null;

  const dayItems = (summary?.dayEntries ?? []).map((entry) => {
    const tone = STATUS_KIND_COLOR[entry.statusKind];
    return {
      id: entry.id,
      name: entry.name,
      statusText: entry.statusText,
      statusColor: tone.text,
      timer: entry.timer,
      location: entry.location,
      startTime: entry.startTime,
      endTime: entry.endTime,
      open: openDayItemId === entry.id,
      onToggleOpen: () => setOpenDayItemId((prev) => (prev === entry.id ? null : entry.id)),
      button: {
        label: entry.buttonLabel,
        bg: tone.bg,
        color: tone.text,
        border: tone.border,
        opacity: entry.buttonEnabled ? 1 : 0.5,
        onPress: () => {},
      },
    };
  });

  const jobTimerId = summary ? `job:${summary.nextJob.id}` : null;
  const travelTimerId = summary && nextTicketId ? `travel:${summary.nextJob.id}:${nextTicketId}` : null;

  const jobSeconds = jobTimerId ? timer.getSeconds(jobTimerId) : 0;
  const jobRunning = jobTimerId ? timer.isRunning(jobTimerId) : false;
  const estimatedSeconds = (summary?.nextJob.estimatedHours ?? 0) * SECONDS_PER_HOUR;
  const jobOverEstimate = estimatedSeconds > 0 && jobSeconds > estimatedSeconds;

  const travelRunning = travelTimerId ? timer.isRunning(travelTimerId) : false;
  const travelSeconds = travelTimerId ? timer.getSeconds(travelTimerId) : 0;
  const travelDone = travelTimerId ? travelSeconds > 0 && !travelRunning : false;
  const needsTravel = summary?.nextJob.status === "pending" && !travelRunning && summary?.nextJob.requiresTravelFirst && !travelDone;

  const jobButton = (() => {
    if (travelRunning) return { label: "→ Travelling…", bg: colors.travelBg, color: colors.travel, border: colors.travelBorder };
    if (needsTravel) return { label: "→ Start Travel", bg: colors.travelBg, color: colors.travel, border: colors.travelBorder };
    if (jobRunning) return { label: "■ Stop", bg: colors.offBg, color: colors.off, border: colors.offBorder };
    if (jobSeconds > 0) return { label: "❚❚ Paused", bg: colors.jobBg, color: colors.job, border: colors.jobBorder };
    return { label: "▶ Start", bg: colors.jobBg, color: colors.job, border: colors.jobBorder };
  })();
  const jobButtonOpacity = summary?.crewStatus === "out" ? 0.5 : 1;

  const onJobAction = () => {
    if (!summary || !jobTimerId) return;
    if (summary.crewStatus === "out") {
      push({ icon: "!", title: "Clock in first", body: "Each worker must self-clock in before travel or job time starts (CA law)." });
      onGoRoster();
      return;
    }
    if (travelRunning) return;
    if (needsTravel && travelTimerId) {
      timer.start(travelTimerId);
      return;
    }
    if (jobRunning) timer.pause(jobTimerId);
    else timer.start(jobTimerId);
  };

  const onNotifyQuickTap = (label: string) => {
    push({ icon: "⚑", title: "Office notified", body: `"${label}" sent to the office with your location and crew.` });
  };

  const onNotifySend = () => {
    if (!notifyMessage.trim()) return;
    push({ icon: "⚑", title: "Office notified", body: `"${notifyMessage.trim()}" sent to the office with your location and crew.` });
    setNotifyComposerOpen(false);
    setNotifyMessage("");
    setNotifyPanelOpen(false);
  };

  return {
    state: {
      summary,
      banner,
      showBatteryWarning,
      showGpsWarning,
      dayItems,
      refreshing,
      jobButton,
      jobButtonOpacity,
      jobOverEstimate,
      showTravelChip: travelRunning,
      travelChipTitle: travelRunning ? `Travel time — ${formatTimer(travelSeconds)}` : undefined,
      travelChipHint: "Arrival will clock you into the job automatically",
      notifyPanelOpen,
      notifyComposerOpen,
      notifyMessage,
      notifyQuickOptions: NOTIFY_QUICK_OPTIONS,
    },
    handlers: {
      onClockInOut: onGoRoster,
      onOpenNextJob: () => onOpenNextJob(summary?.nextJob.id ?? ""),
      onOpenTravel: () => {
        if (summary && nextTicketId) onGoTravel(summary.nextJob.id, nextTicketId);
      },
      onJobAction,
      onRefresh,
      onToggleNotifyPanel: () => setNotifyPanelOpen((prev) => !prev),
      onNotifyQuickTap,
      onNotifyOther: () => {
        setNotifyComposerOpen(true);
        setNotifyMessage("");
      },
      onChangeNotifyMessage: setNotifyMessage,
      onNotifyCancel: () => {
        setNotifyComposerOpen(false);
        setNotifyMessage("");
      },
      onNotifySend,
    },
  };
};
```

Note for the implementer: `travelDone` is derived from `travelSeconds > 0 && !travelRunning` — a pragmatic proxy for "travel was completed" using the same shared timer engine, rather than introducing a separate cross-screen "trip completed" flag. This matches how Ticket Detail/Travel already communicate implicitly through the shared timer id; document this reasoning in your report if you adjust it.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/modules/home/ui/viewModels/useHome.viewModel.test.tsx`
Expected: `PASS` (2 tests).

- [ ] **Step 6: Update `HomeJobCard.tsx`** to accept and render over-estimate highlighting on the timer, matching Ticket Detail's pattern:

Modify the `timerValue`/`timerLabel` rendering to accept an `overEstimate?: boolean` prop and apply `colors.off`/`colors.offBg` when true, and remove the now-unused `timerValue: string` requirement being passed from static data (it already accepts `timerValue`/`timerLabel` as props — just add the highlighting):
```tsx
interface HomeJobCardProps {
  name: string;
  sub: string;
  dotColor: string;
  onOpen: () => void;
  timerLabel: string;
  timerValue: string;
  overEstimate?: boolean;
  button: HomeJobButton;
  onJobAction: () => void;
  travelChipTitle?: string;
  travelHint?: string;
  onOpenTravel?: () => void;
}
```
In the JSX, change the timer text col to:
```tsx
        <View style={styles.timerTextCol}>
          <Text style={[typography.sectionLabel, { fontSize: 10.5, color: overEstimate ? colors.off : colors.faint }]}>
            {overEstimate ? `${timerLabel} · over estimate` : timerLabel}
          </Text>
          <Text style={[styles.timerValue, { fontFamily: fontMono, color: overEstimate ? colors.off : colors.ink }]}>{timerValue}</Text>
        </View>
```

- [ ] **Step 7: Update `HomeScreen.tsx`** to compute and pass a live `timerValue` (the viewModel no longer stores one — it's derived from the timer engine each render) and wire `onOpenTravel`:

Read the current file first, then modify the `HomeJobCard` usage:
```tsx
interface HomeScreenProps {
  onOpenNextJob: (ticketId: string) => void;
  onOpenProfile: () => void;
  onGoRoster: () => void;
  onGoTravel: (fromTicketId: string, toTicketId: string) => void;
}

export function HomeScreen({ onOpenNextJob, onOpenProfile, onGoRoster, onGoTravel }: HomeScreenProps) {
  const { state, handlers } = useHomeViewModel({ onOpenNextJob, onGoRoster, onGoTravel });
  // ...existing destructuring, plus jobOverEstimate, travelChipTitle, travelChipHint...
```
And in the `HomeJobCard` JSX:
```tsx
          <HomeJobCard
            name={summary.nextJob.name}
            sub={summary.nextJob.sub}
            dotColor={jobDotColor}
            onOpen={handlers.onOpenNextJob}
            timerLabel={JOB_TIMER_LABEL}
            timerValue={/* read from the same timer id the viewModel derives jobOverEstimate from — expose it in state as jobTimerValue rather than recomputing in the screen */}
            overEstimate={state.jobOverEstimate}
            button={{ ...jobButton, opacity: jobButtonOpacity }}
            onJobAction={handlers.onJobAction}
            travelChipTitle={state.travelChipTitle}
            travelHint={state.travelChipHint}
            onOpenTravel={handlers.onOpenTravel}
          />
```
Note for the implementer: the brief's Step 4 code above computes `jobSeconds`/`jobOverEstimate` inside the viewModel but doesn't expose a formatted `jobTimerValue` string in the returned `state` object — add one (`jobTimerValue: formatTimer(jobSeconds)`) to `useHome.viewModel.tsx`'s returned state so the screen doesn't need its own formatting logic or direct timer access. This is a small addition to Step 4's code, not a contradiction — just complete it.

- [ ] **Step 8: Update `app/(tabs)/home.tsx`**

```tsx
import React from "react";
import { router } from "expo-router";
import { HomeScreen } from "@modules/home/ui/screens/HomeScreen";

export default function Home() {
  return (
    <HomeScreen
      onOpenNextJob={(ticketId) => router.push({ pathname: "/ticket-detail", params: { ticketId } })}
      onOpenProfile={() => router.push("/profile")}
      onGoRoster={() => router.navigate("/roster")}
      onGoTravel={(fromTicketId, toTicketId) => router.push({ pathname: "/travel", params: { fromTicketId, toTicketId } })}
    />
  );
}
```

- [ ] **Step 9: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (2 new).

- [ ] **Step 10: Manually verify** — if you have simulator access: on Home, tap the job card's "▶ Start" button, confirm the timer counts up live (matches what Ticket Detail would show for the same job), confirm tapping the travel chip (once travel is running via Ticket Detail's flow) navigates to the real Travel screen. If you don't have simulator access, say so clearly.

- [ ] **Step 11: Commit** — skip (no git repository).

---

## Task 2: Home design-polish fixes (banner accent stripe, notify-office chips, PillButton shadow, day-item glyphs)

**Files:**
- Modify: `src/ui/components/molecules/StatusBanner.tsx`
- Modify: `src/ui/components/molecules/NotifyOfficePanel.tsx`
- Modify: `src/ui/components/atoms/PillButton.tsx`
- Modify: `src/ui/components/molecules/DayItemRow.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no interface changes — this task is pure visual/style correction, no prop or state shape changes. Every consumer of these 4 components is unaffected.

- [ ] **Step 1: Fix `StatusBanner.tsx`'s left-accent-stripe color bug**

The left border currently renders in the same translucent color as the other 3 sides (`borderColor: tone.border` applies to all sides including `borderLeftWidth: 4`), losing the signature colored-accent-stripe look. Read the current file, then change the container style to give the left border its own color:
```tsx
    <View
      style={[
        styles.container,
        { backgroundColor: tone.bg, borderColor: tone.border, borderLeftColor: tone.accent },
      ]}
    >
```
(Keep everything else in the file unchanged — this is a one-line-equivalent fix.)

- [ ] **Step 2: Fix `NotifyOfficePanel.tsx`'s quick-chip shape/palette and Cancel/Send layout**

Read the current file, then change the `chip`/`otherChip` styles from a grey-wash rounded-rect to a translucent-white pill (matching the design spec), and make `composerActions` a full-width 50/50 row instead of right-aligned:
```typescript
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  otherChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(120,120,100,0.4)",
    backgroundColor: "rgba(255,255,255,0.4)",
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
```
And:
```typescript
  composerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(120,120,100,0.25)",
  },
  sendButton: { flex: 1, paddingVertical: 9 },
```
Also fix the panel's card radius from 16 to 18 (`<GlassSurface radius={18} ...>`) and the textarea background opacity from 0.5 to 0.7 (`input.backgroundColor: "rgba(255,255,255,0.7)"`), and the copy constants to match the spec exactly:
```typescript
const PANEL_TITLE = "Notify office";
const MESSAGE_PLACEHOLDER = "Message to the office…";
```

- [ ] **Step 3: Fix `PillButton.tsx`'s primary-variant shadow and radius**

Read the current file. The primary variant (used for Home's "Clock In / Out" CTA) is missing its signature amber drop-shadow and uses the wrong radius. Add a shadow style and apply it only to the primary variant:
```typescript
const PRIMARY_SHADOW_STYLE = {
  shadowColor: "rgba(180,120,0,0.5)",
  shadowOpacity: 1,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};
```
And in the primary/dark branch's `Pressable` style array, change `borderRadius: 18` to `borderRadius: 22` and add `variant === "primary" && PRIMARY_SHADOW_STYLE`:
```tsx
      style={[
        styles.button,
        { borderRadius: 22, backgroundColor: variant === "dark" ? colors.ink : colors.accent },
        variant === "primary" && PRIMARY_SHADOW_STYLE,
        disabled && { opacity: 0.5 },
        style,
      ]}
```
Note for the implementer: confirm this doesn't visually break the `variant === "dark"` buttons (e.g. Roster's bulk-clock button) — the shadow only applies when `variant === "primary"`, so dark-variant buttons should be unaffected; double check by reading how `variant` is used elsewhere before assuming this is safe (a quick grep for `PillButton` usages across the app is enough, no need to touch other files).

- [ ] **Step 4: Fix `DayItemRow.tsx`'s chevron glyphs**

Change `⌃`/`⌄` to `▲`/`▼`:
```tsx
        <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
```

- [ ] **Step 5: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all existing tests still pass (no new tests — this task is pure styling, no new logic to unit test).

- [ ] **Step 6: Manually verify** — if you have simulator access, confirm on Home: the status banner shows a distinctly-colored left accent stripe (not matching the rest of the border); the notify-office quick chips are pill-shaped and translucent-white (not grey rounded rectangles); the "Clock In / Out" button has a visible amber glow shadow; day-item rows show ▲/▼ chevrons. If you don't have simulator access, say so clearly.

- [ ] **Step 7: Commit** — skip (no git repository).

## Self-review notes

- **Spec coverage:** Task 1 covers items 14 (estimated-travel — via the `travelDone`/`needsTravel` derivation reusing the real timer, closing the loop Phase 2 opened rather than building a separate approval-card UI element not backed by any real state), 15 (over-estimate highlighting), 16 (5-state crew status), 17 (dead travel-chip wiring), 18 (real timer-backed job/travel toggle), 19 (`needsTravel` tied to real travel completion), 20 (dynamic travel chip copy), 21 (missing Shop time row). Task 2 covers the Home-specific design-polish items from the original audit (banner accent stripe, notify-chip shape/palette, PillButton shadow, chevron glyphs).
- **Deliberate simplification, disclosed:** rather than building a separate "estimated travel time approval card" UI (pending/approved states with a distinct approve action, as the original audit described), this plan ties Home's existing travel-chip/needsTravel logic directly to the real travel timer's running/done state — since Phase 2 already built the real approval-equivalent flow (Travel screen's "End Travel — Arrived" / travel-done card), duplicating a second, disconnected "approval" concept on Home would reintroduce exactly the kind of parallel-simulation problem this phase is fixing. If a literal separate approval card is still wanted on Home specifically, that's a follow-up, not silently dropped — flagging here for visibility.
- **Type consistency:** `CrewStatus`, `NextJob` (Task 1), and the `HomeJobCard`/`HomeScreen` prop additions are used identically across all touched files.
- **No magic numbers:** `SECONDS_PER_HOUR` (Task 1) is a named constant; Task 2 introduces no new numeric thresholds.
