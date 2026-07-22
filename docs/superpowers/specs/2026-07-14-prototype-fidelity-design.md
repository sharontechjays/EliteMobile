# Elite Mobile — Prototype Fidelity Design

**Date:** 2026-07-14
**Status:** Approved by user, pending spec review before implementation planning

## Background

The app was originally built from an earlier export of the "Elite Mobile Glass" design
prototype (an interactive iOS Liquid Glass mockup covering the crew-leader field
timekeeping flow: Splash, Device registration, Sign in, Home, Crew roster, Attestation,
Tickets, Ticket detail, Travel time, Notes and photos, Timesheet, Sync queue, Profile).
A newer export of that same prototype (`~/Downloads/index.html`, decoded to
`template_decoded.html` for this audit) was compared screen-by-screen against the current
app to find every design and functionality gap.

Two things are explicitly **out of scope / do not touch**, per direct instruction:
- `src/ui/components/atoms/GlassSurface.tsx` — the shared glass-card component. Already correct.
- `app/(tabs)/_layout.tsx` — the bottom tab navigation. Already correct; the app
  intentionally uses native iOS `NativeTabs` instead of the prototype's custom floating
  pill tab bar, and that substitution is not a gap.

The prototype's own demo-only affordances (the `alertDemoOn` "Simulate next alert" panel
on Home, labeled by the prototype itself as demo-only) are excluded from scope.

## Scope decision

Full priority-ordered pass: all Critical and Moderate findings across every screen, plus
Minor findings, sequenced as infrastructure-first, then screens.

## Phases

### Phase 1 — Shared infrastructure

1. **`TopBar` component** (new, shared) — persistent header rendered on every screen
   except Splash (`showTopbar: s.screen !== 'splash'`), matching the prototype's
   `showTopbar`/`showSyncPill` logic (`template_decoded.html:420-446`):
   - Sync-status pill: real pending/rejected count from the sync queue, amber
     `▲ N pending` with pulsing dot when items are queued, dim `● Synced` with green dot
     otherwise (`template_decoded.html:422-426, 1584-1592`). Tapping navigates to Sync
     Queue. Hidden specifically on Sign In (`hideSyncPill: s.screen === 'signin'`,
     rendered as an empty placeholder there instead). Replaces the current hardcoded,
     non-reactive pill in `src/modules/roster/ui/screens/RosterScreen.tsx:33-37`.
   - EN/ES language toggle pill (`template_decoded.html:442-445`) — renders on every
     screen the TopBar mounts on, Sign In included. Currently absent app-wide (confirmed
     via repo-wide grep, no `Topbar`/language-toggle component exists anywhere).
   - Notification bell with unread dot, navigates to Profile (`template_decoded.html:434-440`).

2. **Toast/notification system** (new, shared) — the prototype fires non-blocking toasts
   (`pushNotification`) on most meaningful actions (sign-in, device registration steps,
   photo removal, travel logged, sync issues, timesheet ack/dispute, etc. — e.g.
   `template_decoded.html:1227, 1234, 1575, 1738, 1945, 1952, 1957, 1960`). Currently:
   - No toast mechanism exists anywhere in the app.
   - Several flows use blocking native `Alert.alert` instead (e.g.
     `src/modules/home/ui/viewModels/useHome.viewModel.tsx:135-139, 156-158, 160-163`,
     `src/ui/utils/confirmSignOut.ts`) where the prototype uses non-blocking toasts.
   - Add a `notifLog` store that the new toast system appends to, capped to the most
     recent 6 entries (`template_decoded.html:1975`), which Profile's "Recent
     notifications" section reads from live instead of the current static 2-item mock
     (`src/modules/profile/infrastructure/adapters/InMemoryProfile.adapter.ts`).
   - Where `confirmSignOut.ts`'s blocking confirmation dialog is a deliberate UX
     improvement over the prototype (which signs out with no confirmation,
     `template_decoded.html:1633`), keep the confirmation — this is noted as an
     intentional improvement, not a regression to fix.

