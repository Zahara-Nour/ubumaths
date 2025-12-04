/**
 * Spreadsheet Evaluator - Evaluates parsed AST nodes
 *
 * This module provides the evaluator that takes an AST from the parser
 * and computes the resulting value. It handles:
 * - Literal values (numbers, strings, booleans)
 * - Cell references (single and range)
 * - Binary and unary operations
 * - Comparisons
 * - Function calls
 * - Error propagation
 *
 * @module spreadsheet/parser/evaluator
 */

import type {
	ASTNode,
	BinaryOperator,
	UnaryOperator,
	ComparisonOperator,
	RangeRefNode
} from './ast';
import type { ComputedValue, ErrorCode } from '../types';
import { parse } from './parser';
import { executeFunction } from '../functions';
import { formatCellRef } from '../cell-reference';

// =============================================================================
// Types
// =============================================================================

/**
 * Function to get the computed value of a cell by reference string
 *
 * @param ref - The cell reference (e.g., "A1", "B2")
 * @returns The computed value of the cell
 */
export type CellValueGetter = (ref: string) => ComputedValue;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create an error value
 */
function makeError(code: ErrorCode, message: string): ComputedValue {
	return { type: 'error', code, message };
}

/**
 * Create a number value
 */
function makeNumber(value: number): ComputedValue {
	if (!isFinite(value)) {
		return makeError('#NUM!', 'Resultat numerique invalide');
	}
	return { type: 'number', value };
}

/**
 * Create a boolean value
 */
function makeBoolean(value: boolean): ComputedValue {
	return { type: 'boolean', value };
}

/**
 * Check if a value is an error
 */
function isError(
	value: ComputedValue
): value is { type: 'error'; code: ErrorCode; message: string } {
	return value.type === 'error';
}

/**
 * Check if a value is a number
 */
function isNumber(value: ComputedValue): value is { type: 'number'; value: number } {
	return value.type === 'number';
}

/**
 * Convert a value to a number for arithmetic operations
 */
function toNumericValue(value: ComputedValue): number | null {
	if (isNumber(value)) return value.value;
	if (value.type === 'boolean') return value.value ? 1 : 0;
	if (value.type === 'empty') return 0;
	if (value.type === 'string') {
		const parsed = parseFloat(value.value);
		return isNaN(parsed) ? null : parsed;
	}
	return null;
}

/**
 * Get the display string for a value (for comparison)
 */
function toCompareString(value: ComputedValue): string | null {
	switch (value.type) {
		case 'string':
			return value.value.toLowerCase();
		case 'number':
			return String(value.value);
		case 'boolean':
			return value.value ? 'true' : 'false';
		case 'empty':
			return '';
		case 'error':
			return null;
	}
}

// =============================================================================
// Binary Operations
// =============================================================================

/**
 * Evaluate a binary arithmetic operation
 */
function evaluateBinaryOp(
	operator: BinaryOperator,
	left: ComputedValue,
	right: ComputedValue
): ComputedValue {
	// Propagate errors
	if (isError(left)) return left;
	if (isError(right)) return right;

	// Convert to numbers
	const leftNum = toNumericValue(left);
	const rightNum = toNumericValue(right);

	if (leftNum === null) {
		return makeError('#VALUE!', `Impossible de convertir l'operande gauche en nombre`);
	}
	if (rightNum === null) {
		return makeError('#VALUE!', `Impossible de convertir l'operande droite en nombre`);
	}

	switch (operator) {
		case '+':
			return makeNumber(leftNum + rightNum);
		case '-':
			return makeNumber(leftNum - rightNum);
		case '*':
			return makeNumber(leftNum * rightNum);
		case '/':
			if (rightNum === 0) {
				return makeError('#DIV/0!', 'Division par zero');
			}
			return makeNumber(leftNum / rightNum);
		case '^':
			// Handle special power cases
			if (leftNum === 0 && rightNum < 0) {
				return makeError('#DIV/0!', 'Division par zero (0 ^ negatif)');
			}
			if (leftNum < 0 && !Number.isInteger(rightNum)) {
				return makeError('#NUM!', 'Base negative avec exposant non entier');
			}
			return makeNumber(Math.pow(leftNum, rightNum));
	}
}

