---
name: elite-mobile-solid-principles
description: Use when designing entities, ports, usecases, adapters, or ViewModels in the Elite Mobile app — enforces SOLID principles and zero-coupling dependency injection using Elite Mobile's actual clean-architecture patterns and React Context DI.
---

# SOLID Principles — Elite Mobile Edition

SOLID keeps modules loosely coupled and easy to change in isolation. Elite Mobile's clean-architecture
shape (`core/{entities,ports,usecases}`, `infrastructure/adapters`, `ui/{screens,viewModels}` — see
`elite-mobile-clean-architecture`) already encodes most of SOLID structurally. This skill makes that
explicit, with real examples from the codebase, so new code keeps the same near-zero coupling instead
of drifting toward direct imports between layers.

**Dependency injection already exists in this project** — see the DIP section below. There is no
separate framework to add; the existing `useDependencies()` + React Context mechanism _is_ the DI
container. "Add DI" in practice means: keep using it for every new port, and never import an adapter
directly.

---

## S — Single Responsibility Principle (SRP)

> "A class should have one, and only one, reason to change."

### How Elite Mobile applies it

A usecase does exactly one domain operation and delegates the actual work to a port:

```typescript
// GetTicketDetail.usecase.ts — one job: fetch one ticket by id
export class GetTicketDetailUseCase {
  constructor(private readonly reader: TicketsReader) {}
  async execute(id: string): Promise<Result<JobTicket, { type: "NOT_FOUND" } | { type: "READ_FAILED" }>> {
    return this.reader.readOne(id);
  }
}
```

Even a usecase with several steps (validate → capture → persist) stays SRP-compliant as long as those
steps are all _one cohesive reason to change_ — "how a ticket attachment gets captured":

```typescript
// CaptureTicketAttachment.usecase.ts — three steps, one responsibility
export class CaptureTicketAttachmentUseCase {
  constructor(
    private readonly mediaCapture: MediaCapture,
    private readonly store: TicketAttachmentsStore,
    private readonly generateId: () => string,
    private readonly now: () => number,
  ) {}
  async execute(args: CaptureTicketAttachmentArgs): Promise<Result<TicketAttachment, CaptureTicketAttachmentError>> {
    if (!args.isTicketActive) return fail({ type: "NO_ACTIVE_TICKET" });
    const captured = await this.mediaCapture.captureMedia(args.kind);
    if (!captured.success) return fail(captured.error);
    // ...builds the attachment, persists it, returns it
  }
}
```

If this usecase also formatted UI copy, or called `expo-image-picker` directly instead of going
through the `MediaCapture` port, that would be two reasons to change (business rule vs. presentation,
or business rule vs. a specific native API) — split it.

### Detection Questions

- Does this usecase/adapter have more than one reason to change?
- Would a UI-copy change and a business-rule change both touch this same file?
- Is a ViewModel doing anything beyond calling a usecase and shaping `{ state, handlers }`?

### Red flag in this codebase

A ViewModel importing an adapter directly, or calling `fetch`/a native module itself instead of going
through a usecase + port.

---

## O — Open/Closed Principle (OCP)

> "Open for extension, closed for modification."

### How Elite Mobile applies it

Adding a capability is adding a **new usecase file**, not editing an existing one. When ticket
attachments were added, `GetTicketDetail.usecase.ts` was never touched — `CaptureTicketAttachment.usecase.ts`
and `GetTicketAttachments.usecase.ts` were added alongside it:

```
core/usecases/
├── GetTicketDetail.usecase.ts          ← untouched
├── GetTodaysTickets.usecase.ts         ← untouched
├── CaptureTicketAttachment.usecase.ts  ← new
└── GetTicketAttachments.usecase.ts     ← new
```

