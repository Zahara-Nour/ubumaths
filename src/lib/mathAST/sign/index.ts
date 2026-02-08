/**
 * Sign Analysis Module
 *
 * Analyzes the sign of mathematical expressions over intervals.
 * Used by the variations module to study the sign of the derivative
 * (and thus determine monotonicity), and by pedagogical displays
 * (sign tables).
 *
 * ## Architecture
 *
 * ```
 * sign/
 * ├── analyze.ts              Entry point: analyzeSign()
 * ├── types.ts                Sign, SignedInterval, ZeroInfo, SignAnalysisResult
 * ├── helpers/
 * │   ├── zeros.ts            Zero-finding via the solve module
 * │   ├── interval-sign.ts    Algebraic sign determination (recursive structural analysis)
 * │   └── sampling.ts         Numeric fallback (evaluation at sample points)
 * ├── rules/
 * │   ├── product.ts          sign(a·b) = sign(a)·sign(b)
 * │   ├── quotient.ts         sign(a/b) = sign(a)·sign(b)
 * │   ├── sum.ts              Only trivial cases (same sign on both sides)
 * │   ├── power.ts            sign(a^n) depends on parity of n
 * │   └── function.ts         Known functions (exp→+, ln, sin, …)
 * └── format.ts               Sign table formatting
 * ```
 *
 * ## Algorithm (analyzeSign)
 *
 * 1. Compute (or receive) the domain of definition Df
 * 2. Find zeros: solve f(x) = 0 within Df (via the solve module)
 * 3. Split Df at zeros into sub-intervals
 *    → Interval bounds are always **exact symbolic MathNodes**
 *      (e.g. sqrt(2)), with an `approximate` field for ordering only.
 * 4. For each sub-interval, determine the sign:
 *    a. **Algebraic analysis** — recursively decompose the expression
 *       structure (product, quotient, power, function) and apply sign rules.
 *       Sums/differences return 'unknown' because knowing sign(a) and sign(b)
 *       does not determine sign(a+b) without comparing magnitudes.
 *    b. **Numeric sampling fallback** — if algebraic analysis returns 'unknown',
 *       evaluate at 5 sample points and check consensus. This is reliable
 *       because, between consecutive zeros, a continuous function has constant sign
 *       (intermediate value theorem).
 *    c. Mark as 'unknown' if sampling also fails.
 *
 * ## Critical dependency: completeness of solve
 *
 * The entire module relies on the solve module finding **all** zeros of the
 * expression. If solve misses a zero, the domain is not split at that point,
 * creating an interval that actually contains a sign change. The sampling
 * fallback may then "confirm" an incorrect sign if all sample points happen
 * to fall on the same side of the missed zero — with no warning emitted.
 *
 * In other words: the reliability of sign analysis (and of the variations
 * module that depends on it) is **entirely conditioned** by the completeness
 * of solve. For equation types that solve cannot handle (complex transcendental
 * equations, etc.), the sign table may be silently incorrect.
 *
 * ## Continuity assumption
 *
 * The module assumes that the expression is **continuous on each interval
 * of its domain**. This is guaranteed for standard mathematical expressions
 * (polynomials, rational functions, exp, ln, sin, cos, sqrt, …) which are
 * the target of UbuMaths. Functions with jump discontinuities inside their
 * domain (floor, piecewise, …) are NOT supported and could produce incorrect
 * results, since the sampling might miss a sign change between sample points.
 *
 * Discontinuities caused by non-definition (1/x at 0, ln at 0, tan at π/2+kπ)
 * are handled correctly: computeDomain excludes those points, so the domain
 * is automatically split into intervals where the function is continuous.
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

// =============================================================================
// Formatting Functions
// =============================================================================

export {
	formatSignAnalysis,
	formatSignTable,
	formatSignedIntervalsAsConditions,
	formatZeros,
	getSignSymbol,
	getSignDescription,
	signToCondition,
	formatSignSummary
} from './format';
