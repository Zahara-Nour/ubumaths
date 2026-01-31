/**
 * Extended Arithmetic for Limit Calculations
 *
 * Handles arithmetic with signed zeros (0⁺, 0⁻) and infinities (±∞).
 * Used by the limits module to compute limits symbolically.
 *
 * @module mathAST/eval/extended-arithmetic
 */

import type { MathNode } from '../types';
import { isNumber, isInfinity, isSignedZero } from '../guards';
import { number, positiveInfinity, negativeInfinity, zeroPlus, zeroMinus } from '../factory';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of an extended arithmetic operation.
 * Can be a MathNode (number, infinity, signed-zero) or an indeterminate form.
 */
export type ExtendedResult =
	| { readonly type: 'value'; readonly value: MathNode }
	| { readonly type: 'indeterminate'; readonly form: IndeterminateForm };

export type IndeterminateForm = '0/0' | '∞/∞' | '0·∞' | '∞-∞' | '0^0' | '1^∞' | '∞^0';

// =============================================================================
// Helper Functions
// =============================================================================

function value(node: MathNode): ExtendedResult {
	return { type: 'value', value: node };
}

function indeterminate(form: IndeterminateForm): ExtendedResult {
	return { type: 'indeterminate', form };
}

function getNumberValue(node: MathNode): number | null {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return Number.isFinite(val) ? val : null;
	}
	return null;
}

function isZeroNumber(node: MathNode): boolean {
	if (isNumber(node)) {
		return parseFloat(node.value) === 0;
	}
	return false;
}

function flipSign(sign: 'positive' | 'negative'): 'positive' | 'negative' {
	return sign === 'positive' ? 'negative' : 'positive';
}

function multiplySign(
	a: 'positive' | 'negative',
	b: 'positive' | 'negative'
): 'positive' | 'negative' {
	return a === b ? 'positive' : 'negative';
}

// =============================================================================
// Addition
// =============================================================================

/**
 * Add two extended values.
 *
 * Rules:
 * - 0⁺ + 0⁺ = 0⁺
 * - 0⁺ + 0⁻ = 0 (exact)
 * - ∞ + finite = ∞
 * - +∞ + (-∞) = indeterminate (∞-∞)
 */
export function addExtended(a: MathNode, b: MathNode): ExtendedResult {
	// Both are regular numbers
	const aNum = getNumberValue(a);
	const bNum = getNumberValue(b);
	if (aNum !== null && bNum !== null) {
		return value(number((aNum + bNum).toString()));
	}

	// Infinity + Infinity
	if (isInfinity(a) && isInfinity(b)) {
		if (a.sign === b.sign) {
			return value(a); // +∞ + +∞ = +∞, -∞ + -∞ = -∞
		}
		return indeterminate('∞-∞'); // +∞ + (-∞)
	}

	// Infinity + finite/zero
	if (isInfinity(a)) {
		return value(a); // ∞ dominates
	}
	if (isInfinity(b)) {
		return value(b); // ∞ dominates
	}

	// SignedZero + SignedZero
	if (isSignedZero(a) && isSignedZero(b)) {
		if (a.sign === b.sign) {
			return value(a); // 0⁺ + 0⁺ = 0⁺
		}
		return value(number('0')); // 0⁺ + 0⁻ = 0
	}

	// SignedZero + finite
	if (isSignedZero(a) && bNum !== null) {
		return value(b); // 0± + n = n
	}
	if (isSignedZero(b) && aNum !== null) {
		return value(a); // n + 0± = n
	}

	// Zero + SignedZero
	if (isZeroNumber(a) && isSignedZero(b)) {
		return value(b);
	}
	if (isSignedZero(a) && isZeroNumber(b)) {
		return value(a);
	}

	// Fallback: can't compute
	return value(number('NaN'));
}

// =============================================================================
// Subtraction
// =============================================================================

/**
 * Subtract two extended values (a - b).
 */
