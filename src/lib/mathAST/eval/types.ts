/**
 * MathAST Evaluation Types
 *
 * Type definitions for the evaluation and substitution system.
 * These types provide the foundation for variable substitution
 * and expression evaluation.
 */

import type { MathNode } from '../types';
// Rational type removed - no longer needed after refactoring
import type { FunctionBindings } from './function-bindings';
import type { Unit } from '../units/types';
import type { PrecisionType } from '$lib/questions/types';

// =============================================================================
// Binding Types
// =============================================================================

/**
 * A single binding value that can be substituted for a variable.
 *
 * Supports three forms:
 * - MathNode: Directly use this AST node
 * - number: Convert to NumberNode (e.g., 5 becomes number('5'))
 * - string: Parse as LaTeX expression
 *
 * @example
 * // Direct MathNode
 * const binding: BindingValue = add(number('2'), number('3'));
 *
 * // Number (converted to NumberNode)
 * const binding: BindingValue = 5;
 *
 * // String (parsed as LaTeX)
 * const binding: BindingValue = '2+3';
 */
export type BindingValue = MathNode | number | string;

/**
 * Variable bindings for substitution.
 *
 * Maps variable names (including Greek letter names) to their replacement values.
 * Keys can be:
 * - Regular variable names (e.g., 'x', 'y', 'abc')
 * - Greek letter names (e.g., 'alpha', 'beta', 'pi')
 *
 * @example
 * // Simple numeric substitution
 * const bindings: EvalBindings = { x: 5, y: 3 };
 *
 * // Mixed substitution types
 * const bindings: EvalBindings = {
 *   x: 5,              // number -> NumberNode
 *   y: '2+3',          // string -> parse as LaTeX
 *   z: number('7')     // direct MathNode
 * };
 *
 * // Greek letter substitution
 * const bindings: EvalBindings = { alpha: 5, theta: 'pi/4' };
 */
export interface EvalBindings {
	readonly [variable: string]: BindingValue;
}

// =============================================================================
// Evaluation Options
// =============================================================================

/**
 * Evaluation mode determines how results are computed.
 *
 * - 'exact': Use exact arithmetic (BigInt rationals) where possible
 * - 'decimal': Use floating-point arithmetic with specified precision
 */
export type EvalMode = 'exact' | 'decimal';

/**
 * Options controlling evaluation behavior.
 *
 * @example
 * // Exact mode (default)
 * const options: EvalOptions = { mode: 'exact' };
 *
 * // Decimal mode with custom precision
 * const options: EvalOptions = { mode: 'decimal', precision: 10 };
 *
 * // With function bindings
 * const options: EvalOptions = {
 *   mode: 'exact',
 *   functions: {
 *     f: { expression: parseLatex('x^2'), parameters: ['x'] }
 *   }
 * };
 */
export interface EvalOptions {
	/** Evaluation mode: 'exact' for rational arithmetic, 'decimal' for floating-point */
	readonly mode?: EvalMode;

	/**
	 * Precision specification for decimal mode.
	 * Supports various precision types: none, decimal, significant, magnitude, tolerance.
	 * Only used when mode is 'decimal'.
	 * Default: { type: 'none' } (full precision)
	 */
	readonly precision?: PrecisionType;

	/**
	 * Function bindings for generic functions (f, g, h, etc.).
	 * When provided, function calls like f(3) will be substituted with their
	 * definitions before evaluation.
	 */
	readonly functions?: FunctionBindings;
}

/**
 * Default evaluation options.
 */
export const DEFAULT_EVAL_OPTIONS: Required<EvalOptions> = {
	mode: 'exact',
	precision: { type: 'none' },
	functions: {}
} as const;

// =============================================================================
// Evaluation Results
// =============================================================================

/**
 * Represents a complex number result from evaluation.
 */
export interface ComplexValueResult {
	readonly real: number;
	readonly imag: number;
}

/**
 * The type of values that can result from evaluation.
 *
 * - MathNode: In exact mode, the simplified AST (e.g., sqrt(2), cos(3))
 * - number: In decimal mode, the numeric approximation
 * - ComplexValueResult: For complex number results
 */
export type EvalValue = MathNode | number | ComplexValueResult;

/**
 * Result of evaluating a mathematical expression.
 *
 * Contains both the computed value and the simplified AST representation.
 *
 * @example
 * // Exact evaluation result (mode: 'exact')
 * const result: EvalResult = {
 *   value: sqrt(number('2')),  // MathNode for sqrt(2)
 *   node: sqrt(number('2')),
 *   exact: true
 * };
 *
 * // Decimal evaluation result (mode: 'decimal')
 * const result: EvalResult = {
 *   value: 1.4142135623730951,
 *   node: number('1.4142135623730951'),
 *   exact: false
 * };
 *
 * // Complex evaluation result
 * const result: EvalResult = {
 *   value: { real: 3, imag: 4 },  // 3 + 4i
 *   node: complex(number('3'), number('4')),
 *   exact: false
 * };
 */
