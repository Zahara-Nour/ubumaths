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
	openInterval,
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