// =============================================================================
// Unary Operations
// =============================================================================

/**
 * Evaluate a unary operation
 */
function evaluateUnaryOp(operator: UnaryOperator, operand: ComputedValue): ComputedValue {
	// Propagate errors
	if (isError(operand)) return operand;

	// Convert to number
	const num = toNumericValue(operand);

	if (num === null) {
		return makeError('#VALUE!', `Impossible de convertir l'operande en nombre`);
	}

	switch (operator) {
		case '-':
			return makeNumber(-num);
		case '+':
			return makeNumber(num);
	}
}

// =============================================================================
// Comparisons
// =============================================================================

/**
 * Evaluate a comparison operation
 */
function evaluateComparison(
	operator: ComparisonOperator,
	left: ComputedValue,
	right: ComputedValue
): ComputedValue {
	// Propagate errors
	if (isError(left)) return left;
	if (isError(right)) return right;

	// Same type comparison
	if (left.type === right.type) {
		switch (left.type) {
			case 'number': {
				const rightVal = right as { type: 'number'; value: number };
				return compareNumbers(operator, left.value, rightVal.value);
			}
			case 'string': {
				const rightVal = right as { type: 'string'; value: string };
				return compareStrings(operator, left.value, rightVal.value);
			}
			case 'boolean': {
				const rightVal = right as { type: 'boolean'; value: boolean };
				// false = 0, true = 1
				return compareNumbers(operator, left.value ? 1 : 0, rightVal.value ? 1 : 0);
			}
			case 'empty':
				// Two empty values are equal
				return makeBoolean(operator === '=' || operator === '<=' || operator === '>=');
		}
	}

	// Mixed type comparison
	// Try to compare as numbers first
	const leftNum = toNumericValue(left);
	const rightNum = toNumericValue(right);

	if (leftNum !== null && rightNum !== null) {
		return compareNumbers(operator, leftNum, rightNum);
	}

	// Try to compare as strings
	const leftStr = toCompareString(left);
	const rightStr = toCompareString(right);

	if (leftStr !== null && rightStr !== null) {
		return compareStrings(operator, leftStr, rightStr);
	}

	// Cannot compare
	return makeError('#VALUE!', 'Impossible de comparer ces valeurs');
}

/**
 * Compare two numbers
 */
function compareNumbers(operator: ComparisonOperator, left: number, right: number): ComputedValue {
	switch (operator) {
		case '=':
			return makeBoolean(left === right);
		case '<>':
			return makeBoolean(left !== right);
		case '<':
			return makeBoolean(left < right);
		case '>':
			return makeBoolean(left > right);
		case '<=':
			return makeBoolean(left <= right);
		case '>=':
			return makeBoolean(left >= right);
	}
}

/**
 * Compare two strings (case-insensitive like Excel)
 */
function compareStrings(operator: ComparisonOperator, left: string, right: string): ComputedValue {
	const leftLower = left.toLowerCase();
	const rightLower = right.toLowerCase();

	switch (operator) {
		case '=':
			return makeBoolean(leftLower === rightLower);
		case '<>':
			return makeBoolean(leftLower !== rightLower);
		case '<':
			return makeBoolean(leftLower < rightLower);
		case '>':
			return makeBoolean(leftLower > rightLower);
		case '<=':
			return makeBoolean(leftLower <= rightLower);
		case '>=':
			return makeBoolean(leftLower >= rightLower);
	}
}

// =============================================================================
// Range Evaluation
// =============================================================================

/**
 * Expand a range reference to an array of cell values
 */
