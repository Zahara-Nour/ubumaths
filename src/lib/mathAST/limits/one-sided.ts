/**
 * One-Sided Limit Handling
 *
 * Provides utilities for analyzing left and right limits separately,
 * detecting discontinuities, and determining if two-sided limits exist.
 *
 * @module mathAST/limits/one-sided
 */

import type { MathNode } from '../types';
import type { LimitDirection, LimitResult, OneSidedLimitResult, LimitOptions } from './types';
import type { LimitStepRecorder } from './step-recorder';
import { isNumber, isInfinity } from '../guards';
import { classifyLimitValue } from './indeterminate';
import { structurallyEqual } from './known-limits';
import { substitute } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { computeDomain } from '../domain/compute';
import { containsValue } from '../domain/algebra';
import { ZERO_TOLERANCE } from '../common';

// =============================================================================
// One-Sided Limit Evaluation
// =============================================================================

/**
 * Evaluate both one-sided limits and determine if two-sided limit exists.
 *
 * @param evaluator - Function to evaluate a limit with given direction
 * @param expr - The expression
 * @param varName - The variable
 * @param approach - The approach point
 * @param options - Limit options
 * @returns One-sided limit results
 */
export function evaluateOneSidedLimits(
	evaluator: (
		expr: MathNode,
		varName: string,
		approach: MathNode,
		direction: LimitDirection,
		options: LimitOptions
	) => LimitResult,
	expr: MathNode,
	varName: string,
	approach: MathNode,
	options: LimitOptions
): OneSidedLimitResult {
	// Evaluate left limit
	const leftResult = evaluator(expr, varName, approach, 'left', options);

	// Evaluate right limit
	const rightResult = evaluator(expr, varName, approach, 'right', options);

	// Check if two-sided limit exists
	const twoSidedExists = checkLimitsEqual(leftResult, rightResult);

	return {
		left: leftResult,
		right: rightResult,
		twoSidedExists
	};
}

/**
 * Check if two limit results represent equal limits.
 */
export function checkLimitsEqual(left: LimitResult, right: LimitResult): boolean {
	// Both must have exact status
	if (left.status !== 'exact' || right.status !== 'exact') {
		return false;
	}

	// Both must have values
	if (left.value === null || right.value === null) {
		return false;
	}

	// Compare values structurally
	return structurallyEqual(left.value, right.value);
}

// =============================================================================
// Discontinuity Detection
// =============================================================================

/**
 * Type of discontinuity at a point.
 */
export type DiscontinuityType =
	| 'removable' // Limit exists but function undefined or different
	| 'jump' // Left and right limits exist but differ
	| 'infinite' // One or both limits are infinite
	| 'essential' // Oscillating or no limit
	| 'none'; // Continuous

/**
 * Result of discontinuity analysis.
 */
export interface DiscontinuityInfo {
	readonly type: DiscontinuityType;
	readonly leftLimit?: MathNode | null;
	readonly rightLimit?: MathNode | null;
	readonly description: string;
}

/**
 * Analyze the type of discontinuity at a point.
 *
 * @param oneSided - One-sided limit results
 * @param functionValue - Value of function at the point (if defined)
 */
export function analyzeDiscontinuity(
	oneSided: OneSidedLimitResult,
	functionValue?: MathNode | null
): DiscontinuityInfo {
	const { left, right, twoSidedExists } = oneSided;

	// Check for infinite limits
	const leftInfinite = left && isInfinityValue(left.value);
	const rightInfinite = right && isInfinityValue(right.value);

	if (leftInfinite || rightInfinite) {
		return {
			type: 'infinite',
			leftLimit: left?.value,
			rightLimit: right?.value,
			description: 'Discontinuité infinie (asymptote verticale)'
		};
	}

	// Check if limits exist
	const leftExists = left?.status === 'exact' && left.value !== null;
	const rightExists = right?.status === 'exact' && right.value !== null;

	if (!leftExists || !rightExists) {
		return {
			type: 'essential',
			leftLimit: left?.value,
			rightLimit: right?.value,
			description: 'Discontinuité essentielle (limite inexistante)'
		};
	}

	// Both limits exist
	if (!twoSidedExists) {
		return {
			type: 'jump',
			leftLimit: left.value,
			rightLimit: right.value,
			description: 'Discontinuité de première espèce (saut)'
		};
	}

	// Two-sided limit exists, check against function value
	if (functionValue === undefined) {
		return {
			type: 'removable',
			leftLimit: left.value,
			rightLimit: right.value,
			description: 'Discontinuité par trou (fonction non définie)'
		};
	}

	if (functionValue !== null && left.value && !structurallyEqual(functionValue, left.value)) {
		return {
			type: 'removable',
			leftLimit: left.value,
			rightLimit: right.value,
			description: 'Discontinuité par trou (valeur différente de la limite)'
		};
	}

	return {
		type: 'none',
		leftLimit: left.value,
		rightLimit: right.value,
		description: 'Fonction continue en ce point'
	};
}

