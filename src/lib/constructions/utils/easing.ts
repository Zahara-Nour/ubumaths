/**
 * Easing Functions for Construction Animations
 *
 * This module provides easing functions for smooth animation transitions.
 * All functions take a progress value (0-1) and return the eased value (0-1).
 *
 * @module constructions/utils/easing
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Easing function signature
 *
 * Takes a progress value between 0 and 1, returns the eased value between 0 and 1.
 */
export type EasingFunction = (t: number) => number;

/**
 * Available easing function names
 */
export type EasingName =
	| 'linear'
	| 'easeIn'
	| 'easeOut'
	| 'easeInOut'
	| 'easeInQuad'
	| 'easeOutQuad'
	| 'easeInOutQuad'
	| 'easeInCubic'
	| 'easeOutCubic'
	| 'easeInOutCubic';

// =============================================================================
// Linear Easing
// =============================================================================

/**
 * Linear easing - no acceleration
 *
 * @param t - Progress value (0-1)
 * @returns Unchanged progress value
 */
export function linear(t: number): number {
	return t;
}

// =============================================================================
// Quadratic Easing
// =============================================================================

/**
 * Quadratic ease-in - accelerating from zero velocity
 *
 * @param t - Progress value (0-1)
 * @returns Eased progress value
 */
export function easeInQuad(t: number): number {
	return t * t;
}

/**
 * Quadratic ease-out - decelerating to zero velocity
 *
 * @param t - Progress value (0-1)
 * @returns Eased progress value
 */
export function easeOutQuad(t: number): number {
	return t * (2 - t);
}

/**
 * Quadratic ease-in-out - accelerating until halfway, then decelerating
 *
 * @param t - Progress value (0-1)
 * @returns Eased progress value
 */
export function easeInOutQuad(t: number): number {
	return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// =============================================================================
// Cubic Easing
// =============================================================================

/**
 * Cubic ease-in - accelerating from zero velocity
 *
 * @param t - Progress value (0-1)
 * @returns Eased progress value
 */
export function easeInCubic(t: number): number {
	return t * t * t;
}

/**
 * Cubic ease-out - decelerating to zero velocity
 *
 * @param t - Progress value (0-1)
 * @returns Eased progress value
 */
export function easeOutCubic(t: number): number {
	const t1 = t - 1;
	return t1 * t1 * t1 + 1;
}

/**
 * Cubic ease-in-out - accelerating until halfway, then decelerating
 *
 * @param t - Progress value (0-1)
 * @returns Eased progress value
 */
export function easeInOutCubic(t: number): number {
	if (t < 0.5) {
		return 4 * t * t * t;
	}
	const t1 = 2 * t - 2;
	return 0.5 * t1 * t1 * t1 + 1;
}

// =============================================================================
// Convenience Aliases (Cubic by default for smooth animations)
// =============================================================================

/**
 * Standard ease-in (cubic)
 * Alias for easeInCubic for cleaner API
 */
export const easeIn: EasingFunction = easeInCubic;

/**
 * Standard ease-out (cubic)
 * Alias for easeOutCubic for cleaner API
 */
export const easeOut: EasingFunction = easeOutCubic;

/**
 * Standard ease-in-out (cubic)
 * Alias for easeInOutCubic for cleaner API
 */
export const easeInOut: EasingFunction = easeInOutCubic;

// =============================================================================
// Easing Function Registry
// =============================================================================

/**
 * Map of easing function names to their implementations
 */
const easingFunctions: Record<EasingName, EasingFunction> = {
	linear,
	easeIn,
	easeOut,
	easeInOut,
	easeInQuad,
	easeOutQuad,
	easeInOutQuad,
	easeInCubic,
	easeOutCubic,
	easeInOutCubic
};

/**
 * Get an easing function by name
 *
 * @param name - Name of the easing function
 * @returns The easing function, or linear if not found
 *
 * @example
 * ```typescript
 * const ease = getEasing('easeInOut');
 * const easedValue = ease(0.5); // Returns ~0.5 with smooth acceleration
 * ```
 */
export function getEasing(name: string | undefined): EasingFunction {
	if (!name) {
		return easeInOut; // Default easing
	}

	const fn = easingFunctions[name as EasingName];
	return fn ?? easeInOut;
}

/**
 * Check if a string is a valid easing name
 *
 * @param name - String to check
 * @returns True if the string is a valid easing name
 */
export function isValidEasingName(name: string): name is EasingName {
	return name in easingFunctions;
}

/**
 * Get all available easing function names
 *
 * @returns Array of available easing names
 */
export function getAvailableEasings(): readonly EasingName[] {
	return Object.keys(easingFunctions) as EasingName[];
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Clamp a progress value to the 0-1 range
 *
 * @param t - Progress value (may be outside 0-1)
 * @returns Clamped value between 0 and 1
 */
export function clampProgress(t: number): number {
	return Math.max(0, Math.min(1, t));
}

/**
 * Apply easing with clamping
 *
 * Ensures the progress value is clamped before applying the easing function.
 *
 * @param t - Progress value
 * @param easingName - Name of the easing function to apply
 * @returns Eased and clamped progress value
 */
export function applyEasing(t: number, easingName?: string): number {
	const clamped = clampProgress(t);
	const easeFn = getEasing(easingName);
	return easeFn(clamped);
}

/**
 * Interpolate between two values using easing
 *
 * @param start - Start value
 * @param end - End value
 * @param t - Progress value (0-1)
 * @param easingName - Optional easing function name
 * @returns Interpolated value
 *
 * @example
 * ```typescript
 * // Animate from 0 to 100 with easing
 * const value = interpolate(0, 100, 0.5, 'easeInOut');
 * // Returns ~50 with smooth transition
 * ```
 */
export function interpolate(start: number, end: number, t: number, easingName?: string): number {
	const easedT = applyEasing(t, easingName);
	return start + (end - start) * easedT;
}

/**
 * Interpolate between two 2D points using easing
 *
 * @param start - Start position { x, y }
 * @param end - End position { x, y }
 * @param t - Progress value (0-1)
 * @param easingName - Optional easing function name
 * @returns Interpolated position { x, y }
 */
export function interpolatePoint(
	start: { x: number; y: number },
	end: { x: number; y: number },
	t: number,
	easingName?: string
): { x: number; y: number } {
	const easedT = applyEasing(t, easingName);
	return {
		x: start.x + (end.x - start.x) * easedT,
		y: start.y + (end.y - start.y) * easedT
	};
}

/**
 * Interpolate an angle in degrees using easing
 *
 * Handles the wrap-around at 360 degrees to ensure shortest path rotation.
 *
 * @param startAngle - Start angle in degrees
 * @param endAngle - End angle in degrees
 * @param t - Progress value (0-1)
 * @param easingName - Optional easing function name
 * @returns Interpolated angle in degrees
 */
export function interpolateAngle(
	startAngle: number,
	endAngle: number,
	t: number,
	easingName?: string
): number {
	const easedT = applyEasing(t, easingName);

	// Normalize angles to 0-360 range
	const start = ((startAngle % 360) + 360) % 360;
	const end = ((endAngle % 360) + 360) % 360;

	// Find the shortest rotation direction
	let delta = end - start;
	if (delta > 180) {
		delta -= 360;
	} else if (delta < -180) {
		delta += 360;
	}

	return start + delta * easedT;
}