function evaluateRange(range: RangeRefNode, getCellValue: CellValueGetter): ComputedValue[] {
	const { start, end } = range;

	// Normalize range (ensure start is top-left, end is bottom-right)
	const startCol = Math.min(start.col, end.col);
	const endCol = Math.max(start.col, end.col);
	const startRow = Math.min(start.row, end.row);
	const endRow = Math.max(start.row, end.row);

	// Safety check: limit range size to prevent excessive computation
	// Max grid is 20x20 = 400 cells
	const rangeWidth = endCol - startCol + 1;
	const rangeHeight = endRow - startRow + 1;
	const rangeSize = rangeWidth * rangeHeight;
	const MAX_RANGE_SIZE = 400;

	if (rangeSize > MAX_RANGE_SIZE) {
		return [makeError('#VALUE!', 'Plage trop grande (max 400 cellules)')];
	}

	const values: ComputedValue[] = [];

	for (let row = startRow; row <= endRow; row++) {
		for (let col = startCol; col <= endCol; col++) {
			const ref = formatCellRef({ col, row });
			values.push(getCellValue(ref));
		}
	}

	return values;
}

// =============================================================================
// Main Evaluation
// =============================================================================

/**
 * Evaluate an AST node to a computed value
 *
 * This is the main entry point for evaluation. It recursively
 * evaluates the AST and returns the final computed value.
 *
 * @param ast - The AST node to evaluate
 * @param getCellValue - Function to retrieve cell values by reference
 * @returns The computed result
 *
 * @example
 * const ast = parse('=A1+B1');
 * if (ast.success) {
 *   const result = evaluate(ast.ast, (ref) => {
 *     // Return value for cell ref
 *     if (ref === 'A1') return { type: 'number', value: 10 };
 *     if (ref === 'B1') return { type: 'number', value: 20 };
 *     return { type: 'empty' };
 *   });
 *   // result = { type: 'number', value: 30 }
 * }
 */
export function evaluate(ast: ASTNode, getCellValue: CellValueGetter): ComputedValue {
	switch (ast.type) {
		// Literals
		case 'number':
			return { type: 'number', value: ast.value };

		case 'string':
			return { type: 'string', value: ast.value };

		case 'boolean':
			return { type: 'boolean', value: ast.value };

		// Cell reference
		case 'cellRef':
			return getCellValue(ast.ref);

		// Range reference - should only appear as function argument
		// When evaluated directly, return error
		case 'rangeRef':
			return makeError('#VALUE!', 'Les plages doivent etre utilisees dans une fonction');

		// Binary operation
		case 'binaryOp': {
			const left = evaluate(ast.left, getCellValue);
			const right = evaluate(ast.right, getCellValue);
			return evaluateBinaryOp(ast.operator, left, right);
		}

		// Unary operation
		case 'unaryOp': {
			const operand = evaluate(ast.operand, getCellValue);
			return evaluateUnaryOp(ast.operator, operand);
		}

		// Comparison
		case 'comparison': {
			const left = evaluate(ast.left, getCellValue);
			const right = evaluate(ast.right, getCellValue);
			return evaluateComparison(ast.operator, left, right);
		}

		// Function call
		case 'functionCall': {
			// Evaluate arguments (with special handling for ranges)
			const args: ComputedValue[] = [];

			for (const argAst of ast.args) {
				if (argAst.type === 'rangeRef') {
					// Expand range to multiple values
					const rangeValues = evaluateRange(argAst, getCellValue);
					args.push(...rangeValues);
				} else {
					args.push(evaluate(argAst, getCellValue));
				}
			}

			return executeFunction(ast.name, args);
		}
	}
}

/**
 * Evaluate a formula string directly
 *
 * This is a convenience function that parses and evaluates a formula
 * in one step.
 *
 * @param formula - The formula string to evaluate (with or without leading "=")
 * @param getCellValue - Function to retrieve cell values by reference
 * @returns The computed result
 *
 * @example
 * const result = evaluateFormula('=SUM(A1:A10)', (ref) => {
 *   // Return value for cell ref
 *   return { type: 'number', value: 1 };
 * });
 */
export function evaluateFormula(formula: string, getCellValue: CellValueGetter): ComputedValue {
	// Parse the formula
	const parseResult = parse(formula);

	if (!parseResult.success) {
		return makeError('#NAME?', `Erreur de syntaxe : ${parseResult.error.message}`);
	}

	// Evaluate the AST
	return evaluate(parseResult.ast, getCellValue);
}

// =============================================================================
// Dependency Extraction
// =============================================================================

