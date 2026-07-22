# Phase 2 — Security Fix + Missing Screens Implementation Plan

**Goal:** Close the highest-severity gaps from the prototype-fidelity audit: the Attestation screen's missing employee-code verification (currently anyone can confirm anyone's punch), and the two entirely missing screens — Ticket Detail and Travel Time — that tapping any job currently skips in favor of jumping straight to Notes.

**Architecture:** Follow this codebase's clean-architecture module pattern (`core/entities`, `core/ports`, `core/usecases`, `infrastructure/adapters`, `ui/screens`, `ui/viewModels`) exactly as established in Phase 1's audit and the pre-existing modules (`tickets`, `clock`, `roster`). Use Phase 1's shared infrastructure where it fits: `useTimer` (job/travel/meal timers, survives backgrounding/kill/restart), `useNotifications` (toasts for meal-break/travel/attestation events), `TopBar` (already globally mounted, no changes needed here).

**Tech Stack:** React Native 0.81 / Expo SDK 54 / expo-router 6 / TypeScript 5.9 / jest-expo.

## Global Constraints

- Do NOT modify `src/ui/components/atoms/GlassSurface.tsx` or `app/(tabs)/_layout.tsx` — off-limits.
- No magic numbers — named constants for thresholds/durations/caps (e.g. `MEAL_MINIMUM_MINUTES`, `ARRIVAL_SIMULATION_MS`, `MIN_CODE_LENGTH`).
- Localize new user-facing screen copy through `useLanguage()` (EN/ES) as each screen is built — this is standing project guidance, not optional for "later."
- Match existing patterns: `GlassSurface` for all card/pill surfaces, `PillButton`/`BackButton` atoms where they fit, `colors`/`typography` theme tokens, `Pressable` + `expo-haptics` for taps, `Result<T,E>` return type for usecases.
- This project has NO git repository — skip any "git add"/"git commit" step in every task below.
- Existing route convention: flat files in `app/` (e.g. `app/attestation.tsx`, `app/sync-queue.tsx`) are thin wrappers that import a screen component and wire `expo-router`'s `router` to its navigation props. New routes (`app/ticket-detail.tsx`, `app/travel.tsx`) must follow this exactly and be registered in `app/_layout.tsx`'s `<Stack>`.

---

## Task 1: Attestation employee-code security fix

**Files:**
- Modify: `src/modules/roster/core/entities/RosterWorker.entity.ts`
- Modify: `src/modules/roster/infrastructure/adapters/InMemoryCrewRoster.adapter.ts`
- Modify: `src/modules/roster/ui/viewModels/useRoster.viewModel.tsx`
- Modify: `src/modules/clock/core/entities/AttestationWorker.entity.ts`
- Modify: `src/modules/clock/ui/viewModels/useAttestation.viewModel.tsx`
- Test: `src/modules/clock/ui/viewModels/useAttestation.viewModel.test.tsx`
- Modify: `src/modules/clock/ui/screens/AttestationScreen.tsx`

**Interfaces:**
- Consumes: nothing new from other modules.
- Produces: `RosterWorker`/`AttestationWorker` both gain `employeeCode: string`. `useAttestationViewModel`'s returned `state` gains `{ code: string; codeError: boolean }`, `handlers` gains `{ onCodeChange(value: string): void }`; `onConfirm` is now gated on a correct code match. No other module consumes this yet.

- [ ] **Step 1: Add `employeeCode` to the roster and attestation entities**

Modify `src/modules/roster/core/entities/RosterWorker.entity.ts`:
```typescript
import { WorkerId } from "@/types/ids";

export interface RosterWorker {
  id: WorkerId;
  name: string;
  initials: string;
  statusText: string;
  statusKind: "job" | "travel" | "idle" | "off";
  employeeCode: string;
}
```

Modify `src/modules/clock/core/entities/AttestationWorker.entity.ts`:
```typescript
import { WorkerId } from "@/types/ids";

export type PunchDirection = "IN" | "OUT";

export interface AttestationWorker {
  id: WorkerId;
  name: string;
  initials: string;
  direction: PunchDirection;
  employeeCode: string;
}
```

- [ ] **Step 2: Add mock employee codes to the roster adapter**

Modify `src/modules/roster/infrastructure/adapters/InMemoryCrewRoster.adapter.ts` — add an `employeeCode` to each mock worker:
```typescript
const MOCK_ROSTER: RosterWorker[] = [
  { id: "roy-brown" as WorkerId, name: "Roy Brown", initials: "RB", statusText: "Clocked in — Job 1", statusKind: "job", employeeCode: "4821" },
  { id: "brent-m" as WorkerId, name: "Brent M.", initials: "BM", statusText: "On travel", statusKind: "travel", employeeCode: "7734" },
  { id: "luis-t" as WorkerId, name: "Luis T.", initials: "LT", statusText: "Not clocked in", statusKind: "idle", employeeCode: "1029" },
  { id: "dana-k" as WorkerId, name: "Dana K.", initials: "DK", statusText: "Off today", statusKind: "off", employeeCode: "5566" },
];
```

- [ ] **Step 3: Thread `employeeCode` through `buildAttestationQueue`**

Modify `src/modules/roster/ui/viewModels/useRoster.viewModel.tsx`'s `buildAttestationQueue`:
```typescript
  const buildAttestationQueue = () => {
    const pool = selectedIds.size > 0 ? workers.filter((w) => selectedIds.has(w.id)) : workers;
    return pool.map((worker) => ({
      id: worker.id,
      name: worker.name,
      initials: worker.initials,
      direction: DIRECTION_FOR_STATUS[worker.statusKind],
      employeeCode: worker.employeeCode,
    }));
  };
```

- [ ] **Step 4: Write the failing viewModel test**

Create `src/modules/clock/ui/viewModels/useAttestation.viewModel.test.tsx`. First read `src/modules/clock/core/usecases/ConfirmAttestation.usecase.ts` and `src/modules/clock/infrastructure/adapters/InMemoryPunchRecorder.adapter.ts` to build a correct test double, then write:

```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { useAttestationViewModel } from "./useAttestation.viewModel";
import { AttestationWorker } from "../../core/entities/AttestationWorker.entity";
import { WorkerId } from "@/types/ids";

const QUEUE: AttestationWorker[] = [
  { id: "roy-brown" as WorkerId, name: "Roy Brown", initials: "RB", direction: "IN", employeeCode: "4821" },
  { id: "brent-m" as WorkerId, name: "Brent M.", initials: "BM", direction: "OUT", employeeCode: "7734" },
];

function buildTestDeps(): Dependencies {
  return {
    punchRecorder: { record: async () => ok(undefined) },
  } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <DependenciesProvider dependencies={buildTestDeps()}>{children}</DependenciesProvider>;
}

describe("useAttestationViewModel — employee code verification", () => {
  it("does not advance and sets codeError when the code doesn't match", async () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useAttestationViewModel({ queue: QUEUE, onDone }), { wrapper });

    act(() => result.current.handlers.onCodeChange("0000"));
    await act(async () => result.current.handlers.onConfirm());

    expect(result.current.state.current?.id).toBe("roy-brown");
    expect(result.current.state.codeError).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("advances to the next worker and clears the code when it matches", async () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useAttestationViewModel({ queue: QUEUE, onDone }), { wrapper });

    act(() => result.current.handlers.onCodeChange("4821"));
    await act(async () => result.current.handlers.onConfirm());

    expect(result.current.state.current?.id).toBe("brent-m");
    expect(result.current.state.code).toBe("");
    expect(result.current.state.codeError).toBe(false);
  });

  it("clears a stale error once the code is edited again", async () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useAttestationViewModel({ queue: QUEUE, onDone }), { wrapper });

    act(() => result.current.handlers.onCodeChange("0000"));
    await act(async () => result.current.handlers.onConfirm());
    expect(result.current.state.codeError).toBe(true);

    act(() => result.current.handlers.onCodeChange("482"));
    expect(result.current.state.codeError).toBe(false);
  });

  it("calls onDone after the last worker confirms with the correct code", async () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useAttestationViewModel({ queue: [QUEUE[1]], onDone }), { wrapper });

    act(() => result.current.handlers.onCodeChange("7734"));
    await act(async () => result.current.handlers.onConfirm());

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx jest src/modules/clock/ui/viewModels/useAttestation.viewModel.test.tsx`
Expected: FAIL — `onCodeChange`/`code`/`codeError` don't exist yet on the current viewModel's return shape.