export interface EvalResult {
	/** The computed value: MathNode (exact mode), number (decimal mode), or ComplexValueResult */
	readonly value: EvalValue;

	/** The simplified AST node representing the result */
	readonly node: MathNode;

	/** True if the result is exact (no approximation or rounding) */
	readonly exact: boolean;
}

// =============================================================================
// Unit-Aware Evaluation Types
// =============================================================================

/**
 * Conversion mode for unit-aware evaluation.
 *
 * - 'first': Convert to the first unit encountered (5 km + 3000 m = 8 km)
 * - 'si': Normalize to SI base units (5 km + 3000 m = 8000 m)
 * - 'best': Choose the "best" unit based on numeric result readability
 *           (prefer values between 0.1 and 1000 for human readability)
 */
export type UnitConversionMode = 'first' | 'si' | 'best';

/**
 * Options for unit-aware evaluation.
 *
 * Extends EvalOptions with unit-specific settings.
 *
 * @example
 * // Default: convert to first unit encountered
 * const options: EvalWithUnitsOptions = { conversionMode: 'first' };
 *
 * // Normalize to SI base units
 * const options: EvalWithUnitsOptions = { conversionMode: 'si' };
 *
 * // Choose best unit for readability
 * const options: EvalWithUnitsOptions = { conversionMode: 'best' };
 *
 * // With variable units
 * const options: EvalWithUnitsOptions = {
 *   variableUnits: new Map([['v', velocityUnit]])
 * };
 */
export interface EvalWithUnitsOptions extends EvalOptions {
	/**
	 * How to handle unit conversion when combining values.
	 * Default: 'first'
	 */
	readonly conversionMode?: UnitConversionMode;

	/**
	 * Unit bindings for variables.
	 * Maps variable names to their units for dimensional analysis.
	 */
	readonly variableUnits?: ReadonlyMap<string, Unit>;
}

/**
 * Default options for unit-aware evaluation.
 */
export const DEFAULT_EVAL_WITH_UNITS_OPTIONS: Required<
	Omit<EvalWithUnitsOptions, 'functions' | 'variableUnits'>
> & {
	functions: FunctionBindings;
	variableUnits: ReadonlyMap<string, Unit>;
} = {
	mode: 'exact',
	precision: { type: 'none' },
	functions: {},
	conversionMode: 'first',
	variableUnits: new Map()
} as const;

/**
 * Result of evaluating an expression with unit propagation.
 *
 * Extends EvalResult with a mandatory unit field.
 *
 * @example
 * // Result with unit
 * const result: EvalResultWithUnit = {
 *   value: 8,
 *   node: number('8'),
 *   exact: true,
 *   unit: { components: new Map([['m', 1]]), coefficient: 1000 } // km
 * };
 *
 * // Result with conversion applied
 * const result: EvalResultWithUnit = {
 *   value: 8000,
 *   node: number('8000'),
 *   exact: true,
 *   unit: { components: new Map([['m', 1]]), coefficient: 1 }, // m
 *   originalUnit: { components: new Map([['m', 1]]), coefficient: 1000 } // was km
 * };
 */
export interface EvalResultWithUnit {
	/** The computed value as a Rational (exact mode), number (decimal mode), or ComplexValueResult */
	readonly value: EvalValue;

	/** The simplified AST node representing the result */
	readonly node: MathNode;

	/** True if the result is exact (no approximation or rounding) */
	readonly exact: boolean;

	/**
	 * The resulting unit of the expression.
	 * Always present (may be dimensionless for pure numbers).
	 */
	readonly unit: Unit;

	/**
	 * Original unit before conversion (if different from unit).
	 * Useful for understanding what conversion was applied.
	 */
	readonly originalUnit?: Unit;
}

// =============================================================================
// Substitution Options
// =============================================================================

/**
 * Options controlling substitution behavior.
 */
export interface SubstituteOptions {
	/**
	 * Maximum recursion depth for resolving chained substitutions.
	 * Prevents infinite loops when bindings reference each other.
	 * Default: 10
	 *
	 * @example
	 * // With {a: 'b', b: 'c', c: 5}, substituting 'a' requires 2 iterations
	 * // to fully resolve: a -> b -> c -> 5
	 */
	readonly maxIterations?: number;
}

/**
 * Default substitution options.
 */
export const DEFAULT_SUBSTITUTE_OPTIONS: Required<SubstituteOptions> = {
	maxIterations: 10
} as const;
