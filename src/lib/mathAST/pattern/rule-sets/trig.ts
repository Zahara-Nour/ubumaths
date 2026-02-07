/**
 * Trigonometric Remarkable Value Rules
 *
 * Handles all standard remarkable angles (multiples of π/6, π/4, π/3)
 * for sin, cos, and tan, matching the values handled by normalize.
 *
 * Uses a data-driven approach: a single rule per function with a condition
 * that extracts the π coefficient from the angle AST and looks it up in a
 * table. This handles any AST representation of the angle (π/6, 2π/3, -π/4,
 * 13π/6, etc.) including angle reduction modulo 2π.
 *
 * @module mathAST/pattern/rule-sets/trig
 */

import { P } from '../builder';
import { createRule } from '../rule';
import type { Rule, MatchBindings } from '../types';
import { isMathNodeBinding } from '../types';
import type { MathNode } from '../../types';
import { number, fraction, opposite, func as astFunc } from '../../factory';

// =============================================================================
// Angle Coefficient Extraction
// =============================================================================

/**
 * Compute GCD of two non-negative integers.
 */
function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b) {
		[a, b] = [b, a % b];
	}
	return a;
}

/**
 * Reduce a fraction n/d to lowest terms with positive denominator.
 * Returns [0, 1] when n is 0.
 */
function reduceFraction(n: number, d: number): [number, number] {
	if (n === 0) return [0, 1];
	const g = gcd(Math.abs(n), Math.abs(d));
	n = n / g;
	d = d / g;
	if (d < 0) {
		n = -n;
		d = -d;
	}
	return [n, d];
}

/**
 * Reduce an angle coefficient n/d to the range [0, 2) (i.e. mod 2π).
 * Returns the reduced fraction in lowest terms.
 */
function reduceAngle(n: number, d: number): [number, number] {
	[n, d] = reduceFraction(n, d);
	// Reduce to [0, 2d) then back to fraction
	const period = 2 * d;
	n = ((n % period) + period) % period;
	return reduceFraction(n, d);
}

/**
 * Extract the rational coefficient k = n/d from an angle expression
 * representing k·π. Returns [n, d] in reduced form, or null if
 * the expression is not a recognizable multiple of π.
 *
 * Handles:
 * - 0 (the number zero)
 * - π
 * - π/d
 * - k·π (implicit or explicit multiplication)
 * - k·π/d
 * - -(any of the above)
 */
function extractPiCoefficient(node: MathNode): [number, number] | null {
	// 0 → coefficient 0/1
	if (node.type === 'number' && node.value === '0') return [0, 1];

	// π → 1/1
	if (node.type === 'constant' && node.constant === 'pi') return [1, 1];

	// -expr → negate the coefficient
	if (node.type === 'opposite') {
		const inner = extractPiCoefficient(node.operand);
		return inner ? [-inner[0], inner[1]] : null;
	}

	// Division: π/d or k·π/d
	if (node.type === 'division') {
		const den = node.denominator;
		if (den.type !== 'number') return null;
		const d = parseInt(den.value, 10);
		if (!Number.isFinite(d) || d === 0) return null;

		const num = node.numerator;

		// π/d
		if (num.type === 'constant' && num.constant === 'pi') {
			return reduceFraction(1, d);
		}

		// k·π/d or π·k/d
		if (num.type === 'multiplication') {
			if (
				num.right.type === 'constant' &&
				num.right.constant === 'pi' &&
				num.left.type === 'number'
			) {
				return reduceFraction(parseInt(num.left.value, 10), d);
			}
			if (
				num.left.type === 'constant' &&
				num.left.constant === 'pi' &&
				num.right.type === 'number'
			) {
				return reduceFraction(parseInt(num.right.value, 10), d);
			}
		}

		// -(π)/d or -(k·π)/d
		if (num.type === 'opposite') {
			const innerCoeff = extractPiCoefficient(num.operand);
			if (innerCoeff) return reduceFraction(-innerCoeff[0], innerCoeff[1] * d);
		}
	}

	// Multiplication: k·π or π·k
	if (node.type === 'multiplication') {
		if (
			node.right.type === 'constant' &&
			node.right.constant === 'pi' &&
			node.left.type === 'number'
		) {
			return reduceFraction(parseInt(node.left.value, 10), 1);
		}
		if (
			node.left.type === 'constant' &&
			node.left.constant === 'pi' &&
			node.right.type === 'number'
		) {
			return reduceFraction(parseInt(node.right.value, 10), 1);
		}
	}

	return null;
}

// =============================================================================
// Value Builders (MathNode factories for remarkable values)
// =============================================================================

type ValueBuilder = () => MathNode;

const ZERO: ValueBuilder = () => number('0');
const ONE: ValueBuilder = () => number('1');
const HALF: ValueBuilder = () => fraction(number('1'), number('2'));
const SQRT2_OVER_2: ValueBuilder = () => fraction(astFunc('sqrt', [number('2')]), number('2'));
const SQRT3_OVER_2: ValueBuilder = () => fraction(astFunc('sqrt', [number('3')]), number('2'));
const SQRT3: ValueBuilder = () => astFunc('sqrt', [number('3')]);
const SQRT3_OVER_3: ValueBuilder = () => fraction(astFunc('sqrt', [number('3')]), number('3'));

/** Negate a value builder */
const neg =
	(builder: ValueBuilder): ValueBuilder =>
	() =>
		opposite(builder());

// =============================================================================
// Lookup Tables (key format: "n:d" for reduced angle coefficient n/d)
// =============================================================================

