/**
 * MathAST Normal Form - Extended Normalization for Limits
 *
 * Extends the normalize module to support InfinityNode and SignedZeroNode,
 * and detect indeterminate forms (0/0, ∞/∞, etc.) for limit calculations.
 *
 * The main export is `normalizeExtended()` which returns an ExtendedNormalizeResult
 * instead of just a NormalForm.
 */

import type { MathNode } from '../types';
import type { NormalForm, ExtendedNormalizeResult, NormalizeContext, Rational } from './types';
import type { IndeterminateForm } from '../eval/types';
import {
	isInfinity,
	isSignedZero,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isSuperscript,
	isFunction,
	isDelimiter
} from '../guards';
import { normalize, ZERO_NORMAL_FORM, ONE_NORMAL_FORM } from './normalize';
import {
	addPolynomials,
	mulPolynomials,
	negPolynomial,
	isZeroPolynomial,
	isOnePolynomial,
	isConstantPolynomial
} from './polynomial';
import { hashNormalForm } from './hash';
import { isNegative as isNegativeRational, rationalToNumber } from './rational';

// =============================================================================
// Result Constructors
// =============================================================================

function normalResult(form: NormalForm): ExtendedNormalizeResult {
	return { type: 'normal', form };
}

function infinityResult(sign: 'positive' | 'negative'): ExtendedNormalizeResult {
	return { type: 'infinity', sign };
}

function signedZeroResult(sign: 'positive' | 'negative'): ExtendedNormalizeResult {
	return { type: 'signed-zero', sign };
}

function indeterminateResult(form: IndeterminateForm): ExtendedNormalizeResult {
	return { type: 'indeterminate', form };
}

// =============================================================================
// Sign Helpers
// =============================================================================

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
// NormalForm Analysis Helpers
// =============================================================================

/**
 * Checks if a NormalForm represents zero.
 */
function isZeroNormalForm(form: NormalForm): boolean {
	return isZeroPolynomial(form.numerator);
}

/**
 * Checks if a NormalForm represents one.
 */
function isOneNormalForm(form: NormalForm): boolean {
	return isOnePolynomial(form.numerator) && isOnePolynomial(form.denominator);
}

/**
 * Gets the sign of a NormalForm that represents a constant.
 * Returns 1 for positive, -1 for negative, 0 for zero.
 * Returns null if the form is not a simple constant (contains variables).
 */
function getSignOfNormalForm(form: NormalForm): number | null {
	// Zero case
	if (isZeroPolynomial(form.numerator)) {
		return 0;
	}

	// Check if it's a constant (single term with no monomial in both num and den)
	if (
		form.numerator.length === 1 &&
		form.denominator.length === 1 &&
		form.numerator[0].monomial.length === 0 &&
		form.denominator[0].monomial.length === 0
	) {
		const numCoeff = form.numerator[0].coefficient;
		const denCoeff = form.denominator[0].coefficient;

		// Check if both are pure rationals
		if (numCoeff.terms.length === 1 && denCoeff.terms.length === 1) {
			const numTerm = numCoeff.terms[0];
			const denTerm = denCoeff.terms[0];

			if (numTerm.radicals.length === 0 && denTerm.radicals.length === 0) {
				const numSign = isNegativeRational(numTerm.rational) ? -1 : 1;
				const denSign = isNegativeRational(denTerm.rational) ? -1 : 1;
				return numSign * denSign;
			}
		}
	}

	// Cannot determine sign (contains variables or complex radicals)
	return null;
}

// =============================================================================
// Extended Result Predicates
// =============================================================================

/**
 * Checks if an ExtendedNormalizeResult represents zero (including signed zero).
 */
function isZeroExtended(r: ExtendedNormalizeResult): boolean {
	if (r.type === 'signed-zero') return true;
	if (r.type === 'normal') return isZeroNormalForm(r.form);
	return false;
}

/**
 * Checks if an ExtendedNormalizeResult represents one.
 */
function isOneExtended(r: ExtendedNormalizeResult): boolean {
	if (r.type === 'normal') return isOneNormalForm(r.form);
	return false;
}

/**
 * Checks if an ExtendedNormalizeResult is strictly positive.
 */
