/**
 * Sign Tracking for Limit Values
 *
 * Tracks the sign of values approaching 0 or infinity,
 * which is critical for composition limits.
 *
 * Uses exact arithmetic via normalizeExtended when possible, with fallback
 * to numeric heuristics for transcendental functions.
 *
 * Examples:
 * - 0+ means approaching 0 from above (positive side)
 * - 0- means approaching 0 from below (negative side)
 *
 * @module mathAST/limits/sign-tracking
 */

import type { MathNode } from '../types';
import type { LimitDirection } from './types';
import { isInfinity, isSignedZero as isSignedZeroNode } from '../guards';
import { number, positiveInfinity, negativeInfinity, zeroPlus, zeroMinus } from '../factory';
import { evaluateNumeric, getNumericValue, numericNode } from '../common';
import {
	addExtended,
	subtractExtended,
	multiplyExtended,
	divideExtended,
	lnExtended,
	expExtended,
	sqrtExtended,
	type ExtendedResult,
	type IndeterminateForm
} from '../eval/extended-arithmetic';
import { tryEvaluateLimitExact, resultToNumber } from './exact-evaluation';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

// =============================================================================
// Types
// =============================================================================

/**
 * Extended limit value with sign tracking.
 * Used to track whether a value approaches 0 from above/below.
 */
export type SignedLimitValue =
	| { readonly type: 'zero-plus' } // Approaching 0 from above (0+)
	| { readonly type: 'zero-minus' } // Approaching 0 from below (0-)
	| { readonly type: 'zero' } // Approaching 0 (sign unknown)
	| { readonly type: 'pos-infinity' } // +infinity
	| { readonly type: 'neg-infinity' } // -infinity
	| { readonly type: 'finite'; readonly value: number } // Finite non-zero value
	| { readonly type: 'unknown' }; // Cannot determine

// =============================================================================
// Sign Classification
// =============================================================================

/**
 * Classify the limit value with sign tracking.
 * This is critical for composition limits where sign matters.
 *
 * Uses exact arithmetic via normalizeExtended when possible, with fallback
 * to numeric heuristics for cases involving transcendental functions.
 *
 * @param expr - Expression to evaluate
 * @param varName - Variable approaching the limit
 * @param approach - Point being approached
 * @param direction - Direction of approach
 */
export function classifyWithSign(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): SignedLimitValue {
	const value = classifyOneWay(expr, varName, approach, direction);
	if (direction !== 'both' || isInfinity(approach)) return value;

	// Zéro sans signe en bilatéral (cos²x en π/2, zéro exact) : les deux côtés
	// du même signe le précisent, 1/cos²x → +∞.
	if (value.type === 'zero') {
		const left = classifyOneWay(expr, varName, approach, 'left');
		const right = classifyOneWay(expr, varName, approach, 'right');
		return left.type === right.type && (left.type === 'zero-plus' || left.type === 'zero-minus')
			? left
			: value;
	}
	if (!isSignedInfinity(value)) return value;

	// Infini bilatéral en un point : 1/x « vaut » +∞ par substitution, alors
	// que 0⁻ donne −∞. Les deux côtés connus et différents → pas de limite
	// (1/x·(x+1) en 0 était rendu +∞). Un côté hors domaine (inconnu) ne
	// contredit rien : ln x en 0 reste −∞.
	const left = classifyOneWay(expr, varName, approach, 'left');
	const right = classifyOneWay(expr, varName, approach, 'right');
	if (left.type === 'unknown' || right.type === 'unknown') return value;
	return left.type === right.type ? left : { type: 'unknown' };
}

function classifyOneWay(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): SignedLimitValue {
	// Try exact evaluation first
	const exactResult = classifyWithSignExact(expr, varName, approach, direction);
	if (exactResult !== null) {
		return exactResult;
	}

	// Fallback to numeric classification
	return classifyWithSignNumeric(expr, varName, approach, direction);
}

