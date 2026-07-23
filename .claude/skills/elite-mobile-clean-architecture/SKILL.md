---
name: elite-mobile-clean-architecture
description: Use when creating features, refactoring, or reviewing code in the Elite Mobile (Elite Teams field-crew timekeeping) React Native/Expo prototype app. Clean Architecture with Core/Infrastructure/UI separation, ports/adapters, the Result pattern, and ViewModels. The app currently runs entirely on in-memory mock adapters — there is no real backend yet.
---

# Elite Mobile — Clean Architecture

Prescriptive architecture for **Elite Mobile**, the field-crew timekeeping prototype for Elite Teams
Offices. This is a **UI/interaction-fidelity prototype**, not a production build: every adapter is an
in-memory mock (`InMemory*Adapter`), there is no backend, and no data persists beyond the device's own
local storage. The clean-architecture boundaries exist so that swapping mocks for real adapters later
(a REST API, a real sync engine) never touches `core/` or `ui/`.

**Stack:** Expo SDK 54 (New Architecture) • Expo Router (file-based routes in `app/`) • TypeScript strict •
React Context for cross-cutting state (no Zustand/Redux) • `@tanstack/react-query` for the one real
network-backed module • `react-native-mmkv` for local persistence (no SQLite) • Jest + jest-expo +
`@testing-library/react-native` • Maestro (E2E) • ESLint (`eslint-config-expo`) + Prettier.

**Patterns:** Ports/Adapters • Use Cases • Result Pattern • ViewModel • Dependency Injection via
React Context.

## Core Principles

1. **Core depends on nothing.** `ui/` and `infrastructure/` import from `core/`, never the reverse.
   `core/` never imports React, Expo, or any native module.
2. **The UI only ever touches usecases, never adapters directly.** ViewModels call usecases via
   `useDependencies()`; nothing outside `infrastructure/` imports an `*.adapter.ts` file.
3. **Every module today is mock-backed.** `infrastructure/adapters/InMemory*.adapter.ts` files hold
   their state in a plain in-memory array/Map for the life of the app process — nothing survives an
   app restart except what's explicitly persisted via MMKV (device registration, session, sync-queue
   pending state).
4. **This is not yet an offline-sync product.** There is no outbox, no idempotency keys, no BFF, no
   Acumatica/Workforce Go integration. The `sync` module's Sync Queue screen is a **read-only** view
   over mock data today. See `elite-mobile-offline` for what real offline infrastructure _does_ exist
   (React Query caching + mutation pause/resume) and its current scope.

```
UI (screens, viewModels) ──▶ Core (entities, usecases, ports) ◀── Infrastructure (adapters)
                                        ▲
                          composition root (dependencies.dev.ts) wires
                          one InMemory*/Expo*/Mmkv* adapter per port
```

## Project Structure (as it actually exists)

```
app/                                 # Expo Router file-based routes — route files are thin wrappers
├── (tabs)/                          # home.tsx, roster.tsx, tickets.tsx, timesheet.tsx + _layout.tsx (PROTECTED)
├── index.tsx, sign-in.tsx, device-registration.tsx, attestation.tsx,
│   notes.tsx, profile.tsx, sync-queue.tsx, ticket-detail.tsx, travel.tsx
├── api-integration-example.tsx      # isolated demo route, not part of the real app flow
└── _layout.tsx                      # root layout: DependenciesProvider, LanguageProvider,
                                      # TimerProvider, NotificationsProvider, PersistQueryClientProvider

modules/
└── expo-device-identity/            # a locally-authored native module (Secure Enclave key store)

src/
├── ui/                               # Shared atoms/molecules/organisms, theme, cross-cutting utils
│   ├── components/{atoms,molecules,organisms}/
│   ├── theme/                        # colors.ts, typography.ts, layout.ts, glass.ts
│   └── utils/
│
├── modules/
│   ├── app/                          # composition root + cross-cutting React state
│   │   ├── dependencies/             Dependencies.type.ts · dependencies.dev.ts
│   │   └── react/                    DependenciesProvider.tsx · useDependencies.tsx ·
│   │                                 language/ (LanguageProvider + translations) ·
│   │                                 timer/ (TimerProvider) · notifications/ (NotificationsProvider) ·
│   │                                 queryClient/ (React Query + offline wiring)
│   │
│   ├── splash/ · deviceRegistration/ · auth/ · home/ · roster/ · clock/ · tickets/ ·
│   │   travel (part of tickets)/ · timesheet/ · notes/ · sync/ · profile/
│   │   — each follows: core/{entities,ports,usecases}/, infrastructure/adapters/,
│   │     ui/{screens,viewModels}/
│   │
│   ├── shared/storage/               KeyValueStore.port.ts · MmkvKeyValueStore.adapter.ts
│   │
│   └── apiIntegrationExample/        # deliberately isolated REST + offline-query reference module,
│                                     # not wired into any real screen — see its own file header
│
└── types/                            Result.ts

__mocks__/                            # Jest manual mocks for native modules that crash under test
                                      # (expo-crypto, expo-file-system, expo-glass-effect,
                                      # expo-notifications, expo-secure-store, react-native-mmkv,
                                      # react-native-safe-area-context, @react-native-community/netinfo)

.maestro/flows/                       # E2E flows, see .maestro/README.md
```

