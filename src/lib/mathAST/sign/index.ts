/**
 * Sign Analysis Module
 *
 * Analyzes the sign of mathematical expressions over intervals.
 * Used by the variations module to study monotonicity and by
 * pedagogical displays (sign tables).
 *
 * Main workflow:
 * 1. Find zeros of the expression (solving f(x) = 0)
 * 2. Partition the domain at zeros and discontinuities
 * 3. Determine sign on each interval (algebraic or numeric sampling)
 * 4. Return signed intervals for display or further analysis
 *
 * @module mathAST/sign
 */

// =============================================================================
// Types
// =============================================================================

export type {
	Sign,
	SignedInterval,
	ZeroInfo,
	SignAnalysisResult,
	SignAnalysisStep,
	SignAnalysisOptions
} from './types';

export { DEFAULT_SIGN_OPTIONS, SignAnalysisError } from './types';

// =============================================================================
// Rules
// =============================================================================

export {
	// Product rules
	signOfProduct,
	signOfProductMultiple,
	// Quotient rules
	signOfQuotient,
	// Sum rules
	signOfSum,
	allSameSign,
	signOfDifference,
	negateSign,
	// Power rules
	signOfPower,
	signOfIntegerPower,
	extractRationalExponent,
	// Function rules
	signOfFunction,
	signOfMultiArgFunction,
	getBuiltinSignInfo
} from './rules';

export type { RationalExponent, BuiltinSignInfo } from './rules';

// =============================================================================
// Helper Functions
// =============================================================================

export {
	// Zero finding
	findZeros,
	sortZerosByValue,
	getUniqueZeros,
	getZerosInInterval,
	getDomainBounds,
	// Interval sign determination
	determineSignOnInterval,
	analyzeExpressionStructure,
	analyzePolynomial,
	// Numeric sampling
	sampleSignOnInterval,
	getSamplePoints,
	getSamplePoint,
	signFromNumber,
	adaptiveSampleSign
} from './helpers';

export type { ExpressionStructure, SamplingOptions } from './helpers';

// =============================================================================
// Analysis Functions
// =============================================================================

export { analyzeSign } from './analyze';

// TODO: Implement formatSignTable
// export { formatSignTable } from './format';
