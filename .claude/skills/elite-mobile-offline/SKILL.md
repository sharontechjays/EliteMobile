---
name: elite-mobile-offline
description: The real offline/network infrastructure that exists in Elite Mobile today — React Query with online/offline detection, MMKV-backed cache persistence, and mutation pause/resume. Use when touching src/modules/app/react/queryClient/, wiring a new screen to real network data, or extending offline behavior beyond the current one-module demo scope.
---

This describes Elite Mobile's **actual** offline infrastructure, not an aspirational one. It exists,
it's tested, and it's wired globally in `app/_layout.tsx` — but only one module
(`src/modules/apiIntegrationExample/`) currently uses it end-to-end as a worked example. Most real
screens still read from in-memory mock adapters directly (see `elite-mobile-clean-architecture`) and
don't touch this layer at all yet.

**REQUIRED BACKGROUND:** module structure, layers, and naming come from `elite-mobile-clean-architecture`.

## What actually exists

| Piece | File | What it does |
|---|---|---|
| Query client | `src/modules/app/react/queryClient/queryClient.ts` | `staleTime`/`gcTime` tuned generous (5min/24h) so a screen has something to show from cache immediately; queries default to `networkMode: "offlineFirst"` |
| Connectivity | `src/modules/app/react/queryClient/setupOnlineManager.ts` | Wires React Query's `onlineManager` to `@react-native-community/netinfo` (RN has no `navigator.onLine`) |
| Cache persistence | `KeyValueStoreAsyncStorage.ts` + `PersistQueryClientProvider` in `app/_layout.tsx` | Persists the query cache through the existing `KeyValueStore` (MMKV) — survives an app restart |
| Mutation pause/resume | default `networkMode: "online"` on mutations (the React Query default) | A mutation fired with no connection goes **paused**, not failed; `queryClient.resumePausedMutations()` is called in the persister's `onSuccess` so mutations paused before a cold app kill still resume once reopened online |

There is **no outbox, no idempotency key, no custom sync engine, no background sync trigger beyond
what React Query itself provides.** If a feature needs stronger offline durability guarantees than
"React Query's own pause/resume," that's new work, not something already built.

## The worked reference: `src/modules/apiIntegrationExample/`

A deliberately isolated module proving the full pattern against a real public endpoint
(`jsonplaceholder.typicode.com`) — not wired into any real app screen, meant to be **deleted** once a
real backend replaces it. Copy its shape when wiring a real screen to real network data:

```
core/entities/ExampleNote.entity.ts
core/ports/ExampleNotesApi.port.ts              # list()/create() → Result<T,E>
infrastructure/adapters/HttpExampleNotes.adapter.ts   # real fetch() calls
ui/hooks/useExampleNotesQuery.ts                # useQuery wrapper
ui/hooks/useCreateExampleNoteMutation.ts        # useMutation wrapper — demonstrates pause/resume
ui/hooks/useIsOnline.ts                         # useSyncExternalStore bridge onto onlineManager
ui/screens/ApiIntegrationExampleScreen.tsx       # online/offline badge, pending-mutation count,
                                                 # "Queued — will send once back online" state
```

```typescript
// useIsOnline.ts — the pattern for any online/offline UI indicator
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
  );
}
```

## What every other module actually does instead

Every non-demo module's data flow today is: ViewModel → usecase → **in-memory mock adapter**,
synchronous or near-instant, no network involved at all. `useTicketDetail.viewModel.tsx`,
`useNotes.viewModel.tsx`, etc. use plain `useState`/`useEffect`, not `useQuery`/`useMutation`. This is
correct for the current prototype — don't introduce React Query into a module just because it's
available; only reach for it when the module is actually being wired to a real network call.

## Local persistence — what's real

- **MMKV** (`react-native-mmkv` via `KeyValueStore.port.ts` / `MmkvKeyValueStore.adapter.ts`) is the
  only local persistence layer. No SQLite, no `expo-sqlite`.
- Encrypted with a key generated once via `expo-crypto` and stored in `expo-secure-store`'s Keychain
  (see `getOrCreateMmkvEncryptionKey.ts`) — never a hardcoded string.
- Persisted today: device registration state, session/sign-in state, timer state, language
  preference, the React Query cache. There is no punch/event outbox — the `sync` module is
  read-only mock data (see `elite-mobile-clean-architecture`).

## Bilingual (EN/ES) — the real mechanism

Not i18next. A hand-rolled system: `src/modules/app/react/language/translations/{Translations.type.ts,
en.ts, es.ts}` (TypeScript enforces both dictionaries share the exact same shape) + `LanguageProvider`
+ `useLanguage()` returning `{ language, setLanguage, strings }`. Selection persists via MMKV. Every
screen destructures `const { strings } = useLanguage(); const t = strings.<namespace>;` — never a bare
literal string, including content sourced from mock adapters (see `elite-mobile-clean-architecture`'s
localization section for how mock data gets translated).

## If extending real offline behavior

- New network-backed module → follow the `apiIntegrationExample` shape: a port + real adapter, a
  `useQuery`/`useMutation` hook pair, `useIsOnline()` for status UI.
- Want stronger durability than React Query's own pause/resume (e.g. surviving a full app
  uninstall/reinstall, or a real write-ahead outbox)? That's genuinely new infrastructure — don't
  assume it already exists just because "offline" is in this skill's name.
- Keep `networkMode: "offlineFirst"` for queries and the default `"online"` for mutations unless a
  specific feature has a real reason to differ — that pairing is what gives "show cached data
  immediately, queue writes until reconnected" for free.