/**
 * Check if a value represents infinity.
 */
function isInfinityValue(value: MathNode | null): boolean {
	return value !== null && isInfinity(value);
}

// =============================================================================
// One-Sided Limit Detection
// =============================================================================

/**
 * Determine if one-sided analysis is needed for an expression at a point.
 *
 * One-sided analysis is needed when:
 * - The expression has different behavior on different sides (e.g., 1/x at 0)
 * - The expression involves absolute value or sign function
 * - The domain is restricted on one side
 */
export function needsOneSidedAnalysis(
	expr: MathNode,
	varName: string,
	approach: MathNode
): boolean {
	// At infinity, no one-sided analysis needed
	if (isInfinity(approach)) {
		return false;
	}

	// Check for expressions that typically need one-sided analysis
	return hasAsymmetricBehavior(expr, varName, approach);
}

/**
 * Check if an expression may have a restricted domain.
 * Used as a performance optimization to avoid expensive domain computation
 * for simple arithmetic expressions with universal domain.
 */
function mayHaveRestrictedDomain(expr: MathNode): boolean {
	switch (expr.type) {
		case 'function':
			// Functions like sqrt, ln, log, asin, acos, etc. have restricted domains
			return true;
		case 'superscript':
			// Powers with fractional exponents (like x^(1/2)) have restricted domains
			return true;
		case 'division':
			// Division may have zeros in denominator
			return true;
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return mayHaveRestrictedDomain(expr.left) || mayHaveRestrictedDomain(expr.right);
		case 'opposite':
		case 'positive':
			return mayHaveRestrictedDomain(expr.operand);
		case 'delimiter':
			return mayHaveRestrictedDomain(expr.content);
		default:
			return false;
	}
}

/**
 * Check if expression has asymmetric behavior around a point.
 *
 * Uses domain analysis to detect if the approach point is on a domain boundary
 * (e.g., sqrt(x) at x=0, ln(x-3) at x=3) instead of hardcoded function checks.
 */
function hasAsymmetricBehavior(expr: MathNode, varName: string, approach: MathNode): boolean {
	// Division by variable (potential sign change)
	if (expr.type === 'division') {
		const denClass = classifyLimitValue(expr.denominator, varName, approach, 'both');
		if (denClass.class === 'zero') {
			return true; // Denominator goes to zero - need one-sided
		}
	}

	// Domain-based check: if approach point is on domain boundary
	// Only compute domain for expressions that may have restricted domains
	// (functions like sqrt/ln, powers with fractional exponents, divisions)
	if (isNumber(approach) && mayHaveRestrictedDomain(expr)) {
		const approachVal = parseFloat(approach.value);
		const epsilon = ZERO_TOLERANCE;

		try {
			const { domain } = computeDomain(expr, varName);

			const leftInDomain = containsValue(domain, approachVal - epsilon);
			const rightInDomain = containsValue(domain, approachVal + epsilon);

			// Asymmetric behavior if exactly one side is in domain
			if (leftInDomain !== rightInDomain) {
				return true;
			}
		} catch {
			// If domain computation fails, fall back to conservative behavior
			// (continue with other checks below)
		}
	}

	// Absolute value or sign function - check if argument changes sign
	// (domain is ℝ for these functions, but behavior changes at 0)
	if (expr.type === 'function') {
		const name = expr.name.toLowerCase();
		if (name === 'abs' || name === 'sign' || name === 'sgn') {
			if (isNumber(approach) && expr.args.length === 1) {
				const approachVal = parseFloat(approach.value);
				const epsilon = ZERO_TOLERANCE;

				const argAtLeft = evaluateAtValue(expr.args[0], varName, approachVal - epsilon);
				const argAtRight = evaluateAtValue(expr.args[0], varName, approachVal + epsilon);

				// If argument changes sign near approach point, one-sided analysis needed
				if (argAtLeft !== null && argAtRight !== null && argAtLeft * argAtRight < 0) {
					return true;
				}
			}
		}
	}

	return false;
}

