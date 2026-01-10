/**
 * Limit Evaluation
 *
 * Main entry point for evaluating limits symbolically.
 * Integrates multiple strategies:
 * - Known limits matching
 * - Direct substitution
 * - L'Hôpital's rule for indeterminate forms
 * - Algebraic manipulation (factorization, rationalization)
 * - Squeeze theorem
 * - One-sided limit analysis
 *
 * @module mathAST/limits/evaluate
 */

import type { MathNode, LimitNode } from '../types';
import type {
	LimitResult,
	LimitOptions,
	LimitDirection,
	LimitStatus,
	IndeterminateForm,
	LimitRule,
	OneSidedLimitResult
} from './types';
import { LimitError } from './types';
import { isLimit, isNumber, isInfinity } from '../guards';
import { matchKnownLimit, getKnownLimitValue } from './known-limits';
import { LimitStepRecorderImpl } from './step-recorder';
import { containsVariable } from '../integration/rules';
import { detectIndeterminateForm } from './indeterminate';
import { applyLhopital, isLhopitalApplicable } from './lhopital';
import { tryAlgebraicSimplification } from './algebraic';
import { trySqueeze } from './squeeze';
import { evaluateOneSidedLimits, needsOneSidedAnalysis, recordOneSidedSteps } from './one-sided';
import { substitute } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: Required<LimitOptions> = {
	verbosity: 'summarized',
	maxLhopitalIterations: 5,
	allowNumeric: false,
	timeout: 5000
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get numeric value from a NumberNode.
 */
function getNumericValue(node: MathNode): number | null {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return Number.isFinite(val) ? val : null;
	}
	return null;
}

/**
 * Substitute a value for a variable in an expression.
 * Delegates to the eval module's substitute function.
 */
function substituteValue(expr: MathNode, varName: string, value: MathNode): MathNode {
	return substitute(expr, { [varName]: value });
}

// =============================================================================
// Main Evaluation Function
// =============================================================================

/**
 * Evaluate a limit expression.
 *
 * Applies strategies in order:
 * 1. Known limits matching
 * 2. Direct substitution
 * 3. L'Hôpital's rule (for 0/0, ∞/∞)
 * 4. Algebraic simplification (factoring, rationalization, dominant term)
 * 5. Squeeze theorem
 * 6. One-sided limit analysis
 *
 * @param expr - The expression or LimitNode to evaluate
 * @param variable - The variable approaching the limit (optional if expr is LimitNode)
 * @param approach - The point being approached (optional if expr is LimitNode)
 * @param direction - Direction of approach (default: 'both')
 * @param options - Evaluation options
 * @returns The limit result with value and steps
 */
