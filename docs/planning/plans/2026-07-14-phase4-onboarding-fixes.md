# Phase 4 — Onboarding Fixes Implementation Plan

**Goal:** Fix two onboarding-flow gaps from the prototype-fidelity audit: every app launch currently forces a full device-registration + sign-in flow even on a previously-approved device, and the Sign In screen's keypad is a fundamentally different interaction (circular/shuffled/auto-submit) than the prototype's design (rectangular/ordered/explicit-confirm-key), plus it has an invented branch-selector row not in the design and is missing a "Device verified" confirmation.

**Architecture:** Clean-architecture module pattern, matching prior phases. Device registration already persists through Phase 1's real MMKV-backed `KeyValueStore` (confirmed by reading `LocalDeviceRegistrarAdapter.ts` — no new persistence work needed here, just reading the already-persisted status on launch).

**Tech Stack:** React Native 0.81 / Expo SDK 54 / expo-router 6 / TypeScript 5.9 / jest-expo.

## Global Constraints

- Do NOT modify `src/ui/components/atoms/GlassSurface.tsx` or `app/(tabs)/_layout.tsx`.
- No magic numbers.
- This project has NO git repository — skip "git add"/"git commit" steps.
- Match existing patterns: `GlassSurface`, `colors`/`typography`, `Pressable` + `expo-haptics`, `Result<T,E>` usecases.
- `Keypad.tsx` (`src/ui/components/atoms/Keypad.tsx`) has exactly one consumer in the whole codebase — `SignInScreen.tsx` (confirm this with a grep before starting Task 2) — so this plan directly redesigns it rather than adding a variant prop for a hypothetical second consumer that doesn't exist (YAGNI).

---

## Task 1: Splash — skip re-registration when device is already approved, caption fix

**Files:**
- Modify: `src/modules/splash/ui/viewModels/useSplash.viewModel.tsx`
- Create: `src/modules/splash/ui/viewModels/useSplash.viewModel.test.tsx`
- Modify: `src/modules/splash/ui/screens/SplashScreen.tsx`
- Modify: `app/index.tsx`

**Interfaces:**
- Consumes: `GetDeviceRegistrationUseCase` (already exists, `src/modules/deviceRegistration/core/usecases/GetDeviceRegistration.usecase.ts`), `deviceRegistrar` (already on `Dependencies`).
- Produces: `useSplashViewModel`'s state gains `alreadyApproved: boolean`. `SplashScreen`'s `onContinue` prop signature changes from `() => void` to `(alreadyApproved: boolean) => void` — `app/index.tsx` uses this to route directly to `/sign-in` (skipping `/device-registration`) when the device was already approved on a prior launch.

- [ ] **Step 1: Write the failing viewModel test**

Create `src/modules/splash/ui/viewModels/useSplash.viewModel.test.tsx`. First read
`src/modules/deviceRegistration/core/ports/DeviceRegistrar.port.ts` to confirm the exact shape,
then:

```tsx
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok } from "@/types/Result";
import { DeviceRegistration } from "@modules/deviceRegistration/core/entities/DeviceRegistration.entity";
import { useSplashViewModel } from "./useSplash.viewModel";

function buildTestDeps(registration: DeviceRegistration | null): Dependencies {
  return {
    appReadinessReader: { read: async () => ok({ lastSyncAt: null }) },
    deviceRegistrar: { read: async () => ok(registration), register: async (r: DeviceRegistration) => ok(r) },
  } as unknown as Dependencies;
}

function wrapperFor(registration: DeviceRegistration | null) {
  return ({ children }: { children: React.ReactNode }) => (
    <DependenciesProvider dependencies={buildTestDeps(registration)}>{children}</DependenciesProvider>
  );
}

describe("useSplashViewModel — device approval check", () => {
  it("alreadyApproved is false when no device registration exists yet", async () => {
    const { result } = renderHook(() => useSplashViewModel(), { wrapper: wrapperFor(null) });
    await waitFor(() => expect(result.current.state.alreadyApproved).toBe(false));
  });

  it("alreadyApproved is false when the device is still pending", async () => {
    const registration: DeviceRegistration = { deviceName: "d", status: "pending", publicKey: "k", hardwareBacked: true };
    const { result } = renderHook(() => useSplashViewModel(), { wrapper: wrapperFor(registration) });
    await waitFor(() => expect(result.current.state.alreadyApproved).toBe(false));
  });

  it("alreadyApproved is true when the device was previously approved", async () => {
    const registration: DeviceRegistration = { deviceName: "d", status: "approved", publicKey: "k", hardwareBacked: true };
    const { result } = renderHook(() => useSplashViewModel(), { wrapper: wrapperFor(registration) });
    await waitFor(() => expect(result.current.state.alreadyApproved).toBe(true));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/splash/ui/viewModels/useSplash.viewModel.test.tsx`
