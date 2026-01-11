/**
 * Interval Sign Determination Helpers
 *
 * Functions for determining the sign of an expression on an interval
 * by analyzing its algebraic structure.
 *
 * @module mathAST/sign/helpers/interval-sign
 */

import type { MathNode } from '../../types';
import type { Interval } from '$lib/math/intervals/types';
import type { Sign } from '../types';
import {
	isNumber,
	isVariable,
	isGreek,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isFunction,
	isSuperscript,
	isDelimiter,
	isMathConstant
} from '../../guards';
import { signOfProduct, signOfQuotient, signOfPower, signOfFunction, negateSign } from '../rules';

// =============================================================================
// Expression Structure Analysis
// =============================================================================

/**
 * Analyzed structure of an expression for sign determination.
 */
export interface ExpressionStructure {
	/** The type of expression structure */
	readonly type:
		| 'product'
		| 'quotient'
		| 'sum'
		| 'difference'
		| 'power'
		| 'function'
		| 'polynomial'
		| 'constant'
		| 'variable'
		| 'other';

	/** Component expressions (for composite types) */
	readonly components?: readonly MathNode[];

	/** Function name (for function type) */
	readonly funcName?: string;

	/** Constant value if determinable */
	readonly constantValue?: number;

	/** Exponent value for power (if constant) */
	readonly exponent?: number;
}

/**
 * Analyze expression structure to extract sign-determining components.
 *
 * @param expr - The expression to analyze
 * @param variable - The variable name
 * @returns Analysis of the expression structure
 *
 * @example
 * // Analyze x * (x - 2)
 * const structure = analyzeExpressionStructure(expr, 'x');
 * // Returns: { type: 'product', components: [x, (x-2)] }
 */
export function analyzeExpressionStructure(expr: MathNode, variable: string): ExpressionStructure {
	// Number constant
	if (isNumber(expr)) {
		const value = parseFloat(expr.value);
		return { type: 'constant', constantValue: value };
	}

	// Mathematical constants (pi, e)
	if (isMathConstant(expr)) {
		const value = expr.constant === 'pi' ? Math.PI : Math.E;
		return { type: 'constant', constantValue: value };
	}

	// Greek letters (might be pi)
	if (isGreek(expr)) {
		if (expr.letter === 'pi') {
			return { type: 'constant', constantValue: Math.PI };
		}
		// Other Greek letters are treated as variables
		return { type: 'variable' };
	}

	// Variable
	if (isVariable(expr)) {
		if (expr.name === 'e') {
			return { type: 'constant', constantValue: Math.E };
		}
		return { type: 'variable' };
	}

	// Opposite (negation)
	if (isOpposite(expr)) {
		return { type: 'product', components: [expr] };
	}

	// Positive
	if (isPositive(expr)) {
		return analyzeExpressionStructure(expr.operand, variable);
	}

	// Delimiter (parentheses)
	if (isDelimiter(expr)) {
		return analyzeExpressionStructure(expr.content, variable);
	}

	// Multiplication - product type
	if (isMultiplication(expr)) {
		const components = flattenProduct(expr);
		return { type: 'product', components };
	}

	// Division - quotient type
	if (isDivision(expr)) {
		return {
			type: 'quotient',
			components: [expr.numerator, expr.denominator]
		};
	}

	// Addition
	if (isAddition(expr)) {
		return {
			type: 'sum',
			components: [expr.left, expr.right]
		};
	}

	// Subtraction
	if (isSubtraction(expr)) {
		return {
			type: 'difference',
			components: [expr.left, expr.right]
		};
	}

	// Power/Superscript
	if (isSuperscript(expr)) {
		const exponent = tryGetNumericValue(expr.superscript);
		return {
			type: 'power',
			components: [expr.base],
			exponent: exponent ?? undefined
		};
	}

	// Function
	if (isFunction(expr)) {
		return {
			type: 'function',
			funcName: expr.name,
			components: [...expr.args]
		};
	}

	// Default: unknown structure
	return { type: 'other' };
}

// =============================================================================
// Sign Determination on Interval
// =============================================================================

/**
 * Determine the sign of an expression on an interval by analyzing its structure.
 * Uses algebraic rules for products, quotients, powers, and known functions.
 *
 * @param expr - The expression to analyze
 * @param variable - The variable name
 * @param interval - The interval to determine sign on
 * @returns The sign of the expression on the interval
 *
 * @example
 * // Determine sign of x^2 on ]-infinity, 0[
 * const sign = determineSignOnInterval(parse('x^2'), 'x', lessThan(0));
 * // Returns 'positive' (since x^2 >= 0 for all x)
 */
export function determineSignOnInterval(
	expr: MathNode,
	variable: string,
	interval: Interval
): Sign {
	const structure = analyzeExpressionStructure(expr, variable);

	switch (structure.type) {
		case 'constant':
			return signFromConstant(structure.constantValue ?? 0);

		case 'variable':
			return signOfVariableOnInterval(variable, interval);

		case 'product':
			return determineProductSign(structure.components ?? [], variable, interval);

		case 'quotient':
			return determineQuotientSign(structure.components ?? [], variable, interval);

		case 'power':
			return determinePowerSign(structure.components?.[0], structure.exponent, variable, interval);

		case 'function':
			return determineFunctionSign(
				structure.funcName ?? '',
				structure.components ?? [],
				variable,
				interval
			);

		case 'sum':
		case 'difference':
			// Sums and differences are more complex - need numeric fallback
			return 'unknown';

		case 'polynomial':
		case 'other':
			return 'unknown';
	}
}

// =============================================================================
// Sign Helpers for Different Expression Types
// =============================================================================

/**
 * Get sign from a constant value.
 */
