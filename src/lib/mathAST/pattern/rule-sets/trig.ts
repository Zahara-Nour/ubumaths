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
import {
	number,
	fraction,
	opposite,
	multiply,
	piConstant as constantPi,
	func as astFunc
} from '../../factory';

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
 * La valeur d'un nombre entier écrit, ou `null`.
 *
 * ⚠️ Pas `parseInt` seul : `parseInt('0.5')` vaut 0, et `cos(0.5π)` se lisait
 * `cos(0)` = 1 au lieu de 0 (chantier valeurs-remarquables, 2026-10-26).
 */
function integerOf(node: MathNode): number | null {
	if (node.type !== 'number' || !/^\d+$/.test(node.value)) return null;
	const value = Number(node.value);
	return Number.isSafeInteger(value) ? value : null;
}

/** `k·π` ou `π·k`, k entier : k, sinon `null`. */
function piMultiple(left: MathNode, right: MathNode): number | null {
	const isPi = (n: MathNode) => n.type === 'constant' && n.constant === 'pi';
	if (isPi(right)) return integerOf(left);
	if (isPi(left)) return integerOf(right);
	return null;
}

/** `k·angle`, k entier et angle multiple de π : le coefficient, sinon `null`. */
function scaledCoefficient(factor: MathNode, angle: MathNode): [number, number] | null {
	const k = integerOf(factor);
	if (k === null) return null;
	const coefficient = extractPiCoefficient(angle);
	return coefficient === null ? null : reduceFraction(k * coefficient[0], coefficient[1]);
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
		const d = integerOf(node.denominator);
		if (d === null || d === 0) return null;

		const num = node.numerator;

		// π/d
		if (num.type === 'constant' && num.constant === 'pi') {
			return reduceFraction(1, d);
		}

		// k·π/d or π·k/d
		if (num.type === 'multiplication') {
			const k = piMultiple(num.left, num.right);
			if (k !== null) return reduceFraction(k, d);
		}

		// -(π)/d or -(k·π)/d
		if (num.type === 'opposite') {
			const innerCoeff = extractPiCoefficient(num.operand);
			if (innerCoeff) return reduceFraction(-innerCoeff[0], innerCoeff[1] * d);
		}
	}

	// Multiplication: k·π or π·k
	if (node.type === 'multiplication') {
		const k = piMultiple(node.left, node.right);
		if (k !== null) return reduceFraction(k, 1);
		// k·(π/d) : `7π/3` tapé en texte se lit 7·(π/3)
		return scaledCoefficient(node.left, node.right) ?? scaledCoefficient(node.right, node.left);
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

// =============================================================================
// Les valeurs remarquables de `réduire`, une étape par geste
// =============================================================================
//
// `réduire` montre chaque geste (décision S4 de simplify-carte, chantier
// valeurs-remarquables) : `cos(7π/3)` passe par la période (`cos(π/3)`), puis par
// la valeur (`1/2`) ; `sin(−π/6)` par la parité (`sin-negative`, qui voit le −),
// puis par la valeur. `trigRules` fait tout d'un coup : il reste pour les autres
// appelants. Les degrés (`cos(60°)`, 3e) se lisent ici aussi.

/** Un angle en degrés écrit avec l'unité (`60°`) : son nombre entier de degrés, ou `null`. */
function degreesOf(node: MathNode): number | null {
	if (node.type !== 'unit' || node.unit.original !== '°') return null;
	const expression = node.expression;
	if (expression.type === 'opposite') {
		const inner = integerOf(expression.operand);
		return inner === null ? null : -inner;
	}
	return integerOf(expression);
}

/** Le coefficient k de l'angle kπ, en radians (`2π/3`) ou en degrés (`120°`). */
function angleCoefficient(angle: MathNode): [number, number] | null {
	const degrees = degreesOf(angle);
	if (degrees !== null) return reduceFraction(degrees, 180);
	return extractPiCoefficient(angle);
}

/** L'angle k·π écrit comme au tableau : `0`, `π`, `2π`, `π/3`, `7π/6`. */
function piAngle(n: number, d: number): MathNode {
	if (n === 0) return number('0');
	const pi = constantPi();
	const numerator = n === 1 ? pi : multiply(number(String(n)), pi, 'implicit');
	return d === 1 ? numerator : fraction(numerator, number(String(d)));
}

/**
 * L'angle ramené dans [0 ; 2π[, dans son unité : `7π/3` → `π/3`, `420°` → `60°`.
 * `null` s'il y est déjà, ou si la parité s'en charge (un − écrit devant :
 * `sin-negative`, `cos-negative`, `tan-negative`).
 */
function reducedAngle(angle: MathNode): MathNode | null {
	if (angle.type === 'opposite') return null;
	const degrees = degreesOf(angle);
	// `cos(−60°)` : le − est sous l'unité, la parité ne le voit pas ; la valeur se
	// lit directement (`canonicalValue`), pas par un détour à 300°
	if (degrees !== null && degrees < 0) return null;
	const coefficient = angleCoefficient(angle);
	if (coefficient === null) return null;
	const [n, d] = coefficient;
	if (n >= 0 && n < 2 * d) return null;
	const [rn, rd] = reduceAngle(n, d);
	if (degrees !== null && angle.type === 'unit') {
		return { ...angle, expression: number(String((rn * 180) / rd)) };
	}
	return piAngle(rn, rd);
}

/** La valeur de la table pour un angle déjà dans [0 ; 2π[, sinon `undefined`. */
function canonicalValue(angle: MathNode, table: Record<string, ValueBuilder>) {
	const coefficient = angleCoefficient(angle);
	if (coefficient === null) return undefined;
	const [n, d] = coefficient;
	const negativeDegrees = n < 0 && degreesOf(angle) !== null;
	if (negativeDegrees) {
		const [rn, rd] = reduceAngle(n, d);
		return table[`${rn}:${rd}`];
	}
	if (n < 0 || n >= 2 * d) return undefined;
	return table[`${n}:${d}`];
}

function periodRule(name: string, fn: 'sin' | 'cos' | 'tan'): Rule {
	return createRule(
		P.func(fn, [P._('angle')]),
		(bindings) => astFunc(fn, [reducedAngle(bindings.get('angle') as MathNode)!]),
		{
			name,
			condition: (bindings) => {
				const angle = bindings.get('angle');
				return angle !== undefined && isMathNodeBinding(angle) && reducedAngle(angle) !== null;
			}
		}
	);
}

function valueRule(name: string, fn: 'sin' | 'cos' | 'tan', table: Record<string, ValueBuilder>) {
	return createRule(
		P.func(fn, [P._('angle')]),
		(bindings) => canonicalValue(bindings.get('angle') as MathNode, table)!(),
		{
			name,
			condition: (bindings) => {
				const angle = bindings.get('angle');
				return (
					angle !== undefined &&
					isMathNodeBinding(angle) &&
					canonicalValue(angle, table) !== undefined
				);
			}
		}
	);
}

/** Les noms des règles de valeur (titres d'étape, regroupement en une seule étape). */
export const TRIG_VALUE_RULE_NAMES: ReadonlySet<string> = new Set([
	'sin-remarkable-value',
	'cos-remarkable-value',
	'tan-remarkable-value'
]);

/**
 * Pour `réduire` : la période (`sin-remarkable-period`…), puis la valeur
 * (`sin-remarkable-value`…), deux étapes. `tan(π/2)` n'a pas de valeur : gardé.
 */
export const trigRemarkableStepRules: readonly Rule[] = [
	periodRule('sin-remarkable-period', 'sin'),
	periodRule('cos-remarkable-period', 'cos'),
	periodRule('tan-remarkable-period', 'tan'),
	valueRule('sin-remarkable-value', 'sin', SIN_TABLE),
	valueRule('cos-remarkable-value', 'cos', COS_TABLE),
	valueRule('tan-remarkable-value', 'tan', TAN_TABLE)
] as const;

/** Exported for testing */
export { extractPiCoefficient, reduceAngle };