export function evaluateLimit(
	expr: MathNode | LimitNode,
	variable?: string,
	approach?: MathNode,
	direction: LimitDirection = 'both',
	options: LimitOptions = {}
): LimitResult {
	const opts: Required<LimitOptions> = { ...DEFAULT_OPTIONS, ...options };
	const recorder = new LimitStepRecorderImpl();

	// Extract info from LimitNode if provided
	let expression: MathNode;
	let varName: string;
	let approachPoint: MathNode;
	let dir: LimitDirection;

	if (isLimit(expr)) {
		expression = expr.expression;
		varName = expr.variable;
		approachPoint = expr.approach;
		dir = expr.direction;
	} else {
		if (!variable || !approach) {
			throw new LimitError(
				'Variable and approach point required when expression is not a LimitNode',
				'INVALID_VARIABLE'
			);
		}
		expression = expr;
		varName = variable;
		approachPoint = approach;
		dir = direction;
	}

	// Verify variable is used in expression
	if (!containsVariable(expression, varName)) {
		return createResult(
			expression,
			varName,
			approachPoint,
			dir,
			'exact',
			'none',
			'direct-substitution',
			recorder,
			opts
		);
	}

	// Strategy 1: Try known limits first
	const knownLimit = matchKnownLimit(expression, approachPoint, varName, dir);
	if (knownLimit) {
		const limitValue = getKnownLimitValue(knownLimit, varName);
		recorder.recordStepByRule(
			'known-limit',
			expression,
			limitValue,
			'summarized',
			undefined,
			knownLimit.descriptionFr
		);
		return createResult(
			limitValue,
			varName,
			approachPoint,
			dir,
			'exact',
			'none',
			'known-limit',
			recorder,
			opts
		);
	}

	// Strategy 2: Try direct substitution
	if (!isInfinity(approachPoint)) {
		const directResult = tryDirectSubstitution(expression, varName, approachPoint, recorder);
		if (directResult !== null) {
			return createResult(
				directResult,
				varName,
				approachPoint,
				dir,
				'exact',
				'none',
				'direct-substitution',
				recorder,
				opts
			);
		}
	}

	// Detect indeterminate form for subsequent strategies
	const indeterminateForm = detectIndeterminateForm(expression, varName, approachPoint, dir);

	// Strategy 3: Try L'Hôpital's rule for 0/0 or ∞/∞
	if (isLhopitalApplicable(expression, varName, approachPoint, dir)) {
		const lhopitalResult = applyLhopital(expression, varName, approachPoint, dir, recorder, opts);
		if (lhopitalResult.applicable && lhopitalResult.value) {
			return createResult(
				lhopitalResult.value,
				varName,
				approachPoint,
				dir,
				'exact',
				lhopitalResult.resolvedForm ?? 'none',
				'lhopital',
				recorder,
				opts
			);
		}
	}

	// Strategy 4: Try algebraic simplification
	const algebraicResult = tryAlgebraicSimplification(
		expression,
		varName,
		approachPoint,
		dir,
		recorder
	);
	if (algebraicResult.success && algebraicResult.simplified) {
		// If algebraic simplification gave us a direct answer
		if (isNumber(algebraicResult.simplified) || isInfinity(algebraicResult.simplified)) {
			return createResult(
				algebraicResult.simplified,
				varName,
				approachPoint,
				dir,
				isInfinity(algebraicResult.simplified) ? 'infinite' : 'exact',
				indeterminateForm,
				algebraicResult.technique === 'dominant-term'
					? 'infinity-analysis'
					: 'algebraic-simplification',
				recorder,
				opts
			);
		}

		// Otherwise, try to evaluate the simplified expression
		const simplifiedResult = tryDirectSubstitution(
			algebraicResult.simplified,
			varName,
			approachPoint,
			recorder
		);
		if (simplifiedResult !== null) {
			return createResult(
				simplifiedResult,
				varName,
				approachPoint,
				dir,
				'exact',
				indeterminateForm,
				algebraicResult.technique === 'factorization' ? 'factorization' : 'rationalization',
				recorder,
				opts
			);
		}
	}

	// Strategy 5: Try squeeze theorem
	const squeezeResult = trySqueeze(expression, varName, approachPoint, dir, recorder);
	if (squeezeResult.applicable && squeezeResult.value) {
		return createResult(
			squeezeResult.value,
			varName,
			approachPoint,
			dir,
			'exact',
			indeterminateForm,
			'squeeze',
			recorder,
			opts
		);
	}

	// Strategy 6: For 'both' direction, try one-sided analysis
	if (dir === 'both' && needsOneSidedAnalysis(expression, varName, approachPoint)) {
		const oneSided = evaluateOneSidedLimits(
			(e, v, a, d, o) => evaluateLimitInternal(e, v, a, d, o),
			expression,
			varName,
			approachPoint,
			opts
		);

		recordOneSidedSteps(oneSided, expression, varName, approachPoint, recorder);

		if (oneSided.twoSidedExists && oneSided.left?.value) {
			return createResult(
				oneSided.left.value,
				varName,
				approachPoint,
				dir,
				oneSided.left.status,
				indeterminateForm,
				'one-sided',
				recorder,
				opts
			);
		}

		if (!oneSided.twoSidedExists) {
			return createResult(
				null,
				varName,
				approachPoint,
				dir,
				'does-not-exist',
				indeterminateForm,
				'one-sided',
				recorder,
				opts,
				'Les limites à gauche et à droite sont différentes'
			);
		}
	}

	// No strategy worked
	return createResult(
		null,
		varName,
		approachPoint,
		dir,
		'unsupported',
		indeterminateForm,
		'direct-substitution',
		recorder,
		opts,
		'Limite non supportée avec les techniques actuelles'
	);
}

/**
 * Internal limit evaluation (without one-sided recursion).
 */