export function subtractExtended(a: MathNode, b: MathNode): ExtendedResult {
	// Both are regular numbers
	const aNum = getNumberValue(a);
	const bNum = getNumberValue(b);
	if (aNum !== null && bNum !== null) {
		return value(number((aNum - bNum).toString()));
	}

	// Infinity - Infinity
	if (isInfinity(a) && isInfinity(b)) {
		if (a.sign !== b.sign) {
			return value(a); // +∞ - (-∞) = +∞, -∞ - (+∞) = -∞
		}
		return indeterminate('∞-∞'); // +∞ - +∞ or -∞ - -∞
	}

	// Infinity - finite
	if (isInfinity(a)) {
		return value(a);
	}
	// finite - Infinity
	if (isInfinity(b)) {
		return value(b.sign === 'positive' ? negativeInfinity() : positiveInfinity());
	}

	// SignedZero - SignedZero
	if (isSignedZero(a) && isSignedZero(b)) {
		if (a.sign === b.sign) {
			return value(number('0')); // 0⁺ - 0⁺ = 0
		}
		return value(a); // 0⁺ - 0⁻ = 0⁺
	}

	// SignedZero - finite or finite - SignedZero
	if (isSignedZero(a) && bNum !== null) {
		return value(number((-bNum).toString()));
	}
	if (aNum !== null && isSignedZero(b)) {
		return value(a);
	}

	return value(number('NaN'));
}

// =============================================================================
// Multiplication
// =============================================================================

/**
 * Multiply two extended values.
 *
 * Rules:
 * - 0± × ∞ = indeterminate (0·∞)
 * - 0⁺ × positive = 0⁺
 * - 0⁺ × negative = 0⁻
 * - ∞ × finite(≠0) = ∞ (with sign)
 */
export function multiplyExtended(a: MathNode, b: MathNode): ExtendedResult {
	// Both are regular numbers
	const aNum = getNumberValue(a);
	const bNum = getNumberValue(b);
	if (aNum !== null && bNum !== null) {
		return value(number((aNum * bNum).toString()));
	}

	// 0 × ∞ = indeterminate
	if ((isSignedZero(a) || isZeroNumber(a)) && isInfinity(b)) {
		return indeterminate('0·∞');
	}
	if (isInfinity(a) && (isSignedZero(b) || isZeroNumber(b))) {
		return indeterminate('0·∞');
	}

	// Infinity × Infinity
	if (isInfinity(a) && isInfinity(b)) {
		const sign = multiplySign(a.sign, b.sign);
		return value(sign === 'positive' ? positiveInfinity() : negativeInfinity());
	}

	// Infinity × finite (≠0)
	if (isInfinity(a) && bNum !== null && bNum !== 0) {
		const sign = bNum > 0 ? a.sign : flipSign(a.sign);
		return value(sign === 'positive' ? positiveInfinity() : negativeInfinity());
	}
	if (isInfinity(b) && aNum !== null && aNum !== 0) {
		const sign = aNum > 0 ? b.sign : flipSign(b.sign);
		return value(sign === 'positive' ? positiveInfinity() : negativeInfinity());
	}

	// SignedZero × SignedZero
	if (isSignedZero(a) && isSignedZero(b)) {
		const sign = multiplySign(a.sign, b.sign);
		return value(sign === 'positive' ? zeroPlus() : zeroMinus());
	}

	// SignedZero × finite (≠0)
	if (isSignedZero(a) && bNum !== null && bNum !== 0) {
		const sign = bNum > 0 ? a.sign : flipSign(a.sign);
		return value(sign === 'positive' ? zeroPlus() : zeroMinus());
	}
	if (isSignedZero(b) && aNum !== null && aNum !== 0) {
		const sign = aNum > 0 ? b.sign : flipSign(b.sign);
		return value(sign === 'positive' ? zeroPlus() : zeroMinus());
	}

	// Zero × anything finite = 0
	if (isZeroNumber(a) && bNum !== null) {
		return value(number('0'));
	}
	if (isZeroNumber(b) && aNum !== null) {
		return value(number('0'));
	}

	return value(number('NaN'));
}

// =============================================================================
// Division
// =============================================================================