- [ ] **Step 6: Rewrite `useAttestation.viewModel.tsx`**

```tsx
import { useCallback, useState } from "react";
import * as Haptics from "expo-haptics";
import { useDependencies } from "@app/react/useDependencies";
import { ConfirmAttestationUseCase } from "../../core/usecases/ConfirmAttestation.usecase";
import { AttestationWorker } from "../../core/entities/AttestationWorker.entity";

export const MIN_CODE_LENGTH = 4;
export const MAX_CODE_LENGTH = 6;

interface UseAttestationViewModelArgs {
  queue: AttestationWorker[];
  onDone: () => void;
}

export const useAttestationViewModel = ({ queue, onDone }: UseAttestationViewModelArgs) => {
  const { punchRecorder } = useDependencies();
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  const current = queue[index] ?? null;

  const onCodeChange = useCallback((value: string) => {
    setCode(value);
    setCodeError(false);
  }, []);

  const onConfirm = useCallback(async () => {
    if (!current || confirming) return;
    if (code.length < MIN_CODE_LENGTH) return;

    if (code !== current.employeeCode) {
      setCodeError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setConfirming(true);
    const usecase = new ConfirmAttestationUseCase(punchRecorder);
    await usecase.execute(current.id, current.direction);
    setConfirming(false);

    setCode("");
    setCodeError(false);

    if (index + 1 >= queue.length) {
      onDone();
      return;
    }
    setIndex(index + 1);
  }, [current, confirming, code, punchRecorder, index, queue.length, onDone]);

  return {
    state: {
      current,
      position: index + 1,
      total: queue.length,
      confirming,
      code,
      codeError,
      canConfirm: code.length >= MIN_CODE_LENGTH,
    },
    handlers: { onConfirm, onCodeChange },
  };
};
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest src/modules/clock/ui/viewModels/useAttestation.viewModel.test.tsx`
Expected: `PASS` (4 tests).

- [ ] **Step 8: Update `AttestationScreen.tsx`**

Per the prototype (`Enter your employee code` label, masked numeric input, error text, helper text, "Device verified ✓", crew-device line, gated confirm button):

```tsx
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono, fontDisplay } from "@/ui/theme/typography";
import { useAttestationViewModel } from "../viewModels/useAttestation.viewModel";
import { AttestationWorker } from "../../core/entities/AttestationWorker.entity";

interface AttestationScreenProps {
  queue: AttestationWorker[];
  onGoRoster: () => void;
  onDone: () => void;
}

const formatNow = (): string => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function AttestationScreen({ queue, onGoRoster, onDone }: AttestationScreenProps) {
  const { state, handlers } = useAttestationViewModel({ queue, onDone });
  const { current, position, total, confirming, code, codeError, canConfirm } = state;

  if (!current) return null;

  const isIn = current.direction === "IN";
  const tone = isIn
    ? { bg: colors.jobBg, color: colors.job, border: colors.jobBorder }
    : { bg: colors.offBg, color: colors.off, border: colors.offBorder };
  const disabled = confirming || !canConfirm;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton onPress={onGoRoster} />
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>Individual attestation</Text>
        </View>

        <Text style={[typography.body, { color: colors.dim }]}>
          Worker {position} of {total} — hand the device to {current.name}
        </Text>

        <GlassSurface radius={18} style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{current.initials}</Text>
          </View>
          <Text style={styles.nameText}>{current.name}</Text>
          <Text style={[typography.body, styles.confirmText]}>
            I confirm I am clocking <Text style={styles.confirmDir}>{current.direction}</Text>
          </Text>
          <View style={styles.verifiedRow}>
            <Text style={styles.gpsLine}>GPS captured ✓</Text>
            <Text style={styles.gpsLine}>Device verified ✓</Text>
          </View>
          <Text style={styles.deviceLine}>Crew device #CL-0482 · registered to this crew</Text>
          <Text style={[styles.clockTime, { fontFamily: fontMono }]}>{formatNow()}</Text>
        </GlassSurface>

        <GlassSurface radius={18} style={styles.codeCard}>
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>Enter your employee code</Text>
          <TextInput
            value={code}
            onChangeText={handlers.onCodeChange}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            placeholder="• • • •"
            placeholderTextColor={colors.faint}
            style={[styles.codeInput, { borderColor: codeError ? colors.off : "rgba(120,120,100,0.25)" }]}
          />
          {codeError ? (
            <Text style={styles.codeError}>Code doesn&apos;t match {current.name} — try again</Text>
          ) : null}
          <Text style={styles.codeHelper}>
            Only {current.name} knows this code — it proves the right person is confirming this punch.
          </Text>
        </GlassSurface>

        <Pressable
          onPress={() => {
            if (disabled) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handlers.onConfirm();
          }}
          disabled={disabled}
          style={[styles.confirmButton, { backgroundColor: tone.bg, borderColor: tone.border, opacity: disabled ? 0.45 : 1 }]}
        >
          <Text style={[typography.buttonLabel, { color: tone.color }]}>
            {isIn ? "✓ Clock In" : "■ Clock Out"}
          </Text>
        </Pressable>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 14, paddingHorizontal: 18, paddingTop: 106, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { alignItems: "center", gap: 10, paddingVertical: 22, paddingHorizontal: 12 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ece9de",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: { fontSize: 21, fontWeight: "800", color: colors.dim },
  nameText: { fontFamily: fontDisplay, fontSize: 20, fontWeight: "800", color: colors.ink },
  confirmText: { color: colors.dim, textAlign: "center" },
  confirmDir: { fontWeight: "800", color: colors.ink },
  verifiedRow: { flexDirection: "row", gap: 12 },
  gpsLine: { fontSize: 12, fontWeight: "700", color: colors.job },
  deviceLine: { fontSize: 10.5, color: colors.faint, fontFamily: fontMono },
  clockTime: { fontSize: 28, fontWeight: "600", color: colors.ink },
  codeCard: { gap: 9, padding: 14 },
  codeInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 13,
    fontFamily: fontMono,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
    color: colors.ink,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  codeError: { fontSize: 11.5, fontWeight: "700", color: colors.off },
  codeHelper: { fontSize: 10.5, color: colors.faint, lineHeight: 15 },
  confirmButton: { borderRadius: 18, borderWidth: 1.5, paddingVertical: 18, alignItems: "center" },
});
```

- [ ] **Step 9: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (4 new).

- [ ] **Step 10: Commit** — skip (no git repository).

---

## Task 2: Ticket Detail screen — info card, map preview, crew chips, navigation

**Files:**
- Modify: `src/modules/tickets/core/entities/JobTicket.entity.ts`
- Modify: `src/modules/tickets/infrastructure/adapters/InMemoryTickets.adapter.ts`
- Create: `src/modules/tickets/core/usecases/GetTicketDetail.usecase.ts`
- Create: `src/modules/tickets/core/usecases/GetTicketDetail.usecase.test.ts`
- Create: `src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.tsx`
- Create: `src/modules/tickets/ui/screens/TicketDetailScreen.tsx`
- Create: `src/ui/components/molecules/MapPreview.tsx`
- Create: `app/ticket-detail.tsx`
- Modify: `app/_layout.tsx` (register the new route)
- Modify: `app/(tabs)/tickets.tsx`
- Modify: `app/(tabs)/home.tsx`

**Interfaces:**
- Consumes: nothing new from Phase 1 for this task (timers/meal-break come in Task 3).
- Produces: `JobTicket` gains `site: string`, `address: string`, `crew: { id: string; name: string; initials: string; onJob: boolean }[]`, `nextTicketId?: string`. `GetTicketDetailUseCase(ticketsReader).execute(ticketId)` returns `Result<JobTicket, {type:"NOT_FOUND"}|{type:"READ_FAILED"}>`. `TicketDetailScreen` navigated via `/ticket-detail?ticketId=...`. Task 3 and Task 4 extend this same screen/viewModel with job-timer and travel-prompt behavior — this task only builds the static info/map/crew part and end-to-end navigation.

- [ ] **Step 1: Extend `JobTicket` entity and mock data**

Modify `src/modules/tickets/core/entities/JobTicket.entity.ts`:
```typescript
export interface JobTicketCrewMember {
  id: string;
  name: string;
  initials: string;
  onJob: boolean;
}

export interface JobTicket {
  id: string;
  name: string;
  tag: string;
  sub: string;
  statusLabel: string;
  statusKind: "job" | "travel" | "idle" | "off";
  site: string;
  address: string;
  estimatedHours: number;
  crew: JobTicketCrewMember[];
  nextTicketId?: string;
}
```

