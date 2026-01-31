/**
 * L'Hôpital's Rule Implementation
 *
 * Applies L'Hôpital's rule for indeterminate forms 0/0 and ∞/∞.
 *
 * @module mathAST/limits/lhopital
 */

import type { MathNode, DivisionNode } from '../types';
import type { LimitDirection, LimitOptions, IndeterminateForm } from './types';
import { isDivision } from '../guards';
import { differentiate } from '../differentiation';
import { detectIndeterminateForm, classifyLimitValue } from './indeterminate';
import type { LimitStepRecorder } from './step-recorder';
import {
	tryEvaluateLimitExact,
	isZeroResult,
	isInfinityResult,
	resultToFiniteNode
} from './exact-evaluation';

// =============================================================================
// L'Hôpital's Rule
// =============================================================================

/**
 * Result of applying L'Hôpital's rule.
 */
export interface LhopitalResult {
	/** Whether L'Hôpital was applicable */
	readonly applicable: boolean;

	/** The resulting limit value (if found) */
	readonly value: MathNode | null;

	/** The transformed expression (f'/g') */
	readonly transformedExpr?: MathNode;

	/** Number of iterations used */
	readonly iterations: number;

	/** Indeterminate form that was resolved */
	readonly resolvedForm?: IndeterminateForm;

	/** Error message if not applicable */
	readonly error?: string;
}

/**
 * Apply L'Hôpital's rule to a division expression.
 *
 * L'Hôpital's rule states that for indeterminate forms 0/0 or ∞/∞:
 * lim(f/g) = lim(f'/g') if the latter limit exists.
 *
 * @param expr - The expression (must be a division)
 * @param varName - The variable approaching the limit
 * @param approach - The point being approached
 * @param direction - Direction of approach
 * @param recorder - Step recorder for pedagogical output
 * @param options - Limit evaluation options
 * @returns Result of applying L'Hôpital's rule
 */
export function applyLhopital(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder,
	options: Required<LimitOptions>
): LhopitalResult {
	// Must be a division
	if (!isDivision(expr)) {
		return {
			applicable: false,
			value: null,
			iterations: 0,
			error: "L'Hôpital's rule requires a quotient (division)"
		};
	}

	// Detect indeterminate form
	const form = detectIndeterminateForm(expr, varName, approach, direction);

	if (form !== '0/0' && form !== '∞/∞') {
		return {
			applicable: false,
			value: null,
			iterations: 0,
			error: `L'Hôpital's rule only applies to 0/0 or ∞/∞ forms, got ${form}`
		};
	}

	// Apply L'Hôpital iteratively
	let currentExpr: DivisionNode = expr;
	let iterations = 0;
	const maxIterations = options.maxLhopitalIterations;

	while (iterations < maxIterations) {
		iterations++;

		// Differentiate numerator and denominator
		let numDerivative: MathNode;
		let denDerivative: MathNode;

		try {
			numDerivative = differentiate(currentExpr.numerator, { variable: varName });
			denDerivative = differentiate(currentExpr.denominator, { variable: varName });
		} catch {
			return {
				applicable: true,
				value: null,
				iterations,
				resolvedForm: form,
				error: 'Could not differentiate expression'
			};
		}

		// Create the new quotient f'/g'
		const newExpr: DivisionNode = {
			type: 'division',
			numerator: numDerivative,
			denominator: denDerivative,
			displayStyle: 'fraction'
		};

		// Record step
		recorder.recordStep(
			'lhopital',
			`Application de la règle de L'Hôpital (forme ${form})`,
			currentExpr,
			newExpr,
			'detailed',
			undefined,
			`Dérivation: f' = d/d${varName}(f), g' = d/d${varName}(g)`
		);

		// Check if the new form is still indeterminate
		const newForm = detectIndeterminateForm(newExpr, varName, approach, direction);

		if (newForm === 'none') {
			// We can try direct evaluation
			const result = tryDirectEvaluation(newExpr, varName, approach, direction);
			if (result !== null) {
				recorder.recordStep(
					'lhopital',
					"Limite trouvée après application de la règle de L'Hôpital",
					newExpr,
					result,
					'summarized'
				);

				return {
					applicable: true,
					value: result,
					transformedExpr: newExpr,
					iterations,
					resolvedForm: form
				};
			}
		}

		if (newForm === '0/0' || newForm === '∞/∞') {
			// Still indeterminate, continue iterating
			currentExpr = newExpr;
			continue;
		}

		// Different indeterminate form or unknown - stop
		return {
			applicable: true,
			value: null,
			transformedExpr: newExpr,
			iterations,
			resolvedForm: form,
			error: `L'Hôpital led to form ${newForm}`
		};
	}

	// Max iterations reached
	return {
		applicable: true,
		value: null,
		iterations,
		resolvedForm: form,
		error: `Max L'Hôpital iterations (${maxIterations}) reached`
	};
}