3. **Timer engine** (new, shared) — a real ticking-timer service backing job seconds,
   travel seconds, and day seconds, replacing the current static mock values
   (self-documented in `src/modules/home/ui/viewModels/useHome.viewModel.tsx:116-118`:
   "this app has no background timer infrastructure yet"). Mirrors the prototype's
   1-second interval tick (`template_decoded.html:1177-1202`) driving:
   - Job timer display and "over estimate" red highlighting once elapsed time passes a
     job's estimated hours (`estSecondsFor`, `template_decoded.html:1316-1320`).
   - Travel timer display.
   - Day-entry timers (Yard/Safety/Shop time rows on Home).
   - Meal-break countdown (30-minute CA-law minimum on Ticket Detail's meal flow).

4. **i18n scaffolding** — wire the new language toggle to a strings table covering the
   screens audited in this pass (not a full translation pass of every string in the app).
   Prototype routes all Home strings through `tr()`/`isES` branches
   (`template_decoded.html:1410-1422, 1601-1605`); no i18n layer exists currently.

### Phase 2 — Security fix + missing screens (highest severity)

5. **Attestation employee-code verification** (`src/modules/clock/ui/screens/AttestationScreen.tsx`,
   `src/modules/clock/ui/viewModels/useAttestation.viewModel.tsx`) — currently pressing
   "Clock In/Out" immediately confirms the punch with **no identity check at all**,
   defeating the screen's stated purpose (Roster's own copy promises "Each worker
   confirms with their own attestation" but this isn't enforced). Add the missing code-entry
   step per `template_decoded.html:750-757`:
   - "Enter your employee code" label, numeric entry (reuse the existing
     `src/ui/components/atoms/Keypad.tsx`, which is fully built but currently only wired
     into Sign In).
   - Error state: red border + "Code doesn't match {name} — try again" when the code is
     wrong (`attestCodeError`, `template_decoded.html:753-755`).
   - Helper text explaining the purpose (`template_decoded.html:756`).
   - Confirm button gated at reduced opacity until the code is ≥4 digits
     (`template_decoded.html:1836`).
   - Also add the missing "Device verified ✓" confirmation line
     (`template_decoded.html:744-746`, currently only "GPS captured ✓" renders,
     `AttestationScreen.tsx:51`) and the missing crew-device identifier line
     ("Crew device #CL-0482 · registered to this crew", `template_decoded.html:747`).
   - Fix worker-name text size: currently uses the 26px `typography.largeDate` token
     (`AttestationScreen.tsx:47`); spec calls for 20px/800 (`template_decoded.html:741`).

6. **New screen: Ticket Detail** (`data-screen-label="Ticket detail"`,
   `template_decoded.html:790-874`) — does not exist anywhere in the app; tapping any
   ticket (from Tickets list `useTickets.viewModel.tsx:46` or Home's job card
   `app/(tabs)/home.tsx:8`) currently jumps straight to `/notes`, skipping this screen
   entirely. Build:
   - Header with back button to Tickets.
   - Conditional travel-prompt banner (same-site vs. different-site copy,
     `template_decoded.html:796-805`).
   - Job info card (name, tag chip, type/address subtitle).
   - Static map-preview block (grid lines, road diagonal, building blocks, pin marker,
     address chip, "Open in Maps →" button — purely decorative, no real map integration
     needed, `template_decoded.html:811-823`).
   - Crew chips reflecting Roster's `selected` state.
   - Conditional "→ Start Travel to this Job" button (`template_decoded.html:834-836`).
   - Job start/stop button + live timer, with the over-estimate red state from the new
     timer engine (`template_decoded.html:837-843`).
   - Pause Job button (hidden during an active meal break).
   - Meal-break mini-flow scoped to this ticket: suggest → active (live countdown,
     disabled-until-30:00 end button, demo-only skip-to-30:00 excluded from scope) →
     logged, auto-pausing job/travel timers when started (`template_decoded.html:847-871`).
   - "Notes / Photo" button at the bottom, linking to the existing Notes screen (this is
     the one piece of this flow the app currently has, just misplaced as the whole
     destination instead of a sub-action).
   - Extend `JobTicket.entity.ts`'s `statusKind` union to support a distinct
     "not started" (grey/faint) state — currently not-started tickets are miscolored
     amber via `"idle"` (`src/modules/tickets/infrastructure/adapters/InMemoryTickets.adapter.ts:7-8`)
     instead of the spec's grey `faint` (`template_decoded.html:1438-1439`). Also add a
     `site` field to support the "same site → no travel needed" branch
     (`travelPrompt.sameSite`, `template_decoded.html:1270`).

7. **New screen: Travel Time** (`data-screen-label="Travel time"`,
   `template_decoded.html:877-918`) — does not exist; `colors.ts` already defines
   `travel`/`travelBg`/`travelBorder` tokens but they're only used for Home's
   banner/job-card coloring, never for an actual travel-tracking screen. Build:
   - Header (back to Ticket Detail), title, "Workers: …" subtitle.
   - Start/stop/pause travel timer using the new timer engine.
   - Simulated arrival/geofence prompt after ~10s of travel
     (`template_decoded.html:885-894`), with "End Travel" (confirm arrival, clock into
     next job) and "Keep traveling" (dismiss) actions.
   - Travel-done confirmation card with logged time and a "▶ Start Job" button that
     clocks the crew into the destination job and navigates to Ticket Detail
     (`template_decoded.html:895-904`).
   - From/To line and the fixed explanatory footer banner
     (`template_decoded.html:917`).
   - Wire `HomeJobCard.tsx`'s already-built `onOpenTravel` prop, which `HomeScreen.tsx`
     currently never passes — the "Travelling to job site" chip is a dead tap target
     today; point it at this new screen.

### Phase 3 — Missing workflows

8. **Timesheet crew acknowledgement/dispute workflow**
   (`src/modules/timesheet/*`) — this is the core interactive feature of the screen in
   the prototype and is entirely absent; the app only submits the logged-in user's own
   hours with no crew-review step. Per `template_decoded.html:964-980` and the JS state
   at `~1110-1113, 1931-1961`:
   - Iterate through the crew one worker at a time, showing "N of M done" progress.
   - "I acknowledge these hours are accurate" action, advancing the queue and firing a
     toast.
   - Dispute path: reason textarea + "Submit reason & continue", recording the dispute
     per worker and advancing the queue.
   - Completion banner once all crew have responded.
   - Gate the Submit button (disabled/dimmed) until all crew have acknowledged; pressing
     early surfaces "Acknowledgements incomplete — N crew member(s) still need to
     respond."
   - This requires extending `TimesheetEntry.entity.ts` (currently no per-worker/ack
     concept) and `GetDailyTimesheet.usecase.ts` (currently fetches only one worker's rows).
   - Also fix: the last row's status color (`"Clock-out"` currently maps to `"off"` /
     red — should be neutral grey per `template_decoded.html:967`, which needs a new
     neutral `statusKind` since the entity only supports
     `"job" | "travel" | "idle" | "off"`); replace the app's invented blue
     "Approval happens after submission, not here" banner (not present anywhere in the
     Timesheet prototype — that pattern belongs to the Travel screen) with the spec's
     green "All crew members have responded…" completion banner
     (`template_decoded.html:981-983`); "Submit" button copy (prototype: plain "Submit").

9. **Roster fixes** (`src/modules/roster/*`):
   - Add the missing "add worker from directory" flow: search/request toggle, live
     name-filtered results against a `DIRECTORY` of off-roster workers, empty-state
     message, "busy on another device" block, provisional-add with "pending approval"
     flagging (`template_decoded.html:703-720, 1483-1505`). Currently the "+ Add worker"
     button has no `onPress` handler at all (`RosterScreen.tsx:59-61`).
   - Fix footer buttons: separate "clock selected workers" (direction-aware label,
     disabled when nothing eligible is selected) from "clock everyone" (bulk action) —
     currently merged into one button, and the first button slot is incorrectly
     repurposed for a "Hand off / Sign out" action that doesn't belong on this screen in
     the prototype (`template_decoded.html:726-727, 1506-1513`). Move sign-out back to
     Profile only.
   - Add "eligibility" styling: dim/disable selection for workers not in the current
     clock direction, rather than letting any row be toggled regardless of status.
   - Minor: selected-row background should use the warm gold tint `#fdf6e3`
     (`template_decoded.html:1476`), not `colors.surfaceStrong`; status text should keep
     its `●`/`○` glyph prefix.

### Phase 4 — Onboarding fixes

10. **Skip re-registration when already approved** — `app/index.tsx:6` currently routes
    "Continue" unconditionally to `/device-registration` every launch, and
    `useDeviceRegistration.viewModel.tsx:29` hardcodes status to `"registering"` on every
    mount. Per the prototype's `onContinueSplash` (`template_decoded.html:~1634-1640`):
    if the device is already approved, skip straight to Sign In.

11. **Sign In fixes** (`src/modules/auth/ui/screens/SignInScreen.tsx`):
    - Replace the keypad with the spec's rectangular design: 3×4 grid of rectangular
      keys (58px, 18px radius), monospace digits, fixed numeric order, and an explicit
      **✓ confirm key** (`template_decoded.html:523-526`) — currently `Keypad.tsx` renders
      circular keys with shuffled digit order and no confirm key (auto-submits at 5
      digits instead). This is a fundamentally different interaction model, not a token
      tweak — needs either a new keypad variant or a substantial `Keypad.tsx` change (the
      shuffled-circular design may still be wanted elsewhere — check before modifying the
      shared component directly; may need a `layout` prop instead of changing it globally).
    - Add the missing "Device verified" row (green dot + text,
      `template_decoded.html:516`).
    - Remove the invented "Branch — Chesterfield ▾" selector row
      (`SignInScreen.tsx:24-29`) — not present anywhere in the prototype's Sign In markup.
    - Fix PIN dot styling: `gap:10px`, `13×13px`, `2px` border, unfilled color `#c8c4b4`
      (a value with no existing token in `colors.ts` — add one) instead of reusing the
      translucent `colors.border` glass token, which barely reads against the cream
      background.
    - Mount the new `TopBar` here (sync pill hidden per Phase 1's `hideSyncPill` rule,
      language toggle still shown).

12. **Device Registration**: mount the new `TopBar`; add a push/toast notification on
    register and approve actions (`onDevRegister`/`onDevApprove`,
    `template_decoded.html:1648-1651, 1664-1667`) via the new toast system.

13. **Splash minor fix**: caption "Loading today's work…" should use `typography.caption`
    (11.5px), currently uses `typography.body` (12.5px/500) —
    `SplashScreen.tsx:30`. Confirm with product whether the invented
    "Last sync: … · Language set by employee profile" line (not in the prototype at all)
    should stay or be removed.

### Phase 5 — Home screen fixes

14. Add the missing **"estimated travel time" approval card** (pending/approved states,
    approve action) — `template_decoded.html:645-662`; entirely absent from
    `HomeScreen.tsx`/`useHome.viewModel.tsx`/`HomeSummary.entity.ts`.
15. Add **over-estimate highlighting** on the job timer (red label/timer color once
    elapsed time passes the estimate, using the new timer engine) —
    `template_decoded.html:1727-1728`; currently static/hardcoded colors in
    `HomeJobCard.tsx:59-60`.
16. Extend `CrewStatus` (`HomeSummary.entity.ts:3`) from 3 states (`out`/`in`/`travel`) to
    5, adding `job` (on-job) and `lunch` (meal break), each with their own Home banner
    content (`template_decoded.html:1290, 1310, 1280, 1434-1435`).
17. Wire `HomeJobCard`'s `onOpenTravel` prop (already accepted, never passed by
    `HomeScreen.tsx`) to the new Travel Time screen.
