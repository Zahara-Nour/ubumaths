/**
 * Builtin function domains registry.
 *
 * Maps function names to their domain restrictions.
 * Functions with universal domain (sin, cos, exp, etc.) are also included
 * for completeness but are not considered "restricted".
 */

import type { Domain } from './types';
import {
	positiveReals,
	nonNegativeReals,
	unitInterval,
	universalDomain,
	intervalDomain,
	greaterThanOrEqual,
	lessThanOrEqual,
	greaterThan,
	openInterval,
	closedInterval,
	fromNumber
} from './factory';

// =============================================================================
// Domain Definitions
// =============================================================================

interface BuiltinDomainEntry {
	/** The domain for this function's argument */
	domain: Domain;
	/** Human-readable constraint description (for restricted domains only) */
	constraint?: string;
}

/**
 * Registry of builtin function domains.
 * Key is the lowercase function name.
 */
export const BUILTIN_DOMAINS: Map<string, BuiltinDomainEntry> = new Map([
	// Restricted domains
	['sqrt', { domain: nonNegativeReals(), constraint: 'x >= 0' }],
	['ln', { domain: positiveReals(), constraint: 'x > 0' }],
	['log', { domain: positiveReals(), constraint: 'x > 0' }],
	['log10', { domain: positiveReals(), constraint: 'x > 0' }],
	['log2', { domain: positiveReals(), constraint: 'x > 0' }],

	// Inverse trig with [-1, 1] domain
	['asin', { domain: unitInterval(), constraint: '-1 <= x <= 1' }],
	['arcsin', { domain: unitInterval(), constraint: '-1 <= x <= 1' }],
	['acos', { domain: unitInterval(), constraint: '-1 <= x <= 1' }],
	['arccos', { domain: unitInterval(), constraint: '-1 <= x <= 1' }],

	// Inverse hyperbolic with restricted domains
	['acosh', { domain: intervalDomain([greaterThanOrEqual(fromNumber(1))]), constraint: 'x >= 1' }],
	[
		'arccosh',
		{ domain: intervalDomain([greaterThanOrEqual(fromNumber(1))]), constraint: 'x >= 1' }
	],

	// Universal domain functions
	['exp', { domain: universalDomain() }],
	['sin', { domain: universalDomain() }],
	['cos', { domain: universalDomain() }],
	['tan', { domain: universalDomain() }], // Note: has exclusions, but handled separately
	['atan', { domain: universalDomain() }],
	['arctan', { domain: universalDomain() }],
	['sinh', { domain: universalDomain() }],
	['cosh', { domain: universalDomain() }],
	['tanh', { domain: universalDomain() }],
	['asinh', { domain: universalDomain() }],
	['arcsinh', { domain: universalDomain() }],

	// atanh/arctanh: strictly between -1 and 1 (open interval ]-1, 1[)
	[
		'atanh',
		{
			domain: intervalDomain([openInterval(fromNumber(-1), fromNumber(1))]),
			constraint: '-1 < x < 1'
		}
	],
	[
		'arctanh',
		{
			domain: intervalDomain([openInterval(fromNumber(-1), fromNumber(1))]),
			constraint: '-1 < x < 1'
		}
	],

	// Reciprocal trig functions (periodic exclusions deferred to PeriodicExclusion type)
	['sec', { domain: universalDomain() }], // Note: actually ℝ \ {π/2 + kπ}
	['csc', { domain: universalDomain() }], // Note: actually ℝ \ {kπ}
	['cot', { domain: universalDomain() }], // Note: actually ℝ \ {kπ}

	// Inverse reciprocal trig: |x| >= 1 means ]-∞, -1] ∪ [1, +∞[
	[
		'asec',
		{
			domain: intervalDomain([lessThanOrEqual(fromNumber(-1)), greaterThanOrEqual(fromNumber(1))]),
			constraint: '|x| >= 1'
		}
	],
	[
		'arcsec',
		{
			domain: intervalDomain([lessThanOrEqual(fromNumber(-1)), greaterThanOrEqual(fromNumber(1))]),
			constraint: '|x| >= 1'
		}
	],
	[
		'acsc',
		{
			domain: intervalDomain([lessThanOrEqual(fromNumber(-1)), greaterThanOrEqual(fromNumber(1))]),
			constraint: '|x| >= 1'
		}
	],
	[
		'arccsc',
		{
			domain: intervalDomain([lessThanOrEqual(fromNumber(-1)), greaterThanOrEqual(fromNumber(1))]),
			constraint: '|x| >= 1'
		}
	],

	// Inverse cotangent has universal domain
	['acot', { domain: universalDomain() }],
	['arccot', { domain: universalDomain() }],

	// Absolute value and floor/ceiling
	['abs', { domain: universalDomain() }],
	['floor', { domain: universalDomain() }],
	['ceil', { domain: universalDomain() }],
	['round', { domain: universalDomain() }],
	['sign', { domain: universalDomain() }]
]);

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get the domain for a builtin function.
 *
 * @param name - Function name (case-insensitive)
 * @returns The domain, or undefined if function is unknown
 *
 * @example
 * getBuiltinDomain('sqrt') // → nonNegativeReals() [0, +∞[
 * getBuiltinDomain('ln')   // → positiveReals() ]0, +∞[
 * getBuiltinDomain('sin')  // → universalDomain()
 * getBuiltinDomain('foo')  // → undefined
 */