/**
 * Des valeurs de signes opposés parmi les échantillons, sans tendre vers 0
 * (x·sin(1/x) en 0 change de signe mais tend vers 0 : ce n'est pas une
 * oscillation qui empêche la limite).
 */
function changesSign(values: readonly number[]): boolean {
	if (values.every((v) => Math.abs(v) < 1e-3)) return false;
	return values.some((v) => v > 0) && values.some((v) => v < 0);
}

/**
 * Trois valeurs successives d'un même côté se stabilisent-elles ? Une valeur
 * « finie » qui ne se stabilise pas (sin x en +∞, sin(1/x) en 0) n'est pas une
 * limite : x·sin x était rendu −∞ parce que sin(1e10) < 0.
 */
function isSettled(values: readonly number[]): boolean {
	if (values.length < 2) return true;
	const last = values[values.length - 1];
	const previous = values[values.length - 2];
	return Math.abs(last - previous) <= 1e-3 * Math.max(1, Math.abs(last));
}

/**
 * Classify using exact arithmetic via normalizeExtended.
 * Returns null if exact evaluation fails.
 */
function classifyWithSignExact(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): SignedLimitValue | null {
	const result = tryEvaluateLimitExact(expr, varName, approach, direction);
	if (!result) {
		return null;
	}

	switch (result.type) {
		case 'infinity':
			return result.sign === 'positive' ? { type: 'pos-infinity' } : { type: 'neg-infinity' };

		case 'signed-zero':
			return result.sign === 'positive' ? { type: 'zero-plus' } : { type: 'zero-minus' };

		case 'normal': {
			const numValue = resultToNumber(result);
			if (numValue === null) {
				// Result contains variables or complex radicals - can't classify
				return null;
			}
			if (numValue === 0) {
				if (direction === 'both') {
					return { type: 'zero' };
				}
				// For directional limits, fall back to numeric to determine sign
				// (e.g., ln(x) → 0⁺ as x → 1⁺)
				return null;
			}
			return { type: 'finite', value: numValue };
		}

		case 'indeterminate':
			// Indeterminate form - cannot classify
			return { type: 'unknown' };
	}
}

/**
 * Classify using numeric heuristics.
 * This is the fallback method when exact evaluation fails.
 */
function classifyWithSignNumeric(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): SignedLimitValue {
	// Handle infinity approach
	if (isInfinity(approach)) {
		return classifyAtInfinity(expr, varName, approach.sign === 'positive');
	}

	// Handle finite approach (π/2 : pas un littéral, valeur approchée)
	const approachValue = getNumericValue(approach) ?? approximateConstant(approach);
	if (approachValue === null) {
		return { type: 'unknown' };
	}

	return classifyAtFinitePoint(expr, varName, approachValue, direction);
}

