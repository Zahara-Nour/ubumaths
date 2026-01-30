/**
 * MathAST Analysis Module
 *
 * Provides tools for analyzing mathematical expressions:
 * - Linear combination extraction
 * - Polynomial analysis
 * - Expression classification
 * - Algebraic structure detection
 *
 * @module mathAST/analysis
 */

// Linear combination analysis
export {
	extractLinearCombination,
	isLinearCombination,
	getCoefficient,
	equalLinearCombinations,
	type LinearCombinationResult
} from './linear-combination';

// Expression classification
export {
	classifyExpression,
	getPolynomialDegree,
	isPolynomialIn,
	containsTranscendental,
	getTranscendentalType,
	containsRadical,
	isRationalIn,
	calculateComplexity,
	type ExpressionCategory,
	type ExpressionClassification
} from './expression-classify';

// Polynomial analysis
export {
	analyzePolynomial,
	getPolynomialCoefficients,
	isMonomial,
	isBinomial,
	isTrinomial,
	getTermCount,
	type MonomialInfo,
	type PolynomialAnalysis
} from './polynomial-analysis';

// Algebraic structure detection
export {
	detectStructure,
	isDifferenceOfSquares,
	isPerfectSquareTrinomial,
	isSumOfCubes,
	isDifferenceOfCubes,
	isQuadraticForm,
	isFactoredForm,
	hasCommonFactor,
	type StructureType,
	type DetectedStructure,
	type DifferenceOfSquaresInfo,
	type PerfectSquareTrinomialInfo,
	type SumOfCubesInfo,
	type DifferenceOfCubesInfo,
	type QuadraticFormInfo,
	type FactoredFormInfo,
	type CommonFactorInfo
} from './structures';

// Symmetry detection
export {
	detectSymmetry,
	isEven,
	isOdd,
	hasNoSymmetry,
	type SymmetryType,
	type SymmetryResult
} from './symmetry';

// Periodicity detection
export {
	detectPeriodicity,
	isPeriodic,
	getPeriod,
	getPeriodNumeric,
	// User-defined periodic functions
	registerPeriodicFunction,
	unregisterPeriodicFunction,
	clearPeriodicFunctionRegistry,
	getRegisteredPeriodicFunctions,
	isRegisteredPeriodicFunction,
	type PeriodicityResult,
	type PeriodicityStep,
	type PeriodicityRule,
	type PeriodicityOptions,
	type UserPeriodicFunction,
	type RegisterFunctionOptions
} from './periodicity';

// Coefficient extraction utilities
export {
	isTargetVariable,
	isTargetVariableIn,
	containsVariable,
	containsAnyVariable,
	applySign,
	addCoefficients,
	buildProduct,
	extractCoefficientAndVariable,
	extractLinearForm,
	type ExtractedTerm,
	type LinearForm
} from './coefficient-utils';

// Domain analysis (re-exported from domain module)
export * from '../domain';

// Continuity analysis - Types
export type {
	DiscontinuityType,
	DiscontinuitySource,
	PeriodicDiscontinuityInfo,
	Discontinuity,
	ContinuityRule,
	ContinuityStep,
	ContinuityResult,
	ContinuityOptions,
	DiscontinuityCandidate
} from './continuity-types';

// Continuity analysis - Functions
export {
	analyzeContinuity,
	findDiscontinuityCandidates,
	checkContinuityAtPoint
} from './continuity';

export {
	// Type descriptions
	DISCONTINUITY_TYPE_DESCRIPTIONS,
	getDiscontinuityTypeDescription,
	// Source descriptions
	DISCONTINUITY_SOURCE_DESCRIPTIONS,
	getDiscontinuitySourceDescription,
	// Rule descriptions
	CONTINUITY_RULE_DESCRIPTIONS,
	getContinuityRuleDescription,
	// Full descriptions
	describeDiscontinuity,
	describeDiscontinuityShort,
	describePeriodicPattern,
	summarizeContinuityResult
} from './continuity-steps';

// Differentiability analysis - Types
export type {
	NonDifferentiabilityType,
	NonDifferentiabilitySource,
	DerivativeLimit,
	PeriodicNonDifferentiabilityInfo,
	NonDifferentiablePoint,
	BoundaryBehavior,
	NonDifferentiabilityCandidate,
	DifferentiabilityRule,
	DifferentiabilityStep,
	DifferentiabilityResult,
	DifferentiabilityOptions
} from './differentiability-types';

// Differentiability analysis - Functions
export {
	analyzeDifferentiability,
	findNonDifferentiabilityCandidates,
	checkDifferentiabilityAtPoint,
	computeDifferentiabilityDomain
} from './differentiability';

export {
	// Type descriptions
	NON_DIFFERENTIABILITY_TYPE_DESCRIPTIONS,
	getNonDifferentiabilityTypeDescription,
	// Source descriptions
	NON_DIFFERENTIABILITY_SOURCE_DESCRIPTIONS,
	getNonDifferentiabilitySourceDescription,
	// Rule descriptions
	DIFFERENTIABILITY_RULE_DESCRIPTIONS,
	getDifferentiabilityRuleDescription,
	// Full descriptions
	describeNonDifferentiablePoint,
	describeNonDifferentiablePointShort,
	describeBoundary,
	describePeriodicNonDifferentiability,
	summarizeDifferentiabilityResult
} from './differentiability-steps';