function signFromConstant(value: number): Sign {
	if (value > 0) return 'positive';
	if (value < 0) return 'negative';
	return 'zero';
}

/**
 * Determine sign of a variable on an interval.
 * Uses interval bounds to determine if variable is always positive/negative.
 */
function signOfVariableOnInterval(variable: string, interval: Interval): Sign {
	const bounds = getIntervalBounds(interval);

	if (bounds === null) {
		return 'unknown';
	}

	const { lower, upper } = bounds;

	// If lower bound > 0, variable is positive on interval
	if (lower !== null && lower > 0) {
		return 'positive';
	}

	// If upper bound < 0, variable is negative on interval
	if (upper !== null && upper < 0) {
		return 'negative';
	}

	// If both bounds are 0 (degenerate interval), variable is zero
	if (lower === 0 && upper === 0) {
		return 'zero';
	}

	// Otherwise, sign may change within interval
	return 'unknown';
}

/**
 * Determine sign of a product on an interval.
 */
function determineProductSign(
	factors: readonly MathNode[],
	variable: string,
	interval: Interval
): Sign {
	if (factors.length === 0) {
		return 'positive'; // Empty product = 1
	}

	const factorSigns: Sign[] = factors.map((factor) =>
		determineSignOnInterval(factor, variable, interval)
	);

	// Use the sign rule for products
	if (factorSigns.length === 1) {
		// Handle negation
		const factor = factors[0];
		if (isOpposite(factor)) {
			const innerSign = determineSignOnInterval(factor.operand, variable, interval);
			return negateSign(innerSign);
		}
		return factorSigns[0];
	}

	return factorSigns.reduce((acc, sign) => signOfProduct(acc, sign));
}

/**
 * Determine sign of a quotient on an interval.
 */
function determineQuotientSign(
	components: readonly MathNode[],
	variable: string,
	interval: Interval
): Sign {
	if (components.length !== 2) {
		return 'unknown';
	}

	const [numerator, denominator] = components;
	const numSign = determineSignOnInterval(numerator, variable, interval);
	const denSign = determineSignOnInterval(denominator, variable, interval);

	return signOfQuotient(numSign, denSign);
}

/**
 * Determine sign of a power on an interval.
 */
function determinePowerSign(
	base: MathNode | undefined,
	exponent: number | undefined,
	variable: string,
	interval: Interval
): Sign {
	if (!base) {
		return 'unknown';
	}

	const baseSign = determineSignOnInterval(base, variable, interval);

	// If exponent is unknown, use numeric check
	if (exponent === undefined) {
		return 'unknown';
	}

	return signOfPower(baseSign, exponent);
}

/**
 * Determine sign of a function on an interval.
 */
function determineFunctionSign(
	funcName: string,
	args: readonly MathNode[],
	variable: string,
	interval: Interval
): Sign {
	if (args.length === 0) {
		return 'unknown';
	}

	// Get sign of argument
	const argSign = determineSignOnInterval(args[0], variable, interval);

	// For functions that need domain information (like ln), we would need to
	// convert the interval to a Domain. For now, pass undefined.
	// More sophisticated handling could create an interval domain from bounds.
	return signOfFunction(funcName, argSign);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Flatten a nested multiplication into an array of factors.
 */
function flattenProduct(expr: MathNode): MathNode[] {
	if (!isMultiplication(expr)) {
		return [expr];
	}

	const leftFactors = flattenProduct(expr.left);
	const rightFactors = flattenProduct(expr.right);

	return [...leftFactors, ...rightFactors];
}

/**
 * Try to get a numeric value from a MathNode.
 */
function tryGetNumericValue(node: MathNode): number | null {
	if (isNumber(node)) {
		return parseFloat(node.value);
	}

	if (isOpposite(node) && isNumber(node.operand)) {
		return -parseFloat(node.operand.value);
	}

	if (isMathConstant(node)) {
		return node.constant === 'pi' ? Math.PI : Math.E;
	}

	if (isGreek(node) && node.letter === 'pi') {
		return Math.PI;
	}

	if (isVariable(node) && node.name === 'e') {
		return Math.E;
	}

	return null;
}

/**
 * Get numeric bounds from an interval.
 */
function getIntervalBounds(
	interval: Interval
): { lower: number | null; upper: number | null } | null {
	const lower = getEndpointValue(interval.lower.value);
	const upper = getEndpointValue(interval.upper.value);

	return { lower, upper };
}

/**
 * Get numeric value from an endpoint.
 */
function getEndpointValue(value: MathNode): number | null {
	// Check for infinity
	if (value.type === 'infinity') {
		return value.sign === 'positive' ? Infinity : -Infinity;
	}

	return tryGetNumericValue(value);
}

// =============================================================================
// Polynomial Analysis
// =============================================================================

/**
 * Analyze if expression is a simple polynomial (for future use).
 * Currently returns basic info about polynomial structure.
 */
export function analyzePolynomial(
	expr: MathNode,
	variable: string
): { isPolynomial: boolean; degree?: number } {
	// Simple implementation - just check structure
	const structure = analyzeExpressionStructure(expr, variable);

	if (structure.type === 'constant') {
		return { isPolynomial: true, degree: 0 };
	}

	if (structure.type === 'variable') {
		return { isPolynomial: true, degree: 1 };
	}

	if (structure.type === 'power') {
		const baseStructure = analyzeExpressionStructure(structure.components?.[0] ?? expr, variable);
		if (baseStructure.type === 'variable' && structure.exponent !== undefined) {
			if (Number.isInteger(structure.exponent) && structure.exponent >= 0) {
				return { isPolynomial: true, degree: structure.exponent };
			}
		}
	}

	// More complex structures would need deeper analysis
	return { isPolynomial: false };
}
