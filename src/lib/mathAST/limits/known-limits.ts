/**
 * Known Limits Database
 *
 * A collection of standard limits that can be pattern-matched for immediate
 * evaluation. These are fundamental limits commonly taught in calculus.
 *
 * @module mathAST/limits/known-limits
 */

import type { MathNode } from '../types';
import type { KnownLimitEntry, LimitDirection } from './types';
import {
	number,
	variable,
	divide,
	func,
	subtract,
	add,
	power,
	multiply,
	positiveInfinity,
	negativeInfinity
} from '../factory';

// =============================================================================
// Known Limits Table
// =============================================================================

/**
 * Database of known standard limits.
 *
 * Each entry contains:
 * - A pattern to match (using the integration variable)
 * - The approach point
 * - The known limit value
 * - French description for pedagogical output
 */
export const KNOWN_LIMITS: readonly KnownLimitEntry[] = [
	// =========================================================================
	// Trigonometric Limits (x → 0)
	// =========================================================================
	{
		id: 'sin-x-over-x',
		name: 'Limite fondamentale sin(x)/x',
		descriptionFr: 'Limite fondamentale : lim(sin(x)/x) = 1 quand x tend vers 0',
		pattern: divide(func('sin', [variable('x')]), variable('x'), 'fraction'),
		variable: 'x',
		approach: number('0'),
		value: number('1')
	},
	{
		id: 'tan-x-over-x',
		name: 'Limite tan(x)/x',
		descriptionFr: 'Limite : lim(tan(x)/x) = 1 quand x tend vers 0',
		pattern: divide(func('tan', [variable('x')]), variable('x'), 'fraction'),
		variable: 'x',
		approach: number('0'),
		value: number('1')
	},
	{
		id: 'one-minus-cos-over-x',
		name: 'Limite (1-cos(x))/x',
		descriptionFr: 'Limite : lim((1-cos(x))/x) = 0 quand x tend vers 0',
		pattern: divide(subtract(number('1'), func('cos', [variable('x')])), variable('x'), 'fraction'),
		variable: 'x',
		approach: number('0'),
		value: number('0')
	},
	{
		id: 'one-minus-cos-over-x-squared',
		name: 'Limite (1-cos(x))/x²',
		descriptionFr: 'Limite : lim((1-cos(x))/x²) = 1/2 quand x tend vers 0',
		pattern: divide(
			subtract(number('1'), func('cos', [variable('x')])),
			power(variable('x'), number('2')),
			'fraction'
		),
		variable: 'x',
		approach: number('0'),
		value: divide(number('1'), number('2'), 'fraction')
	},
	{
		id: 'arcsin-x-over-x',
		name: 'Limite arcsin(x)/x',
		descriptionFr: 'Limite : lim(arcsin(x)/x) = 1 quand x tend vers 0',
		pattern: divide(func('arcsin', [variable('x')]), variable('x'), 'fraction'),
		variable: 'x',
		approach: number('0'),
		value: number('1')
	},
	{
		id: 'arctan-x-over-x',
		name: 'Limite arctan(x)/x',
		descriptionFr: 'Limite : lim(arctan(x)/x) = 1 quand x tend vers 0',
		pattern: divide(func('arctan', [variable('x')]), variable('x'), 'fraction'),
		variable: 'x',
		approach: number('0'),
		value: number('1')
	},

	// =========================================================================
	// Exponential Limits (x → 0)
	// =========================================================================
	{
		id: 'exp-minus-one-over-x',
		name: 'Limite (e^x - 1)/x',
		descriptionFr: 'Limite : lim((e^x - 1)/x) = 1 quand x tend vers 0',
		pattern: divide(subtract(func('exp', [variable('x')]), number('1')), variable('x'), 'fraction'),
		variable: 'x',
		approach: number('0'),
		value: number('1')
	},
	{
		id: 'ln-one-plus-x-over-x',
		name: 'Limite ln(1+x)/x',
		descriptionFr: 'Limite : lim(ln(1+x)/x) = 1 quand x tend vers 0',
		pattern: divide(func('ln', [add(number('1'), variable('x'))]), variable('x'), 'fraction'),
		variable: 'x',
		approach: number('0'),
		value: number('1')
	},
	{
		id: 'a-to-x-minus-one-over-x',
		name: 'Limite (a^x - 1)/x',
		descriptionFr: 'Limite : lim((a^x - 1)/x) = ln(a) quand x tend vers 0',
		pattern: divide(
			subtract(power(variable('a'), variable('x')), number('1')),
			variable('x'),
			'fraction'
		),
		variable: 'x',
		approach: number('0'),
		value: func('ln', [variable('a')]),
		conditions: 'a > 0, a ≠ 1'
	},

	// =========================================================================
	// Power Limits (x → 0)
	// =========================================================================
	{
		id: 'one-plus-x-to-one-over-x',
		name: 'Limite (1+x)^(1/x)',
		descriptionFr: 'Limite fondamentale : lim((1+x)^(1/x)) = e quand x tend vers 0',
		pattern: power(add(number('1'), variable('x')), divide(number('1'), variable('x'), 'fraction')),
		variable: 'x',
		approach: number('0'),
		value: func('exp', [number('1')]) // Euler's number e = exp(1)
	},
	{
		id: 'one-plus-one-over-n-to-n',
		name: 'Limite (1+1/n)^n',
		descriptionFr: "Limite fondamentale : lim((1+1/n)^n) = e quand n tend vers l'infini",
		pattern: power(add(number('1'), divide(number('1'), variable('n'), 'fraction')), variable('n')),
		variable: 'n',
		approach: positiveInfinity(),
		value: func('exp', [number('1')]) // Euler's number e = exp(1)
	},

	// =========================================================================
	// Limits at Infinity
	// =========================================================================
	{
		id: 'one-over-x-at-infinity',
		name: 'Limite 1/x',
		descriptionFr: 'Limite : lim(1/x) = 0 quand x tend vers +∞',
		pattern: divide(number('1'), variable('x'), 'fraction'),
		variable: 'x',
		approach: positiveInfinity(),
		value: number('0')
	},
	{
		id: 'one-over-x-at-neg-infinity',
		name: 'Limite 1/x (−∞)',
		descriptionFr: 'Limite : lim(1/x) = 0 quand x tend vers −∞',
		pattern: divide(number('1'), variable('x'), 'fraction'),
		variable: 'x',
		approach: negativeInfinity(),
		value: number('0')
	},
	{
		id: 'exp-at-neg-infinity',
		name: 'Limite e^x (−∞)',
		descriptionFr: 'Limite : lim(e^x) = 0 quand x tend vers −∞',
		pattern: func('exp', [variable('x')]),
		variable: 'x',
		approach: negativeInfinity(),
		value: number('0')
	},
	{
		id: 'ln-x-over-x',
		name: 'Limite ln(x)/x',
		descriptionFr: 'Croissance comparée : lim(ln(x)/x) = 0 quand x tend vers +∞',
		pattern: divide(func('ln', [variable('x')]), variable('x'), 'fraction'),
		variable: 'x',
		approach: positiveInfinity(),
		value: number('0')
	},
	{
		id: 'x-over-exp-x',
		name: 'Limite x/e^x',
		descriptionFr: 'Croissance comparée : lim(x/e^x) = 0 quand x tend vers +∞',
		pattern: divide(variable('x'), func('exp', [variable('x')]), 'fraction'),
		variable: 'x',
		approach: positiveInfinity(),
		value: number('0')
	},

	// =========================================================================
	// Limits at Zero (one-sided)
	// =========================================================================
	{
		id: 'one-over-x-at-zero-right',
		name: 'Limite 1/x (0⁺)',
		descriptionFr: 'Limite : lim(1/x) = +∞ quand x tend vers 0⁺',
		pattern: divide(number('1'), variable('x'), 'fraction'),
		variable: 'x',
		approach: number('0'),
		direction: 'right',
		value: positiveInfinity()
	},
	{
		id: 'one-over-x-at-zero-left',
		name: 'Limite 1/x (0⁻)',
		descriptionFr: 'Limite : lim(1/x) = −∞ quand x tend vers 0⁻',
		pattern: divide(number('1'), variable('x'), 'fraction'),
		variable: 'x',
		approach: number('0'),
		direction: 'left',
		value: negativeInfinity()
	},
	{
		id: 'ln-x-at-zero-right',
		name: 'Limite ln(x) (0⁺)',
		descriptionFr: 'Limite : lim(ln(x)) = −∞ quand x tend vers 0⁺',
		pattern: func('ln', [variable('x')]),
		variable: 'x',
		approach: number('0'),
		direction: 'right',
		value: negativeInfinity()
	}
];

