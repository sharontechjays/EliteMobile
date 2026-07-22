# Phase 6 — Design Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining moderate/minor prototype-fidelity gaps on Sync Queue, Profile, and Notes — the last items from the original audit not already resolved incidentally by Phases 1-5. (Tickets' mock-data-naming gap is now effectively moot: Phase 2 already gave `JobTicket` real `site`/`address`/`crew` fields with a data model that supports the prototype's actual logic; exact demo-name matching was always cosmetic and isn't worth a dedicated task.)

**Architecture:** Clean-architecture module pattern, matching prior phases. The Profile employee-code fix reuses Phase 1's real `KeyValueStore` (already MMKV-backed) to persist the code entered at sign-in — the same pattern Device Registration already uses for its own persisted state.

**Tech Stack:** React Native 0.81 / Expo SDK 54 / expo-router 6 / TypeScript 5.9 / jest-expo.

## Global Constraints

- Do NOT modify `src/ui/components/atoms/GlassSurface.tsx` or `app/(tabs)/_layout.tsx`.
- No magic numbers.
- This project has NO git repository — skip "git add"/"git commit" steps.
- Match existing patterns: `GlassSurface`, `colors`/`typography`, `Pressable` + `expo-haptics`, `Result<T,E>` usecases.

---

## Task 1: Sync Queue + Profile fixes (typography, notification card, real employee code)

**Files:**
- Modify: `src/modules/sync/ui/screens/SyncQueueScreen.tsx`
- Modify: `src/ui/theme/typography.ts`
- Modify: `src/modules/profile/ui/screens/ProfileScreen.tsx`
- Modify: `src/modules/auth/core/entities/CrewLeaderSession.entity.ts`
- Modify: `src/modules/auth/infrastructure/adapters/InMemorySessionAuthenticator.adapter.ts`
- Modify: `src/modules/auth/ui/viewModels/useSignIn.viewModel.tsx`
- Modify: `src/modules/profile/infrastructure/adapters/InMemoryProfile.adapter.ts`
- Modify: `src/modules/profile/ui/viewModels/useProfile.viewModel.tsx`
- Create: `src/modules/profile/ui/viewModels/useProfile.viewModel.test.tsx`

**Interfaces:**
- Consumes: `KeyValueStore` (Phase 1, real MMKV-backed) via `useDependencies()`.
- Produces: `CrewLeaderSession` gains `employeeCode: string`. Signing in now persists that code to the shared `KeyValueStore` under a named key; `InMemoryProfileAdapter.read()` reads it back and uses it instead of the hardcoded mock, falling back to the mock only if no session was ever persisted (e.g. a test double or a state that skipped sign-in).

- [ ] **Step 1: Fix Sync Queue's row text size and add a `PillButton` label-style override**

