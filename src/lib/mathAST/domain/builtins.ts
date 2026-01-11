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
}

/**
 * Registry of builtin function output ranges.
 * Key is the lowercase function name.
 *
 * Used for:
 * - Computing the range/image of expressions
 * - Analyzing function compositions
 */
export const BUILTIN_RANGES: Map<string, BuiltinRangeEntry> = new Map([
	// Functions with [0, +∞[ range
	['sqrt', { lower: 0, lowerInclusive: true, upper: null, upperInclusive: false }],
	['abs', { lower: 0, lowerInclusive: true, upper: null, upperInclusive: false }],
	['exp', { lower: 0, lowerInclusive: false, upper: null, upperInclusive: false }],

	// Functions with ]-∞, +∞[ range (unbounded)
	['ln', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['log', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['log10', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['log2', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],

	// Trig functions with [-1, 1] range
	['sin', { lower: -1, lowerInclusive: true, upper: 1, upperInclusive: true }],
	['cos', { lower: -1, lowerInclusive: true, upper: 1, upperInclusive: true }],

	// Inverse trig with specific ranges
	['asin', { lower: -Math.PI / 2, lowerInclusive: true, upper: Math.PI / 2, upperInclusive: true }],
	[
		'arcsin',
		{ lower: -Math.PI / 2, lowerInclusive: true, upper: Math.PI / 2, upperInclusive: true }
	],
	['acos', { lower: 0, lowerInclusive: true, upper: Math.PI, upperInclusive: true }],
	['arccos', { lower: 0, lowerInclusive: true, upper: Math.PI, upperInclusive: true }],
	[
		'atan',
		{ lower: -Math.PI / 2, lowerInclusive: false, upper: Math.PI / 2, upperInclusive: false }
	],
	[
		'arctan',
		{ lower: -Math.PI / 2, lowerInclusive: false, upper: Math.PI / 2, upperInclusive: false }
	],

	// Hyperbolic functions
	['sinh', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['cosh', { lower: 1, lowerInclusive: true, upper: null, upperInclusive: false }],
	['tanh', { lower: -1, lowerInclusive: false, upper: 1, upperInclusive: false }],

	// Inverse hyperbolic
	['asinh', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['arcsinh', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['acosh', { lower: 0, lowerInclusive: true, upper: null, upperInclusive: false }],
	['arccosh', { lower: 0, lowerInclusive: true, upper: null, upperInclusive: false }],
	['atanh', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['arctanh', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],

	// Other functions
	['floor', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['ceil', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['round', { lower: null, lowerInclusive: false, upper: null, upperInclusive: false }],
	['sign', { lower: -1, lowerInclusive: true, upper: 1, upperInclusive: true }]
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