export function getBuiltinDomain(name: string): Domain | undefined {
	const entry = BUILTIN_DOMAINS.get(name.toLowerCase());
	return entry?.domain;
}

/**
 * Check if a builtin function has a restricted (non-universal) domain.
 *
 * @param name - Function name (case-insensitive)
 * @returns true if the function has restrictions, false otherwise
 *
 * @example
 * hasRestrictedDomain('sqrt') // → true (x >= 0)
 * hasRestrictedDomain('sin')  // → false (all reals)
 * hasRestrictedDomain('foo')  // → false (unknown)
 */
export function hasRestrictedDomain(name: string): boolean {
	const entry = BUILTIN_DOMAINS.get(name.toLowerCase());
	if (!entry) return false;
	return entry.domain.kind !== 'universal';
}

/**
 * Get the human-readable constraint description for a builtin function.
 *
 * @param name - Function name (case-insensitive)
 * @returns Constraint description like "x >= 0", or undefined if no restriction
 *
 * @example
 * getBuiltinConstraintDescription('sqrt') // → "x >= 0"
 * getBuiltinConstraintDescription('ln')   // → "x > 0"
 * getBuiltinConstraintDescription('sin')  // → undefined
 */
export function getBuiltinConstraintDescription(name: string): string | undefined {
	const entry = BUILTIN_DOMAINS.get(name.toLowerCase());
	return entry?.constraint;
}

/**
 * Get all builtin function names that have restricted domains.
 */
export function getRestrictedFunctions(): string[] {
	const result: string[] = [];
	for (const [name, entry] of BUILTIN_DOMAINS) {
		if (entry.domain.kind !== 'universal') {
			result.push(name);
		}
	}
	return result;
}

// =============================================================================
// Range (Output) Definitions
// =============================================================================

/**
 * Monotonicity type for functions.
 */
export type Monotonicity = 'increasing' | 'decreasing' | 'none';

/**
 * Monotonic interval - describes where a function is monotonic.
 */
export interface MonotonicInterval {
	/** Input interval start (null = -∞) */
	inputStart: number | null;
	/** Input interval end (null = +∞) */
	inputEnd: number | null;
	/** Monotonicity on this interval */
	monotonicity: 'increasing' | 'decreasing';
}

/**
 * Entry for a builtin function's output range.
 */
export interface BuiltinRangeEntry {
	/** Lower bound of output range (null = -∞) */
	lower: number | null;
	/** Whether lower bound is included */
	lowerInclusive: boolean;
	/** Upper bound of output range (null = +∞) */
	upper: number | null;
	/** Whether upper bound is included */
	upperInclusive: boolean;
	/** Global monotonicity if function is monotonic everywhere on its domain */
	monotonicity?: Monotonicity;
	/** Monotonic intervals for piecewise monotonic functions */
	monotonicIntervals?: MonotonicInterval[];
	/** Evaluator function for computing f(x) */
	evaluate?: (x: number) => number;
	/** Whether output is always an integer (floor, ceil, round, sign) */
	integerOutput?: boolean;
}

