/**
 * Variation (Monotonicity) Analysis Module
 *
 * Studies the monotonicity of mathematical expressions by analyzing
 * the sign of the derivative. This module determines where functions
 * are increasing, decreasing, or constant, and identifies extrema.
 *
 * Main workflow:
 * 1. Compute the derivative f'(x) using the differentiation module
 * 2. Find critical points where f'(x) = 0 or f'(x) is undefined
 * 3. Analyze the sign of f'(x) using the sign module
 * 4. Determine monotonicity on each interval between critical points
 * 5. Identify local and global extrema
 * 6. Optionally compute limits at domain boundaries
 *
 * @module mathAST/variations
 */

// =============================================================================
// Types
// =============================================================================

export type {
	// Monotonicity types
	Monotonicity,
	MonotonicInterval,
	// Extremum types
	ExtremumType,
	ExtremumInfo,
	// Critical point types
	CriticalPointNature,
	CriticalPointInfo,
	// Boundary limit types
	LimitValue,
	BoundaryLimit,
	// Step recording types
	VariationPhase,
	VariationStep,
	// Result types
	VariationResult,
	VariationOptions
} from './types';

export { DEFAULT_VARIATION_OPTIONS, VariationError } from './types';

// =============================================================================
// Main Analysis Functions
// =============================================================================

export { computeVariations, getVariationSummary } from './compute';

// =============================================================================
// Critical Point Functions
// =============================================================================

export {
	findCriticalPoints,
	classifyCriticalPoint,
	evaluateAtCriticalPoint,
	sortCriticalPoints
} from './critical-points';

export type { CriticalPointEvaluation } from './critical-points';

// =============================================================================
// Monotonicity Functions
// =============================================================================

export {
	signToMonotonicity,
	monotonicityToSign,
	buildMonotonicIntervals,
	mergeMonotonicIntervals,
	getMonotonicityDescription,
	getDerivativeSignDescription,
	getMonotonicitySymbol,
	getIntervalLength,
	isExtremumCandidate
} from './monotonicity';

// =============================================================================
// Extrema Functions
// =============================================================================

export {
	findExtrema,
	classifyExtremum,
	findAdjacentIntervals,
	classifyGlobalExtrema,
	isGlobalExtremum,
	getExtremumDescription,
	getExtremumLabel
} from './extrema';

export type { ExtremumClassification, BoundaryValue } from './extrema';

// =============================================================================
// Boundary Limit Functions
// =============================================================================

export {
	computeBoundaryLimits,
	getDomainBoundaries,
	convertLimitResult,
	getLimitDescription,
	getCompactLimitDescription,
	isFiniteLimit,
	isVerticalAsymptote,
	isHorizontalAsymptote
} from './boundary-limits';

export type { BoundaryPoint } from './boundary-limits';

// =============================================================================
// Formatting Functions (TODO: Implement)
// =============================================================================

// TODO: Implement variation table formatting
// export { formatVariationTable } from './format';
