/**
 * Timezone utilities for calculating dates in different timezones
 * Used by the daily/weekly summaries system to handle multi-timezone schools
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getDay, startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import type { WeekConfig } from './database-types';

/**
 * Get yesterday's date in the specified timezone
 * Returns the start of yesterday (00:00:00) in the given timezone
 *
 * @example
 * // If now is 2025-11-13 02:00 UTC and timezone is Europe/Paris (UTC+1)
 * // Returns 2025-11-12 00:00:00 in Europe/Paris timezone (as UTC Date object)
 * getYesterdayInTimezone('Europe/Paris')
 *
 * @param timezone - IANA timezone string (e.g., 'Europe/Paris', 'America/New_York')
 * @returns Date object representing start of yesterday in that timezone
 */
export function getYesterdayInTimezone(timezone: string): Date {
	try {
		// Get current time in the specified timezone
		const nowInTimezone = toZonedTime(new Date(), timezone);

		// Subtract one day
		const yesterdayInTimezone = subDays(nowInTimezone, 1);

		// Get start of day (00:00:00)
		const startOfYesterday = startOfDay(yesterdayInTimezone);

		// Convert back to UTC Date object
		return fromZonedTime(startOfYesterday, timezone);
	} catch (error) {
		console.error('[getYesterdayInTimezone] Error:', error);
		throw new Error(`Invalid timezone: ${timezone}`);
	}
}

/**
 * Get current day of week (0-6) in the specified timezone
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 *
 * @example
 * // If current time in Europe/Paris is Monday
 * getCurrentDayOfWeekInTimezone('Europe/Paris') // Returns 1
 *
 * @param timezone - IANA timezone string
 * @returns Day of week (0-6)
 */
export function getCurrentDayOfWeekInTimezone(timezone: string): number {
	try {
		const nowInTimezone = toZonedTime(new Date(), timezone);
		return getDay(nowInTimezone);
	} catch (error) {
		console.error('[getCurrentDayOfWeekInTimezone] Error:', error);
		throw new Error(`Invalid timezone: ${timezone}`);
	}
}

/**
 * Get the previous week's date range based on week_config
 * Returns the most recently completed week in the specified timezone
 *
 * @example
 * // If week starts on Sunday (0) and ends on Saturday (6)
 * // and today is Sunday 2025-11-16
 * // Returns: { start: Sun Nov 9 00:00, end: Sat Nov 15 23:59:59 }
 *
 * @param timezone - IANA timezone string
 * @param weekConfig - Week configuration with first_day and last_day
 * @returns Object with start and end Date objects (in UTC, but representing timezone boundaries)
 */
export function getWeekRangeInTimezone(
	timezone: string,
	weekConfig: WeekConfig
): { start: Date; end: Date } {
	try {
		// Get current time in timezone
		const nowInTimezone = toZonedTime(new Date(), timezone);
		const currentDayOfWeek = getDay(nowInTimezone);

		const { first_day, last_day } = weekConfig;

		// Calculate how many days ago the current week started
		let daysToCurrentWeekStart: number;
		if (currentDayOfWeek >= first_day) {
			daysToCurrentWeekStart = currentDayOfWeek - first_day;
		} else {
			daysToCurrentWeekStart = 7 - (first_day - currentDayOfWeek);
		}

		// Get the start of the current week
		const currentWeekStart = startOfDay(subDays(nowInTimezone, daysToCurrentWeekStart));

		// Previous week starts 7 days before current week start
		const previousWeekStart = subDays(currentWeekStart, 7);

		// Calculate the length of the week based on first_day and last_day
		let weekLength: number;
		if (last_day >= first_day) {
			weekLength = last_day - first_day + 1;
		} else {
			weekLength = 7 - first_day + last_day + 1;
		}

		// Previous week ends (weekLength - 1) days after it starts
		const previousWeekEnd = endOfDay(addDays(previousWeekStart, weekLength - 1));

		// Convert back to UTC
		return {
			start: fromZonedTime(previousWeekStart, timezone),
			end: fromZonedTime(previousWeekEnd, timezone)
		};
	} catch (error) {
		console.error('[getWeekRangeInTimezone] Error:', error);
		throw new Error(`Failed to calculate week range for timezone: ${timezone}`);
	}
}

/**
 * Format a date for display in notifications
 * Uses French locale by default for UbuMaths
 *
 * @example
 * formatDateForDisplay(new Date('2025-11-13')) // Returns "13 novembre 2025"
 *
 * @param date - Date to format
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: Date, locale: string = 'fr-FR'): string {
	try {
		return date.toLocaleDateString(locale, {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	} catch (error) {
		console.error('[formatDateForDisplay] Error:', error);
		// Fallback to ISO string if formatting fails
		return date.toISOString().split('T')[0];
	}
}

/**
 * Check if a date falls within a date range (inclusive)
 * All dates should be in UTC
 *
 * @param date - Date to check
 * @param start - Range start (inclusive)
 * @param end - Range end (inclusive)
 * @returns True if date is within range
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
	return date >= start && date <= end;
}

/**
 * Get start and end of day for a date in a specific timezone
 * Useful for querying database records that fall within a day
 *
 * @param date - Date object
 * @param timezone - IANA timezone string
 * @returns Object with start and end Date objects
 */
export function getDayBoundariesInTimezone(
	date: Date,
	timezone: string
): { start: Date; end: Date } {
	try {
		const dateInTimezone = toZonedTime(date, timezone);
		const dayStart = startOfDay(dateInTimezone);
		const dayEnd = endOfDay(dateInTimezone);

		return {
			start: fromZonedTime(dayStart, timezone),
			end: fromZonedTime(dayEnd, timezone)
		};
	} catch (error) {
		console.error('[getDayBoundariesInTimezone] Error:', error);
		throw new Error(`Failed to calculate day boundaries for timezone: ${timezone}`);
	}
}
