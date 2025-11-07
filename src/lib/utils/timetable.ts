import type { SchoolTimetable, SchoolPeriod } from '$lib/types/database';
import { formatTimeDisplay, timeToMinutes } from './schedule';

/**
 * Timetable Utility Functions
 * Helper functions for working with school timetables and periods
 */

/**
 * Get period by number from school timetable
 * @param timetable - School timetable
 * @param periodNumber - Period number to find
 * @returns Period or undefined if not found
 */
export function getPeriod(
	timetable: SchoolTimetable | null,
	periodNumber: number
): SchoolPeriod | undefined {
	if (!timetable || !timetable.periods) return undefined;
	return timetable.periods.find((p: SchoolPeriod) => p.number === periodNumber);
}

/**
 * Format period for display in select/dropdown
 * @param period - School period
 * @returns Formatted string (e.g., "Period 1 (7h00 - 8h00)")
 */
export function formatPeriodDisplay(period: SchoolPeriod): string {
	const startDisplay = formatTimeDisplay(period.start_time);
	const endDisplay = formatTimeDisplay(period.end_time);
	const baseName = period.name || `Période ${period.number}`;
	return `${baseName} (${startDisplay} - ${endDisplay})`;
}

/**
 * Format period for display with only name and number
 * @param period - School period
 * @returns Formatted string (e.g., "Period 1" or "Morning Break")
 */
export function formatPeriodName(period: SchoolPeriod): string {
	return period.name || `Période ${period.number}`;
}

/**
 * Format period times only
 * @param period - School period
 * @returns Formatted string (e.g., "7h00 - 8h00")
 */
export function formatPeriodTimes(period: SchoolPeriod): string {
	const startDisplay = formatTimeDisplay(period.start_time);
	const endDisplay = formatTimeDisplay(period.end_time);
	return `${startDisplay} - ${endDisplay}`;
}

/**
 * Validate timetable for conflicts and errors
 * @param periods - Array of periods to validate
 * @returns Validation result with errors array
 */
export interface ValidationError {
	type: 'overlap' | 'invalid_time' | 'duplicate_number';
	periodNumber: number;
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

/**
 * Validate school timetable for conflicts and errors
 *
 * Performs comprehensive validation of periods within a school timetable:
 * 1. Checks for duplicate period numbers
 * 2. Validates each period has valid time range (end > start)
 * 3. Detects overlapping time slots between consecutive periods
 *
 * VALIDATION RULES:
 * - Period numbers must be unique (no duplicates)
 * - End time must be strictly after start time for each period
 * - Consecutive periods cannot overlap (end time of one must <= start time of next)
 *
 * @param periods - Array of school periods to validate
 * @returns Validation result containing overall valid status and detailed error list
 *
 * @example
 * ```typescript
 * const periods: SchoolPeriod[] = [
 *   { number: 1, start_time: '07:00:00', end_time: '08:00:00' },
 *   { number: 2, start_time: '08:00:00', end_time: '09:00:00' }
 * ];
 *
 * const result = validateTimetable(periods);
 * if (result.valid) {
 *   console.log('Timetable is valid');
 * } else {
 *   result.errors.forEach(err => console.error(err.message));
 * }
 * ```
 */
export function validateTimetable(periods: SchoolPeriod[]): ValidationResult {
	const errors: ValidationError[] = [];

	// Step 1: Check for duplicate period numbers
	const numbers = periods.map((p) => p.number);
	const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
	if (duplicates.length > 0) {
		duplicates.forEach((num) => {
			errors.push({
				type: 'duplicate_number',
				periodNumber: num,
				message: `Numéro de période ${num} en double`
			});
		});
	}

	// Step 2: Check each period for valid time range (end time must be after start time)
	periods.forEach((period) => {
		const startMinutes = timeToMinutes(period.start_time);
		const endMinutes = timeToMinutes(period.end_time);

		if (endMinutes <= startMinutes) {
			errors.push({
				type: 'invalid_time',
				periodNumber: period.number,
				message: `Période ${period.number}: l'heure de fin doit être après l'heure de début`
			});
		}
	});

	// Step 3: Check for overlapping periods
	// Sort by start time to compare consecutive periods efficiently
	const sorted = [...periods].sort((a, b) => {
		return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
	});

	// Compare each pair of consecutive periods for overlaps
	for (let i = 0; i < sorted.length - 1; i++) {
		const current = sorted[i];
		const next = sorted[i + 1];

		const currentEnd = timeToMinutes(current.end_time);
		const nextStart = timeToMinutes(next.start_time);

		// Overlap occurs if current period ends after next period starts
		if (currentEnd > nextStart) {
			errors.push({
				type: 'overlap',
				periodNumber: current.number,
				message: `Période ${current.number} chevauche période ${next.number}`
			});
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Find period that matches given time range
 * Useful for migrating existing schedules to periods
 * @param timetable - School timetable
 * @param startTime - Start time to match
 * @param endTime - End time to match
 * @returns Matching period or undefined
 */
export function findMatchingPeriod(
	timetable: SchoolTimetable | null,
	startTime: string,
	endTime: string
): SchoolPeriod | undefined {
	if (!timetable || !timetable.periods) return undefined;

	return timetable.periods.find(
		(p: SchoolPeriod) => p.start_time === startTime && p.end_time === endTime
	);
}

/**
 * Sort periods by start time
 * @param periods - Array of periods
 * @returns Sorted array (does not mutate original)
 */
export function sortPeriods(periods: SchoolPeriod[]): SchoolPeriod[] {
	return [...periods].sort((a, b) => {
		return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
	});
}

/**
 * Get next available period number
 * @param periods - Existing periods
 * @returns Next sequential number
 */
export function getNextPeriodNumber(periods: SchoolPeriod[]): number {
	if (periods.length === 0) return 1;
	const maxNumber = Math.max(...periods.map((p) => p.number));
	return maxNumber + 1;
}

/**
 * Check if timetable is empty (no periods defined)
 * @param timetable - School timetable
 * @returns True if empty or null
 */
export function isTimetableEmpty(timetable: SchoolTimetable | null): boolean {
	return !timetable || !timetable.periods || timetable.periods.length === 0;
}

/**
 * Create default timetable with common periods
 * Used as template when school first creates timetable
 * @returns Timetable with 8 standard periods (7:00-15:00)
 */
export function createDefaultTimetable(): SchoolTimetable {
	return {
		periods: [
			{ number: 1, start_time: '07:00:00', end_time: '08:00:00' },
			{ number: 2, start_time: '08:00:00', end_time: '09:00:00' },
			{ number: 3, start_time: '09:00:00', end_time: '10:00:00' },
			{ number: 4, start_time: '10:00:00', end_time: '11:00:00' },
			{ number: 5, start_time: '11:00:00', end_time: '12:00:00' },
			{ number: 6, start_time: '13:00:00', end_time: '14:00:00' },
			{ number: 7, start_time: '14:00:00', end_time: '15:00:00' },
			{ number: 8, start_time: '15:00:00', end_time: '16:00:00' }
		]
	};
}