const SIN_TABLE: Record<string, ValueBuilder> = {
	'0:1': ZERO, // sin(0) = 0
	'1:6': HALF, // sin(π/6) = 1/2
	'1:4': SQRT2_OVER_2, // sin(π/4) = √2/2
	'1:3': SQRT3_OVER_2, // sin(π/3) = √3/2
	'1:2': ONE, // sin(π/2) = 1
	'2:3': SQRT3_OVER_2, // sin(2π/3) = √3/2
	'3:4': SQRT2_OVER_2, // sin(3π/4) = √2/2
	'5:6': HALF, // sin(5π/6) = 1/2
	'1:1': ZERO, // sin(π) = 0
	'7:6': neg(HALF), // sin(7π/6) = -1/2
	'5:4': neg(SQRT2_OVER_2), // sin(5π/4) = -√2/2
	'4:3': neg(SQRT3_OVER_2), // sin(4π/3) = -√3/2
	'3:2': neg(ONE), // sin(3π/2) = -1
	'5:3': neg(SQRT3_OVER_2), // sin(5π/3) = -√3/2
	'7:4': neg(SQRT2_OVER_2), // sin(7π/4) = -√2/2
	'11:6': neg(HALF) // sin(11π/6) = -1/2
};

const COS_TABLE: Record<string, ValueBuilder> = {
	'0:1': ONE, // cos(0) = 1
	'1:6': SQRT3_OVER_2, // cos(π/6) = √3/2
	'1:4': SQRT2_OVER_2, // cos(π/4) = √2/2
	'1:3': HALF, // cos(π/3) = 1/2
	'1:2': ZERO, // cos(π/2) = 0
	'2:3': neg(HALF), // cos(2π/3) = -1/2
	'3:4': neg(SQRT2_OVER_2), // cos(3π/4) = -√2/2
	'5:6': neg(SQRT3_OVER_2), // cos(5π/6) = -√3/2
	'1:1': neg(ONE), // cos(π) = -1
	'7:6': neg(SQRT3_OVER_2), // cos(7π/6) = -√3/2
	'5:4': neg(SQRT2_OVER_2), // cos(5π/4) = -√2/2
	'4:3': neg(HALF), // cos(4π/3) = -1/2
	'3:2': ZERO, // cos(3π/2) = 0
	'5:3': HALF, // cos(5π/3) = 1/2
	'7:4': SQRT2_OVER_2, // cos(7π/4) = √2/2
	'11:6': SQRT3_OVER_2 // cos(11π/6) = √3/2
};

const TAN_TABLE: Record<string, ValueBuilder> = {
	'0:1': ZERO, // tan(0) = 0
	'1:6': SQRT3_OVER_3, // tan(π/6) = √3/3
	'1:4': ONE, // tan(π/4) = 1
	'1:3': SQRT3, // tan(π/3) = √3
	// π/2: undefined
	'2:3': neg(SQRT3), // tan(2π/3) = -√3
	'3:4': neg(ONE), // tan(3π/4) = -1
	'5:6': neg(SQRT3_OVER_3), // tan(5π/6) = -√3/3
	'1:1': ZERO, // tan(π) = 0
	'7:6': SQRT3_OVER_3, // tan(7π/6) = √3/3
	'5:4': ONE, // tan(5π/4) = 1
	'4:3': SQRT3, // tan(4π/3) = √3
	// 3π/2: undefined
	'5:3': neg(SQRT3), // tan(5π/3) = -√3
	'7:4': neg(ONE), // tan(7π/4) = -1
	'11:6': neg(SQRT3_OVER_3) // tan(11π/6) = -√3/3
};

// =============================================================================
// Rule Factories
// =============================================================================

/**
 * Lookup the reduced angle in a table. Returns the builder or undefined.
 */
function lookupAngle(
	angle: MathNode,
	table: Record<string, ValueBuilder>
): ValueBuilder | undefined {
	const coeff = extractPiCoefficient(angle);
	if (!coeff) return undefined;
	const [n, d] = reduceAngle(coeff[0], coeff[1]);
	return table[`${n}:${d}`];
}

function makeTrigCondition(table: Record<string, ValueBuilder>) {
	return (bindings: MatchBindings): boolean => {
		const angle = bindings.get('angle');
		if (!angle || !isMathNodeBinding(angle)) return false;
		return lookupAngle(angle, table) !== undefined;
	};
}

function makeTrigReplacement(table: Record<string, ValueBuilder>) {
	return (bindings: MatchBindings): MathNode => {
		const angle = bindings.get('angle') as MathNode;
		return lookupAngle(angle, table)!();
	};
}

// =============================================================================
// Rules
// =============================================================================

/** sin(remarkable angle) = known value */
const sinRemarkable = createRule(P.func('sin', [P._('angle')]), makeTrigReplacement(SIN_TABLE), {
	name: 'sin-remarkable',
	condition: makeTrigCondition(SIN_TABLE)
});

/** cos(remarkable angle) = known value */
const cosRemarkable = createRule(P.func('cos', [P._('angle')]), makeTrigReplacement(COS_TABLE), {
	name: 'cos-remarkable',
	condition: makeTrigCondition(COS_TABLE)
});

/** tan(remarkable angle) = known value */
const tanRemarkable = createRule(P.func('tan', [P._('angle')]), makeTrigReplacement(TAN_TABLE), {
	name: 'tan-remarkable',
	condition: makeTrigCondition(TAN_TABLE)
});

// =============================================================================
// Exports
// =============================================================================

export const trigRules: readonly Rule[] = [sinRemarkable, cosRemarkable, tanRemarkable] as const;

/** Exported for testing */
export { extractPiCoefficient, reduceAngle };
