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

	// Handle sqrt with nice √ symbol — avec son indice : ∛, ∜ (∛4 s'écrivait √4)
	if (
		isFunction(value) &&
		(value.name === 'sqrt' || value.name === 'cbrt') &&
		value.args.length === 1
	) {
		const symbol = rootSymbol(value);
		if (symbol !== null) {
			const arg = value.args[0];
			if (isNumber(arg)) {
				return `${symbol}${arg.value}`;
			}
			return `${symbol}(${formatEndpointValue(arg)})`;
		}
	}

	// Fonction à indice ou base (ⁿ√, log_b, …) : l'écriture complète de
	// `toCustom` — `sqrt(2)` pour ⁵√2 se lisait √2
	if (isFunction(value) && value.base !== undefined) {
		return toCustom(value);
	}

	// Handle other functions
	if (isFunction(value)) {
		const args = value.args.map(formatEndpointValue).join(', ');
		return `${value.name}(${args})`;
	}

	// Opposé : −√2, −1/3 (même rendu que la partie positive)
	if (value.type === 'opposite') {
		return `-${formatEndpointValue(value.operand)}`;
	}

	// Somme / différence : (1+√5)/2 doit garder ses parenthèses
	if (value.type === 'addition' || value.type === 'subtraction') {
		const right = formatEndpointValue(value.right);
		const op = value.type === 'addition' ? '+' : '-';
		return `${formatEndpointValue(value.left)}${op}${right}`;
	}

	// Handle division: a/b
	if (isDivision(value)) {
		const wrap = (node: MathNode): string => {
			const text = formatEndpointValue(node);
			return node.type === 'addition' || node.type === 'subtraction' ? `(${text})` : text;
		};
		return `${wrap(value.numerator)}/${wrap(value.denominator)}`;
	}

	// 3π : coefficient entier collé
	if (isMultiplication(value) && isNumber(value.left) && isMathConstant(value.right)) {
		return `${value.left.value}${formatEndpointValue(value.right)}`;
	}

	// Handle multiplication: a*b
	if (isMultiplication(value)) {
		// Check if it's coefficient * sqrt(n) pattern for nice display
		if (isFunction(value.right) && value.right.args.length === 1) {
			const symbol = rootSymbol(value.right);
			const arg = value.right.args[0];
			if (symbol !== null && isNumber(arg)) {
				return `${formatEndpointValue(value.left)}*${symbol}${arg.value}`;
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

/**
 * Symbole d'une racine : √ (carrée), ∛ (cubique, `\sqrt[3]` ou `cbrt`), ∜ ;
 * `null` pour un autre indice (rendu par `toCustom`, `sqrt[5](…)`).
 */
function rootSymbol(node: MathNode): string | null {
	if (!isFunction(node)) return null;
	if (node.name === 'cbrt') return '∛';
	if (node.name !== 'sqrt') return null;
	if (node.base === undefined) return '√';
	if (!isNumber(node.base)) return null;
	if (node.base.value === '2') return '√';
	if (node.base.value === '3') return '∛';
	if (node.base.value === '4') return '∜';
	return null;
}
