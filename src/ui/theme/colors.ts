// Extracted from the "Elite Mobile Glass" iOS Liquid Glass prototype.
//
// Every family below shares one base RGB constant so retuning a hue only ever means editing
// that one constant — the numeric suffix on each derived token is its original hand-tuned
// opacity (out of 100), preserved exactly as it was before these were centralized, not
// collapsed to a single shared value.
const WHITE_RGB = "255,255,255";
const HAIRLINE_RGB = "120,120,100"; // warm-gray divider/border family
const INK_RGB = "27,29,22"; // matches `ink` (#1b1d16) decoded to RGB, for dark scrims/shadows
const ACCENT_SHADOW_RGB = "180,120,0"; // amber drop-shadow family (PillButton, Splash)

export const colors = {
  ink: "#1b1d16",
  dim: "#63665a",
  faint: "#979a8c",
  white: "#ffffff",

  accent: "#ffb60a",
  accentInk: "#201700",

  job: "#237a3d",
  jobBg: "rgba(47,148,81,0.15)",
  jobBorder: "rgba(47,148,81,0.28)",

  travel: "#215f95",
  travelBg: "rgba(60,120,190,0.14)",
  travelBorder: "rgba(60,120,190,0.28)",

  idle: "#93630a",
  idleBg: "rgba(220,160,30,0.16)",
  idleBorder: "rgba(220,160,30,0.3)",

  off: "#a92e2e",
  offBg: "rgba(200,60,50,0.13)",
  offBorder: "rgba(200,60,50,0.25)",

  surface35: `rgba(${WHITE_RGB},0.35)`,
  surface50: `rgba(${WHITE_RGB},0.5)`,
  surface: `rgba(${WHITE_RGB},0.55)`,
  surface70: `rgba(${WHITE_RGB},0.7)`,
  border: `rgba(${WHITE_RGB},0.75)`,
  surfaceStrong: `rgba(${WHITE_RGB},0.9)`,
  sunk: `rgba(${WHITE_RGB},0.4)`,
  dotUnfilled: "#c8c4b4",

  // Warm-gray hairline dividers/borders — every distinct opacity actually used in the app,
  // from the faintest separator line to the most visible dashed-button border.
  hairline08: `rgba(${HAIRLINE_RGB},0.08)`,
  hairline12: `rgba(${HAIRLINE_RGB},0.12)`,
  hairline15: `rgba(${HAIRLINE_RGB},0.15)`,
  hairline18: `rgba(${HAIRLINE_RGB},0.18)`,
  hairline20: `rgba(${HAIRLINE_RGB},0.2)`,
  hairline22: `rgba(${HAIRLINE_RGB},0.22)`,
  hairline25: `rgba(${HAIRLINE_RGB},0.25)`,
  hairline40: `rgba(${HAIRLINE_RGB},0.4)`,
  hairline45: `rgba(${HAIRLINE_RGB},0.45)`,

  // Dark ink-toned overlays (shadows/scrims), same RGB as `ink`.
  inkOverlay18: `rgba(${INK_RGB},0.18)`,
  inkOverlay55: `rgba(${INK_RGB},0.55)`,

  // Amber drop-shadows behind primary buttons — two components tuned the same hue to
  // slightly different opacities.
  accentShadow50: `rgba(${ACCENT_SHADOW_RGB},0.5)`,
  accentShadow55: `rgba(${ACCENT_SHADOW_RGB},0.55)`,

  progressTrack: "#e4e1d4",

  // Solid warm-warning card (distinct from the translucent idleBg/idleBorder used on
  // StatusBanner) — the "pending approval"-style card seen on Notes' extra-work flag and the
  // device-registration pending state.
  idleCardBg: "#faf0d8",
  idleCardBorder: "#eeddab",
  idleCardSubtext: "#a98a4a",

  // Solid success card — device-registration's "approved" state.
  approvedCardBg: "#e1f1e3",
  approvedCardBorder: "#bfe0c6",

  // Solid travel-info card (distinct from the translucent travelBg/travelBorder) — the
  // "arrived, stop travel time?" prompt on Ticket Detail and Travel's footer banner.
  travelCardBg: "#e1edf9",
  travelCardBorder: "#bfd8f0",

  // Solid rejected/error card — Sync Queue's rejected-row background.
  offCardBg: "#fbe3e2",
  offCardBorder: "#f2c4c2",

  // Warm cream — light text on dark/accent backgrounds, and light solid chip/box fills.
  paper: "#f5f3ed",
  // Subtle warm-gray divider/pill fill, distinct from the translucent glass `border` token.
  divider: "#ece9de",

  // WorkerRow's selected-row tint (a deliberate one-off, not shared with any other surface tone).
  selectedRowBg: "#fdf6e3",
  // Notes' extra-work Switch, track color in its "off" state.
  switchTrackOff: "#ddd6bd",

  // MapPreview's illustrative fake-map graphic (roads/buildings) — decorative, one-off colors
  // that only ever back this single component's drawing, not real UI chrome.
  mapBackground: "#e8ebdd",
  mapRoad: "#fdfbf2",
  mapRoadBorder: "#ddd9c8",
  mapBuildingA: "#dfe6cf",
  mapBuildingB: "#d7e2ea",

  // Same drop-shadow color GlassSurface.tsx itself uses inline (that file is excluded from
  // this centralization pass per the standing "don't touch bottom nav / glass surface"
  // instruction, so it keeps its own literal copy) — this token exists for any other
  // consumer that wants the identical shadow, e.g. theme/glass.ts.
  glassShadow: "rgba(30,30,15,1)",

  screenGradient: ["#f4f2e8", "#edece1", "#e7ead9"] as const,
  glowAmber: "rgba(255,182,10,0.65)",
  glowBlue: "rgba(74,144,208,0.5)",
  glowGreen: "rgba(47,148,81,0.45)",
  glowPink: "rgba(230,90,150,0.4)",
} as const;