// =============================================================================
// Pattern Matching
// =============================================================================

/**
 * Check if two MathNodes are structurally equivalent.
 *
 * This is a simple structural comparison that doesn't account for
 * commutativity or algebraic equivalence.
 */
export function structurallyEqual(a: MathNode, b: MathNode): boolean {
	// Different types
	if (a.type !== b.type) return false;

	switch (a.type) {
		case 'number':
			return b.type === 'number' && a.value === b.value;

		case 'variable':
			return b.type === 'variable' && a.name === b.name;

		case 'greek':
			return b.type === 'greek' && a.letter === b.letter;

		case 'infinity':
			return b.type === 'infinity' && a.sign === b.sign;

		case 'symbol':
			return b.type === 'symbol' && a.symbol === b.symbol;

		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return (
				b.type === a.type &&
				structurallyEqual(a.left, b.left) &&
				structurallyEqual(a.right, b.right)
			);

		case 'division':
			return (
				b.type === 'division' &&
				structurallyEqual(a.numerator, b.numerator) &&
				structurallyEqual(a.denominator, b.denominator)
			);

		case 'opposite':
		case 'positive':
			return b.type === a.type && structurallyEqual(a.operand, b.operand);

		case 'function':
			if (b.type !== 'function') return false;
			if (a.name !== b.name) return false;
			if (a.args.length !== b.args.length) return false;
			return a.args.every((arg, i) => structurallyEqual(arg, b.args[i]));

		case 'superscript':
			return (
				b.type === 'superscript' &&
				structurallyEqual(a.base, b.base) &&
				structurallyEqual(a.superscript, b.superscript)
			);

		case 'subscript':
			return (
				b.type === 'subscript' &&
				structurallyEqual(a.base, b.base) &&
				structurallyEqual(a.subscript, b.subscript)
			);

		case 'delimiter':
			return b.type === 'delimiter' && structurallyEqual(a.content, b.content);

		case 'relation':
			return (
				b.type === 'relation' &&
				a.relation === b.relation &&
				structurallyEqual(a.left, b.left) &&
				structurallyEqual(a.right, b.right)
			);

		case 'limit':
			return (
				b.type === 'limit' &&
				a.variable === b.variable &&
				a.direction === b.direction &&
				structurallyEqual(a.expression, b.expression) &&
				structurallyEqual(a.approach, b.approach)
			);

		case 'unit':
		case 'composition':
		case 'matrix':
		case 'complex':
		case 'hole':
		case 'constant':
			// These types are less common in limits; implement as needed
			return false;

		default: {
			const _exhaustive: never = a;
			return _exhaustive;
		}
	}
}

