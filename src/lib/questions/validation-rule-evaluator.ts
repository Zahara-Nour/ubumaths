/**
 * Validation Rule Evaluator
 * =========================
 *
 * Evaluates typed ValidationRule against student answers.
 * Used for testAnswers questions where the correct answer
 * depends on generated values (not hardcoded).
 *
 * @module questions/validation-rule-evaluator
 */

import type {
	ValidationRule,
	DivisorRule,
	MultipleRule,
	RangeRule,
	EquationRootRule,
	EquivalenceRule,
	PredicateRule,
	CustomExpressionRule
} from './types';
import { evaluateExpression, areEquivalent } from '$lib/math/compute-engine';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for evaluation (resolved variable values)
 */
export interface EvaluationContext {
	/** Resolved variables from question generation */
	variables: Record<string, number | string>;
	/** Student's answer as string */
	answer: string;
	/** Numeric answer (parsed) if applicable */
	numericAnswer?: number;
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
	/** Whether the answer satisfies the rule */
	valid: boolean;
	/** Reason if invalid */
	reason?: string;
	/** Additional debug info */
	debug?: Record<string, unknown>;
}

// ============================================================================
// MAIN EVALUATOR
// ============================================================================

/**
 * Evaluate a validation rule against a student answer
 *
 * @param rule - The validation rule to evaluate
 * @param context - Evaluation context with variables and answer
 * @returns Evaluation result with validity and reason
 *
 * @example Divisor rule
 * ```typescript
 * const result = evaluateRule(
 *   { type: 'divisor', dividend: '{{n}}' },
 *   { variables: { n: 12 }, answer: '3' }
 * );
 * // result.valid === true (3 divides 12)
 * ```
 *
 * @example Predicate rule
 * ```typescript
 * const result = evaluateRule(
 *   { type: 'predicate', predicate: 'isPrime' },
 *   { variables: {}, answer: '7' }
 * );
 * // result.valid === true (7 is prime)
 * ```
 */
export function evaluateRule(rule: ValidationRule, context: EvaluationContext): EvaluationResult {
	switch (rule.type) {
		case 'divisor':
			return evaluateDivisorRule(rule, context);
		case 'multiple':
			return evaluateMultipleRule(rule, context);
		case 'range':
			return evaluateRangeRule(rule, context);
		case 'equation_root':
			return evaluateEquationRootRule(rule, context);
		case 'equivalent':
			return evaluateEquivalenceRule(rule, context);
		case 'predicate':
			return evaluatePredicateRule(rule, context);
		case 'custom':
			return evaluateCustomRule(rule, context);
	}
}

/**
 * Evaluate multiple validation rules (all must pass)
 *
 * @param rules - Array of validation rules
 * @param context - Evaluation context
 * @returns Combined result (valid only if all rules pass)
 */
export function evaluateRules(
	rules: ValidationRule[],
	context: EvaluationContext
): EvaluationResult {
	if (rules.length === 0) {
		return { valid: true };
	}

	const results = rules.map((rule) => evaluateRule(rule, context));
	const failedResults = results.filter((r) => !r.valid);

	if (failedResults.length === 0) {
		return { valid: true };
	}

	return {
		valid: false,
		reason: failedResults.map((r) => r.reason).join('; '),
		debug: { individualResults: results }
	};
}

// ============================================================================
// INDIVIDUAL RULE EVALUATORS
// ============================================================================

/**
 * Evaluate divisor rule: answer must divide dividend evenly
 */
function evaluateDivisorRule(rule: DivisorRule, ctx: EvaluationContext): EvaluationResult {
	const dividend = resolveExpression(rule.dividend, ctx.variables);
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: 'Invalid numeric answer' };
	}

	if (answer === 0) {
		return { valid: false, reason: 'Zero cannot be a divisor' };
	}

	if (!Number.isInteger(answer)) {
		return { valid: false, reason: 'Divisor must be an integer' };
	}

	const valid = dividend % answer === 0;
	return {
		valid,
		reason: valid ? undefined : `${answer} does not divide ${dividend}`,
		debug: { dividend, answer }
	};
}

/**
 * Evaluate multiple rule: answer must be a multiple of base
 */
function evaluateMultipleRule(rule: MultipleRule, ctx: EvaluationContext): EvaluationResult {
	const base = resolveExpression(rule.base, ctx.variables);
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: 'Invalid numeric answer' };
	}

	if (base === 0) {
		return { valid: false, reason: 'Base cannot be zero' };
	}

	const valid = answer % base === 0;
	return {
		valid,
		reason: valid ? undefined : `${answer} is not a multiple of ${base}`,
		debug: { base, answer }
	};
}