function evaluateLimitInternal(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	options: LimitOptions
): LimitResult {
	const opts: Required<LimitOptions> = { ...DEFAULT_OPTIONS, ...options };
	const recorder = new LimitStepRecorderImpl();

	// Verify variable is used in expression
	if (!containsVariable(expr, varName)) {
		return createResult(
			expr,
			varName,
			approach,
			direction,
			'exact',
			'none',
			'direct-substitution',
			recorder,
			opts
		);
	}

	// Try known limits
	const knownLimit = matchKnownLimit(expr, approach, varName, direction);
	if (knownLimit) {
		const limitValue = getKnownLimitValue(knownLimit, varName);
		recorder.recordStepByRule(
			'known-limit',
			expr,
			limitValue,
			'summarized',
			undefined,
			knownLimit.descriptionFr
		);
		return createResult(
			limitValue,
			varName,
			approach,
			direction,
			'exact',
			'none',
			'known-limit',
			recorder,
			opts
		);
	}

	// Try direct substitution
	if (!isInfinity(approach)) {
		const directResult = tryDirectSubstitution(expr, varName, approach, recorder);
		if (directResult !== null) {
			return createResult(
				directResult,
				varName,
				approach,
				direction,
				'exact',
				'none',
				'direct-substitution',
				recorder,
				opts
			);
		}
	}

	const indeterminateForm = detectIndeterminateForm(expr, varName, approach, direction);

	// Try L'Hôpital
	if (isLhopitalApplicable(expr, varName, approach, direction)) {
		const lhopitalResult = applyLhopital(expr, varName, approach, direction, recorder, opts);
		if (lhopitalResult.applicable && lhopitalResult.value) {
			return createResult(
				lhopitalResult.value,
				varName,
				approach,
				direction,
				'exact',
				lhopitalResult.resolvedForm ?? 'none',
				'lhopital',
				recorder,
				opts
			);
		}
	}

	// Try algebraic
	const algebraicResult = tryAlgebraicSimplification(expr, varName, approach, direction, recorder);
	if (algebraicResult.success && algebraicResult.simplified) {
		if (isNumber(algebraicResult.simplified) || isInfinity(algebraicResult.simplified)) {
			return createResult(
				algebraicResult.simplified,
				varName,
				approach,
				direction,
				isInfinity(algebraicResult.simplified) ? 'infinite' : 'exact',
				indeterminateForm,
				'algebraic-simplification',
				recorder,
				opts
			);
		}
	}

	// Try squeeze
	const squeezeResult = trySqueeze(expr, varName, approach, direction, recorder);
	if (squeezeResult.applicable && squeezeResult.value) {
		return createResult(
			squeezeResult.value,
			varName,
			approach,
			direction,
			'exact',
			indeterminateForm,
			'squeeze',
			recorder,
			opts
		);
	}

	return createResult(
		null,
		varName,
		approach,
		direction,
		'unsupported',
		indeterminateForm,
		'direct-substitution',
		recorder,
		opts
	);
}

/**
 * Try direct substitution to evaluate the limit.
 */
function tryDirectSubstitution(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorderImpl
): MathNode | null {
	const substituted = substituteValue(expr, varName, approach);
	const numericValue = tryEvaluateNumeric(substituted);

	if (numericValue !== null && Number.isFinite(numericValue)) {
		const resultNode: MathNode = { type: 'number', value: cleanNumberString(numericValue) };
		recorder.recordStepByRule(
			'direct-substitution',
			expr,
			resultNode,
			'summarized',
			approach,
			`Substitution de ${varName} par ${getNumericValue(approach) ?? approach}`
		);
		return resultNode;
	}

	return null;
}

/**
 * Try to evaluate an expression numerically.
 * Delegates to the eval module's evaluateNodeToApproximatedNumber,
 * returning null on any error (unsupported types, variables, etc.).
 */
function tryEvaluateNumeric(expr: MathNode): number | null {
	try {
		const result = evaluateNodeToApproximatedNumber(expr);
		return Number.isFinite(result) ? result : null;
	} catch {
		return null;
	}
}

/**
 * Clean a number string.
 */
function cleanNumberString(value: number): string {
	if (Math.abs(value - Math.round(value)) < 1e-10) {
		return String(Math.round(value));
	}
	return value.toPrecision(10).replace(/\.?0+$/, '');
}

/**
 * Create a LimitResult object.
 */
function createResult(
	value: MathNode | null,
	variable: string,
	approach: MathNode,
	direction: LimitDirection,
	status: LimitStatus,
	indeterminateForm: IndeterminateForm,
	technique: LimitRule,
	recorder: LimitStepRecorderImpl,
	opts: Required<LimitOptions>,
	error?: string
): LimitResult {
	return {
		variable,
		approach,
		direction,
		status,
		value,
		indeterminateForm,
		technique,
		steps: recorder.getStepsFiltered(opts.verbosity),
		...(error && { error })
	};
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Evaluate a limit from a LimitNode.
 */
export function evaluateLimitNode(limitNode: LimitNode, options: LimitOptions = {}): LimitResult {
	return evaluateLimit(limitNode, undefined, undefined, 'both', options);
}

/**
 * Check if a known limit matches the expression.
 */
export function findKnownLimit(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection = 'both'
) {
	return matchKnownLimit(expr, approach, variable, direction);
}

/**
 * Analyze one-sided limits separately.
 */
export function analyzeOneSidedLimits(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	options: LimitOptions = {}
): OneSidedLimitResult {
	return evaluateOneSidedLimits(
		(e, v, a, d, o) => evaluateLimit(e, v, a, d, o),
		expr,
		variable,
		approach,
		options
	);
}

/**
 * Export discontinuity analysis.
 */
export { analyzeDiscontinuity } from './one-sided';
