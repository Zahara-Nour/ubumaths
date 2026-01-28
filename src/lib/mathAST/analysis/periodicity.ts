/**
 * Periodicity Detection
 *
 * Detects whether mathematical expressions are periodic and computes their period.
 * A function f(x) is periodic with period T if f(x + T) = f(x) for all x in domain.
 *
 * @module mathAST/analysis/periodicity
 */

import type { MathNode } from '../types';
import { isNumber, isMultiplication, isAddition, isSubtraction, isDivision } from '../guards';
import { number, multiply, divide, PI, TWO_PI } from '../factory';
import { getVariables } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of periodicity detection
 */
export interface PeriodicityResult {
	/** Whether the expression is periodic */
	readonly isPeriodic: boolean;

	/** The period as a MathNode (e.g., π, 2π, π/2) */
	readonly period: MathNode | null;

	/** Numeric approximation of the period */
	readonly periodNumeric: number | null;

	/** The variable analyzed */
	readonly variable: string;

	/** Confidence level */
	readonly confidence: 'proven' | 'heuristic';

	/** Reason for the result */
	readonly reason?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Known mathematical constants that should not be treated as variables.
 * These are represented as MathConstantNode in the AST.
 */
const MATH_CONSTANTS = new Set(['pi', 'euler']);

/**
 * Filter out known mathematical constants from a set of variables.
 */
function filterVariables(vars: Set<string>): Set<string> {
	const result = new Set<string>();
	for (const v of vars) {
		if (!MATH_CONSTANTS.has(v)) {
			result.add(v);
		}
	}
	return result;
}

// =============================================================================
// Known Periodic Functions
// =============================================================================

/**
 * Map of function names to their base periods (as MathNode).
 * Period is for f(x), not f(kx).
 */
const FUNCTION_PERIODS: Map<string, MathNode> = new Map([
	// Primary trig functions
	['sin', TWO_PI],
	['cos', TWO_PI],
	['tan', PI],
	['cot', PI],
	['sec', TWO_PI],
	['csc', TWO_PI]
	// Note: hyperbolic functions are NOT periodic on ℝ
]);

/**
 * Get the base period of a known periodic function.
 */
function getBasePeriod(funcName: string): MathNode | null {
	return FUNCTION_PERIODS.get(funcName) ?? null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a node is the target variable.
 */
function isTargetVariable(node: MathNode, variable: string): boolean {
	if (node.type === 'variable') return node.name === variable;
	if (node.type === 'greek') return node.letter === variable;
	return false;
}

/**
 * Extract linear coefficient from expression of form (a*x + b) or (x*a + b).
 * Returns { coefficient, offset } where expression = coefficient * x + offset.
 * Returns null if not a linear expression in the variable.
 */
function extractLinearForm(
	node: MathNode,
	variable: string
): { coefficient: MathNode; offset: MathNode | null } | null {
	// Just the variable: coefficient = 1
	if (isTargetVariable(node, variable)) {
		return { coefficient: number('1'), offset: null };
	}

	// Multiplication: a*x or x*a
	if (isMultiplication(node)) {
		// Check left * right
		if (isTargetVariable(node.left, variable) && !getVariables(node.right).has(variable)) {
			return { coefficient: node.right, offset: null };
		}
		if (isTargetVariable(node.right, variable) && !getVariables(node.left).has(variable)) {
			return { coefficient: node.left, offset: null };
		}

		// Nested: (a*x)*b or a*(x*b) etc.
		const leftLinear = extractLinearForm(node.left, variable);
		if (leftLinear && !getVariables(node.right).has(variable)) {
			return {
				coefficient: multiply(leftLinear.coefficient, node.right, 'implicit'),
				offset: leftLinear.offset ? multiply(leftLinear.offset, node.right, 'implicit') : null
			};
		}

		const rightLinear = extractLinearForm(node.right, variable);
		if (rightLinear && !getVariables(node.left).has(variable)) {
			return {
				coefficient: multiply(node.left, rightLinear.coefficient, 'implicit'),
				offset: rightLinear.offset ? multiply(node.left, rightLinear.offset, 'implicit') : null
			};
		}
	}

	// Addition: expr + constant or constant + expr
	if (isAddition(node)) {
		const leftVars = getVariables(node.left);
		const rightVars = getVariables(node.right);

		if (leftVars.has(variable) && !rightVars.has(variable)) {
			const leftLinear = extractLinearForm(node.left, variable);
			if (leftLinear) {
				return {
					coefficient: leftLinear.coefficient,
					offset: leftLinear.offset
						? { type: 'addition', left: leftLinear.offset, right: node.right }
						: node.right
				};
			}
		}

		if (rightVars.has(variable) && !leftVars.has(variable)) {
			const rightLinear = extractLinearForm(node.right, variable);
			if (rightLinear) {
				return {
					coefficient: rightLinear.coefficient,
					offset: rightLinear.offset
						? { type: 'addition', left: node.left, right: rightLinear.offset }
						: node.left
				};
			}
		}
	}

	// Subtraction: expr - constant
	if (isSubtraction(node)) {
		const leftVars = getVariables(node.left);
		const rightVars = getVariables(node.right);

		if (leftVars.has(variable) && !rightVars.has(variable)) {
			const leftLinear = extractLinearForm(node.left, variable);
			if (leftLinear) {
				// Combine existing offset with the subtracted constant
				const negRight: MathNode = { type: 'opposite', operand: node.right };
				const newOffset = leftLinear.offset
					? { type: 'addition' as const, left: leftLinear.offset, right: negRight }
					: negRight;
				return {
					coefficient: leftLinear.coefficient,
					offset: newOffset
				};
			}
		}
	}

	// Division: x/k => coefficient = 1/k
	if (isDivision(node)) {
		const numVars = getVariables(node.numerator);
		const denVars = getVariables(node.denominator);

		if (numVars.has(variable) && !denVars.has(variable)) {
			const numLinear = extractLinearForm(node.numerator, variable);
			if (numLinear) {
				return {
					coefficient: divide(numLinear.coefficient, node.denominator, 'fraction'),
					offset: numLinear.offset ? divide(numLinear.offset, node.denominator, 'fraction') : null
				};
			}
		}
	}

	// Delimiter (parentheses)
	if (node.type === 'delimiter') {
		return extractLinearForm(node.content, variable);
	}

	return null;
}

/**
 * Divide a period by a coefficient.
 * period / |coefficient|
 */
function dividePeriod(period: MathNode, coefficient: MathNode): MathNode {
	// If coefficient is 1, return period unchanged
	if (isNumber(coefficient) && coefficient.value === '1') {
		return period;
	}

	// Take absolute value of coefficient for period calculation
	let absCoeff = coefficient;
	if (isNumber(coefficient)) {
		const val = parseFloat(coefficient.value);
		if (val < 0) {
			absCoeff = number(String(Math.abs(val)));
		}
	}

	return divide(period, absCoeff, 'fraction');
}

/**
 * Compute numeric value of a period node.
 */
function periodToNumeric(period: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(period);
		return isFinite(value) && value > 0 ? value : null;
	} catch {
		return null;
	}
}

/**
 * Compute GCD of two positive numbers.
 */
function gcd(a: number, b: number): number {
	const epsilon = 1e-10;
	while (b > epsilon) {
		const t = b;
		b = a % b;
		a = t;
	}
	return a;
}

/**
 * Compute LCM of two positive numbers.
 */
function lcm(a: number, b: number): number {
	return (a * b) / gcd(a, b);
}

/**
 * Check if two periods are commensurable (have a common period).
 * Returns the LCM if they are, null otherwise.
 */
function combinePeriods(p1: number, p2: number): number | null {
	// Check if ratio is rational (approximately)
	const ratio = p1 / p2;
	const tolerance = 1e-9;

	// Try to find small integer ratio
	for (let d = 1; d <= 100; d++) {
		const n = Math.round(ratio * d);
		if (Math.abs(ratio - n / d) < tolerance) {
			// Found rational ratio n/d
			return lcm(p1, p2);
		}
	}

	// Periods are likely incommensurable
	return null;
}

// =============================================================================
// Main Detection Functions
// =============================================================================

/**
 * Detect periodicity of a function node.
 * Returns the period if found, null otherwise.
 */
function detectPeriodForNode(
	node: MathNode,
	variable: string
): { period: MathNode; periodNumeric: number } | null {
	// Check if expression contains the variable
	const vars = getVariables(node);
	if (!vars.has(variable)) {
		// Constant - not periodic in the traditional sense
		// (or you could say period is any positive number)
		return null;
	}

	switch (node.type) {
		case 'function': {
			const basePeriod = getBasePeriod(node.name);
			if (!basePeriod || node.args.length === 0) {
				return null;
			}

			const arg = node.args[0];

			// Check if argument is linear in variable: f(ax + b)
			const linearForm = extractLinearForm(arg, variable);
			if (!linearForm) {
				// Non-linear argument - can't determine period
				return null;
			}

			// Period = basePeriod / |a|
			const period = dividePeriod(basePeriod, linearForm.coefficient);
			const periodNumeric = periodToNumeric(period);

			if (periodNumeric === null) {
				return null;
			}

			return { period, periodNumeric };
		}

		case 'addition':
		case 'subtraction': {
			// For sum/difference, find LCM of periods
			const leftResult = detectPeriodForNode(node.left, variable);
			const rightResult = detectPeriodForNode(node.right, variable);

			if (leftResult && rightResult) {
				const combined = combinePeriods(leftResult.periodNumeric, rightResult.periodNumeric);
				if (combined !== null) {
					// Return numeric period (symbolic would be complex)
					return { period: number(String(combined)), periodNumeric: combined };
				}
				// Incommensurable periods - not periodic
				return null;
			}

			if (leftResult && !getVariables(node.right).has(variable)) {
				// f(x) + c has same period as f(x)
				return leftResult;
			}

			if (rightResult && !getVariables(node.left).has(variable)) {
				// c + f(x) or c - f(x) has same period as f(x)
				return rightResult;
			}

			return null;
		}

		case 'multiplication': {
			// c * f(x) has same period as f(x)
			const leftVars = getVariables(node.left);
			const rightVars = getVariables(node.right);

			if (!leftVars.has(variable) && rightVars.has(variable)) {
				return detectPeriodForNode(node.right, variable);
			}

			if (leftVars.has(variable) && !rightVars.has(variable)) {
				return detectPeriodForNode(node.left, variable);
			}

			// Both sides have variable - product of periodic functions
			const leftResult = detectPeriodForNode(node.left, variable);
			const rightResult = detectPeriodForNode(node.right, variable);

			if (leftResult && rightResult) {
				// Product of periodic functions with periods T1 and T2
				// has period LCM(T1, T2) (the largest period is always valid)
				const combined = combinePeriods(leftResult.periodNumeric, rightResult.periodNumeric);
				if (combined !== null) {
					return { period: number(String(combined)), periodNumeric: combined };
				}
				return null;
			}

			return null;
		}

		case 'division': {
			// f(x) / c has same period as f(x)
			const numVars = getVariables(node.numerator);
			const denVars = getVariables(node.denominator);

			if (numVars.has(variable) && !denVars.has(variable)) {
				return detectPeriodForNode(node.numerator, variable);
			}

			// c / f(x) - more complex, usually not periodic unless f is specific
			if (!numVars.has(variable) && denVars.has(variable)) {
				// 1/sin(x) = csc(x) has same period as sin(x)
				return detectPeriodForNode(node.denominator, variable);
			}

			return null;
		}

		case 'superscript': {
			// f(x)^n has same period as f(x) for constant n
			// (the base period is always a valid period, even if not minimal)
			const baseVars = getVariables(node.base);
			const expVars = getVariables(node.superscript);

			if (baseVars.has(variable) && !expVars.has(variable)) {
				return detectPeriodForNode(node.base, variable);
			}

			return null;
		}

		case 'opposite':
		case 'positive':
			return detectPeriodForNode(node.operand, variable);

		case 'delimiter':
			return detectPeriodForNode(node.content, variable);

		default:
			return null;
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Detect whether an expression is periodic and compute its period.
 *
 * @param node - The expression to analyze
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns PeriodicityResult with period information
 *
 * @example
 * detectPeriodicity(parseLatex('\\sin(x)'))
 * // → { isPeriodic: true, period: 2π, periodNumeric: 6.283... }
 *
 * detectPeriodicity(parseLatex('\\sin(2x)'))
 * // → { isPeriodic: true, period: π, periodNumeric: 3.141... }
 *
 * detectPeriodicity(parseLatex('\\tan(x)'))
 * // → { isPeriodic: true, period: π, periodNumeric: 3.141... }
 *
 * detectPeriodicity(parseLatex('x^2'))
 * // → { isPeriodic: false, period: null }
 */
export function detectPeriodicity(node: MathNode, variable?: string): PeriodicityResult {
	// Auto-detect variable (filter out known constants like π)
	const vars = filterVariables(getVariables(node));

	if (vars.size === 0) {
		return {
			isPeriodic: false,
			period: null,
			periodNumeric: null,
			variable: variable ?? 'x',
			confidence: 'proven',
			reason: 'Constant expression'
		};
	}

	const targetVar = variable ?? (vars.size === 1 ? Array.from(vars)[0] : undefined);

	if (!targetVar) {
		return {
			isPeriodic: false,
			period: null,
			periodNumeric: null,
			variable: '',
			confidence: 'heuristic',
			reason: 'Multiple variables, none specified'
		};
	}

	if (!vars.has(targetVar)) {
		return {
			isPeriodic: false,
			period: null,
			periodNumeric: null,
			variable: targetVar,
			confidence: 'proven',
			reason: `Expression is constant in ${targetVar}`
		};
	}

	const result = detectPeriodForNode(node, targetVar);

	if (result) {
		return {
			isPeriodic: true,
			period: result.period,
			periodNumeric: result.periodNumeric,
			variable: targetVar,
			confidence: 'proven',
			reason: 'Periodic function detected'
		};
	}

	return {
		isPeriodic: false,
		period: null,
		periodNumeric: null,
		variable: targetVar,
		confidence: 'heuristic',
		reason: 'No periodic structure detected'
	};
}

/**
 * Check if an expression is periodic.
 *
 * @param node - The expression to check
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns true if the expression is periodic
 *
 * @example
 * isPeriodic(parseLatex('\\sin(x)'))  // true
 * isPeriodic(parseLatex('x^2'))       // false
 */
export function isPeriodic(node: MathNode, variable?: string): boolean {
	return detectPeriodicity(node, variable).isPeriodic;
}

/**
 * Get the period of an expression, or null if not periodic.
 *
 * @param node - The expression to analyze
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns The period as a MathNode, or null if not periodic
 *
 * @example
 * getPeriod(parseLatex('\\sin(x)'))   // 2π (as MathNode)
 * getPeriod(parseLatex('\\sin(2x)'))  // π (as MathNode)
 * getPeriod(parseLatex('x^2'))        // null
 */
export function getPeriod(node: MathNode, variable?: string): MathNode | null {
	return detectPeriodicity(node, variable).period;
}

/**
 * Get the numeric value of the period, or null if not periodic.
 *
 * @param node - The expression to analyze
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns The period as a number, or null if not periodic
 *
 * @example
 * getPeriodNumeric(parseLatex('\\sin(x)'))  // 6.283185...
 * getPeriodNumeric(parseLatex('\\tan(x)'))  // 3.141592...
 */
export function getPeriodNumeric(node: MathNode, variable?: string): number | null {
	return detectPeriodicity(node, variable).periodNumeric;
}
