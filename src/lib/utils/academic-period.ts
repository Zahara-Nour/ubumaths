/**
 * Academic Period Utilities
 * ==========================
 *
 * Helpers for working with academic periods, including finding the current
 * active period based on date ranges.
 *
 * USAGE:
 * ------
 * Import and use in components that need to determine which academic period
 * is currently active for filtering warnings, grades, and other period-specific data.
 *
 * EXAMPLES:
 * ---------
 * ```typescript
 * import { findCurrentPeriod, getPeriodName } from '$lib/utils/academic-period';
 *
 * const currentPeriodId = findCurrentPeriod(academicPeriods);
 * const periodName = getPeriodName(currentPeriod);
 * ```
 */

import type { Database } from '$lib/types/database';

type AcademicPeriod = Database['public']['Tables']['academic_periods']['Row'];

/**
 * Finds the current active academic period based on today's date
 *
 * LOGIC:
 * ------
 * 1. Find period where today is between start_date and end_date (inclusive)
 * 2. If no active period found, return the most recent period (by start_date)
 * 3. If no periods at all, return null
 *
 * WHY FALLBACK TO MOST RECENT:
 * -----------------------------
 * If we're between periods (e.g., during holidays), we should show the most
 * recent period's data rather than nothing. This ensures teachers can always
 * view student warnings/grades even during breaks.
 *
 * EDGE CASES HANDLED:
 * -------------------
 * - Empty array → returns null
 * - Between periods → returns most recent period
 * - Multiple overlapping periods → returns first match (shouldn't happen in practice)
 * - Invalid dates → falls through to most recent period
 *
 * @param periods - Array of academic periods from the database
 * @returns The current period ID or null if no periods exist
 *
 * @example
 * ```typescript
 * // During first trimester (Sep 1 - Dec 15)
 * const periods = [
 *   { id: 'p1', start_date: '2024-09-01', end_date: '2024-12-15', ... },
 *   { id: 'p2', start_date: '2024-12-16', end_date: '2025-03-31', ... },
 * ];
 * findCurrentPeriod(periods); // → 'p1'
 *
 * // During winter break (Dec 20 - Jan 3)
 * findCurrentPeriod(periods); // → 'p2' (most recent period by start_date)
 *
 * // No periods configured
 * findCurrentPeriod([]); // → null
 * ```
 */
export function findCurrentPeriod(periods: AcademicPeriod[]): string | null {
	// Edge case: no periods configured
	if (!periods || periods.length === 0) {
		return null;
	}

	const now = new Date();

	// Find period where today is between start_date and end_date (inclusive)
	const currentPeriod = periods.find((p) => {
		const start = new Date(p.start_date);
		const end = new Date(p.end_date);
		return now >= start && now <= end;
	});

	// Return current period if found
	if (currentPeriod) {
		return currentPeriod.id;
	}

	// Fallback: Return most recent period (highest start_date)
	// Sort by start_date descending and take first
	const sortedByDate = [...periods].sort(
		(a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
	);

	return sortedByDate[0]?.id ?? null;
}

/**
 * Gets the display name for a period
 *
 * USAGE:
 * ------
 * Use this to display user-friendly period names in the UI.
 * Falls back to year if name is not set.
 *
 * @param period - Academic period object
 * @returns Display name for the period
 *
 * @example
 * ```typescript
 * const period = { name: 'Trimestre 1', start_date: '2024-09-01', ... };
 * getPeriodName(period); // → 'Trimestre 1'
 *
 * const period2 = { name: '', start_date: '2024-09-01', ... };
 * getPeriodName(period2); // → 'Période 2024'
 * ```
 */
export function getPeriodName(period: AcademicPeriod): string {
	// Use name if available
	if (period.name && period.name.trim()) {
		return period.name;
	}

	// Fallback: "Période YYYY"
	const year = new Date(period.start_date).getFullYear();
	return `Période ${year}`;
}

/**
 * Checks if a specific date is within a period's date range
 *
 * @param date - Date to check (string or Date object)
 * @param period - Academic period object
 * @returns True if date is within period bounds
 *
 * @example
 * ```typescript
 * const period = { start_date: '2024-09-01', end_date: '2024-12-15', ... };
 * isDateInPeriod('2024-10-15', period); // → true
 * isDateInPeriod('2024-08-15', period); // → false
 * ```
 */
export function isDateInPeriod(date: string | Date, period: AcademicPeriod): boolean {
	const checkDate = typeof date === 'string' ? new Date(date) : date;
	const start = new Date(period.start_date);
	const end = new Date(period.end_date);
	return checkDate >= start && checkDate <= end;
}

/**
 * Filters periods by school year
 *
 * @param periods - Array of academic periods
 * @param schoolYearId - School year ID to filter by
 * @returns Filtered array of periods for the specified school year
 *
 * @example
 * ```typescript
 * const allPeriods = [
 *   { id: 'p1', school_year_id: 'year-2024', ... },
 *   { id: 'p2', school_year_id: 'year-2023', ... },
 * ];
 * getPeriodsForYear(allPeriods, 'year-2024'); // → [{ id: 'p1', ... }]
 * ```
 */
export function getPeriodsForYear(
	periods: AcademicPeriod[],
	schoolYearId: string
): AcademicPeriod[] {
	return periods.filter((p) => p.school_year_id === schoolYearId);
}