/**
 * Registry of builtin function output ranges.
 * Key is the lowercase function name.
 *
 * Used for:
 * - Computing the range/image of expressions
 * - Analyzing function compositions
 * - Monotonicity-based range restriction
 */
export const BUILTIN_RANGES: Map<string, BuiltinRangeEntry> = new Map([
	// ==========================================================================
	// Root and Exponential Functions
	// ==========================================================================
	[
		'sqrt',
		{
			lower: 0,
			lowerInclusive: true,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.sqrt
		}
	],
	[
		'exp',
		{
			lower: 0,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.exp
		}
	],

	// ==========================================================================
	// Logarithmic Functions
	// ==========================================================================
	[
		'ln',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.log
		}
	],
	[
		'log',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.log
		}
	],
	[
		'log10',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.log10
		}
	],
	[
		'log2',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.log2
		}
	],

	// ==========================================================================
	// Trigonometric Functions
	// ==========================================================================
	[
		'sin',
		{
			lower: -1,
			lowerInclusive: true,
			upper: 1,
			upperInclusive: true,
			monotonicity: 'none', // Periodic, not globally monotonic
			monotonicIntervals: [
				{ inputStart: -Math.PI / 2, inputEnd: Math.PI / 2, monotonicity: 'increasing' },
				{ inputStart: Math.PI / 2, inputEnd: (3 * Math.PI) / 2, monotonicity: 'decreasing' }
			],
			evaluate: Math.sin
		}
	],
	[
		'cos',
		{
			lower: -1,
			lowerInclusive: true,
			upper: 1,
			upperInclusive: true,
			monotonicity: 'none',
			monotonicIntervals: [
				{ inputStart: 0, inputEnd: Math.PI, monotonicity: 'decreasing' },
				{ inputStart: Math.PI, inputEnd: 2 * Math.PI, monotonicity: 'increasing' }
			],
			evaluate: Math.cos
		}
	],
	[
		'tan',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'none', // Increasing on each branch but discontinuous
			monotonicIntervals: [
				{ inputStart: -Math.PI / 2, inputEnd: Math.PI / 2, monotonicity: 'increasing' }
			],
			evaluate: Math.tan
		}
	],
	[
		'cot',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'none',
			monotonicIntervals: [{ inputStart: 0, inputEnd: Math.PI, monotonicity: 'decreasing' }],
			evaluate: (x: number) => 1 / Math.tan(x)
		}
	],
	[
		'sec',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'none',
			evaluate: (x: number) => 1 / Math.cos(x)
			// Range is actually ]-∞, -1] ∪ [1, +∞[, but we use unbounded for simplicity
		}
	],
	[
		'csc',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'none',
			evaluate: (x: number) => 1 / Math.sin(x)
			// Range is actually ]-∞, -1] ∪ [1, +∞[
		}
	],

	// ==========================================================================
	// Inverse Trigonometric Functions
	// ==========================================================================
	[
		'asin',
		{
			lower: -Math.PI / 2,
			lowerInclusive: true,
			upper: Math.PI / 2,
			upperInclusive: true,
			monotonicity: 'increasing',
			evaluate: Math.asin
		}
	],
	[
		'arcsin',
		{
			lower: -Math.PI / 2,
			lowerInclusive: true,
			upper: Math.PI / 2,
			upperInclusive: true,
			monotonicity: 'increasing',
			evaluate: Math.asin
		}
	],
	[
		'acos',
		{
			lower: 0,
			lowerInclusive: true,
			upper: Math.PI,
			upperInclusive: true,
			monotonicity: 'decreasing',
			evaluate: Math.acos
		}
	],
	[
		'arccos',
		{
			lower: 0,
			lowerInclusive: true,
			upper: Math.PI,
			upperInclusive: true,
			monotonicity: 'decreasing',
			evaluate: Math.acos
		}
	],
	[
		'atan',
		{
			lower: -Math.PI / 2,
			lowerInclusive: false,
			upper: Math.PI / 2,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.atan
		}
	],
	[
		'arctan',
		{
			lower: -Math.PI / 2,
			lowerInclusive: false,
			upper: Math.PI / 2,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.atan
		}
	],
	[
		'acot',
		{
			lower: 0,
			lowerInclusive: false,
			upper: Math.PI,
			upperInclusive: false,
			monotonicity: 'decreasing',
			evaluate: (x: number) => Math.atan(1 / x) + (x < 0 ? Math.PI : 0)
		}
	],
	[
		'arccot',
		{
			lower: 0,
			lowerInclusive: false,
			upper: Math.PI,
			upperInclusive: false,
			monotonicity: 'decreasing',
			evaluate: (x: number) => Math.atan(1 / x) + (x < 0 ? Math.PI : 0)
		}
	],
	[
		'asec',
		{
			lower: 0,
			lowerInclusive: true,
			upper: Math.PI,
			upperInclusive: true,
			monotonicity: 'none', // Different on [-∞,-1] and [1,+∞]
			evaluate: (x: number) => Math.acos(1 / x)
		}
	],
	[
		'arcsec',
		{
			lower: 0,
			lowerInclusive: true,
			upper: Math.PI,
			upperInclusive: true,
			monotonicity: 'none',
			evaluate: (x: number) => Math.acos(1 / x)
		}
	],
	[
		'acsc',
		{
			lower: -Math.PI / 2,
			lowerInclusive: true,
			upper: Math.PI / 2,
			upperInclusive: true,
			monotonicity: 'none',
			evaluate: (x: number) => Math.asin(1 / x)
		}
	],
	[
		'arccsc',
		{
			lower: -Math.PI / 2,
			lowerInclusive: true,
			upper: Math.PI / 2,
			upperInclusive: true,
			monotonicity: 'none',
			evaluate: (x: number) => Math.asin(1 / x)
		}
	],

	// ==========================================================================
	// Hyperbolic Functions
	// ==========================================================================
	[
		'sinh',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.sinh
		}
	],
	[
		'cosh',
		{
			lower: 1,
			lowerInclusive: true,
			upper: null,
			upperInclusive: false,
			monotonicity: 'none', // Decreasing on ]-∞,0], increasing on [0,+∞[
			monotonicIntervals: [
				{ inputStart: null, inputEnd: 0, monotonicity: 'decreasing' },
				{ inputStart: 0, inputEnd: null, monotonicity: 'increasing' }
			],
			evaluate: Math.cosh
		}
	],
	[
		'tanh',
		{
			lower: -1,
			lowerInclusive: false,
			upper: 1,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.tanh
		}
	],

	// ==========================================================================
	// Inverse Hyperbolic Functions
	// ==========================================================================
	[
		'asinh',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.asinh
		}
	],
	[
		'arcsinh',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.asinh
		}
	],
	[
		'acosh',
		{
			lower: 0,
			lowerInclusive: true,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.acosh
		}
	],
	[
		'arccosh',
		{
			lower: 0,
			lowerInclusive: true,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.acosh
		}
	],
	[
		'atanh',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.atanh
		}
	],
	[
		'arctanh',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.atanh
		}
	],

	// ==========================================================================
	// Absolute Value and Sign
	// ==========================================================================
	[
		'abs',
		{
			lower: 0,
			lowerInclusive: true,
			upper: null,
			upperInclusive: false,
			monotonicity: 'none', // Decreasing on ]-∞,0], increasing on [0,+∞[
			monotonicIntervals: [
				{ inputStart: null, inputEnd: 0, monotonicity: 'decreasing' },
				{ inputStart: 0, inputEnd: null, monotonicity: 'increasing' }
			],
			evaluate: Math.abs
		}
	],
	[
		'sign',
		{
			lower: -1,
			lowerInclusive: true,
			upper: 1,
			upperInclusive: true,
			monotonicity: 'increasing', // Weakly increasing (constant on intervals)
			evaluate: Math.sign,
			integerOutput: true
		}
	],

	// ==========================================================================
	// Rounding Functions
	// ==========================================================================
	[
		'floor',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing', // Weakly increasing (step function)
			evaluate: Math.floor,
			integerOutput: true
		}
	],
	[
		'ceil',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.ceil,
			integerOutput: true
		}
	],
	[
		'round',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.round,
			integerOutput: true
		}
	],
	[
		'trunc',
		{
			lower: null,
			lowerInclusive: false,
			upper: null,
			upperInclusive: false,
			monotonicity: 'increasing',
			evaluate: Math.trunc,
			integerOutput: true
		}
	]
]);

