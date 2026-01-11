/**
 * Function Sign Rules
 *
 * Determines the sign of builtin mathematical functions based on their properties.
 *
 * Sign categories:
 * - Always positive: exp(x), cosh(x) (>= 1)
 * - Always non-negative: abs(x), sqrt(x)
 * - Preserves sign: sinh(x), tanh(x), atan(x), sign(x)
 * - Domain-dependent: ln(x) (sign depends on whether x > 1 or x < 1)
 * - Periodic/oscillating: sin(x), cos(x), tan(x) (generally unknown)
 *
 * @module mathAST/sign/rules/function
 */

import type { Sign } from '../types';
import type { Domain } from '../../domain/types';

/**
 * Information about a function's sign behavior.
 */
export interface BuiltinSignInfo {
	/** Function is always strictly positive (e.g., exp) */
	readonly alwaysPositive?: boolean;

	/** Function is always >= 0 (e.g., abs, sqrt) */
	readonly alwaysNonNegative?: boolean;

	/** Function preserves the sign of its argument (e.g., sinh, tanh) */
	readonly preservesSign?: boolean;

	/** Function has special sign behavior */
	readonly specialCase?: 'ln' | 'periodic' | 'sqrt';
}

/**
 * Sign information for builtin functions.
 */
const BUILTIN_SIGN_INFO: Record<string, BuiltinSignInfo> = {
	// Always positive functions
	exp: { alwaysPositive: true },
	cosh: { alwaysPositive: true }, // cosh(x) >= 1 for all x

	// Always non-negative functions
	abs: { alwaysNonNegative: true },
	sqrt: { alwaysNonNegative: true, specialCase: 'sqrt' },
	cbrt: { preservesSign: true }, // cube root preserves sign

	// Sign-preserving functions (odd functions)
	sinh: { preservesSign: true },
	tanh: { preservesSign: true },
	atan: { preservesSign: true },
	asinh: { preservesSign: true },
	atanh: { preservesSign: true },
	sign: { preservesSign: true },

	// Domain-dependent: ln(x) is negative for 0 < x < 1, positive for x > 1
	ln: { specialCase: 'ln' },
	log: { specialCase: 'ln' }, // natural log alias
	log10: { specialCase: 'ln' }, // same behavior: < 1 -> neg, > 1 -> pos
	log2: { specialCase: 'ln' },

	// Periodic/oscillating functions - sign cannot be determined without interval info
	sin: { specialCase: 'periodic' },
	cos: { specialCase: 'periodic' },
	tan: { specialCase: 'periodic' },
	cot: { specialCase: 'periodic' },
	sec: { specialCase: 'periodic' },
	csc: { specialCase: 'periodic' },

	// Inverse trig with restricted ranges
	asin: {}, // range [-pi/2, pi/2], sign depends on arg
	acos: { alwaysNonNegative: true }, // range [0, pi]
	acosh: { alwaysNonNegative: true }, // range [0, +inf) for x >= 1

	// Floor and ceiling preserve sign for positive, but floor(-0.5) = -1
	floor: {},
	ceil: {},
	round: {},

	// Square function (even function)
	square: { alwaysNonNegative: true }
};

/**
 * Gets known sign information for a builtin function.
 *
 * @param funcName - The function name
 * @returns Sign information or null if not a recognized builtin
 *
 * @example
 * getBuiltinSignInfo('exp') // => { alwaysPositive: true }
 * getBuiltinSignInfo('sinh') // => { preservesSign: true }
 * getBuiltinSignInfo('ln') // => { specialCase: 'ln' }
 */
export function getBuiltinSignInfo(funcName: string): BuiltinSignInfo | null {
	return BUILTIN_SIGN_INFO[funcName] ?? null;
}

