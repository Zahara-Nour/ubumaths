/**
 * Interval formatting functions.
 *
 * Formats intervals for display using:
 * - French interval notation with semicolon separator: ]a ; b[
 *   (Semicolon is the standard French school convention because the
 *   comma is the decimal separator.)
 * - Mathematical symbols: ℝ, ∪, ∞
 * - Symbolic bounds: √2, π, ln(2)
 * - Condition notation: x > 0
 */

import type { MathNode } from '$lib/mathAST/types';
import type { IntervalDomain, Interval, IntervalSet } from './types';
import { toCustom } from '$lib/mathAST/custom-generator';
import {
	isInfinity,
	isPositiveInfinity,
	isNegativeInfinity,
	isNumber,
	isGreek,
	isMathConstant,
	isFunction,
	isDivision,
	isMultiplication
} from '$lib/mathAST/guards';
import { isUniversalInterval } from './algebra';

// =============================================================================
// Main API
// =============================================================================

/**
 * Format an interval domain as an interval notation string.
 *
 * Uses French notation with semicolon: ]a ; b[ for open intervals.
 *
 * @example
 * formatInterval(positiveReals()) // → "]0 ; +∞["
 * formatInterval(unitInterval()) // → "[-1 ; 1]"
 * formatInterval(nonZeroReals()) // → "ℝ \\ {0}"
 */
export function formatInterval(domain: IntervalDomain): string {
	switch (domain.kind) {
		case 'empty':
			return '∅';
		case 'universal':
			return 'ℝ';
		case 'interval_set':
			return formatIntervalSet(domain);
	}
}

/**
 * Format an interval domain as a condition string.
 *
 * @example
 * formatCondition(positiveReals(), 'x') // → "x > 0"
 * formatCondition(unitInterval(), 'x') // → "-1 ≤ x ≤ 1"
 */
export function formatCondition(domain: IntervalDomain, variable: string = 'x'): string {
	switch (domain.kind) {
		case 'empty':
			return 'aucune valeur';
		case 'universal':
			return `${variable} ∈ ℝ`;
		case 'interval_set':
			return formatIntervalSetAsCondition(domain, variable);
	}
}

// =============================================================================
// Deprecated Aliases (backward compatibility)
// =============================================================================

/** @deprecated Use formatInterval instead */
export const formatDomainInterval = formatInterval;

/** @deprecated Use formatCondition instead */
export const formatDomainCondition = formatCondition;

/**
 * Format both interval and condition representations.
 */
export function formatDomainFull(
	domain: IntervalDomain,
	variable: string = 'x'
): {
	interval: string;
	condition: string;
} {
	return {
		interval: formatInterval(domain),
		condition: formatCondition(domain, variable)
	};
}

// =============================================================================
// Interval Formatting
// =============================================================================

function formatIntervalSet(domain: IntervalSet): string {
	if (domain.intervals.length === 0) {
		return '∅';
	}

	const intervalStrs = domain.intervals.map(formatSingleInterval);

	// Check for full real line
	if (intervalStrs.length === 1 && intervalStrs[0] === ']-∞ ; +∞[') {
		return 'ℝ';
	}

	return intervalStrs.join(' ∪ ');
}

function formatSingleInterval(interval: Interval): string {
	const leftBracket = interval.lower.type === 'closed' ? '[' : ']';
	const rightBracket = interval.upper.type === 'closed' ? ']' : '[';
	const lower = formatEndpointValue(interval.lower.value);
	const upper = formatEndpointValue(interval.upper.value);

	return `${leftBracket}${lower} ; ${upper}${rightBracket}`;
}

/**
 * Format an endpoint value as a string.
 *
 * - Infinity: "-∞" or "+∞"
 * - Number: "0", "1.5", "-2"
 * - Greek: "π"
 * - Function: "√2", "ln(3)"
 * - Other: Uses toCustom for general MathNode formatting
 *
 * @example
 * formatEndpointValue(infinity('positive')) // → "+∞"
 * formatEndpointValue(number('5')) // → "5"
 * formatEndpointValue(piConstant()) // → "π"
 * formatEndpointValue(func('sqrt', [number('2')])) // → "√2"
 */