// =============================================================================
// Range API Functions
// =============================================================================

/**
 * Convert a BuiltinRangeEntry to a Domain.
 */
function rangeEntryToDomain(entry: BuiltinRangeEntry): Domain {
	const { lower, lowerInclusive, upper, upperInclusive } = entry;

	// Unbounded: ]-∞, +∞[
	if (lower === null && upper === null) {
		return universalDomain();
	}

	// Only lower bound: [a, +∞[ or ]a, +∞[
	if (upper === null) {
		if (lowerInclusive) {
			return intervalDomain([greaterThanOrEqual(fromNumber(lower!))]);
		} else {
			return intervalDomain([greaterThan(fromNumber(lower!))]);
		}
	}

	// Only upper bound: ]-∞, b] or ]-∞, b[
	if (lower === null) {
		if (upperInclusive) {
			return intervalDomain([lessThanOrEqual(fromNumber(upper))]);
		} else {
			// lessThan is not exported, use openInterval with -∞
			return intervalDomain([
				{
					kind: 'interval',
					lower: { value: { type: 'infinity', sign: 'negative' }, type: 'open' },
					upper: { value: fromNumber(upper), type: 'open' }
				}
			]);
		}
	}

	// Both bounds
	if (lowerInclusive && upperInclusive) {
		return intervalDomain([closedInterval(fromNumber(lower), fromNumber(upper))]);
	} else if (!lowerInclusive && !upperInclusive) {
		return intervalDomain([openInterval(fromNumber(lower), fromNumber(upper))]);
	} else if (lowerInclusive && !upperInclusive) {
		// [a, b[
		return intervalDomain([
			{
				kind: 'interval',
				lower: { value: fromNumber(lower), type: 'closed' },
				upper: { value: fromNumber(upper), type: 'open' }
			}
		]);
	} else {
		// ]a, b]
		return intervalDomain([
			{
				kind: 'interval',
				lower: { value: fromNumber(lower), type: 'open' },
				upper: { value: fromNumber(upper), type: 'closed' }
			}
		]);
	}
}