18. Rework the job/travel toggle (`useHome.viewModel.tsx:132-154`) from a single boolean
    flip into the prototype's actual flow: job queue progression via `nextPendingJob`,
    a travel-prompt with same-site/different-site copy, starting real travel timers, and
    toast notifications on completion (`template_decoded.html:1260-1282, 1705-1719`).
19. Tie `needsTravel` to actual travel completion (`s.travelDone.jobId`) instead of the
    current static mock flag `requiresTravelFirst` (`HomeSummary.entity.ts:11`).
20. Make the travel chip's copy dynamic (live elapsed time + destination name,
    `template_decoded.html:1689,1692`) instead of the current hardcoded
    `TRAVEL_CHIP_TITLE`/`TRAVEL_CHIP_HINT` constants (`HomeScreen.tsx:23-24`).
21. Add the missing "Shop time" day-entry row (`DAY_ENTRIES`,
    `template_decoded.html:1119-1123` has 3 rows: Yard/Safety/Shop; the app's mock only
    has 2, `InMemoryHomeSummary.adapter.ts:24-49`), and rename to match spec copy.

### Phase 6 — Design polish pass (moderate/minor, all screens)

Token-level and copy-level fixes, grouped by screen. None of these require new
functionality — all are style/copy corrections to existing components.