/**
 * Determines the sign of a function application.
 *
 * @param funcName - The name of the function
 * @param argSign - The sign of the function's argument
 * @param argDomain - Optional domain information for the argument (for ln special case)
 * @returns The sign of the function result
 *
 * @example
 * signOfFunction('exp', 'negative') // => 'positive' (exp always positive)
 * signOfFunction('sinh', 'negative') // => 'negative' (sinh preserves sign)
 * signOfFunction('abs', 'negative') // => 'positive' (abs is non-negative, negative arg -> positive result)
 * signOfFunction('sin', 'positive') // => 'unknown' (periodic)
 */
export function signOfFunction(funcName: string, argSign: Sign, argDomain?: Domain): Sign {
	const info = getBuiltinSignInfo(funcName);

	// Unknown function: return unknown
	if (info === null) {
		return 'unknown';
	}

	// Always positive functions
	if (info.alwaysPositive) {
		return 'positive';
	}

	// Always non-negative functions
	if (info.alwaysNonNegative) {
		// If argument is zero, result depends on function
		// abs(0) = 0, sqrt(0) = 0
		if (argSign === 'zero') {
			return 'zero';
		}
		// For non-zero arguments, result is positive
		if (argSign === 'positive' || argSign === 'negative') {
			return 'positive';
		}
		// Unknown argument -> result is at least non-negative, but we return unknown
		// because we distinguish between "definitely positive" and "possibly zero"
		return 'unknown';
	}

	// Sign-preserving functions (odd functions)
	if (info.preservesSign) {
		// sinh(0) = 0, sinh(positive) = positive, sinh(negative) = negative
		return argSign;
	}

	// Special cases
	if (info.specialCase === 'ln') {
		return signOfLn(argSign, argDomain);
	}

	if (info.specialCase === 'periodic') {
		// For periodic functions, we generally cannot determine sign
		// without detailed interval analysis
		return 'unknown';
	}

	if (info.specialCase === 'sqrt') {
		// sqrt is already handled by alwaysNonNegative
		// but we include this for completeness
		if (argSign === 'zero') return 'zero';
		if (argSign === 'positive') return 'positive';
		return 'unknown'; // negative arg is domain error
	}

	// Default: unknown
	return 'unknown';
}

/**
 * Determines the sign of ln(x).
 *
 * Mathematical rules:
 * - ln(x) < 0 when 0 < x < 1
 * - ln(1) = 0
 * - ln(x) > 0 when x > 1
 *
 * Without specific domain information, we can't determine the sign
 * unless the domain is explicitly restricted.
 *
 * @param argSign - Sign of the argument
 * @param argDomain - Domain of the argument (optional)
 * @returns The sign of ln(x)
 */
function signOfLn(argSign: Sign, argDomain?: Domain): Sign {
	// ln requires positive argument
	if (argSign === 'zero' || argSign === 'negative') {
		// Domain error - ln is undefined for non-positive values
		return 'unknown';
	}

	if (argSign === 'unknown') {
		return 'unknown';
	}

	// argSign is 'positive', but we need to know if it's > 1 or < 1
	// Without domain information, we cannot determine this
	if (!argDomain) {
		return 'unknown';
	}

	// Try to extract bounds from domain
	const bounds = extractDomainBounds(argDomain);
	if (!bounds) {
		return 'unknown';
	}

	const { lower, upper } = bounds;

	// If entire domain is > 1, ln is positive
	if (lower > 1) {
		return 'positive';
	}

	// If entire domain is in (0, 1), ln is negative
	if (upper < 1 && lower > 0) {
		return 'negative';
	}

	// If domain includes 1, or spans across 1, sign varies
	return 'unknown';
}

/**
 * Attempts to extract numeric bounds from a domain.
 *
 * @param domain - The domain to analyze
 * @returns Lower and upper bounds if extractable, null otherwise
 */