> **`ios/` and `android/` ARE committed to git**, not regenerated on every build. Native config changes
> (permissions, plugins) go through `app.config.ts` + `plugins/*.js`, then require **`npx expo prebuild
--platform ios`** to sync into the committed native project before `pod install` + rebuild — this
> project does not auto-run prebuild the way a fully-managed/CNG-only workflow would. Custom plugins
> already in use: `plugins/withFmtConstevalFix.js` (Podfile patch), `plugins/withoutPushEntitlement.js`
> (strips an unwanted autolinked entitlement — see its own comment for why).

## File Naming Conventions

| Type                     | Extension                                     | Example                                                            |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------------ |
| Entity                   | `.entity.ts`                                  | `JobTicket.entity.ts`, `TicketAttachment.entity.ts`                |
| Port (interface)         | `.port.ts`                                    | `TicketsReader.port.ts`, `MediaCapture.port.ts`                    |
| Use Case                 | `.usecase.ts`                                 | `GetTicketDetail.usecase.ts`, `CaptureTicketAttachment.usecase.ts` |
| Adapter (impl)           | `.adapter.ts`                                 | `InMemoryTickets.adapter.ts`, `ExpoMediaCapture.adapter.ts`        |
| ViewModel                | `.viewModel.tsx`                              | `useTicketDetail.viewModel.tsx`                                    |
| React component / screen | `PascalCase.tsx`                              | `TicketDetailScreen.tsx`                                           |
| Unit test (colocated)    | `.test.ts(x)`                                 | `CaptureTicketAttachment.usecase.test.ts`                          |
| Maestro E2E flow         | `NN-description.yaml` under `.maestro/flows/` | `04-roster-add-worker.yaml`                                        |

**Adapters are named by their technology/role, not with an `I` prefix on the port.** Port = role
(`TicketsReader`); adapter = `InMemoryTicketsAdapter` (mock) or `ExpoMediaCaptureAdapter` (real native
capability — `Native`/`Expo`/`Mmkv`-prefixed adapters are the ones actually backed by a real device
API, everything else is `InMemory*` until a real backend exists).

## Layer Rules

### Core (`core/`)

```
✅ Entities (plain types), ports (interfaces), usecases (business logic)
✅ Uses Result<T,E> for errors; imports only types/, same-module core files, and injected primitives
   (e.g. a usecase takes `generateId: () => string` as a constructor arg rather than importing
   expo-crypto directly — keeps it framework-free and deterministic in tests)
❌ NEVER import infrastructure/ or ui/; NEVER import React or any Expo/native module
```

### Infrastructure (`infrastructure/adapters/`)

```
✅ Adapters implement ports; today that means either an in-memory mock or a thin wrapper around one
   real Expo API (expo-image-picker, expo-secure-store, react-native-mmkv, etc.)
✅ Transform external/native data → Core entities; return Result<T,E>
❌ NO business logic beyond mapping/IO; NEVER import ui/
```

### UI (`ui/{screens,viewModels}/`)

```
✅ Screens are presentation only; ViewModels return { state, handlers } and call usecases via
   useDependencies()
✅ All user-facing copy comes from strings.<namespace> (useLanguage()) — never a bare literal string
❌ NO business logic in components/viewModels; NEVER import an adapter directly (only via the port
   type + useDependencies())
```

## Dependency Injection

One composition root: `src/modules/app/dependencies/dependencies.dev.ts` builds a single
`Dependencies` object (typed by `Dependencies.type.ts`) wiring exactly one adapter per port, and
`DependenciesProvider` puts it in React Context. `useDependencies()` is the only way a ViewModel
reaches an adapter. A `dependencies.test-env.ts` file exists (currently just re-exporting
`buildDevDependencies()` under a different name) but has **zero actual usages** — every
`use*.viewModel.test.tsx` builds its own hand-written fake `Dependencies` object inline instead of
importing it. Follow that existing pattern for new tests rather than reaching for the unused file.

## Result Pattern

