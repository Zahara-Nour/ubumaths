/**
 * Dimensional Analysis Module for MathAST
 *
 * Provides tools for analyzing and validating the dimensional consistency
 * of mathematical expressions with physical units.
 *
 * @example
 * ```typescript
 * import { analyzeDimensions, isDimensionallyValid } from '$lib/mathAST/dimensional';
 * import { quantity, add } from '$lib/mathAST';
 *
 * // Valid: adding meters
 * const validExpr = add(quantity('5', 'm'), quantity('3', 'm'));
 * const result = analyzeDimensions(validExpr);
 * console.log(result.valid); // true
 *
 * // Invalid: adding meters and seconds
 * const invalidExpr = add(quantity('5', 'm'), quantity('3', 's'));
 * const result2 = analyzeDimensions(invalidExpr);
 * console.log(result2.valid); // false
 * console.log(result2.errors[0].code); // 'INCOMPATIBLE_UNITS'
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
	// Context
	DimensionalContext,
	DimensionalAnalysisOptions,

	// Results
	DimensionalAnalysisResult,
	ValidAnalysisResult,
	InvalidAnalysisResult,

	// Errors
	DimensionalError,
	DimensionalErrorCode,
	DimensionalErrorDetails,

	// Warnings
	DimensionalWarning,
	DimensionalWarningCode,

	// Function rules
	FunctionRule,
	FunctionInputRequirement,
	FunctionOutputUnit,
	BuiltInFunctionName,

	// Analyzer interface
	DimensionalAnalyzer
} from './types';

// =============================================================================
// Analyzer Functions
// =============================================================================

export {
	// Main analysis function
	analyzeDimensions,

	// Convenience functions
	isDimensionallyValid,
	getResultingUnit
} from './analyzer';

// =============================================================================
// Function Rules
// =============================================================================

export {
	// Default rules
	DEFAULT_FUNCTION_RULES,

	// Rule utilities
	getFunctionRule,
	isKnownFunction,
	createFunctionRule,
	mergeWithDefaultRules
} from './rules';

// =============================================================================
// Namespace Export
// =============================================================================

import { analyzeDimensions, isDimensionallyValid, getResultingUnit } from './analyzer';
import {
	DEFAULT_FUNCTION_RULES,
	getFunctionRule,
	isKnownFunction,
	createFunctionRule,
	mergeWithDefaultRules
} from './rules';

/**
 * Namespace containing all dimensional analysis functions.
 *
 * @example
 * ```typescript
 * import { DimensionalAnalysis } from '$lib/mathAST/dimensional';
 *
 * const result = DimensionalAnalysis.analyze(expression);
 * const isValid = DimensionalAnalysis.isValid(expression);
 * const unit = DimensionalAnalysis.getUnit(expression);
 * ```
 */
export const DimensionalAnalysis = {
	// Analysis
	analyze: analyzeDimensions,
	isValid: isDimensionallyValid,
	getUnit: getResultingUnit,

	// Rules
	defaultRules: DEFAULT_FUNCTION_RULES,
	getRule: getFunctionRule,
	isKnown: isKnownFunction,
	createRule: createFunctionRule,
	mergeRules: mergeWithDefaultRules
} as const;