Expected: FAIL — `alreadyApproved` doesn't exist on state yet.

- [ ] **Step 3: Extend `useSplash.viewModel.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { GetAppReadinessUseCase } from "../../core/usecases/GetAppReadiness.usecase";
import { GetDeviceRegistrationUseCase } from "@modules/deviceRegistration/core/usecases/GetDeviceRegistration.usecase";

const formatLastSync = (iso: string | null): string => {
  if (!iso) return "Not yet synced";
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const useSplashViewModel = () => {
  const { appReadinessReader, deviceRegistrar } = useDependencies();
  const [progress, setProgress] = useState(0.15);
  const [lastSyncLabel, setLastSyncLabel] = useState("Checking last sync…");
  const [ready, setReady] = useState(false);
  const [alreadyApproved, setAlreadyApproved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const usecase = new GetAppReadinessUseCase(appReadinessReader);

    usecase.execute().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setLastSyncLabel(formatLastSync(result.data.lastSyncAt));
      }
    });

    new GetDeviceRegistrationUseCase(deviceRegistrar).execute().then((result) => {
      if (cancelled) return;
      if (result.success) setAlreadyApproved(result.data?.status === "approved");
    });

    const timer = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(1, p + 0.17);
        if (next >= 1) {
          clearInterval(timer);
          setReady(true);
        }
        return next;
      });
    }, 220);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state: { progress, lastSyncLabel, ready, alreadyApproved },
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/splash/ui/viewModels/useSplash.viewModel.test.tsx`
Expected: `PASS` (3 tests).

- [ ] **Step 5: Update `SplashScreen.tsx`**

Fix the caption's typography token (`typography.body` → `typography.caption`, matching the
prototype's 11.5px/600 spec instead of the current 12.5px/500) and thread `alreadyApproved`
through to `onContinue`:

```tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { PillButton } from "@/ui/components/atoms/PillButton";
import { ProgressBar } from "@/ui/components/atoms/ProgressBar";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { useSplashViewModel } from "../viewModels/useSplash.viewModel";

interface SplashScreenProps {
  onContinue: (alreadyApproved: boolean) => void;
}

export function SplashScreen({ onContinue }: SplashScreenProps) {
  const { state } = useSplashViewModel();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.logo}>
          <Text style={styles.logoLetter}>E</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[typography.brandTitle, styles.title]}>Elite Mobile</Text>
          <Text style={[typography.brandSubtitle, styles.subtitle]}>Field time &amp; job capture</Text>
        </View>

        <View style={styles.loadingBlock}>
          <Text style={[typography.body, { color: colors.dim }]}>Loading today&apos;s work…</Text>
          <ProgressBar progress={state.progress} />
        </View>

        <Text style={[typography.caption, styles.syncCaption]}>
          Last sync: {state.lastSyncLabel} · Language set by employee profile
        </Text>

        <PillButton label="Continue" onPress={() => onContinue(state.alreadyApproved)} style={styles.continueButton} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 54,
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(180,120,0,0.55)",
    shadowOpacity: 1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  logoLetter: { fontSize: 44, fontWeight: "800", color: colors.accentInk },
  titleBlock: { alignItems: "center" },
  title: { color: colors.ink, textTransform: "uppercase" },
  subtitle: { color: colors.faint, marginTop: 5, textTransform: "uppercase" },
  loadingBlock: { alignItems: "center", gap: 9 },
  syncCaption: { color: colors.faint, textAlign: "center" },
  continueButton: { width: "100%" },
});
```

Note for the implementer: the "Last sync: … · Language set by employee profile" caption is
app-invented copy with no prototype equivalent (flagged as an open product question during the
audit, not yet answered) — this task keeps it as-is; do not remove it without being asked to.

- [ ] **Step 6: Update `app/index.tsx`**

```tsx
import React from "react";
import { router } from "expo-router";
import { SplashScreen } from "@modules/splash/ui/screens/SplashScreen";

export default function Index() {
  return (
    <SplashScreen
      onContinue={(alreadyApproved) => router.replace(alreadyApproved ? "/sign-in" : "/device-registration")}
    />
  );
}
```

- [ ] **Step 7: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (3 new).

- [ ] **Step 8: Manually verify** — if you have simulator access: clear the app's persisted state (or check what happens on first ever launch) to confirm `/device-registration` still shows normally; then, with a device already approved (e.g. via the demo "account manager approves" button, relaunch the app), confirm tapping Continue on Splash skips straight to `/sign-in`. If you don't have simulator/display access in this environment, say so clearly rather than claiming this was verified.

