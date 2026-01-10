/**
 * Algebraic Manipulation for Limits
 *
 * Provides algebraic strategies for limit evaluation:
 * - Factorization and cancellation
 * - Rationalization (multiply by conjugate)
 * - Dominant term extraction at infinity
 *
 * @module mathAST/limits/algebraic
 */

import type { MathNode } from '../types';
import type { LimitDirection } from './types';
import type { LimitStepRecorder } from './step-recorder';
import {
	isDivision,
	isAddition,
	isSubtraction,
	isSuperscript,
	isNumber,
	isVariable,
	isFunction,
	isInfinity
} from '../guards';
import { number, divide, multiply, subtract, add, power } from '../factory';

// =============================================================================
// Algebraic Manipulation Result
// =============================================================================

/**
 * Result of an algebraic manipulation.
 */
export interface AlgebraicResult {
	/** Whether manipulation was successful */
	readonly success: boolean;

	/** The simplified expression */
	readonly simplified?: MathNode;

	/** Technique used */
	readonly technique?: 'factorization' | 'rationalization' | 'dominant-term' | 'common-denominator';

	/** Description of the manipulation */
	readonly description?: string;
}

// =============================================================================
// Factorization
// =============================================================================

/**
 * Try to factor and cancel common terms in a division.
 *
 * This is useful for limits like (x² - 4)/(x - 2) as x → 2.
 *
 * @param expr - The division expression
 * @param varName - The variable
 * @param approach - The approach point
 * @param recorder - Step recorder
 */
export function tryFactorization(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorder
): AlgebraicResult {
	if (!isDivision(expr)) {
		return { success: false };
	}

	// Check if approach is a finite number
	if (!isNumber(approach)) {
		return { success: false };
	}

	const approachVal = parseFloat(approach.value);

	// Try to factor (x - a) from both numerator and denominator
	const numFactor = tryFactorLinear(expr.numerator, varName, approachVal);
	const denFactor = tryFactorLinear(expr.denominator, varName, approachVal);

	if (numFactor && denFactor) {
		// Cancel (x - a)
		const simplified = divide(numFactor.quotient, denFactor.quotient, 'fraction');

		recorder.recordStep(
			'factorization',
			`Factorisation par (${varName} - ${approach.value})`,
			expr,
			simplified,
			'detailed',
			undefined,
			'Annulation du facteur commun'
		);

		return {
			success: true,
			simplified,
			technique: 'factorization',
			description: `Factored out (${varName} - ${approach.value})`
		};
	}

	return { success: false };
}

/**
 * Try to factor (x - a) from an expression.
 */
function tryFactorLinear(
	expr: MathNode,
	varName: string,
	a: number
): { quotient: MathNode; multiplicity: number } | null {
	// Simple case: expr = x - a
	if (isSubtraction(expr)) {
		if (isVariable(expr.left) && expr.left.name === varName && isNumber(expr.right)) {
			if (parseFloat(expr.right.value) === a) {
				return { quotient: number('1'), multiplicity: 1 };
			}
		}
	}

	// Simple case: expr = x (for a = 0)
	if (isVariable(expr) && expr.name === varName && a === 0) {
		return { quotient: number('1'), multiplicity: 1 };
	}

	// Polynomial case: x² - a² = (x-a)(x+a)
	if (isSubtraction(expr) && isSuperscript(expr.left) && isNumber(expr.right)) {
		const base = expr.left.base;
		const exp = expr.left.superscript;

		if (isVariable(base) && base.name === varName && isNumber(exp) && exp.value === '2') {
			const aSquared = parseFloat(expr.right.value);
			if (Math.abs(aSquared - a * a) < 1e-10) {
				// x² - a² = (x-a)(x+a), quotient is (x+a)
				return {
					quotient: add(variable(varName), number(String(a))),
					multiplicity: 1
				};
			}
		}
	}

	// Quadratic that has a as a root: check if substituting a gives 0
	const valueAtA = evaluateSimple(expr, varName, a);
	if (valueAtA !== null && Math.abs(valueAtA) < 1e-10) {
		// This expression has a as a root, but we need to actually factor it
		// For now, return null (full polynomial factoring is complex)
		return null;
	}

	return null;
}