function extractDomainBounds(domain: Domain): { lower: number; upper: number } | null {
	if (domain.kind === 'empty') {
		return null;
	}

	if (domain.kind === 'universal') {
		return { lower: -Infinity, upper: Infinity };
	}

	if (domain.kind === 'interval_set') {
		// Find overall bounds from all intervals
		let lower = Infinity;
		let upper = -Infinity;

		for (const interval of domain.intervals) {
			const lowerVal = getEndpointNumericValue(interval.lower);
			const upperVal = getEndpointNumericValue(interval.upper);

			if (lowerVal === null || upperVal === null) {
				return null; // Contains symbolic bounds
			}

			lower = Math.min(lower, lowerVal);
			upper = Math.max(upper, upperVal);
		}

		if (lower === Infinity || upper === -Infinity) {
			return null;
		}

		return { lower, upper };
	}

	// Other domain types (condition, periodic) - not easily extractable
	return null;
}

/**
 * Gets numeric value from an endpoint.
 */
function getEndpointNumericValue(endpoint: { value: unknown; type: string }): number | null {
	const value = endpoint.value;

	if (typeof value === 'number') {
		return value;
	}

	if (value === 'infinity') {
		return endpoint.type === 'closed' ? Infinity : Infinity;
	}

	if (value === '-infinity') {
		return endpoint.type === 'closed' ? -Infinity : -Infinity;
	}

	// Handle MathNode for infinity
	if (typeof value === 'object' && value !== null) {
		const node = value as { type?: string; sign?: string };
		if (node.type === 'infinity') {
			return node.sign === 'negative' ? -Infinity : Infinity;
		}
	}

	return null;
}

/**
 * Determines the sign of a function for multiple arguments.
 *
 * Some functions like max, min, pow take multiple arguments.
 *
 * @param funcName - The function name
 * @param argSigns - Signs of all arguments
 * @returns The sign of the function result
 *
 * @example
 * signOfMultiArgFunction('max', ['positive', 'negative']) // => 'positive'
 * signOfMultiArgFunction('min', ['positive', 'positive']) // => 'positive'
 */
export function signOfMultiArgFunction(funcName: string, argSigns: readonly Sign[]): Sign {
	if (argSigns.length === 0) {
		return 'unknown';
	}

	switch (funcName) {
		case 'max': {
			// max is the largest value
			// If any arg is positive, result is at least non-negative (could be that positive)
			if (argSigns.some((s) => s === 'positive')) {
				return 'positive';
			}
			// If all are zero, result is zero
			if (argSigns.every((s) => s === 'zero')) {
				return 'zero';
			}
			// If all are non-positive (zero or negative), result is the max
			if (argSigns.every((s) => s === 'negative' || s === 'zero')) {
				// Could be zero (if any is zero) or negative (if all negative)
				if (argSigns.some((s) => s === 'zero')) {
					return 'zero';
				}
				return 'negative';
			}
			return 'unknown';
		}

		case 'min': {
			// min is the smallest value
			// If any arg is negative, result is at most non-positive (could be that negative)
			if (argSigns.some((s) => s === 'negative')) {
				return 'negative';
			}
			// If all are zero, result is zero
			if (argSigns.every((s) => s === 'zero')) {
				return 'zero';
			}
			// If all are non-negative (zero or positive), result is the min
			if (argSigns.every((s) => s === 'positive' || s === 'zero')) {
				// Could be zero (if any is zero) or positive (if all positive)
				if (argSigns.some((s) => s === 'zero')) {
					return 'zero';
				}
				return 'positive';
			}
			return 'unknown';
		}

		case 'pow': {
			// pow(base, exponent) - delegate to power rules
			// This would need the actual exponent value, not just its sign
			return 'unknown';
		}

		case 'hypot': {
			// hypot returns sqrt(sum of squares), always non-negative
			if (argSigns.every((s) => s === 'zero')) {
				return 'zero';
			}
			// If any arg is non-zero, result is positive
			if (argSigns.some((s) => s === 'positive' || s === 'negative')) {
				return 'positive';
			}
			return 'unknown';
		}

		default:
			return 'unknown';
	}
}
