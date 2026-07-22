# Contributing to Elite Mobile

## Before you commit

Run these locally — CI expects all four to be clean:

```bash
npm run lint        # ESLint
npm run format:check # Prettier
npm run typecheck    # tsc --noEmit
npm test             # Jest
```

`npm run lint:fix` and `npm run format` will auto-fix most issues.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

<optional body — the why, not the what>
```

**Types:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`

**Rules:**
- Subject line in the imperative mood ("add", not "added"/"adds"), no trailing period, under ~72 characters.
- Scope is the module or area touched (e.g. `feat(timesheet): ...`, `fix(sync-queue): ...`).
- The body explains *why* a change was made when that isn't obvious from the diff — not a restatement of the diff itself.
- One logical change per commit. Don't bundle unrelated fixes into a feature commit.

**Examples:**
```
feat(profile): add language toggle to settings row
fix(sync-queue): correct pending-count badge when queue is empty
refactor(timesheet): extract MEAL_MINIMUM_SECONDS constant
```

## Coding standards

**Architecture:** every module under `src/modules/<name>/` follows the same clean-architecture shape:

```
core/entities/     — plain data types
core/ports/        — interfaces the module depends on
core/usecases/     — business logic, framework-free
infrastructure/adapters/ — concrete implementations of ports
ui/viewModels/     — React hooks bridging usecases to screens
ui/screens/        — presentation components
```

Follow this shape for new modules. Business logic belongs in `core/usecases`, not in components or view models.

**Protected files — do not modify** (excluded from lint/format tooling, see `.prettierignore`):
- `app/(tabs)/_layout.tsx` — the bottom tab bar
- `src/ui/components/atoms/GlassSurface.tsx` — shared glass-surface primitive with a known content-based auto-sizing behavior other components rely on

Both are tuned to exact prototype fidelity; changes here have broken multiple downstream screens in the past.

- Use the `Result<T, E>` type (`ok(data)` / `fail(error)`) from `@/types/Result` for anything that can fail — usecases and adapters return `Result`, not thrown exceptions.
- No magic numbers — extract named constants (see `MEAL_MINIMUM_SECONDS`, `SECONDS_PER_HOUR`, etc. for the existing convention).
- No inline literal strings for user-facing text — all copy comes from the shared translation dictionaries (`src/modules/app/react/language/translations/`), keyed per screen/module, with both `en.ts` and `es.ts` kept in sync.
- Dependencies are injected via `useDependencies()` — never import an adapter directly into a view model or screen.
- Keep files focused: one clear responsibility per file. If a file is doing too much, split it along the same core/ports/usecases/adapters/viewModels boundaries above.

## Testing

- Tests live next to the code they cover (`Thing.ts` → `Thing.test.ts`).
- Usecases and adapters get unit tests against their `Result` output (success and failure paths).
- View models are tested via `renderHook` with a fake `Dependencies` object — see any `use*.viewModel.test.tsx` for the pattern.
- Don't mock what you don't have to — prefer a small in-memory fake over a mocking framework when testing against a port interface.