/**
 * Substitute a variable in a pattern with a replacement expression.
 *
 * @param pattern - The pattern containing the variable
 * @param varName - The variable name to replace
 * @param replacement - The expression to substitute
 * @returns New expression with substitution applied
 */
export function substituteVariable(
	pattern: MathNode,
	varName: string,
	replacement: MathNode
): MathNode {
	switch (pattern.type) {
		case 'variable':
			return pattern.name === varName ? replacement : pattern;

		case 'number':
		case 'greek':
		case 'symbol':
		case 'infinity':
		case 'hole':
		case 'constant':
			return pattern;

		case 'addition':
			return add(
				substituteVariable(pattern.left, varName, replacement),
				substituteVariable(pattern.right, varName, replacement)
			);

		case 'subtraction':
			return subtract(
				substituteVariable(pattern.left, varName, replacement),
				substituteVariable(pattern.right, varName, replacement)
			);

		case 'multiplication':
			return multiply(
				substituteVariable(pattern.left, varName, replacement),
				substituteVariable(pattern.right, varName, replacement),
				pattern.displayStyle
			);

		case 'division':
			return divide(
				substituteVariable(pattern.numerator, varName, replacement),
				substituteVariable(pattern.denominator, varName, replacement),
				pattern.displayStyle
			);

		case 'opposite':
			return {
				...pattern,
				operand: substituteVariable(pattern.operand, varName, replacement)
			};

		case 'positive':
			return {
				...pattern,
				operand: substituteVariable(pattern.operand, varName, replacement)
			};

		case 'function':
			return func(
				pattern.name,
				pattern.args.map((arg) => substituteVariable(arg, varName, replacement)),
				{
					...(pattern.power && { power: substituteVariable(pattern.power, varName, replacement) }),
					...(pattern.base && { base: substituteVariable(pattern.base, varName, replacement) })
				}
			);

		case 'superscript':
			return power(
				substituteVariable(pattern.base, varName, replacement),
				substituteVariable(pattern.superscript, varName, replacement)
			);

		case 'subscript':
		case 'delimiter':
		case 'relation':
		case 'unit':
		case 'composition':
		case 'matrix':
		case 'complex':
		case 'limit':
			// Deep substitution for these types would need full implementation
			return pattern;

		default: {
			const _exhaustive: never = pattern;
			return _exhaustive;
		}
	}
}