Modify `src/modules/tickets/infrastructure/adapters/InMemoryTickets.adapter.ts` — extend `MOCK_TICKETS` with the new fields, and add a `readOne` method the new usecase will call:
```typescript
import { Result, ok, fail } from "@/types/Result";
import { JobTicket } from "../../core/entities/JobTicket.entity";
import { TicketsReader } from "../../core/ports/TicketsReader.port";

const MOCK_TICKETS: JobTicket[] = [
  {
    id: "chesterfield-remodel",
    name: "Chesterfield Remodel",
    tag: "M",
    sub: "Job site · est 6.5h",
    statusLabel: "In progress",
    statusKind: "job",
    site: "chesterfield",
    address: "412 Chesterfield Ave",
    estimatedHours: 6.5,
    crew: [
      { id: "roy-brown", name: "Roy Brown", initials: "RB", onJob: true },
      { id: "brent-m", name: "Brent M.", initials: "BM", onJob: true },
    ],
    nextTicketId: "cornerstone-mall",
  },
  {
    id: "cornerstone-mall",
    name: "Cornerstone Mall",
    tag: "E",
    sub: "Job site · est 3h",
    statusLabel: "Not started",
    statusKind: "idle",
    site: "cornerstone",
    address: "100 Main St",
    estimatedHours: 3,
    crew: [
      { id: "roy-brown", name: "Roy Brown", initials: "RB", onJob: false },
      { id: "brent-m", name: "Brent M.", initials: "BM", onJob: false },
    ],
  },
  {
    id: "yard-prep",
    name: "Yard prep",
    tag: "M",
    sub: "Yard · est 1h",
    statusLabel: "Not started",
    statusKind: "idle",
    site: "yard",
    address: "Company Yard",
    estimatedHours: 1,
    crew: [],
  },
];

export class InMemoryTicketsAdapter implements TicketsReader {
  async read(): Promise<Result<JobTicket[], { type: "READ_FAILED" }>> {
    return ok(MOCK_TICKETS);
  }

  async readOne(id: string): Promise<Result<JobTicket, { type: "NOT_FOUND" } | { type: "READ_FAILED" }>> {
    const found = MOCK_TICKETS.find((t) => t.id === id);
    return found ? ok(found) : fail({ type: "NOT_FOUND" });
  }
}
```

Add `readOne` to the port. Read `src/modules/tickets/core/ports/TicketsReader.port.ts` first, then add:
```typescript
  readOne(id: string): Promise<Result<JobTicket, { type: "NOT_FOUND" } | { type: "READ_FAILED" }>>;
```
(keep the existing `read()` method signature unchanged).

- [ ] **Step 2: Write the failing usecase test**

Create `src/modules/tickets/core/usecases/GetTicketDetail.usecase.test.ts`:
```typescript
import { GetTicketDetailUseCase } from "./GetTicketDetail.usecase";
import { TicketsReader } from "../ports/TicketsReader.port";
import { ok, fail } from "@/types/Result";
import { JobTicket } from "../entities/JobTicket.entity";

const TICKET: JobTicket = {
  id: "yard-prep", name: "Yard prep", tag: "M", sub: "Yard · est 1h", statusLabel: "Not started",
  statusKind: "idle", site: "yard", address: "Company Yard", estimatedHours: 1, crew: [],
};

describe("GetTicketDetailUseCase", () => {
  it("returns the ticket when found", async () => {
    const reader: TicketsReader = { read: async () => ok([]), readOne: async () => ok(TICKET) };
    const result = await new GetTicketDetailUseCase(reader).execute("yard-prep");
    expect(result).toEqual(ok(TICKET));
  });

  it("passes through a NOT_FOUND failure", async () => {
    const reader: TicketsReader = { read: async () => ok([]), readOne: async () => fail({ type: "NOT_FOUND" }) };
    const result = await new GetTicketDetailUseCase(reader).execute("missing-id");
    expect(result).toEqual(fail({ type: "NOT_FOUND" }));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/modules/tickets/core/usecases/GetTicketDetail.usecase.test.ts`
Expected: FAIL — `Cannot find module './GetTicketDetail.usecase'`.

- [ ] **Step 4: Write `GetTicketDetail.usecase.ts`**

```typescript
import { Result } from "@/types/Result";
import { JobTicket } from "../entities/JobTicket.entity";
import { TicketsReader } from "../ports/TicketsReader.port";

export class GetTicketDetailUseCase {
  constructor(private readonly reader: TicketsReader) {}

  async execute(id: string): Promise<Result<JobTicket, { type: "NOT_FOUND" } | { type: "READ_FAILED" }>> {
    return this.reader.readOne(id);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/modules/tickets/core/usecases/GetTicketDetail.usecase.test.ts`
Expected: `PASS` (2 tests).

- [ ] **Step 6: Build `MapPreview` (decorative, no real map integration)**

Create `src/ui/components/molecules/MapPreview.tsx`, matching the prototype's stylized fake-map block (grid lines, road diagonal, two building blocks, pin marker, address chip, "Open in Maps →" button, "map preview" badge):

```tsx
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassSurface } from "../atoms/GlassSurface";
import { colors } from "../../theme/colors";

interface MapPreviewProps {
  address: string;
}

export function MapPreview({ address }: MapPreviewProps) {
  const openInMaps = () => {
    Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(address)}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.gridLines} />
      <View style={styles.road} />
      <View style={styles.buildingA} />
      <View style={styles.buildingB} />
      <View style={styles.pinWrap}>
        <View style={styles.pinDot} />
        <View style={styles.pinShadow} />
      </View>
      <GlassSurface radius={7} style={styles.addressChip}>
        <Text style={styles.addressText}>{address}</Text>
      </GlassSurface>
      <Pressable onPress={openInMaps} style={styles.openButton}>
        <Text style={styles.openButtonText}>Open in Maps →</Text>
      </Pressable>
      <Text style={styles.badge}>map preview</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 132, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e4e1d4", backgroundColor: "#e8ebdd" },
  gridLines: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  road: { position: "absolute", top: -14, left: "56%", width: 9, height: "170%", backgroundColor: "#fdfbf2", transform: [{ rotate: "24deg" }], borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#ddd9c8" },
  buildingA: { position: "absolute", top: 24, left: 8, width: 64, height: 38, borderRadius: 8, backgroundColor: "#dfe6cf" },
  buildingB: { position: "absolute", bottom: 14, right: 14, width: 52, height: 30, borderRadius: 7, backgroundColor: "#d7e2ea" },
  pinWrap: { position: "absolute", top: "50%", left: "50%", marginLeft: -11, marginTop: -19, alignItems: "center", gap: 2 },
  pinDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, borderWidth: 3, borderColor: "#ffffff" },
  pinShadow: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(27,29,22,0.18)" },
  addressChip: { position: "absolute", top: 9, left: 9, paddingVertical: 4, paddingHorizontal: 8 },
  addressText: { fontSize: 10, fontWeight: "700", color: colors.ink },
  openButton: { position: "absolute", bottom: 9, left: 9, backgroundColor: colors.ink, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  openButtonText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5, color: "#f5f3ed", textTransform: "uppercase" },
  badge: { position: "absolute", top: 9, right: 9, fontSize: 9, color: colors.faint, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 6, paddingVertical: 3, paddingHorizontal: 6 },
});
```

Note for the implementer: the prototype's grid-line texture uses a CSS `repeating-linear-gradient`, which has no direct React Native equivalent — the flat `#e8ebdd` background plus the road/building shapes is a reasonable simplification; don't spend time building a pixel-perfect repeating grid pattern (e.g. with an SVG library not already a dependency) — that's over-engineering a decorative, non-interactive element.

