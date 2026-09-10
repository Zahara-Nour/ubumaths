/**
 * Class Session Dates
 * ===================
 *
 * Pure calendar computation: the dates on which a class actually meets, i.e.
 * the weekdays of its timetable minus the school holiday periods.
 *
 * Used to constrain cahier de texte homework deadlines: homework is handed in
 * on a day the class meets — never a Sunday, never a Thursday of half-term.
 *
 * No Supabase dependency on purpose. Reading `class_schedules` /
 * `school_holidays` lives in `$lib/server/class-sessions`; this module only
 * knows the calendar, which makes the rule testable without a database.
 *
 * ⚠️ Every date is handled in UTC. `new Date('2026-09-10')` is parsed as UTC
 * midnight while `getDay()` / `getDate()` read local time: mixing the two
 * shifts a day for anyone west of Greenwich, turning a Thursday into a
 * Wednesday. All helpers below use the `getUTC*` family exclusively.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * A school holiday period. Both bounds are inclusive days off — `endDate` is
 * the last day of the break, not the day pupils come back.
 */
export interface HolidayPeriod {
	startDate: string;
	endDate: string;
}

export interface SessionDatesOptions {
	/** Weekdays the class meets, JS convention (0 = Sunday … 6 = Saturday). */
	weekdays: number[];
	/** Dates returned are strictly after this one (the journal entry's date). */
	after: string;
	/** Last date that may be returned, inclusive — typically the school year end. */
	until: string;
	/** Holiday periods to remove from the result. */
	holidays?: HolidayPeriod[];
	/** Maximum number of dates returned. */
	limit?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** ISO calendar date, `YYYY-MM-DD`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_DAY = 86_400_000;

/**
 * Default cap on the returned list.
 *
 * A deadline picker is a menu, not an archive: past ~30 entries the teacher
 * scrolls instead of choosing. It also bounds the loop when a caller passes a
 * far-away `until`.
 */
export const DEFAULT_SESSION_LIMIT = 30;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Parse `YYYY-MM-DD` into a UTC timestamp.
 *
 * Returns null on anything that is not a real calendar day. The round-trip
 * check is what rejects `2026-02-30`: `Date.UTC` rolls it over to March 2
 * instead of failing, so only re-formatting catches it.
 */
export function parseIsoDate(iso: string): number | null {
	if (typeof iso !== 'string' || !ISO_DATE.test(iso)) return null;

	const [year, month, day] = iso.split('-').map(Number);
	const timestamp = Date.UTC(year, month - 1, day);

	if (Number.isNaN(timestamp)) return null;
	return toIsoDate(timestamp) === iso ? timestamp : null;
}

/**
 * Format a UTC timestamp as `YYYY-MM-DD`.
 */
export function toIsoDate(timestamp: number): string {
	return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Is this date inside one of the holiday periods?
 *
 * Both bounds are inclusive. A period whose dates are unparseable is skipped
 * rather than treated as matching: a malformed row must not silently erase
 * every session of the year.
 */
export function isWithinHoliday(timestamp: number, holidays: HolidayPeriod[]): boolean {
	for (const period of holidays) {
		const start = parseIsoDate(period.startDate);
		const end = parseIsoDate(period.endDate);
		if (start === null || end === null) continue;
		if (timestamp >= start && timestamp <= end) return true;
	}
	return false;
}

/**
 * The dates on which the class meets, strictly after `after` and up to
 * `until`, holidays removed.
 *
 * Returns an empty list — never throws — when the class has no timetable, when
 * a bound is unparseable, or when `until` precedes `after`. The caller decides
 * what an empty list means for the interface; here it is simply "no such day".
 */
export function computeSessionDates(options: SessionDatesOptions): string[] {
	const { weekdays, after, until, holidays = [], limit = DEFAULT_SESSION_LIMIT } = options;

	const start = parseIsoDate(after);
	const end = parseIsoDate(until);
	if (start === null || end === null || end <= start || limit <= 0) return [];

	// Duplicates are the norm, not the exception: a class with two consecutive
	// hours on Thursday has two `class_schedules` rows for day 4, and without
	// this every Thursday would be listed twice.
	const meetingDays = new Set(
		weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
	);
	if (meetingDays.size === 0) return [];

	const dates: string[] = [];
	for (let timestamp = start + MS_PER_DAY; timestamp <= end; timestamp += MS_PER_DAY) {
		if (!meetingDays.has(new Date(timestamp).getUTCDay())) continue;
		if (isWithinHoliday(timestamp, holidays)) continue;

		dates.push(toIsoDate(timestamp));
		if (dates.length >= limit) break;
	}

	return dates;
}

/**
 * Is this date one on which the class meets?
 *
 * The deadline picker only offers valid dates, but a forged request can carry
 * any date at all — so the server re-checks with this, against the same list
 * the menu was built from.
 */
export function isSessionDate(date: string, options: SessionDatesOptions): boolean {
	const target = parseIsoDate(date);
	const start = parseIsoDate(options.after);
	const end = parseIsoDate(options.until);
	if (target === null || start === null || end === null) return false;

	// Deliberately NOT `computeSessionDates(...).includes(date)`. Enumerating
	// would need `limit` lifted — the menu is truncated at 30, the rule is not —
	// and `until` comes from `school_years.end_date`, a date a human types. One
	// typo away from `9999-06-30`, the day-by-day loop runs a few million times
	// per saved deadline. Deciding costs O(holidays) and answers the same
	// question, with the same bounds: `after` exclusive, `until` inclusive.
	if (target <= start || target > end) return false;

	const meetingDays = new Set(
		options.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
	);
	if (!meetingDays.has(new Date(target).getUTCDay())) return false;

	return !isWithinHoliday(target, options.holidays ?? []);
}