/**
 * Extract all cell references from an AST
 *
 * This is useful for building a dependency graph.
 * Returns an array of cell reference strings (e.g., ["A1", "B2"]).
 *
 * @param ast - The AST to extract references from
 * @returns Array of unique cell reference strings
 *
 * @example
 * const ast = parse('=A1+B2*C3');
 * if (ast.success) {
 *   const refs = extractCellRefs(ast.ast);
 *   // refs = ["A1", "B2", "C3"]
 * }
 */
export function extractCellRefs(ast: ASTNode): string[] {
	const refs = new Set<string>();
	collectCellRefs(ast, refs);
	return Array.from(refs);
}

/**
 * Recursively collect cell references from an AST
 */
function collectCellRefs(ast: ASTNode, refs: Set<string>): void {
	switch (ast.type) {
		case 'number':
		case 'string':
		case 'boolean':
			// Literals have no cell references
			break;

		case 'cellRef':
			refs.add(ast.ref);
			break;

		case 'rangeRef': {
			// Expand range to individual cell refs
			const { start, end } = ast;
			const startCol = Math.min(start.col, end.col);
			const endCol = Math.max(start.col, end.col);
			const startRow = Math.min(start.row, end.row);
			const endRow = Math.max(start.row, end.row);

			for (let row = startRow; row <= endRow; row++) {
				for (let col = startCol; col <= endCol; col++) {
					refs.add(formatCellRef({ col, row }));
				}
			}
			break;
		}

		case 'binaryOp':
			collectCellRefs(ast.left, refs);
			collectCellRefs(ast.right, refs);
			break;

		case 'unaryOp':
			collectCellRefs(ast.operand, refs);
			break;

		case 'comparison':
			collectCellRefs(ast.left, refs);
			collectCellRefs(ast.right, refs);
			break;

		case 'functionCall':
			for (const arg of ast.args) {
				collectCellRefs(arg, refs);
			}
			break;
	}
}

/**
 * Extract all range references from an AST
 *
 * Returns an array of objects with start and end cell references.
 *
 * @param ast - The AST to extract ranges from
 * @returns Array of range objects with start and end strings
 *
 * @example
 * const ast = parse('=SUM(A1:A10)');
 * if (ast.success) {
 *   const ranges = extractRangeRefs(ast.ast);
 *   // ranges = [{ start: "A1", end: "A10" }]
 * }
 */
export function extractRangeRefs(ast: ASTNode): Array<{ start: string; end: string }> {
	const ranges: Array<{ start: string; end: string }> = [];
	collectRangeRefs(ast, ranges);
	return ranges;
}

/**
 * Recursively collect range references from an AST
 */
function collectRangeRefs(ast: ASTNode, ranges: Array<{ start: string; end: string }>): void {
	switch (ast.type) {
		case 'number':
		case 'string':
		case 'boolean':
		case 'cellRef':
			// No ranges in these nodes
			break;

		case 'rangeRef':
			ranges.push({
				start: ast.start.ref,
				end: ast.end.ref
			});
			break;

		case 'binaryOp':
			collectRangeRefs(ast.left, ranges);
			collectRangeRefs(ast.right, ranges);
			break;

		case 'unaryOp':
			collectRangeRefs(ast.operand, ranges);
			break;

		case 'comparison':
			collectRangeRefs(ast.left, ranges);
			collectRangeRefs(ast.right, ranges);
			break;

		case 'functionCall':
			for (const arg of ast.args) {
				collectRangeRefs(arg, ranges);
			}
			break;
	}
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a formula string is valid (can be parsed without errors)
 *
 * @param formula - The formula string to validate
 * @returns true if the formula is syntactically valid
 */
export function isValidFormula(formula: string): boolean {
	const result = parse(formula);
	return result.success;
}

/**
 * Get all dependencies for a formula (cells it references)
 *
 * @param formula - The formula string
 * @returns Array of cell reference strings, or empty array if invalid formula
 */
export function getFormulaDependencies(formula: string): string[] {
	const result = parse(formula);
	if (!result.success) {
		return [];
	}
	return extractCellRefs(result.ast);
}