/** Valeur approchée d'un point constant (π/2), ou `null`. */
function approximateConstant(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/**
 * Classify at a finite point with sign tracking.
 */
function classifyAtFinitePoint(
	expr: MathNode,
	varName: string,
	approachValue: number,
	direction: LimitDirection
): SignedLimitValue {
	// First, check if the expression evaluates at the approach point
	const atApproach = evaluateNumeric(expr, varName, approachValue);

	// If infinity at the approach point AND we're looking at 'both' direction,
	// we can return early. For one-sided limits, we need to evaluate with epsilon
	// to determine the correct sign.
	if (direction === 'both') {
		if (atApproach === Infinity) return { type: 'pos-infinity' };
		if (atApproach === -Infinity) return { type: 'neg-infinity' };
	}

	const isZeroAtApproach =
		atApproach !== null && Number.isFinite(atApproach) && Math.abs(atApproach) < 1e-12;

	// Use multiple epsilon values to detect trend toward 0 or infinity
	const epsilons = [1e-4, 1e-6, 1e-8];

	// Determine test points based on direction
	const testResults: { value: number; epsilon: number; side: 'left' | 'right' }[] = [];

	for (const eps of epsilons) {
		if (direction === 'right' || direction === 'both') {
			const result = evaluateNumeric(expr, varName, approachValue + eps);
			if (result !== null) {
				if (result === Infinity) return { type: 'pos-infinity' };
				if (result === -Infinity) return { type: 'neg-infinity' };
				if (Number.isFinite(result))
					testResults.push({ value: result, epsilon: eps, side: 'right' });
			}
		}
		if (direction === 'left' || direction === 'both') {
			const result = evaluateNumeric(expr, varName, approachValue - eps);
			if (result !== null) {
				if (result === Infinity) return { type: 'pos-infinity' };
				if (result === -Infinity) return { type: 'neg-infinity' };
				if (Number.isFinite(result))
					testResults.push({ value: result, epsilon: eps, side: 'left' });
			}
		}
	}

	if (testResults.length === 0) {
		return { type: 'unknown' };
	}

	// sin(1/x)/x : |f| grandit mais le signe alterne d'un même côté
	const sideValuesOf = (side: 'left' | 'right') =>
		testResults.filter((r) => r.side === side).map((r) => r.value);
	if (changesSign(sideValuesOf('left')) || changesSign(sideValuesOf('right'))) {
		if (!isZeroAtApproach) return { type: 'unknown' };
	}

	// Check if values are growing toward infinity (values increase as epsilon decreases)
	if (testResults.length >= 2) {
		const firstAbs = Math.abs(testResults[0].value);
		const lastAbs = Math.abs(testResults[testResults.length - 1].value);
		// If the last value is at least 100x larger than the first, it's growing to infinity
		if (lastAbs > firstAbs * 100 && lastAbs > 1e6) {
			const lastValue = testResults[testResults.length - 1].value;
			return lastValue > 0 ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
		}
	}

	// Also check absolute magnitude
	const lastValue = testResults[testResults.length - 1].value;
	if (Math.abs(lastValue) > 1e10) {
		return lastValue > 0 ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}

	// Une oscillation n'est ni une limite finie ni une limite nulle : chaque
	// côté doit se stabiliser.
	const settled = isSettled(sideValuesOf('right')) && isSettled(sideValuesOf('left'));
	if (!settled && !isZeroAtApproach) {
		return { type: 'unknown' };
	}

	// Check if values are converging toward 0
	const valuesDecreasingToZero =
		isZeroAtApproach ||
		testResults.every((r) => Math.abs(r.value) < 1e-3) ||
		(testResults.length >= 2 &&
			Math.abs(testResults[testResults.length - 1].value) < Math.abs(testResults[0].value) * 0.1);

	if (valuesDecreasingToZero || Math.abs(lastValue) < 1e-6) {
		// Determine sign based on the sign of values near the approach point
		if (direction === 'right') {
			const rightValues = testResults.filter((r) => r.epsilon > 0).map((r) => r.value);
			if (rightValues.length > 0) {
				return rightValues.every((v) => v >= 0) ? { type: 'zero-plus' } : { type: 'zero-minus' };
			}
		}
		if (direction === 'left') {
			const leftValues = testResults.map((r) => r.value);
			if (leftValues.length > 0) {
				return leftValues.every((v) => v >= 0) ? { type: 'zero-plus' } : { type: 'zero-minus' };
			}
		}
		// For 'both', check if both sides have same sign
		const allPositive = testResults.every((r) => r.value >= 0);
		const allNegative = testResults.every((r) => r.value < 0);
		if (allPositive) return { type: 'zero-plus' };
		if (allNegative) return { type: 'zero-minus' };
		return { type: 'zero' };
	}

	return { type: 'finite', value: lastValue };
}

/** Pas et nombre de points de la fenêtre : 16 × 0,5 = 8 > 2π. */
const OSCILLATION_STEP = 0.5;
const OSCILLATION_POINTS = 16;

/**
 * Le signe de f change-t-il sur une fenêtre de longueur 8 (> 2π) après chaque
 * point d'échantillonnage ? Trois points isolés peuvent tomber, par hasard,
 * du même côté d'une oscillation (−eˣ·cos 2x) : une période complète, non.
 * Les débordements (±Infinity) comptent avec leur signe.
 */
function oscillatesNear(expr: MathNode, varName: string, testValues: readonly number[]): boolean {
	for (const start of testValues) {
		const direction = Math.sign(start);
		let positiveSeen = false;
		let negativeSeen = false;
		for (let i = 0; i < OSCILLATION_POINTS; i++) {
			const value = evaluateNumeric(expr, varName, start + direction * i * OSCILLATION_STEP);
			if (value === null || Number.isNaN(value)) continue;
			if (value > 0) positiveSeen = true;
			if (value < 0) negativeSeen = true;
			if (positiveSeen && negativeSeen) return true;
		}
	}
	return false;
}

/** Fenêtre fine pour les creux : 64 × 0,125 = 8 > 2π. */
const DIP_STEP = 0.125;
const DIP_POINTS = 64;
/** Un point sous 1 % du maximum de |f| de CHAQUE côté : f retombe. */
const DIP_RATIO = 0.01;
/**
 * Départs de la fenêtre quand |f| déborde en 1e6 (eˣ·(1 − sin x)) : le creux
 * ne se mesure pas sur ±Infinity, il se mesure là où f est encore finie.
 */
const OVERFLOW_DIP_STARTS = [100, 300, 600];

/**
 * |f| retombe-t-il près de 0 sur une fenêtre de longueur 8 (> 2π) après un
 * point de départ ? x(1 + sin x) garde son signe (`oscillatesNear` ne voit
 * rien) mais s'annule en −π/2 + 2kπ : trois grandes valeurs ne prouvent pas
 * +∞. Un creux est un point où |f| tombe sous 1 % du maximum atteint AVANT
 * lui ET du maximum atteint APRÈS lui dans la fenêtre : une croissance
 * monotone, même rapide (eˣ, ×3000 sur la fenêtre), n'en a pas. Pas de
 * 0,125 : au pire un zéro double est manqué de 0,0625, et 1 + sin y vaut
 * alors ~0,002 — bien sous le seuil. Les fenêtres où f n'est pas finie
 * partout ne prouvent rien et sont ignorées.
 */
function dipsNear(expr: MathNode, varName: string, starts: readonly number[]): boolean {
	for (const start of starts) {
		const direction = Math.sign(start);
		const magnitudes: number[] = [];
		for (let i = 0; i < DIP_POINTS; i++) {
			const value = evaluateNumeric(expr, varName, start + direction * i * DIP_STEP);
			if (value === null || !Number.isFinite(value)) break;
			magnitudes.push(Math.abs(value));
		}
		if (magnitudes.length < DIP_POINTS) continue;
		if (hasDip(magnitudes)) return true;
	}
	return false;
}

/** Un point sous DIP_RATIO × le maximum de chaque côté. */
function hasDip(magnitudes: readonly number[]): boolean {
	const suffixMax: number[] = Array.from({ length: magnitudes.length }, () => 0);
	for (let i = magnitudes.length - 2; i >= 0; i--) {
		suffixMax[i] = Math.max(suffixMax[i + 1], magnitudes[i + 1]);
	}
	let prefixMax = 0;
	for (let i = 0; i < magnitudes.length; i++) {
		const neighbourMax = Math.min(prefixMax, suffixMax[i]);
		if (magnitudes[i] < neighbourMax * DIP_RATIO) return true;
		prefixMax = Math.max(prefixMax, magnitudes[i]);
	}
	return false;
}

/**
 * Classify at infinity.
 */
function classifyAtInfinity(expr: MathNode, varName: string, positive: boolean): SignedLimitValue {
	const testValues = positive ? [1e6, 1e8, 1e10] : [-1e6, -1e8, -1e10];
	const results: number[] = [];
	const overflows: number[] = [];

	for (const testVal of testValues) {
		const result = evaluateNumeric(expr, varName, testVal);
		if (result === Infinity || result === -Infinity) {
			overflows.push(result);
		} else if (result !== null && Number.isFinite(result)) {
			results.push(result);
		}
	}

	// Un débordement (e^(1e6) = Infinity) ne prouve qu'une chose : |f| est
	// immense. Son signe peut venir d'un facteur qui oscille — eˣ·sin x était
	// rendu −∞ parce que sin(1e6) < 0. On ne conclut ±∞ que si tous les
	// échantillons ET une fenêtre plus longue qu'une période gardent le signe.
	if (overflows.length > 0) {
		const samples = [...results, ...overflows];
		const sign = Math.sign(overflows[0]);
		if (samples.some((v) => Math.sign(v) !== sign)) return { type: 'unknown' };
		if (oscillatesNear(expr, varName, testValues)) return { type: 'unknown' };
		const dipStarts = OVERFLOW_DIP_STARTS.map((start) => (positive ? start : -start));
		if (dipsNear(expr, varName, dipStarts)) return { type: 'unknown' };
		return sign > 0 ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}

	if (results.length === 0) {
		return { type: 'unknown' };
	}

	const lastResult = results[results.length - 1];

	// x·sin x : |f| grandit mais le signe alterne — ni +∞ ni −∞
	if (changesSign(results)) {
		return { type: 'unknown' };
	}

	// Check if values are growing unboundedly (tending to infinity)
	// If |last| >> |first| and |last| is very large, it's tending to infinity
	if (results.length >= 2) {
		const firstAbs = Math.abs(results[0]);
		const lastAbs = Math.abs(lastResult);

		// If values are growing proportionally with test values, it's tending to infinity
		// e.g., for f(x) = x, results would be [1e6, 1e8, 1e10] - growing by 100x each time
		if (lastAbs > 1e8 && lastAbs > firstAbs * 10) {
			if (oscillatesNear(expr, varName, testValues)) return { type: 'unknown' };
			if (dipsNear(expr, varName, testValues)) return { type: 'unknown' };
			return lastResult > 0 ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
		}
	}

	// Check if approaching zero
	if (Math.abs(lastResult) < 1e-6) {
		return lastResult >= 0 ? { type: 'zero-plus' } : { type: 'zero-minus' };
	}

	// sin x en +∞ : des valeurs bornées qui ne se stabilisent pas
	if (!isSettled(results)) {
		return { type: 'unknown' };
	}

	// Otherwise it's a finite limit
	return { type: 'finite', value: lastResult };
}

// =============================================================================
// Sign Propagation Rules
// =============================================================================

/**
 * Get the sign of 1/x when x approaches the given signed value.
 *
 * 1/0+ = +infinity
 * 1/0- = -infinity
 * 1/+infinity = 0+
 * 1/-infinity = 0-
 */
export function reciprocalSign(value: SignedLimitValue): SignedLimitValue {
	switch (value.type) {
		case 'zero-plus':
			return { type: 'pos-infinity' };
		case 'zero-minus':
			return { type: 'neg-infinity' };
		case 'zero':
			return { type: 'unknown' }; // Need one-sided analysis
		case 'pos-infinity':
			return { type: 'zero-plus' };
		case 'neg-infinity':
			return { type: 'zero-minus' };
		case 'finite':
			return { type: 'finite', value: 1 / value.value };
		default:
			return { type: 'unknown' };
	}
}

/**
 * Get the sign of -x when x approaches the given signed value.
 *
 * -0+ = 0-
 * -0- = 0+
 * -(+infinity) = -infinity
 * -(-infinity) = +infinity
 */
export function negateSign(value: SignedLimitValue): SignedLimitValue {
	switch (value.type) {
		case 'zero-plus':
			return { type: 'zero-minus' };
		case 'zero-minus':
			return { type: 'zero-plus' };
		case 'zero':
			return { type: 'zero' };
		case 'pos-infinity':
			return { type: 'neg-infinity' };
		case 'neg-infinity':
			return { type: 'pos-infinity' };
		case 'finite':
			return { type: 'finite', value: -value.value };
		default:
			return { type: 'unknown' };
	}
}

/**
 * Get the sign of x^n when x approaches the given signed value.
 *
 * For even powers: result is always positive (0+ or +infinity)
 * For odd powers: sign is preserved
 */
export function powerSign(value: SignedLimitValue, exponent: number): SignedLimitValue {
	const isEven = exponent % 2 === 0;
	const isPositiveExp = exponent > 0;

	if (isEven) {
		// Even powers always produce positive results
		switch (value.type) {
			case 'zero-plus':
			case 'zero-minus':
			case 'zero':
				return { type: 'zero-plus' };
			case 'pos-infinity':
			case 'neg-infinity':
				return isPositiveExp ? { type: 'pos-infinity' } : { type: 'zero-plus' };
			case 'finite':
				return { type: 'finite', value: Math.pow(value.value, exponent) };
			default:
				return { type: 'unknown' };
		}
	} else {
		// Odd powers preserve sign
		switch (value.type) {
			case 'zero-plus':
				return { type: 'zero-plus' };
			case 'zero-minus':
				return { type: 'zero-minus' };
			case 'zero':
				return { type: 'zero' };
			case 'pos-infinity':
				return isPositiveExp ? { type: 'pos-infinity' } : { type: 'zero-plus' };
			case 'neg-infinity':
				return isPositiveExp ? { type: 'neg-infinity' } : { type: 'zero-minus' };
			case 'finite':
				return { type: 'finite', value: Math.pow(value.value, exponent) };
			default:
				return { type: 'unknown' };
		}
	}
}

/**
 * Get the sign of ln(x) when x approaches the given signed value.
 * Delegates to extended-arithmetic module.
 */
export function lnSign(value: SignedLimitValue): SignedLimitValue {
	if (value.type === 'unknown') return { type: 'unknown' };

	const node = signedValueToMathNode(value);
	if (!node) return { type: 'unknown' };

	const result = lnExtended(node);
	if (result.type === 'indeterminate') return { type: 'unknown' };
	return mathNodeToSignedValue(result.value);
}

/**
 * Get the sign of exp(x) when x approaches the given signed value.
 * Delegates to extended-arithmetic module.
 */
export function expSign(value: SignedLimitValue): SignedLimitValue {
	if (value.type === 'unknown') return { type: 'unknown' };

	const node = signedValueToMathNode(value);
	if (!node) return { type: 'unknown' };

	const result = expExtended(node);
	if (result.type === 'indeterminate') return { type: 'unknown' };
	return mathNodeToSignedValue(result.value);
}

/**
 * Get the sign of sqrt(x) when x approaches the given signed value.
 * Delegates to extended-arithmetic module.
 */
export function sqrtSign(value: SignedLimitValue): SignedLimitValue {
	if (value.type === 'unknown') return { type: 'unknown' };

	const node = signedValueToMathNode(value);
	if (!node) return { type: 'unknown' };

	const result = sqrtExtended(node);
	if (result.type === 'indeterminate') return { type: 'unknown' };
	return mathNodeToSignedValue(result.value);
}

// =============================================================================
// Binary Operations (Infinity Algebra)
// =============================================================================

/**
 * Result of a binary operation that may be indeterminate.
 */
export type BinaryOpResult =
	| SignedLimitValue
	| { readonly type: 'indeterminate'; readonly form: '∞-∞' | '0·∞' | '∞/∞' | '0/0' };

/**
 * Check if a binary operation result is indeterminate.
 */
export function isIndeterminate(
	result: BinaryOpResult
): result is { readonly type: 'indeterminate'; readonly form: '∞-∞' | '0·∞' | '∞/∞' | '0/0' } {
	return result.type === 'indeterminate';
}

/**
 * Add two signed limit values.
 * Delegates to extended-arithmetic module.
 */
export function addSigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aNode = signedValueToMathNode(a);
	const bNode = signedValueToMathNode(b);
	if (!aNode || !bNode) return { type: 'unknown' };

	return extendedResultToBinaryOp(addExtended(aNode, bNode));
}

