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
	type PeriodicityResult
} from './periodicity';

// Domain analysis (re-exported from domain module)
export * from '../domain';
