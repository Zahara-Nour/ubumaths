/**
 * Formatting utilities for display purposes
 */

/**
 * Format time in seconds as a human-readable duration
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "2m 35s" or "1h 05m 30s")
 */
export function formatDuration(seconds: number): string {
	if (seconds >= 3600) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
	}
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}m ${s.toString().padStart(2, '0')}s`;
}

/**
 * Format a number with proper French decimal separator
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 2): string {
	return value.toFixed(decimals).replace('.', ',');
}
