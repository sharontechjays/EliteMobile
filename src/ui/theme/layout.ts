// Vertical clearance for screen content below the floating TopBar (which sits absolutely
// positioned over every screen, so content has no automatic way to avoid overlapping it).
// Must stay in sync with TopBar's actual rendered height — if TopBar grows, bump these.
//
// Used by screens whose content sits inside a nested ScrollView wrapper (Home, Profile,
// Roster, Sync Queue, Tickets, Timesheet):
export const SCREEN_TOP_INSET = 114;

// Used by screens where this padding is applied directly to the outermost content
// container (Sign In, Attestation, Device Registration, Notes, Ticket Detail, Travel) —
// these were originally tuned 6px larger than SCREEN_TOP_INSET and keep that same offset.
export const SCREEN_TOP_INSET_DIRECT = 120;
