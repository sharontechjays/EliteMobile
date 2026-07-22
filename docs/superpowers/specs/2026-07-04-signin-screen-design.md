# Sign-in screen — design

## Purpose
Add the Sign-in screen from the "Elite Mobile Glass" mockup as the second screen in the app flow
(Splash → **Sign-in** → Home), using mock/in-memory data. First of the day-lifecycle screen sequence
(Sign-in → Crew roster → Today's tickets → Ticket detail/Clock in-out → Notes & photos → Daily
timesheet → Sync queue → Profile & settings).

## Scope
- New `auth` module, layered like `splash`/`home` (`core / infrastructure / ui`).
- PIN-style employee code entry: title "Sign in", static branch label (`Branch — Chesterfield ▾`,
  non-interactive), "Employee code" label, 5 dots, 3×4 keypad (1–9, blank, 0, ⌫).
- Auto-submits on the 5th digit. Success calls `onSignedIn()`. Failure flashes dots red then clears
  for retry.
- Out of scope: branch switching, lockout-after-N-attempts, biometrics, real backend auth — these are
  compliance/backend features that need a real session/backend layer, not a UI mock.

## Architecture
```
src/modules/auth/
├── core/
│   ├── entities/CrewLeaderSession.entity.ts
│   ├── ports/SessionAuthenticator.port.ts
│   └── usecases/SignIn.usecase.ts
├── infrastructure/adapters/InMemorySessionAuthenticator.adapter.ts   # hardcoded demo code "12345" → "H. Jackson"
└── ui/
    ├── screens/SignInScreen.tsx
    └── viewModels/useSignIn.viewModel.tsx
```

- `SessionAuthenticator.signIn(code): Promise<Result<CrewLeaderSession, {type:"INVALID_CODE"}>>`
- New shared atom `src/ui/components/atoms/Keypad.tsx` (3×4 grid, reusable for future PIN entry).

## Wiring
- `SCREENS.SIGNIN` added; `render.tsx` flow becomes Splash → SignIn → Home.
- `Dependencies.type.ts` / `dependencies.dev.ts` gain `sessionAuthenticator`.

## Testing
No test harness exists yet in this repo (no jest config despite the `test` script) — not adding one
as part of this UI-focused pass.
