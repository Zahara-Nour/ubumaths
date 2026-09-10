/**
 * Class Session Dates — database reader
 * =====================================
 *
 * Turns a class into the list of dates it actually meets: its timetable
 * (`class_schedules`) minus its school's holiday periods (`school_holidays`,
 * reached through `school_years`), fed to the pure calendar in
 * `$lib/utils/class-sessions`.
 *
 * Used by the cahier de texte to constrain homework deadlines — a deadline is a
 * day the class meets, so it must be picked from this list, and re-checked
 * against it on save.
 *
 * @module server/class-sessions
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	computeSessionDates,
	DEFAULT_SESSION_LIMIT,
	parseIsoDate,
	toIsoDate,
	type HolidayPeriod,
	type SessionDatesOptions
} from '$lib/utils/class-sessions';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A class's meeting calendar, as far as the database knows it.
 */
export interface ClassSessionCalendar {
	/** Weekdays the class meets (JS convention, 0 = Sunday). */
	weekdays: number[];
	/** Holiday periods of the school year covering the reference date. */
	holidays: HolidayPeriod[];
	/** Last date the calendar extends to — school year end, or a year out. */
	until: string;
	/**
	 * Does this class have a timetable at all?
	 *
	 * Three of the four active classes have none. The interface needs to tell
	 * "no session left this year" (a closed list) from "no timetable entered"
	 * (nothing to build a list from) — the second one falls back to a free date
	 * field instead of blocking the teacher.
	 */
	hasSchedule: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Fallback horizon when the class's school has no school year on record. */
const FALLBACK_HORIZON_DAYS = 365;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Read a class's meeting calendar.
 *
 * `referenceDate` is the journal entry's date: it selects the school year whose
 * span contains it, so writing last June's entry uses last year's holidays
 * rather than this year's.
 *
 * Throws on a database error rather than returning a degraded calendar. An
 * unreadable timetable that silently became "no timetable" would offer a free
 * date field, and the teacher would record a deadline on a day with no class —
 * the exact mistake this module exists to prevent.
 */
export async function getClassSessionCalendar(
	supabase: SupabaseClient<Database>,
	classId: string,
	referenceDate: string
): Promise<ClassSessionCalendar> {
	const [{ data: schedules, error: schedulesError }, { data: classData, error: classError }] =
		await Promise.all([
			supabase.from('class_schedules').select('day_of_week').eq('class_id', classId),
			supabase.from('classes').select('school_id').eq('id', classId).single()
		]);

	if (schedulesError) {
		console.error('[class-sessions] Emploi du temps illisible :', schedulesError);
		throw new Error(schedulesError.message);
	}
	if (classError) {
		console.error('[class-sessions] Classe illisible :', classError);
		throw new Error(classError.message);
	}

	const weekdays = (schedules ?? []).map((row) => row.day_of_week);
	const { holidays, until } = await getSchoolCalendar(
		supabase,
		classData?.school_id ?? null,
		referenceDate
	);

	return { weekdays, holidays, until, hasSchedule: weekdays.length > 0 };
}

/**
 * Holiday periods and horizon for a school, at a given date.
 *
 * A class without a school — they exist, `classes.school_id` is nullable — gets
 * no holidays and a one-year horizon. That is a calendar with no breaks in it,
 * which is wrong but harmless: it offers too many dates, never too few, and the
 * teacher still picks the right one.
 */
async function getSchoolCalendar(
	supabase: SupabaseClient<Database>,
	schoolId: string | null,
	referenceDate: string
): Promise<{ holidays: HolidayPeriod[]; until: string }> {
	const fallbackUntil = addDays(referenceDate, FALLBACK_HORIZON_DAYS);
	if (!schoolId) return { holidays: [], until: fallbackUntil };

	// The school year whose span contains the entry's date. `.maybeSingle()` and
	// not `.single()`: a school with no year on record is an ordinary state, not
	// a failure — `PGRST116` here would mean "absence", never "breakdown".
	const { data: year, error: yearError } = await supabase
		.from('school_years')
		.select('id, end_date')
		.eq('school_id', schoolId)
		.lte('start_date', referenceDate)
		.gte('end_date', referenceDate)
		.order('start_date', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (yearError) {
		console.error('[class-sessions] Année scolaire illisible :', yearError);
		throw new Error(yearError.message);
	}
	if (!year) return { holidays: [], until: fallbackUntil };

	const { data: holidays, error: holidaysError } = await supabase
		.from('school_holidays')
		.select('start_date, end_date')
		.eq('school_year_id', year.id);

	// Losing the holidays would offer deadlines in the middle of half-term —
	// precisely what the teacher asked us to prevent. Better no list than a
	// wrong one.
	if (holidaysError) {
		console.error('[class-sessions] Vacances illisibles :', holidaysError);
		throw new Error(holidaysError.message);
	}

	return {
		holidays: (holidays ?? []).map((h) => ({ startDate: h.start_date, endDate: h.end_date })),
		until: year.end_date
	};
}

/**
 * Build the calendar options the pure module expects, for dates after
 * `entryDate`.
 */
export function toSessionOptions(
	calendar: ClassSessionCalendar,
	entryDate: string,
	limit = DEFAULT_SESSION_LIMIT
): SessionDatesOptions {
	return {
		weekdays: calendar.weekdays,
		after: entryDate,
		until: calendar.until,
		holidays: calendar.holidays,
		limit
	};
}

/**
 * The dates on which a class meets after a journal entry's date.
 *
 * Convenience wrapper for callers that only need the list.
 */
export async function getUpcomingSessionDates(
	supabase: SupabaseClient<Database>,
	classId: string,
	entryDate: string,
	limit = DEFAULT_SESSION_LIMIT
): Promise<{ dates: string[]; hasSchedule: boolean }> {
	const calendar = await getClassSessionCalendar(supabase, classId, entryDate);
	return {
		dates: computeSessionDates(toSessionOptions(calendar, entryDate, limit)),
		hasSchedule: calendar.hasSchedule
	};
}

/**
 * Shift an ISO date by a number of days, in UTC.
 *
 * Falls back to the input when it is unparseable: the caller uses the result as
 * an upper bound, and an invalid bound makes the pure module return an empty
 * list — which is the safe outcome.
 */
function addDays(date: string, days: number): string {
	const timestamp = parseIsoDate(date);
	if (timestamp === null) return date;
	return toIsoDate(timestamp + days * 86_400_000);
}
