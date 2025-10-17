import type { ClassSchedule } from '$lib/types/database';

/**
 * Schedule Utility Functions
 * Helper functions for working with class schedules
 */

// Day names in French (Sunday-Thursday)
export const DAY_NAMES: Record<number, string> = {
	0: 'Dimanche',
	1: 'Lundi',
	2: 'Mardi',
	3: 'Mercredi',
	4: 'Jeudi'
};

// Short day names in French
export const DAY_NAMES_SHORT: Record<number, string> = {
	0: 'Dim',
	1: 'Lun',
	2: 'Mar',
	3: 'Mer',
	4: 'Jeu'
};

/**
 * Get day name in French
 * @param dayNum - Day number (0-4, where 0=Sunday)
 * @param short - Return short version if true
 */
export function getDayName(dayNum: number, short = false): string {
	const names = short ? DAY_NAMES_SHORT : DAY_NAMES;
	return names[dayNum] || '';
}

/**
 * Format time from HH:MM:SS to HH:MM
 * @param time - Time string (HH:MM:SS or HH:MM)
 */
export function formatTime(time: string): string {
	if (!time) return '';
	// Handle both HH:MM:SS and HH:MM formats
	const parts = time.split(':');
	return `${parts[0]}:${parts[1]}`;
}

/**
 * Format time for display (e.g., "08:00" → "8h00")
 * @param time - Time string (HH:MM:SS or HH:MM)
 */
export function formatTimeDisplay(time: string): string {
	const formatted = formatTime(time);
	if (!formatted) return '';
	const [hours, minutes] = formatted.split(':');
	return `${parseInt(hours)}h${minutes}`;
}

/**
 * Generate time slots for schedule grid (7:00 to 18:00)
 * @param startHour - Starting hour (default: 7)
 * @param endHour - Ending hour (default: 18)
 * @param intervalMinutes - Interval in minutes (default: 60)
 */
export function getTimeSlots(
	startHour = 7,
	endHour = 18,
	intervalMinutes = 60
): { time: string; display: string }[] {
	const slots: { time: string; display: string }[] = [];

	for (let hour = startHour; hour <= endHour; hour++) {
		for (let minute = 0; minute < 60; minute += intervalMinutes) {
			if (hour === endHour && minute > 0) break; // Don't go past end hour

			const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
			const displayStr = `${hour}h${minute.toString().padStart(2, '0')}`;

			slots.push({
				time: timeStr,
				display: displayStr
			});
		}
	}

	return slots;
}

/**
 * Find schedule entry at a specific day and time slot
 * @param schedules - Array of schedule entries
 * @param day - Day of week (0-4)
 * @param slotTime - Time slot start time (HH:MM:SS)
 */
export function findScheduleAtSlot(
	schedules: ClassSchedule[],
	day: number,
	slotTime: string
): ClassSchedule | undefined {
	return schedules.find((schedule) => {
		if (schedule.day_of_week !== day) return false;

		// Check if slotTime falls within this schedule's time range
		const slotHour = parseInt(slotTime.split(':')[0]);
		const slotMinute = parseInt(slotTime.split(':')[1]);
		const slotTotalMinutes = slotHour * 60 + slotMinute;

		const startParts = schedule.start_time.split(':');
		const startTotalMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);

		const endParts = schedule.end_time.split(':');
		const endTotalMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

		return slotTotalMinutes >= startTotalMinutes && slotTotalMinutes < endTotalMinutes;
	});
}

/**
 * Calculate how many time slots a schedule entry spans
 * @param schedule - Schedule entry
 * @param intervalMinutes - Time slot interval in minutes (default: 60)
 */
export function calculateSlotSpan(schedule: ClassSchedule, intervalMinutes = 60): number {
	const startParts = schedule.start_time.split(':');
	const startTotalMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);

	const endParts = schedule.end_time.split(':');
	const endTotalMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

	const durationMinutes = endTotalMinutes - startTotalMinutes;
	return Math.ceil(durationMinutes / intervalMinutes);
}

/**
 * Check if a schedule entry is at the start of its time slot
 * (Used to determine if we should render the entry or if it's a continuation)
 * @param schedule - Schedule entry
 * @param slotTime - Time slot start time (HH:MM:SS)
 */
export function isScheduleStart(schedule: ClassSchedule, slotTime: string): boolean {
	const slotHour = parseInt(slotTime.split(':')[0]);
	const slotMinute = parseInt(slotTime.split(':')[1]);
	const slotTotalMinutes = slotHour * 60 + slotMinute;

	const startParts = schedule.start_time.split(':');
	const startTotalMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);

	return slotTotalMinutes === startTotalMinutes;
}

/**
 * Parse time string to minutes since midnight
 * @param time - Time string (HH:MM:SS or HH:MM)
 */
export function timeToMinutes(time: string): number {
	const parts = time.split(':');
	return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

/**
 * Convert minutes since midnight to time string
 * @param minutes - Minutes since midnight
 */
export function minutesToTime(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

/**
 * Validate that end time is after start time
 * @param startTime - Start time string
 * @param endTime - End time string
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
	return timeToMinutes(endTime) > timeToMinutes(startTime);
}

/**
 * Get default start time for a new schedule entry
 */
export function getDefaultStartTime(): string {
	return '08:00:00';
}

/**
 * Get default end time for a new schedule entry (1 hour after start)
 */
export function getDefaultEndTime(startTime?: string): string {
	if (!startTime) return '09:00:00';
	const startMinutes = timeToMinutes(startTime);
	return minutesToTime(startMinutes + 60);
}

/**
 * Format schedule entry for display
 * @param schedule - Schedule entry
 */
export function formatScheduleDisplay(schedule: ClassSchedule): string {
	const parts: string[] = [];

	if (schedule.subject) {
		parts.push(schedule.subject);
	}

	if (schedule.room) {
		parts.push(`Salle ${schedule.room}`);
	}

	if (parts.length === 0) {
		parts.push(`${formatTimeDisplay(schedule.start_time)} - ${formatTimeDisplay(schedule.end_time)}`);
	}

	return parts.join(' • ');
}