- [ ] **Step 9: Commit** — skip (no git repository).

---

## Task 2: Sign In — rectangular ordered keypad, Device verified row, remove invented branch selector, fix PIN dots

**Files:**
- Modify: `src/ui/theme/colors.ts`
- Modify: `src/ui/components/atoms/Keypad.tsx`
- Modify: `src/modules/auth/ui/viewModels/useSignIn.viewModel.tsx`
- Create: `src/modules/auth/ui/viewModels/useSignIn.viewModel.test.tsx`
- Modify: `src/modules/auth/ui/screens/SignInScreen.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Keypad`'s key set changes from `[shuffled 0-9, "", digit, "⌫"]` to a fixed
  `["1","2","3","4","5","6","7","8","9","⌫","0","✓"]` layout with rectangular (not circular) keys
  and an `onKeyPress` call for `"✓"` in addition to digits/`"⌫"`. `useSignInViewModel`'s `onKeyPress`
  no longer auto-submits at `CODE_LENGTH` digits — it now waits for an explicit `"✓"` press.
  `colors.ts` gains `dotUnfilled: "#c8c4b4"`.

- [ ] **Step 1: Confirm `Keypad` has exactly one consumer**

Run: `grep -rn "Keypad" /Users/sharonpjoseph/Documents/EliteTeamsOffices/EliteMobile/src /Users/sharonpjoseph/Documents/EliteTeamsOffices/EliteMobile/app --include="*.tsx" -l`
Expected: only `src/ui/components/atoms/Keypad.tsx` (the definition) and
`src/modules/auth/ui/screens/SignInScreen.tsx` (the one usage). If this turns up a second
consumer, STOP and report NEEDS_CONTEXT — the plan's premise (safe to redesign in place) would be
wrong.

- [ ] **Step 2: Add the missing color token**

Modify `src/ui/theme/colors.ts` — add one line near the other `surface`/`border` tokens:
```typescript
  dotUnfilled: "#c8c4b4",
```

- [ ] **Step 3: Write the failing viewModel test**

Create `src/modules/auth/ui/viewModels/useSignIn.viewModel.test.tsx`:
```tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { ok, fail } from "@/types/Result";
import { useSignInViewModel } from "./useSignIn.viewModel";

function buildTestDeps(validCode: string): Dependencies {
  return {
    sessionAuthenticator: {
      signIn: async (code: string) =>
        code === validCode ? ok({ crewLeaderName: "Test", employeeCode: code }) : fail({ type: "INVALID_CODE" }),
    },
  } as unknown as Dependencies;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <DependenciesProvider dependencies={buildTestDeps("12345")}>{children}</DependenciesProvider>;
}

describe("useSignInViewModel — explicit confirm key", () => {
  it("does not submit while digits are entered, only when ✓ is pressed with a full code", async () => {
    const onSignedIn = jest.fn();
    const { result } = renderHook(() => useSignInViewModel({ onSignedIn }), { wrapper });

    act(() => {
      "12345".split("").forEach((d) => result.current.handlers.onKeyPress(d));
    });
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(result.current.state.code).toBe("12345");

    await act(async () => result.current.handlers.onKeyPress("✓"));
    expect(onSignedIn).toHaveBeenCalledTimes(1);
  });

  it("✓ with an incomplete code is a no-op", async () => {
    const onSignedIn = jest.fn();
    const { result } = renderHook(() => useSignInViewModel({ onSignedIn }), { wrapper });

    act(() => {
      "123".split("").forEach((d) => result.current.handlers.onKeyPress(d));
    });
    await act(async () => result.current.handlers.onKeyPress("✓"));

    expect(onSignedIn).not.toHaveBeenCalled();
    expect(result.current.state.code).toBe("123");
  });

  it("✓ with a wrong full code sets hasError and clears after the delay", async () => {
    jest.useFakeTimers();
    const onSignedIn = jest.fn();
    const { result } = renderHook(() => useSignInViewModel({ onSignedIn }), { wrapper });

    act(() => {
      "00000".split("").forEach((d) => result.current.handlers.onKeyPress(d));
    });
    await act(async () => result.current.handlers.onKeyPress("✓"));

    expect(result.current.state.hasError).toBe(true);
    act(() => jest.advanceTimersByTime(350));
    expect(result.current.state.hasError).toBe(false);
    expect(result.current.state.code).toBe("");
    jest.useRealTimers();
  });

  it("backspace removes the last digit", async () => {
    const { result } = renderHook(() => useSignInViewModel({ onSignedIn: jest.fn() }), { wrapper });

    act(() => result.current.handlers.onKeyPress("1"));
    act(() => result.current.handlers.onKeyPress("2"));
    act(() => result.current.handlers.onKeyPress("⌫"));

    expect(result.current.state.code).toBe("1");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx jest src/modules/auth/ui/viewModels/useSignIn.viewModel.test.tsx`
