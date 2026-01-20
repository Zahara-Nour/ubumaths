/**
 * Time Matching Utility
 * =====================
 *
 * Functions for matching current time against class schedules.
 * Powers the "Find Current Class" feature in teacher dashboard.
 *
 * FEATURES:
 * ---------
 * - Get current day/time in multiple formats
 * - Match current time against class schedules
 * - Check if time falls within schedule window
 * - Generate user-friendly error messages
 * - Weekend detection (school operates Sunday-Thursday)
 *
 * SCHOOL WEEK:
 * ------------
 * This application is designed for a school that operates Sunday-Thursday:
 * - Sunday (0) = First school day
 * - Monday (1) = School day
 * - Tuesday (2) = School day
 * - Wednesday (3) = School day
 * - Thursday (4) = Last school day
 * - Friday (5) = Weekend
 * - Saturday (6) = Weekend
 *
 * USAGE EXAMPLE:
 * --------------
 * ```typescript
 * import { findCurrentSchedule, formatScheduleMatch } from '$lib/utils/timeMatching';
 *
 * const classes = [{ id: '123', name: 'Math 6A', schedules: [...] }];
 * const match = findCurrentSchedule(classes);
 *
 * if (match) {
 *   console.log(formatScheduleMatch(match));
 *   // Output: "Math 6A - Mathématiques - Salle 101 (8h00-9h00)"
 * }
 * ```
 */

import type { Class, ClassSchedule } from '$lib/types/database-helpers';
import { formatTimeDisplay, getDayName } from './schedule';

/**
 * Current time information in multiple formats
 */
export interface CurrentTimeInfo {
	day: number; // 0-6 (0=Sunday, 1=Monday, etc.)
	time: string; // HH:MM:SS format (24-hour)
	dayName: string; // French day name (e.g., "Lundi")
	timeDisplay: string; // Display format (e.g., "8h30")
}

/**
 * Result of matching a schedule to current time
 */
export interface ScheduleMatch {
	class: Class & { schedules?: ClassSchedule[] }; // Matched class with schedules
	schedule: ClassSchedule; // Specific schedule entry that matched
}

/**
 * Get current day of week and time in multiple formats
 *
 * Uses the browser's local time (teacher's timezone).
 * Day follows JavaScript Date convention: 0=Sunday, 6=Saturday.
 *
 * @returns Object with day number, time string, French day name, and display time
 *
 * @example
 * const { day, time, dayName, timeDisplay } = getCurrentDayAndTime();
 * console.log(day); // 1 (Monday)
 * console.log(time); // "14:30:45"
 * console.log(dayName); // "Lundi"
 * console.log(timeDisplay); // "14h30"
 */
export function getCurrentDayAndTime(): CurrentTimeInfo {
	const now = new Date();

	// Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
	const day = now.getDay();

	// Get time in HH:MM:SS format (24-hour)
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	const seconds = now.getSeconds().toString().padStart(2, '0');
	const time = `${hours}:${minutes}:${seconds}`;

	return {
		day,
		time,
		dayName: getDayName(day), // "Dimanche", "Lundi", etc.
		timeDisplay: formatTimeDisplay(time) // "14h30"
	};
}

/**
 * Check if current time falls within a schedule entry's time range
 *
 * Converts times to minutes since midnight for accurate comparison.
 * Uses inclusive start (>=) and exclusive end (<) logic.
 *
 * @param schedule - Schedule entry with start_time and end_time
 * @param currentTime - Current time in HH:MM:SS format
 * @returns true if current time is within [start_time, end_time)
 *
 * @example
 * const schedule = { start_time: '08:00:00', end_time: '09:00:00', ... };
 * isWithinTimeRange(schedule, '08:30:00'); // true (8:30 is between 8:00-9:00)
 * isWithinTimeRange(schedule, '09:00:00'); // false (end time is exclusive)
 * isWithinTimeRange(schedule, '07:59:00'); // false (before start time)
 */