function isPositiveExtended(r: ExtendedNormalizeResult): boolean {
	if (r.type === 'infinity') return r.sign === 'positive';
	if (r.type === 'signed-zero') return false; // 0 is neither positive nor negative
	if (r.type === 'normal') {
		const sign = getSignOfNormalForm(r.form);
		return sign !== null && sign > 0;
	}
	return false;
}

/**
 * Checks if an ExtendedNormalizeResult is strictly negative.
 */
function isNegativeExtended(r: ExtendedNormalizeResult): boolean {
	if (r.type === 'infinity') return r.sign === 'negative';
	if (r.type === 'signed-zero') return false;
	if (r.type === 'normal') {
		const sign = getSignOfNormalForm(r.form);
		return sign !== null && sign < 0;
	}
	return false;
}

/**
 * Gets the sign of an ExtendedNormalizeResult if determinable.
 * Returns 'positive', 'negative', or null if unknown.
 */
function _getSignExtended(r: ExtendedNormalizeResult): 'positive' | 'negative' | null {
	if (r.type === 'infinity') return r.sign;
	if (r.type === 'signed-zero') return r.sign;
	if (r.type === 'normal') {
		const sign = getSignOfNormalForm(r.form);
		if (sign === null) return null;
		if (sign > 0) return 'positive';
		if (sign < 0) return 'negative';
		return 'positive'; // Zero is treated as positive for sign purposes
	}
	return null;
}

/**
 * Extracts a numeric value from an ExtendedNormalizeResult if it represents a simple number.
 * Returns null if the result is not a simple numeric value.
 */
function getExponentValue(r: ExtendedNormalizeResult): number | null {
	if (r.type !== 'normal') return null;

	const numValue = rationalToNumber(getNormalFormValue(r.form));
	return numValue !== null && Number.isFinite(numValue) ? numValue : null;
}

/**
 * Gets the numeric value of a NormalForm if it represents a constant (no variables).
 * Returns a Rational or null if not a simple constant.
 */
function getNormalFormValue(form: NormalForm): Rational | null {
	// Check if both numerator and denominator are constant (no variables)
	if (!isConstantPolynomial(form.numerator) || !isConstantPolynomial(form.denominator)) {
		return null;
	}

	// Handle zero
	if (form.numerator.length === 0) {
		return { n: 0n, d: 1n };
	}

	if (form.numerator.length !== 1 || form.denominator.length !== 1) {
		return null;
	}

	const numTerm = form.numerator[0];
	const denTerm = form.denominator[0];

	// Check for pure constants (no variables)
	if (numTerm.monomial.length > 0 || denTerm.monomial.length > 0) {
		return null;
	}

	// Check for single rational terms (no radicals)
	if (numTerm.coefficient.terms.length !== 1 || denTerm.coefficient.terms.length !== 1) {
		return null;
	}

	const numAlgTerm = numTerm.coefficient.terms[0];
	const denAlgTerm = denTerm.coefficient.terms[0];

	if (numAlgTerm.radicals.length > 0 || denAlgTerm.radicals.length > 0) {
		return null;
	}

	// Combine the rationals: (numAlg.rational) / (denAlg.rational)
	const numRat = numAlgTerm.rational;
	const denRat = denAlgTerm.rational;

	// (a/b) / (c/d) = (a*d) / (b*c)
	return {
		n: numRat.n * denRat.d,
		d: numRat.d * denRat.n
	};
}

// =============================================================================
// Extended Arithmetic Operations
// =============================================================================

/**
 * Negates an extended result.
 */
function negExtended(a: ExtendedNormalizeResult): ExtendedNormalizeResult {
	if (a.type === 'indeterminate') return a;

	if (a.type === 'infinity') {
		return infinityResult(flipSign(a.sign));
	}

	if (a.type === 'signed-zero') {
		return signedZeroResult(flipSign(a.sign));
	}

	// Normal form: negate the polynomial
	const negNum = negPolynomial(a.form.numerator);
	const newForm: NormalForm = {
		numerator: negNum,
		denominator: a.form.denominator,
		hash: hashNormalForm({ numerator: negNum, denominator: a.form.denominator, hash: '' })
	};
	return normalResult(newForm);
}

/**
 * Adds two extended results.
 */
