// EliteTeam Brand Guidelines 2025/2026 — the five core brand colors (Pine, Ash, Leaf, Moss,
// Slate) plus the three status colors (Success/Warning/Danger), reproduced from the brand
// guide's exact hex values. See docs/ or ask for "Brand V1.pdf" for the source.
//
// Every family below shares one base RGB constant so retuning a hue only ever means editing
// that one constant — the numeric suffix on each derived token is its own hand-tuned opacity
// (out of 100), not collapsed to a single shared value.
const WHITE_RGB = "255,255,255"; // Glass surfaces stay pure white — an Ash tint read wrong against the actual blur/glass effect
const MOSS_RGB = "123,133,120"; // Moss — muted/borders, used for hairline dividers/borders
const PINE_RGB = "43,51,47"; // Pine — primary text/dark UI, decoded to RGB for dark scrims/shadows
const LEAF_RGB = "146,199,94"; // Leaf — brand accent green, also the job/travel status tint source
const DANGER_RGB = "192,69,61"; // Danger status color, tint source for off

export const colors = {
  ink: "#2b332f", // Pine — primary text
  dim: "#55605a", // Secondary text (brand guide: >=4.5:1 contrast on light surfaces)
  faint: "#989a9d", // Slate — de-emphasized/tertiary text (captions, hints), not body copy
  white: "#ffffff",

  // Brand accent is Leaf green, not amber — accent-on text is always dark Pine, never white,
  // per the brand guide's explicit "never white" rule for accent-green buttons.
  accent: "#92c75e",
  accentInk: "#2b332f",

  // job/travel are both "green" under the new brand (there's no distinct travel hue in the
  // guide) — job uses the darker, more-saturated green for adequate icon/text contrast; travel
  // uses Leaf itself. Bg/Border for both tint from Leaf, matching the guide's "Success" recipe.
  job: "#5fa83e",
  jobBg: `rgba(${LEAF_RGB},0.2)`,
  jobBorder: `rgba(${LEAF_RGB},0.35)`,

  // Leaf fails the guide's own text-contrast rule ("surfaces, borders & icons only — never
  // text") — this app's StatusBanner does render `travel` as body text color, so this is a
  // known accessibility trade-off, not an oversight; flagging here since it's the one departure
  // from the guide's stated AA requirement.
  travel: "#92c75e",
  travelBg: `rgba(${LEAF_RGB},0.2)`,
  travelBorder: `rgba(${LEAF_RGB},0.35)`,

  // No amber, and no grey either — idle/pending stays in the brand's green family, just a
  // deeper forest shade of Leaf's own hue so it reads as clearly distinct from job/travel
  // while still being unmistakably "brand green," not a muted grey-green.
  idle: "#3d5b20",
  idleBg: `rgba(${LEAF_RGB},0.2)`,
  idleBorder: `rgba(${LEAF_RGB},0.35)`,

  // Danger's raw #C0453D is already dark enough to double as its own accent/icon color.
  off: "#c0453d",
  offBg: `rgba(${DANGER_RGB},0.15)`,
  offBorder: `rgba(${DANGER_RGB},0.28)`,

  // Reverted to pure white (the pre-rebrand value) — an Ash-tinted glass surface didn't read
  // right against the actual blur/glass effect, so glass stays white regardless of brand hue.
  surface35: `rgba(${WHITE_RGB},0.35)`,
  surface50: `rgba(${WHITE_RGB},0.5)`,
  surface: `rgba(${WHITE_RGB},0.55)`,
  surface70: `rgba(${WHITE_RGB},0.7)`,
  border: `rgba(${WHITE_RGB},0.75)`,
  surfaceStrong: `rgba(${WHITE_RGB},0.9)`,
  sunk: `rgba(${WHITE_RGB},0.4)`,
  dotUnfilled: "#d1d2d3",

  // Moss-toned hairline dividers/borders — every distinct opacity actually used in the app,
  // from the faintest separator line to the most visible dashed-button border.
  hairline08: `rgba(${MOSS_RGB},0.08)`,
  hairline12: `rgba(${MOSS_RGB},0.12)`,
  hairline15: `rgba(${MOSS_RGB},0.15)`,
  hairline18: `rgba(${MOSS_RGB},0.18)`,
  hairline20: `rgba(${MOSS_RGB},0.2)`,
  hairline22: `rgba(${MOSS_RGB},0.22)`,
  hairline25: `rgba(${MOSS_RGB},0.25)`,
  hairline40: `rgba(${MOSS_RGB},0.4)`,
  hairline45: `rgba(${MOSS_RGB},0.45)`,

  // Dark Pine-toned overlays (shadows/scrims), same RGB as `ink`.
  inkOverlay18: `rgba(${PINE_RGB},0.18)`,
  inkOverlay35: `rgba(${PINE_RGB},0.35)`,
  inkOverlay55: `rgba(${PINE_RGB},0.55)`,

  // Drop-shadows behind primary (accent-green) buttons — two components tuned the same hue to
  // slightly different opacities. Uses job's darker green so the glow reads instead of washing
  // out against Leaf's own lightness.
  accentShadow50: `rgba(95,168,62,0.5)`,
  accentShadow55: `rgba(95,168,62,0.55)`,

  progressTrack: "#d9d9da",

  // Solid deep-forest-green card (distinct from the translucent idleBg/idleBorder used on
  // StatusBanner) — the "pending approval"-style card seen on Notes' extra-work flag and the
  // device-registration pending state.
  idleCardBg: "#e4e8e0",
  idleCardBorder: "#c1cbb8",
  idleCardSubtext: "#3d5b20",

  // Solid success card — device-registration's "approved" state.
  approvedCardBg: "#e9f3e4",
  approvedCardBorder: "#cce3c1",

  // Solid travel-info card (distinct from the translucent travelBg/travelBorder) — the
  // "arrived, stop travel time?" prompt on Ticket Detail and Travel's footer banner. A lighter,
  // cooler green than approvedCardBg so job vs. travel stay visually distinct even as solid cards.
  travelCardBg: "#eef6e5",
  travelCardBorder: "#d8ebc5",

  // Solid rejected/error card — Sync Queue's rejected-row background. Extracted directly from
  // the brand reference prototype's own rejected-state card.
  offCardBg: "#f7e4e3",
  offCardBorder: "#f1cfcd",

  // Light Ash-tinted surface — light text on dark/accent backgrounds, and light solid chip/box
  // fills.
  paper: "#fafafb",
  // Subtle Moss-tinted divider/pill fill, distinct from the translucent glass `border` token.
  divider: "#f2f3f2",

  // WorkerRow's selected-row tint — now a light Leaf tint, tying selection to the brand accent.
  selectedRowBg: "#f0f7e8",
  // Notes' extra-work Switch, track color in its "off" state.
  switchTrackOff: "#e7e9e7",

  // MapPreview's illustrative fake-map graphic (roads/buildings) — decorative, one-off colors
  // that only ever back this single component's drawing, not real UI chrome.
  mapBackground: "#f2f3f2",
  mapRoad: "#fdfdfe",
  mapRoadBorder: "#e8e9e9",
  mapBuildingA: "#f2f8ec",
  mapBuildingB: "#eaebe9",

  // Same drop-shadow color GlassSurface.tsx uses inline (that file is protected — never
  // modify — so it keeps its own literal copy in sync by hand rather than importing this
  // token) — this token exists for any other consumer that wants the identical shadow,
  // e.g. theme/glass.ts.
  glassShadow: "rgba(43,51,47,1)",

  screenGradient: ["#fbfbfb", "#f8f8f8", "#edeeec"] as const,
  // Decorative background glows — collapsed to shades of the brand's own Leaf green (no
  // amber/blue/pink, and no greyed-down green either) at varying lightness/opacity for visual
  // variety across the screens using them. glowPink stays neutral Slate grey since it was never
  // a green in the first place.
  glowAmber: "rgba(114,170,59,0.5)",
  glowBlue: "rgba(178,216,141,0.45)",
  glowGreen: "rgba(146,199,94,0.45)",
  glowPink: "rgba(152,154,157,0.4)",
} as const;
