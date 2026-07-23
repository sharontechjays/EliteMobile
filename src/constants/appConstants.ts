// Every named constant in the app lives here — one file, one import path
// (`@/constants/appConstants`) — so a threshold/duration/cap can be retuned in a single place
// instead of hunting across modules. Group new entries under a comment banner per domain.

// --- Time ---
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_MINUTE = 60;
export const MS_PER_SECOND = 1000;

// --- Home / battery ---
export const DEFAULT_BATTERY_PERCENT = 100;
export const LOW_BATTERY_WARNING_THRESHOLD = 25;

// --- Home / GPS ---
// expo-location has no "services enabled changed" event to subscribe to, so availability is
// polled instead — 5s reads as real-time to a user without hammering the OS location API.
export const GPS_AVAILABILITY_POLL_INTERVAL_MS = 5000;

// --- Meal break compliance ---
// A stand-in for the admin-configurable overrides (ADM-6) mentioned in the compliance story,
// which are out of scope for the current frontend-only pass.
export const MEAL_BREAK_MINIMUM_MINUTES = 30;
export const MEAL_BREAK_MINIMUM_SECONDS = MEAL_BREAK_MINIMUM_MINUTES * SECONDS_PER_MINUTE;

// First meal break must start before the 5th hour on the clock. A crew-only reminder fires
// at the 4-hour mark; if the break still hasn't started, crew+supervisor escalations follow
// every 15 minutes, capped at 4 alerts total (4h, 4h15, 4h30, 4h45).
export const FIRST_MEAL_REMINDER_HOUR = 4;
export const FIRST_MEAL_ESCALATION_INTERVAL_MINUTES = 15;
export const FIRST_MEAL_MAX_ALERTS = 4;

// Second meal break: California law requires a second break once a shift runs past the 10th
// hour, with a penalty attaching at the 12th hour. This cascade starts at the 11th hour
// (ahead of that penalty point) and escalates to crew+supervisor every 15 minutes, the same
// 4-alert cap as the first cascade.
export const SECOND_MEAL_CASCADE_START_HOUR = 11;
export const SECOND_MEAL_ESCALATION_INTERVAL_MINUTES = 15;
export const SECOND_MEAL_MAX_ALERTS = 4;

// --- Meal reminder feature flag (clock-in cascade) ---
// Toggle to "testing" while QA-ing the clock-in meal-reminder cascade so it fires in seconds
// instead of hours; flip back to "production" before demoing/shipping. Stands in for a future
// admin/remote-config toggle the same way the compliance constants above do.
export const MEAL_REMINDER_MODE: "production" | "testing" = "testing";

// Testing-mode timings for the clock-in meal reminder cascade — same shape as the production
// FIRST_MEAL_* cascade above (one crew-only reminder, then escalations up to a max alert count),
// just compressed to seconds so a tester doesn't have to wait hours to see it fire.
export const MEAL_REMINDER_TEST_START_SECONDS = 30;
export const MEAL_REMINDER_TEST_ESCALATION_INTERVAL_SECONDS = 20;
export const MEAL_REMINDER_TEST_MAX_ALERTS = FIRST_MEAL_MAX_ALERTS;

// --- Timer engine ---
export const TIMER_TICK_INTERVAL_MS = 1000;

// --- Notifications ---
// The notifications log/panel only ever shows a short recent list, not a paginated history — 6
// keeps it scrollable on one screen without a "load more" affordance. Older entries beyond this
// cap are silently dropped, not archived anywhere.
export const MAX_NOTIF_LOG = 6;

// --- Query client / offline ---
// Defaults tuned for a field crew that regularly loses signal (yards, rural job sites): generous
// staleTime/gcTime so a screen already has something to show immediately from cache.
export const QUERY_RETRY_COUNT = 2;
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000; // 5 min — shown without a background refetch
export const QUERY_CACHE_TIME_MS = 24 * 60 * 60 * 1000; // 24h — how long data stays available offline

// --- Auth / sign-in ---
export const SIGN_IN_CODE_LENGTH = 5;
// How long the keypad shows its error/shake state before clearing the code and accepting input
// again — long enough to register as a deliberate error state, short enough not to feel stuck.
export const SIGN_IN_ERROR_DISPLAY_MS = 350;

// --- Clock / attestation ---
// Matches the sign-in keypad's fixed 5-digit SIGN_IN_CODE_LENGTH with a little slack on both
// ends rather than requiring an exact length — MIN gates canConfirm/onConfirm, MAX is enforced
// as AttestationScreen's TextInput maxLength.
export const ATTESTATION_MIN_CODE_LENGTH = 4;
export const ATTESTATION_MAX_CODE_LENGTH = 6;

// --- Splash ---
// Fake progress bar: starts partially filled (rather than 0) so the splash screen never shows a
// completely empty bar on first paint, and advances in fixed steps rather than being tied to any
// real loading signal.
export const SPLASH_INITIAL_PROGRESS = 0.15;
export const SPLASH_PROGRESS_STEP = 0.17;
export const SPLASH_PROGRESS_INTERVAL_MS = 220;

// --- Notes ---
export const NOTES_MAX_PHOTOS = 4;

// --- Shared storage / security ---
// AES-256 keys are capped at 32 bytes by react-native-mmkv, and the key is used as a literal
// string, not decoded — so the string's own UTF-8 byte length must fit that budget. 24 random
// bytes base64-encode to exactly 32 ASCII characters with no padding (24 is divisible by 3),
// landing exactly on the limit while staying safely round-trippable as a plain string. See
// getOrCreateMmkvEncryptionKey.ts's own base64 encoding for the math this depends on.
export const MMKV_ENCRYPTION_KEY_BYTE_COUNT = 24;

// --- Media thumbnail ---
export const THUMBNAIL_SIZE = 64;

// --- Bell icon ---
export const BELL_ICON_VIEWBOX_WIDTH = 13;
export const BELL_ICON_VIEWBOX_HEIGHT = 14;
export const BELL_ICON_STROKE_WIDTH = 1.3;
export const BELL_ICON_DEFAULT_SIZE = 13;

// --- Keypad ---
export const KEYPAD_KEY_WIDTH = 68;
export const KEYPAD_KEY_HEIGHT = 68;
export const KEYPAD_KEY_RADIUS = 21;
export const KEYPAD_GAP = 16;
export const KEYPAD_COLUMNS = 3;

// --- Back button ---
// Apple's Human Interface Guidelines minimum tappable touch target — the visual chip could be
// smaller, but the tap area shouldn't be.
export const BACK_BUTTON_SIZE = 44;

// --- Background texture ---
export const BACKGROUND_TEXTURE_COLUMNS = 10;
export const BACKGROUND_TEXTURE_ROWS = 20;
export const BACKGROUND_TEXTURE_SPACING = 40;

// --- Top bar ---
export const TOPBAR_BELL_SIZE = 36;
export const TOPBAR_BELL_ICON_SIZE = 17;

// --- Media preview modal ---
export const MEDIA_PREVIEW_FALLBACK_ASPECT_RATIO = 16 / 9;