/**
 * Get the output range for a builtin function.
 *
 * @param name - Function name (case-insensitive)
 * @returns The range as a Domain, or undefined if unknown
 *
 * @example
 * getBuiltinRange('sqrt') // → [0, +∞[
 * getBuiltinRange('sin')  // → [-1, 1]
 * getBuiltinRange('exp')  // → ]0, +∞[
 * getBuiltinRange('ln')   // → ℝ (unbounded)
 */
export function getBuiltinRange(name: string): Domain | undefined {
	const entry = BUILTIN_RANGES.get(name.toLowerCase());
	if (!entry) return undefined;
	return rangeEntryToDomain(entry);
}

/**
 * Get the raw range entry for a builtin function.
 * Used internally for composition analysis.
 *
 * @param name - Function name (case-insensitive)
 * @returns The range entry, or undefined if unknown
 */
export function getBuiltinRangeEntry(name: string): BuiltinRangeEntry | undefined {
	return BUILTIN_RANGES.get(name.toLowerCase());
}

/**
 * Check if a builtin function has a restricted (non-universal) output range.
 *
 * @param name - Function name (case-insensitive)
 * @returns true if the function has bounded output, false otherwise
 *
 * @example
 * hasRestrictedRange('sqrt') // → true (bounded below by 0)
 * hasRestrictedRange('sin')  // → true (bounded to [-1, 1])
 * hasRestrictedRange('ln')   // → false (unbounded)
 * hasRestrictedRange('exp')  // → true (bounded below by 0)
 */
export function hasRestrictedRange(name: string): boolean {
	const entry = BUILTIN_RANGES.get(name.toLowerCase());
	if (!entry) return false;
	return entry.lower !== null || entry.upper !== null;
}

// =============================================================================
// Range Application with Monotonicity
// =============================================================================

/**
 * Bounds structure for interval operations.
 */
export interface Bounds {
	lower: number | null;
	lowerInclusive: boolean;
	upper: number | null;
	upperInclusive: boolean;
}

