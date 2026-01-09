/**
 * MathAST Normal Form - Public API
 *
 * This module provides the public interface for normalizing mathematical expressions
 * and checking their equivalence.
 */

// =============================================================================
// Types
// =============================================================================

export type {
	Rational,
	SimplifiedRadical,
	AlgebraicTerm,
	AlgebraicCoefficient,
	SymbolicFactor,
	NormalTerm,
	NormalForm,
	SimplifiedRadicalResult,
	ComparisonResult,
	NormalizationStep,
	NormalizeOptions,
	NormalizeResult
} from './types.js';

// =============================================================================
// Rational Numbers
// =============================================================================

export {
	rational,
	fromInteger,
	ZERO,
	ONE,
	MINUS_ONE,
	TWO,
	HALF,
	addRational,
	subRational,
	mulRational,
	divRational,
	negRational,
	absRational,
	reciprocal,
	powRational,
	compareRational,
	equalRational,
	isZero,
	isOne,
	isMinusOne,
	isNegative,
	isPositive,
	isInteger,
	rationalToNumber,
	rationalToString,
	parseRational,
	gcd,
	lcm,
	absBigInt
} from './rational.js';

// =============================================================================
// Radicals
// =============================================================================

export {
	simplifyRadical,
	createRadical,
	mulRadicalsSameIndex,
	mulRadicals,
	compareRadicals,
	equalRadicals,
	radicalToNumber,
	radicalToString,
	integerNthRoot,
	extractPerfectPower
} from './radical.js';

// =============================================================================
// Algebraic Coefficients
// =============================================================================

export {
	ALGEBRAIC_ZERO,
	ALGEBRAIC_ONE,
	algebraicTerm,
	algebraicCoefficient,
	algebraicFromRational,
	algebraicFromRadical,
	addAlgebraic,
	subAlgebraic,
	negAlgebraic,
	mulAlgebraic,
	divAlgebraic,
	gcdAlgebraic,
	isZeroAlgebraic,
	isOneAlgebraic,
	isPureRational,
	getRationalValue,
	algebraicEquals,
	algebraicToString,
	algebraicToNumber
} from './algebraic.js';

// =============================================================================
// Monomials
// =============================================================================

export {
	EMPTY_MONOMIAL,
	symbolicFactor,
	variableMonomial,
	hashNode,
	compareNodes,
	nodesEqual,
	compareSymbolicFactors,
	sameBase,
	mulMonomials,
	compareMonomials,
	hashMonomial,
	monomialDegree,
	monomialsEqual,
	sortSymbolicFactors,
	monomialToString
} from './monomial.js';

// =============================================================================
// Normal Terms
// =============================================================================

export {
	ZERO_TERM,
	ONE_TERM,
	normalTerm,
	constantTerm,
	monomialTerm,
	isZeroTerm,
	isOneTerm,
	isConstantTerm,
	areLikeTerms,
	getMonomialSignature,
	addLikeTerms,
	mulTerms,
	negTerm,
	compareNormalTerms,
	termsEqual,
	sortNormalTerms,
	termToString
} from './term.js';

// =============================================================================
// Polynomials
// =============================================================================

export {
	ZERO_POLYNOMIAL,
	ONE_POLYNOMIAL,
	collectLikeTerms,
	addPolynomials,
	subPolynomials,
	negPolynomial,
	mulPolynomials,
	powPolynomial,
	isZeroPolynomial,
	isOnePolynomial,
	isConstantPolynomial,
	polynomialsEqual,
	polynomialDegree,
	leadingTerm,
	polynomialToString
} from './polynomial.js';

// =============================================================================
// Hash Functions
// =============================================================================

export {
	hashRational,
	hashRadical,
	hashRadicalArray,
	hashMathNode,
	hashAlgebraicTerm,
	hashAlgebraicCoefficient,
	hashSymbolicFactor,
	hashMonomial as hashMonomialFull,
	hashNormalTerm,
	hashPolynomial,
	hashNormalForm,
	canonicalHash,
	normalFormsEquivalent
} from './hash.js';

// =============================================================================
// Normalization
// =============================================================================

export { normalize, ZERO_NORMAL_FORM, ONE_NORMAL_FORM } from './normalize.js';

export {
	denormalize,
	denormalizeTerm,
	denormalizeCoefficient,
	denormalizeMonomial
} from './denormalize.js';

// =============================================================================
// Phase 1 Preprocessing Rules
// =============================================================================

export { applyRadicalRules, simplifyRadicals, preprocess, preprocessOnce } from './rules/index.js';

// =============================================================================
// Semantic Expression Checks
// =============================================================================

export { isZeroExpression, isOneExpression } from './normalize.js';

// =============================================================================
// Comparison and Ordering
// =============================================================================

export {
	compareRadicals as compareRadicalsCanonical,
	compareRadicalArrays,
	equalRadicalArrays,
	hashRadicalArray as hashRadicalArrayCanonical,
	compareAlgebraicTerms,
	sameRadicalSignature,
	hashAlgebraicTerm as hashAlgebraicTermCanonical,
	getRadicalSignature,
	sortRadicals,
	sortAlgebraicTerms,
	isRadicalArraySorted,
	isAlgebraicTermArraySorted,
	compareSymbolicFactors as compareSymbolicFactorsCanonical,
	sortSymbolicFactors as sortSymbolicFactorsCanonical,
	isSymbolicFactorArraySorted,
	compareMonomials as compareMonomialsCanonical,
	compareNormalTerms as compareNormalTermsCanonical,
	sortNormalTerms as sortNormalTermsCanonical,
	isNormalTermArraySorted
} from './compare.js';

// =============================================================================
// Step Recording (Pedagogical)
// =============================================================================

export {
	StepRecorder,
	getRuleDescription,
	preprocessWithSteps,
	preprocessOnceWithSteps
} from './step-recorder.js';

// =============================================================================
// Univariate Polynomial GCD
// =============================================================================

export {
	checkUnivariate,
	toUnivariateView,
	fromUnivariateView,
	divideUnivariate,
	gcdUnivariate,
	extractContent,
	tryUnivariateGcd,
	dividePolynomials,
	MAX_GCD_DEGREE
} from './univariate-gcd.js';

export type {
	UnivariateCheckResult,
	UnivariateView,
	DivisionResult,
	ContentResult
} from './univariate-gcd.js';
