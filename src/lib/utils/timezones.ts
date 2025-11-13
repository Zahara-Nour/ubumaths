/**
 * Timezone utilities for UbuMaths
 * Provides IANA timezone lists and helpers for timezone selection UI
 */

export const DEFAULT_TIMEZONE = 'Europe/Paris';

/**
 * Grouped IANA timezones by region
 * Common timezones are listed at the top of each region
 */
export const TIMEZONE_GROUPS = {
	Common: [
		'Europe/Paris',
		'America/New_York',
		'America/Los_Angeles',
		'Asia/Tokyo',
		'Europe/London',
		'Australia/Sydney'
	],
	Africa: [
		'Africa/Cairo',
		'Africa/Johannesburg',
		'Africa/Lagos',
		'Africa/Nairobi',
		'Africa/Casablanca',
		'Africa/Algiers',
		'Africa/Tunis'
	],
	America: [
		'America/New_York',
		'America/Los_Angeles',
		'America/Chicago',
		'America/Denver',
		'America/Toronto',
		'America/Vancouver',
		'America/Mexico_City',
		'America/Sao_Paulo',
		'America/Buenos_Aires',
		'America/Santiago',
		'America/Bogota',
		'America/Lima',
		'America/Caracas',
		'America/Phoenix',
		'America/Anchorage',
		'America/Honolulu'
	],
	Asia: [
		'Asia/Tokyo',
		'Asia/Shanghai',
		'Asia/Hong_Kong',
		'Asia/Singapore',
		'Asia/Seoul',
		'Asia/Bangkok',
		'Asia/Dubai',
		'Asia/Kolkata',
		'Asia/Jakarta',
		'Asia/Manila',
		'Asia/Taipei',
		'Asia/Jerusalem',
		'Asia/Riyadh',
		'Asia/Karachi',
		'Asia/Dhaka',
		'Asia/Tehran',
		'Asia/Baghdad',
		'Asia/Kabul',
		'Asia/Kathmandu',
		'Asia/Yangon'
	],
	Australia: [
		'Australia/Sydney',
		'Australia/Melbourne',
		'Australia/Brisbane',
		'Australia/Perth',
		'Australia/Adelaide',
		'Australia/Darwin',
		'Australia/Hobart'
	],
	Europe: [
		'Europe/Paris',
		'Europe/London',
		'Europe/Berlin',
		'Europe/Madrid',
		'Europe/Rome',
		'Europe/Amsterdam',
		'Europe/Brussels',
		'Europe/Vienna',
		'Europe/Stockholm',
		'Europe/Copenhagen',
		'Europe/Oslo',
		'Europe/Helsinki',
		'Europe/Dublin',
		'Europe/Lisbon',
		'Europe/Warsaw',
		'Europe/Prague',
		'Europe/Budapest',
		'Europe/Athens',
		'Europe/Bucharest',
		'Europe/Sofia',
		'Europe/Moscow',
		'Europe/Istanbul',
		'Europe/Kiev',
		'Europe/Zurich'
	],
	Pacific: [
		'Pacific/Auckland',
		'Pacific/Fiji',
		'Pacific/Guam',
		'Pacific/Honolulu',
		'Pacific/Tahiti',
		'Pacific/Tongatapu'
	]
} as const;

export type TimezoneRegion = keyof typeof TIMEZONE_GROUPS;

/**
 * Flattened list of all timezones for validation
 */
export const ALL_TIMEZONES = Object.values(TIMEZONE_GROUPS).flat();

/**
 * Get display label for a timezone
 * Converts "America/New_York" to "New York"
 */
export function getTimezoneLabel(timezone: string): string {
	const parts = timezone.split('/');
	if (parts.length === 2) {
		return parts[1].replace(/_/g, ' ');
	}
	return timezone;
}

/**
 * Get timezone offset at a given date
 * Returns formatted offset like "+01:00" or "-05:00"
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): string {
	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			timeZoneName: 'longOffset'
		});

		const parts = formatter.formatToParts(date);
		const offsetPart = parts.find((p) => p.type === 'timeZoneName');

		if (offsetPart?.value) {
			// Extract offset from "GMT+01:00" format
			const match = offsetPart.value.match(/GMT([+-]\d{2}:\d{2})/);
			if (match) {
				return match[1];
			}
		}

		return '';
	} catch {
		return '';
	}
}

/**
 * Get full display string for timezone
 * Example: "Paris (Europe/Paris, UTC+01:00)"
 */
export function getTimezoneDisplay(timezone: string): string {
	const label = getTimezoneLabel(timezone);
	const offset = getTimezoneOffset(timezone);
	return `${label} (${timezone}${offset ? `, UTC${offset}` : ''})`;
}

/**
 * Validate if a string is a valid IANA timezone
 */
export function isValidTimezone(timezone: string): timezone is (typeof ALL_TIMEZONES)[number] {
	return ALL_TIMEZONES.includes(timezone as (typeof ALL_TIMEZONES)[number]);
}

/**
 * Convert timezone groups to flat array of items for MySelect
 */
export function getTimezoneSelectItems(): { value: string; label: string }[] {
	const items: { value: string; label: string }[] = [];

	for (const [region, timezones] of Object.entries(TIMEZONE_GROUPS)) {
		for (const tz of timezones) {
			const label = getTimezoneLabel(tz);
			const offset = getTimezoneOffset(tz);
			items.push({
				value: tz,
				label: `${region === 'Common' ? '★ ' : ''}${label} (UTC${offset})`
			});
		}
	}

	return items;
}

/**
 * Search timezones by query string
 * Searches in timezone name, region, and offset
 */
export function searchTimezones(query: string): string[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return ALL_TIMEZONES.slice(0, 20); // Return first 20 if no query
	}

	return ALL_TIMEZONES.filter((tz) => {
		const label = getTimezoneLabel(tz).toLowerCase();
		const region = tz.split('/')[0].toLowerCase();
		const offset = getTimezoneOffset(tz);

		return (
			label.includes(lowerQuery) ||
			region.includes(lowerQuery) ||
			tz.toLowerCase().includes(lowerQuery) ||
			offset.includes(lowerQuery)
		);
	});
}