/**
 * Extract bounds from a Domain.
 */
export function getBoundsFromDomain(domain: Domain): Bounds | null {
	if (domain.kind === 'empty') return null;
	if (domain.kind === 'universal') {
		return { lower: null, lowerInclusive: false, upper: null, upperInclusive: false };
	}

	if (domain.kind === 'interval_set') {
		const intervals = domain.intervals;
		if (intervals.length === 0) return null;

		// Get overall bounds from first and last interval
		const firstInterval = intervals[0];
		const lastInterval = intervals[intervals.length - 1];

		const lowerEndpoint = firstInterval.lower;
		const upperEndpoint = lastInterval.upper;

		// Check for infinity
		const lowerValue =
			lowerEndpoint.value.type === 'infinity'
				? null
				: lowerEndpoint.value.type === 'number'
					? parseFloat(lowerEndpoint.value.value)
					: null;

		const upperValue =
			upperEndpoint.value.type === 'infinity'
				? null
				: upperEndpoint.value.type === 'number'
					? parseFloat(upperEndpoint.value.value)
					: null;

		return {
			lower: lowerValue,
			lowerInclusive: lowerEndpoint.type === 'closed',
			upper: upperValue,
			upperInclusive: upperEndpoint.type === 'closed'
		};
	}

	// For other domain types, return universal bounds
	return { lower: null, lowerInclusive: false, upper: null, upperInclusive: false };
}

/**
 * Create a Domain from Bounds.
 */
export function domainFromBounds(bounds: Bounds): Domain {
	const { lower, lowerInclusive, upper, upperInclusive } = bounds;

	if (lower === null && upper === null) {
		return universalDomain();
	}

	if (lower !== null && upper !== null && lower > upper) {
		return { kind: 'empty' };
	}

	if (lower !== null && upper !== null) {
		if (lowerInclusive && upperInclusive) {
			return intervalDomain([closedInterval(fromNumber(lower), fromNumber(upper))]);
		} else if (!lowerInclusive && !upperInclusive) {
			return intervalDomain([openInterval(fromNumber(lower), fromNumber(upper))]);
		} else if (lowerInclusive && !upperInclusive) {
			return intervalDomain([
				{
					kind: 'interval',
					lower: { value: fromNumber(lower), type: 'closed' },
					upper: { value: fromNumber(upper), type: 'open' }
				}
			]);
		} else {
			return intervalDomain([
				{
					kind: 'interval',
					lower: { value: fromNumber(lower), type: 'open' },
					upper: { value: fromNumber(upper), type: 'closed' }
				}
			]);
		}
	}

	if (lower !== null) {
		if (lowerInclusive) {
			return intervalDomain([greaterThanOrEqual(fromNumber(lower))]);
		} else {
			return intervalDomain([greaterThan(fromNumber(lower))]);
		}
	}

	// upper !== null
	if (upperInclusive) {
		return intervalDomain([lessThanOrEqual(fromNumber(upper!))]);
	} else {
		return intervalDomain([
			{
				kind: 'interval',
				lower: { value: { type: 'infinity', sign: 'negative' }, type: 'open' },
				upper: { value: fromNumber(upper!), type: 'open' }
			}
		]);
	}
}

/**
 * Apply a builtin function to an input range using monotonicity analysis.
 *
 * For monotonic functions, this computes the exact range:
 * - Increasing: f([a,b]) = [f(a), f(b)]
 * - Decreasing: f([a,b]) = [f(b), f(a)]
 *
 * For non-monotonic functions (like sin, cos, abs, cosh):
 * - If input is within a single monotonic interval, use that
 * - Otherwise, return the full builtin range
 *
 * @param name - Function name
 * @param inputRange - The input domain to apply the function to
 * @returns The output range
 *
 * @example
 * applyFunctionToRange('sqrt', [4, 9])  // → [2, 3]
 * applyFunctionToRange('sin', [0, π/2]) // → [0, 1]
 * applyFunctionToRange('abs', [-2, 1])  // → [0, 2]
 */
