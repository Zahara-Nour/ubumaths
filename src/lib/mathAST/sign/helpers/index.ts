/**
 * Sign Analysis Helper Functions
 *
 * Helper functions for sign analysis:
 * - zeros: Finding roots of expressions within domains
 * - interval-sign: Determining sign on intervals using algebraic rules
 * - sampling: Numeric fallback for sign determination
 *
 * @module mathAST/sign/helpers
 */

// =============================================================================
// Zero Finding
// =============================================================================

export {
	findZeros,
	sortZerosByValue,
	getUniqueZeros,
	getZerosInInterval,
	getDomainBounds
} from './zeros';

// =============================================================================
// Interval Sign Determination
// =============================================================================

export {
	determineSignOnInterval,
	analyzeExpressionStructure,
	analyzePolynomial
} from './interval-sign';

export type { ExpressionStructure } from './interval-sign';

// =============================================================================
// Numeric Sampling
// =============================================================================

export {
	sampleSignOnInterval,
	getSamplePoints,
	getSamplePoint,
	signFromNumber,
	adaptiveSampleSign
} from './sampling';

export type { SamplingOptions } from './sampling';
