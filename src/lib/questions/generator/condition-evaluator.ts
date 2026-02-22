/**
 * Condition Evaluator for Generation Guards
 * ==========================================
 *
 * Evaluates boolean conditions against resolved variable values.
 * Used to validate that randomly generated variables satisfy constraints
 * (e.g., 'a*b!=0', 'gcd(a+b,c)=1', 'abs(a) != abs(b)').
 *
 * Pipeline: condition string → parseCustom() → substitute variables → evaluate → boolean
 *
 * Note: We use decimal evaluation on both sides of relations because the default
 * exact mode's areEquivalent() doesn't evaluate function calls (like gcd) before
 * comparing. For generation guards with integer values, decimal mode is sufficient.
 *
 * @module questions/generator/condition-evaluator
 */

import type { ResolvedVariable } from '$lib/ubumark/types/parameterization';
import type { EvalBindings } from '$lib/mathAST/eval/types';
import type { MathNode } from '$lib/mathAST/types';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { substitute } from '$lib/mathAST/eval/substitute';
import { evaluate, evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';
import { isEvalValue } from '$lib/mathAST/eval/types';
import { isRelation, isLogical, isLogicalNot, isBoolean } from '$lib/mathAST/guards';

/**
 * Build EvalBindings from resolved variables.
 *
 * Converts ResolvedVariable[] (name/value pairs where value is a string)
 * to the EvalBindings format expected by mathAST's substitute function.
 */
function buildBindings(resolvedVariables: ResolvedVariable[]): EvalBindings {
	const bindings: Record<string, number | string> = {};
	for (const v of resolvedVariables) {
		// Try parsing as a number first for efficiency
		const num = Number(v.value);
		if (!isNaN(num) && isFinite(num)) {
			bindings[v.name] = num;
		} else {
			// Keep as string — substitute will parse it as LaTeX/expression
			bindings[v.name] = v.value;
		}
	}
	return bindings;
}

/** Tolerance for floating-point comparisons */
const EPSILON = 1e-10;

/**
 * Evaluate a relation node by numerically evaluating both sides.
 *
 * Unlike areEquivalent() which does structural comparison, this evaluates
 * both sides to numbers and compares them. This is essential for conditions
 * involving function calls like gcd() and mod() that areEquivalent can't
 * simplify structurally.
 */
function evaluateRelationNumeric(node: MathNode): boolean | undefined {
	if (!isRelation(node)) return undefined;

	try {
		const leftVal = evaluateNodeToApproximatedNumber(node.left);
		const rightVal = evaluateNodeToApproximatedNumber(node.right);

		switch (node.relation) {
			case '=':
				return Math.abs(leftVal - rightVal) < EPSILON;
			case '!=':
				return !(Math.abs(leftVal - rightVal) < EPSILON);
			case '<':
				return leftVal < rightVal - EPSILON;
			case '>':
				return leftVal > rightVal + EPSILON;
			case '<=':
				return leftVal < rightVal + EPSILON;
			case '>=':
				return leftVal > rightVal - EPSILON;
			default:
				return undefined;
		}
	} catch {
		return undefined;
	}
}

/**
 * Evaluate a boolean expression by recursively handling logical operators
 * and using numeric comparison for relations.
 */
function evaluateBooleanNode(node: MathNode): boolean | undefined {
	if (isBoolean(node)) {
		return node.value;
	}

	if (isRelation(node)) {
		return evaluateRelationNumeric(node);
	}

	if (isLogical(node)) {
		const left = evaluateBooleanNode(node.left);
		// Short-circuit
		if (node.operator === 'and' && left === false) return false;
		if (node.operator === 'or' && left === true) return true;

		if (left === undefined) return undefined;
		const right = evaluateBooleanNode(node.right);
		if (right === undefined) return undefined;

		if (node.operator === 'and') return left && right;
		if (node.operator === 'or') return left || right;
		return undefined;
	}

	if (isLogicalNot(node)) {
		const operand = evaluateBooleanNode(node.operand);
		if (operand === undefined) return undefined;
		return !operand;
	}

	return undefined;
}

/**
 * Evaluate a single condition string against resolved variables.
 *
 * @param condition - Boolean expression string (e.g., 'a*b!=0')
 * @param bindings - Variable bindings for substitution
 * @returns true if condition is satisfied, false otherwise
 * @throws Error if condition cannot be parsed or evaluated
 */
function evaluateSingleCondition(condition: string, bindings: EvalBindings): boolean {
	// 1. Parse the condition string into a MathAST node
	let ast: MathNode;
	try {
		ast = parseCustom(condition);
	} catch (e) {
		throw new Error(
			`Condition '${condition}' could not be parsed: ${e instanceof Error ? e.message : String(e)}`
		);
	}

	// 2. Substitute variable values
	const substituted = substitute(ast, bindings);

	// 3. Try our custom numeric boolean evaluation first
	// This handles relations with function calls (gcd, mod, abs) correctly
	const boolResult = evaluateBooleanNode(substituted);
	if (boolResult !== undefined) {
		return boolResult;
	}

	// 4. Fall back to the general evaluate pipeline
	const result = evaluate(substituted);

	if (!isEvalValue(result)) {
		throw new Error(
			`Condition '${condition}' could not be evaluated: ${result.status === 'unevaluable' ? result.reason : 'indeterminate'}`
		);
	}

	if (typeof result.value === 'boolean') {
		return result.value;
	}

	throw new Error(
		`Condition '${condition}' did not evaluate to a boolean (got ${typeof result.value})`
	);
}

/**
 * Evaluate all conditions against resolved variables.
 *
 * All conditions must be true (implicit AND between conditions).
 *
 * @param conditions - Array of condition strings
 * @param resolvedVariables - Resolved variable values to substitute
 * @returns true if ALL conditions are satisfied, false if any fails
 */
export function evaluateConditions(
	conditions: string[],
	resolvedVariables: ResolvedVariable[]
): boolean {
	if (conditions.length === 0) return true;

	const bindings = buildBindings(resolvedVariables);

	for (const condition of conditions) {
		try {
			if (!evaluateSingleCondition(condition, bindings)) {
				return false;
			}
		} catch {
			// If evaluation fails, treat as unsatisfied
			return false;
		}
	}

	return true;
}