export function applyFunctionToRange(name: string, inputRange: Domain): Domain {
	const entry = getBuiltinRangeEntry(name);
	if (!entry) {
		// Unknown function: return universal
		return universalDomain();
	}

	// Get input bounds
	const inputBounds = getBoundsFromDomain(inputRange);
	if (!inputBounds) {
		return { kind: 'empty' };
	}

	// If input is unbounded on both sides, return full function range
	if (inputBounds.lower === null && inputBounds.upper === null) {
		return rangeEntryToDomain(entry);
	}

	// If function has no evaluator, return full range
	if (!entry.evaluate) {
		return rangeEntryToDomain(entry);
	}

	// For globally monotonic functions, compute exact range
	if (entry.monotonicity === 'increasing' || entry.monotonicity === 'decreasing') {
		return applyMonotonicFunction(entry, inputBounds);
	}

	// For piecewise monotonic functions, check if input is within a single monotonic interval
	if (entry.monotonicIntervals && entry.monotonicIntervals.length > 0) {
		const singleInterval = findContainingMonotonicInterval(inputBounds, entry.monotonicIntervals);
		if (singleInterval) {
			return applyMonotonicFunctionWithEntry(entry, inputBounds, singleInterval.monotonicity);
		}
	}

	// Non-monotonic or spanning multiple monotonic intervals
	// Use sampling-based approach for better accuracy
	return applyNonMonotonicFunction(entry, inputBounds);
}

/**
 * Apply a monotonic function to bounded input.
 */
function applyMonotonicFunction(entry: BuiltinRangeEntry, inputBounds: Bounds): Domain {
	return applyMonotonicFunctionWithEntry(entry, inputBounds, entry.monotonicity!);
}

/**
 * Apply a function with known monotonicity on the interval.
 */
function applyMonotonicFunctionWithEntry(
	entry: BuiltinRangeEntry,
	inputBounds: Bounds,
	monotonicity: 'increasing' | 'decreasing'
): Domain {
	const evaluate = entry.evaluate!;

	// Handle infinite bounds
	const lowerVal = inputBounds.lower;
	const upperVal = inputBounds.upper;

	let outputLower: number | null = null;
	let outputUpper: number | null = null;
	let outputLowerInclusive = true;
	let outputUpperInclusive = true;

	if (monotonicity === 'increasing') {
		// f([a, b]) = [f(a), f(b)]
		if (lowerVal !== null) {
			const result = evaluate(lowerVal);
			// Handle infinite results: -Infinity means unbounded below
			if (result === -Infinity) {
				outputLower = null;
				outputLowerInclusive = false;
			} else if (result === Infinity) {
				// If f(a) = +∞, the range is empty (can't have lower > upper)
				return { kind: 'empty' };
			} else {
				outputLower = result;
				outputLowerInclusive = inputBounds.lowerInclusive;
			}
		} else {
			// As x → -∞, what does f(x) approach?
			outputLower = entry.lower;
			outputLowerInclusive = entry.lowerInclusive;
		}

		if (upperVal !== null) {
			const result = evaluate(upperVal);
			// Handle infinite results: +Infinity means unbounded above
			if (result === Infinity) {
				outputUpper = null;
				outputUpperInclusive = false;
			} else if (result === -Infinity) {
				// If f(b) = -∞, the range is empty (can't have upper < lower)
				return { kind: 'empty' };
			} else {
				outputUpper = result;
				outputUpperInclusive = inputBounds.upperInclusive;
			}
		} else {
			// As x → +∞, what does f(x) approach?
			outputUpper = entry.upper;
			outputUpperInclusive = entry.upperInclusive;
		}
	} else {
		// Decreasing: f([a, b]) = [f(b), f(a)]
		if (upperVal !== null) {
			const result = evaluate(upperVal);
			if (result === -Infinity) {
				outputLower = null;
				outputLowerInclusive = false;
			} else if (result === Infinity) {
				return { kind: 'empty' };
			} else {
				outputLower = result;
				outputLowerInclusive = inputBounds.upperInclusive;
			}
		} else {
			outputLower = entry.lower;
			outputLowerInclusive = entry.lowerInclusive;
		}

		if (lowerVal !== null) {
			const result = evaluate(lowerVal);
			if (result === Infinity) {
				outputUpper = null;
				outputUpperInclusive = false;
			} else if (result === -Infinity) {
				return { kind: 'empty' };
			} else {
				outputUpper = result;
				outputUpperInclusive = inputBounds.lowerInclusive;
			}
		} else {
			outputUpper = entry.upper;
			outputUpperInclusive = entry.upperInclusive;
		}
	}

	// Clamp to function's natural range
	if (entry.lower !== null) {
		if (outputLower === null || outputLower < entry.lower) {
			outputLower = entry.lower;
			outputLowerInclusive = entry.lowerInclusive;
		}
	}
	if (entry.upper !== null) {
		if (outputUpper === null || outputUpper > entry.upper) {
			outputUpper = entry.upper;
			outputUpperInclusive = entry.upperInclusive;
		}
	}

	return domainFromBounds({
		lower: outputLower,
		lowerInclusive: outputLowerInclusive,
		upper: outputUpper,
		upperInclusive: outputUpperInclusive
	});
}