**Home**
- Fix `StatusBanner.tsx:26` — the left-accent stripe (`borderLeftWidth:4`) currently
  renders in the same translucent color as the other 3 sides; needs its own
  `borderLeftColor: tone.accent`, separate from `tone.border`. Applies to every banner
  state and the battery/GPS warning cards.
- `NotifyOfficePanel.tsx`: quick chips should be pills (`borderRadius:999`, translucent
  white glass background/border) not `borderRadius:12` grey-wash chips; Cancel/Send
  should be `flex:1` each (full-width 50/50), Cancel needs a visible glass
  background/border (currently bare text); panel radius should be 18 not 16; textarea
  background opacity should be 0.7 not 0.5; copy: "Notify office" not "Notify the
  office", "Message to the office…" not "Type a message for the office…".
- `PillButton.tsx` primary variant: clock-in CTA needs `borderRadius:22` (not 18) and its
  signature amber drop-shadow (`0 10px 24px -12px rgba(180,120,0,0.5)`), currently no
  shadow at all.
- `DayItemRow.tsx:62`: chevron glyphs should be ▲/▼, currently ⌃/⌄.
- Day-item button labels need icon prefixes ("▶ Start" / "■ Stop" / "✓ Logged") —
  currently plain text in `InMemoryHomeSummary.adapter.ts:31,43`.