function addExtended(
	a: ExtendedNormalizeResult,
	b: ExtendedNormalizeResult
): ExtendedNormalizeResult {
	// Propagate indeterminate
	if (a.type === 'indeterminate') return a;
	if (b.type === 'indeterminate') return b;

	// ∞ + ∞
	if (a.type === 'infinity' && b.type === 'infinity') {
		if (a.sign === b.sign) return a;
		return indeterminateResult('∞-∞');
	}

	// ∞ + finite = ∞
	if (a.type === 'infinity') return a;
	if (b.type === 'infinity') return b;

	// 0± + 0±
	if (a.type === 'signed-zero' && b.type === 'signed-zero') {
		if (a.sign === b.sign) return a;
		return normalResult(ZERO_NORMAL_FORM);
	}

	// 0± + normal
	if (a.type === 'signed-zero' && b.type === 'normal') {
		if (isZeroNormalForm(b.form)) return a;
		return b;
	}
	if (a.type === 'normal' && b.type === 'signed-zero') {
		if (isZeroNormalForm(a.form)) return b;
		return a;
	}

	// normal + normal
	if (a.type === 'normal' && b.type === 'normal') {
		// Add the fractions: a.num/a.den + b.num/b.den = (a.num*b.den + b.num*a.den) / (a.den*b.den)
		const crossNum1 = mulPolynomials(a.form.numerator, b.form.denominator);
		const crossNum2 = mulPolynomials(b.form.numerator, a.form.denominator);
		const newNum = addPolynomials(crossNum1, crossNum2);
		const newDen = mulPolynomials(a.form.denominator, b.form.denominator);
		const newForm: NormalForm = {
			numerator: newNum,
			denominator: newDen,
			hash: hashNormalForm({ numerator: newNum, denominator: newDen, hash: '' })
		};
		return normalResult(newForm);
	}

	throw new Error('Unhandled case in addExtended');
}

/**
 * Subtracts two extended results.
 */
function subExtended(
	a: ExtendedNormalizeResult,
	b: ExtendedNormalizeResult
): ExtendedNormalizeResult {
	return addExtended(a, negExtended(b));
}

/**
 * Multiplies two extended results.
 */
function mulExtended(
	a: ExtendedNormalizeResult,
	b: ExtendedNormalizeResult
): ExtendedNormalizeResult {
	// Propagate indeterminate
	if (a.type === 'indeterminate') return a;
	if (b.type === 'indeterminate') return b;

	// Check for 0 × ∞ = indeterminate
	const aIsZero = isZeroExtended(a);
	const bIsZero = isZeroExtended(b);
	const aIsInf = a.type === 'infinity';
	const bIsInf = b.type === 'infinity';

	if ((aIsZero && bIsInf) || (aIsInf && bIsZero)) {
		return indeterminateResult('0·∞');
	}

	// ∞ × ∞
	if (aIsInf && bIsInf) {
		return infinityResult(multiplySign(a.sign, b.sign));
	}

	// ∞ × finite (≠0)
	if (aIsInf && b.type === 'normal') {
		const bSign = getSignOfNormalForm(b.form);
		if (bSign === 0) return indeterminateResult('0·∞');
		if (bSign === null) {
			// Cannot determine sign - treat as symbolic infinity
			// For now, assume positive if we can't determine
			return infinityResult(a.sign);
		}
		const sign = bSign > 0 ? a.sign : flipSign(a.sign);
		return infinityResult(sign);
	}
	if (a.type === 'normal' && bIsInf) {
		return mulExtended(b, a); // Symmetric
	}

	// 0± × 0±
	if (a.type === 'signed-zero' && b.type === 'signed-zero') {
		return signedZeroResult(multiplySign(a.sign, b.sign));
	}

	// 0± × finite (≠0)
	if (a.type === 'signed-zero' && b.type === 'normal') {
		const bSign = getSignOfNormalForm(b.form);
		if (bSign === 0) return normalResult(ZERO_NORMAL_FORM);
		if (bSign === null) return signedZeroResult(a.sign);
		const sign = bSign > 0 ? a.sign : flipSign(a.sign);
		return signedZeroResult(sign);
	}
	if (a.type === 'normal' && b.type === 'signed-zero') {
		return mulExtended(b, a);
	}

	// normal × normal
	if (a.type === 'normal' && b.type === 'normal') {
		const newNum = mulPolynomials(a.form.numerator, b.form.numerator);
		const newDen = mulPolynomials(a.form.denominator, b.form.denominator);
		const newForm: NormalForm = {
			numerator: newNum,
			denominator: newDen,
			hash: hashNormalForm({ numerator: newNum, denominator: newDen, hash: '' })
		};
		return normalResult(newForm);
	}

	throw new Error('Unhandled case in mulExtended');
}

