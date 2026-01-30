/**
 * Limit Evaluation Module
 *
 * Provides symbolic limit evaluation with pedagogical step-by-step output.
 *
 * @module mathAST/limits
 *
 * @example
 * ```typescript
 * import { evaluateLimit, findKnownLimit } from '$lib/mathAST/limits';
 * import { divide, func, variable, number } from '$lib/mathAST/factory';
 *
 * // Evaluate sin(x)/x as x → 0
 * const expr = divide(func('sin', [variable('x')]), variable('x'));
 * const result = evaluateLimit(expr, 'x', number('0'));
 *
 * console.log(result.status); // 'exact'
 * console.log(result.value);  // NumberNode with value '1'
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
	LimitDirection,
	LimitStatus,
	IndeterminateForm,
	LimitVerbosity,
	LimitRule,
	LimitStep,
	LimitResult,
	OneSidedLimitResult,
	LimitOptions,
	KnownLimitEntry
} from './types';

export { LimitError } from './types';

// =============================================================================
// Evaluation
// =============================================================================

export {
	evaluateLimit,
	evaluateLimitNode,
	findKnownLimit,
	analyzeOneSidedLimits,
	analyzeDiscontinuity
} from './evaluate';

// =============================================================================
// Known Limits
// =============================================================================

export {
	KNOWN_LIMITS,
	matchKnownLimit,
	getKnownLimitValue,
	structurallyEqual,
	substituteVariable
} from './known-limits';

// =============================================================================
// Step Recording
// =============================================================================

export {
	LimitStepRecorderImpl,
	createStepRecorder,
	getRuleDescription,
	describeCustomRule,
	shouldIncludeStep,
	type LimitStepRecorder
} from './step-recorder';

// =============================================================================
// Indeterminate Forms
// =============================================================================

export {
	detectIndeterminateForm,
	classifyLimitValue,
	type LimitValueClass,
	type LimitValueClassification
} from './indeterminate';

// =============================================================================
// L'Hôpital's Rule
// =============================================================================

export {
	applyLhopital,
	isLhopitalApplicable,
	convertToLhopitalForm,
	type LhopitalResult
} from './lhopital';

// =============================================================================
// Algebraic Manipulation
// =============================================================================

export {
	tryFactorization,
	tryRationalization,
	tryDominantTerm,
	tryAlgebraicSimplification,
	type AlgebraicResult
} from './algebraic';

// =============================================================================
// Squeeze Theorem
// =============================================================================

export {
	trySqueeze,
	getBoundedFunctionInfo,
	constructSqueezeBounds,
	type SqueezeResult,
	type BoundedInfo
} from './squeeze';

// =============================================================================
// One-Sided Limits
// =============================================================================

export {
	evaluateOneSidedLimits,
	checkLimitsEqual,
	needsOneSidedAnalysis,
	analyzeSign,
	recordOneSidedSteps,
	type DiscontinuityType,
	type DiscontinuityInfo,
	type SignAnalysis
} from './one-sided';

// =============================================================================
// Composition Limits
// =============================================================================

export { tryCompositionLimit, type CompositionResult } from './composition';

// =============================================================================
// Sign Tracking
// =============================================================================

export {
	classifyWithSign,
	reciprocalSign,
	negateSign,
	lnSign,
	expSign,
	sqrtSign,
	powerSign,
	signedValueToInfinity,
	isSignedInfinity,
	isSignedZero,
	// Binary operations (infinity algebra)
	addSigns,
	subtractSigns,
	multiplySigns,
	divideSigns,
	isIndeterminate,
	type SignedLimitValue,
	type BinaryOpResult
} from './sign-tracking';