/**
 * Find if input bounds are contained within a single monotonic interval.
 */
function findContainingMonotonicInterval(
	inputBounds: Bounds,
	intervals: MonotonicInterval[]
): MonotonicInterval | null {
	for (const interval of intervals) {
		const intervalStart = interval.inputStart ?? -Infinity;
		const intervalEnd = interval.inputEnd ?? Infinity;
		const inputStart = inputBounds.lower ?? -Infinity;
		const inputEnd = inputBounds.upper ?? Infinity;

		if (inputStart >= intervalStart && inputEnd <= intervalEnd) {
			return interval;
		}
	}
	return null;
}

/**
 * Apply a non-monotonic function using sampling for accuracy.
 * Used for functions like sin, cos, abs, cosh that aren't globally monotonic.
 */
function applyNonMonotonicFunction(entry: BuiltinRangeEntry, inputBounds: Bounds): Domain {
	const evaluate = entry.evaluate!;
	const samples: number[] = [];

	const lowerVal = inputBounds.lower ?? entry.lower ?? -10;
	const upperVal = inputBounds.upper ?? entry.upper ?? 10;

	// Sample at endpoints
	if (inputBounds.lower !== null) samples.push(evaluate(inputBounds.lower));
	if (inputBounds.upper !== null) samples.push(evaluate(inputBounds.upper));

	// Sample critical points if they're in the interval
	// For abs, cosh: critical point at 0
	const criticalPoints = getCriticalPoints(entry);
	for (const cp of criticalPoints) {
		if (cp >= lowerVal && cp <= upperVal) {
			samples.push(evaluate(cp));
		}
	}

	// Additional samples for periodic functions or to catch extrema
	const numSamples = 20;
	const step = (upperVal - lowerVal) / numSamples;
	for (let i = 1; i < numSamples; i++) {
		const x = lowerVal + i * step;
		if (isFinite(x)) {
			const y = evaluate(x);
			if (isFinite(y)) {
				samples.push(y);
			}
		}
	}

	if (samples.length === 0) {
		return rangeEntryToDomain(entry);
	}

	const minVal = Math.min(...samples);
	const maxVal = Math.max(...samples);

	// Clamp to function's natural range
	const clampedLower = entry.lower !== null ? Math.max(minVal, entry.lower) : minVal;
	const clampedUpper = entry.upper !== null ? Math.min(maxVal, entry.upper) : maxVal;

	return domainFromBounds({
		lower: clampedLower,
		lowerInclusive: true, // Conservative
		upper: clampedUpper,
		upperInclusive: true
	});
}

/**
 * Get critical points (extrema) for known functions.
 */
function getCriticalPoints(entry: BuiltinRangeEntry): number[] {
	// For abs and cosh, critical point is at 0
	if (
		entry.monotonicIntervals?.some((i) => i.inputEnd === 0) &&
		entry.monotonicIntervals?.some((i) => i.inputStart === 0)
	) {
		return [0];
	}

	// For sin/cos, critical points are at multiples of π/2
	// We return common ones
	return [
		0,
		Math.PI / 2,
		Math.PI,
		(3 * Math.PI) / 2,
		2 * Math.PI,
		-Math.PI / 2,
		-Math.PI,
		(-3 * Math.PI) / 2,
		-2 * Math.PI
	];
}