/**
 * Divides two extended results.
 */
function divExtended(
	num: ExtendedNormalizeResult,
	den: ExtendedNormalizeResult
): ExtendedNormalizeResult {
	// Propagate indeterminate
	if (num.type === 'indeterminate') return num;
	if (den.type === 'indeterminate') return den;

	// Check for 0/0 and ∞/∞
	const numIsZero = isZeroExtended(num);
	const denIsZero = isZeroExtended(den);
	const numIsInf = num.type === 'infinity';
	const denIsInf = den.type === 'infinity';

	if (numIsZero && denIsZero) {
		return indeterminateResult('0/0');
	}
	if (numIsInf && denIsInf) {
		return indeterminateResult('∞/∞');
	}

	// finite / 0± = ±∞
	if (num.type === 'normal' && !isZeroNormalForm(num.form) && den.type === 'signed-zero') {
		const numSign = getSignOfNormalForm(num.form);
		if (numSign === 0) return indeterminateResult('0/0');
		const sign = numSign === null ? den.sign : numSign > 0 ? den.sign : flipSign(den.sign);
		return infinityResult(sign);
	}

	// ∞ / 0± = ±∞
	if (numIsInf && den.type === 'signed-zero') {
		return infinityResult(multiplySign(num.sign, den.sign));
	}

	// finite / ∞ = 0±
	if (num.type === 'normal' && denIsInf) {
		const numSign = getSignOfNormalForm(num.form);
		const sign = numSign === null || numSign >= 0 ? den.sign : flipSign(den.sign);
		return signedZeroResult(sign);
	}

	// 0± / ∞ = 0±
	if (num.type === 'signed-zero' && denIsInf) {
		return signedZeroResult(multiplySign(num.sign, den.sign));
	}

	// ∞ / finite (≠0) = ±∞
	if (numIsInf && den.type === 'normal') {
		const denSign = getSignOfNormalForm(den.form);
		if (denSign === 0) return infinityResult(num.sign);
		const sign = denSign === null ? num.sign : denSign > 0 ? num.sign : flipSign(num.sign);
		return infinityResult(sign);
	}

	// 0± / finite (≠0) = 0±
	if (num.type === 'signed-zero' && den.type === 'normal') {
		const denSign = getSignOfNormalForm(den.form);
		if (denSign === 0) return indeterminateResult('0/0');
		const sign = denSign === null ? num.sign : denSign > 0 ? num.sign : flipSign(num.sign);
		return signedZeroResult(sign);
	}

	// normal / normal
	if (num.type === 'normal' && den.type === 'normal') {
		// Check for division by zero
		if (isZeroNormalForm(den.form)) {
			if (isZeroNormalForm(num.form)) {
				return indeterminateResult('0/0');
			}
			throw new Error('Division by zero without sign information');
		}

		// a/b ÷ c/d = (a*d) / (b*c)
		const newNum = mulPolynomials(num.form.numerator, den.form.denominator);
		const newDen = mulPolynomials(num.form.denominator, den.form.numerator);
		const newForm: NormalForm = {
			numerator: newNum,
			denominator: newDen,
			hash: hashNormalForm({ numerator: newNum, denominator: newDen, hash: '' })
		};
		return normalResult(newForm);
	}

	throw new Error('Unhandled case in divExtended');
}

/**
 * Computes power of two extended results.
 */