/**
 * Simple variable factory.
 */
function variable(name: string): MathNode {
	return { type: 'variable', name };
}

/**
 * Simple numeric evaluation.
 */
function evaluateSimple(expr: MathNode, varName: string, value: number): number | null {
	switch (expr.type) {
		case 'number':
			return parseFloat(expr.value);
		case 'variable':
			return expr.name === varName ? value : null;
		case 'addition': {
			const l = evaluateSimple(expr.left, varName, value);
			const r = evaluateSimple(expr.right, varName, value);
			return l !== null && r !== null ? l + r : null;
		}
		case 'subtraction': {
			const l = evaluateSimple(expr.left, varName, value);
			const r = evaluateSimple(expr.right, varName, value);
			return l !== null && r !== null ? l - r : null;
		}
		case 'multiplication': {
			const l = evaluateSimple(expr.left, varName, value);
			const r = evaluateSimple(expr.right, varName, value);
			return l !== null && r !== null ? l * r : null;
		}
		case 'division': {
			const n = evaluateSimple(expr.numerator, varName, value);
			const d = evaluateSimple(expr.denominator, varName, value);
			return n !== null && d !== null && d !== 0 ? n / d : null;
		}
		case 'superscript': {
			const b = evaluateSimple(expr.base, varName, value);
			const e = evaluateSimple(expr.superscript, varName, value);
			return b !== null && e !== null ? Math.pow(b, e) : null;
		}
		default:
			return null;
	}
}

// =============================================================================
// Rationalization
// =============================================================================

/**
 * Try to rationalize an expression by multiplying by conjugate.
 *
 * Useful for limits like (√(x+1) - 1)/x as x → 0.
 *
 * @param expr - The expression
 * @param varName - The variable
 * @param approach - The approach point
 * @param recorder - Step recorder
 */
export function tryRationalization(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorder
): AlgebraicResult {
	if (!isDivision(expr)) {
		return { success: false };
	}

	// Look for √a - √b or √a - c in numerator
	const conjugateInfo = findConjugate(expr.numerator);
	if (!conjugateInfo) {
		return { success: false };
	}

	// Multiply numerator and denominator by conjugate
	const { conjugate, expanded } = conjugateInfo;

	const newNumerator = expanded; // (√a - b)(√a + b) = a - b²
	const newDenominator = multiply(expr.denominator, conjugate, 'implicit');

	const simplified = divide(newNumerator, newDenominator, 'fraction');

	recorder.recordStep(
		'rationalization',
		'Rationalisation (multiplication par le conjugué)',
		expr,
		simplified,
		'detailed',
		conjugate,
		'Multiplication du numérateur et du dénominateur par le conjugué'
	);

	return {
		success: true,
		simplified,
		technique: 'rationalization',
		description: 'Multiplied by conjugate'
	};
}

/**
 * Find conjugate for rationalization.
 */
function findConjugate(expr: MathNode): { conjugate: MathNode; expanded: MathNode } | null {
	// Look for √a - b
	if (isSubtraction(expr)) {
		if (isSqrt(expr.left) && !isSqrt(expr.right)) {
			// √a - b → conjugate is √a + b
			// (√a - b)(√a + b) = a - b²
			const sqrtArg = getSqrtArg(expr.left);
			if (sqrtArg) {
				const conjugate = add(expr.left, expr.right);
				const expanded = subtract(
					sqrtArg,
					isSuperscript(expr.right) ? expr.right : power(expr.right, number('2'))
				);
				return { conjugate, expanded };
			}
		}

		// b - √a → conjugate is b + √a
		if (!isSqrt(expr.left) && isSqrt(expr.right)) {
			const sqrtArg = getSqrtArg(expr.right);
			if (sqrtArg) {
				const conjugate = add(expr.left, expr.right);
				const expanded = subtract(
					isSuperscript(expr.left) ? expr.left : power(expr.left, number('2')),
					sqrtArg
				);
				return { conjugate, expanded };
			}
		}
	}

	// Look for √a + b where we want √a - b
	if (isAddition(expr)) {
		if (isSqrt(expr.left) && !isSqrt(expr.right)) {
			const sqrtArg = getSqrtArg(expr.left);
			if (sqrtArg) {
				const conjugate = subtract(expr.left, expr.right);
				const expanded = subtract(
					sqrtArg,
					isSuperscript(expr.right) ? expr.right : power(expr.right, number('2'))
				);
				return { conjugate, expanded };
			}
		}
	}

	return null;
}

