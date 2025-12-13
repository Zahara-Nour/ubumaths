/**
 * Construction Expression Evaluator
 *
 * This module provides expression evaluation for construction scripts.
 * It handles parameter references ($paramName), object coordinate references
 * ($objectId.x, $objectId.y), and mathematical expressions using the
 * mathAST library.
 *
 * @module constructions/core/evaluator
 */

import { parseLatexSafe } from '$lib/mathAST/parser';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { evaluate } from '$lib/mathAST/eval/evaluate';
import type { MathNode } from '$lib/mathAST/types';
import type { Expr, ParameterValues, Position } from '../types';
import { PARAM_REF_PATTERN } from '../constants';

// =============================================================================
// Types
// =============================================================================

/**
 * Context for expression evaluation containing all available values
 */
export interface EvaluationContext {
	/** Current parameter values */
	readonly parameters: ParameterValues;
	/** Map of object IDs to their current positions */
	readonly objectPositions: ReadonlyMap<string, Position>;
}

/**
 * Result of parsing an expression
 */
export interface ParsedExpression {
	/** Whether parsing succeeded */
	readonly success: boolean;
	/** The parsed AST (null if parsing failed) */
	readonly ast: MathNode | null;
	/** Error message (null if parsing succeeded) */
	readonly error: string | null;
	/** List of referenced parameter/object names */
	readonly references: readonly string[];
}

/**
 * Result of evaluating an expression
 */
export interface EvaluationResult {
	/** Whether evaluation succeeded */
	readonly success: boolean;
	/** The computed numeric value (NaN if evaluation failed) */
	readonly value: number;
	/** Error message (null if evaluation succeeded) */
	readonly error: string | null;
}

// =============================================================================
// Reference Extraction
// =============================================================================

/**
 * Extract all parameter and object references from an expression string
 *
 * Finds all occurrences of:
 * - $paramName (parameter reference)
 * - $objectId.x (object x-coordinate)
 * - $objectId.y (object y-coordinate)
 *
 * @param expr - Expression string to analyze
 * @returns Object with parameter names and object coordinate references
 *
 * @example
 * ```typescript
 * const refs = extractReferences("$sideLength * sqrt(3) / 2");
 * // refs = { parameters: ["sideLength"], objectCoords: [] }
 *
 * const refs2 = extractReferences("$A.x + $offset");
 * // refs2 = { parameters: ["offset"], objectCoords: [{ id: "A", coord: "x" }] }
 * ```
 */
export function extractReferences(expr: string): {
	parameters: string[];
	objectCoords: { id: string; coord: 'x' | 'y' }[];
} {
	const parameters: string[] = [];
	const objectCoords: { id: string; coord: 'x' | 'y' }[] = [];

	// Reset regex state
	const pattern = new RegExp(PARAM_REF_PATTERN.source, 'g');
	let match;

	while ((match = pattern.exec(expr)) !== null) {
		const name = match[1];
		const coord = match[2] as 'x' | 'y' | undefined;

		if (coord) {
			// Object coordinate reference: $objectId.x or $objectId.y
			const existing = objectCoords.find((oc) => oc.id === name && oc.coord === coord);
			if (!existing) {
				objectCoords.push({ id: name, coord });
			}
		} else {
			// Parameter reference: $paramName
			if (!parameters.includes(name)) {
				parameters.push(name);
			}
		}
	}

	return { parameters, objectCoords };
}

/**
 * Get all unique reference names from an expression (both parameters and object IDs)
 *
 * @param expr - Expression string to analyze
 * @returns Array of unique reference names
 */
export function getAllReferenceNames(expr: string): string[] {
	const { parameters, objectCoords } = extractReferences(expr);
	const names = [...parameters];

	for (const oc of objectCoords) {
		if (!names.includes(oc.id)) {
			names.push(oc.id);
		}
	}

	return names;
}

// =============================================================================
// Expression Preprocessing Helpers
// =============================================================================

