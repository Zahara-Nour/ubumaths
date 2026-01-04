/**
 * Week configuration type - defines school days and weekend
 */
export interface WeekConfig {
	first_day: number; // 0-6 (0 = Sunday)
	last_day: number; // 0-6
	school_days: number[]; // Array of day numbers (0-6)
	weekend_days: number[]; // Array of day numbers (0-6)
}

/**
 * Default week configuration for Israeli schools
 * - Sunday (0) to Thursday (4): School days
 * - Friday (5) and Saturday (6): Weekend days
 *
 * Day numbering follows JavaScript Date.getDay():
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 * 4 = Thursday, 5 = Friday, 6 = Saturday
 */
export const DEFAULT_WEEK_CONFIG: WeekConfig = {
	first_day: 0, // Sunday
	last_day: 6, // Saturday
	school_days: [0, 1, 2, 3, 4], // Sunday-Thursday
	weekend_days: [5, 6] // Friday-Saturday
};

/**
 * Gets the last day of the week from the week configuration
 *
 * @param config - Week configuration object
 * @returns The last day of the week (0-6, where 0=Sunday, 6=Saturday)
 *
 * @example
 * ```typescript
 * const config = DEFAULT_WEEK_CONFIG;
 * getLastDayOfWeek(config); // Returns 6 (Saturday)
 * ```
 */
export function getLastDayOfWeek(config: WeekConfig): number {
	return config.last_day;
}

/**
 * Checks if a given day of the week is a school day
 *
 * Day numbering follows JavaScript Date.getDay():
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 * 4 = Thursday, 5 = Friday, 6 = Saturday
 *
 * @param dayOfWeek - Day of the week (0-6)
 * @param config - Week configuration object
 * @returns true if the day is a school day, false otherwise
 *
 * @example
 * ```typescript
 * const config = DEFAULT_WEEK_CONFIG;
 * isSchoolDay(0, config); // Returns true (Sunday is a school day in Israel)
 * isSchoolDay(5, config); // Returns false (Friday is weekend in Israel)
 * ```
 */
export function isSchoolDay(dayOfWeek: number, config: WeekConfig): boolean {
	return config.school_days.includes(dayOfWeek);
}

/**
 * Gets the array of school days from the week configuration
 *
 * Day numbering follows JavaScript Date.getDay():
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 * 4 = Thursday, 5 = Friday, 6 = Saturday
 *
 * @param config - Week configuration object
 * @returns Array of school day numbers (0-6)
 *
 * @example
 * ```typescript
 * const config = DEFAULT_WEEK_CONFIG;
 * getSchoolDays(config); // Returns [0, 1, 2, 3, 4] (Sunday-Thursday)
 * ```
 */
export function getSchoolDays(config: WeekConfig): number[] {
	return config.school_days;
}

/**
 * Gets the array of weekend days from the week configuration
 *
 * Day numbering follows JavaScript Date.getDay():
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 * 4 = Thursday, 5 = Friday, 6 = Saturday
 *
 * @param config - Week configuration object
 * @returns Array of weekend day numbers (0-6)
 *
 * @example
 * ```typescript
 * const config = DEFAULT_WEEK_CONFIG;
 * getWeekendDays(config); // Returns [5, 6] (Friday-Saturday)
 * ```
 */
export function getWeekendDays(config: WeekConfig): number[] {
	return config.weekend_days;
}

/**
 * Type guard to validate if an unknown value is a valid WeekConfig
 *
 * Validates:
 * - All required properties exist (first_day, last_day, school_days, weekend_days)
 * - first_day and last_day are numbers between 0-6
 * - school_days and weekend_days are arrays of numbers between 0-6
 * - school_days and weekend_days don't overlap
 * - All 7 days are accounted for between school_days and weekend_days
 *
 * @param config - Value to validate
 * @returns true if config is a valid WeekConfig, false otherwise
 *
 * @example
 * ```typescript
 * const data = JSON.parse(jsonString);
 * if (isValidWeekConfig(data)) {
 *   // TypeScript now knows data is WeekConfig
 *   console.log(data.school_days);
 * }
 * ```
 */
export function isValidWeekConfig(config: unknown): config is WeekConfig {
	if (!config || typeof config !== 'object') {
		return false;
	}

	const c = config as Record<string, unknown>;

	// Check required properties exist
	if (
		typeof c.first_day !== 'number' ||
		typeof c.last_day !== 'number' ||
		!Array.isArray(c.school_days) ||
		!Array.isArray(c.weekend_days)
	) {
		return false;
	}

	// Check first_day and last_day are valid (0-6)
	if (c.first_day < 0 || c.first_day > 6 || c.last_day < 0 || c.last_day > 6) {
		return false;
	}

	// Check school_days are valid numbers (0-6) and no duplicates
	if (!c.school_days.every((day) => typeof day === 'number' && day >= 0 && day <= 6)) {
		return false;
	}
	const schoolDaysSet = new Set(c.school_days);
	if (schoolDaysSet.size !== c.school_days.length) {
		return false; // Duplicates found in school_days
	}

	// Check weekend_days are valid numbers (0-6) and no duplicates
	if (!c.weekend_days.every((day) => typeof day === 'number' && day >= 0 && day <= 6)) {
		return false;
	}
	const weekendDaysSet = new Set(c.weekend_days);
	if (weekendDaysSet.size !== c.weekend_days.length) {
		return false; // Duplicates found in weekend_days
	}

	// Check for overlap between school_days and weekend_days
	const intersection = [...schoolDaysSet].filter((day) => weekendDaysSet.has(day));
	if (intersection.length > 0) {
		return false;
	}

	// Check that all 7 days are accounted for
	const allDays = new Set([...c.school_days, ...c.weekend_days]);
	if (allDays.size !== 7) {
		return false;
	}

	return true;
}