/**
 * Check if L'Hôpital's rule is applicable to an expression.
 */
export function isLhopitalApplicable(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): boolean {
	if (!isDivision(expr)) {
		return false;
	}

	const form = detectIndeterminateForm(expr, varName, approach, direction);
	return form === '0/0' || form === '∞/∞';
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Try to evaluate a division directly at the limit point.
 * Uses exact evaluation first, with fallback to numeric heuristics.
 */
function tryDirectEvaluation(
	expr: DivisionNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	// Try exact evaluation first
	const exactResult = tryDirectEvaluationExact(expr, varName, approach, direction);
	if (exactResult !== null) {
		return exactResult;
	}

	// Fallback to numeric heuristics
	return tryDirectEvaluationNumeric(expr, varName, approach, direction);
}

/**
 * Try to evaluate a division using exact arithmetic.
 */
function tryDirectEvaluationExact(
	expr: DivisionNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	const numResult = tryEvaluateLimitExact(expr.numerator, varName, approach, direction);
	const denResult = tryEvaluateLimitExact(expr.denominator, varName, approach, direction);

	// Need both results
	if (!numResult || !denResult) {
		return null;
	}

	// Handle infinity/finite case → infinity
	if (isInfinityResult(numResult) && !isInfinityResult(denResult) && !isZeroResult(denResult)) {
		// Get denominator sign to determine final sign
		const denNode = resultToFiniteNode(denResult);
		const denNegative = denNode && denNode.type === 'number' && parseFloat(denNode.value) < 0;

		const numSign = numResult.sign;
		let finalSign: 'positive' | 'negative';
		if (numSign === 'positive') {
			finalSign = denNegative ? 'negative' : 'positive';
		} else {
			finalSign = denNegative ? 'positive' : 'negative';
		}
		return { type: 'infinity', sign: finalSign };
	}

	// Handle finite/infinity case → 0
	if (!isInfinityResult(numResult) && !isZeroResult(numResult) && isInfinityResult(denResult)) {
		return { type: 'number', value: '0' };
	}

	// Handle zero/finite case → 0
	if (isZeroResult(numResult) && !isZeroResult(denResult)) {
		return { type: 'number', value: '0' };
	}

	// Handle finite/finite case
	if (!isInfinityResult(numResult) && !isInfinityResult(denResult)) {
		const numNode = resultToFiniteNode(numResult);
		const denNode = resultToFiniteNode(denResult);

		if (numNode && denNode && numNode.type === 'number' && denNode.type === 'number') {
			const numVal = parseFloat(numNode.value);
			const denVal = parseFloat(denNode.value);

			if (denVal !== 0 && Number.isFinite(numVal) && Number.isFinite(denVal)) {
				const result = numVal / denVal;
				if (Number.isFinite(result)) {
					return { type: 'number', value: cleanNumberString(result) };
				}
			}
		}
	}

	return null;
}

/**
 * Try to evaluate a division using numeric heuristics (fallback).
 */
function tryDirectEvaluationNumeric(
	expr: DivisionNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	const numClass = classifyLimitValue(expr.numerator, varName, approach, direction);
	const denClass = classifyLimitValue(expr.denominator, varName, approach, direction);

	// Both have finite values
	if (
		numClass.numericValue !== undefined &&
		denClass.numericValue !== undefined &&
		denClass.numericValue !== 0
	) {
		const result = numClass.numericValue / denClass.numericValue;
		if (Number.isFinite(result)) {
			return { type: 'number', value: cleanNumberString(result) };
		}
	}

	// Numerator finite, denominator goes to infinity -> 0
	if (
		numClass.class === 'finite-nonzero' &&
		(denClass.class === 'positive-infinity' || denClass.class === 'negative-infinity')
	) {
		return { type: 'number', value: '0' };
	}

	// Handle zero numerator with finite non-zero denominator
	if (numClass.class === 'zero' && denClass.class === 'finite-nonzero') {
		return { type: 'number', value: '0' };
	}

	// Handle infinity numerator with finite non-zero denominator → infinity
	if (numClass.class === 'positive-infinity' && isFiniteClass(denClass.class)) {
		const sign =
			denClass.numericValue !== undefined && denClass.numericValue < 0 ? 'negative' : 'positive';
		return { type: 'infinity', sign };
	}
	if (numClass.class === 'negative-infinity' && isFiniteClass(denClass.class)) {
		const sign =
			denClass.numericValue !== undefined && denClass.numericValue < 0 ? 'positive' : 'negative';
		return { type: 'infinity', sign };
	}

	return null;
}

/**
 * Check if a limit value class represents a finite value.
 */
function isFiniteClass(cls: import('./indeterminate').LimitValueClass): boolean {
	return cls === 'zero' || cls === 'one' || cls === 'finite-nonzero';
}

/**
 * Clean a number string to avoid floating point artifacts.
 */
function cleanNumberString(value: number): string {
	// Check if it's close to a nice integer
	if (Math.abs(value - Math.round(value)) < 1e-10) {
		return String(Math.round(value));
	}

	// Check for common fractions
	const commonDenoms = [2, 3, 4, 5, 6, 8, 10];
	for (const d of commonDenoms) {
		const n = value * d;
		if (Math.abs(n - Math.round(n)) < 1e-10) {
			// Could return as fraction, but for simplicity return decimal
			return String(Math.round(n) / d);
		}
	}

	// Return with reasonable precision
	return value.toPrecision(10).replace(/\.?0+$/, '');
}

/**
 * Convert other indeterminate forms to 0/0 or ∞/∞ for L'Hôpital application.
 *
 * - 0 * ∞: Rewrite as f/g where g = 1/original_multiplier
 * - ∞ - ∞: Rewrite as single fraction
 * - 0^0, ∞^0, 1^∞: Take ln, apply L'Hôpital to exponent
 */
export function convertToLhopitalForm(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	const form = detectIndeterminateForm(expr, varName, approach, direction);

	if (form === '0*∞' && expr.type === 'multiplication') {
		// Convert f * g (where f → 0, g → ∞) to f / (1/g)
		const leftClass = classifyLimitValue(expr.left, varName, approach, direction);

		if (leftClass.class === 'zero') {
			// f → 0, g → ∞: rewrite as f / (1/g)
			return {
				type: 'division',
				numerator: expr.left,
				denominator: {
					type: 'division',
					numerator: { type: 'number', value: '1' },
					denominator: expr.right,
					displayStyle: 'fraction'
				},
				displayStyle: 'fraction'
			};
		} else {
			// g → 0, f → ∞: rewrite as g / (1/f)
			return {
				type: 'division',
				numerator: expr.right,
				denominator: {
					type: 'division',
					numerator: { type: 'number', value: '1' },
					denominator: expr.left,
					displayStyle: 'fraction'
				},
				displayStyle: 'fraction'
			};
		}
	}

	// For other forms, return null (not yet implemented)
	return null;
}