/**
 * Evaluate range rule: answer must be within [min, max]
 */
function evaluateRangeRule(rule: RangeRule, ctx: EvaluationContext): EvaluationResult {
	const min = resolveExpression(rule.min, ctx.variables);
	const max = resolveExpression(rule.max, ctx.variables);
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: 'Invalid numeric answer' };
	}

	const inclusive = rule.inclusive !== false; // default true

	let valid: boolean;
	let rangeDesc: string;

	if (inclusive) {
		valid = answer >= min && answer <= max;
		rangeDesc = `[${min}, ${max}]`;
	} else {
		valid = answer > min && answer < max;
		rangeDesc = `(${min}, ${max})`;
	}

	return {
		valid,
		reason: valid ? undefined : `${answer} is not in range ${rangeDesc}`,
		debug: { min, max, answer, inclusive }
	};
}

/**
 * Evaluate equation root rule: answer must be a root of the equation
 *
 * Strategy: Substitute answer for variable and check if equation equals zero
 */
function evaluateEquationRootRule(
	rule: EquationRootRule,
	ctx: EvaluationContext
): EvaluationResult {
	const variable = rule.variable || 'x';
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: 'Invalid numeric answer' };
	}

	// Resolve variables in the equation first
	const equation = resolveVariablesInExpression(rule.equation, ctx.variables);

	// Parse equation: "left = right" or just "expression = 0"
	const parts = equation.split('=').map((s) => s.trim());

	let leftExpr: string;
	let rightExpr: string;

	if (parts.length === 2) {
		leftExpr = parts[0];
		rightExpr = parts[1];
	} else {
		// Assume "expression = 0"
		leftExpr = equation;
		rightExpr = '0';
	}

	// Substitute the variable with the answer
	const substitutedLeft = substituteVariable(leftExpr, variable, answer);
	const substitutedRight = substituteVariable(rightExpr, variable, answer);

	try {
		// Evaluate both sides
		const leftValue = evaluateSafeExpression(substitutedLeft);
		const rightValue = evaluateSafeExpression(substitutedRight);

		// Check if left equals right (with tolerance for floating point)
		const tolerance = 1e-9;
		const valid = Math.abs(leftValue - rightValue) < tolerance;

		return {
			valid,
			reason: valid ? undefined : `${answer} is not a root of the equation`,
			debug: {
				equation: rule.equation,
				variable,
				answer,
				leftValue,
				rightValue,
				difference: Math.abs(leftValue - rightValue)
			}
		};
	} catch (error) {
		return {
			valid: false,
			reason: `Failed to evaluate equation: ${error instanceof Error ? error.message : String(error)}`,
			debug: { equation: rule.equation, substitutedLeft, substitutedRight }
		};
	}
}

/**
 * Evaluate equivalence rule: answer must be equivalent to expression
 */
function evaluateEquivalenceRule(rule: EquivalenceRule, ctx: EvaluationContext): EvaluationResult {
	// Resolve variables in the expression
	const resolvedExpr = resolveVariablesInExpression(rule.expression, ctx.variables);

	try {
		// First try numeric comparison
		const expected = evaluateSafeExpression(resolvedExpr);
		const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

		if (!isNaN(expected) && !isNaN(answer)) {
			// Numeric comparison with tolerance
			const tolerance = 1e-10;
			const valid = Math.abs(expected - answer) < tolerance;
			return {
				valid,
				reason: valid ? undefined : `${ctx.answer} is not equivalent to ${expected}`,
				debug: { expected, answer, difference: Math.abs(expected - answer) }
			};
		}

		// Fall back to symbolic equivalence check
		const valid = areEquivalent(ctx.answer, resolvedExpr);
		return {
			valid,
			reason: valid ? undefined : `${ctx.answer} is not equivalent to ${resolvedExpr}`,
			debug: { expression: resolvedExpr, answer: ctx.answer }
		};
	} catch {
		// If evaluation fails, try symbolic comparison
		const valid = areEquivalent(ctx.answer, resolvedExpr);
		return {
			valid,
			reason: valid ? undefined : `${ctx.answer} is not equivalent to ${resolvedExpr}`,
			debug: { expression: resolvedExpr, answer: ctx.answer }
		};
	}
}

/**
 * Evaluate predicate rule: answer must satisfy the predicate
 */