/**
 * Divide two extended values (a / b).
 *
 * Rules:
 * - n / 0⁺ = +∞ (if n > 0), -∞ (if n < 0)
 * - n / 0⁻ = -∞ (if n > 0), +∞ (if n < 0)
 * - 0 / 0 = indeterminate
 * - ∞ / ∞ = indeterminate
 * - finite / ∞ = 0
 * - ∞ / finite = ∞
 */
export function divideExtended(a: MathNode, b: MathNode): ExtendedResult {
	// Both are regular numbers
	const aNum = getNumberValue(a);
	const bNum = getNumberValue(b);
	if (aNum !== null && bNum !== null) {
		if (bNum === 0) {
			if (aNum === 0) {
				return indeterminate('0/0');
			}
			// Should not happen if using SignedZero properly
			return value(number('NaN'));
		}
		return value(number((aNum / bNum).toString()));
	}

	// 0 / 0 = indeterminate (any combination)
	if ((isSignedZero(a) || isZeroNumber(a)) && (isSignedZero(b) || isZeroNumber(b))) {
		return indeterminate('0/0');
	}

	// ∞ / ∞ = indeterminate
	if (isInfinity(a) && isInfinity(b)) {
		return indeterminate('∞/∞');
	}

	// finite / 0± = ±∞
	if (aNum !== null && aNum !== 0 && isSignedZero(b)) {
		const sign = aNum > 0 ? b.sign : flipSign(b.sign);
		return value(sign === 'positive' ? positiveInfinity() : negativeInfinity());
	}

	// ∞ / 0± = ±∞
	if (isInfinity(a) && isSignedZero(b)) {
		const sign = multiplySign(a.sign, b.sign);
		return value(sign === 'positive' ? positiveInfinity() : negativeInfinity());
	}

	// finite / ∞ = 0±
	if (aNum !== null && isInfinity(b)) {
		const sign = aNum >= 0 ? b.sign : flipSign(b.sign);
		// Note: approaching 0 from the sign of (a/∞)
		return value(sign === 'positive' ? zeroPlus() : zeroMinus());
	}

	// 0± / ∞ = 0±
	if (isSignedZero(a) && isInfinity(b)) {
		const sign = multiplySign(a.sign, b.sign);
		return value(sign === 'positive' ? zeroPlus() : zeroMinus());
	}

	// ∞ / finite (≠0) = ±∞
	if (isInfinity(a) && bNum !== null && bNum !== 0) {
		const sign = bNum > 0 ? a.sign : flipSign(a.sign);
		return value(sign === 'positive' ? positiveInfinity() : negativeInfinity());
	}

	// 0± / finite (≠0) = 0±
	if (isSignedZero(a) && bNum !== null && bNum !== 0) {
		const sign = bNum > 0 ? a.sign : flipSign(a.sign);
		return value(sign === 'positive' ? zeroPlus() : zeroMinus());
	}

	// 0 / finite = 0
	if (isZeroNumber(a) && bNum !== null && bNum !== 0) {
		return value(number('0'));
	}

	return value(number('NaN'));
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Compute ln of an extended value.
 *
 * Rules:
 * - ln(0⁺) = -∞
 * - ln(0⁻) = undefined
 * - ln(+∞) = +∞
 * - ln(1) = 0
 */
export function lnExtended(arg: MathNode): ExtendedResult {
	if (isSignedZero(arg)) {
		if (arg.sign === 'positive') {
			return value(negativeInfinity()); // ln(0⁺) = -∞
		}
		// ln(0⁻) is undefined (complex)
		return value(number('NaN'));
	}

	if (isInfinity(arg)) {
		if (arg.sign === 'positive') {
			return value(positiveInfinity()); // ln(+∞) = +∞
		}
		// ln(-∞) is undefined
		return value(number('NaN'));
	}

	const num = getNumberValue(arg);
	if (num !== null) {
		if (num <= 0) {
			return value(number('NaN'));
		}
		return value(number(Math.log(num).toString()));
	}

	return value(number('NaN'));
}

/**
 * Compute exp of an extended value.
 *
 * Rules:
 * - exp(0⁺) = 1⁺ (approaching 1 from above)
 * - exp(0⁻) = 1⁻ (approaching 1 from below)
 * - exp(+∞) = +∞
 * - exp(-∞) = 0⁺
 */
export function expExtended(arg: MathNode): ExtendedResult {
	if (isInfinity(arg)) {
		if (arg.sign === 'positive') {
			return value(positiveInfinity()); // exp(+∞) = +∞
		}
		return value(zeroPlus()); // exp(-∞) = 0⁺
	}

	if (isSignedZero(arg)) {
		// exp(0±) ≈ 1 ± ε
		// For simplicity, return 1 (the limit)
		return value(number('1'));
	}

	const num = getNumberValue(arg);
	if (num !== null) {
		const result = Math.exp(num);
		if (!Number.isFinite(result)) {
			return value(result > 0 ? positiveInfinity() : negativeInfinity());
		}
		return value(number(result.toString()));
	}

	return value(number('NaN'));
}

/**
 * Compute sqrt of an extended value.
 *
 * Rules:
 * - sqrt(0⁺) = 0⁺
 * - sqrt(0⁻) = undefined
 * - sqrt(+∞) = +∞
 */
export function sqrtExtended(arg: MathNode): ExtendedResult {
	if (isSignedZero(arg)) {
		if (arg.sign === 'positive') {
			return value(zeroPlus()); // sqrt(0⁺) = 0⁺
		}
		return value(number('NaN')); // sqrt(0⁻) undefined
	}

	if (isInfinity(arg)) {
		if (arg.sign === 'positive') {
			return value(positiveInfinity()); // sqrt(+∞) = +∞
		}
		return value(number('NaN')); // sqrt(-∞) undefined
	}

	const num = getNumberValue(arg);
	if (num !== null) {
		if (num < 0) {
			return value(number('NaN'));
		}
		return value(number(Math.sqrt(num).toString()));
	}

	return value(number('NaN'));
}

/**
 * Compute sin of an extended value.
 *
 * Rules:
 * - sin(0⁺) = 0⁺
 * - sin(0⁻) = 0⁻
 * - sin(±∞) = undefined (oscillates)
 */
export function sinExtended(arg: MathNode): ExtendedResult {
	if (isSignedZero(arg)) {
		return value(arg); // sin(0±) = 0±
	}

	if (isInfinity(arg)) {
		return value(number('NaN')); // sin(∞) oscillates
	}

	const num = getNumberValue(arg);
	if (num !== null) {
		return value(number(Math.sin(num).toString()));
	}

	return value(number('NaN'));
}

/**
 * Compute cos of an extended value.
 *
 * Rules:
 * - cos(0±) = 1 (approaching from below: 1 - ε²/2)
 * - cos(±∞) = undefined (oscillates)
 */
export function cosExtended(arg: MathNode): ExtendedResult {
	if (isSignedZero(arg)) {
		return value(number('1')); // cos(0) = 1
	}

	if (isInfinity(arg)) {
		return value(number('NaN')); // cos(∞) oscillates
	}

	const num = getNumberValue(arg);
	if (num !== null) {
		return value(number(Math.cos(num).toString()));
	}

	return value(number('NaN'));
}

// =============================================================================
// Negation
// =============================================================================

/**
 * Negate an extended value.
 */
export function negateExtended(a: MathNode): ExtendedResult {
	if (isInfinity(a)) {
		return value(a.sign === 'positive' ? negativeInfinity() : positiveInfinity());
	}

	if (isSignedZero(a)) {
		return value(a.sign === 'positive' ? zeroMinus() : zeroPlus());
	}

	const num = getNumberValue(a);
	if (num !== null) {
		return value(number((-num).toString()));
	}

	return value(number('NaN'));
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if a result is an indeterminate form.
 */
export function isIndeterminateResult(
	result: ExtendedResult
): result is { type: 'indeterminate'; form: IndeterminateForm } {
	return result.type === 'indeterminate';
}

/**
 * Get the value from a result (throws if indeterminate).
 */
export function getResultValue(result: ExtendedResult): MathNode {
	if (result.type === 'indeterminate') {
		throw new Error(`Cannot get value from indeterminate form: ${result.form}`);
	}
	return result.value;
}