Expected: FAIL — current `onKeyPress` auto-submits at 5 digits without waiting for `"✓"`.

- [ ] **Step 5: Rewrite `useSignIn.viewModel.tsx`**

```tsx
import { useCallback, useRef, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { SignInUseCase } from "../../core/usecases/SignIn.usecase";
import { CrewLeaderSession } from "../../core/entities/CrewLeaderSession.entity";

const CODE_LENGTH = 5;
const ERROR_DISPLAY_MS = 350;

interface UseSignInViewModelArgs {
  onSignedIn: (session: CrewLeaderSession) => void;
}

export const useSignInViewModel = ({ onSignedIn }: UseSignInViewModelArgs) => {
  const { sessionAuthenticator } = useDependencies();
  const [code, setCode] = useState("");
  const [hasError, setHasError] = useState(false);
  const submitting = useRef(false);

  const submit = useCallback(
    async (fullCode: string) => {
      if (submitting.current) return;
      submitting.current = true;

      const usecase = new SignInUseCase(sessionAuthenticator);
      const result = await usecase.execute(fullCode);

      submitting.current = false;

      if (result.success) {
        setCode("");
        onSignedIn(result.data);
        return;
      }

      setHasError(true);
      setTimeout(() => {
        setHasError(false);
        setCode("");
      }, ERROR_DISPLAY_MS);
    },
    [sessionAuthenticator, onSignedIn],
  );

  const onKeyPress = useCallback(
    (key: string) => {
      if (hasError) return;

      if (key === "⌫") {
        setCode((prev) => prev.slice(0, -1));
        return;
      }

      if (key === "✓") {
        if (code.length === CODE_LENGTH) submit(code);
        return;
      }

      setCode((prev) => (prev.length >= CODE_LENGTH ? prev : prev + key));
    },
    [hasError, code, submit],
  );

  return {
    state: { code, codeLength: CODE_LENGTH, hasError },
    handlers: { onKeyPress },
  };
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest src/modules/auth/ui/viewModels/useSignIn.viewModel.test.tsx`
Expected: `PASS` (4 tests).

- [ ] **Step 7: Rewrite `Keypad.tsx`** — rectangular keys, fixed order, explicit confirm key

```tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { GlassSurface } from "./GlassSurface";
import { colors } from "../../theme/colors";
import { fontMono } from "../../theme/typography";

const KEY_WIDTH = 58;
const KEY_HEIGHT = 58;
const KEY_RADIUS = 18;
const GAP = 14;
const COLUMNS = 3;
const GRID_WIDTH = KEY_WIDTH * COLUMNS + GAP * (COLUMNS - 1);

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

interface KeypadProps {
  onKeyPress: (key: string) => void;
  disabled?: boolean;
}

// Matches the design's fixed-order numeric keypad with an explicit confirm key — 1-9 in row-major
// order, then ⌫/0/✓ on the last row. Unlike a shuffled security keypad, this layout is fixed and
// predictable, matching the prototype's spec exactly (rectangular keys, not circular).
export function Keypad({ onKeyPress, disabled }: KeypadProps) {
  const handlePress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onKeyPress(key);
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((key) => {
        if (key === "⌫") {
          return (
            <Pressable
              key={key}
              disabled={disabled}
              onPress={() => handlePress(key)}
              style={[styles.keySlot, disabled && styles.disabledKey]}
            >
              <Text style={styles.backspaceLabel}>⌫</Text>
            </Pressable>
          );
        }

        const isConfirm = key === "✓";
        return (
          <Pressable
            key={key}
            disabled={disabled}
            onPress={() => handlePress(key)}
            style={[styles.keySlot, disabled && styles.disabledKey]}
          >
            <GlassSurface
              radius={KEY_RADIUS}
              interactive
              shadow={false}
              tintColor={isConfirm ? colors.jobBg : undefined}
              style={[styles.key, isConfirm && { borderWidth: 1.5, borderColor: colors.jobBorder }]}
            >
              <View style={styles.keyContent}>
                <Text style={[styles.keyLabel, { fontFamily: fontMono }, isConfirm && { color: colors.job, fontSize: 24 }]}>
                  {key}
                </Text>
              </View>
            </GlassSurface>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: GRID_WIDTH,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    alignSelf: "center",
  },
  keySlot: { width: KEY_WIDTH, height: KEY_HEIGHT, alignItems: "center", justifyContent: "center" },
  disabledKey: { opacity: 0.5 },
  key: { width: KEY_WIDTH, height: KEY_HEIGHT },
  keyContent: { width: KEY_WIDTH, height: KEY_HEIGHT, alignItems: "center", justifyContent: "center" },
  keyLabel: { fontSize: 20, fontWeight: "400", color: colors.ink },
  backspaceLabel: { color: colors.dim, fontSize: 22 },
});
```

