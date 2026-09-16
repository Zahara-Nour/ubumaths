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
 * Semaine par défaut : la semaine scolaire française.
 *
 * C'est le REPLI, celui qu'on obtient quand une école n'a pas encore de
 * configuration. Il valait autrefois dimanche→jeudi, héritage de l'ancien
 * établissement : tout code qui retombait dessus tenait alors le vendredi pour
 * chômé — dans un lycée qui y fait cours. Un défaut se choisit donc pour
 * l'école qu'on a, pas pour celle qu'on a eue.
 *
 * `last_day: 0` (dimanche) ferme une semaine ouverte le lundi ; c'est aussi ce
 * dont dérive le jour des récompenses hebdomadaires (`isWeeklyRewardsDay`),
 * qui tombe donc le lundi.
 *
 * Numérotation JavaScript `Date.getDay()` : 0 = dimanche … 6 = samedi.
 */
export const DEFAULT_WEEK_CONFIG: WeekConfig = {
	first_day: 1, // lundi
	last_day: 0, // dimanche (la semaine se referme le week-end)
	school_days: [1, 2, 3, 4, 5], // lundi-vendredi
	weekend_days: [0, 6] // dimanche + samedi
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
 * getLastDayOfWeek(config); // Returns 0 (dimanche)
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
 * isSchoolDay(5, config); // Returns true (le vendredi est travaillé)
 * isSchoolDay(0, config); // Returns false (dimanche)
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
 * getSchoolDays(config); // Returns [1, 2, 3, 4, 5] (lundi-vendredi)
 * ```
 */
export function getSchoolDays(config: WeekConfig): number[] {
	return config.school_days;
}

/**
 * School days ordered as the week actually runs, starting at `first_day`.
 *
 * `school_days` is stored sorted by day number because that is how the
 * checkbox editor writes it, which is not the order a timetable is read in: a
 * week starting on Saturday runs 6, 0, 1, 2, 3. Any grid or day picker must use
 * this rather than the raw array — or than a hard-coded list.
 *
 * Falls back to the default configuration when there is none, or when it lists
 * no school day at all: a timetable with zero columns would be worse than a
 * wrong one.
 *
 * @param config - Week configuration, possibly absent
 * @returns School day numbers (0-6) in week order
 *
 * @example
 * ```typescript
 * getOrderedSchoolDays({ first_day: 6, school_days: [0, 1, 2, 3, 6], ... });
 * // Returns [6, 0, 1, 2, 3] — Saturday to Wednesday
 * ```
 */
export function getOrderedSchoolDays(config: WeekConfig | null | undefined): number[] {
	const effective =
		config && config.school_days && config.school_days.length > 0 ? config : DEFAULT_WEEK_CONFIG;

	const firstDay = effective.first_day ?? 0;

	return [...effective.school_days].sort(
		(a, b) => ((a - firstDay + 7) % 7) - ((b - firstDay + 7) % 7)
	);
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
 * getWeekendDays(config); // Returns [0, 6] (dimanche et samedi)
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
