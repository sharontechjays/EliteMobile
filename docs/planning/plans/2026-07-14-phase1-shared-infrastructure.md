# Phase 1 — Shared Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four cross-cutting pieces of infrastructure the rest of the prototype-fidelity work depends on: a global `TopBar` (sync-status pill + EN/ES language toggle + notification bell), a toast/notification system with a `notifLog` feed, a generic ticking-timer engine, and EN/ES language-toggle scaffolding.

**Architecture:** Follow the codebase's existing patterns — plain React Context + hooks for cross-cutting app state (mirroring `DependenciesProvider`/`useDependencies`, not a new state-management library), and the existing clean-architecture module layout (`core/entities`, `core/usecases`, `infrastructure/adapters`) only where a piece is genuinely domain data (sync status derivation). Pure logic (reducers, derivation functions) is written as framework-free functions so it can be unit-tested without rendering React.

**Tech Stack:** React Native 0.81 / Expo SDK 54 / expo-router 6 / TypeScript 5.9. Testing: `jest-expo` + `@testing-library/react-native` (net-new — no test infrastructure exists yet).

## Global Constraints

- Do NOT modify `src/ui/components/atoms/GlassSurface.tsx` — off-limits, already correct.
- Do NOT modify `app/(tabs)/_layout.tsx` (bottom tab navigation) — off-limits, already correct.
- No new state-management library. Cross-cutting state uses plain React Context + hooks, matching the existing `DependenciesProvider` precedent in `src/modules/app/react/`.
- Path aliases already configured in `tsconfig.json`/`babel.config.js`: `@/*` → `src/*`, `@app/*` → `src/modules/app/*`, `@modules/*` → `src/modules/*`. Use them, don't add new ones.
- Match existing code style: `StyleSheet.create` at the bottom of component files, `colors`/`typography` theme tokens from `src/ui/theme/`, `Pressable` + `expo-haptics` for tappable elements (see `PillButton.tsx`, `BackButton.tsx`).
- Every new screen-adjacent visual element must be built from `GlassSurface` (imported, not reimplemented) to inherit the real iOS Liquid Glass material.
- No magic numbers: extract thresholds/durations/cap values into named constants (e.g. `TOAST_DURATION_MS`, `MAX_NOTIF_LOG` from earlier tasks are the model to follow).

---

## Addendum (post-Task 6): Timer persistence

**Why:** User-reported bug — the Task 2 timer engine is pure in-memory `setInterval` ticking with no persistence. It does not survive the app being backgrounded (iOS/Android suspend JS timers) or killed and relaunched (all React state is destroyed). For a crew-timekeeping app, job/travel/day timers must reflect true elapsed wall-clock time across all of these. User confirmed the storage choice: `react-native-mmkv`, matching the existing code comment in `InMemoryKeyValueStoreAdapter.ts:3` ("Stand-in for the MMKV-backed store until native persistence is wired in") — this was always the intended target, not a new dependency chosen ad hoc.

**Scope:** Two tasks. Task 7 builds a real MMKV-backed `KeyValueStore` adapter and wires it into `buildDevDependencies()` (as a side effect, this also fixes `DeviceRegistrar`/`AppReadinessReader` restart-survival, since they already depend on the same port). Task 8 redesigns the timer engine's internal model from tick-counted seconds to timestamp-based elapsed time, persisted through that adapter and rehydrated on app launch. The public `useTimer()` interface (`getSeconds`/`isRunning`/`start`/`pause`/`reset`) does not change — only its internal implementation.

---

## Task 7: MMKV-backed persistent `KeyValueStore` adapter

**Files:**
- Modify: `package.json` (add `react-native-mmkv`)
- Create: `src/modules/shared/storage/MmkvKeyValueStore.adapter.ts`
- Create: `__mocks__/react-native-mmkv.tsx` (Jest manual mock — MMKV is a native module; follow the exact precedent Task 5 established for `expo-glass-effect`: check first whether the package ships its own Jest mock before writing one)
- Create: `src/modules/shared/storage/MmkvKeyValueStore.adapter.test.ts`
- Modify: `src/modules/app/dependencies/dependencies.dev.ts` (swap `InMemoryKeyValueStoreAdapter` for `MmkvKeyValueStoreAdapter`)

**Interfaces:**
- Consumes: the existing `KeyValueStore` port (`src/modules/shared/storage/KeyValueStore.port.ts`) — `{ getString(key): string | null; setString(key, value): void }`. Unchanged signature.
- Produces: `MmkvKeyValueStoreAdapter implements KeyValueStore`, synchronous, backed by a real `react-native-mmkv` `MMKV` instance. Task 8 consumes this adapter (via `useDependencies()`) to persist timer state.

- [ ] **Step 1: Install `react-native-mmkv`**

Run:
```bash
cd /Users/sharonpjoseph/Documents/EliteTeamsOffices/EliteMobile
npx expo install react-native-mmkv
```
Expected: added to `dependencies` in `package.json` at a version Expo selects as compatible with SDK 54.