/**
 * Check if expression is a square root.
 */
function isSqrt(expr: MathNode): boolean {
	return (
		(isFunction(expr) && expr.name.toLowerCase() === 'sqrt') ||
		(isSuperscript(expr) &&
			isDivision(expr.superscript) &&
			isNumber(expr.superscript.numerator) &&
			expr.superscript.numerator.value === '1' &&
			isNumber(expr.superscript.denominator) &&
			expr.superscript.denominator.value === '2')
	);
}

/**
 * Get the argument of a square root.
 */
function getSqrtArg(expr: MathNode): MathNode | null {
	if (isFunction(expr) && expr.name.toLowerCase() === 'sqrt') {
		return expr.args[0];
	}
	if (isSuperscript(expr)) {
		return expr.base;
	}
	return null;
}

// =============================================================================
// Dominant Term Extraction (for limits at infinity)
// =============================================================================

/**
 * Extract dominant term for limits at infinity.
 *
 * For polynomials/rationals, factor out highest power from numerator and denominator.
 *
 * @param expr - The expression
 * @param varName - The variable
 * @param positive - Whether approaching +∞ (true) or -∞ (false)
 * @param recorder - Step recorder
 */
export function tryDominantTerm(
	expr: MathNode,
	varName: string,
	positive: boolean,
	recorder: LimitStepRecorder
): AlgebraicResult {
	if (!isDivision(expr)) {
		return { success: false };
	}

	const numDegree = getPolynomialDegree(expr.numerator, varName);
	const denDegree = getPolynomialDegree(expr.denominator, varName);

	if (numDegree === null || denDegree === null) {
		return { success: false };
	}

	const numLeading = getLeadingCoefficient(expr.numerator, varName);
	const denLeading = getLeadingCoefficient(expr.denominator, varName);

	if (numLeading === null || denLeading === null) {
		return { success: false };
	}

	let limitValue: MathNode;
	let description: string;

	if (numDegree > denDegree) {
		// Numerator dominates → ±∞
		const sign = numLeading * denLeading > 0 === positive ? 'positive' : 'negative';
		limitValue = { type: 'infinity', sign };
		description = `Degré numérateur (${numDegree}) > degré dénominateur (${denDegree})`;
	} else if (numDegree < denDegree) {
		// Denominator dominates → 0
		limitValue = number('0');
		description = `Degré numérateur (${numDegree}) < degré dénominateur (${denDegree})`;
	} else {
		// Same degree → ratio of leading coefficients
		const ratio = numLeading / denLeading;
		limitValue = number(String(ratio));
		description = `Même degré, rapport des coefficients dominants: ${numLeading}/${denLeading}`;
	}

	recorder.recordStep(
		'infinity-analysis',
		"Analyse du comportement à l'infini",
		expr,
		limitValue,
		'summarized',
		undefined,
		description
	);

	return {
		success: true,
		simplified: limitValue,
		technique: 'dominant-term',
		description
	};
}

/**
 * Get the polynomial degree of an expression.
 */