export function formatEndpointValue(value: MathNode): string {
	// Handle infinity
	if (isInfinity(value)) {
		return value.sign === 'positive' ? '+∞' : '-∞';
	}

	// Handle numbers
	if (isNumber(value)) {
		return value.value;
	}

	// Handle Greek letters with nice Unicode
	if (isGreek(value)) {
		const greekMap: Record<string, string> = {
			alpha: 'α',
			beta: 'β',
			gamma: 'γ',
			theta: 'θ',
			delta: 'δ',
			epsilon: 'ε',
			lambda: 'λ',
			mu: 'μ',
			sigma: 'σ',
			omega: 'ω',
			phi: 'φ',
			psi: 'ψ'
		};
		return greekMap[value.letter] ?? value.letter;
	}

	// Handle mathematical constants (pi, euler) with nice Unicode
	if (isMathConstant(value)) {
		const constantMap: Record<string, string> = {
			pi: 'π',
			euler: 'e'
		};
		return constantMap[value.constant] ?? value.constant;
	}

	// Handle sqrt with nice √ symbol
	if (isFunction(value) && value.name === 'sqrt' && value.args.length === 1) {
		const arg = value.args[0];
		if (isNumber(arg)) {
			return `√${arg.value}`;
		}
		return `√(${formatEndpointValue(arg)})`;
	}

	// Handle other functions
	if (isFunction(value)) {
		const args = value.args.map(formatEndpointValue).join(', ');
		return `${value.name}(${args})`;
	}

	// Handle division: a/b
	if (isDivision(value)) {
		return `${formatEndpointValue(value.numerator)}/${formatEndpointValue(value.denominator)}`;
	}

	// Handle multiplication: a*b
	if (isMultiplication(value)) {
		// Check if it's coefficient * sqrt(n) pattern for nice display
		if (isFunction(value.right) && value.right.name === 'sqrt' && value.right.args.length === 1) {
			const arg = value.right.args[0];
			if (isNumber(arg)) {
				return `${formatEndpointValue(value.left)}*√${arg.value}`;
			}
		}
		return `${formatEndpointValue(value.left)}*${formatEndpointValue(value.right)}`;
	}

	// Fallback: use toCustom for general MathNode formatting
	try {
		return toCustom(value);
	} catch {
		// If toCustom fails (e.g., missing styles), return a simple representation
		return String(value);
	}
}

// =============================================================================
// Condition Formatting
// =============================================================================

function formatIntervalSetAsCondition(domain: IntervalSet, variable: string): string {
	if (domain.intervals.length === 0) {
		return 'aucune valeur';
	}

	// Check if it's the real line
	if (isUniversalInterval(domain)) {
		return `${variable} ∈ ℝ`;
	}

	const conditions: string[] = [];

	for (const interval of domain.intervals) {
		const cond = formatIntervalAsCondition(interval, variable);
		if (cond) conditions.push(cond);
	}

	if (conditions.length === 0) {
		return `${variable} ∈ ℝ`;
	}

	// Join with "ou" for multiple disjoint intervals
	if (domain.intervals.length > 1) {
		return conditions.join(' ou ');
	}

	return conditions.join(' et ');
}

function formatIntervalAsCondition(interval: Interval, variable: string): string {
	const lower = interval.lower;
	const upper = interval.upper;

	const isLowerInf = isNegativeInfinity(lower.value);
	const isUpperInf = isPositiveInfinity(upper.value);

	if (isLowerInf && isUpperInf) {
		return `${variable} ∈ ℝ`;
	}

	if (isLowerInf) {
		const op = upper.type === 'closed' ? '≤' : '<';
		return `${variable} ${op} ${formatEndpointValue(upper.value)}`;
	}

	if (isUpperInf) {
		const op = lower.type === 'closed' ? '≥' : '>';
		return `${variable} ${op} ${formatEndpointValue(lower.value)}`;
	}

	// Bounded interval
	const lowerVal = formatEndpointValue(lower.value);
	const upperVal = formatEndpointValue(upper.value);
	const lowerOp = lower.type === 'closed' ? '≤' : '<';
	const upperOp = upper.type === 'closed' ? '≤' : '<';

	return `${lowerVal} ${lowerOp} ${variable} ${upperOp} ${upperVal}`;
}
