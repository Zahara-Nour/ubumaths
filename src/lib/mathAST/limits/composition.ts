/**
 * Composition Limits
 *
 * Evaluates limits of composed functions using sign tracking.
 * Handles cases like:
 * - ln(f(x)) when f(x) → 0+ or f(x) → +∞
 * - 1/f(x) when f(x) → 0±
 * - sqrt(f(x)) behavior
 * - -f(x) negation
 * - f(x) when x → ±∞ (polynomials, exp, ln)
 *
 * @module mathAST/limits/composition
 */

import type { MathNode } from '../types';
import type { LimitDirection, LimitRule } from './types';
import type { LimitStepRecorder } from './step-recorder';
import {
	isNumber,
	isInfinity,
	isVariable,
	isDivision,
	isOpposite,
	isFunction,
	isSuperscript,
	isAddition,
	isSubtraction,
	isMultiplication
} from '../guards';
import { P, match, type Pattern } from '../pattern';
import { number, positiveInfinity } from '../factory';
import { differentiate } from '../differentiation';
import { substitute } from '../eval/substitute';
import { evaluate } from '../eval/evaluate';
import { nodesEqual } from '../pattern/match';
import {
	classifyWithSign,
	negateSign,
	lnSign,
	expSign,
	sqrtSign,
	signedValueToInfinity,
	isSignedInfinity,
	isSignedZero,
	// Binary operations (infinity algebra)
	addSigns,
	subtractSigns,
	multiplySigns,
	divideSigns,
	isIndeterminate,
	type SignedLimitValue
} from './sign-tracking';

// =============================================================================
// Types
// =============================================================================