- [ ] **Step 7: Build `useTicketDetail.viewModel.tsx`** (this task's scope: load + display only, no job timer/travel-prompt yet — those are Tasks 3-4)

```tsx
import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { GetTicketDetailUseCase } from "../../core/usecases/GetTicketDetail.usecase";
import { JobTicket } from "../../core/entities/JobTicket.entity";

interface UseTicketDetailViewModelArgs {
  ticketId: string;
  onGoNotes: (ticketName: string) => void;
}

export const useTicketDetailViewModel = ({ ticketId, onGoNotes }: UseTicketDetailViewModelArgs) => {
  const { ticketsReader } = useDependencies();
  const [ticket, setTicket] = useState<JobTicket | null>(null);

  const load = useCallback(async () => {
    const result = await new GetTicketDetailUseCase(ticketsReader).execute(ticketId);
    if (result.success) setTicket(result.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    state: { ticket },
    handlers: { onGoNotes: () => onGoNotes(ticket?.name ?? "") },
  };
};
```

- [ ] **Step 8: Build `TicketDetailScreen.tsx`** (info card, map, crew chips, Notes button only — job timer/pause/meal/travel-prompt come in Tasks 3-4, which will extend this same file)

```tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { MapPreview } from "@/ui/components/molecules/MapPreview";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { useTicketDetailViewModel } from "../viewModels/useTicketDetail.viewModel";

interface TicketDetailScreenProps {
  ticketId: string;
  onGoTickets: () => void;
  onGoNotes: (ticketName: string) => void;
}

export function TicketDetailScreen({ ticketId, onGoTickets, onGoNotes }: TicketDetailScreenProps) {
  const { state, handlers } = useTicketDetailViewModel({ ticketId, onGoNotes });
  const { ticket } = state;

  if (!ticket) return null;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={onGoTickets} />
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>Ticket detail</Text>
        </View>

        <GlassSurface radius={22} style={styles.card}>
          <View>
            <View style={styles.titleRow}>
              <Text style={[typography.cardTitle, { fontSize: 18, color: colors.ink }]}>{ticket.name}</Text>
              <Text style={[styles.tag, { fontFamily: fontMono }]}>{ticket.tag}</Text>
            </View>
            <Text style={[typography.body, { color: colors.dim, marginTop: 2 }]}>{ticket.sub}</Text>
          </View>

          <MapPreview address={ticket.address} />

          <View>
            <Text style={[typography.sectionLabel, { color: colors.faint, marginBottom: 7 }]}>Crew on this job</Text>
            <View style={styles.crewRow}>
              {ticket.crew.map((member) => (
                <View key={member.id} style={styles.crewChip}>
                  <View style={[styles.crewRing, member.onJob ? styles.crewRingOn : styles.crewRingOff]} />
                  <Text style={styles.crewName}>{member.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable onPress={handlers.onGoNotes} style={styles.notesButton}>
            <Text style={styles.notesButtonText}>Notes / Photo</Text>
          </Pressable>
        </GlassSurface>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { gap: 13, paddingHorizontal: 18, paddingTop: 106, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { padding: 15, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { fontSize: 9.5, fontWeight: "700", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: "#ece9de", color: colors.dim },
  crewRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  crewChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f5f3ed", borderWidth: 1, borderColor: "#e4e1d4", borderRadius: 22, paddingVertical: 5, paddingHorizontal: 10, paddingLeft: 6 },
  crewRing: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  crewRingOn: { borderColor: colors.job, backgroundColor: colors.jobBg },
  crewRingOff: { borderColor: "#c8c4b4", backgroundColor: "transparent" },
  crewName: { fontSize: 11.5, fontWeight: "600", color: colors.ink },
  notesButton: { paddingVertical: 13, borderRadius: 11, backgroundColor: "#f5f3ed", borderWidth: 1, borderColor: "#e4e1d4", alignItems: "center" },
  notesButtonText: { fontSize: 12.5, fontWeight: "800", letterSpacing: 0.5, color: colors.ink, textTransform: "uppercase" },
});
```

- [ ] **Step 9: Wire the new route**

Create `app/ticket-detail.tsx`:
```tsx
import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { TicketDetailScreen } from "@modules/tickets/ui/screens/TicketDetailScreen";

export default function TicketDetail() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();

  return (
    <TicketDetailScreen
      ticketId={ticketId}
      onGoTickets={() => router.back()}
      onGoNotes={(ticketName) => router.push({ pathname: "/notes", params: { ticketName } })}
    />
  );
}
```

Modify `app/_layout.tsx` — add one line inside the existing `<Stack>` (alongside the other `Stack.Screen` entries):
```tsx
            <Stack.Screen name="ticket-detail" options={{ presentation: "card" }} />
```

Modify `app/(tabs)/tickets.tsx` to navigate to the new screen instead of straight to Notes:
```tsx
import React from "react";
import { router } from "expo-router";
import { TicketsScreen } from "@modules/tickets/ui/screens/TicketsScreen";

export default function Tickets() {
  return (
    <TicketsScreen
      onOpenTicket={(ticketId) => router.push({ pathname: "/ticket-detail", params: { ticketId } })}
    />
  );
}
```

This requires `TicketsScreen`'s `onOpenTicket` to receive a ticket id instead of a name — modify `src/modules/tickets/ui/viewModels/useTickets.viewModel.tsx`'s row mapping:
```typescript
    onPress: () => onOpenTicket(ticket.id),
```
(keep the prop name `onOpenTicket` and its type `(ticketId: string) => void` in both `useTickets.viewModel.tsx`'s args interface and `TicketsScreen.tsx`'s props interface — just change what value is actually passed.)

Modify `app/(tabs)/home.tsx` similarly:
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
    />
  );
}
```

This requires `useHome.viewModel.tsx`'s `onOpenNextJob` handler to pass an id, not a name. Read `src/modules/home/core/entities/HomeSummary.entity.ts` first — if `nextJob` doesn't already carry an `id` field matching a real `JobTicket.id`, add one (`id: string`) alongside the existing `name`, and update `src/modules/home/infrastructure/adapters/InMemoryHomeSummary.adapter.ts`'s mock `nextJob` to use one of the real ticket ids from `InMemoryTicketsAdapter`'s `MOCK_TICKETS` (e.g. `"chesterfield-remodel"`) so the two mock data sources are at least referentially consistent for manual testing. Then change `useHome.viewModel.tsx`'s handler:
```typescript
      onOpenNextJob: () => onOpenNextJob(summary?.nextJob.id ?? ""),
```

- [ ] **Step 10: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (2 new).

- [ ] **Step 11: Manually verify in the iOS simulator**

Run: `npm run ios` (or confirm the Metro/dev-client session from earlier is still usable). Drive by hand:
- Tickets list → tap any ticket → lands on Ticket Detail (not Notes), showing info card, map preview, crew chips, and a working "Notes / Photo" button that goes to the existing Notes screen.
- Home's next-job card → tap → also lands on Ticket Detail for that job.
- Back button on Ticket Detail returns to wherever you came from.

- [ ] **Step 12: Commit** — skip (no git repository).

---

## Task 3: Job timer, pause, and meal-break sub-flow on Ticket Detail

**Files:**
- Modify: `src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.tsx`
- Modify: `src/modules/tickets/ui/screens/TicketDetailScreen.tsx`
- Test: `src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.test.tsx`

**Interfaces:**
- Consumes: `useTimer()` from `@app/react/timer/useTimer` (Phase 1) for the job timer (`start`/`pause`/`getSeconds`/`isRunning`, id `` `job:${ticketId}` ``) and the meal-break countdown (id `` `meal:${ticketId}` ``); `useNotifications().push(...)` (Phase 1) for meal-break start/end toasts.
- Produces: `useTicketDetailViewModel`'s state gains `jobRunning`, `jobPaused`, `jobTimerLabel`, `jobTimerValue`, `jobOverEstimate`, `mealPhase: "none" | "suggest" | "active" | "done"`, `mealTimerValue`, `mealCanEnd`. Task 4 (travel prompt) extends this same viewModel/screen further.

- [ ] **Step 1: Write the failing viewModel test for job start/pause/stop and over-estimate detection**

Read `src/modules/app/react/timer/TimerProvider.tsx` and `useTimer.tsx` (Phase 1, already built) to confirm the exact `useTimer()` contract before writing this test. Then extend `src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.test.tsx` (create it if Task 2 didn't already, per that task's scope — check first):

```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { JobTicket } from "../../core/entities/JobTicket.entity";
import { useTicketDetailViewModel } from "./useTicketDetail.viewModel";

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