**Notes**
- Extra-work-flag: prototype is a static checkbox-badge card (icon left, no
  interactivity) — app uses an interactive `Switch` toggle on the right. Confirm
  intended interaction model before changing (may be an intentional improvement).
- Photo tiles should distinguish photo vs. video labels and use a diagonal-stripe
  placeholder background; currently both tiles show generic "photo" label with flat fill.
- Add a per-tile remove (✕) action with a toast on removal — currently no delete
  affordance at all (only add, capped at `MAX_PHOTOS = 4`, a cap the prototype doesn't
  specify).
- Save button copy: prototype is plain "Save"; app adds "(queued)"/"Saving…" — confirm
  whether to keep the app's clearer async-state copy or match the prototype literally.

**Sync Queue**
- Row text should use 12px, not `typography.body` (12.5px).
- "Sync Now" button label should be 14.5px/uppercase/0.05em letter-spacing, not the
  shared `typography.buttonLabel` (15px/0.9).
- "Fix" button (`SyncQueueScreen.tsx:52-54`) has no `onPress` — matches the prototype's
  own unwired stub, but flagging since it's a real dead-end that will need a resolution
  flow eventually (not required for parity, optional follow-up).

**Profile**
- Notification card padding should be `10px 12px`, not uniform `12`.
- Section-label sizes: eyebrow label should be 11px/0.1em, "Recent notifications" should
  be 10.5px/0.12em — currently both collapsed into one shared 10.5px/1.3 style.
- "Employee code" row should show the actual code entered at sign-in, not the hardcoded
  mock `"•••45"`.

**Tickets**
- Mock data doesn't match prototype's demo jobs (names/ids/hours) — low priority, but
  needed once `site` field (item 6 above) is added for travel-prompt logic.

## Testing approach

- Unit-test new use cases (attestation code verification, timesheet ack/dispute
  aggregation, timer engine tick logic) the same way existing use cases are tested in
  this codebase (check existing test patterns per module before writing new ones).
- For screens with real interaction changes (Attestation, Sign In keypad, Timesheet,
  Roster, new Ticket Detail/Travel Time screens), manually drive the flow in the running
  app (iOS simulator) to confirm behavior before considering the phase done — this app
  has no existing UI test harness to extend.
- No changes to `GlassSurface.tsx` or `app/(tabs)/_layout.tsx` — any change touching
  these files during implementation should be treated as a scope violation and stopped.

## Open questions for product (flagged during audit, not blocking implementation start)

- Splash: keep or drop the invented "Last sync / language set by employee profile" line?
- Notes: keep the app's `Switch`-based extra-work toggle (arguably better UX) or match
  the prototype's static checkbox-badge exactly?
- Notes: keep "(queued)"/"Saving…" save-button copy or match plain "Save"?
- Sync Queue "Fix" button: build a real resolution flow now, or leave as a future
  follow-up (matches prototype's own unwired stub either way)?
