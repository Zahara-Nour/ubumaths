/**
 * Dimensional Analysis Type Definitions
 *
 * Type system for validating unit compatibility in mathematical expressions,
 * computing resulting units from operations, and reporting detailed errors.
 *
 * @module mathAST/dimensional/types
 */

import type { MathNode } from '../types';
import type { Unit } from '../units/types';

// =============================================================================
// FUNCTION RULES
// =============================================================================

/**
 * Input unit requirement for a function
 *
 * Specifies what type of unit is valid as input to a mathematical function.
 *
 * @example
 * - sin, cos, tan: 'dimensionless' or 'angle' (radians/degrees)
 * - sqrt: 'any' (unit is preserved with halved exponents)
 * - abs: 'any' (unit is preserved)
 * - exp, log: 'dimensionless' (arguments must be pure numbers)
 */
export type FunctionInputRequirement =
	| 'dimensionless' // Must be dimensionless (pure number)
	| 'angle' // Must be an angle (radians, degrees) or dimensionless
	| 'any' // Any unit is allowed
	| 'same'; // For multi-arg functions: all args must have same unit

/**
 * Output unit behavior for a function
 *
 * Specifies how the function transforms the unit of its input.
 *
 * @example
 * - sin(angle): 'dimensionless' (output is always a pure number)
 * - sqrt(m^2): 'preserve' (output is m, exponents are halved)
 * - atan2(y, x): 'angle' (output is always an angle)
 */
export type FunctionOutputUnit =
	| 'dimensionless' // Output is always dimensionless
	| 'preserve' // Unit is preserved/transformed based on operation
	| 'angle'; // Output is always an angle

/**
 * Rule defining how a function handles units
 *
 * Specifies the unit requirements for function arguments and
 * how the output unit is determined.
 *
 * @example Trigonometric function (sin, cos, tan)
 * ```typescript
 * const sinRule: FunctionRule = {
 *   name: 'sin',
 *   inputRequirement: 'angle',
 *   outputUnit: 'dimensionless',
 *   description: 'Sine function requires angle input, returns dimensionless'
 * };
 * ```
 *
 * @example Square root
 * ```typescript
 * const sqrtRule: FunctionRule = {
 *   name: 'sqrt',
 *   inputRequirement: 'any',
 *   outputUnit: 'preserve',
 *   description: 'Square root preserves unit with halved exponents'
 * };
 * ```
 *
 * @example Exponential function
 * ```typescript
 * const expRule: FunctionRule = {
 *   name: 'exp',
 *   inputRequirement: 'dimensionless',
 *   outputUnit: 'dimensionless',
 *   description: 'Exponential requires and returns dimensionless'
 * };
 * ```
 */
export interface FunctionRule {
	/**
	 * Name of the function this rule applies to
	 *
	 * Should match the name used in FunctionNode.
	 * Examples: 'sin', 'cos', 'sqrt', 'log', 'exp', 'abs'
	 */
	readonly name: string;

	/**
	 * Unit requirement for the function's input argument(s)
	 *
	 * - 'dimensionless': Input must have no physical dimension
	 * - 'angle': Input must be an angle or dimensionless
	 * - 'any': Any unit is acceptable
	 * - 'same': For multi-argument functions, all args must match
	 */
	readonly inputRequirement: FunctionInputRequirement;

	/**
	 * How the function determines its output unit
	 *
	 * - 'dimensionless': Output is always a pure number
	 * - 'preserve': Unit is preserved (possibly transformed, e.g., sqrt halves exponents)
	 * - 'angle': Output is always an angle
	 */
	readonly outputUnit: FunctionOutputUnit;

	/**
	 * Human-readable description of the function's unit behavior
	 *
	 * Used in documentation and error messages.
	 */
	readonly description?: string;
}

// =============================================================================
// ANALYSIS OPTIONS
// =============================================================================

/**
 * Options controlling dimensional analysis behavior
 *
 * Fine-tunes how strict the analysis is and what edge cases to allow.
 */
export interface DimensionalAnalysisOptions {
	/**
	 * Enable strict checking mode (default: true)
	 *
	 * In strict mode:
	 * - Undefined variables cause errors
	 * - Unknown functions cause errors
	 * - No implicit conversions are allowed
	 *
	 * In non-strict mode:
	 * - Undefined variables are treated as dimensionless with warnings
	 * - Unknown functions preserve input units with warnings
	 */
	readonly strictMode?: boolean;

	/**
	 * Allow mixing dimensionless values with units (default: false)
	 *
	 * When true, expressions like `5 + {3 m}` will produce a warning
	 * instead of an error, treating the 5 as potentially having the
	 * same unit as the other operand.
	 *
	 * This is useful for physics problems where coefficients may
	 * implicitly carry units.
	 */
	readonly allowDimensionlessMix?: boolean;