function evaluatePredicateRule(rule: PredicateRule, ctx: EvaluationContext): EvaluationResult {
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);

	if (isNaN(answer)) {
		return { valid: false, reason: 'Invalid numeric answer' };
	}

	let valid: boolean;
	let predicateDesc: string;

	switch (rule.predicate) {
		case 'isPrime':
			valid = isPrime(answer);
			predicateDesc = 'prime';
			break;
		case 'isComposite':
			valid = isComposite(answer);
			predicateDesc = 'composite';
			break;
		case 'isEven':
			valid = isEven(answer);
			predicateDesc = 'even';
			break;
		case 'isOdd':
			valid = isOdd(answer);
			predicateDesc = 'odd';
			break;
		case 'isPositive':
			valid = answer > 0;
			predicateDesc = 'positive';
			break;
		case 'isNegative':
			valid = answer < 0;
			predicateDesc = 'negative';
			break;
		case 'isInteger':
			valid = Number.isInteger(answer);
			predicateDesc = 'an integer';
			break;
	}

	return {
		valid,
		reason: valid ? undefined : `${answer} is not ${predicateDesc}`,
		debug: { predicate: rule.predicate, answer }
	};
}

/**
 * Evaluate custom expression rule (legacy fallback)
 *
 * Supports common patterns:
 * - gcd(answer, n) > 1
 * - answer % n == 0
 * - Comparison operators (==, !=, <, >, <=, >=)
 */
function evaluateCustomRule(rule: CustomExpressionRule, ctx: EvaluationContext): EvaluationResult {
	// Resolve variables first
	let expression = resolveVariablesInExpression(rule.expression, ctx.variables);

	// Substitute 'answer' placeholder with actual answer
	const answer = ctx.numericAnswer ?? parseFloat(ctx.answer);
	if (!isNaN(answer)) {
		expression = substituteVariable(expression, 'answer', answer);
	}

	try {
		const result = evaluateCustomExpression(expression);
		return {
			valid: result,
			reason: result ? undefined : rule.description || `Custom rule failed: ${rule.expression}`,
			debug: { expression: rule.expression, resolved: expression }
		};
	} catch (error) {
		return {
			valid: false,
			reason: `Failed to evaluate custom rule: ${error instanceof Error ? error.message : String(error)}`,
			debug: { expression: rule.expression }
		};
	}
}

// ============================================================================
// HELPER FUNCTIONS - EXPRESSION RESOLUTION
// ============================================================================

/**
 * Resolve a single expression to a number
 *
 * Handles:
 * - Variable references: {{varName}}
 * - Direct numbers
 * - Mathematical expressions via ComputeEngine
 */
function resolveExpression(expr: string, variables: Record<string, number | string>): number {
	// First resolve variable references
	const resolved = resolveVariablesInExpression(expr, variables);

	// Try to parse as number first
	const num = parseFloat(resolved);
	if (!isNaN(num) && resolved.trim() === String(num)) {
		return num;
	}

	// Evaluate as expression using ComputeEngine
	return evaluateSafeExpression(resolved);
}

/**
 * Resolve variable references in an expression string
 *
 * Replaces {{varName}} with the corresponding variable value
 */
function resolveVariablesInExpression(
	expr: string,
	variables: Record<string, number | string>
): string {
	let resolved = expr;

	// Replace {{varName}} patterns
	for (const [name, value] of Object.entries(variables)) {
		const pattern = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
		resolved = resolved.replace(pattern, String(value));
	}

	return resolved;
}

/**
 * Substitute a variable in an expression with a value
 *
 * Uses word boundary matching to avoid partial replacements
 * (e.g., don't replace 'x' in 'max')
 *
 * Wraps negative values in parentheses to ensure correct parsing
 * (e.g., x^2 with x=-2 becomes (-2)^2, not -2^2)
 */
function substituteVariable(expr: string, variable: string, value: number): string {
	// Use word boundary to avoid partial replacements
	const pattern = new RegExp(`\\b${variable}\\b`, 'g');
	// Wrap negative numbers in parentheses to avoid precedence issues
	const valueStr = value < 0 ? `(${value})` : String(value);
	return expr.replace(pattern, valueStr);
}

/**
 * Safely evaluate a mathematical expression
 *
 * Uses ComputeEngine for safe evaluation (no eval())
 */
function evaluateSafeExpression(expr: string): number {
	const result = evaluateExpression(expr);
	if (typeof result === 'number') {
		return result;
	}
	// Try to parse string result as number
	const num = parseFloat(result);
	if (!isNaN(num)) {
		return num;
	}
	throw new Error(`Expression "${expr}" did not evaluate to a number: ${result}`);
}