Note for the implementer: this replaces the shuffled-circular-keypad design entirely, since it has
no other consumer (confirmed Step 1). Do not keep the old shuffling logic behind a flag or
half-migrate it — the whole point of this task is that the shuffled/circular/auto-submit design
doesn't match the spec at all, not just needs an option added.

- [ ] **Step 8: Rewrite `SignInScreen.tsx`** — remove the branch selector, add "Device verified",
fix PIN dot styling, wire the confirm key

```tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/ui/components/organisms/ScreenBackground";
import { Keypad } from "@/ui/components/atoms/Keypad";
import { colors } from "@/ui/theme/colors";
import { typography } from "@/ui/theme/typography";
import { useSignInViewModel } from "../viewModels/useSignIn.viewModel";
import { CrewLeaderSession } from "../../core/entities/CrewLeaderSession.entity";

interface SignInScreenProps {
  onSignedIn: (session: CrewLeaderSession) => void;
}

export function SignInScreen({ onSignedIn }: SignInScreenProps) {
  const { state, handlers } = useSignInViewModel({ onSignedIn });
  const { code, codeLength, hasError } = state;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={[typography.largeDate, styles.title]}>Sign in</Text>

        <View style={styles.verifiedRow}>
          <View style={styles.verifiedDot} />
          <Text style={styles.verifiedText}>Device verified</Text>
        </View>

        <View style={styles.pinBlock}>
          <Text style={[typography.sectionLabel, styles.codeLabel]}>Employee code</Text>

          <View style={styles.dotsRow}>
            {Array.from({ length: codeLength }).map((_, index) => {
              const filled = index < code.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    filled && { backgroundColor: hasError ? colors.off : colors.accent },
                    { borderColor: hasError ? colors.off : filled ? colors.accent : colors.dotUnfilled },
                  ]}
                />
              );
            })}
          </View>

          <Keypad onKeyPress={handlers.onKeyPress} disabled={hasError} />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 13, paddingHorizontal: 20, paddingTop: 106, paddingBottom: 22 },
  title: { color: colors.ink },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifiedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.job },
  verifiedText: { fontSize: 11, fontWeight: "700", color: colors.job },
  pinBlock: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },
  codeLabel: { color: colors.faint, textTransform: "uppercase" },
  dotsRow: { flexDirection: "row", gap: 10, justifyContent: "center" },
  dot: { width: 13, height: 13, borderRadius: 6.5, borderWidth: 2 },
});
```

- [ ] **Step 9: Typecheck and run the full test suite**

Run: `npm run typecheck && npx jest`
Expected: typecheck clean, all tests pass (4 new).

- [ ] **Step 10: Manually verify** — if you have simulator access: confirm the keypad now shows
rectangular keys in fixed 1-9/⌫/0/✓ order (not shuffled), typing 5 digits does NOT auto-submit,
tapping ✓ with 5 digits submits, tapping ✓ with fewer digits does nothing, a wrong code shows the
red error state briefly then clears, and the "Branch — Chesterfield" row is gone while "Device
verified" now shows. If you don't have simulator/display access, say so clearly.

- [ ] **Step 11: Commit** — skip (no git repository).

## Self-review notes

- **Spec coverage:** Task 1 covers the skip-if-approved logic and the Splash caption fix. Task 2
  covers the keypad redesign, Device verified row, branch-selector removal, and PIN dot styling.
- **Known decision, disclosed:** the Splash screen's invented "Last sync… · Language set by
  employee profile" caption is left in place (an open product question from the original audit,
  not something this phase resolves) — only its typography token is corrected.
- **Type consistency:** `SplashScreen`'s `onContinue` signature change (`() => void` →
  `(alreadyApproved: boolean) => void`) is applied consistently in `app/index.tsx`. `Keypad`'s new
  fixed `KEYS` array and `"✓"` handling are consistent between the component and the viewModel.
- **No magic numbers:** `ERROR_DISPLAY_MS` (Task 2) is a named constant, matching the existing
  `CODE_LENGTH` convention already in this file.