export interface CompositionResult {
	readonly success: boolean;
	readonly value?: MathNode;
	readonly technique?: LimitRule;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Try to evaluate a limit using composition analysis.
 *
 * This handles cases where:
 * 1. The expression is a function of x approaching ±∞
 * 2. The expression is a composition f(g(x)) where g(x) → boundary
 * 3. The expression is a division 1/f(x) where f(x) → 0
 */
export function tryCompositionLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	// Strategy 1: Simple expressions at infinity
	if (isInfinity(approach)) {
		const result = tryElementaryAtInfinity(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 2: Function composition (ln, exp, sqrt of expression)
	if (isFunction(expr) && expr.args.length === 1) {
		const result = tryFunctionComposition(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 3: Division using infinity algebra
	if (isDivision(expr)) {
		const result = tryDivisionLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 4: Opposite (negation)
	if (isOpposite(expr)) {
		const result = tryOppositeLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 5: Addition using infinity algebra
	if (isAddition(expr)) {
		const result = tryAdditionLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 6: Subtraction using infinity algebra
	if (isSubtraction(expr)) {
		const result = trySubtractionLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 7: Multiplication using infinity algebra
	if (isMultiplication(expr)) {
		const result = tryMultiplicationLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 8: Known limits with substitution (e.g., (x-1)·ln(x-1) at x→1⁺)
	{
		const result = tryKnownLimitWithSubstitution(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 9: Derivative definition (f(x)-f(a))/(x-a) → f'(a) when x→a
	if (isDivision(expr) && !isInfinity(approach)) {
		const result = tryDerivativeDefinition(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	return { success: false };
}

// =============================================================================
// Elementary Functions at Infinity
// =============================================================================

/**
 * Evaluate elementary functions as x → ±∞.
 * Handles: x, x^n, exp(x), ln(x), and combinations.
 */
function tryElementaryAtInfinity(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isInfinity(approach)) return { success: false };

	const positive = approach.sign === 'positive';

	// Case 1: Variable x → ±∞
	if (isVariable(expr) && expr.name === varName) {
		const value: MathNode = positive
			? { type: 'infinity', sign: 'positive' }
			: { type: 'infinity', sign: 'negative' };

		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`La variable ${varName} tend vers ${positive ? '+∞' : '-∞'}`
		);

		return { success: true, value, technique: 'composition' };
	}

	// Case 2: Power x^n → ±∞
	if (isSuperscript(expr) && isVariable(expr.base) && expr.base.name === varName) {
		const exp = getNumericValue(expr.superscript);
		if (exp !== null && exp > 0 && Number.isInteger(exp)) {
			// x^n as x → ±∞
			// Even power: always +∞
			// Odd power: same sign as x
			const isEven = exp % 2 === 0;
			const resultSign = isEven || positive ? 'positive' : 'negative';
			const value: MathNode = { type: 'infinity', sign: resultSign };

			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`${varName}^${exp} tend vers ${resultSign === 'positive' ? '+∞' : '-∞'} quand ${varName} → ${positive ? '+∞' : '-∞'}`
			);

			return { success: true, value, technique: 'composition' };
		}
	}

	// Case 3: exp(x) as x → ±∞
	if (isFunction(expr) && expr.name.toLowerCase() === 'exp' && expr.args.length === 1) {
		const arg = expr.args[0];

		// exp(x) as x → +∞ → +∞
		if (isVariable(arg) && arg.name === varName && positive) {
			const value: MathNode = { type: 'infinity', sign: 'positive' };
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`exp(${varName}) tend vers +∞ quand ${varName} → +∞`
			);
			return { success: true, value, technique: 'composition' };
		}

		// exp(x) as x → -∞ → 0
		if (isVariable(arg) && arg.name === varName && !positive) {
			const value: MathNode = { type: 'number', value: '0' };
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`exp(${varName}) tend vers 0 quand ${varName} → -∞`
			);
			return { success: true, value, technique: 'composition' };
		}

		// exp(-x) as x → +∞ → 0
		if (isOpposite(arg) && isVariable(arg.operand) && arg.operand.name === varName && positive) {
			const value: MathNode = { type: 'number', value: '0' };
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`exp(-${varName}) tend vers 0 quand ${varName} → +∞`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	// Case 4: ln(x) as x → +∞ → +∞
	if (isFunction(expr) && expr.name.toLowerCase() === 'ln' && expr.args.length === 1) {
		const arg = expr.args[0];
		if (isVariable(arg) && arg.name === varName && positive) {
			const value: MathNode = { type: 'infinity', sign: 'positive' };
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`ln(${varName}) tend vers +∞ quand ${varName} → +∞`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	// Case 5: Sum/difference with dominant term at infinity
	if (isAddition(expr) || isSubtraction(expr)) {
		const result = tryDominantTermAtInfinity(expr, varName, approach, recorder);
		if (result.success) return result;
	}

	return { success: false };
}

/**
 * Find the dominant term in a sum/difference at infinity.
 */
function tryDominantTermAtInfinity(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isInfinity(approach)) return { success: false };

	const positive = approach.sign === 'positive';

	// Extract terms from the expression
	const terms = extractTerms(expr, varName);
	if (terms.length === 0) return { success: false };

	// Find the term with the highest degree
	let maxDegree = -Infinity;
	let dominantTerm: { coefficient: number; degree: number } | null = null;

	for (const term of terms) {
		if (term.degree > maxDegree) {
			maxDegree = term.degree;
			dominantTerm = term;
		}
	}

	if (dominantTerm === null || maxDegree <= 0) return { success: false };

	// Determine the sign of the limit
	const isEven = maxDegree % 2 === 0;
	const coeffSign = dominantTerm.coefficient >= 0;

	let resultSign: 'positive' | 'negative';
	if (positive) {
		// x → +∞: sign is coefficient sign
		resultSign = coeffSign ? 'positive' : 'negative';
	} else {
		// x → -∞: even power keeps coeff sign, odd power flips it
		resultSign = isEven === coeffSign ? 'positive' : 'negative';
	}

	const value: MathNode = { type: 'infinity', sign: resultSign };
	recorder.recordStepByRule(
		'infinity-analysis',
		expr,
		value,
		'summarized',
		approach,
		`Le terme dominant est de degré ${maxDegree}, la limite est ${resultSign === 'positive' ? '+∞' : '-∞'}`
	);

	return { success: true, value, technique: 'infinity-analysis' };
}

/**
 * Extract polynomial terms from an expression.
 */
function extractTerms(
	expr: MathNode,
	varName: string
): Array<{ coefficient: number; degree: number }> {
	const terms: Array<{ coefficient: number; degree: number }> = [];

	function extractFromNode(node: MathNode, sign: number): void {
		if (isVariable(node) && node.name === varName) {
			terms.push({ coefficient: sign, degree: 1 });
		} else if (isSuperscript(node) && isVariable(node.base) && node.base.name === varName) {
			const exp = getNumericValue(node.superscript);
			if (exp !== null && Number.isInteger(exp)) {
				terms.push({ coefficient: sign, degree: exp });
			}
		} else if (isOpposite(node)) {
			extractFromNode(node.operand, -sign);
		} else if (isMultiplication(node)) {
			// a * x^n
			const coeff = getNumericValue(node.left);
			if (coeff !== null) {
				if (isVariable(node.right) && node.right.name === varName) {
					terms.push({ coefficient: sign * coeff, degree: 1 });
				} else if (
					isSuperscript(node.right) &&
					isVariable(node.right.base) &&
					node.right.base.name === varName
				) {
					const exp = getNumericValue(node.right.superscript);
					if (exp !== null && Number.isInteger(exp)) {
						terms.push({ coefficient: sign * coeff, degree: exp });
					}
				}
			}
		} else if (isAddition(node)) {
			extractFromNode(node.left, sign);
			extractFromNode(node.right, sign);
		} else if (isSubtraction(node)) {
			extractFromNode(node.left, sign);
			extractFromNode(node.right, -sign);
		}
	}

	extractFromNode(expr, 1);
	return terms;
}

// =============================================================================
// Function Composition
// =============================================================================

/**
 * Handle function composition f(g(x)) where g(x) → boundary.
 */
function tryFunctionComposition(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isFunction(expr) || expr.args.length !== 1) return { success: false };

	const funcName = expr.name.toLowerCase();
	const innerExpr = expr.args[0];

	// Classify the inner expression's limit with sign tracking
	const innerLimit = classifyWithSign(innerExpr, varName, approach, direction);

	// Handle ln(g(x))
	if (funcName === 'ln') {
		const result = lnSign(innerLimit);
		const value = signedValueToInfinity(result);
		if (value && isSignedInfinity(result)) {
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				innerLimit.type === 'zero-plus'
					? `ln(0⁺) = -∞`
					: innerLimit.type === 'pos-infinity'
						? `ln(+∞) = +∞`
						: `Limite de ln par composition`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	// Handle exp(g(x))
	if (funcName === 'exp') {
		const result = expSign(innerLimit);
		const value = signedValueToInfinity(result);
		if (value) {
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`Limite de exp par composition`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	// Handle sqrt(g(x))
	if (funcName === 'sqrt') {
		const result = sqrtSign(innerLimit);
		const value = signedValueToInfinity(result);
		if (value) {
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`Limite de sqrt par composition`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	return { success: false };
}

// =============================================================================
// Opposite (Negation)
// =============================================================================

/**
 * Handle -f(x) where f(x) → ±∞.
 */
function tryOppositeLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isOpposite(expr)) return { success: false };

	const innerExpr = expr.operand;

	// Classify the inner expression's limit
	const innerLimit = classifyWithSign(innerExpr, varName, approach, direction);

	// Apply negation
	const result = negateSign(innerLimit);
	const value = signedValueToInfinity(result);

	if (value && isSignedInfinity(result)) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`Opposé de ${innerLimit.type === 'pos-infinity' ? '+∞' : '-∞'} = ${result.type === 'pos-infinity' ? '+∞' : '-∞'}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Addition with Infinity Algebra
// =============================================================================

/**
 * Handle a + b using infinity algebra.
 * Examples: ∞ + ∞ = ∞, ∞ + finite = ∞, ∞ + (-∞) = indeterminate
 */
function tryAdditionLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isAddition(expr)) return { success: false };

	const leftLimit = classifyWithSign(expr.left, varName, approach, direction);
	const rightLimit = classifyWithSign(expr.right, varName, approach, direction);

	// Only apply if at least one operand involves infinity or zero
	if (!needsInfinityAlgebra(leftLimit, rightLimit)) {
		return { success: false };
	}

	const result = addSigns(leftLimit, rightLimit);

	// If indeterminate, don't return a result - let other strategies handle it
	if (isIndeterminate(result)) {
		return { success: false };
	}

	const value = signedValueToInfinity(result);
	if (value) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`${formatSignedValue(leftLimit)} + ${formatSignedValue(rightLimit)} = ${formatSignedValue(result)}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Subtraction with Infinity Algebra
// =============================================================================

/**
 * Handle a - b using infinity algebra.
 * Examples: ∞ - (-∞) = ∞, ∞ - ∞ = indeterminate
 *
 * Also handles special ∞ - ∞ cases using algebraic techniques:
 * - √(x+a) - √x → 0 at x → +∞ (conjugate technique)
 */
function trySubtractionLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isSubtraction(expr)) return { success: false };

	const leftLimit = classifyWithSign(expr.left, varName, approach, direction);
	const rightLimit = classifyWithSign(expr.right, varName, approach, direction);

	// Check for ∞ - ∞ patterns at infinity
	if (
		isInfinity(approach) &&
		isSignedInfinity(leftLimit) &&
		isSignedInfinity(rightLimit) &&
		leftLimit.type === 'pos-infinity' &&
		rightLimit.type === 'pos-infinity'
	) {
		// Try √(x+a) - √x using conjugate technique
		const conjugateResult = tryDifferenceOfSqrtConjugate(expr, varName, approach, recorder);
		if (conjugateResult.success) return conjugateResult;

		// Try ln(f) - ln(g) = ln(f/g) technique
		const lnResult = tryDifferenceOfLn(expr, varName, approach, direction, recorder);
		if (lnResult.success) return lnResult;
	}

	// Only apply if at least one operand involves infinity or zero
	if (!needsInfinityAlgebra(leftLimit, rightLimit)) {
		return { success: false };
	}

	const result = subtractSigns(leftLimit, rightLimit);

	// If indeterminate, don't return a result - let other strategies handle it
	if (isIndeterminate(result)) {
		return { success: false };
	}

	const value = signedValueToInfinity(result);
	if (value) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`${formatSignedValue(leftLimit)} - ${formatSignedValue(rightLimit)} = ${formatSignedValue(result)}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Difference of Square Roots (Conjugate Technique)
// =============================================================================

/**
 * Handle √(f(x)) - √(g(x)) at infinity using the conjugate technique.
 *
 * Pattern: √(x+a) - √x at x → +∞
 * Technique: Multiply by conjugate (√(x+a) + √x) / (√(x+a) + √x)
 * Result: (x+a - x) / (√(x+a) + √x) = a / (√(x+a) + √x) → 0
 *
 * Also handles: √(x+a) - √(x+b) = (a-b) / (√(x+a) + √(x+b)) → 0
 */
function tryDifferenceOfSqrtConjugate(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isSubtraction(expr)) return { success: false };
	if (!isInfinity(approach) || approach.sign !== 'positive') return { success: false };

	const { left, right } = expr;

	// Both sides must be sqrt functions
	if (!isFunction(left) || left.name.toLowerCase() !== 'sqrt' || left.args.length !== 1) {
		return { success: false };
	}
	if (!isFunction(right) || right.name.toLowerCase() !== 'sqrt' || right.args.length !== 1) {
		return { success: false };
	}

	const leftArg = left.args[0]; // Under the first sqrt
	const rightArg = right.args[0]; // Under the second sqrt

	// Extract the "x + constant" pattern or just "x"
	const leftInfo = extractLinearPart(leftArg, varName);
	const rightInfo = extractLinearPart(rightArg, varName);

	if (!leftInfo.isLinear || !rightInfo.isLinear) {
		return { success: false };
	}

	// Both must have the same coefficient for x (usually 1)
	if (leftInfo.coefficient !== rightInfo.coefficient) {
		return { success: false };
	}

	// Using conjugate: √(x+a) - √(x+b) = (a-b) / (√(x+a) + √(x+b)) → 0 as x → +∞
	const value = number('0');

	recorder.recordStepByRule(
		'rationalization',
		expr,
		value,
		'detailed',
		approach,
		`Quantité conjuguée : √(${varName}+a) - √(${varName}+b) = (a-b) / (√(${varName}+a) + √(${varName}+b)) → 0 quand ${varName} → +∞`
	);

	return { success: true, value, technique: 'rationalization' };
}

/**
 * Extract linear part from expressions like:
 * - x → { isLinear: true, coefficient: 1, constant: 0 }
 * - x + 1 → { isLinear: true, coefficient: 1, constant: 1 }
 * - 2x + 3 → { isLinear: true, coefficient: 2, constant: 3 }
 */
function extractLinearPart(
	expr: MathNode,
	varName: string
): { isLinear: boolean; coefficient: number; constant: number } {
	// Case 1: Just the variable x
	if (isVariable(expr) && expr.name === varName) {
		return { isLinear: true, coefficient: 1, constant: 0 };
	}

	// Case 2: x + c or c + x
	if (isAddition(expr)) {
		const { left, right } = expr;

		// x + c
		if (isVariable(left) && left.name === varName) {
			const c = getNumericValue(right);
			if (c !== null) {
				return { isLinear: true, coefficient: 1, constant: c };
			}
		}

		// c + x
		if (isVariable(right) && right.name === varName) {
			const c = getNumericValue(left);
			if (c !== null) {
				return { isLinear: true, coefficient: 1, constant: c };
			}
		}
	}

	// Case 3: x - c
	if (isSubtraction(expr)) {
		const { left, right } = expr;

		if (isVariable(left) && left.name === varName) {
			const c = getNumericValue(right);
			if (c !== null) {
				return { isLinear: true, coefficient: 1, constant: -c };
			}
		}
	}

	return { isLinear: false, coefficient: 0, constant: 0 };
}

// =============================================================================
// Difference of Logarithms
// =============================================================================

/**
 * Handle ln(f(x)) - ln(g(x)) using the property ln(a) - ln(b) = ln(a/b).
 *
 * Pattern: ln(x+a) - ln(x) at x → +∞
 * Technique: ln(x+a) - ln(x) = ln((x+a)/x) = ln(1 + a/x) → ln(1) = 0
 *
 * Also handles: ln(ax) - ln(bx) = ln(a/b)
 */
function tryDifferenceOfLn(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isSubtraction(expr)) return { success: false };
	if (!isInfinity(approach) || approach.sign !== 'positive') return { success: false };

	const { left, right } = expr;

	// Both sides must be ln functions
	if (!isFunction(left) || left.name.toLowerCase() !== 'ln' || left.args.length !== 1) {
		return { success: false };
	}
	if (!isFunction(right) || right.name.toLowerCase() !== 'ln' || right.args.length !== 1) {
		return { success: false };
	}

	const leftArg = left.args[0]; // Under the first ln
	const rightArg = right.args[0]; // Under the second ln

	// Extract linear parts: x + a and x + b
	const leftInfo = extractLinearPart(leftArg, varName);
	const rightInfo = extractLinearPart(rightArg, varName);

	// Both must be linear in x with the same coefficient
	if (!leftInfo.isLinear || !rightInfo.isLinear) {
		return { success: false };
	}
	if (leftInfo.coefficient !== rightInfo.coefficient) {
		return { success: false };
	}

	// ln(x+a) - ln(x+b) = ln((x+a)/(x+b))
	// As x → +∞, (x+a)/(x+b) → 1 (same leading coefficient)
	// So ln((x+a)/(x+b)) → ln(1) = 0
	const value = number('0');

	recorder.recordStepByRule(
		'algebraic-simplification',
		expr,
		value,
		'detailed',
		approach,
		`Propriété du logarithme : ln(${varName}+a) - ln(${varName}+b) = ln((${varName}+a)/(${varName}+b)) → ln(1) = 0 quand ${varName} → +∞`
	);

	return { success: true, value, technique: 'algebraic-simplification' };
}

// =============================================================================
// Multiplication with Infinity Algebra
// =============================================================================

/**
 * Handle a * b using infinity algebra.
 * Examples: ∞ · ∞ = ∞, ∞ · 0 = indeterminate, ∞ · finite = ∞
 *
 * Also handles algebraic simplification:
 * - x * (1/x) = 1 (cancellation)
 * - x * (a/x) = a
 */
function tryMultiplicationLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isMultiplication(expr)) return { success: false };

	// First, check for algebraic cancellation pattern: x * (1/x) or x * (a/x)
	const cancellation = tryAlgebraicCancellation(expr, varName);
	if (cancellation.success && cancellation.simplified) {
		recorder.recordStepByRule(
			'algebraic-simplification',
			expr,
			cancellation.simplified,
			'summarized',
			approach,
			`Simplification algébrique : ${varName} · (1/${varName}) = 1`
		);
		// Return the simplified value (usually 1 or a constant)
		return { success: true, value: cancellation.simplified, technique: 'algebraic-simplification' };
	}

	const leftLimit = classifyWithSign(expr.left, varName, approach, direction);
	const rightLimit = classifyWithSign(expr.right, varName, approach, direction);

	// Only apply if at least one operand involves infinity or zero
	if (!needsInfinityAlgebra(leftLimit, rightLimit)) {
		return { success: false };
	}

	const result = multiplySigns(leftLimit, rightLimit);

	// If indeterminate, don't return a result - let other strategies handle it
	if (isIndeterminate(result)) {
		return { success: false };
	}

	const value = signedValueToInfinity(result);
	if (value) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`${formatSignedValue(leftLimit)} · ${formatSignedValue(rightLimit)} = ${formatSignedValue(result)}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Nested Fraction Simplification
// =============================================================================

/**
 * Simplify nested fractions: (a/b) / (c/d) = (ad) / (bc).
 *
 * Pattern: (1/x) / (1/x²) = x²/x = x
 * At x → +∞, this gives +∞.
 */
function tryNestedFractionSimplification(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isDivision(expr)) return { success: false };

	const { numerator, denominator } = expr;

	// Both numerator and denominator must be fractions
	if (!isDivision(numerator) || !isDivision(denominator)) {
		return { success: false };
	}

	// (a/b) / (c/d) = (a*d) / (b*c)
	const a = numerator.numerator;
	const b = numerator.denominator;
	const c = denominator.numerator;
	const d = denominator.denominator;

	// Create simplified expression: (a*d) / (b*c)
	const newNumerator: MathNode = { type: 'multiplication', left: a, right: d };
	const newDenominator: MathNode = { type: 'multiplication', left: b, right: c };

	// Try to further simplify by algebraic cancellation
	const simplifiedResult = tryAlgebraicCancellationInFraction(
		newNumerator,
		newDenominator,
		varName
	);

	if (simplifiedResult.simplified) {
		// Evaluate the limit of the simplified expression
		const simpLimit = classifyWithSign(simplifiedResult.result, varName, approach, direction);
		const value = signedValueToInfinity(simpLimit);

		if (value) {
			recorder.recordStepByRule(
				'algebraic-simplification',
				expr,
				value,
				'detailed',
				approach,
				`Simplification de fraction composée : (a/b)/(c/d) = (ad)/(bc) → ${formatSignedValue(simpLimit)}`
			);
			return { success: true, value, technique: 'algebraic-simplification' };
		}
	}

	return { success: false };
}

/**
 * Try algebraic cancellation within a fraction numerator/denominator.
 * Example: (1*x²) / (x*1) = x²/x = x
 */
function tryAlgebraicCancellationInFraction(
	num: MathNode,
	den: MathNode,
	varName: string
): { simplified: boolean; result: MathNode } {
	// Extract variable powers from numerator and denominator
	const numPower = extractVariablePower(num, varName);
	const denPower = extractVariablePower(den, varName);

	if (numPower !== null && denPower !== null) {
		const netPower = numPower - denPower;

		if (netPower > 0) {
			// Result is x^netPower
			if (netPower === 1) {
				return { simplified: true, result: { type: 'variable', name: varName } };
			} else {
				return {
					simplified: true,
					result: {
						type: 'superscript',
						base: { type: 'variable', name: varName },
						superscript: { type: 'number', value: String(netPower) }
					}
				};
			}
		} else if (netPower === 0) {
			// Result is 1
			return { simplified: true, result: { type: 'number', value: '1' } };
		} else {
			// Result is 1/x^(-netPower)
			const denom =
				-netPower === 1
					? { type: 'variable' as const, name: varName }
					: ({
							type: 'superscript' as const,
							base: { type: 'variable' as const, name: varName },
							superscript: { type: 'number' as const, value: String(-netPower) }
						} as MathNode);
			return {
				simplified: true,
				result: {
					type: 'division',
					numerator: { type: 'number', value: '1' },
					denominator: denom,
					style: 'fraction'
				}
			};
		}
	}

	return { simplified: false, result: num };
}

/**
 * Extract the power of the variable in an expression.
 * Returns null if the expression is not a simple variable power.
 *
 * Examples:
 * - x → 1
 * - x² → 2
 * - 1*x² → 2
 * - x*1 → 1
 */
function extractVariablePower(expr: MathNode, varName: string): number | null {
	// Case 1: Just x
	if (isVariable(expr) && expr.name === varName) {
		return 1;
	}

	// Case 2: x^n
	if (isSuperscript(expr) && isVariable(expr.base) && expr.base.name === varName) {
		const exp = getNumericValue(expr.superscript);
		return exp !== null && Number.isInteger(exp) ? exp : null;
	}

	// Case 3: a * x^n where a is a number
	if (isMultiplication(expr)) {
		const leftNum = getNumericValue(expr.left);
		const rightNum = getNumericValue(expr.right);

		// 1 * x^n or a * x^n
		if (leftNum !== null) {
			return extractVariablePower(expr.right, varName);
		}
		// x^n * 1 or x^n * a
		if (rightNum !== null) {
			return extractVariablePower(expr.left, varName);
		}

		// x * x = x² (both are variables)
		const leftPower = extractVariablePower(expr.left, varName);
		const rightPower = extractVariablePower(expr.right, varName);
		if (leftPower !== null && rightPower !== null) {
			return leftPower + rightPower;
		}
	}

	// Case 4: Just a number (power = 0)
	if (isNumber(expr)) {
		return 0;
	}

	return null;
}

// =============================================================================
// Division with Infinity Algebra
// =============================================================================

/**
 * Handle a / b using infinity algebra.
 * Examples: ∞ / ∞ = indeterminate, finite / ∞ = 0, ∞ / finite = ∞, finite / 0 = ∞
 *
 * Also handles nested fractions: (a/b) / (c/d) = (ad) / (bc)
 */
function tryDivisionLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isDivision(expr)) return { success: false };

	// First, try to simplify nested fractions: (a/b) / (c/d) = (ad) / (bc)
	const simplified = tryNestedFractionSimplification(expr, varName, approach, direction, recorder);
	if (simplified.success) return simplified;

	const numLimit = classifyWithSign(expr.numerator, varName, approach, direction);
	const denLimit = classifyWithSign(expr.denominator, varName, approach, direction);

	// Apply infinity algebra for division when:
	// - At least one operand is infinite, OR
	// - Denominator is zero (finite/0 = ∞)
	const numIsInf = isSignedInfinity(numLimit);
	const denIsInf = isSignedInfinity(denLimit);
	const denIsZero = isSignedZero(denLimit);

	if (!numIsInf && !denIsInf && !denIsZero) {
		return { success: false };
	}

	const result = divideSigns(numLimit, denLimit);

	// If indeterminate, don't return a result - let other strategies (L'Hôpital, etc.) handle it
	if (isIndeterminate(result)) {
		return { success: false };
	}

	const value = signedValueToInfinity(result);
	if (value) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`${formatSignedValue(numLimit)} / ${formatSignedValue(denLimit)} = ${formatSignedValue(result)}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Algebraic Cancellation
// =============================================================================

/**
 * Try to simplify x * (1/x) = 1 or similar patterns.
 *
 * Patterns handled:
 * - x * (1/x) = 1
 * - x * (a/x) = a
 * - (1/x) * x = 1
 * - (a/x) * x = a
 * - x^n * (1/x^n) = 1
 */
function tryAlgebraicCancellation(
	expr: MathNode,
	varName: string
): { success: boolean; simplified?: MathNode } {
	if (!isMultiplication(expr)) return { success: false };

	const { left, right } = expr;

	// Pattern 1: x * (a/x) or (a/x) * x
	// Check if left is x and right is (a/x)
	if (isVariable(left) && left.name === varName && isDivision(right)) {
		if (isVariable(right.denominator) && right.denominator.name === varName) {
			// x * (num/x) = num
			return { success: true, simplified: right.numerator };
		}
	}

	// Check if right is x and left is (a/x)
	if (isVariable(right) && right.name === varName && isDivision(left)) {
		if (isVariable(left.denominator) && left.denominator.name === varName) {
			// (num/x) * x = num
			return { success: true, simplified: left.numerator };
		}
	}

	// Pattern 2: x^n * (a/x^n)
	if (isSuperscript(left) && isVariable(left.base) && left.base.name === varName) {
		if (isDivision(right) && isSuperscript(right.denominator)) {
			const rightDenBase = right.denominator.base;
			const rightDenExp = right.denominator.superscript;
			if (
				isVariable(rightDenBase) &&
				rightDenBase.name === varName &&
				nodesEqual(left.superscript, rightDenExp)
			) {
				// x^n * (num/x^n) = num
				return { success: true, simplified: right.numerator };
			}
		}
	}

	// Pattern 2 reversed: (a/x^n) * x^n
	if (isSuperscript(right) && isVariable(right.base) && right.base.name === varName) {
		if (isDivision(left) && isSuperscript(left.denominator)) {
			const leftDenBase = left.denominator.base;
			const leftDenExp = left.denominator.superscript;
			if (
				isVariable(leftDenBase) &&
				leftDenBase.name === varName &&
				nodesEqual(right.superscript, leftDenExp)
			) {
				// (num/x^n) * x^n = num
				return { success: true, simplified: left.numerator };
			}
		}
	}

	return { success: false };
}

// =============================================================================
// Infinity Algebra Helpers
// =============================================================================

/**
 * Check if we need to apply infinity algebra.
 *
 * We only apply when at least one operand is INFINITE.
 * Cases with zeros (like 0·bounded) are left to other strategies (squeeze theorem, etc.)
 * unless paired with infinity (0·∞ = indeterminate).
 */
function needsInfinityAlgebra(a: SignedLimitValue, b: SignedLimitValue): boolean {
	const aIsInf = isSignedInfinity(a);
	const bIsInf = isSignedInfinity(b);

	// Apply if at least one is infinite
	if (aIsInf || bIsInf) return true;

	// Also apply for division by zero (finite / 0 = ∞)
	// This is handled separately in tryDivisionLimit

	return false;
}

/**
 * Format a SignedLimitValue for display in step messages.
 */
function formatSignedValue(
	value: SignedLimitValue | { type: 'indeterminate'; form: string }
): string {
	switch (value.type) {
		case 'pos-infinity':
			return '+∞';
		case 'neg-infinity':
			return '-∞';
		case 'zero-plus':
			return '0⁺';
		case 'zero-minus':
			return '0⁻';
		case 'zero':
			return '0';
		case 'finite':
			return String(value.value);
		case 'indeterminate':
			return `FI(${value.form})`;
		case 'unknown':
			return '?';
		default:
			return '?';
	}
}

// =============================================================================
// Known Limits with Substitution (using Pattern Matching)
// =============================================================================

/**
 * Composition limit patterns.
 * Each pattern uses the same wildcard 'u' for the repeated subexpression.
 * The pattern matches expressions like u·ln(u), u²·ln(u), etc.
 */
interface CompositionLimitPattern {
	/** Pattern with wildcard 'u' for the substituted subexpression */
	pattern: Pattern;
	/** What 'u' must approach for this limit to apply */
	uApproach: 'zero-right' | 'zero-left' | 'zero' | 'pos-infinity' | 'neg-infinity';
	/** The known limit value */
	value: MathNode;
	/** Description for pedagogical output */
	descriptionFr: string;
}

/**
 * Table of composition limit patterns using the Pattern Matching system.
 * These patterns detect expressions like (x-1)·ln(x-1) by matching u·ln(u)
 * and binding 'u' to the common subexpression.
 */
const COMPOSITION_LIMIT_PATTERNS: readonly CompositionLimitPattern[] = [
	// u·ln(u) → 0 when u → 0⁺ (croissance comparée)
	{
		pattern: P.mul(P._('u'), P.func('ln', [P._('u')])),
		uApproach: 'zero-right',
		value: number('0'),
		descriptionFr: 'Croissance comparée : u·ln(u) → 0 quand u → 0⁺'
	},
	// u²·ln(u) → 0 when u → 0⁺
	{
		pattern: P.mul(P.pow(P._('u'), P.num(2)), P.func('ln', [P._('u')])),
		uApproach: 'zero-right',
		value: number('0'),
		descriptionFr: 'Croissance comparée : u²·ln(u) → 0 quand u → 0⁺'
	},
	// √u·ln(u) → 0 when u → 0⁺
	{
		pattern: P.mul(P.func('sqrt', [P._('u')]), P.func('ln', [P._('u')])),
		uApproach: 'zero-right',
		value: number('0'),
		descriptionFr: 'Croissance comparée : √u·ln(u) → 0 quand u → 0⁺'
	},
	// u·e^u → 0 when u → -∞
	{
		pattern: P.mul(P._('u'), P.func('exp', [P._('u')])),
		uApproach: 'neg-infinity',
		value: number('0'),
		descriptionFr: 'Croissance comparée : u·e^u → 0 quand u → -∞'
	},
	// u²·e^u → 0 when u → -∞
	{
		pattern: P.mul(P.pow(P._('u'), P.num(2)), P.func('exp', [P._('u')])),
		uApproach: 'neg-infinity',
		value: number('0'),
		descriptionFr: 'Croissance comparée : u²·e^u → 0 quand u → -∞'
	},
	// u/e^u → 0 when u → +∞
	{
		pattern: P.div(P._('u'), P.func('exp', [P._('u')])),
		uApproach: 'pos-infinity',
		value: number('0'),
		descriptionFr: 'Croissance comparée : u/e^u → 0 quand u → +∞'
	},
	// u²/e^u → 0 when u → +∞
	{
		pattern: P.div(P.pow(P._('u'), P.num(2)), P.func('exp', [P._('u')])),
		uApproach: 'pos-infinity',
		value: number('0'),
		descriptionFr: 'Croissance comparée : u²/e^u → 0 quand u → +∞'
	},
	// ln(u)/u → 0 when u → +∞
	{
		pattern: P.div(P.func('ln', [P._('u')]), P._('u')),
		uApproach: 'pos-infinity',
		value: number('0'),
		descriptionFr: 'Croissance comparée : ln(u)/u → 0 quand u → +∞'
	},
	// ln(u)/u² → 0 when u → +∞
	{
		pattern: P.div(P.func('ln', [P._('u')]), P.pow(P._('u'), P.num(2))),
		uApproach: 'pos-infinity',
		value: number('0'),
		descriptionFr: 'Croissance comparée : ln(u)/u² → 0 quand u → +∞'
	},
	// e^u/u → +∞ when u → +∞
	{
		pattern: P.div(P.func('exp', [P._('u')]), P._('u')),
		uApproach: 'pos-infinity',
		value: positiveInfinity(),
		descriptionFr: 'Croissance comparée : e^u/u → +∞ quand u → +∞'
	},
	// e^u/u² → +∞ when u → +∞
	{
		pattern: P.div(P.func('exp', [P._('u')]), P.pow(P._('u'), P.num(2))),
		uApproach: 'pos-infinity',
		value: positiveInfinity(),
		descriptionFr: 'Croissance comparée : e^u/u² → +∞ quand u → +∞'
	}
];

/**
 * Try to match a known limit pattern by detecting a common subexpression.
 *
 * Uses the Pattern Matching system with wildcards. For example, the pattern
 * P.mul(P._('u'), P.func('ln', [P._('u')])) matches expressions like:
 * - x·ln(x)
 * - (x-1)·ln(x-1)
 * - (x²+1)·ln(x²+1)
 *
 * The wildcard 'u' must match the same subexpression in both positions.
 * After matching, we verify that 'u' approaches the required limit.
 */
function tryKnownLimitWithSubstitution(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	// Try each composition pattern
	for (const compPattern of COMPOSITION_LIMIT_PATTERNS) {
		const matchResult = match(compPattern.pattern, expr);

		if (matchResult.success) {
			// Extract the bound subexpression 'u'
			const uBinding = matchResult.bindings.get('u');
			if (!uBinding || !isMathNodeBinding(uBinding)) continue;

			// Classify what 'u' approaches
			const uLimit = classifyWithSign(uBinding, varName, approach, direction);

			// Check if 'u' approaches what the pattern requires
			if (matchesApproach(uLimit.type, compPattern.uApproach)) {
				recorder.recordStepByRule(
					'known-limit',
					expr,
					compPattern.value,
					'detailed',
					approach,
					`Substitution : soit u = ${formatNode(uBinding)}, alors u → ${formatApproachType(compPattern.uApproach)}. ${compPattern.descriptionFr}`
				);

				return { success: true, value: compPattern.value, technique: 'known-limit' };
			}
		}
	}

	return { success: false };
}

/**
 * Type guard to check if a binding is a MathNode (not a sequence binding).
 */
function isMathNodeBinding(binding: unknown): binding is MathNode {
	return (
		typeof binding === 'object' &&
		binding !== null &&
		'type' in binding &&
		typeof (binding as { type: unknown }).type === 'string'
	);
}

/**
 * Check if a SignedLimitValue type matches the required approach.
 */
function matchesApproach(
	actualType: SignedLimitValue['type'],
	required: CompositionLimitPattern['uApproach']
): boolean {
	switch (required) {
		case 'zero-right':
			return actualType === 'zero-plus';
		case 'zero-left':
			return actualType === 'zero-minus';
		case 'zero':
			return actualType === 'zero' || actualType === 'zero-plus' || actualType === 'zero-minus';
		case 'pos-infinity':
			return actualType === 'pos-infinity';
		case 'neg-infinity':
			return actualType === 'neg-infinity';
		default:
			return false;
	}
}

/**
 * Format a MathNode for display in step messages.
 */
function formatNode(node: MathNode): string {
	if (isVariable(node)) return node.name;
	if (isNumber(node)) return node.value;
	if (isSubtraction(node)) {
		if (isVariable(node.left) && isNumber(node.right)) {
			return `(${node.left.name} - ${node.right.value})`;
		}
		if (isNumber(node.left) && isVariable(node.right)) {
			return `(${node.left.value} - ${node.right.name})`;
		}
	}
	if (isAddition(node)) {
		if (isVariable(node.left) && isNumber(node.right)) {
			return `(${node.left.name} + ${node.right.value})`;
		}
	}
	return '(...)';
}

/**
 * Format an approach type for display.
 */
function formatApproachType(approach: CompositionLimitPattern['uApproach']): string {
	switch (approach) {
		case 'zero-right':
			return '0⁺';
		case 'zero-left':
			return '0⁻';
		case 'zero':
			return '0';
		case 'pos-infinity':
			return '+∞';
		case 'neg-infinity':
			return '-∞';
	}
}

// =============================================================================
// Derivative Definition Pattern
// =============================================================================

/**
 * Patterns for the derivative definition:
 * - (f - c) / (x - a) where f(a) = c
 * - (c - f) / (a - x) where f(a) = c (equivalent form)
 */
const DERIVATIVE_PATTERNS = {
	// (f - c) / (x - a)
	standard: P.div(P.sub(P._('f'), P._('c')), P.sub(P._('x', P.isVariable()), P._('a'))),
	// (c - f) / (a - x) = (f - c) / (x - a)
	reversed: P.div(P.sub(P._('c'), P._('f')), P.sub(P._('a'), P._('x', P.isVariable())))
};

/**
 * Try to recognize the derivative definition pattern:
 * lim(x→a) [f(x) - f(a)] / (x - a) = f'(a)
 *
 * This handles cases like:
 * - (x² - 4) / (x - 2) at x→2 = 2x|_{x=2} = 4
 * - (sin(x) - 0) / (x - 0) at x→0 = cos(0) = 1
 * - (e^x - 1) / (x - 0) at x→0 = e^0 = 1
 */
function tryDerivativeDefinition(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isDivision(expr)) return { success: false };

	// Try standard form: (f - c) / (x - a)
	let matchResult = match(DERIVATIVE_PATTERNS.standard, expr);

	if (!matchResult.success) {
		// Try reversed form: (c - f) / (a - x)
		matchResult = match(DERIVATIVE_PATTERNS.reversed, expr);
	}

	if (!matchResult.success) {
		return { success: false };
	}

	const bindings = matchResult.bindings;
	const f = bindings.get('f');
	const c = bindings.get('c');
	const x = bindings.get('x');
	const a = bindings.get('a');

	// All bindings must be MathNodes
	if (
		!isMathNodeBinding(f) ||
		!isMathNodeBinding(c) ||
		!isMathNodeBinding(x) ||
		!isMathNodeBinding(a)
	) {
		return { success: false };
	}

	// x must be the variable we're taking the limit of
	if (!isVariable(x) || x.name !== varName) {
		return { success: false };
	}

	// a must match the approach point
	if (!nodesEqual(a, approach)) {
		return { success: false };
	}

	// Verify that f(a) = c by substituting x = a into f
	try {
		const fAtA = substitute(f, { [varName]: approach });
		const fAtAResult = evaluate(fAtA);
		const cResult = evaluate(c);

		// Both evaluations must succeed
		if (fAtAResult.status !== 'value' || cResult.status !== 'value') {
			return { success: false };
		}

		// Check if f(a) equals c (allowing for numeric comparison)
		if (!areValuesEqual(fAtAResult.value, cResult.value)) {
			return { success: false };
		}

		// This is the derivative definition! Compute f'(a)
		const fPrime = differentiate(f, { variable: varName });
		const fPrimeAtA = substitute(fPrime, { [varName]: approach });
		const resultEval = evaluate(fPrimeAtA);

		// Evaluation must succeed
		if (resultEval.status !== 'value') {
			return { success: false };
		}

		// Convert evaluation result to MathNode
		const resultNode = evaluationResultToNode(resultEval.value);
		if (!resultNode) {
			return { success: false };
		}

		recorder.recordStepByRule(
			'derivative-definition',
			expr,
			resultNode,
			'detailed',
			approach,
			`Définition de la dérivée : lim [f(x) - f(a)] / (x - a) = f'(a) avec f(x) = ${formatNode(f)}, donc f'(${formatNode(approach)}) = ${formatNode(resultNode)}`
		);

		return { success: true, value: resultNode, technique: 'derivative-definition' as LimitRule };
	} catch {
		// Differentiation or evaluation failed
		return { success: false };
	}
}

/**
 * Check if two evaluated values are equal (handles numbers and special values).
 */
function areValuesEqual(a: unknown, b: unknown): boolean {
	// Both numbers
	if (typeof a === 'number' && typeof b === 'number') {
		return Math.abs(a - b) < 1e-10;
	}
	// Both MathNodes - use structural equality
	if (isMathNodeBinding(a) && isMathNodeBinding(b)) {
		return nodesEqual(a, b);
	}
	return false;
}

/**
 * Convert an evaluation result to a MathNode.
 */
function evaluationResultToNode(result: unknown): MathNode | null {
	if (typeof result === 'number') {
		if (!Number.isFinite(result)) {
			return result > 0
				? { type: 'infinity', sign: 'positive' }
				: { type: 'infinity', sign: 'negative' };
		}
		// Clean up floating point artifacts
		const cleaned = Math.abs(result - Math.round(result)) < 1e-10 ? Math.round(result) : result;
		return { type: 'number', value: String(cleaned) };
	}
	if (isMathNodeBinding(result)) {
		return result;
	}
	return null;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get numeric value from a MathNode.
 */
function getNumericValue(node: MathNode): number | null {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return Number.isFinite(val) ? val : null;
	}
	return null;
}