describe("useTicketDetailViewModel — job timer", () => {
  it("starts not running, and onToggleJob starts it", async () => {
    const { result } = renderHook(() => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn() }), { wrapper });
    await act(async () => {});
    expect(result.current.state.jobRunning).toBe(false);

    act(() => result.current.handlers.onToggleJob());
    expect(result.current.state.jobRunning).toBe(true);
  });

  it("pausing the job stops the timer without resetting it", async () => {
    const { result } = renderHook(() => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleJob());
    act(() => result.current.handlers.onToggleJobPause());
    expect(result.current.state.jobRunning).toBe(true);
    expect(result.current.state.jobPaused).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.test.tsx`
Expected: FAIL — `onToggleJob`/`jobRunning`/etc. don't exist yet.

- [ ] **Step 3: Extend `useTicketDetail.viewModel.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useTimer } from "@app/react/timer/useTimer";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { GetTicketDetailUseCase } from "../../core/usecases/GetTicketDetail.usecase";
import { JobTicket } from "../../core/entities/JobTicket.entity";

const MEAL_MINIMUM_MINUTES = 30;
const MEAL_MINIMUM_SECONDS = MEAL_MINIMUM_MINUTES * 60;
const MEAL_SUGGEST_AFTER_HOURS = 4;

interface UseTicketDetailViewModelArgs {
  ticketId: string;
  onGoNotes: (ticketName: string) => void;
}

const formatTimer = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const useTicketDetailViewModel = ({ ticketId, onGoNotes }: UseTicketDetailViewModelArgs) => {
  const { ticketsReader } = useDependencies();
  const timer = useTimer();
  const { push } = useNotifications();
  const [ticket, setTicket] = useState<JobTicket | null>(null);
  const [mealPhase, setMealPhase] = useState<"none" | "suggest" | "active" | "done">("none");
  const [, forceRerender] = useState(0);

  const jobTimerId = `job:${ticketId}`;
  const mealTimerId = `meal:${ticketId}`;

  const load = useCallback(async () => {
    const result = await new GetTicketDetailUseCase(ticketsReader).execute(ticketId);
    if (result.success) setTicket(result.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-render once a second so the visible timers (job/meal) stay live while this screen is
  // mounted — getSeconds/isRunning read from a ref internally and don't trigger re-renders on
  // their own (see TimerProvider.tsx's own documentation of this).
  useEffect(() => {
    const interval = setInterval(() => forceRerender((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const jobRunning = timer.isRunning(jobTimerId);
  const jobSeconds = timer.getSeconds(jobTimerId);
  const jobPaused = mealPhase === "active";
  const estimatedSeconds = (ticket?.estimatedHours ?? 0) * 3600;
  const jobOverEstimate = estimatedSeconds > 0 && jobSeconds > estimatedSeconds;

  const onToggleJob = useCallback(() => {
    if (jobRunning) timer.pause(jobTimerId);
    else timer.start(jobTimerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobRunning, jobTimerId]);

  const onToggleJobPause = useCallback(() => {
    if (mealPhase === "active") return;
    timer.pause(jobTimerId);
    setMealPhase("suggest");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealPhase, jobTimerId]);

  const onStartMeal = useCallback(() => {
    timer.pause(jobTimerId);
    timer.start(mealTimerId);
    setMealPhase("active");
    push({ icon: "◔", title: "Meal break started", body: "Job time is paused until the break ends." });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTimerId, mealTimerId, push]);

  const onEndMeal = useCallback(() => {
    if (timer.getSeconds(mealTimerId) < MEAL_MINIMUM_SECONDS) return;
    timer.pause(mealTimerId);
    setMealPhase("done");
    push({ icon: "✓", title: "Meal break logged", body: `${formatTimer(timer.getSeconds(mealTimerId))} recorded.` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealTimerId, push]);

  const onContinueJob = useCallback(() => {
    timer.reset(mealTimerId);
    setMealPhase("none");
    timer.start(jobTimerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealTimerId, jobTimerId]);

  const mealSeconds = timer.getSeconds(mealTimerId);

  return {
    state: {
      ticket,
      jobRunning,
      jobPaused,
      jobTimerLabel: jobOverEstimate ? "Job time · over estimate" : "Job time",
      jobTimerValue: formatTimer(jobSeconds),
      jobOverEstimate,
      mealPhase,
      mealTimerValue: formatTimer(mealSeconds),
      mealCanEnd: mealSeconds >= MEAL_MINIMUM_SECONDS,
      mealSuggestVisible: mealPhase === "suggest" && jobSeconds >= MEAL_SUGGEST_AFTER_HOURS * 3600,
    },
    handlers: {
      onGoNotes: () => onGoNotes(ticket?.name ?? ""),
      onToggleJob,
      onToggleJobPause,
      onStartMeal,
      onEndMeal,
      onContinueJob,
    },
  };
};
```

Note for the implementer: `mealSuggestVisible` gating on `MEAL_SUGGEST_AFTER_HOURS` is a simplification of the prototype's more elaborate scheduling — the prototype's "meal break coming up" trigger is driven by a global day-level clock-in time, which doesn't exist yet in this screen's scope (that's Home/day-tracking territory, out of scope here). Using elapsed job time as the trigger condition for this screen is a reasonable, self-contained approximation; note it as a simplification in your report rather than trying to wire in day-level state that doesn't exist yet.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.test.tsx`
Expected: `PASS` (4 tests: 2 from Step 1 above plus Task 2's original load test, if Task 2 added one — check first).

- [ ] **Step 5: Extend `TicketDetailScreen.tsx`** with the job timer/pause row, and the three meal-break cards (suggest/active/done), matching the prototype's copy and color tokens (`colors.idleCardBg`/`idleCardBorder`/`idleCardSubtext` for suggest/active, `colors.approvedCardBg`/`approvedCardBorder` for done — both already defined in `colors.ts` per Phase 1's audit findings, "seen on Notes' extra-work flag" / "device-registration's approved state" — reuse them here rather than inventing new ones):

Add, inside the existing `GlassSurface` card, after the crew-chips block and before the Notes button:
```tsx
          <View style={styles.jobRow}>
            <Pressable
              onPress={handlers.onToggleJob}
              disabled={state.jobPaused}
              style={[styles.jobButton, state.jobPaused && { opacity: 0.5 }]}
            >
              <Text style={styles.jobButtonText}>
                {state.jobRunning ? "■ Stop Job" : "▶ Start Job"}
              </Text>
            </Pressable>
            <View style={[styles.timerBox, state.jobOverEstimate && { backgroundColor: colors.offBg }]}>
              <Text style={[styles.timerLabel, state.jobOverEstimate && { color: colors.off }]}>{state.jobTimerLabel}</Text>
              <Text style={[styles.timerValue, { fontFamily: fontMono }, state.jobOverEstimate && { color: colors.off }]}>
                {state.jobTimerValue}
              </Text>
            </View>
          </View>

          {state.jobRunning && state.mealPhase !== "active" && (
            <Pressable onPress={handlers.onToggleJobPause} style={styles.pauseButton}>
              <Text style={styles.pauseButtonText}>❚❚ Pause for meal break</Text>
            </Pressable>
          )}

          {state.mealPhase === "suggest" && (
            <View style={[styles.mealCard, { backgroundColor: colors.idleCardBg, borderColor: colors.idleCardBorder }]}>
              <Text style={[styles.mealTitle, { color: colors.idle }]}>◔ Meal break coming up</Text>
              <Text style={[styles.mealBody, { color: colors.idleCardSubtext }]}>
                Crew is over 4h on the clock — start the meal break now.
              </Text>
              <Pressable onPress={handlers.onStartMeal} style={styles.mealAction}>
                <Text style={styles.mealActionText}>◔ Start Meal Break</Text>
              </Pressable>
            </View>
          )}

          {state.mealPhase === "active" && (
            <View style={[styles.mealCard, { backgroundColor: colors.idleCardBg, borderColor: colors.idleCardBorder }]}>
              <View style={styles.mealActiveRow}>
                <Text style={[styles.mealTitle, { color: colors.idle }]}>◔ Meal break — timers paused</Text>
                <Text style={[styles.mealActiveTimer, { fontFamily: fontMono }]}>{state.mealTimerValue}</Text>
              </View>
              <Pressable onPress={handlers.onEndMeal} disabled={!state.mealCanEnd} style={[styles.mealAction, !state.mealCanEnd && { opacity: 0.5 }]}>
                <Text style={styles.mealActionText}>■ End Meal Break</Text>
              </Pressable>
            </View>
          )}

          {state.mealPhase === "done" && (
            <View style={[styles.mealCard, { backgroundColor: colors.approvedCardBg, borderColor: colors.approvedCardBorder }]}>
              <Text style={[styles.mealTitle, { color: colors.job }]}>✓ Meal break logged — {state.mealTimerValue}</Text>
              <Text style={styles.mealBody}>Job time is still paused. Continue when the crew is back on the job.</Text>
              <Pressable onPress={handlers.onContinueJob} style={styles.mealAction}>
                <Text style={styles.mealActionText}>▶ Continue Job</Text>
              </Pressable>
            </View>
          )}
```

Add matching styles to the `StyleSheet.create` block (`jobRow`, `jobButton`, `jobButtonText`, `timerBox`, `timerLabel`, `timerValue`, `pauseButton`, `pauseButtonText`, `mealCard`, `mealTitle`, `mealBody`, `mealAction`, `mealActionText`, `mealActiveRow`, `mealActiveTimer`) — use your judgment for exact values, staying close to the prototype's spacing/radius/typography already established elsewhere in this file (13-16px padding, 11-18px radius, 12.5-14px font sizes matching sibling elements).

- [ ] **Step 6: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass.

- [ ] **Step 7: Manually verify** — Start a job, confirm the timer counts up (wait a few real seconds), pause for meal break, start the meal break, confirm you can't end it before 30 minutes (or adjust `MEAL_MINIMUM_SECONDS` temporarily in a local test run if you want to observe the end-state without waiting 30 real minutes — revert any such temporary change before finishing), confirm ending it shows the logged card, confirm "Continue Job" resumes the job timer.

- [ ] **Step 8: Commit** — skip (no git repository).

---

## Task 4: Travel-prompt banner on Ticket Detail

**Files:**
- Modify: `src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.tsx`
- Modify: `src/modules/tickets/ui/screens/TicketDetailScreen.tsx`
- Modify: `src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.test.tsx`
- Modify: `app/ticket-detail.tsx` (accept an `onGoTravel` navigation prop — Task 5 builds the destination screen)

**Interfaces:**
- Consumes: `ticket.nextTicketId`/`ticket.site` (Task 2), `ticket.crew`/other Ticket Detail state (Tasks 2-3).
- Produces: `useTicketDetailViewModel`'s state gains `travelPrompt: { title: string; body: string; buttonLabel: string } | null`; handlers gain `onStartTravelToNext`, `onDismissTravelPrompt`. `TicketDetailScreen` gains an `onGoTravel: (fromTicketId: string, toTicketId: string) => void` prop, called by `onStartTravelToNext`.

- [ ] **Step 1: Write the failing test for travel-prompt triggering**

Extend `useTicketDetail.viewModel.test.tsx` — first fetch a ticket with `nextTicketId` set to a *different* `site* than a second mock ticket in the test double's `readOne`, so the same-site vs different-site branch is exercised:

```tsx
const JOB_A: JobTicket = {
  id: "yard-prep", name: "Yard prep", tag: "M", sub: "Yard · est 1h", statusLabel: "Not started",
  statusKind: "idle", site: "yard", address: "Company Yard", estimatedHours: 1, crew: [], nextTicketId: "cornerstone-mall",
};
const JOB_B: JobTicket = {
  id: "cornerstone-mall", name: "Cornerstone Mall", tag: "E", sub: "Job site · est 3h", statusLabel: "Not started",
  statusKind: "idle", site: "cornerstone", address: "100 Main St", estimatedHours: 3, crew: [],
};

// ...update buildTestDeps' ticketsReader.readOne to look up by id from [JOB_A, JOB_B]...

describe("useTicketDetailViewModel — travel prompt", () => {
  it("shows a travel prompt with 'start travel' copy once the job is stopped, when the next job is at a different site", async () => {
    const { result } = renderHook(() => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleJob()); // start
    act(() => result.current.handlers.onToggleJob()); // stop

    expect(result.current.state.travelPrompt).not.toBeNull();
    expect(result.current.state.travelPrompt?.buttonLabel).toMatch(/travel/i);
  });

  it("dismissing the prompt clears it without navigating", async () => {
    const { result } = renderHook(() => useTicketDetailViewModel({ ticketId: "yard-prep", onGoNotes: jest.fn() }), { wrapper });
    await act(async () => {});

    act(() => result.current.handlers.onToggleJob());
    act(() => result.current.handlers.onToggleJob());
    act(() => result.current.handlers.onDismissTravelPrompt());

    expect(result.current.state.travelPrompt).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.test.tsx`
Expected: FAIL — `travelPrompt`/`onDismissTravelPrompt` don't exist yet.

- [ ] **Step 3: Add travel-prompt state to `useTicketDetail.viewModel.tsx`**

Add a `nextTicket` lookup (fetch the next ticket's `site` to compare) and prompt state. Extend the viewModel:

```typescript
  const [travelPromptDismissed, setTravelPromptDismissed] = useState(false);
  const [nextTicketSite, setNextTicketSite] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket?.nextTicketId) {
      setNextTicketSite(null);
      return;
    }
    new GetTicketDetailUseCase(ticketsReader).execute(ticket.nextTicketId).then((result) => {
      if (result.success) setNextTicketSite(result.data.site);
    });
  }, [ticket?.nextTicketId, ticketsReader]);
```

Modify `onToggleJob` so stopping a running job (not starting) resets `travelPromptDismissed` to `false` (so the prompt can show again for this stop):
```typescript
  const onToggleJob = useCallback(() => {
    if (jobRunning) {
      timer.pause(jobTimerId);
      setTravelPromptDismissed(false);
    } else {
      timer.start(jobTimerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobRunning, jobTimerId]);
```

Add the derived `travelPrompt` value and its handlers:
```typescript
  const sameSite = ticket?.site != null && nextTicketSite != null && ticket.site === nextTicketSite;
  const travelPrompt =
    !jobRunning && !travelPromptDismissed && ticket?.nextTicketId && jobSeconds > 0
      ? sameSite
        ? {
            title: "Job complete — next job is here",
            body: "Next job is at the same site — no travel needed. Start it directly.",
            buttonLabel: "Continue Next Job",
          }
        : {
            title: "Job complete — start travel?",
            body: "The next job is at a different site. Start travel time as the crew leaves.",
            buttonLabel: "Start Travel",
          }
      : null;

  const onDismissTravelPrompt = useCallback(() => setTravelPromptDismissed(true), []);
```

Return `travelPrompt` in state and `onDismissTravelPrompt`/`onStartTravelToNext` in handlers (the latter just calls a passed-in navigation callback — thread an `onGoTravel` arg through the viewModel's args, matching the `onGoNotes` pattern already established):
```typescript
interface UseTicketDetailViewModelArgs {
  ticketId: string;
  onGoNotes: (ticketName: string) => void;
  onGoTravel: (fromTicketId: string, toTicketId: string) => void;
}
// ...
    onStartTravelToNext: () => {
      if (ticket?.nextTicketId) onGoTravel(ticket.id, ticket.nextTicketId);
    },
    onDismissTravelPrompt,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/tickets/ui/viewModels/useTicketDetail.viewModel.test.tsx`
Expected: `PASS` (all tests, 6 total).

- [ ] **Step 5: Render the travel-prompt banner in `TicketDetailScreen.tsx`**

Add at the top of the card content (before the title row), matching the prototype's blue banner:
```tsx
        {state.travelPrompt && (
          <View style={styles.travelPromptCard}>
            <Text style={styles.travelPromptTitle}>{state.travelPrompt.title}</Text>
            <Text style={styles.travelPromptBody}>{state.travelPrompt.body}</Text>
            <View style={styles.travelPromptRow}>
              <Pressable onPress={handlers.onStartTravelToNext} style={styles.travelPromptPrimary}>
                <Text style={styles.travelPromptPrimaryText}>{state.travelPrompt.buttonLabel}</Text>
              </Pressable>
              <Pressable onPress={handlers.onDismissTravelPrompt} style={styles.travelPromptSecondary}>
                <Text style={styles.travelPromptSecondaryText}>Not now</Text>
              </Pressable>
            </View>
          </View>
        )}
```

Add styles: `travelPromptCard` (`backgroundColor: "#e1edf9"`, `borderColor: "#bfd8f0"`, `borderWidth: 1.5`, `borderRadius: 18`, `padding: 14`, `gap: 10`), `travelPromptTitle` (`fontSize: 13.5, fontWeight: "800", color: colors.travel`), `travelPromptBody` (`fontSize: 12, color: colors.dim, lineHeight: 17`), `travelPromptRow` (`flexDirection: "row", gap: 9`), `travelPromptPrimary` (`flex: 1, backgroundColor: colors.accent, borderRadius: 11, paddingVertical: 13, alignItems: "center"`), `travelPromptPrimaryText` (`fontSize: 13, fontWeight: "800", color: colors.accentInk, textTransform: "uppercase"`), `travelPromptSecondary`/`travelPromptSecondaryText` matching the existing glass-pill secondary-button pattern already used elsewhere in this codebase (see `PillButton.tsx`'s `glass` variant for reference values).

Update `TicketDetailScreenProps` and its destructure to accept `onGoTravel`, passing it through to the viewModel call.

Update `app/ticket-detail.tsx` to supply `onGoTravel`:
```tsx
      onGoTravel={(fromTicketId, toTicketId) =>
        router.push({ pathname: "/travel", params: { fromTicketId, toTicketId } })
      }
```
(The `/travel` route doesn't exist until Task 5 — this line will cause a harmless dead route reference until then; that's expected and fine for this task, since Task 5 is next in this same plan.)

- [ ] **Step 6: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass.

- [ ] **Step 7: Commit** — skip (no git repository).

---

## Task 5: Travel Time screen

**Files:**
- Create: `src/modules/tickets/ui/viewModels/useTravel.viewModel.tsx`
- Create: `src/modules/tickets/ui/viewModels/useTravel.viewModel.test.tsx`
- Create: `src/modules/tickets/ui/screens/TravelScreen.tsx`
- Create: `app/travel.tsx`
- Modify: `app/_layout.tsx` (register the route)

**Interfaces:**
- Consumes: `useTimer()` (Phase 1, id `` `travel:${fromTicketId}:${toTicketId}` ``), `useNotifications().push(...)` (Phase 1), `GetTicketDetailUseCase` (Task 2, to fetch both tickets' display info).
- Produces: `TravelScreen` navigated via `/travel?fromTicketId=...&toTicketId=...`. `onStartJobAfterTravel` navigates to `/ticket-detail` for the destination ticket (closing the loop Task 4 opened).

- [ ] **Step 1: Write the failing viewModel test**

Create `src/modules/tickets/ui/viewModels/useTravel.viewModel.test.tsx`:
```tsx
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { JobTicket } from "../../core/entities/JobTicket.entity";
import { useTravelViewModel } from "./useTravel.viewModel";

const FROM: JobTicket = { id: "yard-prep", name: "Yard prep", tag: "M", sub: "", statusLabel: "", statusKind: "idle", site: "yard", address: "Company Yard", estimatedHours: 1, crew: [] };
const TO: JobTicket = { id: "cornerstone-mall", name: "Cornerstone Mall", tag: "E", sub: "", statusLabel: "", statusKind: "idle", site: "cornerstone", address: "100 Main St", estimatedHours: 3, crew: [] };

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) { return this.map.get(key) ?? null; }
  setString(key: string, value: string) { this.map.set(key, value); }
}

function buildTestDeps(): Dependencies {
  return {
    keyValueStore: new FakeKeyValueStore(),
    ticketsReader: {
      read: async () => ok([FROM, TO]),
      readOne: async (id: string) => ok(id === FROM.id ? FROM : TO),
    },
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

describe("useTravelViewModel", () => {
  it("loads both tickets and starts not travelling", async () => {
    const { result } = renderHook(
      () => useTravelViewModel({ fromTicketId: "yard-prep", toTicketId: "cornerstone-mall", onStartJobAfterTravel: jest.fn() }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.state.toTicket).not.toBeNull());
    expect(result.current.state.fromTicket?.name).toBe("Yard prep");
    expect(result.current.state.travelRunning).toBe(false);
  });

  it("onToggleTravel starts and stops the travel timer", async () => {
    const { result } = renderHook(
      () => useTravelViewModel({ fromTicketId: "yard-prep", toTicketId: "cornerstone-mall", onStartJobAfterTravel: jest.fn() }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.state.toTicket).not.toBeNull());

    act(() => result.current.handlers.onToggleTravel());
    expect(result.current.state.travelRunning).toBe(true);

    act(() => result.current.handlers.onToggleTravel());
    expect(result.current.state.travelRunning).toBe(false);
  });

  it("onConfirmArrived stops travel and shows the travel-done state", async () => {
    const { result } = renderHook(
      () => useTravelViewModel({ fromTicketId: "yard-prep", toTicketId: "cornerstone-mall", onStartJobAfterTravel: jest.fn() }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.state.toTicket).not.toBeNull());

    act(() => result.current.handlers.onToggleTravel());
    act(() => result.current.handlers.onConfirmArrived());

    expect(result.current.state.travelDone).toBe(true);
    expect(result.current.state.travelRunning).toBe(false);
  });

  it("onStartJobAfterTravel calls the navigation callback with the destination ticket id", async () => {
    const onStartJobAfterTravel = jest.fn();
    const { result } = renderHook(
      () => useTravelViewModel({ fromTicketId: "yard-prep", toTicketId: "cornerstone-mall", onStartJobAfterTravel }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.state.toTicket).not.toBeNull());

    act(() => result.current.handlers.onToggleTravel());
    act(() => result.current.handlers.onConfirmArrived());
    act(() => result.current.handlers.onStartJobAfterTravel());

    expect(onStartJobAfterTravel).toHaveBeenCalledWith("cornerstone-mall");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/tickets/ui/viewModels/useTravel.viewModel.test.tsx`
Expected: FAIL — `Cannot find module './useTravel.viewModel'`.

- [ ] **Step 3: Write `useTravel.viewModel.tsx`**

The prototype's automatic ~10s arrival-geofence simulation is a demo affordance; this task instead surfaces an explicit "I've arrived" trigger via `onConfirmArrived` (the same action the prototype's arrival-prompt confirms) without a hidden timer, since a silent auto-firing 10-second timeout is a poor fit for a real app and isn't gated behind a demo flag in the prototype the way the Home screen's `alertDemoOn` block explicitly is — treat this as a deliberate simplification, not a missed requirement, and note it in your report.

```tsx
import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useTimer } from "@app/react/timer/useTimer";
import { useNotifications } from "@app/react/notifications/useNotifications";
import { GetTicketDetailUseCase } from "../../core/usecases/GetTicketDetail.usecase";
import { JobTicket } from "../../core/entities/JobTicket.entity";

interface UseTravelViewModelArgs {
  fromTicketId: string;
  toTicketId: string;
  onStartJobAfterTravel: (toTicketId: string) => void;
}

const formatTimer = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const useTravelViewModel = ({ fromTicketId, toTicketId, onStartJobAfterTravel }: UseTravelViewModelArgs) => {
  const { ticketsReader } = useDependencies();
  const timer = useTimer();
  const { push } = useNotifications();
  const [fromTicket, setFromTicket] = useState<JobTicket | null>(null);
  const [toTicket, setToTicket] = useState<JobTicket | null>(null);
  const [travelDone, setTravelDone] = useState(false);
  const [, forceRerender] = useState(0);

  const travelTimerId = `travel:${fromTicketId}:${toTicketId}`;

  useEffect(() => {
    new GetTicketDetailUseCase(ticketsReader).execute(fromTicketId).then((r) => r.success && setFromTicket(r.data));
    new GetTicketDetailUseCase(ticketsReader).execute(toTicketId).then((r) => r.success && setToTicket(r.data));
  }, [fromTicketId, toTicketId, ticketsReader]);

  useEffect(() => {
    const interval = setInterval(() => forceRerender((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const travelRunning = timer.isRunning(travelTimerId);
  const travelSeconds = timer.getSeconds(travelTimerId);

  const onToggleTravel = useCallback(() => {
    if (travelRunning) timer.pause(travelTimerId);
    else timer.start(travelTimerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelRunning, travelTimerId]);

  const onConfirmArrived = useCallback(() => {
    timer.pause(travelTimerId);
    setTravelDone(true);
    push({ icon: "✓", title: "Travel done", body: `${formatTimer(timer.getSeconds(travelTimerId))} logged.` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelTimerId, push]);

  const onStartJobAfterTravelHandler = useCallback(() => {
    onStartJobAfterTravel(toTicketId);
  }, [onStartJobAfterTravel, toTicketId]);

  return {
    state: {
      fromTicket,
      toTicket,
      travelRunning,
      travelDone,
      travelTimerValue: formatTimer(travelSeconds),
    },
    handlers: {
      onToggleTravel,
      onConfirmArrived,
      onStartJobAfterTravel: onStartJobAfterTravelHandler,
    },
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/tickets/ui/viewModels/useTravel.viewModel.test.tsx`
Expected: `PASS` (4 tests).

- [ ] **Step 5: Write `TravelScreen.tsx`**

```tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { BackButton } from "@/ui/components/atoms/BackButton";
import { GlassSurface } from "@/ui/components/atoms/GlassSurface";
import { colors } from "@/ui/theme/colors";
import { typography, fontMono } from "@/ui/theme/typography";
import { useTravelViewModel } from "../viewModels/useTravel.viewModel";

interface TravelScreenProps {
  fromTicketId: string;
  toTicketId: string;
  onGoBack: () => void;
  onStartJobAfterTravel: (toTicketId: string) => void;
}

export function TravelScreen({ fromTicketId, toTicketId, onGoBack, onStartJobAfterTravel }: TravelScreenProps) {
  const { state, handlers } = useTravelViewModel({ fromTicketId, toTicketId, onStartJobAfterTravel });
  const { fromTicket, toTicket, travelRunning, travelDone, travelTimerValue } = state;

  if (!toTicket) return null;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={onGoBack} />
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>Travel time</Text>
        </View>

        <Text style={styles.title}>Travel time</Text>

        {travelDone ? (
          <GlassSurface radius={18} style={styles.card}>
            <Text style={styles.doneLabel}>✓ Travel done — {travelTimerValue}</Text>
            <View>
              <Text style={[typography.cardTitle, { fontSize: 19, color: colors.ink }]}>{toTicket.name}</Text>
              <Text style={[typography.body, { color: colors.dim, marginTop: 2 }]}>{toTicket.sub}</Text>
            </View>
            <View style={styles.loggedRow}>
              <Text style={styles.loggedLabel}>Travel time logged</Text>
              <Text style={[styles.loggedValue, { fontFamily: fontMono }]}>{travelTimerValue}</Text>
            </View>
            <Pressable onPress={handlers.onStartJobAfterTravel} style={styles.startJobButton}>
              <Text style={styles.startJobButtonText}>▶ Start Job</Text>
            </Pressable>
          </GlassSurface>
        ) : (
          <Pressable
            onPress={handlers.onToggleTravel}
            style={[styles.toggleButton, { backgroundColor: travelRunning ? colors.offBg : colors.travelBg, borderColor: travelRunning ? colors.offBorder : colors.travelBorder }]}
          >
            <Text style={[styles.toggleButtonText, { color: travelRunning ? colors.off : colors.travel }]}>
              {travelRunning ? "■ Stop Travel" : "▶ Start Travel"}
            </Text>
          </Pressable>
        )}

        {travelRunning && !travelDone && (
          <Pressable onPress={handlers.onConfirmArrived} style={styles.arrivedButton}>
            <Text style={styles.arrivedButtonText}>■ End Travel — Arrived</Text>
          </Pressable>
        )}

        <View style={styles.runningBlock}>
          <Text style={[typography.sectionLabel, { color: colors.faint }]}>Running</Text>
          <Text style={[styles.timerValue, { fontFamily: fontMono }]}>{travelTimerValue}</Text>
        </View>

        <Text style={styles.fromTo}>
          from: {fromTicket?.name ?? "—"} · to: {toTicket.name}
        </Text>

        <View style={styles.footerBanner}>
          <Text style={styles.footerBannerText}>
            Travel starts after the morning clock-in, as the crew leaves the yard. Confirming arrival ends
            travel and clocks the crew straight into the job ticket — a continuous, gap-free hour stream.
          </Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { gap: 13, paddingHorizontal: 18, paddingTop: 106, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 26, fontWeight: "800", color: colors.travel },
  card: { padding: 15, gap: 11 },
  doneLabel: { fontSize: 12, fontWeight: "800", color: colors.job },
  loggedRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(120,120,100,0.15)" },
  loggedLabel: { fontSize: 12, color: colors.faint },
  loggedValue: { fontSize: 12, fontWeight: "600", color: colors.ink },
  startJobButton: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  startJobButtonText: { fontSize: 14, fontWeight: "800", color: colors.accentInk, textTransform: "uppercase", letterSpacing: 0.5 },
  toggleButton: { borderRadius: 18, borderWidth: 1.5, paddingVertical: 18, alignItems: "center" },
  toggleButtonText: { fontSize: 16, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  arrivedButton: { borderRadius: 11, paddingVertical: 13, alignItems: "center", backgroundColor: colors.travelBg, borderWidth: 1.5, borderColor: colors.travelBorder },
  arrivedButtonText: { fontSize: 12.5, fontWeight: "800", color: colors.travel, textTransform: "uppercase" },
  runningBlock: { alignItems: "center", gap: 2 },
  timerValue: { fontSize: 30, fontWeight: "600", color: colors.ink },
  fromTo: { fontSize: 12.5, color: colors.dim, textAlign: "center" },
  footerBanner: { backgroundColor: "#e1edf9", borderWidth: 1, borderColor: "#bfd8f0", borderRadius: 16, padding: 12 },
  footerBannerText: { fontSize: 11.5, color: colors.travel, lineHeight: 16 },
});
```

- [ ] **Step 6: Wire the route**

Create `app/travel.tsx`:
```tsx
import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { TravelScreen } from "@modules/tickets/ui/screens/TravelScreen";

export default function Travel() {
  const { fromTicketId, toTicketId } = useLocalSearchParams<{ fromTicketId: string; toTicketId: string }>();

  return (
    <TravelScreen
      fromTicketId={fromTicketId}
      toTicketId={toTicketId}
      onGoBack={() => router.back()}
      onStartJobAfterTravel={(toTicketId) => router.replace({ pathname: "/ticket-detail", params: { ticketId: toTicketId } })}
    />
  );
}
```

Modify `app/_layout.tsx` — add:
```tsx
            <Stack.Screen name="travel" options={{ presentation: "card" }} />
```

- [ ] **Step 7: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (4 new).

- [ ] **Step 8: Manually verify** — From Ticket Detail, start and stop a job with a `nextTicketId` at a different `site` (`chesterfield-remodel` → `cornerstone-mall` in the mock data), confirm the travel prompt appears, tap "Start Travel", confirm you land on the new Travel screen with both ticket names shown, start travel, confirm the timer runs, tap "End Travel — Arrived", confirm the travel-done card appears with logged time, tap "Start Job", confirm you land back on Ticket Detail for the destination job.

- [ ] **Step 9: Commit** — skip (no git repository).

## Self-review notes

- **Spec coverage:** Task 1 covers the Attestation security fix. Tasks 2-4 cover Ticket Detail (info/map/crew in Task 2, job-timer/pause/meal-break in Task 3, travel-prompt in Task 4). Task 5 covers the new Travel Time screen and closes the loop back into Ticket Detail. Navigation from both entry points (Tickets list, Home) is wired in Task 2.
- **Known simplifications, disclosed rather than silently dropped:** crew chips are mocked per-ticket rather than reflecting live Roster selection (no cross-module "selected crew" store exists yet in this app); the meal-break "coming up" trigger uses this screen's own elapsed job time rather than day-level clock-in time; travel arrival is an explicit user action rather than the prototype's silent ~10s auto-fire simulation. None of these block the core fixes (security, missing screens, navigation) this phase targets.
- **Type consistency:** `JobTicket`/`JobTicketCrewMember` (Task 2), `useTimer()`'s contract (Phase 1, unchanged), and `useNotifications().push()`'s signature (Phase 1, unchanged) are used identically across Tasks 2-5.
- **No magic numbers:** `MIN_CODE_LENGTH`/`MAX_CODE_LENGTH` (Task 1), `MEAL_MINIMUM_MINUTES`/`MEAL_MINIMUM_SECONDS`/`MEAL_SUGGEST_AFTER_HOURS` (Task 3) are named constants.
- **Localization note:** per standing project feedback, new screen copy in Tasks 1-5 should be wired through `useLanguage()` once EN/ES strings are worked out — flagging this as a fast-follow within Phase 2 rather than blocking these tasks on writing a full strings table; if the implementer has bandwidth to wire `useLanguage()` for the copy introduced in a given task, do so, but don't let it block correctness-focused delivery of the missing screens and security fix.