	/**
	 * Allow non-integer exponents for units (default: true)
	 *
	 * When false, expressions like `m^1.5` will produce an error.
	 * Some applications require integer exponents for physical validity.
	 */
	readonly allowFractionalExponents?: boolean;
}

// =============================================================================
// DIMENSIONAL CONTEXT
// =============================================================================

/**
 * Context for dimensional analysis
 *
 * Provides information about variables, function rules, and analysis options
 * to the dimensional analyzer.
 *
 * @example Basic usage with variable units
 * ```typescript
 * const context: DimensionalContext = {
 *   variables: new Map([
 *     ['v', { components: new Map([['m', 1], ['s', -1]]), coefficient: 1 }], // velocity
 *     ['t', { components: new Map([['s', 1]]), coefficient: 1 }],            // time
 *     ['a', { components: new Map([['m', 1], ['s', -2]]), coefficient: 1 }]  // acceleration
 *   ])
 * };
 * ```
 *
 * @example With custom function rules
 * ```typescript
 * const context: DimensionalContext = {
 *   functionRules: new Map([
 *     ['customTrig', { name: 'customTrig', inputRequirement: 'angle', outputUnit: 'dimensionless' }]
 *   ]),
 *   options: { strictMode: true }
 * };
 * ```
 */
export interface DimensionalContext {
	/**
	 * Map of variable names to their units
	 *
	 * Variables not in this map are treated according to strictMode:
	 * - strict: error (UNDEFINED_VARIABLE)
	 * - non-strict: warning, treated as dimensionless
	 *
	 * @example
	 * new Map([
	 *   ['v', velocityUnit],  // Variable 'v' has velocity unit (m/s)
	 *   ['m', massUnit],      // Variable 'm' has mass unit (kg)
	 *   ['t', timeUnit]       // Variable 't' has time unit (s)
	 * ])
	 */
	readonly variables?: ReadonlyMap<string, Unit>;

	/**
	 * Custom function rules overriding or extending defaults
	 *
	 * The analyzer has built-in rules for common functions (sin, cos, sqrt, etc.).
	 * Use this to add rules for custom functions or override defaults.
	 *
	 * @example
	 * new Map([
	 *   ['customLog', { name: 'customLog', inputRequirement: 'dimensionless', outputUnit: 'dimensionless' }]
	 * ])
	 */
	readonly functionRules?: ReadonlyMap<string, FunctionRule>;

	/**
	 * Analysis options
	 *
	 * Controls strictness and edge case handling.
	 */
	readonly options?: DimensionalAnalysisOptions;
}

// =============================================================================
// ERROR CODES AND TYPES
// =============================================================================

/**
 * Error codes for dimensional analysis failures
 *
 * Each code represents a specific type of dimensional incompatibility
 * or validation failure.
 */
export type DimensionalErrorCode =
	| 'INCOMPATIBLE_UNITS' // Adding/subtracting incompatible units (m + s)
	| 'INVALID_FUNCTION_INPUT' // Function called with wrong unit type (sin(5 m))
	| 'NON_INTEGER_EXPONENT' // Fractional exponent when not allowed (m^1.5)
	| 'UNDEFINED_VARIABLE' // Variable not in context (strict mode)
	| 'NESTED_UNITS' // Unit node containing another unit ({5m} km)
	| 'INVALID_RELATION' // Comparing incompatible units (m < s)
	| 'DIVISION_DIMENSION_ZERO' // Division resulting in undefined dimension
	| 'INCONSISTENT_FUNCTION_ARGS'; // Multi-arg function with mismatched units

/**
 * Details providing additional context for dimensional errors
 *
 * Contains specific information about what was expected vs. actual,
 * which variable or function caused the issue, etc.
 */
export interface DimensionalErrorDetails {
	/**
	 * The unit that was expected
	 *
	 * For INCOMPATIBLE_UNITS: the unit of the first operand
	 * For INVALID_FUNCTION_INPUT: the required unit type (e.g., dimensionless)
	 */
	readonly expected?: Unit;

	/**
	 * The actual unit encountered
	 *
	 * The unit that caused the incompatibility.
	 */
	readonly actual?: Unit;

	/**
	 * Variable name for UNDEFINED_VARIABLE errors
	 */
	readonly variableName?: string;

	/**
	 * Function name for INVALID_FUNCTION_INPUT errors
	 */
	readonly functionName?: string;

	/**
	 * The required input type for function errors
	 */
	readonly requiredInputType?: FunctionInputRequirement;

	/**
	 * Index of the problematic argument in multi-arg functions
	 */
	readonly argumentIndex?: number;

	/**
	 * Additional human-readable context
	 */
	readonly context?: string;
}