function getPolynomialDegree(expr: MathNode, varName: string): number | null {
	switch (expr.type) {
		case 'number':
			return 0;

		case 'variable':
			return expr.name === varName ? 1 : 0;

		case 'addition':
		case 'subtraction': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;
			return Math.max(leftDeg, rightDeg);
		}

		case 'multiplication': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;
			return leftDeg + rightDeg;
		}

		case 'superscript': {
			if (isVariable(expr.base) && expr.base.name === varName && isNumber(expr.superscript)) {
				const exp = parseFloat(expr.superscript.value);
				return Number.isInteger(exp) && exp >= 0 ? exp : null;
			}
			const baseDeg = getPolynomialDegree(expr.base, varName);
			if (baseDeg === null) return null;
			if (isNumber(expr.superscript)) {
				const exp = parseFloat(expr.superscript.value);
				return Number.isInteger(exp) && exp >= 0 ? baseDeg * exp : null;
			}
			return null;
		}

		case 'opposite':
		case 'positive':
			return getPolynomialDegree(expr.operand, varName);

		case 'delimiter':
			return getPolynomialDegree(expr.content, varName);

		default:
			return null;
	}
}

/**
 * Get the leading coefficient of a polynomial expression.
 */
function getLeadingCoefficient(expr: MathNode, varName: string): number | null {
	const degree = getPolynomialDegree(expr, varName);
	if (degree === null) return null;

	return extractLeadingCoeff(expr, varName, degree);
}

function extractLeadingCoeff(expr: MathNode, varName: string, targetDegree: number): number | null {
	switch (expr.type) {
		case 'number':
			return targetDegree === 0 ? parseFloat(expr.value) : 0;

		case 'variable':
			if (expr.name === varName) {
				return targetDegree === 1 ? 1 : 0;
			}
			return targetDegree === 0 ? 1 : 0;

		case 'addition': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;

			let coeff = 0;
			if (leftDeg === targetDegree) {
				const lc = extractLeadingCoeff(expr.left, varName, targetDegree);
				if (lc !== null) coeff += lc;
			}
			if (rightDeg === targetDegree) {
				const rc = extractLeadingCoeff(expr.right, varName, targetDegree);
				if (rc !== null) coeff += rc;
			}
			return coeff;
		}

		case 'subtraction': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;

			let coeff = 0;
			if (leftDeg === targetDegree) {
				const lc = extractLeadingCoeff(expr.left, varName, targetDegree);
				if (lc !== null) coeff += lc;
			}
			if (rightDeg === targetDegree) {
				const rc = extractLeadingCoeff(expr.right, varName, targetDegree);
				if (rc !== null) coeff -= rc;
			}
			return coeff;
		}

		case 'multiplication': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;

			if (leftDeg + rightDeg === targetDegree) {
				const lc = extractLeadingCoeff(expr.left, varName, leftDeg);
				const rc = extractLeadingCoeff(expr.right, varName, rightDeg);
				if (lc !== null && rc !== null) return lc * rc;
			}
			return 0;
		}

		case 'superscript': {
			if (isVariable(expr.base) && expr.base.name === varName && isNumber(expr.superscript)) {
				const exp = parseFloat(expr.superscript.value);
				return exp === targetDegree ? 1 : 0;
			}
			return null;
		}

		case 'opposite': {
			const inner = extractLeadingCoeff(expr.operand, varName, targetDegree);
			return inner !== null ? -inner : null;
		}

		case 'positive':
			return extractLeadingCoeff(expr.operand, varName, targetDegree);

		case 'delimiter':
			return extractLeadingCoeff(expr.content, varName, targetDegree);

		default:
			return null;
	}
}

// =============================================================================
// Main Algebraic Simplification Entry Point
// =============================================================================

/**
 * Try various algebraic manipulations to simplify a limit.
 *
 * @param expr - The expression
 * @param varName - The variable
 * @param approach - The approach point
 * @param direction - Direction of approach
 * @param recorder - Step recorder
 */
export function tryAlgebraicSimplification(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): AlgebraicResult {
	// Try factorization first (for finite approach points)
	if (isNumber(approach)) {
		const factResult = tryFactorization(expr, varName, approach, recorder);
		if (factResult.success) {
			return factResult;
		}

		// Try rationalization
		const ratResult = tryRationalization(expr, varName, approach, recorder);
		if (ratResult.success) {
			return ratResult;
		}
	}

	// Try dominant term extraction (for limits at infinity)
	if (isInfinity(approach)) {
		const domResult = tryDominantTerm(expr, varName, approach.sign === 'positive', recorder);
		if (domResult.success) {
			return domResult;
		}
	}

	return { success: false };
}
