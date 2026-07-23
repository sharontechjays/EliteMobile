// Every named constant in the app lives here — one file, one import path
// (`@/constants/appConstants`) — so a threshold/duration/cap can be retuned in a single place
// instead of hunting across modules. Group new entries under a comment banner per domain.

// --- Time ---
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_MINUTE = 60;

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