/**
 * Try to match an expression against a known limit pattern.
 *
 * This performs structural matching, attempting to map the pattern's variable
 * to the actual integration variable.
 *
 * @param expr - The expression to match
 * @param approach - The approach point
 * @param actualVar - The actual variable name
 * @param direction - The direction of approach
 * @returns Matching KnownLimitEntry or null if no match
 */
export function matchKnownLimit(
	expr: MathNode,
	approach: MathNode,
	actualVar: string,
	direction: LimitDirection = 'both'
): KnownLimitEntry | null {
	for (const entry of KNOWN_LIMITS) {
		// Check direction compatibility
		if (entry.direction && entry.direction !== direction) {
			continue;
		}
		if (direction !== 'both' && entry.direction !== direction && entry.direction !== undefined) {
			continue;
		}

		// Substitute the pattern's variable with the actual variable
		const substitutedPattern = substituteVariable(
			entry.pattern,
			entry.variable,
			variable(actualVar)
		);
		const substitutedApproach = substituteVariable(
			entry.approach,
			entry.variable,
			variable(actualVar)
		);

		// Check if expression matches the pattern and approach point matches
		if (
			structurallyEqual(expr, substitutedPattern) &&
			structurallyEqual(approach, substitutedApproach)
		) {
			return entry;
		}
	}

	return null;
}

/**
 * Get the limit value from a matched known limit entry.
 *
 * If the pattern's variable differs from the actual variable,
 * substitute it in the result value.
 *
 * @param entry - The matched known limit entry
 * @param actualVar - The actual variable name
 * @returns The limit value (possibly with variable substituted)
 */
export function getKnownLimitValue(entry: KnownLimitEntry, actualVar: string): MathNode {
	if (entry.variable === actualVar) {
		return entry.value;
	}
	// Substitute if variable names differ
	return substituteVariable(entry.value, entry.variable, variable(actualVar));
}
