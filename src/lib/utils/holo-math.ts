// Holographic Card Math Utilities
// ================================
// Helper functions for holographic card effects

/**
 * Round a value to a specified precision
 * @param value - The value to round
 * @param precision - Number of decimal places (default: 3)
 * @returns Rounded value
 */
export function round(value: number, precision: number = 3): number {
	return parseFloat(value.toFixed(precision));
}

/**
 * Clamp a value between min and max
 * @param value - The value to clamp
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 100)
 * @returns Clamped value
 */
export function clamp(value: number, min: number = 0, max: number = 100): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Re-map a value from one range to another
 * Example: adjust(10, 0, 100, 100, 0) = 90
 * @param value - The value to re-map
 * @param fromMin - Source range minimum
 * @param fromMax - Source range maximum
 * @param toMin - Target range minimum
 * @param toMax - Target range maximum
 * @returns Re-mapped value
 */
export function adjust(
	value: number,
	fromMin: number,
	fromMax: number,
	toMin: number,
	toMax: number
): number {
	return round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));
}
