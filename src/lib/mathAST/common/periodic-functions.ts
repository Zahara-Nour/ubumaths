/**
 * Periodic Function Utilities
 *
 * Shared utilities for handling periodic trigonometric functions
 * that have discontinuities at regular intervals.
 *
 * Used by both the limits and continuity modules.
 *
 * @module mathAST/common/periodic-functions
 */

import type { MathNode } from '../types';
import { divide, number, piConstant } from '../factory';

// =============================================================================
// Types
// =============================================================================

/**
 * Information about a periodic function's discontinuity pattern.
 */
export interface PeriodicFunctionInfo {
	/** Function name (lowercase) */
	readonly name: string;

	/** Base point of the first discontinuity (e.g., π/2 for tan) */
	readonly basePoint: number;

	/** Period between consecutive discontinuities (e.g., π for tan) */
	readonly period: number;

	/** Type of discontinuity at these points */
	readonly discontinuityType: 'infinite';

	/** French description of the discontinuity pattern */
	readonly descriptionFr: string;

	/** Related function with same discontinuity pattern (e.g., sec for tan) */
	readonly relatedFunction?: string;
}

/**
 * Symbolic representation of a periodic discontinuity pattern.
 */
export interface PeriodicPattern {
	/** Base point as a MathNode (e.g., π/2) */
	readonly basePoint: MathNode;

	/** Period as a MathNode (e.g., π) */
	readonly period: MathNode;

	/** French description */
	readonly description: string;
}

// =============================================================================
// Periodic Function Database
// =============================================================================

/**
 * Database of periodic trigonometric functions with discontinuities.
 *
 * Each entry describes where the function has vertical asymptotes
 * (infinite discontinuities) and the period between them.
 */
export const PERIODIC_FUNCTIONS: readonly PeriodicFunctionInfo[] = [
	{
		name: 'tan',
		basePoint: Math.PI / 2,
		period: Math.PI,
		discontinuityType: 'infinite',
		descriptionFr: 'La fonction tangente présente des discontinuités en π/2 + k·π pour tout k ∈ ℤ',
		relatedFunction: 'sec'
	},
	{
		name: 'sec',
		basePoint: Math.PI / 2,
		period: Math.PI,
		discontinuityType: 'infinite',
		descriptionFr: 'La fonction sécante présente des discontinuités en π/2 + k·π pour tout k ∈ ℤ',
		relatedFunction: 'tan'
	},
	{
		name: 'cot',
		basePoint: 0,
		period: Math.PI,
		discontinuityType: 'infinite',
		descriptionFr: 'La fonction cotangente présente des discontinuités en k·π pour tout k ∈ ℤ',
		relatedFunction: 'csc'
	},
	{
		name: 'csc',
		basePoint: 0,
		period: Math.PI,
		discontinuityType: 'infinite',
		descriptionFr: 'La fonction cosécante présente des discontinuités en k·π pour tout k ∈ ℤ',
		relatedFunction: 'cot'
	}
] as const;

/**
 * Map for quick lookup by function name.
 */
const PERIODIC_FUNCTION_MAP = new Map<string, PeriodicFunctionInfo>(
	PERIODIC_FUNCTIONS.map((info) => [info.name, info])
);

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Check if a function name corresponds to a periodic function with discontinuities.
 */
export function isPeriodicTrigFunction(name: string): boolean {
	return PERIODIC_FUNCTION_MAP.has(name.toLowerCase());
}

/**
 * Get information about a periodic function's discontinuities.
 * Returns null if the function is not a known periodic function.
 */
export function getPeriodicFunctionInfo(name: string): PeriodicFunctionInfo | null {
	return PERIODIC_FUNCTION_MAP.get(name.toLowerCase()) ?? null;
}

/**
 * Get all periodic function names.
 */
export function getPeriodicFunctionNames(): readonly string[] {
	return PERIODIC_FUNCTIONS.map((f) => f.name);
}

// =============================================================================
// Symbolic Representation
// =============================================================================

/**
 * Create a symbolic MathNode for π/2.
 */
export function piOverTwo(): MathNode {
	return divide(piConstant(), number('2'), 'inline');
}

/**
 * Create a symbolic MathNode for π.
 */
export function pi(): MathNode {
	return piConstant();
}

/**
 * Get the symbolic periodic pattern for a function.
 * Returns base point and period as MathNodes for pedagogical display.
 */
export function getPeriodicPattern(name: string): PeriodicPattern | null {
	const info = getPeriodicFunctionInfo(name);
	if (!info) return null;

	// Create symbolic representations
	let basePoint: MathNode;
	if (Math.abs(info.basePoint - Math.PI / 2) < 0.01) {
		basePoint = piOverTwo();
	} else if (Math.abs(info.basePoint) < 0.01) {
		basePoint = number('0');
	} else {
		basePoint = number(formatNumber(info.basePoint));
	}

	const period = pi();

	return {
		basePoint,
		period,
		description: info.descriptionFr
	};
}

// =============================================================================
// Enumeration Functions
// =============================================================================

/**
 * Options for enumerating periodic discontinuity points.
 */
export interface EnumerationOptions {
	/** Minimum value of the interval */
	readonly min: number;
	/** Maximum value of the interval */
	readonly max: number;
	/** Maximum number of points to return */
	readonly maxPoints?: number;
}

/**
 * A single enumerated discontinuity point.
 */
export interface EnumeratedPoint {
	/** Numeric value of the point */
	readonly value: number;
	/** The integer k in basePoint + k*period */
	readonly k: number;
}

/**
 * Enumerate all discontinuity points of a periodic function within an interval.
 *
 * @param name - Function name (tan, cot, sec, csc)
 * @param options - Enumeration options (interval bounds, max points)
 * @returns Array of points within the interval
 */
export function enumerateDiscontinuityPoints(
	name: string,
	options: EnumerationOptions
): EnumeratedPoint[] {
	const info = getPeriodicFunctionInfo(name);
	if (!info) return [];

	const { min, max, maxPoints = 20 } = options;
	const { basePoint, period } = info;

	const points: EnumeratedPoint[] = [];

	// Find starting k
	let k = Math.ceil((min - basePoint) / period);

	while (points.length < maxPoints) {
		const value = basePoint + k * period;
		if (value > max) break;

		if (value >= min) {
			points.push({ value, k });
		}

		k++;
	}

	return points;
}

/**
 * Check if a numeric value is a discontinuity point of a periodic function.
 *
 * @param name - Function name
 * @param value - Value to check
 * @param tolerance - Tolerance for floating point comparison (default: 1e-10)
 * @returns True if value is a discontinuity point
 */
export function isDiscontinuityPoint(name: string, value: number, tolerance = 1e-10): boolean {
	const info = getPeriodicFunctionInfo(name);
	if (!info) return false;

	const { basePoint, period } = info;

	// Check if (value - basePoint) is a multiple of period
	const k = (value - basePoint) / period;
	const kRounded = Math.round(k);

	return Math.abs(k - kRounded) < tolerance;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format a number nicely for display.
 */
function formatNumber(value: number): string {
	if (Math.abs(value - Math.round(value)) < 1e-10) {
		return String(Math.round(value));
	}
	return value.toPrecision(10).replace(/\.?0+$/, '');
}