/**
 * Detailed error information for dimensional analysis failures
 *
 * Provides comprehensive information about what went wrong, where in the
 * AST it occurred, and what was expected vs. actual.
 *
 * @example Incompatible units error
 * ```typescript
 * const error: DimensionalError = {
 *   code: 'INCOMPATIBLE_UNITS',
 *   message: "Cannot add 'meters' and 'seconds': incompatible dimensions",
 *   node: additionNode,
 *   details: {
 *     expected: meterUnit,
 *     actual: secondUnit,
 *     context: 'Addition requires operands with the same dimension'
 *   }
 * };
 * ```
 *
 * @example Invalid function input error
 * ```typescript
 * const error: DimensionalError = {
 *   code: 'INVALID_FUNCTION_INPUT',
 *   message: "sin() requires dimensionless or angle argument, got 'meters'",
 *   node: functionNode,
 *   details: {
 *     functionName: 'sin',
 *     requiredInputType: 'angle',
 *     actual: meterUnit
 *   }
 * };
 * ```
 */
export interface DimensionalError {
	/**
	 * Error code identifying the type of error
	 */
	readonly code: DimensionalErrorCode;

	/**
	 * Human-readable error message
	 *
	 * Should be clear and actionable, suitable for display to users.
	 */
	readonly message: string;

	/**
	 * The AST node where the error occurred
	 *
	 * Allows the error to be linked to a specific part of the expression
	 * for highlighting in the UI.
	 */
	readonly node: MathNode;

	/**
	 * Additional details about the error
	 *
	 * Provides specific information for programmatic handling and
	 * detailed error display.
	 */
	readonly details?: DimensionalErrorDetails;
}

// =============================================================================
// WARNING CODES AND TYPES
// =============================================================================

/**
 * Warning codes for non-fatal dimensional analysis issues
 *
 * Warnings indicate potential problems that don't necessarily
 * invalidate the expression but may indicate user error.
 */
export type DimensionalWarningCode =
	| 'DIMENSIONLESS_MIXED' // Mixing dimensionless with units when allowed
	| 'UNKNOWN_FUNCTION' // Function without defined rule (non-strict mode)
	| 'IMPLICIT_UNIT_ASSUMPTION' // Variable assumed to have a unit
	| 'LARGE_EXPONENT' // Unusually large unit exponent (e.g., m^10)
	| 'COEFFICIENT_PRECISION'; // Coefficient may have precision loss

/**
 * Warning information for non-fatal dimensional issues
 *
 * @example Dimensionless mixing warning
 * ```typescript
 * const warning: DimensionalWarning = {
 *   code: 'DIMENSIONLESS_MIXED',
 *   message: 'Mixing dimensionless value with meters - assuming same dimension',
 *   node: additionNode
 * };
 * ```
 *
 * @example Unknown function warning
 * ```typescript
 * const warning: DimensionalWarning = {
 *   code: 'UNKNOWN_FUNCTION',
 *   message: "Unknown function 'customFunc' - assuming unit-preserving behavior",
 *   node: functionNode
 * };
 * ```
 */
export interface DimensionalWarning {
	/**
	 * Warning code identifying the type of warning
	 */
	readonly code: DimensionalWarningCode;

	/**
	 * Human-readable warning message
	 */
	readonly message: string;

	/**
	 * The AST node where the warning was generated
	 */
	readonly node: MathNode;

	/**
	 * Additional context for the warning
	 */
	readonly details?: {
		readonly assumedUnit?: Unit;
		readonly functionName?: string;
		readonly variableName?: string;
	};
}

// =============================================================================
// ANALYSIS RESULT
// =============================================================================

/**
 * Result of dimensional analysis on a MathAST expression
 *
 * Contains the validity status, computed result unit (if valid),
 * and any errors or warnings generated during analysis.
 *
 * @example Valid expression result
 * ```typescript
 * // For expression: {5 m} + {3 m}
 * const result: DimensionalAnalysisResult = {
 *   valid: true,
 *   resultUnit: { components: new Map([['m', 1]]), coefficient: 1 },
 *   errors: []
 * };
 * ```
 *
 * @example Invalid expression result
 * ```typescript
 * // For expression: {5 m} + {3 s}
 * const result: DimensionalAnalysisResult = {
 *   valid: false,
 *   resultUnit: null,
 *   errors: [{
 *     code: 'INCOMPATIBLE_UNITS',
 *     message: "Cannot add meters and seconds",
 *     node: additionNode,
 *     details: { expected: meterUnit, actual: secondUnit }
 *   }]
 * };
 * ```
 *
 * @example Expression with computed unit
 * ```typescript
 * // For expression: {10 m} / {2 s}
 * const result: DimensionalAnalysisResult = {
 *   valid: true,
 *   resultUnit: { components: new Map([['m', 1], ['s', -1]]), coefficient: 1 },
 *   errors: []
 * };
 * ```
 */