```typescript
// src/types/Result.ts
type Success<T> = { success: true; data: T };
type Failure<E> = { success: false; error: E };
type Result<T, E = Error> = Success<T> | Failure<E>;
export const ok = <T>(data: T): Success<T> => ({ success: true, data });
export const fail = <E>(error: E): Failure<E> => ({ success: false, error });
```

Usecases and adapters return `Result<T,E>`, never throw. Error types are discriminated unions
(`{ type: "NOT_FOUND" } | { type: "READ_FAILED" }`), not generic `Error`.

## Localization — every string, including mock data

All user-facing text comes from `src/modules/app/react/language/translations/{en,es}.ts`, typed by
`Translations.type.ts` (TypeScript enforces both dictionaries have identical shape). **Mock adapters
stay language-neutral by design** — they carry language-neutral fields (`statusKind`, a fixed `id`,
etc.), and the owning ViewModel derives the actual translated text from those fields. Never thread a
`language` parameter through a port or usecase signature to translate mock content.

## Testing

- Colocated `*.test.ts(x)` next to the file it covers.
- Usecases/adapters: plain Jest unit tests against `Result` output, both success and failure paths.
- ViewModels: `renderHook` (`@testing-library/react-native`) wrapped in a real `DependenciesProvider`
  - `LanguageProvider` (+ `TimerProvider`/`NotificationsProvider` where the viewModel needs them),
    with a hand-built fake `Dependencies` object — not a shared DI profile.
- No enforced coverage threshold — this is a fidelity prototype, not a coverage-gated production repo.
  Run `npm test` (all), `npx jest <path>` (one file/module).
- E2E: Maestro, YAML flows in `.maestro/flows/`, run via `npm run e2e` or `maestro test <file>`. See
  `.maestro/README.md` for creating new flows and the CI workflow (`.github/workflows/e2e.yml`).

## Protected Files — never modify

- `app/(tabs)/_layout.tsx` — the bottom tab bar
- `src/ui/components/atoms/GlassSurface.tsx` — shared glass-surface primitive with a known
  content-based auto-sizing behavior other components rely on

Both are excluded from lint/format tooling (`.prettierignore`) and tuned to exact prototype fidelity;
changes here have broken multiple downstream screens in the past.

## No Magic Numbers

Extract named constants for any bare literal with meaning (`MEAL_MINIMUM_SECONDS`,
`SECONDS_PER_HOUR`, `THUMBNAIL_SIZE`, etc.) — see any existing usecase/component for the convention.

## Linting & Formatting

| Tool         | Config file                            | Role                                                                                                                                                                                     |
| ------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint       | `eslint.config.js`                     | Correctness — `eslint-config-expo/flat` (RN/Expo + React Hooks rules) as the base, with `eslint-config-prettier` layered on top to turn off any stylistic rule that would fight Prettier |
| Prettier     | `.prettierrc.json` + `.prettierignore` | All formatting — 120 col width, double quotes, trailing commas, semicolons                                                                                                               |
| EditorConfig | `.editorconfig`                        | Cross-editor whitespace defaults (2-space indent, LF, trim trailing whitespace)                                                                                                          |

**Division of responsibility:** Prettier owns formatting, ESLint owns everything else. Don't add a
stylistic ESLint rule (quote style, indentation, etc.) — that's Prettier's job and
`eslint-config-prettier` already disables ESLint's overlapping rules to prevent the two from
disagreeing.

**Protected files are excluded from both** (`.prettierignore` and `eslint.config.js`'s `ignores`
don't need a separate entry since ESLint doesn't touch `app/(tabs)/_layout.tsx`/`GlassSurface.tsx`
by rule, but Prettier is explicitly told not to reformat them) — running `npm run format` must never
touch either file. If it does, that's a bug in `.prettierignore`, not something to fix by hand-
reverting after the fact.

```bash
npm run lint          # ESLint
npm run lint:fix       # ESLint, auto-fixing what it can
npm run format         # Prettier, writes changes
npm run format:check   # Prettier, check-only (what CI/pre-commit should run)
npm run typecheck      # tsc --noEmit
npm test               # Jest
```

Run all four (lint, format:check, typecheck, test) before considering any change done — see
`CONTRIBUTING.md` for the exact pre-commit checklist. Commit messages follow Conventional Commits
(`type(scope): imperative summary`) — see `CONTRIBUTING.md` for the full convention and examples.

## Related

- `elite-mobile-offline` — the real offline/React-Query infrastructure that exists today, its actual
  scope (one demo module, not yet the whole app), and what building it out further would look like.
- `elite-mobile-solid-principles` — how SRP/OCP/LSP/ISP/DIP map onto this module shape, with real
  examples of each, and how the existing `useDependencies()` mechanism already is this project's DI.
