/**
 * Utility functions for Google API data processing
 */

import type { GoogleMaterial } from '$lib/types/google';
import type { MaterialType } from '$lib/types/google';

/**
 * Parse Google date format to JavaScript Date
 * Google uses { year, month, day } format
 *
 * @param googleDate - Google date object
 * @returns JavaScript Date object or null if invalid
 *
 * @example
 * parseGoogleDate({ year: 2024, month: 12, day: 25 })
 * // Returns: Date object for December 25, 2024
 */
export function parseGoogleDate(googleDate?: {
	year: number;
	month: number;
	day: number;
}): Date | null {
	if (!googleDate) return null;

	try {
		// Google months are 1-indexed (1-12), JS Date months are 0-indexed (0-11)
		const date = new Date(googleDate.year, googleDate.month - 1, googleDate.day);

		// Validate the date is valid
		if (isNaN(date.getTime())) {
			return null;
		}

		return date;
	} catch {
		return null;
	}
}

/**
 * Parse Google time format to time object
 * Google uses { hours, minutes, seconds?, nanos? } format
 *
 * @param googleTime - Google time object
 * @returns Time object with hours and minutes, or null if invalid
 *
 * @example
 * parseGoogleTime({ hours: 14, minutes: 30 })
 * // Returns: { hours: 14, minutes: 30 }
 */
export function parseGoogleTime(googleTime?: {
	hours: number;
	minutes: number;
	seconds?: number;
	nanos?: number;
}): { hours: number; minutes: number } | null {
	if (!googleTime) return null;

	// Validate hours and minutes are in valid ranges
	if (
		googleTime.hours < 0 ||
		googleTime.hours > 23 ||
		googleTime.minutes < 0 ||
		googleTime.minutes > 59
	) {
		return null;
	}

	return {
		hours: googleTime.hours,
		minutes: googleTime.minutes
	};
}

/**
 * Combine Google date and time into ISO 8601 timestamp
 * Useful for storing due dates with times in the database
 *
 * @param googleDate - Google date object
 * @param googleTime - Google time object (optional)
 * @returns ISO 8601 timestamp string or null if invalid
 *
 * @example
 * parseGoogleDateTime(
 *   { year: 2024, month: 12, day: 25 },
 *   { hours: 14, minutes: 30 }
 * )
 * // Returns: "2024-12-25T14:30:00.000Z"
 */
export function parseGoogleDateTime(
	googleDate?: { year: number; month: number; day: number },
	googleTime?: { hours: number; minutes: number; seconds?: number; nanos?: number }
): string | null {
	const date = parseGoogleDate(googleDate);
	if (!date) return null;

	if (googleTime) {
		const time = parseGoogleTime(googleTime);
		if (time) {
			date.setHours(time.hours, time.minutes, 0, 0);
		}
	} else {
		// If no time specified, set to end of day (23:59:59)
		date.setHours(23, 59, 59, 999);
	}

	return date.toISOString();
}

/**
 * Extract material type from Google Material object
 * Materials can be: Drive files, YouTube videos, links, or forms
 *
 * @param material - Google material object
 * @returns Material type or null if unknown
 *
 * @example
 * extractMaterialType({ driveFile: { id: '123', title: 'Doc' } })
 * // Returns: 'DRIVE_FILE'
 */
export function extractMaterialType(material: GoogleMaterial): MaterialType | null {
	if (material.driveFile) return 'DRIVE_FILE';
	if (material.youtubeVideo) return 'YOUTUBE_VIDEO';
	if (material.link) return 'LINK';
	if (material.form) return 'FORM';
	return null;
}

/**
 * Extract structured material data from Google Material object
 * Normalizes different material types into a consistent format
 *
 * @param material - Google material object
 * @returns Structured material data with type, ID, title, and URLs
 *
 * @example
 * extractMaterialData({
 *   driveFile: {
 *     id: 'abc123',
 *     title: 'Assignment.pdf',
 *     alternateLink: 'https://drive.google.com/...',
 *     thumbnailUrl: 'https://...'
 *   }
 * })
 * // Returns: {
 * //   type: 'DRIVE_FILE',
 * //   fileId: 'abc123',
 * //   fileName: 'Assignment.pdf',
 * //   url: 'https://drive.google.com/...',
 * //   thumbnailUrl: 'https://...'
 * // }
 */
export function extractMaterialData(material: GoogleMaterial): {
	type: MaterialType;
	fileId?: string;
	fileName: string;
	mimeType?: string;
	url: string;
	thumbnailUrl?: string;
	title?: string;
} {
	// Drive file
	if (material.driveFile) {
		return {
			type: 'DRIVE_FILE',
			fileId: material.driveFile.id,
			fileName: material.driveFile.title,
			url: material.driveFile.alternateLink,
			thumbnailUrl: material.driveFile.thumbnailUrl,
			title: material.driveFile.title
		};
	}

	// YouTube video
	if (material.youtubeVideo) {
		return {
			type: 'YOUTUBE_VIDEO',
			fileId: material.youtubeVideo.id,
			fileName: material.youtubeVideo.title,
			mimeType: 'video/youtube',
			url: material.youtubeVideo.alternateLink,
			thumbnailUrl: material.youtubeVideo.thumbnailUrl,
			title: material.youtubeVideo.title
		};
	}

	// External link
	if (material.link) {
		return {
			type: 'LINK',
			fileName: material.link.title || material.link.url,
			url: material.link.url,
			thumbnailUrl: material.link.thumbnailUrl,
			title: material.link.title
		};
	}

	// Google Form
	if (material.form) {
		return {
			type: 'FORM',
			fileName: material.form.title,
			mimeType: 'application/vnd.google-apps.form',
			url: material.form.formUrl,
			thumbnailUrl: material.form.thumbnailUrl,
			title: material.form.title
		};
	}

	// Fallback (should never happen if material is valid)
	throw new Error('Invalid material: no recognized material type found');
}

/**
 * Sleep utility for retry delays
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * Used for retrying failed API requests
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds (default: 2000)
 * @returns Delay in milliseconds
 *
 * @example
 * calculateBackoff(0) // Returns: 2000 (2s)
 * calculateBackoff(1) // Returns: 4000 (4s)
 * calculateBackoff(2) // Returns: 8000 (8s)
 */
export function calculateBackoff(attempt: number, baseDelay = 2000): number {
	return baseDelay * Math.pow(2, attempt);
}