export interface DimensionalAnalysisResult {
	/**
	 * Whether the expression is dimensionally valid
	 *
	 * True if no errors were found, false otherwise.
	 * Warnings do not affect validity.
	 */
	readonly valid: boolean;

	/**
	 * The resulting unit of the expression
	 *
	 * - If valid: the computed unit (may be dimensionless with empty components)
	 * - If invalid: null
	 * - For pure numbers without units: null (no unit information)
	 *
	 * Note: A dimensionless result (like from sin(x)) will have a Unit
	 * with empty components, while a pure number without any unit context
	 * will have null.
	 */
	readonly resultUnit: Unit | null;

	/**
	 * Errors found during analysis
	 *
	 * Empty array if the expression is valid.
	 * Multiple errors may be reported for complex expressions.
	 */
	readonly errors: readonly DimensionalError[];

	/**
	 * Non-fatal warnings generated during analysis
	 *
	 * May be present even for valid expressions.
	 */
	readonly warnings?: readonly DimensionalWarning[];
}

// =============================================================================
// DIMENSIONAL ANALYZER INTERFACE
// =============================================================================

/**
 * Interface for dimensional analyzer implementations
 *
 * Defines the contract for analyzing MathAST expressions for
 * dimensional validity.
 *
 * @example Usage
 * ```typescript
 * const analyzer: DimensionalAnalyzer = createDimensionalAnalyzer();
 * const context: DimensionalContext = {
 *   variables: new Map([['v', velocityUnit]])
 * };
 * const result = analyzer.analyze(expression, context);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export interface DimensionalAnalyzer {
	/**
	 * Analyze an expression for dimensional validity
	 *
	 * @param node - The MathAST node to analyze
	 * @param context - Context providing variable units and options
	 * @returns Analysis result with validity, result unit, and errors/warnings
	 */
	analyze(node: MathNode, context?: DimensionalContext): DimensionalAnalysisResult;

	/**
	 * Check if two units are compatible for addition/subtraction
	 *
	 * @param a - First unit
	 * @param b - Second unit
	 * @returns True if units can be added/subtracted
	 */
	areCompatible(a: Unit, b: Unit): boolean;

	/**
	 * Compute the resulting unit from multiplication
	 *
	 * @param a - First unit
	 * @param b - Second unit
	 * @returns Product unit
	 */
	multiplyUnits(a: Unit, b: Unit): Unit;

	/**
	 * Compute the resulting unit from division
	 *
	 * @param numerator - Numerator unit
	 * @param denominator - Denominator unit
	 * @returns Quotient unit
	 */
	divideUnits(numerator: Unit, denominator: Unit): Unit;

	/**
	 * Compute the resulting unit from exponentiation
	 *
	 * @param base - Base unit
	 * @param exponent - Numeric exponent
	 * @returns Unit raised to power
	 */
	powerUnit(base: Unit, exponent: number): Unit;
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * Type guard to check if a result is valid
 *
 * Useful for narrowing the type when working with results.
 *
 * @example
 * ```typescript
 * const result = analyzer.analyze(node, context);
 * if (isValidResult(result)) {
 *   // TypeScript knows result.resultUnit may be Unit here
 *   console.log('Valid with unit:', result.resultUnit);
 * }
 * ```
 */
export type ValidAnalysisResult = DimensionalAnalysisResult & {
	readonly valid: true;
};

/**
 * Type guard to check if a result is invalid
 *
 * @example
 * ```typescript
 * const result = analyzer.analyze(node, context);
 * if (isInvalidResult(result)) {
 *   // Handle errors
 *   result.errors.forEach(e => console.error(e.message));
 * }
 * ```
 */
export type InvalidAnalysisResult = DimensionalAnalysisResult & {
	readonly valid: false;
	readonly resultUnit: null;
	readonly errors: readonly [DimensionalError, ...DimensionalError[]];
};

// =============================================================================
// DEFAULT FUNCTION RULES
// =============================================================================

/**
 * Names of functions that have built-in rules
 *
 * These functions have predefined dimensional behavior in the analyzer.
 * Custom rules can override these defaults via DimensionalContext.
 */
export type BuiltInFunctionName =
	| 'sin'
	| 'cos'
	| 'tan'
	| 'asin'
	| 'acos'
	| 'atan'
	| 'atan2'
	| 'sinh'
	| 'cosh'
	| 'tanh'
	| 'exp'
	| 'log'
	| 'ln'
	| 'log10'
	| 'log2'
	| 'sqrt'
	| 'cbrt'
	| 'abs'
	| 'floor'
	| 'ceil'
	| 'round'
	| 'sign'
	| 'max'
	| 'min';