/**
 * Evaluate a custom boolean expression
 *
 * Supports comparison operators and common math functions
 */
function evaluateCustomExpression(expr: string): boolean {
	// Handle comparison operators
	const comparisonMatch = expr.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);

	if (comparisonMatch) {
		const [, leftStr, operator, rightStr] = comparisonMatch;
		const left = evaluateCustomSubExpression(leftStr.trim());
		const right = evaluateCustomSubExpression(rightStr.trim());

		switch (operator) {
			case '==':
				return Math.abs(left - right) < 1e-10;
			case '!=':
				return Math.abs(left - right) >= 1e-10;
			case '<':
				return left < right;
			case '>':
				return left > right;
			case '<=':
				return left <= right;
			case '>=':
				return left >= right;
		}
	}

	// Try to evaluate as boolean-like expression
	// If result is non-zero, treat as true
	const result = evaluateCustomSubExpression(expr);
	return result !== 0;
}

/**
 * Evaluate a sub-expression that may contain custom functions
 */
function evaluateCustomSubExpression(expr: string): number {
	// Handle gcd function
	const gcdMatch = expr.match(/gcd\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)/i);
	if (gcdMatch) {
		const a = evaluateCustomSubExpression(gcdMatch[1]);
		const b = evaluateCustomSubExpression(gcdMatch[2]);
		return gcd(Math.abs(Math.round(a)), Math.abs(Math.round(b)));
	}

	// Handle lcm function
	const lcmMatch = expr.match(/lcm\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)/i);
	if (lcmMatch) {
		const a = evaluateCustomSubExpression(lcmMatch[1]);
		const b = evaluateCustomSubExpression(lcmMatch[2]);
		return lcm(Math.abs(Math.round(a)), Math.abs(Math.round(b)));
	}

	// Handle abs function
	const absMatch = expr.match(/abs\s*\(\s*(.+?)\s*\)/i);
	if (absMatch) {
		return Math.abs(evaluateCustomSubExpression(absMatch[1]));
	}

	// Handle modulo operator
	if (expr.includes('%')) {
		const parts = expr.split('%');
		if (parts.length === 2) {
			const a = evaluateCustomSubExpression(parts[0].trim());
			const b = evaluateCustomSubExpression(parts[1].trim());
			return a % b;
		}
	}

	// Default: use safe expression evaluator
	return evaluateSafeExpression(expr);
}

// ============================================================================
// HELPER FUNCTIONS - NUMBER THEORY
// ============================================================================

/**
 * Check if a number is prime
 */
function isPrime(n: number): boolean {
	if (!Number.isInteger(n) || n < 2) return false;
	if (n === 2) return true;
	if (n % 2 === 0) return false;

	const sqrt = Math.sqrt(n);
	for (let i = 3; i <= sqrt; i += 2) {
		if (n % i === 0) return false;
	}
	return true;
}

/**
 * Check if a number is composite (not prime and > 1)
 */
function isComposite(n: number): boolean {
	if (!Number.isInteger(n) || n <= 1) return false;
	return !isPrime(n);
}

/**
 * Check if a number is even
 */
function isEven(n: number): boolean {
	if (!Number.isInteger(n)) return false;
	return n % 2 === 0;
}

/**
 * Check if a number is odd
 */
function isOdd(n: number): boolean {
	if (!Number.isInteger(n)) return false;
	return n % 2 !== 0;
}

/**
 * Calculate greatest common divisor (Euclidean algorithm)
 */
function gcd(a: number, b: number): number {
	if (b === 0) return a;
	return gcd(b, a % b);
}

/**
 * Calculate least common multiple
 */
function lcm(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	return Math.abs(a * b) / gcd(a, b);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Create an evaluation context from resolved variables
 */
export function createEvaluationContext(
	resolvedVariables: Array<{ name: string; value: string }>,
	answer: string
): EvaluationContext {
	const variables: Record<string, number | string> = {};

	for (const { name, value } of resolvedVariables) {
		// Try to parse as number
		const num = parseFloat(value);
		variables[name] = isNaN(num) ? value : num;
	}

	// Parse answer as number if possible
	const numericAnswer = parseFloat(answer);

	return {
		variables,
		answer,
		numericAnswer: isNaN(numericAnswer) ? undefined : numericAnswer
	};
}

/**
 * Export number theory functions for use in tests or other modules
 */
export const numberTheory = {
	isPrime,
	isComposite,
	isEven,
	isOdd,
	gcd,
	lcm
};