/**
 * Subtract two signed limit values (a - b).
 * Delegates to extended-arithmetic module.
 */
export function subtractSigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aNode = signedValueToMathNode(a);
	const bNode = signedValueToMathNode(b);
	if (!aNode || !bNode) return { type: 'unknown' };

	return extendedResultToBinaryOp(subtractExtended(aNode, bNode));
}

/**
 * Multiply two signed limit values.
 * Delegates to extended-arithmetic module.
 */
export function multiplySigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aNode = signedValueToMathNode(a);
	const bNode = signedValueToMathNode(b);
	if (!aNode || !bNode) return { type: 'unknown' };

	return extendedResultToBinaryOp(multiplyExtended(aNode, bNode));
}

/**
 * Divide two signed limit values (a / b).
 * Delegates to extended-arithmetic module.
 */
export function divideSigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aNode = signedValueToMathNode(a);
	const bNode = signedValueToMathNode(b);
	if (!aNode || !bNode) return { type: 'unknown' };

	return extendedResultToBinaryOp(divideExtended(aNode, bNode));
}

/**
 * Convert a SignedLimitValue to a MathNode.
 * Uses SignedZeroNode for signed zeros, preserving sign information.
 */
export function signedValueToMathNode(value: SignedLimitValue): MathNode | null {
	switch (value.type) {
		case 'pos-infinity':
			return positiveInfinity();
		case 'neg-infinity':
			return negativeInfinity();
		case 'finite':
			// numericNode wraps negative values in opposite(...) (canonical form).
			return numericNode(value.value);
		case 'zero-plus':
			return zeroPlus();
		case 'zero-minus':
			return zeroMinus();
		case 'zero':
			return number('0');
		default:
			return null;
	}
}