function powExtended(
	base: ExtendedNormalizeResult,
	exp: ExtendedNormalizeResult
): ExtendedNormalizeResult {
	// Propagate indeterminate
	if (base.type === 'indeterminate') return base;
	if (exp.type === 'indeterminate') return exp;

	// Check for indeterminate forms
	const baseIsZero = isZeroExtended(base);
	const expIsZero = isZeroExtended(exp);
	const baseIsInf = base.type === 'infinity';
	const expIsInf = exp.type === 'infinity';
	const baseIsOne = isOneExtended(base);

	// 0^0 is indeterminate
	if (baseIsZero && expIsZero) {
		return indeterminateResult('0^0');
	}

	// ∞^0 is indeterminate
	if (baseIsInf && expIsZero) {
		return indeterminateResult('∞^0');
	}

	// 1^∞ is indeterminate
	if (baseIsOne && expIsInf) {
		return indeterminateResult('1^∞');
	}

	// (0±)^(positive) - sign depends on base sign and exponent parity
	if (base.type === 'signed-zero' && isPositiveExtended(exp)) {
		// Get numeric exponent value to check parity
		const expValue = getExponentValue(exp);
		if (expValue !== null && Number.isInteger(expValue)) {
			// Even powers always give positive sign
			// Odd powers preserve the base sign
			const isEvenPower = expValue % 2 === 0;
			const resultSign = isEvenPower ? 'positive' : base.sign;
			return signedZeroResult(resultSign);
		}
		// Non-integer or unknown exponent - default to positive
		return signedZeroResult('positive');
	}

	// (0±)^(negative) - result is ±∞ depending on sign
	if (base.type === 'signed-zero' && isNegativeExtended(exp)) {
		// Get numeric exponent value to check parity
		const expValue = getExponentValue(exp);
		if (expValue !== null && Number.isInteger(expValue)) {
			// Even negative powers: 1/0² = +∞ always
			// Odd negative powers: 1/0⁺ = +∞, 1/0⁻ = -∞
			const isEvenPower = Math.abs(expValue) % 2 === 0;
			const resultSign = isEvenPower ? 'positive' : base.sign;
			return infinityResult(resultSign);
		}
		// Non-integer or unknown exponent - default to positive
		return infinityResult('positive');
	}

	// (+∞)^(positive) = +∞
	if (baseIsInf && base.sign === 'positive' && isPositiveExtended(exp)) {
		return infinityResult('positive');
	}

	// (+∞)^(negative) = 0⁺
	if (baseIsInf && base.sign === 'positive' && isNegativeExtended(exp)) {
		return signedZeroResult('positive');
	}

	// (+∞)^(+∞) = +∞
	if (baseIsInf && base.sign === 'positive' && expIsInf && exp.sign === 'positive') {
		return infinityResult('positive');
	}

	// (+∞)^(-∞) = 0⁺
	if (baseIsInf && base.sign === 'positive' && expIsInf && exp.sign === 'negative') {
		return signedZeroResult('positive');
	}

	// For normal^normal, delegate to regular normalize
	// This is a simplification - full implementation would handle more cases
	if (base.type === 'normal' && exp.type === 'normal') {
		// TODO: Implement proper power handling via normalize
		// For now, just return the base if exp is zero
		if (isZeroNormalForm(exp.form)) {
			return normalResult(ONE_NORMAL_FORM);
		}
		// Cannot easily compute power of normal forms
		throw new Error('Power of normal forms not yet implemented in normalizeExtended');
	}

	throw new Error('Unhandled case in powExtended');
}

/**
 * Applies a function to extended arguments.
 */