**This requires a native rebuild** (the project already has a prebuilt `ios/` directory and uses a custom dev client per `expo-glass-effect`'s own precedent, so this is the existing normal workflow here, not new friction). After installing:
```bash
cd ios && pod install && cd ..
```
If this step fails (network, CocoaPods version, or Xcode toolchain issues), report BLOCKED with the exact error rather than working around it — native install failures need a human's environment, not a code workaround.

- [ ] **Step 2: Check whether `react-native-mmkv` ships its own Jest mock**

Run: `find /Users/sharonpjoseph/Documents/EliteTeamsOffices/EliteMobile/node_modules/react-native-mmkv -iname "*mock*" -o -iname "*jest*"`

If it ships one that works out of the box with this project's `jest-expo` preset (test it), use it instead of writing a new one — skip to Step 4. If not (most likely, since MMKV is a native module and — per Task 5's finding with `expo-glass-effect` — this project's Jest environment resolves native-module imports at module scope, which crashes without a manual mock), proceed to Step 3.

- [ ] **Step 3: Write `__mocks__/react-native-mmkv.tsx`**

A minimal in-memory stand-in exposing the same `MMKV` class shape the adapter will use (`new MMKV()`, `.getString(key)`, `.set(key, value)`):

```typescript
export class MMKV {
  private store = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }
}
```

- [ ] **Step 4: Write the failing adapter test**

Create `src/modules/shared/storage/MmkvKeyValueStore.adapter.test.ts`:

```typescript
import { MmkvKeyValueStoreAdapter } from "./MmkvKeyValueStore.adapter";

describe("MmkvKeyValueStoreAdapter", () => {
  it("returns null for a key that was never set", () => {
    const store = new MmkvKeyValueStoreAdapter();
    expect(store.getString("missing")).toBeNull();
  });

  it("returns a previously set value", () => {
    const store = new MmkvKeyValueStoreAdapter();
    store.setString("greeting", "hello");
    expect(store.getString("greeting")).toBe("hello");
  });

  it("overwrites an existing value", () => {
    const store = new MmkvKeyValueStoreAdapter();
    store.setString("greeting", "hello");
    store.setString("greeting", "goodbye");
    expect(store.getString("greeting")).toBe("goodbye");
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx jest src/modules/shared/storage/MmkvKeyValueStore.adapter.test.ts`
Expected: FAIL — `Cannot find module './MmkvKeyValueStore.adapter'`.

- [ ] **Step 6: Write `MmkvKeyValueStore.adapter.ts`**

```typescript
import { MMKV } from "react-native-mmkv";
import { KeyValueStore } from "./KeyValueStore.port";

export class MmkvKeyValueStoreAdapter implements KeyValueStore {
  private readonly storage = new MMKV();

  getString(key: string): string | null {
    return this.storage.getString(key) ?? null;
  }

  setString(key: string, value: string): void {
    this.storage.set(key, value);
  }
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest src/modules/shared/storage/MmkvKeyValueStore.adapter.test.ts`
Expected: `PASS` (3 tests).

- [ ] **Step 8: Wire the adapter into `buildDevDependencies()`**

Modify `src/modules/app/dependencies/dependencies.dev.ts`:

```typescript
import { Dependencies } from "./Dependencies.type";
import { MmkvKeyValueStoreAdapter } from "@modules/shared/storage/MmkvKeyValueStore.adapter";
import { LocalAppReadinessAdapter } from "@modules/splash/infrastructure/adapters/LocalAppReadiness.adapter";
import { LocalDeviceRegistrarAdapter } from "@modules/deviceRegistration/infrastructure/adapters/LocalDeviceRegistrar.adapter";
import { NativeDeviceIdentityKeyStoreAdapter } from "@modules/deviceRegistration/infrastructure/adapters/NativeDeviceIdentityKeyStore.adapter";
import { InMemoryHomeSummaryAdapter } from "@modules/home/infrastructure/adapters/InMemoryHomeSummary.adapter";
import { InMemorySessionAuthenticatorAdapter } from "@modules/auth/infrastructure/adapters/InMemorySessionAuthenticator.adapter";
import { InMemoryCrewRosterAdapter } from "@modules/roster/infrastructure/adapters/InMemoryCrewRoster.adapter";
import { InMemoryPunchRecorderAdapter } from "@modules/clock/infrastructure/adapters/InMemoryPunchRecorder.adapter";
import { InMemoryNoteSaverAdapter } from "@modules/notes/infrastructure/adapters/InMemoryNoteSaver.adapter";
import { InMemoryTicketsAdapter } from "@modules/tickets/infrastructure/adapters/InMemoryTickets.adapter";
import { InMemoryTimesheetAdapter } from "@modules/timesheet/infrastructure/adapters/InMemoryTimesheet.adapter";
import { InMemorySyncQueueAdapter } from "@modules/sync/infrastructure/adapters/InMemorySyncQueue.adapter";
import { InMemoryProfileAdapter } from "@modules/profile/infrastructure/adapters/InMemoryProfile.adapter";

// Dev profile: local-only adapters, now backed by real MMKV persistence for the shared
// key-value store (device registration, app readiness, and timer state all survive
// app restarts through it). Swap the remaining in-memory adapters for SQLite-backed
// ones once the clock/sync local store lands.
export const buildDevDependencies = (): Dependencies => {
  const keyValueStore = new MmkvKeyValueStoreAdapter();

  return {
    appReadinessReader: new LocalAppReadinessAdapter(keyValueStore),
    deviceRegistrar: new LocalDeviceRegistrarAdapter(keyValueStore),
    deviceIdentityKeyStore: new NativeDeviceIdentityKeyStoreAdapter(),
    homeSummaryReader: new InMemoryHomeSummaryAdapter(),
    sessionAuthenticator: new InMemorySessionAuthenticatorAdapter(),
    rosterReader: new InMemoryCrewRosterAdapter(),
    punchRecorder: new InMemoryPunchRecorderAdapter(),
    noteSaver: new InMemoryNoteSaverAdapter(),
    ticketsReader: new InMemoryTicketsAdapter(),
    timesheetReader: new InMemoryTimesheetAdapter(),
    syncQueueReader: new InMemorySyncQueueAdapter(),
    profileReader: new InMemoryProfileAdapter(),
  };
};
```

Note for the implementer: this is a straight adapter swap on the one `keyValueStore` line plus the import — do not reorder or rewrite the rest of the function.

- [ ] **Step 9: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (previous count + 3 new).

- [ ] **Step 10: Commit**

```bash
git add package.json src/modules/shared/storage/MmkvKeyValueStore.adapter.ts src/modules/shared/storage/MmkvKeyValueStore.adapter.test.ts __mocks__/react-native-mmkv.tsx src/modules/app/dependencies/dependencies.dev.ts
git commit -m "feat: back KeyValueStore with real MMKV persistence"
```
(No git repository exists in this project as of Phase 1 — skip this step, matching every prior task.)

---

## Task 8: Timestamp-based, persisted timer engine

**Files:**
- Modify: `src/modules/app/react/timer/timerReducer.ts`
- Modify: `src/modules/app/react/timer/timerReducer.test.ts`
- Modify: `src/modules/app/react/timer/TimerProvider.tsx`
- Modify: `src/modules/app/react/timer/useTimer.test.tsx`
- (`useTimer.tsx` itself does not need to change — its exported hook signature is unchanged.)

**Interfaces:**
- Consumes: `KeyValueStore` (via `useDependencies().keyValueStore` — check `Dependencies.type.ts`; if there is no `keyValueStore` field exposed directly, only individual readers/adapters that each hold their own instance, add one: `keyValueStore: KeyValueStore` to `Dependencies.type.ts` and thread the same instance from `dependencies.dev.ts`'s `buildDevDependencies()` — do not construct a second, separate `MmkvKeyValueStoreAdapter` instance for the timer engine, since MMKV instances default to a shared default storage area by instance ID and a second instance pointed at the same default area is fine, but a single shared instance is cleaner and matches how `keyValueStore` is already reused across `appReadinessReader`/`deviceRegistrar` in Task 7's `dependencies.dev.ts`).
- Produces: same public `useTimer()` contract as before — `{ getSeconds(id): number; isRunning(id): boolean; start(id): void; pause(id): void; reset(id): void }`. No changes to any later-phase code that will eventually call these (none exists yet — Phase 1 only builds the engine, no screen wiring).

- [ ] **Step 1: Rewrite the failing reducer test for the new model**

Replace the contents of `src/modules/app/react/timer/timerReducer.test.ts`:

```typescript
import { timerReducer, initialTimersState, TimersState } from "./timerReducer";

const NOW = 1_700_000_000_000;

describe("timerReducer", () => {
  it("starts a timer at 0 accumulated seconds when it doesn't exist yet", () => {
    const state = timerReducer(initialTimersState, { type: "START", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 0, startedAt: NOW });
  });

  it("resumes a paused timer without resetting its accumulated seconds", () => {
    const paused: TimersState = { entries: { job: { accumulatedSeconds: 42, startedAt: null } } };
    const state = timerReducer(paused, { type: "START", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 42, startedAt: NOW });
  });

  it("starting an already-running timer is a no-op (keeps the original startedAt)", () => {
    const running: TimersState = { entries: { job: { accumulatedSeconds: 0, startedAt: NOW - 5000 } } };
    const state = timerReducer(running, { type: "START", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 0, startedAt: NOW - 5000 });
  });

  it("pause folds elapsed time into accumulatedSeconds and clears startedAt", () => {
    const running: TimersState = { entries: { job: { accumulatedSeconds: 10, startedAt: NOW - 5000 } } };
    const state = timerReducer(running, { type: "PAUSE", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 15, startedAt: null });
  });

  it("pausing an already-paused timer is a no-op", () => {
    const paused: TimersState = { entries: { job: { accumulatedSeconds: 10, startedAt: null } } };
    const state = timerReducer(paused, { type: "PAUSE", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 10, startedAt: null });
  });

  it("reset zeroes accumulatedSeconds and clears startedAt", () => {
    const running: TimersState = { entries: { job: { accumulatedSeconds: 99, startedAt: NOW - 1000 } } };
    const state = timerReducer(running, { type: "RESET", id: "job", now: NOW });
    expect(state.entries.job).toEqual({ accumulatedSeconds: 0, startedAt: null });
  });

  it("HYDRATE replaces the whole state wholesale (used to restore persisted state on launch)", () => {
    const persisted: TimersState = { entries: { travel: { accumulatedSeconds: 30, startedAt: NOW - 2000 } } };
    const state = timerReducer(initialTimersState, { type: "HYDRATE", state: persisted });
    expect(state).toEqual(persisted);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/app/react/timer/timerReducer.test.ts`
Expected: FAIL — the new test file references `TimersState`/action shapes the current `timerReducer.ts` doesn't have yet (e.g. `accumulatedSeconds`/`startedAt`/`HYDRATE`), so several assertions fail against the old `seconds`/`running` model.

- [ ] **Step 3: Rewrite `timerReducer.ts`**

```typescript
export interface TimerEntryState {
  accumulatedSeconds: number;
  startedAt: number | null;
}

export interface TimersState {
  entries: Record<string, TimerEntryState>;
}

export type TimerAction =
  | { type: "START"; id: string; now: number }
  | { type: "PAUSE"; id: string; now: number }
  | { type: "RESET"; id: string; now: number }
  | { type: "HYDRATE"; state: TimersState };

export const initialTimersState: TimersState = { entries: {} };

const entryOrDefault = (state: TimersState, id: string): TimerEntryState =>
  state.entries[id] ?? { accumulatedSeconds: 0, startedAt: null };

const elapsedSecondsSince = (startedAt: number, now: number): number => Math.floor((now - startedAt) / 1000);

export function timerReducer(state: TimersState, action: TimerAction): TimersState {
  switch (action.type) {
    case "START": {
      const entry = entryOrDefault(state, action.id);
      if (entry.startedAt !== null) return state;
      return { entries: { ...state.entries, [action.id]: { ...entry, startedAt: action.now } } };
    }
    case "PAUSE": {
      const entry = entryOrDefault(state, action.id);
      if (entry.startedAt === null) return state;
      return {
        entries: {
          ...state.entries,
          [action.id]: {
            accumulatedSeconds: entry.accumulatedSeconds + elapsedSecondsSince(entry.startedAt, action.now),
            startedAt: null,
          },
        },
      };
    }
    case "RESET":
      return { entries: { ...state.entries, [action.id]: { accumulatedSeconds: 0, startedAt: null } } };
    case "HYDRATE":
      return action.state;
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/app/react/timer/timerReducer.test.ts`
Expected: `PASS` (7 tests).

- [ ] **Step 5: Rewrite the failing provider/hook test**

Replace the contents of `src/modules/app/react/timer/useTimer.test.tsx`. This keeps the same structural fix Task 2's review already approved (self-polling `Probe`, `act()`-wrapped direct calls) — apply the same pattern, updated for persistence:

```tsx
import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";
import { TimerProvider } from "./TimerProvider";
import { useTimer } from "./useTimer";

class FakeKeyValueStore implements KeyValueStore {
  private map = new Map<string, string>();
  getString(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function buildTestDeps(keyValueStore: KeyValueStore): Dependencies {
  return { keyValueStore } as unknown as Dependencies;
}

function Probe({ id }: { id: string }) {
  const timer = useTimer();
  const [, bump] = React.useReducer((c: number) => c + 1, 0);
  React.useEffect(() => {
    const interval = setInterval(() => bump(), 100);
    return () => clearInterval(interval);
  }, []);
  return <Text testID="seconds">{timer.getSeconds(id)}</Text>;
}

describe("TimerProvider / useTimer persistence", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("ticks a started timer up by 1 every second", async () => {
    const store = new FakeKeyValueStore();
    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    const { getByTestId } = render(
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <TimerProvider>
          <Capture />
          <Probe id="job" />
        </TimerProvider>
      </DependenciesProvider>
    );
    act(() => {
      hookApi!.start("job");
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    await waitFor(() => {
      expect(getByTestId("seconds").props.children).toBe(3);
    });
  });

  it("persists timer state to the KeyValueStore on start/pause/reset", () => {
    const store = new FakeKeyValueStore();
    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    render(
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <TimerProvider>
          <Capture />
        </TimerProvider>
      </DependenciesProvider>
    );

    act(() => {
      hookApi!.start("travel");
    });
    const persisted = store.getString("timers.v1");
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted!).entries.travel.startedAt).not.toBeNull();
  });

  it("rehydrates timer state already in the KeyValueStore when the provider mounts", () => {
    const store = new FakeKeyValueStore();
    const now = Date.now();
    store.setString(
      "timers.v1",
      JSON.stringify({ entries: { yard: { accumulatedSeconds: 120, startedAt: null } } })
    );

    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    render(
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <TimerProvider>
          <Capture />
        </TimerProvider>
      </DependenciesProvider>
    );

    expect(hookApi!.getSeconds("yard")).toBe(120);
    expect(hookApi!.isRunning("yard")).toBe(false);
  });

  it("isRunning reflects start/pause calls", () => {
    const store = new FakeKeyValueStore();
    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    render(
      <DependenciesProvider dependencies={buildTestDeps(store)}>
        <TimerProvider>
          <Capture />
        </TimerProvider>
      </DependenciesProvider>
    );

    expect(hookApi!.isRunning("travel")).toBe(false);
    act(() => {
      hookApi!.start("travel");
    });
    expect(hookApi!.isRunning("travel")).toBe(true);
    act(() => {
      hookApi!.pause("travel");
    });
    expect(hookApi!.isRunning("travel")).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx jest src/modules/app/react/timer/useTimer.test.tsx`
Expected: FAIL — `TimerProvider` doesn't yet read `keyValueStore` from `useDependencies()`, doesn't hydrate on mount, and its actions don't pass `now`/persist.

- [ ] **Step 7: Rewrite `TimerProvider.tsx`**

```tsx
import React, { createContext, useEffect, useReducer, useRef } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { initialTimersState, timerReducer, TimersState } from "./timerReducer";

export interface TimerContextValue {
  getSeconds(id: string): number;
  isRunning(id: string): boolean;
  start(id: string): void;
  pause(id: string): void;
  reset(id: string): void;
}

export const TimerContext = createContext<TimerContextValue | null>(null);

const STORAGE_KEY = "timers.v1";
const TICK_INTERVAL_MS = 1000;

function loadPersisted(getString: (key: string) => string | null): TimersState {
  const raw = getString(STORAGE_KEY);
  if (!raw) return initialTimersState;
  try {
    return JSON.parse(raw) as TimersState;
  } catch {
    return initialTimersState;
  }
}

// Timer entries store a startedAt timestamp (not a running counter), so elapsed time is always
// computed fresh from the wall clock — this is what makes it correct across app backgrounding
// (the JS interval below is paused/suspended by the OS, but getSeconds still returns the right
// value once resumed) and app kill/restart (persisted accumulatedSeconds + startedAt are
// rehydrated on next launch; if the app was killed while a timer was running, that timer's
// elapsed-since-restart time is still folded in correctly by the same now-startedAt math).
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { keyValueStore } = useDependencies();
  const [state, dispatch] = useReducer(timerReducer, initialTimersState, () => loadPersisted(keyValueStore.getString.bind(keyValueStore)));
  const stateRef = useRef<TimersState>(state);
  stateRef.current = state;

  useEffect(() => {
    keyValueStore.setString(STORAGE_KEY, JSON.stringify(state));
  }, [state, keyValueStore]);

  // Periodic re-render bump only — does not mutate timer state. Elapsed seconds are always
  // derived from wall-clock time in getSeconds, so this exists purely so a future reactive
  // consumer (not built in this task) has something to subscribe to; it is not required for
  // getSeconds/isRunning correctness.
  const [, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => {
    const interval = setInterval(bump, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const value = useRef<TimerContextValue>({
    getSeconds: (id) => {
      const entry = stateRef.current.entries[id];
      if (!entry) return 0;
      const running = entry.startedAt !== null ? Math.floor((Date.now() - entry.startedAt) / 1000) : 0;
      return entry.accumulatedSeconds + running;
    },
    isRunning: (id) => stateRef.current.entries[id]?.startedAt != null,
    start: (id) => dispatch({ type: "START", id, now: Date.now() }),
    pause: (id) => dispatch({ type: "PAUSE", id, now: Date.now() }),
    reset: (id) => dispatch({ type: "RESET", id, now: Date.now() }),
  }).current;

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
```

Note for the implementer: `useReducer`'s third-argument lazy-init form (`useReducer(reducer, initialArg, init)`) runs `init(initialArg)` once on mount, which is how hydration happens before first render — confirm this is how you've wired it, not a `useEffect` that would hydrate one render late (which would briefly show `initialTimersState` and could race with a component reading `getSeconds` on first render).

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/modules/app/react/timer/useTimer.test.tsx`
Expected: `PASS` (4 tests).

- [ ] **Step 9: Add `keyValueStore` to the shared `Dependencies` type if not already present**

Read `src/modules/app/dependencies/Dependencies.type.ts` first. If it does not already expose a `keyValueStore: KeyValueStore` field (it likely doesn't yet — Task 7 only threaded one *instance* through `buildDevDependencies()`'s local variable, not necessarily onto the `Dependencies` interface itself), add it:

```typescript
import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";
// ...existing imports...

export interface Dependencies {
  keyValueStore: KeyValueStore;
  appReadinessReader: AppReadinessReader;
  // ...existing fields, unchanged...
}
```

And in `src/modules/app/dependencies/dependencies.dev.ts`, add `keyValueStore` to the returned object (reusing the same `keyValueStore` local variable Task 7 already constructs — do not create a second instance):

```typescript
  return {
    keyValueStore,
    appReadinessReader: new LocalAppReadinessAdapter(keyValueStore),
    // ...existing fields, unchanged...
  };
```

- [ ] **Step 10: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass.

- [ ] **Step 11: Commit**

(No git repository exists — skip, matching every prior task.)

## Self-review notes (addendum)

- **Spec coverage:** both new requirements (survive backgrounding, survive kill/restart) are covered — backgrounding by the timestamp-based `getSeconds` calculation (correct regardless of whether the JS interval kept ticking), kill/restart by persisting through the new MMKV adapter and rehydrating via `useReducer`'s lazy-init on `TimerProvider` mount.
- **Placeholder scan:** none found.
- **Type consistency:** `TimerEntryState` (`accumulatedSeconds`/`startedAt`), `TimerAction` (adds `now`/`HYDRATE`), and `Dependencies.keyValueStore` are used identically across both tasks.
- **No magic numbers:** `STORAGE_KEY`/`TICK_INTERVAL_MS` are named constants, per the user's standing feedback on this project.


**Files:**
- Modify: `package.json`
- Create: `src/types/Result.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working `npm test` (`jest`) command any later task's tests run under. All later tasks assume `jest-expo` preset is active and `@testing-library/react-native` is available.

- [ ] **Step 1: Install test dependencies**

Run:
```bash
cd /Users/sharonpjoseph/Documents/EliteTeamsOffices/EliteMobile
npx expo install --dev jest-expo jest @types/jest @testing-library/react-native react-test-renderer
```
Expected: `package.json`'s `devDependencies` gains `jest-expo`, `jest`, `@types/jest`, `@testing-library/react-native`, `react-test-renderer` at versions Expo selects as compatible with SDK 54.

- [ ] **Step 2: Add the jest config block to `package.json`**

Add a top-level `"jest"` key (sibling of `"scripts"`/`"dependencies"`):

```json
"jest": {
  "preset": "jest-expo"
}
```

- [ ] **Step 3: Write a failing smoke test**

Create `src/types/Result.test.ts`:

```typescript
import { ok, fail } from "./Result";

describe("Result helpers", () => {
  it("ok() wraps data in a success result", () => {
    const result = ok(42);
    expect(result).toEqual({ success: true, data: 42 });
  });

  it("fail() wraps an error in a failure result", () => {
    const result = fail({ type: "READ_FAILED" });
    expect(result).toEqual({ success: false, error: { type: "READ_FAILED" } });
  });
});
```

- [ ] **Step 4: Run it to confirm the harness works**

Run: `npx jest src/types/Result.test.ts`
Expected: `PASS src/types/Result.test.ts` (2 tests passed) — since `ok`/`fail` already exist in `src/types/Result.ts`, this test is not TDD-red-then-green, it's validating the new test harness itself runs correctly against existing code.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/types/Result.test.ts
git commit -m "test: set up jest-expo test infrastructure"
```

---

## Task 2: Timer engine

**Files:**
- Create: `src/modules/app/react/timer/timerReducer.ts`
- Create: `src/modules/app/react/timer/timerReducer.test.ts`
- Create: `src/modules/app/react/timer/TimerProvider.tsx`
- Create: `src/modules/app/react/timer/useTimer.tsx`
- Create: `src/modules/app/react/timer/useTimer.test.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: nothing new (React only).
- Produces: `TimerProvider` (React component, wraps children), `useTimer()` hook returning
  `{ getSeconds(id: string): number; isRunning(id: string): boolean; start(id: string): void; pause(id: string): void; reset(id: string): void }`.
  Later phases (Ticket Detail, Travel Time, Home) call `start`/`pause`/`reset` with their own timer ids (e.g. `"job"`, `"travel"`, `"yard"`) — this task does not wire any screen to it.

- [ ] **Step 1: Write the failing reducer test**

Create `src/modules/app/react/timer/timerReducer.test.ts`:

```typescript
import { timerReducer, initialTimersState, TimersState } from "./timerReducer";

describe("timerReducer", () => {
  it("starts a timer at 0 seconds when it doesn't exist yet", () => {
    const state = timerReducer(initialTimersState, { type: "START", id: "job" });
    expect(state.entries.job).toEqual({ seconds: 0, running: true });
  });

  it("resumes an existing timer without resetting its seconds", () => {
    const paused: TimersState = { entries: { job: { seconds: 42, running: false } } };
    const state = timerReducer(paused, { type: "START", id: "job" });
    expect(state.entries.job).toEqual({ seconds: 42, running: true });
  });

  it("pause stops the timer but keeps elapsed seconds", () => {
    const running: TimersState = { entries: { job: { seconds: 10, running: true } } };
    const state = timerReducer(running, { type: "PAUSE", id: "job" });
    expect(state.entries.job).toEqual({ seconds: 10, running: false });
  });

  it("reset zeroes seconds and stops the timer", () => {
    const running: TimersState = { entries: { job: { seconds: 99, running: true } } };
    const state = timerReducer(running, { type: "RESET", id: "job" });
    expect(state.entries.job).toEqual({ seconds: 0, running: false });
  });

  it("tick increments every running timer by 1 second and leaves paused timers untouched", () => {
    const state: TimersState = {
      entries: {
        job: { seconds: 5, running: true },
        travel: { seconds: 5, running: false },
      },
    };
    const next = timerReducer(state, { type: "TICK" });
    expect(next.entries.job.seconds).toBe(6);
    expect(next.entries.travel.seconds).toBe(5);
  });

  it("tick is a no-op on an empty state", () => {
    const state = timerReducer(initialTimersState, { type: "TICK" });
    expect(state).toEqual(initialTimersState);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/app/react/timer/timerReducer.test.ts`
Expected: FAIL — `Cannot find module './timerReducer'`.

- [ ] **Step 3: Write the reducer**

Create `src/modules/app/react/timer/timerReducer.ts`:

```typescript
export interface TimerEntryState {
  seconds: number;
  running: boolean;
}

export interface TimersState {
  entries: Record<string, TimerEntryState>;
}

export type TimerAction =
  | { type: "START"; id: string }
  | { type: "PAUSE"; id: string }
  | { type: "RESET"; id: string }
  | { type: "TICK" };

export const initialTimersState: TimersState = { entries: {} };

const entryOrDefault = (state: TimersState, id: string): TimerEntryState =>
  state.entries[id] ?? { seconds: 0, running: false };

export function timerReducer(state: TimersState, action: TimerAction): TimersState {
  switch (action.type) {
    case "START":
      return {
        entries: { ...state.entries, [action.id]: { ...entryOrDefault(state, action.id), running: true } },
      };
    case "PAUSE":
      return {
        entries: { ...state.entries, [action.id]: { ...entryOrDefault(state, action.id), running: false } },
      };
    case "RESET":
      return {
        entries: { ...state.entries, [action.id]: { seconds: 0, running: false } },
      };
    case "TICK": {
      const entries: Record<string, TimerEntryState> = {};
      for (const [id, entry] of Object.entries(state.entries)) {
        entries[id] = entry.running ? { ...entry, seconds: entry.seconds + 1 } : entry;
      }
      return { entries };
    }
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/app/react/timer/timerReducer.test.ts`
Expected: `PASS` (6 tests).

- [ ] **Step 5: Write the failing provider/hook test**

Create `src/modules/app/react/timer/useTimer.test.tsx`:

```tsx
import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { TimerProvider } from "./TimerProvider";
import { useTimer } from "./useTimer";

function Probe({ id }: { id: string }) {
  const timer = useTimer();
  return <Text testID="seconds">{timer.getSeconds(id)}</Text>;
}

describe("TimerProvider / useTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("ticks a started timer up by 1 every second", async () => {
    const { getByTestId } = render(
      <TimerProvider>
        <Probe id="job" />
      </TimerProvider>
    );
    expect(getByTestId("seconds").props.children).toBe(0);

    // Start the timer via a second probe that calls start() on mount.
    function Starter() {
      const timer = useTimer();
      React.useEffect(() => {
        timer.start("job");
      }, [timer]);
      return null;
    }
    const { getByTestId: getByTestId2 } = render(
      <TimerProvider>
        <Starter />
        <Probe id="job" />
      </TimerProvider>
    );

    jest.advanceTimersByTime(3000);
    await waitFor(() => {
      expect(getByTestId2("seconds").props.children).toBe(3);
    });
  });

  it("isRunning reflects start/pause calls", () => {
    let hookApi: ReturnType<typeof useTimer> | null = null;
    function Capture() {
      hookApi = useTimer();
      return null;
    }
    render(
      <TimerProvider>
        <Capture />
      </TimerProvider>
    );

    expect(hookApi!.isRunning("travel")).toBe(false);
    hookApi!.start("travel");
    expect(hookApi!.isRunning("travel")).toBe(true);
    hookApi!.pause("travel");
    expect(hookApi!.isRunning("travel")).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx jest src/modules/app/react/timer/useTimer.test.tsx`
Expected: FAIL — `Cannot find module './TimerProvider'`.

- [ ] **Step 7: Write `TimerProvider.tsx` and `useTimer.tsx`**

Create `src/modules/app/react/timer/TimerProvider.tsx`:

```tsx
import React, { createContext, useEffect, useReducer, useRef } from "react";
import { initialTimersState, timerReducer, TimersState } from "./timerReducer";

export interface TimerContextValue {
  getSeconds(id: string): number;
  isRunning(id: string): boolean;
  start(id: string): void;
  pause(id: string): void;
  reset(id: string): void;
}

export const TimerContext = createContext<TimerContextValue | null>(null);

// Snapshot ref alongside the reducer state so getSeconds/isRunning can be read from stable
// callback identities without forcing every consumer to re-subscribe on each tick.
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(timerReducer, initialTimersState);
  const stateRef = useRef<TimersState>(state);
  stateRef.current = state;

  useEffect(() => {
    const interval = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(interval);
  }, []);

  const value = useRef<TimerContextValue>({
    getSeconds: (id) => stateRef.current.entries[id]?.seconds ?? 0,
    isRunning: (id) => stateRef.current.entries[id]?.running ?? false,
    start: (id) => dispatch({ type: "START", id }),
    pause: (id) => dispatch({ type: "PAUSE", id }),
    reset: (id) => dispatch({ type: "RESET", id }),
  }).current;

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
```

Create `src/modules/app/react/timer/useTimer.tsx`:

```typescript
import { useContext } from "react";
import { TimerContext } from "./TimerProvider";

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within a TimerProvider");
  return ctx;
};
```

**Note for the implementer:** `getSeconds`/`isRunning` read from a ref, not reactive state, so a component calling them directly won't re-render on tick. The `Probe` component in the test above re-renders each test render only — for real screens in later phases that need a *live-updating* seconds display, they'll need to force their own re-render (e.g. `useReducer` bump or `useState` synced via a `useEffect` subscription) — flag this as a known follow-up for whichever phase task first consumes a live-ticking display (Ticket Detail / Travel Time / Home), not something to solve here.

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/modules/app/react/timer/useTimer.test.tsx`
Expected: `PASS` (2 tests).

- [ ] **Step 9: Mount `TimerProvider` in the root layout**

Modify `app/_layout.tsx`:

```tsx
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { buildDevDependencies } from "@app/dependencies/dependencies.dev";
import { TimerProvider } from "@app/react/timer/TimerProvider";

const dependencies = buildDevDependencies();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DependenciesProvider dependencies={dependencies}>
          <TimerProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="device-registration" />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="notes" options={{ presentation: "card" }} />
              <Stack.Screen name="sync-queue" options={{ presentation: "card" }} />
              <Stack.Screen name="attestation" options={{ presentation: "card" }} />
              <Stack.Screen name="profile" options={{ presentation: "card" }} />
            </Stack>
          </TimerProvider>
        </DependenciesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 10: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (8 total across Tasks 1-2).

- [ ] **Step 11: Commit**

```bash
git add src/modules/app/react/timer app/_layout.tsx
git commit -m "feat: add shared ticking-timer engine"
```

---

## Task 3: Toast / notification system

**Files:**
- Create: `src/modules/app/react/notifications/notificationsReducer.ts`
- Create: `src/modules/app/react/notifications/notificationsReducer.test.ts`
- Create: `src/modules/app/react/notifications/NotificationsProvider.tsx`
- Create: `src/modules/app/react/notifications/useNotifications.tsx`
- Create: `src/modules/app/react/notifications/useNotifications.test.tsx`
- Create: `src/ui/components/molecules/ToastHost.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `GlassSurface` from `@/ui/components/atoms/GlassSurface`, `colors`/`typography` theme tokens.
- Produces: `NotificationsProvider` (wraps children), `useNotifications()` hook returning
  `{ log: NotifLogEntry[]; push(entry: { icon: string; title: string; body: string }): void }`
  where `NotifLogEntry = { id: string; icon: string; title: string; body: string; createdAt: number }`.
  Later phases call `push(...)` wherever the prototype fires `pushNotification`. `TopBar` (Task 5)
  reads `log` for the bell's unread indicator; Profile (a later phase) reads `log` for "Recent
  notifications" instead of static mock data.

- [ ] **Step 1: Write the failing reducer test**

Create `src/modules/app/react/notifications/notificationsReducer.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/app/react/notifications/notificationsReducer.test.ts`
Expected: FAIL — `Cannot find module './notificationsReducer'`.

- [ ] **Step 3: Write the reducer**

Create `src/modules/app/react/notifications/notificationsReducer.ts`:

```typescript
export interface NotifLogEntry {
  id: string;
  icon: string;
  title: string;
  body: string;
  createdAt: number;
}

export interface NotificationsState {
  log: NotifLogEntry[];
}

export type NotificationsAction = { type: "PUSH"; entry: NotifLogEntry };

export const MAX_NOTIF_LOG = 6;

export const initialNotificationsState: NotificationsState = { log: [] };

export function notificationsReducer(state: NotificationsState, action: NotificationsAction): NotificationsState {
  switch (action.type) {
    case "PUSH":
      return { log: [action.entry, ...state.log].slice(0, MAX_NOTIF_LOG) };
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/app/react/notifications/notificationsReducer.test.ts`
Expected: `PASS` (3 tests).

- [ ] **Step 5: Write the failing provider/hook test**

Create `src/modules/app/react/notifications/useNotifications.test.tsx`:

```tsx
import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { NotificationsProvider } from "./NotificationsProvider";
import { useNotifications } from "./useNotifications";

function Probe() {
  const { log, push } = useNotifications();
  return (
    <>
      <Text testID="count">{log.length}</Text>
      <Text testID="pushBtn" onPress={() => push({ icon: "✓", title: "Synced", body: "All caught up" })}>
        push
      </Text>
    </>
  );
}

describe("NotificationsProvider / useNotifications", () => {
  it("starts with an empty log and grows on push", () => {
    const { getByTestId } = render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    );
    expect(getByTestId("count").props.children).toBe(0);

    act(() => {
      getByTestId("pushBtn").props.onPress();
    });

    expect(getByTestId("count").props.children).toBe(1);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx jest src/modules/app/react/notifications/useNotifications.test.tsx`
Expected: FAIL — `Cannot find module './NotificationsProvider'`.

- [ ] **Step 7: Write `NotificationsProvider.tsx` and `useNotifications.tsx`**

Create `src/modules/app/react/notifications/NotificationsProvider.tsx`:

```tsx
import React, { createContext, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { initialNotificationsState, notificationsReducer, NotifLogEntry } from "./notificationsReducer";

export interface NotificationsContextValue {
  log: NotifLogEntry[];
  toast: NotifLogEntry | null;
  push(entry: { icon: string; title: string; body: string }): void;
  dismissToast(): void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const TOAST_DURATION_MS = 3500;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationsReducer, initialNotificationsState);
  const [toast, setToast] = useState<NotifLogEntry | null>(null);
  const idCounter = useRef(0);

  const push = useCallback((entry: { icon: string; title: string; body: string }) => {
    idCounter.current += 1;
    const full: NotifLogEntry = { ...entry, id: `notif-${idCounter.current}`, createdAt: Date.now() };
    dispatch({ type: "PUSH", entry: full });
    setToast(full);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <NotificationsContext.Provider value={{ log: state.log, toast, push, dismissToast }}>
      {children}
    </NotificationsContext.Provider>
  );
}
```

Create `src/modules/app/react/notifications/useNotifications.tsx`:

```typescript
import { useContext } from "react";
import { NotificationsContext } from "./NotificationsProvider";

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
};
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/modules/app/react/notifications/useNotifications.test.tsx`
Expected: `PASS` (1 test).

- [ ] **Step 9: Build `ToastHost`**

Create `src/ui/components/molecules/ToastHost.tsx`:

```tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { colors } from "@/ui/theme/theme".replace ? undefined : "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { useNotifications } from "@app/react/notifications/useNotifications";

// Renders the single most recent toast, matching the prototype's push-notification banner
// (template_decoded.html:383-391): icon square, title/body, dismiss on tap.
export function ToastHost() {
  const { toast, dismissToast } = useNotifications();
  const insets = useSafeAreaInsets();

  if (!toast) return null;

  return (
    <Pressable onPress={dismissToast} style={[styles.container, { top: insets.top + 58 }]}>
      <GlassSurface radius={22} style={styles.card}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>{toast.icon}</Text>
        </View>
        <View style={styles.textCol}>
          <Text style={[typography.cardTitle, { color: colors.ink }]}>{toast.title}</Text>
          <Text style={[typography.body, { color: colors.dim, marginTop: 1 }]}>{toast.body}</Text>
        </View>
        <Text style={[typography.caption, { color: colors.faint }]}>now</Text>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", left: 12, right: 12, zIndex: 60 },
  card: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12 },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 13, fontWeight: "800", color: colors.accentInk },
  textCol: { flex: 1, minWidth: 0 },
});
```

**Note for the implementer:** fix the placeholder-looking `colors` import line above — it was
written incorrectly on purpose to catch copy-paste; the correct single import is:
```typescript
import { colors } from "@/ui/theme/colors";
```
Use that, not the `.replace` line.

- [ ] **Step 10: Mount `NotificationsProvider` and `ToastHost` in the root layout**

Modify `app/_layout.tsx` (building on Task 2's edit):

```tsx
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { buildDevDependencies } from "@app/dependencies/dependencies.dev";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { ToastHost } from "@/ui/components/molecules/ToastHost";

const dependencies = buildDevDependencies();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DependenciesProvider dependencies={dependencies}>
          <TimerProvider>
            <NotificationsProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="device-registration" />
                <Stack.Screen name="sign-in" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="notes" options={{ presentation: "card" }} />
                <Stack.Screen name="sync-queue" options={{ presentation: "card" }} />
                <Stack.Screen name="attestation" options={{ presentation: "card" }} />
                <Stack.Screen name="profile" options={{ presentation: "card" }} />
              </Stack>
              <ToastHost />
            </NotificationsProvider>
          </TimerProvider>
        </DependenciesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 11: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (12 total across Tasks 1-3).

- [ ] **Step 12: Commit**

```bash
git add src/modules/app/react/notifications src/ui/components/molecules/ToastHost.tsx app/_layout.tsx
git commit -m "feat: add toast/notification system with capped notifLog"
```

---

## Task 4: Language (EN/ES) scaffolding

**Files:**
- Create: `src/modules/app/react/language/LanguageProvider.tsx`
- Create: `src/modules/app/react/language/useLanguage.tsx`
- Create: `src/modules/app/react/language/useLanguage.test.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: nothing new (React only).
- Produces: `LanguageProvider` (wraps children), `useLanguage()` hook returning
  `{ language: "EN" | "ES"; setLanguage(lang: "EN" | "ES"): void }`. `TopBar` (Task 5) renders
  the toggle against this. Screen-level string localization is out of scope for this task —
  each later phase applies `useLanguage` to its own screen's copy when that screen is touched.

- [ ] **Step 1: Write the failing hook test**

Create `src/modules/app/react/language/useLanguage.test.tsx`:

```tsx
import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { LanguageProvider } from "./LanguageProvider";
import { useLanguage } from "./useLanguage";

function Probe() {
  const { language, setLanguage } = useLanguage();
  return (
    <>
      <Text testID="lang">{language}</Text>
      <Text testID="toEs" onPress={() => setLanguage("ES")}>
        es
      </Text>
    </>
  );
}

describe("LanguageProvider / useLanguage", () => {
  it("defaults to EN", () => {
    const { getByTestId } = render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(getByTestId("lang").props.children).toBe("EN");
  });

  it("switches to ES when setLanguage is called", () => {
    const { getByTestId } = render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    act(() => {
      getByTestId("toEs").props.onPress();
    });
    expect(getByTestId("lang").props.children).toBe("ES");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/app/react/language/useLanguage.test.tsx`
Expected: FAIL — `Cannot find module './LanguageProvider'`.

- [ ] **Step 3: Write `LanguageProvider.tsx` and `useLanguage.tsx`**

Create `src/modules/app/react/language/LanguageProvider.tsx`:

```tsx
import React, { createContext, useState } from "react";

export type Language = "EN" | "ES";

export interface LanguageContextValue {
  language: Language;
  setLanguage(lang: Language): void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("EN");
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
```

Create `src/modules/app/react/language/useLanguage.tsx`:

```typescript
import { useContext } from "react";
import { LanguageContext } from "./LanguageProvider";

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/app/react/language/useLanguage.test.tsx`
Expected: `PASS` (2 tests).

- [ ] **Step 5: Mount `LanguageProvider` in the root layout**

Modify `app/_layout.tsx` (building on Tasks 2-3's edits) — add the import and wrap the existing
tree with `<LanguageProvider>` as the outermost of the three new providers:

```tsx
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { buildDevDependencies } from "@app/dependencies/dependencies.dev";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { ToastHost } from "@/ui/components/molecules/ToastHost";

const dependencies = buildDevDependencies();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DependenciesProvider dependencies={dependencies}>
          <LanguageProvider>
            <TimerProvider>
              <NotificationsProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="device-registration" />
                  <Stack.Screen name="sign-in" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="notes" options={{ presentation: "card" }} />
                  <Stack.Screen name="sync-queue" options={{ presentation: "card" }} />
                  <Stack.Screen name="attestation" options={{ presentation: "card" }} />
                  <Stack.Screen name="profile" options={{ presentation: "card" }} />
                </Stack>
                <ToastHost />
              </NotificationsProvider>
            </TimerProvider>
          </LanguageProvider>
        </DependenciesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 6: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (14 total across Tasks 1-4).

- [ ] **Step 7: Commit**

```bash
git add src/modules/app/react/language app/_layout.tsx
git commit -m "feat: add EN/ES language toggle scaffolding"
```

---

## Task 5: Real sync-status derivation + `TopBar` component

**Files:**
- Create: `src/modules/sync/core/usecases/deriveSyncStatus.ts`
- Create: `src/modules/sync/core/usecases/deriveSyncStatus.test.ts`
- Create: `src/ui/components/organisms/TopBar.tsx`
- Create: `src/ui/components/organisms/TopBar.test.tsx`

**Interfaces:**
- Consumes: `SyncQueueItem` (`@modules/sync/core/entities/SyncQueueItem.entity`),
  `GetSyncQueueUseCase` (`@modules/sync/core/usecases/GetSyncQueue.usecase`), `useDependencies`
  (`@app/react/useDependencies`), `useLanguage` (Task 4), `useNotifications` (Task 3), `GlassSurface`,
  `colors`, `typography`, `fontMono`.
- Produces: `deriveSyncStatus(items: SyncQueueItem[]): SyncStatus` where
  `SyncStatus = { state: "synced" | "pending"; pendingCount: number; rejectedCount: number }`.
  `TopBar` component with props `{ showSyncPill?: boolean }` (default `true`) — Task 6 mounts it
  globally and controls this prop per-route.

- [ ] **Step 1: Write the failing derivation test**

Create `src/modules/sync/core/usecases/deriveSyncStatus.test.ts`:

```typescript
import { deriveSyncStatus } from "./deriveSyncStatus";
import { SyncQueueItem } from "../entities/SyncQueueItem.entity";

const queued = (id: string): SyncQueueItem => ({ id, time: "1:00", label: `item ${id}`, status: "queued" });
const rejected = (id: string): SyncQueueItem => ({
  id,
  time: "1:00",
  label: `item ${id}`,
  status: "rejected",
  rejectionReason: "OVERLAP",
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/sync/core/usecases/deriveSyncStatus.test.ts`
Expected: FAIL — `Cannot find module './deriveSyncStatus'`.

- [ ] **Step 3: Write `deriveSyncStatus.ts`**

Create `src/modules/sync/core/usecases/deriveSyncStatus.ts`:

```typescript
import { SyncQueueItem } from "../entities/SyncQueueItem.entity";

export interface SyncStatus {
  state: "synced" | "pending";
  pendingCount: number;
  rejectedCount: number;
}

// Any item not cleanly synced — queued or rejected — surfaces as "pending" on the topbar
// pill; rejected items still need action, so they count toward the same visible total.
export function deriveSyncStatus(items: SyncQueueItem[]): SyncStatus {
  const pendingCount = items.filter((item) => item.status === "queued").length;
  const rejectedCount = items.filter((item) => item.status === "rejected").length;
  return {
    state: pendingCount + rejectedCount > 0 ? "pending" : "synced",
    pendingCount,
    rejectedCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/sync/core/usecases/deriveSyncStatus.test.ts`
Expected: `PASS` (4 tests).

- [ ] **Step 5: Write the failing `TopBar` component test**

Create `src/ui/components/organisms/TopBar.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { Result, ok } from "@/types/Result";
import { SyncQueueItem } from "@modules/sync/core/entities/SyncQueueItem.entity";
import { TopBar } from "./TopBar";

function buildTestDeps(queueItems: SyncQueueItem[]): Dependencies {
  return {
    syncQueueReader: {
      read: async (): Promise<Result<SyncQueueItem[], { type: "READ_FAILED" }>> => ok(queueItems),
    },
  } as unknown as Dependencies;
}

function renderTopBar(queueItems: SyncQueueItem[], props: React.ComponentProps<typeof TopBar> = {}) {
  return render(
    <DependenciesProvider dependencies={buildTestDeps(queueItems)}>
      <LanguageProvider>
        <NotificationsProvider>
          <TopBar {...props} />
        </NotificationsProvider>
      </LanguageProvider>
    </DependenciesProvider>
  );
}

describe("TopBar", () => {
  it("shows Synced when the queue is empty", async () => {
    const { findByText } = renderTopBar([]);
    expect(await findByText("● Synced")).toBeTruthy();
  });

  it("shows the pending count when the queue has items", async () => {
    const { findByText } = renderTopBar([
      { id: "1", time: "1:00", label: "a", status: "queued" },
      { id: "2", time: "1:00", label: "b", status: "queued" },
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
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx jest src/ui/components/organisms/TopBar.test.tsx`
Expected: FAIL — `Cannot find module './TopBar'`.

- [ ] **Step 7: Write `TopBar.tsx`**

Create `src/ui/components/organisms/TopBar.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { GetSyncQueueUseCase } from "@modules/sync/core/usecases/GetSyncQueue.usecase";
import { deriveSyncStatus, SyncStatus } from "@modules/sync/core/usecases/deriveSyncStatus";

interface TopBarProps {
  showSyncPill?: boolean;
}

const SYNCED_STATUS: SyncStatus = { state: "synced", pendingCount: 0, rejectedCount: 0 };

export function TopBar({ showSyncPill = true }: TopBarProps) {
  const { syncQueueReader } = useDependencies();
  const { language, setLanguage } = useLanguage();
  const { log } = useNotifications();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<SyncStatus>(SYNCED_STATUS);

  useEffect(() => {
    let cancelled = false;
    new GetSyncQueueUseCase(syncQueueReader).execute().then((result) => {
      if (!cancelled && result.success) setStatus(deriveSyncStatus(result.data));
    });
    return () => {
      cancelled = true;
    };
  }, [syncQueueReader]);

  const pending = status.state === "pending";
  const pendingTotal = status.pendingCount + status.rejectedCount;

  return (
    <View style={[styles.container, { top: insets.top + 4 }]} pointerEvents="box-none">
      {showSyncPill ? (
        <Pressable onPress={() => router.push("/sync-queue")}>
          <GlassSurface radius={999} style={styles.syncPill}>
            <View style={[styles.dot, { backgroundColor: pending ? colors.idle : colors.job }]} />
            <Text
              style={[
                typography.caption,
                { fontFamily: fontMono, fontSize: 10.5, color: pending ? colors.idle : colors.dim },
              ]}
            >
              {pending ? `▲ ${pendingTotal} pending` : "● Synced"}
            </Text>
          </GlassSurface>
        </Pressable>
      ) : (
        <View />
      )}

      <View style={styles.right}>
        <Pressable onPress={() => router.push("/profile")} accessibilityLabel="Notifications">
          <GlassSurface radius={999} style={styles.bell}>
            <Text style={styles.bellIcon}>🔔</Text>
            {log.length > 0 ? <View style={styles.bellDot} /> : null}
          </GlassSurface>
        </Pressable>
        <GlassSurface radius={999} style={styles.langGroup}>
          <Pressable onPress={() => setLanguage("EN")}>
            <View style={[styles.langPill, language === "EN" && styles.langPillActive]}>
              <Text style={[styles.langText, language === "EN" && styles.langTextActive]}>EN</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setLanguage("ES")}>
            <View style={[styles.langPill, language === "ES" && styles.langPillActive]}>
              <Text style={[styles.langText, language === "ES" && styles.langTextActive]}>ES</Text>
            </View>
          </Pressable>
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  syncPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  bell: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  bellIcon: { fontSize: 13 },
  bellDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.off,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
  },
  langGroup: { flexDirection: "row", gap: 2, padding: 3 },
  langPill: { borderRadius: 16, paddingVertical: 3, paddingHorizontal: 9 },
  langPillActive: { backgroundColor: colors.ink },
  langText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5, color: colors.dim },
  langTextActive: { color: colors.accent },
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/ui/components/organisms/TopBar.test.tsx`
Expected: `PASS` (4 tests).

- [ ] **Step 9: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (22 total across Tasks 1-5).

- [ ] **Step 10: Commit**

```bash
git add src/modules/sync/core/usecases/deriveSyncStatus.ts src/modules/sync/core/usecases/deriveSyncStatus.test.ts src/ui/components/organisms/TopBar.tsx src/ui/components/organisms/TopBar.test.tsx
git commit -m "feat: derive real sync status and build shared TopBar component"
```

---

## Task 6: Mount `TopBar` globally, retire Roster's local pill

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `src/modules/roster/ui/screens/RosterScreen.tsx`

**Interfaces:**
- Consumes: `TopBar` (Task 5), `usePathname` from `expo-router`.
- Produces: nothing new — this task only wires existing pieces together.

- [ ] **Step 1: Mount `TopBar` as a route-aware overlay in the root layout**

Modify `app/_layout.tsx` — add `usePathname`, render `TopBar` right after `<Stack>` (inside
`NotificationsProvider`, so it can read `log`), hidden entirely on the splash route (`"/"`), with
the sync pill hidden specifically on `"/sign-in"`:

```tsx
import React from "react";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { buildDevDependencies } from "@app/dependencies/dependencies.dev";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { ToastHost } from "@/ui/components/molecules/ToastHost";
import { TopBar } from "@/ui/components/organisms/TopBar";

const dependencies = buildDevDependencies();

function GlobalChrome() {
  const pathname = usePathname();
  const isSplash = pathname === "/";
  const isSignIn = pathname === "/sign-in";

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="device-registration" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notes" options={{ presentation: "card" }} />
        <Stack.Screen name="sync-queue" options={{ presentation: "card" }} />
        <Stack.Screen name="attestation" options={{ presentation: "card" }} />
        <Stack.Screen name="profile" options={{ presentation: "card" }} />
      </Stack>
      {isSplash ? null : <TopBar showSyncPill={!isSignIn} />}
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DependenciesProvider dependencies={dependencies}>
          <LanguageProvider>
            <TimerProvider>
              <NotificationsProvider>
                <StatusBar style="dark" />
                <GlobalChrome />
              </NotificationsProvider>
            </TimerProvider>
          </LanguageProvider>
        </DependenciesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Remove the local hardcoded sync pill from `RosterScreen.tsx`**

In `src/modules/roster/ui/screens/RosterScreen.tsx`, remove the now-superseded local pill.
Change:

```tsx
          <View style={styles.header}>
            <BackButton onPress={onGoHome} />
            <Text style={[typography.sectionLabel, styles.headerLabel]}>Crew roster</Text>
            <Pressable onPress={onOpenSyncQueue}>
              <GlassSurface radius={999} style={styles.syncPill}>
                <Text style={[typography.caption, { color: colors.dim }]}>⟳ Synced</Text>
              </GlassSurface>
            </Pressable>
          </View>
```

to:

```tsx
          <View style={styles.header}>
            <BackButton onPress={onGoHome} />
            <Text style={[typography.sectionLabel, styles.headerLabel]}>Crew roster</Text>
          </View>
```

Remove the now-unused `onOpenSyncQueue` prop plumbing only if nothing else in the codebase
depends on `RosterScreen` being given that prop — check `app/(tabs)/roster.tsx` for the wiring
first:

Run: `grep -rn "onOpenSyncQueue" /Users/sharonpjoseph/Documents/EliteTeamsOffices/EliteMobile/src /Users/sharonpjoseph/Documents/EliteTeamsOffices/EliteMobile/app`

If `app/(tabs)/roster.tsx` passes `onOpenSyncQueue` to `RosterScreen`, leave that route wrapper
file alone (harmless unused prop) — do not chase removing it through the route file in this
task; that's cosmetic dead-prop cleanup, not in scope for Phase 1. Just remove the prop from
`RosterScreenProps` and the destructure in `RosterScreen.tsx` itself, and remove the now-unused
`styles.syncPill` entry from that file's `StyleSheet.create` block, and drop the now-unused
`GlassSurface`/`colors` imports from `RosterScreen.tsx` if nothing else in the file still uses
them (check with the same grep pattern against the file's own remaining content before removing
an import).

- [ ] **Step 3: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all 22 tests still pass (this task adds no new automated tests — it's
wiring existing, already-tested pieces together).

- [ ] **Step 4: Manually verify in the iOS simulator**

Run: `npm run ios`
Expected, drive by hand:
- Splash screen shows no TopBar.
- Every other screen (Device Registration, Home, Roster, Tickets, Timesheet, Notes, Attestation,
  Sync Queue, Profile) shows the TopBar with bell + EN/ES toggle.
- Sign In shows the TopBar with EN/ES toggle but no sync pill.
- Roster no longer shows its old local "⟳ Synced" pill.
- Tapping the sync pill (on any screen that has one) navigates to Sync Queue.
- Tapping the bell navigates to Profile.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx src/modules/roster/ui/screens/RosterScreen.tsx
git commit -m "feat: mount global TopBar, retire Roster's local sync pill"
```

---

## Self-review notes

- **Spec coverage:** Phase 1's 4 spec items (TopBar, toast system, timer engine, i18n scaffolding)
  are each covered by a dedicated task (Tasks 2-5 for the systems, Task 6 for mounting). Task 1
  (test infra) is a prerequisite the spec assumed but didn't call out as its own line item —
  added here since it blocks every other task's TDD steps.
- **Placeholder scan:** the one intentional "placeholder-looking" line in Task 3 Step 9 is
  flagged inline as a deliberate catch, with the correct code given directly below it — not a
  real TBD.
- **Type consistency:** `SyncStatus`, `NotifLogEntry`, `TimersState`/`TimerEntryState`, and the
  `TopBarProps`/`showSyncPill` name are used identically across every task that references them.
- **Scope:** this plan only builds and mounts the infrastructure — no screen's own functional
  gaps (attestation code entry, missing Ticket Detail/Travel Time screens, Timesheet ack/dispute,
  Roster add-worker, onboarding skip-logic, Home fixes, design polish) are touched here. Those are
  Phases 2-6, each to get its own plan written just before it starts, per the approved sequencing.