// =============================================================================
// Sign Analysis for One-Sided Limits
// =============================================================================

/**
 * Result of sign analysis.
 */
export interface SignAnalysis {
	readonly leftSign: 'positive' | 'negative' | 'zero' | 'unknown';
	readonly rightSign: 'positive' | 'negative' | 'zero' | 'unknown';
}

/**
 * Analyze the sign of an expression on each side of a point.
 *
 * @param expr - The expression
 * @param varName - The variable
 * @param approach - The approach point
 */
export function analyzeSign(expr: MathNode, varName: string, approach: MathNode): SignAnalysis {
	if (!isNumber(approach)) {
		return { leftSign: 'unknown', rightSign: 'unknown' };
	}

	const approachVal = parseFloat(approach.value);
	const epsilon = ZERO_TOLERANCE;

	// Evaluate just to the left
	const leftValue = evaluateAtValue(expr, varName, approachVal - epsilon);
	const leftSign = getSign(leftValue);

	// Evaluate just to the right
	const rightValue = evaluateAtValue(expr, varName, approachVal + epsilon);
	const rightSign = getSign(rightValue);

	return { leftSign, rightSign };
}

/**
 * Get the sign of a number.
 */
function getSign(value: number | null): 'positive' | 'negative' | 'zero' | 'unknown' {
	if (value === null || !Number.isFinite(value)) {
		return 'unknown';
	}
	if (Math.abs(value) < 1e-15) {
		return 'zero';
	}
	return value > 0 ? 'positive' : 'negative';
}

/**
 * Evaluate an expression at a specific numeric value.
 *
 * Uses the eval module's substitute and evaluateNodeToApproximatedNumber
 * for consistent numeric evaluation across the codebase.
 *
 * @param expr - The expression to evaluate
 * @param varName - The variable to substitute
 * @param value - The numeric value to substitute
 * @returns The numeric result or null if evaluation fails
 */
function evaluateAtValue(expr: MathNode, varName: string, value: number): number | null {
	try {
		const valueNode: MathNode = { type: 'number', value: String(value) };
		const substituted = substitute(expr, { [varName]: valueNode });
		const result = evaluateNodeToApproximatedNumber(substituted);
		return Number.isFinite(result) ? result : null;
	} catch {
		return null;
	}
}

// =============================================================================
// Pedagogical Output for One-Sided Limits
// =============================================================================

/**
 * Record one-sided limit analysis steps.
 */
export function recordOneSidedSteps(
	oneSided: OneSidedLimitResult,
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorder
): void {
	const approachStr = isNumber(approach) ? approach.value : '∞';

	if (oneSided.left && oneSided.left.status === 'exact') {
		recorder.recordStep(
			'one-sided',
			`Limite à gauche (${varName} → ${approachStr}⁻)`,
			expr,
			oneSided.left.value!,
			'detailed',
			undefined,
			'Analyse du comportement quand ' +
				varName +
				' tend vers ' +
				approachStr +
				' par valeurs inférieures'
		);
	}

	if (oneSided.right && oneSided.right.status === 'exact') {
		recorder.recordStep(
			'one-sided',
			`Limite à droite (${varName} → ${approachStr}⁺)`,
			expr,
			oneSided.right.value!,
			'detailed',
			undefined,
			'Analyse du comportement quand ' +
				varName +
				' tend vers ' +
				approachStr +
				' par valeurs supérieures'
		);
	}

	if (oneSided.twoSidedExists && oneSided.left?.value) {
		recorder.recordStep(
			'one-sided',
			'Limites à gauche et à droite égales',
			expr,
			oneSided.left.value,
			'summarized',
			undefined,
			'La limite existe car les deux limites unilatérales sont égales'
		);
	} else if (!oneSided.twoSidedExists) {
		recorder.recordStep(
			'one-sided',
			"La limite n'existe pas",
			expr,
			expr, // Keep the expression as "after" since there's no limit
			'summarized',
			undefined,
			'Les limites à gauche et à droite sont différentes'
		);
	}
}