function applyFunctionExtended(
	name: string,
	args: ExtendedNormalizeResult[]
): ExtendedNormalizeResult {
	if (args.length === 0) {
		throw new Error(`Function ${name} requires at least one argument`);
	}

	const arg = args[0];

	// Propagate indeterminate
	if (arg.type === 'indeterminate') return arg;

	const lowerName = name.toLowerCase();

	switch (lowerName) {
		case 'ln':
		case 'log':
			// ln(0⁺) = -∞
			if (arg.type === 'signed-zero' && arg.sign === 'positive') {
				return infinityResult('negative');
			}
			// ln(0⁻) is complex
			if (arg.type === 'signed-zero' && arg.sign === 'negative') {
				throw new Error('ln of negative zero is complex');
			}
			// ln(+∞) = +∞
			if (arg.type === 'infinity' && arg.sign === 'positive') {
				return infinityResult('positive');
			}
			// ln(-∞) is complex
			if (arg.type === 'infinity' && arg.sign === 'negative') {
				throw new Error('ln of negative infinity is complex');
			}
			break;

		case 'exp':
			// exp(-∞) = 0⁺
			if (arg.type === 'infinity' && arg.sign === 'negative') {
				return signedZeroResult('positive');
			}
			// exp(+∞) = +∞
			if (arg.type === 'infinity' && arg.sign === 'positive') {
				return infinityResult('positive');
			}
			// exp(0±) = 1
			if (arg.type === 'signed-zero') {
				return normalResult(ONE_NORMAL_FORM);
			}
			break;

		case 'sqrt':
			// √(0±) = 0⁺
			if (arg.type === 'signed-zero') {
				return signedZeroResult('positive');
			}
			// √(+∞) = +∞
			if (arg.type === 'infinity' && arg.sign === 'positive') {
				return infinityResult('positive');
			}
			// √(-∞) is complex
			if (arg.type === 'infinity' && arg.sign === 'negative') {
				throw new Error('sqrt of negative infinity is complex');
			}
			break;

		case 'sin':
			// sin(±∞) oscillates
			if (arg.type === 'infinity') {
				throw new Error('sin(infinity) oscillates, no limit');
			}
			// sin(0±) = 0±
			if (arg.type === 'signed-zero') {
				return arg;
			}
			break;

		case 'cos':
			// cos(±∞) oscillates
			if (arg.type === 'infinity') {
				throw new Error('cos(infinity) oscillates, no limit');
			}
			// cos(0±) = 1
			if (arg.type === 'signed-zero') {
				return normalResult(ONE_NORMAL_FORM);
			}
			break;

		case 'tan':
			// tan(±∞) oscillates
			if (arg.type === 'infinity') {
				throw new Error('tan(infinity) oscillates, no limit');
			}
			break;

		case 'abs':
			if (arg.type === 'infinity') {
				return infinityResult('positive');
			}
			if (arg.type === 'signed-zero') {
				return signedZeroResult('positive');
			}
			break;
	}

	// For normal arguments, we would need to apply the function via normalize
	// This requires more complex handling
	if (arg.type === 'normal') {
		throw new Error(`Function ${name} with normal form argument not yet implemented`);
	}

	throw new Error(`Unhandled case for ${name} with argument type ${arg.type}`);
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Normalizes a MathNode with extended arithmetic support.
 *
 * Unlike regular normalize(), this function:
 * - Recognizes InfinityNode and SignedZeroNode
 * - Propagates extended values through operations
 * - Detects indeterminate forms (0/0, ∞/∞, etc.)
 * - Delegates to normalize() for normal algebraic expressions
 *
 * @param node - The MathNode to normalize
 * @param ctx - Optional normalization context for step recording
 * @returns An ExtendedNormalizeResult
 */
export function normalizeExtended(node: MathNode, ctx?: NormalizeContext): ExtendedNormalizeResult {
	// Handle InfinityNode
	if (isInfinity(node)) {
		return infinityResult(node.sign);
	}

	// Handle SignedZeroNode
	if (isSignedZero(node)) {
		return signedZeroResult(node.sign);
	}

	// Handle Addition
	if (isAddition(node)) {
		const left = normalizeExtended(node.left, ctx);
		const right = normalizeExtended(node.right, ctx);
		return addExtended(left, right);
	}

	// Handle Subtraction
	if (isSubtraction(node)) {
		const left = normalizeExtended(node.left, ctx);
		const right = normalizeExtended(node.right, ctx);
		return subExtended(left, right);
	}

	// Handle Multiplication
	if (isMultiplication(node)) {
		const left = normalizeExtended(node.left, ctx);
		const right = normalizeExtended(node.right, ctx);
		return mulExtended(left, right);
	}

	// Handle Division
	if (isDivision(node)) {
		const num = normalizeExtended(node.numerator, ctx);
		const den = normalizeExtended(node.denominator, ctx);
		return divExtended(num, den);
	}

	// Handle Opposite (negation)
	if (isOpposite(node)) {
		const operand = normalizeExtended(node.operand, ctx);
		return negExtended(operand);
	}

	// Handle Positive
	if (isPositive(node)) {
		return normalizeExtended(node.operand, ctx);
	}

	// Handle Superscript (power)
	if (isSuperscript(node)) {
		const base = normalizeExtended(node.base, ctx);
		const exp = normalizeExtended(node.superscript, ctx);
		return powExtended(base, exp);
	}

	// Handle Function
	if (isFunction(node)) {
		const args = node.args.map((arg) => normalizeExtended(arg, ctx));
		return applyFunctionExtended(node.name, args);
	}

	// Handle Delimiter (parentheses)
	if (isDelimiter(node)) {
		return normalizeExtended(node.content, ctx);
	}

	// For all other node types, delegate to regular normalize
	try {
		const form = normalize(node, ctx);
		return normalResult(form);
	} catch (e) {
		throw new Error(`Failed to normalize: ${e instanceof Error ? e.message : String(e)}`);
	}
}