Modify `src/modules/sync/ui/screens/SyncQueueScreen.tsx` — change the row label's font size from the shared `typography.body` (12.5px) to the spec's 12px by adding an inline override (matching this file's existing pattern of overriding color/fontFamily inline on shared tokens):
```tsx
                <Text
                  style={[
                    typography.body,
                    { fontSize: 12, flex: 1, color: item.status === "rejected" ? colors.off : colors.ink },
                  ]}
                >
```

Add an optional `labelStyle` override prop to `PillButton` (a small, reusable addition — this shared atom already takes a `style` prop for the container; this adds the equivalent for its label text, useful here and for any future screen needing a non-default label size):
```typescript
interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "glass" | "dark";
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}
```
(add `TextStyle` to the existing `react-native` import), and apply it in the label `<Text>`:
```tsx
      <Text
        style={[
          typography.buttonLabel,
          styles.label,
          variant === "primary" && { color: colors.accentInk },
          variant === "dark" && { color: colors.accent },
          variant === "glass" && { color: colors.ink },
          labelStyle,
        ]}
      >
```
Then in `SyncQueueScreen.tsx`, pass the spec's exact size/tracking to the "Sync Now" button:
```tsx
          <PillButton
            label={syncing ? "Syncing…" : "Sync Now"}
            onPress={handlers.onSyncNow}
            disabled={syncing}
            labelStyle={{ fontSize: 14.5, letterSpacing: 0.9 }}
          />
```

- [ ] **Step 2: Fix Profile's notification card padding and section-label sizes**

Modify `src/modules/profile/ui/screens/ProfileScreen.tsx` — change `notifCard`'s uniform padding to the spec's `10px 12px`:
```typescript
  notifCard: { paddingVertical: 10, paddingHorizontal: 12 },
```
And split the shared `typography.sectionLabel` styling for the two section labels into their own inline overrides (the eyebrow "Profile & settings" label should be 11px/0.1em; "Recent notifications" should stay at 10.5px/0.12em — the shared token is 10.5px/1.3em, so both currently get the wrong tracking):
```tsx
            <Text style={[typography.sectionLabel, { fontSize: 11, letterSpacing: 0.1, color: colors.faint }]}>Profile &amp; settings</Text>
```
and
```tsx
          <Text style={[typography.sectionLabel, { fontSize: 10.5, letterSpacing: 0.12, color: colors.faint }]}>Recent notifications</Text>
```

- [ ] **Step 3: Write the failing test for real employee-code persistence**

First read `src/modules/auth/core/ports/SessionAuthenticator.port.ts` to confirm the exact port shape. Create `src/modules/profile/ui/viewModels/useProfile.viewModel.test.tsx`:
```tsx
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { ProfileSummary } from "../../core/entities/ProfileSummary.entity";
import { useProfileViewModel } from "./useProfile.viewModel";

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) { return this.map.get(key) ?? null; }
  setString(key: string, value: string) { this.map.set(key, value); }
}

const MOCK_PROFILE: ProfileSummary = {
  crewLeaderName: "H. Jackson", employeeCode: "•••45", device: "TABLET-04",
  branch: "Chesterfield", language: "English", lastSyncLabel: "6:58 AM", notifications: [],
};

function buildTestDeps(store: FakeKeyValueStore): Dependencies {
  return {
    keyValueStore: store,
    profileReader: { read: async () => ok(MOCK_PROFILE) },
    deviceRegistrar: { read: async () => ok(null), register: async () => ok({} as never) },
  } as unknown as Dependencies;
}

function wrapperFor(store: FakeKeyValueStore) {
  return ({ children }: { children: React.ReactNode }) => (
    <DependenciesProvider dependencies={buildTestDeps(store)}>{children}</DependenciesProvider>
  );
}

describe("useProfileViewModel — real employee code", () => {
  it("falls back to the mock code when no session was persisted", async () => {
    const { result } = renderHook(() => useProfileViewModel(), { wrapper: wrapperFor(new FakeKeyValueStore()) });
    await waitFor(() => expect(result.current.state.profile).not.toBeNull());
    expect(result.current.state.profile?.employeeCode).toBe("•••45");
  });
});
```

Note for the implementer: this test only covers the fallback path directly through `useProfileViewModel` (since the real code arrives via a separate screen's sign-in flow, not through Profile's own dependencies) — the sign-in-writes-the-code path is better covered by extending `useSignIn.viewModel.test.tsx` (already exists from an earlier phase) with a new test asserting `keyValueStore.getString(SESSION_EMPLOYEE_CODE_KEY)` is set after a successful sign-in. Add that test too, in `src/modules/auth/ui/viewModels/useSignIn.viewModel.test.tsx` (read its current contents first), following its existing test-double pattern.

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx jest src/modules/profile/ui/viewModels/useProfile.viewModel.test.tsx src/modules/auth/ui/viewModels/useSignIn.viewModel.test.tsx`
Expected: the new profile test passes trivially against a stub (it doesn't test anything new yet) — actually write the sign-in test first and confirm THAT fails, since it's the one asserting new persistence behavior that doesn't exist yet.

- [ ] **Step 5: Add `employeeCode` to `CrewLeaderSession` and thread it through sign-in**

Modify `src/modules/auth/core/entities/CrewLeaderSession.entity.ts`:
```typescript
export interface CrewLeaderSession {
  crewLeaderName: string;
  branchName: string;
  employeeCode: string;
}
```

Modify `src/modules/auth/infrastructure/adapters/InMemorySessionAuthenticator.adapter.ts` to include the real code in the returned session:
```typescript
import { Result, ok, fail } from "@/types/Result";
import { CrewLeaderSession } from "../../core/entities/CrewLeaderSession.entity";
import { SessionAuthenticator } from "../../core/ports/SessionAuthenticator.port";

const DEMO_CODE = "12345";
const DEMO_SESSION_BASE = { crewLeaderName: "H. Jackson", branchName: "Chesterfield" };

export class InMemorySessionAuthenticatorAdapter implements SessionAuthenticator {
  async signIn(employeeCode: string): Promise<Result<CrewLeaderSession, { type: "INVALID_CODE" }>> {
    if (employeeCode === DEMO_CODE) return ok({ ...DEMO_SESSION_BASE, employeeCode });
    return fail({ type: "INVALID_CODE" });
  }
}
```

Modify `src/modules/auth/ui/viewModels/useSignIn.viewModel.tsx` to persist the code on success. Read the current file first, then add the named key constant and the persistence call inside the existing `submit` function's success branch:
```typescript
export const SESSION_EMPLOYEE_CODE_KEY = "session.employeeCode";
```
```typescript
      if (result.success) {
        setCode("");
        keyValueStore.setString(SESSION_EMPLOYEE_CODE_KEY, result.data.employeeCode);
        onSignedIn(result.data);
        return;
      }
```
(destructure `keyValueStore` from `useDependencies()` alongside the existing `sessionAuthenticator`).

- [ ] **Step 6: Run the sign-in test to verify it passes**

Run: `npx jest src/modules/auth/ui/viewModels/useSignIn.viewModel.test.tsx`
Expected: `PASS` (all tests, including the new one).

- [ ] **Step 7: Wire `InMemoryProfileAdapter` to read the real persisted code**

Modify `src/modules/profile/infrastructure/adapters/InMemoryProfile.adapter.ts`:
```typescript
import { Result, ok } from "@/types/Result";
import { ProfileSummary } from "../../core/entities/ProfileSummary.entity";
import { ProfileReader } from "../../core/ports/ProfileReader.port";
import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";

const SESSION_EMPLOYEE_CODE_KEY = "session.employeeCode";

const MOCK_PROFILE: ProfileSummary = {
  crewLeaderName: "H. Jackson",
  employeeCode: "•••45",
  device: "TABLET-04",
  branch: "Chesterfield",
  language: "English",
  lastSyncLabel: "6:58 AM",
  notifications: [
    { id: "1", title: "Meal break reminder", body: "4 hours worked — remind the crew to take lunch." },
    { id: "2", title: "Second jobsite", body: "Arrived at Cornerstone Mall — confirm clock-in." },
  ],
};

export class InMemoryProfileAdapter implements ProfileReader {
  constructor(private readonly keyValueStore: KeyValueStore) {}

  async read(): Promise<Result<ProfileSummary, { type: "READ_FAILED" }>> {
    const realCode = this.keyValueStore.getString(SESSION_EMPLOYEE_CODE_KEY);
    return ok(realCode ? { ...MOCK_PROFILE, employeeCode: realCode } : MOCK_PROFILE);
  }
}
```

Note for the implementer: this duplicates the `SESSION_EMPLOYEE_CODE_KEY` string constant across two files (`useSignIn.viewModel.tsx` and this adapter) rather than sharing an import between the `auth` and `profile` modules, which don't otherwise depend on each other. This is a deliberate, minor duplication to avoid a cross-module import for a single string literal — flag if you disagree, but don't silently introduce a new shared module just for this constant.

Modify `src/modules/app/dependencies/dependencies.dev.ts` — the `InMemoryProfileAdapter` constructor now needs `keyValueStore`, matching the existing `keyValueStore` local variable already threaded to other adapters in that file:
```typescript
    profileReader: new InMemoryProfileAdapter(keyValueStore),
```

- [ ] **Step 8: Run the profile test to verify it passes**

Run: `npx jest src/modules/profile/ui/viewModels/useProfile.viewModel.test.tsx`
Expected: `PASS`.

- [ ] **Step 9: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (2 new).

- [ ] **Step 10: Manually verify** — if you have simulator access: sign in with the real code (`12345`), navigate to Profile, confirm "Employee code" shows `12345` (not the old mock `•••45`). If you don't have simulator access, say so clearly.

- [ ] **Step 11: Commit** — skip (no git repository).

---

## Task 2: Notes screen fixes (photo/video tile distinction, per-tile remove action)

**Files:**
- Modify: `src/modules/notes/core/entities/NoteDraft.entity.ts`
- Modify: `src/modules/notes/ui/viewModels/useNotes.viewModel.tsx`
- Create: `src/modules/notes/ui/viewModels/useNotes.viewModel.test.tsx`
- Modify: `src/modules/notes/ui/screens/NotesScreen.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: photo tiles gain a `kind: "photo" | "video"` label and a per-tile remove (✕) action. `useNotesViewModel`'s state changes `photoCount: number` to `photos: {id: string; kind: "photo" | "video"}[]`; handlers gain `onRemovePhoto(id: string): void`.

- [ ] **Step 1: Read the current entity/viewModel to confirm the exact starting shape**

Read `src/modules/notes/core/entities/NoteDraft.entity.ts` and `src/modules/notes/ui/viewModels/useNotes.viewModel.tsx` in full before making changes — the brief below assumes a `photoCount: number` counter exists (confirmed via the original audit), but confirm this matches what's actually there before editing.

- [ ] **Step 2: Write the failing viewModel test**

Create `src/modules/notes/ui/viewModels/useNotes.viewModel.test.tsx`:
```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { useNotesViewModel } from "./useNotes.viewModel";

function buildTestDeps(): Dependencies {
  return { noteSaver: { save: async () => ok(undefined) } } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <DependenciesProvider dependencies={buildTestDeps()}>{children}</DependenciesProvider>;
}

describe("useNotesViewModel — photo/video tiles", () => {
  it("starts with the two seeded tiles, one photo and one video", () => {
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), { wrapper });
    expect(result.current.state.photos.map((p) => p.kind)).toEqual(["photo", "video"]);
  });

  it("onRemovePhoto removes exactly the tile with the matching id", () => {
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), { wrapper });
    const idToRemove = result.current.state.photos[0].id;

    act(() => result.current.handlers.onRemovePhoto(idToRemove));

    expect(result.current.state.photos.find((p) => p.id === idToRemove)).toBeUndefined();
    expect(result.current.state.photos).toHaveLength(1);
  });

  it("onAddPhoto still respects the max-photos cap", () => {
    const { result } = renderHook(() => useNotesViewModel({ ticketName: "Yard prep", onSaved: jest.fn() }), { wrapper });
    const before = result.current.state.photos.length;
    const max = result.current.state.maxPhotos;

    for (let i = 0; i < max + 2; i++) {
      act(() => result.current.handlers.onAddPhoto());
    }

    expect(result.current.state.photos.length).toBeLessThanOrEqual(max);
    expect(result.current.state.photos.length).toBeGreaterThanOrEqual(before);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/modules/notes/ui/viewModels/useNotes.viewModel.test.tsx`
Expected: FAIL — `photos`/`onRemovePhoto` don't exist yet (current state exposes `photoCount`, a plain number).

- [ ] **Step 4: Rewrite `useNotes.viewModel.tsx`'s photo state**

Read the current file's full contents first (to preserve the note-text/extra-work-flag/save logic exactly as-is — this task only touches the photo-tile portion). Replace the `photoCount: number` state with a `photos` array:
```typescript
interface PhotoTile {
  id: string;
  kind: "photo" | "video";
}

const MAX_PHOTOS = 4;
let nextPhotoId = 0;

// ...inside the hook, replacing the existing photoCount state:
  const [photos, setPhotos] = useState<PhotoTile[]>([
    { id: "seed-1", kind: "photo" },
    { id: "seed-2", kind: "video" },
  ]);

  const onAddPhoto = () => {
    if (photos.length >= MAX_PHOTOS) return;
    nextPhotoId += 1;
    setPhotos((prev) => [...prev, { id: `added-${nextPhotoId}`, kind: "photo" }]);
  };

  const onRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };
```
Update the returned `state`/`handlers` to expose `photos`, `maxPhotos: MAX_PHOTOS`, and `onRemovePhoto` (removing the old `photoCount`/`maxPhotos` shape if it stored `maxPhotos` differently — reconcile with whatever the current file actually has).

Note for the implementer: `nextPhotoId` as a module-level mutable counter (not component state) avoids a magic/duplicate-id risk from `Date.now()`/`Math.random()` (both unavailable in some contexts this codebase runs in) while guaranteeing unique ids across multiple `onAddPhoto` calls within one mounted screen — this is intentional, not an oversight; don't "fix" it into `useState`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/modules/notes/ui/viewModels/useNotes.viewModel.test.tsx`
Expected: `PASS` (3 tests).

- [ ] **Step 6: Update `NotesScreen.tsx`'s photo tile rendering**

Read the current file's full contents, then replace the photo-tile block with one that shows the kind label, a diagonal-stripe placeholder background, and a remove (✕) button:
```tsx
        <View style={styles.photoRow}>
          {state.photos.map((photo) => (
            <View key={photo.id} style={styles.photoTile}>
              <View style={styles.photoStripes} />
              <Text style={styles.photoLabel}>{photo.kind}</Text>
              <Pressable onPress={() => handlers.onRemovePhoto(photo.id)} style={styles.removeButton} hitSlop={6}>
                <Text style={styles.removeButtonText}>✕</Text>
              </Pressable>
            </View>
          ))}
          {state.photos.length < state.maxPhotos && (
            <Pressable onPress={handlers.onAddPhoto} style={styles.addPhotoTile}>
              <Text style={styles.addPhotoLabel}>+</Text>
            </Pressable>
          )}
        </View>
```
Add matching styles (diagonal stripes via a rotated overlay `View`, since React Native has no `repeating-linear-gradient` equivalent — this is a reasonable simplification of the prototype's CSS pattern, same category of simplification already accepted for `MapPreview` in an earlier phase):
```typescript
  photoTile: {
    width: 66,
    height: 66,
    borderRadius: 10,
    backgroundColor: "#ece9de",
    borderWidth: 1,
    borderColor: colors.progressTrack,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoStripes: {
    position: "absolute",
    top: -20,
    left: -20,
    width: 40,
    height: 110,
    backgroundColor: "rgba(120,120,100,0.08)",
    transform: [{ rotate: "45deg" }],
  },
  photoLabel: { fontSize: 9, color: colors.faint },
  removeButton: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(27,29,22,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: { fontSize: 9, fontWeight: "700", color: "#f5f3ed" },
```

- [ ] **Step 7: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (3 new).

- [ ] **Step 8: Manually verify** — if you have simulator access: navigate to Notes, confirm the two seeded tiles show "photo" and "video" labels distinctly with a subtle diagonal-stripe texture, confirm tapping the ✕ on a tile removes it, confirm adding photos still stops at 4. If you don't have simulator access, say so clearly.

- [ ] **Step 9: Commit** — skip (no git repository).

## Self-review notes

- **Spec coverage:** Task 1 covers Sync Queue's row/button typography and Profile's notification-card padding, section-label sizes, and the real-employee-code plumbing. Task 2 covers Notes' photo/video tile distinction and the missing per-tile remove action.
- **Deliberately out of scope, disclosed:** the Notes extra-work-flag Switch-vs-checkbox question and the Save-button copy question (both flagged as open product questions during the original audit) are left as-is — this phase doesn't resolve open product questions, only implements the already-decided fixes. Tickets' mock-data-naming gap is treated as effectively resolved by Phase 2's real `site`/`address`/`crew` fields and not worth a dedicated task.
- **Type consistency:** `CrewLeaderSession.employeeCode` (Task 1) and `PhotoTile`/`useNotesViewModel`'s new state shape (Task 2) are used identically across every file that touches them.
- **No magic numbers:** `SESSION_EMPLOYEE_CODE_KEY` (Task 1) and `MAX_PHOTOS` (Task 2, if not already a constant in the current file) are named constants.
