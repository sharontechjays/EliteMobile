# Maestro E2E flows

Real, on-device UI flows driving the app end-to-end via [Maestro](https://maestro.mobile.dev).
Unlike unit/viewModel tests (`npx jest`), these actually tap through the running app on a
simulator or device — closing the "human should spot-check" gap left after several
implementer/reviewer task cycles that couldn't drive interactive taps in a sandboxed environment.

## Setup (one-time)

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH":"$HOME/.maestro/bin"    # add this line to ~/.zshrc so it persists
maestro --version
```

## Running test cases

The app must already be built and installed — Maestro drives an existing app, it doesn't build one:

```bash
npx expo run:ios                                          # simulator
npx expo run:ios --device <udid>                          # a specific physical device
```

Then run flows with either the CLI directly or the npm script:

```bash
maestro test .maestro/flows/00-onboarding-and-sign-in.yaml   # a single flow
maestro test .maestro/flows/                                 # the whole suite, in order
npm run e2e                                                   # same as the line above
npm run e2e:studio                                            # opens Maestro Studio (see below)
```

Screenshots taken by `takeScreenshot:` land in the current working directory — this repo's flows
write them under `.maestro/screenshots/` isn't automatic; move stray `*.png` files there after a
run if you want to keep them (`mv *.png .maestro/screenshots/`).

**Run `00-onboarding-and-sign-in.yaml` first** (or with `clearState: true`) if you need a clean
device-approval/sign-in state. The other flows assume that's already happened at least once, since
approval and session state persist via the real MMKV-backed storage.

## Creating new test cases

1. **Explore the screen with Maestro Studio** before writing anything:

   ```bash
   maestro studio
   ```

   This opens an interactive inspector against whatever device/simulator has the app running.
   Tap around the real screen and it shows you the exact accessibility text or `testID` Maestro
   sees for each element — the fastest way to get selectors right on the first try instead of
   guessing and re-running.

2. **Create a new file** at `.maestro/flows/NN-short-description.yaml`, next number in sequence
   after the existing ones. Every flow starts the same way:

   ```yaml
   appId: com.eliteteams.mobile
   ---
   - launchApp:
       clearState: false # true only if this flow needs a guaranteed-fresh install
   ```

3. **Reach the screen you're testing.** Prefer a deep link over tapping through the tab bar:

   ```yaml
   - openLink: "elitemobile://<route>"
   ```

   Available routes (from `app.config.ts`'s `scheme: "elitemobile"` + the `app/` route files):
   `home`, `roster`, `tickets`, `timesheet`, `attestation`, `device-registration`, `notes`,
   `profile`, `sign-in`, `sync-queue`, `ticket-detail`, `travel`, `api-integration-example`.

4. **Write the steps and assertions**, using the commands below, then run just that file
   repeatedly while iterating:

   ```bash
   maestro test .maestro/flows/NN-your-flow.yaml
   ```

5. **Add a screenshot checkpoint** at any meaningful end state (`takeScreenshot: "NN-name"`) —
   useful for a human to spot-check visually later without re-running the flow.

6. **Document it** — add a one-line entry to the Flows list below, matching the existing style
   (what it exercises, anything it deliberately does _not_ cover and why).

### Commands you'll actually use in this app

| Command                                                 | Use for                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `tapOn: "Label"` / `tapOn: ".*regex.*"`                 | Tap by visible text (exact match unless you write a regex)                                            |
| `tapOn: { id: "testID-value" }`                         | Tap by `testID` prop — use for anything a text match can't hit reliably (switches, icon-only buttons) |
| `assertVisible` / `assertNotVisible`                    | Verify state after an action                                                                          |
| `extendedWaitUntil: { visible: "...", timeout: 10000 }` | Wait for async state (network mock delay, animation) instead of a flaky fixed `tapOn`                 |
| `openLink: "elitemobile://<route>"`                     | Jump straight to a screen, bypassing tab-bar navigation                                               |
| `inputText` / `hideKeyboard`                            | Text fields                                                                                           |
| `takeScreenshot: "name"`                                | Visual checkpoint, lands in cwd                                                                       |
| `runFlow: other-flow.yaml`                              | Compose a shared setup sequence across multiple flows                                                 |

## Automating test cases (CI)

`.github/workflows/e2e.yml` runs the whole flow suite on GitHub Actions against an iOS Simulator
on every push/PR to `main`, plus on manual dispatch:

- Installs JS deps, CocoaPods, and the Maestro CLI on a `macos-14` runner (no code signing
  needed — simulator builds are unsigned).
- Boots an iPhone 15 simulator, builds and installs the app via `npx expo run:ios`.
- Runs `maestro test .maestro/flows/`.
- Uploads any `*.png` screenshots as a build artifact if a flow fails, so you can see what the
  screen actually looked like without re-running locally.

To run the same thing locally exactly as CI does:

```bash
npm ci
cd ios && pod install && cd ..
npx expo run:ios
npm run e2e
```

**Before relying on this in a real pipeline:** the workflow hasn't been run against this
repo's GitHub Actions yet — verify the simulator name/OS version matches what's available on the
runner image (`xcrun simctl list devices`), and that build time fits comfortably inside the
45-minute timeout, before trusting it as a merge gate.

## Flows

- `00-onboarding-and-sign-in.yaml` — full cold start: Splash → Device Registration (demo-approve)
  → Sign In (code `12345`) → Home. Run this first / with `clearState: true` before other flows if
  you need a clean device-approval state; other flows assume approval+sign-in already happened at
  least once (state persists via the real MMKV-backed storage).
- `01-attestation-code-verification.yaml` — navigates to Roster → selects a worker → opens
  Attestation, and confirms GPS/Device-verified copy renders. **Does not** exercise typing the
  employee code or the wrong/right-code branches — see the "known limitation" comment inside the
  file for why (iOS's `secureTextEntry` fields intentionally hide their content from the
  accessibility APIs Maestro drives automation through; this isn't fixable without either a
  different automation approach or weakening the app's actual security UX, which isn't worth it
  just to satisfy test tooling). That behavior is instead covered by real, passing unit tests:
  `src/modules/clock/ui/viewModels/useAttestation.viewModel.test.tsx`.
- `02-ticket-detail-travel-handoff.yaml` — the full loop a prior phase's reviewer flagged as
  untested: Ticket Detail → start/stop job → travel prompt → Travel screen → start/end travel →
  hand off to the next job's Ticket Detail. Passes end-to-end.
- `03-timesheet-ack-dispute.yaml` — Timesheet's crew acknowledgement/dispute workflow: submitting
  early is refused, acknowledging advances to the next crew member, disputing with a reason also
  advances, and the completion banner appears once everyone's responded.
- `04-roster-add-worker.yaml` — the "add worker from directory" flow: searching, adding an
  available worker (appears as pending-approval), and confirming a busy worker can't be added.

## Gotchas learned while writing these

- **Text matching is exact/anchored, not substring**, unless you write your own `.*wildcard.*`
  regex. `tapOn: "Continue"` will NOT match a button whose full label is "Continue to sign in".
- **Sibling `<Text>` elements in the same row often collapse into one combined accessibility
  string** (e.g. a worker row renders as `"LT, Luis T., ○ Not clocked in"` as a single element) —
  match with a wildcard-wrapped regex against the substring you actually care about, not an exact
  label.
- **The on-screen keyboard covers the bottom of the screen** — `hideKeyboard` works for most
  inputs, but a numeric `keyboardType="number-pad"` field has no standard dismiss action; tap a
  static element instead (e.g. a nearby label) to dismiss and reveal what was underneath.
- **Deep links (`openLink: "elitemobile://<route>"`) are the most reliable way to start a flow in
  a known screen state**, rather than tapping through the bottom tab bar — the bottom tabs aren't
  visible/tappable from every screen (e.g. a pushed stack screen like Ticket Detail hides them),
  so a flow that assumes "tap the tab bar" can fail if the app was left somewhere else by a
  previous run.
- **Native `Switch` components are unreliable to hit via position-relative selectors** (`rightOf`,
  `leftOf`) — add a `testID` to it and target that directly instead. `TimesheetScreen.tsx`'s ack
  switch has `testID="ack-toggle"` for exactly this reason.