function isWithinTimeRange(schedule: ClassSchedule, currentTime: string): boolean {
	/**
	 * Convert HH:MM:SS time string to minutes since midnight
	 * Example: "14:30:00" → 870 minutes (14*60 + 30)
	 */
	const timeToMinutes = (time: string): number => {
		const parts = time.split(':');
		return parseInt(parts[0]) * 60 + parseInt(parts[1]);
	};

	// Convert all times to minutes for comparison
	const currentMinutes = timeToMinutes(currentTime);
	const startMinutes = timeToMinutes(schedule.start_time);
	const endMinutes = timeToMinutes(schedule.end_time);

	// Check if current time is in range [start, end)
	// Note: End time is exclusive (< not <=)
	return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Find the current schedule entry for the given time
 *
 * Searches through all teacher's classes to find a schedule that matches
 * the current (or provided) day and time. Returns first match found.
 *
 * SCHOOL DAYS: Only matches Sunday (0) through Thursday (4).
 * Weekend days (Friday=5, Saturday=6) always return null.
 *
 * @param classes - Array of classes with schedules to search
 * @param currentDay - Optional: Day of week (0-6) to check (default: current day)
 * @param currentTime - Optional: Time in HH:MM:SS format (default: current time)
 * @returns ScheduleMatch object if found, null otherwise
 *
 * @example
 * // Use current day/time (typical usage)
 * const match = findCurrentSchedule(classes);
 *
 * // Override with specific day/time (for testing)
 * const match = findCurrentSchedule(classes, 1, '14:30:00'); // Monday at 2:30 PM
 *
 * if (match) {
 *   console.log(`Found: ${match.class.name} - ${match.schedule.subject}`);
 * }
 */
export function findCurrentSchedule(
	classes: (Class & { schedules?: ClassSchedule[] })[],
	currentDay?: number,
	currentTime?: string
): ScheduleMatch | null {
	// Use provided values or get current time from system
	const { day, time } =
		currentDay !== undefined && currentTime !== undefined
			? { day: currentDay, time: currentTime }
			: getCurrentDayAndTime();

	// Check if it's a school day (Sunday=0 to Thursday=4)
	// Weekend days (Friday=5, Saturday=6) have no classes
	if (day < 0 || day > 4) {
		return null;
	}

	// Search through all classes and their schedules
	for (const cls of classes) {
		// Skip classes with no schedules
		if (!cls.schedules || cls.schedules.length === 0) {
			continue;
		}

		// Find matching schedule for current day and time
		const matchingSchedule = cls.schedules.find(
			(schedule: ClassSchedule) =>
				// Must match both day AND be within time range
				schedule.day_of_week === day && isWithinTimeRange(schedule, time)
		);

		// Return first match found
		if (matchingSchedule) {
			return {
				class: cls,
				schedule: matchingSchedule
			};
		}
	}

	// No matching schedule found
	return null;
}

/**
 * Format a schedule match for display in toast notification
 *
 * Builds a user-friendly string with class name, subject, room, and time range.
 * Format: "Class Name - Subject - Salle Room (StartTime-EndTime)"
 *
 * @param match - Schedule match object containing class and schedule
 * @returns Formatted string ready for display
 *
 * @example
 * const match = { class: { name: 'Math 6A' }, schedule: { subject: 'Algèbre', room: '101', start_time: '08:00:00', end_time: '09:00:00' } };
 * formatScheduleMatch(match);
 * // Returns: "Math 6A - Algèbre - Salle 101 (8h00-9h00)"
 */
export function formatScheduleMatch(match: ScheduleMatch): string {
	const parts: string[] = [];

	// Add class name (always present)
	parts.push(match.class.name);

	// Add subject if available (optional field)
	if (match.schedule.subject) {
		parts.push(match.schedule.subject);
	}

	// Add room if available (optional field)
	if (match.schedule.room) {
		parts.push(`Salle ${match.schedule.room}`);
	}

	// Add time range (always present)
	const startTime = formatTimeDisplay(match.schedule.start_time); // "8h00"
	const endTime = formatTimeDisplay(match.schedule.end_time); // "9h00"
	parts.push(`(${startTime}-${endTime})`);

	// Join all parts with " - " separator
	return parts.join(' - ');
}

/**
 * Check if a given day is a weekend day
 *
 * Weekend = Friday (5) or Saturday (6)
 * School days = Sunday (0) through Thursday (4)
 *
 * @param day - Optional: Day of week (0-6) to check (default: current day)
 * @returns true if Friday or Saturday, false otherwise
 *
 * @example
 * isWeekend(5); // true (Friday)
 * isWeekend(0); // false (Sunday - school day)
 * isWeekend(); // true if today is Friday or Saturday
 */
export function isWeekend(day?: number): boolean {
	const checkDay = day !== undefined ? day : getCurrentDayAndTime().day;
	return checkDay === 5 || checkDay === 6; // Friday=5, Saturday=6
}

/**
 * Get a human-readable error message for why no class was found
 *
 * Checks multiple conditions in priority order:
 * 1. Weekend day
 * 2. Teacher has no classes assigned
 * 3. Classes have no schedules configured
 * 4. Default: No class at current time
 *
 * @param classes - Array of teacher's classes with schedules
 * @param currentDay - Optional: Day of week to check (default: current day)
 * @returns French error message string
 *
 * @example
 * getNoClassMessage([], undefined);
 * // Returns: "Aucune classe assignée"
 *
 * getNoClassMessage(classes, 5);
 * // Returns: "Pas de cours aujourd'hui (weekend)"
 */
export function getNoClassMessage(
	classes: (Class & { schedules?: ClassSchedule[] })[],
	currentDay?: number
): string {
	const day = currentDay !== undefined ? currentDay : getCurrentDayAndTime().day;

	// Priority 1: Check if weekend (Friday/Saturday)
	if (isWeekend(day)) {
		return "Pas de cours aujourd'hui (weekend)";
	}

	// Priority 2: Check if teacher has no classes assigned
	if (classes.length === 0) {
		return 'Aucune classe assignée';
	}

	// Priority 3: Check if classes have no schedules configured
	const hasAnySchedules = classes.some((cls) => cls.schedules && cls.schedules.length > 0);
	if (!hasAnySchedules) {
		return 'Aucun emploi du temps configuré';
	}

	// Default: Valid school day, but no class scheduled at current time
	return 'Aucune classe programmée en ce moment';
}