/**
 * Find the matching closing parenthesis for an opening parenthesis
 *
 * @param str - The string to search in
 * @param startIndex - Index of the opening parenthesis
 * @returns Index of the matching closing parenthesis, or -1 if not found
 */
function findMatchingParen(str: string, startIndex: number): number {
	if (str[startIndex] !== '(') return -1;

	let depth = 1;
	for (let i = startIndex + 1; i < str.length; i++) {
		if (str[i] === '(') depth++;
		else if (str[i] === ')') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/**
 * Replace function calls with balanced parentheses
 *
 * @param input - Input string
 * @param funcName - Function name to match (case insensitive)
 * @param replacement - Function that takes the argument content and returns replacement
 * @returns String with replacements made
 */
function replaceFunctionCall(
	input: string,
	funcName: string,
	replacement: (arg: string) => string
): string {
	const pattern = new RegExp(funcName + '\\s*\\(', 'gi');
	let result = input;
	let match;

	// Find all matches and process from right to left to preserve indices
	const matches: { index: number; length: number; arg: string }[] = [];

	while ((match = pattern.exec(input)) !== null) {
		const funcStart = match.index;
		const parenStart = input.indexOf('(', funcStart);
		const parenEnd = findMatchingParen(input, parenStart);

		if (parenEnd !== -1) {
			const arg = input.slice(parenStart + 1, parenEnd);
			matches.push({
				index: funcStart,
				length: parenEnd - funcStart + 1,
				arg
			});
		}
	}

	// Process from right to left
	for (let i = matches.length - 1; i >= 0; i--) {
		const m = matches[i];
		const before = result.slice(0, m.index);
		const after = result.slice(m.index + m.length);
		result = before + replacement(m.arg) + after;
	}

	return result;
}

// =============================================================================
// Expression Preprocessing
// =============================================================================

/**
 * Convert a construction expression to a mathAST-compatible format
 *
 * This function:
 * 1. Replaces $paramName with the parameter value
 * 2. Replaces $objectId.x/y with the coordinate value
 * 3. Converts common math syntax to LaTeX format
 *
 * @param expr - Expression string with $ references
 * @param context - Evaluation context with parameter and position values
 * @returns Preprocessed expression ready for mathAST parsing
 *
 * @example
 * ```typescript
 * const context = {
 *   parameters: { sideLength: 200, offset: 50 },
 *   objectPositions: new Map([["A", { x: 100, y: 200 }]])
 * };
 *
 * preprocessExpression("$sideLength * 2", context);
 * // Returns: "200 * 2"
 *
 * preprocessExpression("$A.x + $offset", context);
 * // Returns: "100 + 50"
 * ```
 */
export function preprocessExpression(expr: string, context: EvaluationContext): string {
	// Replace $objectId.x and $objectId.y with their values
	let result = expr.replace(/\$([a-zA-Z][a-zA-Z0-9_]*)\.(x|y)/g, (_, id, coord) => {
		const pos = context.objectPositions.get(id);
		if (!pos) {
			throw new Error(`Unknown object reference: ${id}`);
		}
		const value = coord === 'x' ? pos.x : pos.y;
		// Handle negative numbers properly
		return value < 0 ? `(${value})` : String(value);
	});

	// Replace $paramName with the parameter value
	result = result.replace(/\$([a-zA-Z][a-zA-Z0-9_]*)(?!\.(x|y))/g, (_, name) => {
		const value = context.parameters[name];
		if (value === undefined) {
			throw new Error(`Unknown parameter reference: ${name}`);
		}
		if (typeof value === 'boolean') {
			return value ? '1' : '0';
		}
		if (typeof value === 'string') {
			// Color or other string values can't be used in math expressions
			throw new Error(
				`Parameter '${name}' is a string and cannot be used in mathematical expressions`
			);
		}
		// Handle negative numbers properly
		return value < 0 ? `(${value})` : String(value);
	});

	// Convert sqrt(expr) -> \sqrt{expr} with proper parenthesis matching
	result = replaceFunctionCall(result, 'sqrt', (arg) => `\\sqrt{${arg}}`);

	// sin(x), cos(x), tan(x), etc. -> \sin(x), \cos(x), \tan(x)
	// These keep the parentheses, so we just add the backslash
	result = result.replace(/(sin|cos|tan|asin|acos|atan|log|ln|exp|abs)\s*\(/gi, (_, fn) => {
		return `\\${fn.toLowerCase()}(`;
	});

	// pi -> \pi
	result = result.replace(/\bpi\b/gi, '\\pi');

	// Handle exponentiation: x^2 -> x^{2}, (expr)^2 -> (expr)^{2}
	// This handles simple cases like x^2, x^3, (a+b)^2
	result = result.replace(/\^(\d+)/g, '^{$1}');

	// Handle parenthesized exponents: x^(expr) -> x^{expr}
	// Note: This uses a simpler pattern since exponent parentheses are usually simple
	result = result.replace(/\^\(([^)]+)\)/g, '^{$1}');

	return result;
}

// =============================================================================
// Expression Parsing
// =============================================================================

/**
 * Parse an expression string into a MathAST node
 *
 * @param expr - Expression string (after preprocessing)
 * @returns ParsedExpression with AST or error
 *
 * @example
 * ```typescript
 * const result = parseExpression("200 * \\sqrt{3} / 2");
 * if (result.success) {
 *   // Use result.ast
 * }
 * ```
 */
export function parseExpression(expr: string): ParsedExpression {
	if (!expr || expr.trim() === '') {
		return {
			success: false,
			ast: null,
			error: 'Expression is empty',
			references: []
		};
	}

	try {
		const parseResult = parseLatexSafe(expr);

		if (parseResult.errors.length > 0 || parseResult.ast === null) {
			const errorMessages =
				parseResult.errors.length > 0
					? parseResult.errors.map((e) => e.message).join('; ')
					: 'Parsing returned null AST';
			return {
				success: false,
				ast: null,
				error: errorMessages,
				references: []
			};
		}

		// Get variables from the AST (parseResult.ast is guaranteed non-null here)
		const variables = getVariables(parseResult.ast);
		const references = [...variables].filter((v) => v !== 'pi');

		return {
			success: true,
			ast: parseResult.ast,
			error: null,
			references
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown parsing error';
		return {
			success: false,
			ast: null,
			error: message,
			references: []
		};
	}
}

// =============================================================================
// Expression Evaluation
// =============================================================================

/**
 * Evaluate a parsed MathAST expression to a numeric value
 *
 * @param ast - Parsed MathAST node
 * @returns EvaluationResult with value or error
 */
export function evaluateAST(ast: MathNode): EvaluationResult {
	try {
		// All variables should already be substituted, so evaluate directly
		const result = evaluate(ast, { mode: 'decimal' });

		const value = typeof result.value === 'number' ? result.value : Number(result.value);

		if (!Number.isFinite(value)) {
			return {
				success: false,
				value: NaN,
				error: 'Result is not a finite number'
			};
		}

		return {
			success: true,
			value,
			error: null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown evaluation error';
		return {
			success: false,
			value: NaN,
			error: message
		};
	}
}

// =============================================================================
// Main Evaluation Function
// =============================================================================

/**
 * Evaluate an expression (Expr type) to a numeric value
 *
 * This is the main entry point for expression evaluation. It handles:
 * - Literal numbers (returned directly)
 * - String expressions with parameter/object references
 *
 * @param expr - Expression to evaluate (number or string)
 * @param context - Evaluation context with parameters and object positions
 * @returns The computed numeric value
 * @throws Error if expression is invalid or references unknown values
 *
 * @example
 * ```typescript
 * const context: EvaluationContext = {
 *   parameters: { sideLength: 200 },
 *   objectPositions: new Map([["A", { x: 100, y: 200 }]])
 * };
 *
 * // Literal number
 * evaluateExpr(100, context); // Returns: 100
 *
 * // Parameter reference
 * evaluateExpr("$sideLength", context); // Returns: 200
 *
 * // Expression with parameter
 * evaluateExpr("$sideLength * sqrt(3) / 2", context); // Returns: ~173.2
 *
 * // Object coordinate reference
 * evaluateExpr("$A.x + 50", context); // Returns: 150
 * ```
 */
export function evaluateExpr(expr: Expr, context: EvaluationContext): number {
	// Literal number - return directly
	if (typeof expr === 'number') {
		if (!Number.isFinite(expr)) {
			throw new Error('Expression value must be a finite number');
		}
		return expr;
	}

	// String expression - preprocess, parse, and evaluate
	const preprocessed = preprocessExpression(expr, context);
	const parsed = parseExpression(preprocessed);

	if (!parsed.success || !parsed.ast) {
		throw new Error(`Failed to parse expression "${expr}": ${parsed.error}`);
	}

	const result = evaluateAST(parsed.ast);

	if (!result.success) {
		throw new Error(`Failed to evaluate expression "${expr}": ${result.error}`);
	}

	return result.value;
}

/**
 * Safely evaluate an expression, returning a default value on error
 *
 * @param expr - Expression to evaluate
 * @param context - Evaluation context
 * @param defaultValue - Value to return if evaluation fails (default: 0)
 * @returns The computed value or the default
 *
 * @example
 * ```typescript
 * // Returns 0 if expression is invalid
 * const x = evaluateExprSafe("$unknownParam", context, 0);
 * ```
 */
export function evaluateExprSafe(
	expr: Expr,
	context: EvaluationContext,
	defaultValue: number = 0
): number {
	try {
		return evaluateExpr(expr, context);
	} catch {
		return defaultValue;
	}
}

/**
 * Evaluate an expression and return a result object (no throw)
 *
 * @param expr - Expression to evaluate
 * @param context - Evaluation context
 * @returns EvaluationResult with success status and value or error
 *
 * @example
 * ```typescript
 * const result = tryEvaluateExpr("$sideLength * 2", context);
 * if (result.success) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function tryEvaluateExpr(expr: Expr, context: EvaluationContext): EvaluationResult {
	try {
		const value = evaluateExpr(expr, context);
		return { success: true, value, error: null };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return { success: false, value: NaN, error: message };
	}
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if an expression can be evaluated with the given context
 *
 * This validates that all referenced parameters and objects exist in the context.
 *
 * @param expr - Expression to validate
 * @param context - Evaluation context
 * @returns Object with valid flag and list of missing references
 *
 * @example
 * ```typescript
 * const result = validateExprReferences("$sideLength + $A.x", context);
 * if (!result.valid) {
 *   console.error("Missing:", result.missing);
 * }
 * ```
 */
export function validateExprReferences(
	expr: Expr,
	context: EvaluationContext
): { valid: boolean; missing: string[] } {
	if (typeof expr === 'number') {
		return { valid: true, missing: [] };
	}

	const { parameters, objectCoords } = extractReferences(expr);
	const missing: string[] = [];

	// Check parameter references
	for (const param of parameters) {
		if (context.parameters[param] === undefined) {
			missing.push(`parameter: ${param}`);
		}
	}

	// Check object coordinate references
	for (const { id, coord } of objectCoords) {
		if (!context.objectPositions.has(id)) {
			missing.push(`object: ${id}.${coord}`);
		}
	}

	return { valid: missing.length === 0, missing };
}

/**
 * Create an empty evaluation context
 *
 * @returns Empty EvaluationContext
 */
export function createEmptyContext(): EvaluationContext {
	return {
		parameters: {},
		objectPositions: new Map()
	};
}

/**
 * Create an evaluation context from parameter values and object states
 *
 * @param parameters - Parameter values
 * @param objects - Map of object IDs to positions
 * @returns EvaluationContext
 */
export function createContext(
	parameters: ParameterValues,
	objects: ReadonlyMap<string, Position>
): EvaluationContext {
	return {
		parameters,
		objectPositions: objects
	};
}
