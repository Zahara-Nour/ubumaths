/**
 * Shared Parameterization Library - Type Definitions
 * ===================================================
 *
 * Content-agnostic parameterization system using Markdown syntax:
 * - Variables: {{var}}
 * - Random: {{random:1-10}} or {{1-10}}
 * - Eval: {{eval:expr}}
 *
 * Features:
 * - Variables with reference chaining
 * - Random number generation (integer, decimal, with exclusions)
 * - Expression evaluation
 * - Circular dependency detection
 *
 * @module shared/parameterization/types
 */

// ============================================================================
// TOKENS
// ============================================================================

/**
 * Token extracted from text during parsing
 *
 * Represents a single parameterization construct in text.
 */
export interface Token {
	/** Token type */
	type: 'variable' | 'random' | 'eval';

	/** Full token text including delimiters: "{{a}}" */
	content: string;

	/** Inner content without delimiters: "a" */
	inner: string;

	/** Start position in original text */
	start: number;

	/** End position in original text (exclusive) */
	end: number;
}

// ============================================================================
// VARIABLES
// ============================================================================

/**
 * Variable definition
 *
 * Variables are resolved in declaration order and can reference
 * previously defined variables.
 *
 * @example Simple constant
 * { name: 'a', expression: '42' }
 *
 * @example Variable reference
 * { name: 'b', expression: '{{a}}' }
 *
 * @example Random number
 * { name: 'c', expression: '{{random:1-10}}' }
 *
 * @example Expression
 * { name: 'd', expression: '{{eval:a+b}}' }
 */
export interface Variable {
	/** Variable name (used in references) */
	name: string;

	/**
	 * Expression defining the variable value
	 *
	 * Can contain:
	 * - Literal values: "42", "3.14"
	 * - Variable references: {{var}}
	 * - Random specs: {{random:1-10}} or {{1-10}}
	 * - Eval expressions: {{eval:a+b}}
	 */
	expression: string;
}

/**
 * Resolved variable with final value
 */
export interface ResolvedVariable {
	/** Variable name */
	name: string;

	/** Final resolved value (as string) */
	value: string;
}

// ============================================================================
// RANDOM SPECIFICATIONS
// ============================================================================

/**
 * Number or variable reference
 *
 * Used for bounds, digit counts, and exclusion values.
 */
export type NumberOrVariable =
	| { type: 'number'; value: number }
	| { type: 'variable'; name: string };

/**
 * Exclusion pattern for random generation
 *
 * @example Single value
 * { type: 'value', value: { type: 'number', value: 5 } }
 *
 * @example Range
 * { type: 'range', min: { type: 'number', value: 5 }, max: { ... value: 7 } }
 *
 * @example Variable
 * { type: 'value', value: { type: 'variable', name: 'a' } }
 */
export type Exclusion =
	| { type: 'value'; value: NumberOrVariable }
	| { type: 'range'; min: NumberOrVariable; max: NumberOrVariable };

/**
 * Random number specification
 *
 * Unified type supporting all random number formats using discriminated union.
 *
 * @example Integer range
 * Syntax: {{random:1-10}} or {{1-10}}
 * Spec: { type: 'integer', min: {type:'number',value:1}, max: {...,value:10} }
 *
 * @example Decimal by digits
 * Syntax: {{random:2.3}} or {{2.3}}
 * Spec: { type: 'decimal-by-digits', digitsBefore: {type:'number',value:2}, digitsAfter: {...,value:3} }
 *
 * @example Decimal range with step
 * Syntax: {{random:0.5-9.99:0.01}} or {{0.5-9.99:0.01}}
 * Spec: { type: 'decimal-range', min: {...,value:0.5}, max: {...,value:9.99}, step: 0.01 }
 *
 * @example With exclusions
 * Syntax: {{random:1-20!5,7-9}} or {{1-20!5,7-9}}
 * Spec: { ..., exclusions: [...] }
 *
 * @example Variable bounds
 * Syntax: {{random:{{min}}-{{max}}}} or {{{{min}}-{{max}}}}
 * Spec: { type: 'integer', min: {type:'variable',name:'min'}, max: {type:'variable',name:'max'} }
 */
export type RandomSpec =
	| {
			/** Integer range: {{random:1-10}} or {{1-10}} */
			type: 'integer';
			min: NumberOrVariable;
			max: NumberOrVariable;
			exclusions: Exclusion[];
	  }
	| {
			/** Decimal by digits: {{random:2.3}} or {{2.3}} */
			type: 'decimal-by-digits';
			digitsBefore: NumberOrVariable;
			digitsAfter: NumberOrVariable;
			exclusions: Exclusion[];
	  }
	| {
			/** Decimal range with step: {{random:0.5-9.99:0.01}} or {{0.5-9.99:0.01}} */
			type: 'decimal-range';
			min: NumberOrVariable;
			max: NumberOrVariable;
			step: number;
			exclusions: Exclusion[];
	  };

// ============================================================================
// RESOLUTION & VALIDATION
// ============================================================================

/**
 * Context for variable resolution
 *
 * Maintains state during the resolution process.
 */
export interface ResolutionContext {
	/** Variable definitions to resolve */
	variables: Variable[];

	/** Variables resolved so far (in order) */
	resolvedVariables: ResolvedVariable[];

	/** Optional seed for reproducible random generation */
	seed?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
	/** Whether validation passed */
	valid: boolean;

	/** Validation errors (empty if valid) */
	errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
	/** Error type */
	type: 'circular-dependency' | 'undefined-variable' | 'invalid-syntax' | 'invalid-range';

	/** Human-readable error message */
	message: string;

	/** Variable name where error occurred (if applicable) */
	variable?: string;

	/** Dependency path for circular dependencies */
	path?: string[];
}