/**
 * Convert a MathNode to a SignedLimitValue.
 */
export function mathNodeToSignedValue(node: MathNode): SignedLimitValue {
	// getNumericValue accepts both number('N') and opposite(number('N')) (canonical for negatives).
	const val = getNumericValue(node);
	if (val !== null) {
		if (val === 0) return { type: 'zero' };
		if (Number.isFinite(val)) return { type: 'finite', value: val };
		return { type: 'unknown' };
	}
	if (isInfinity(node)) {
		return node.sign === 'positive' ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}
	if (isSignedZeroNode(node)) {
		return node.sign === 'positive' ? { type: 'zero-plus' } : { type: 'zero-minus' };
	}
	return { type: 'unknown' };
}

/**
 * Convert ExtendedResult to BinaryOpResult.
 */
function extendedResultToBinaryOp(result: ExtendedResult): BinaryOpResult {
	if (result.type === 'indeterminate') {
		// Map indeterminate forms
		const form = result.form as IndeterminateForm;
		if (form === '0/0' || form === '∞/∞' || form === '0·∞' || form === '∞-∞') {
			return { type: 'indeterminate', form };
		}
		// For power-related forms, return unknown
		return { type: 'unknown' };
	}
	return mathNodeToSignedValue(result.value);
}

/**
 * Convert a SignedLimitValue to a MathNode for final output.
 * Unlike signedValueToMathNode, this converts signed zeros to regular numbers
 * since the final limit result should be a NumberNode, not a SignedZeroNode.
 */
export function signedValueToInfinity(value: SignedLimitValue): MathNode | null {
	switch (value.type) {
		case 'pos-infinity':
			return positiveInfinity();
		case 'neg-infinity':
			return negativeInfinity();
		case 'finite':
			// numericNode wraps negative values in opposite(...) (canonical form).
			return numericNode(value.value);
		case 'zero':
		case 'zero-plus':
		case 'zero-minus':
			return number('0'); // Convert to regular number for final output
		default:
			return null;
	}
}

/**
 * Check if a signed value represents infinity (positive or negative).
 */
export function isSignedInfinity(value: SignedLimitValue): boolean {
	return value.type === 'pos-infinity' || value.type === 'neg-infinity';
}

/**
 * Check if a signed value represents zero (any sign).
 */
export function isSignedZero(value: SignedLimitValue): boolean {
	return value.type === 'zero' || value.type === 'zero-plus' || value.type === 'zero-minus';
}