Discriminated-union error types are OCP-friendly the same way: adding a new failure case
(`CaptureTicketAttachmentError`'s `NO_ACTIVE_TICKET | PERMISSION_DENIED | CANCELLED | CAPTURE_FAILED |
SAVE_FAILED`) extends the union without modifying how existing cases are handled.

### Architectural insight

OCP at the module level means: a new feature is a new set of files under `core/`, `infrastructure/`,
`ui/` — not edits scattered across existing ones. If implementing a feature requires modifying three
existing usecases just to add a fourth, something is coupled that shouldn't be.

---

## L — Liskov Substitution Principle (LSP)

> "Subtypes must be substitutable for their base type without breaking callers."

### How Elite Mobile applies it

Every port has at least two implementations that must behave identically from the caller's point of
view: a real one and a test fake. Both return `Result<T,E>` — never throw, never diverge in shape:

```typescript
// MediaCapture.port.ts — the contract
export interface MediaCapture {
  captureMedia(kind: TicketAttachmentKind): Promise<Result<CapturedMedia, MediaCaptureError>>;
}

// ExpoMediaCaptureAdapter.ts — real implementation, wraps expo-image-picker
export class ExpoMediaCaptureAdapter implements MediaCapture {
  async captureMedia(kind: TicketAttachmentKind) {
    /* real camera, returns Result */
  }
}

// CaptureTicketAttachment.usecase.test.ts — test fake, honors the exact same contract
const mediaCapture: MediaCapture = {
  captureMedia: async () =>
    ok({ kind: "photo", uri: "file://captured.jpg", width: 1080, height: 1920, thumbnailUri: "file://captured.jpg" }),
};
```

`CaptureTicketAttachmentUseCase` never knows or cares which one it's holding — this is what makes it
testable without a device, camera, or native module.

```typescript
// BAD — would break LSP: a fake that throws instead of returning Result
const brokenFake: MediaCapture = {
  captureMedia: async () => {
    throw new Error("not implemented");
  }, // callers expect Result!
};
```

### Key insight

This is exactly why `useDependencies()` + the `Dependencies` interface can hand a ViewModel either the
real `dependencies.dev.ts` wiring or a hand-built fake `Dependencies` object in a test — every port
implementation, real or fake, honors the identical `Result<T,E>` contract.

---

## I — Interface Segregation Principle (ISP)

> "Clients shouldn't depend on methods they don't use."

### How Elite Mobile applies it

Ports are split by role, not bundled into one fat interface. Ticket attachments needed two distinct
capabilities — capturing media and storing attachment records — so they're two separate ports, not one:

```typescript
// MediaCapture.port.ts — only knows how to capture
export interface MediaCapture {
  captureMedia(kind: TicketAttachmentKind): Promise<Result<CapturedMedia, MediaCaptureError>>;
}

// TicketAttachmentsStore.port.ts — only knows how to persist/list
export interface TicketAttachmentsStore {
  add(attachment: TicketAttachment): Promise<Result<void, { type: "SAVE_FAILED" }>>;
  list(ticketId: string): Promise<Result<TicketAttachment[], { type: "READ_FAILED" }>>;
}
```

```typescript
// BAD — one fat port forcing every implementer to handle both concerns
interface TicketAttachments {
  captureMedia(kind: TicketAttachmentKind): Promise<Result<CapturedMedia, MediaCaptureError>>;
  add(attachment: TicketAttachment): Promise<Result<void, { type: "SAVE_FAILED" }>>;
  list(ticketId: string): Promise<Result<TicketAttachment[], { type: "READ_FAILED" }>>;
  // A future in-memory-only test double now has to stub captureMedia even though it never
  // needs real camera access — the interface forces it to depend on a method it doesn't use.
}
```

`TicketsReader` is read-only by design (`read()`/`readOne()`, no write methods) — a module that only
ever needs to read tickets is never forced to implement or fake a write method it will never call.

### Detection

If a fake/mock implementation of a port has a method that just throws `"not implemented"` or is a
no-op stub, the port is too fat — split it by which callers actually need which methods.

---

## D — Dependency Inversion Principle (DIP)

> "High-level modules and low-level modules should both depend on abstractions."

### How Elite Mobile applies it — this is the project's core architectural principle

The dependency rule:

```
Screen → ViewModel → UseCase → Port (interface) ← Adapter (real or mock)
                                    ▲
                        Dependencies.type.ts declares the shape;
                        dependencies.dev.ts wires one adapter per port
```

`core/` never imports a concrete adapter — only the port interface. The concrete choice is made in
exactly one place:

```typescript
// Dependencies.type.ts — the shape is entirely interface types, never a concrete adapter
export interface Dependencies {
  keyValueStore: KeyValueStore;
  ticketsReader: TicketsReader;
  mediaCapture: MediaCapture;
  ticketAttachmentsStore: TicketAttachmentsStore;
  // ...one field per port, never a class reference
}

// dependencies.dev.ts — the ONE place concrete adapters get chosen
export const buildDevDependencies = (): Dependencies => ({
  keyValueStore: new MmkvKeyValueStoreAdapter(),
  ticketsReader: new InMemoryTicketsAdapter(),
  mediaCapture: new ExpoMediaCaptureAdapter(),
  ticketAttachmentsStore: new InMemoryTicketAttachmentsStoreAdapter(),
  // ...
});
```

**This _is_ the project's dependency injection** — React Context standing in for a DI container,
with no additional library needed:

```typescript
// DependenciesProvider.tsx — the container
export const DependenciesContext = createContext<Dependencies | null>(null);
export function DependenciesProvider({ dependencies, children }: DependenciesProviderProps) {
  return <DependenciesContext.Provider value={dependencies}>{children}</DependenciesContext.Provider>;
}

// useDependencies.tsx — how anything resolves a dependency
export const useDependencies = () => {
  const deps = useContext(DependenciesContext);
  if (!deps) throw new Error("useDependencies must be used within a DependenciesProvider");
  return deps;
};
```

```typescript
// BAD — violates DIP: a concrete adapter constructed inline, bypassing DI entirely
function useTicketDetailViewModel({ ticketId }) {
  const ticketsReader = new InMemoryTicketsAdapter(); // locked in! untestable without a real fetch
  // ...
}

// GOOD — the actual pattern: resolve through the container
function useTicketDetailViewModel({ ticketId }) {
  const { ticketsReader } = useDependencies();
  // ...
}
```

### Zero coupling, concretely

"Zero coupling" here means: **grep for `new InMemory` or `new Expo` or `new Mmkv` outside
`dependencies.dev.ts` and a handful of test files — there should be none.** Every usecase and
ViewModel depends on a port type name (`TicketsReader`, `MediaCapture`), never a class name. Swapping
`InMemoryTicketsAdapter` for a real HTTP-backed adapter later means editing exactly one line in
`dependencies.dev.ts` — nothing in `core/` or `ui/` changes at all.

---

## Applying SOLID Across Elite Mobile

| Principle | How Elite Mobile applies it                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SRP       | One usecase = one domain operation; ViewModels only shape `{ state, handlers }`, never call adapters or usecases-worth of logic inline                                         |
| OCP       | New capability = new usecase file + a wider error union; existing usecases untouched                                                                                           |
| LSP       | Every port has a real adapter and a test fake, both honoring the identical `Result<T,E>` contract with no throws                                                               |
| ISP       | Ports split by role (`MediaCapture` vs `TicketAttachmentsStore`, `TicketsReader` read-only) — never one fat interface                                                          |
| DIP       | `core/` depends only on port interfaces; `Dependencies.type.ts` + `dependencies.dev.ts` + `useDependencies()` is the DI container — the only place concrete adapters are named |

## Quick Reference

| Principle | One-liner                  | Red flag in Elite Mobile                                                                  |
| --------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| SRP       | One reason to change       | A ViewModel with `fetch`/native-module calls or formatting logic beyond simple derivation |
| OCP       | Add, don't modify          | Editing an unrelated existing usecase just to add a new one                               |
| LSP       | Subtypes are substitutable | A test fake that throws instead of returning `Result`                                     |
| ISP       | Small, focused interfaces  | A port with a method a caller/fake never actually needs                                   |
| DIP       | Depend on abstractions     | `new InMemoryXAdapter()` or `new ExpoXAdapter()` anywhere outside `dependencies.dev.ts`   |

## Related

- `elite-mobile-clean-architecture` — the module/layer shape these principles map onto, real module
  list, file naming, testing conventions.
- `elite-mobile-offline` — the one place a second, network-backed DI pattern exists today
  (`apiIntegrationExample`), and its current scope.
