/**
 * Domain validation functions.
 *
 * Check if given values satisfy domain constraints for expressions.
 * Provides violation details for pedagogical error messages.
 */

import type { MathNode } from '../types';
import type { DomainViolation } from './types';
import { getBuiltinDomain, getBuiltinConstraintDescription, hasRestrictedDomain } from './builtins';
import { containsValue } from './algebra';

// =============================================================================
// Types
// =============================================================================

/** Variable bindings for evaluation */
export type Bindings = Record<string, number>;

// =============================================================================
// Main API
// =============================================================================

/**
 * Check if all values in bindings are in the domain of the expression.
 *
 * @param expr - The expression to check
 * @param bindings - Variable bindings to check
 * @returns true if all bindings satisfy domain constraints
 *
 * @example
 * isInDomain(sqrt(x), { x: 4 }) // → true
 * isInDomain(sqrt(x), { x: -1 }) // → false
 */
export function isInDomain(expr: MathNode, bindings: Bindings): boolean {
	const violations = getDomainViolations(expr, bindings);
	return violations.length === 0;
}

/**
 * Get all domain violations for an expression with given bindings.
 *
 * @param expr - The expression to check
 * @param bindings - Variable bindings to check
 * @returns Array of violation details (empty if no violations)
 *
 * @example
 * getDomainViolations(sqrt(x), { x: -1 })
 * // → [{ source: 'sqrt', parameter: 'x', constraint: 'x >= 0', value: -1, ... }]
 */
export function getDomainViolations(expr: MathNode, bindings: Bindings): DomainViolation[] {
	const violations: DomainViolation[] = [];
	collectViolations(expr, bindings, violations);
	return violations;
}

// =============================================================================
// Violation Collection
// =============================================================================

/**
 * Recursively collect domain violations.
 */
function collectViolations(
	node: MathNode,
	bindings: Bindings,
	violations: DomainViolation[]
): void {
	switch (node.type) {
		case 'number':
		case 'greek':
		case 'symbol':
		case 'hole':
			// Literals have no domain constraints
			break;

		case 'variable':
			// Variables have no inherent domain constraints
			break;

		case 'addition':
		case 'subtraction':
		case 'multiplication':
			collectViolations(node.left, bindings, violations);
			collectViolations(node.right, bindings, violations);
			break;

		case 'division':
			collectViolations(node.numerator, bindings, violations);
			collectViolations(node.denominator, bindings, violations);
			// Check if denominator is zero
			checkDivisionByZero(node.denominator, bindings, violations);
			break;

		case 'opposite':
		case 'positive':
			collectViolations(node.operand, bindings, violations);
			break;

		case 'function':
			// Check each argument
			for (const arg of node.args) {
				collectViolations(arg, bindings, violations);
			}
			// Check if argument is in function's domain
			checkFunctionDomain(node, bindings, violations);
			break;

		case 'superscript':
			collectViolations(node.base, bindings, violations);
			collectViolations(node.superscript, bindings, violations);
			// Check for negative base with fractional exponent, or zero base with negative exponent
			checkPowerDomain(node, bindings, violations);
			break;

		case 'subscript':
			collectViolations(node.base, bindings, violations);
			collectViolations(node.subscript, bindings, violations);
			break;

		case 'delimiter':
			collectViolations(node.content, bindings, violations);
			break;

		case 'relation':
			collectViolations(node.left, bindings, violations);
			collectViolations(node.right, bindings, violations);
			break;

		case 'composition':
			collectViolations(node.outer, bindings, violations);
			collectViolations(node.inner, bindings, violations);
			break;

		case 'unit':
			collectViolations(node.expression, bindings, violations);
			break;
	}
}

/**
 * Check if dividing by the given expression would cause division by zero.
 */
function checkDivisionByZero(
	denominator: MathNode,
	bindings: Bindings,
	violations: DomainViolation[]
): void {
	const value = tryEvaluate(denominator, bindings);
	if (value !== null && Math.abs(value) < 1e-10) {
		violations.push({
			source: 'division',
			parameter: 'denominator',
			constraint: 'denominateur ≠ 0',
			value: value,
			messageFr: `Division par zéro : le dénominateur vaut ${value}`,
			messageEn: `Division by zero: denominator equals ${value}`
		});
	}
}

/**
 * Check if a function argument is in the function's domain.
 */
function checkFunctionDomain(
	node: { name: string; args: readonly MathNode[] },
	bindings: Bindings,
	violations: DomainViolation[]
): void {
	if (node.args.length === 0) return;

	const funcName = node.name.toLowerCase();
	if (!hasRestrictedDomain(funcName)) return;

	const domain = getBuiltinDomain(funcName);
	if (!domain || domain.kind === 'universal') return;

	// Evaluate the argument
	const arg = node.args[0];
	const value = tryEvaluate(arg, bindings);
	if (value === null) return; // Cannot evaluate

	// Check if value is in domain
	if (!containsValue(domain, value)) {
		const constraint = getBuiltinConstraintDescription(funcName) || 'constraint';
		violations.push({
			source: node.name,
			parameter: 'x',
			constraint: constraint,
			value: value,
			messageFr: `${node.name}(x) requiert ${constraint}, valeur reçue : x = ${value}`,
			messageEn: `${node.name}(x) requires ${constraint}, got x = ${value}`
		});
	}
}

/**
 * Check power expression domain constraints.
 */
function checkPowerDomain(
	node: { base: MathNode; superscript: MathNode },
	bindings: Bindings,
	violations: DomainViolation[]
): void {
	const baseValue = tryEvaluate(node.base, bindings);
	const expValue = tryEvaluate(node.superscript, bindings);

	if (baseValue === null || expValue === null) return;

	// Check for 0^negative
	if (Math.abs(baseValue) < 1e-10 && expValue < 0) {
		violations.push({
			source: 'power',
			parameter: 'base',
			constraint: 'base ≠ 0 pour exposant négatif',
			value: baseValue,
			messageFr: `Puissance invalide : base = 0 avec exposant négatif (${expValue})`,
			messageEn: `Invalid power: base = 0 with negative exponent (${expValue})`
		});
	}

	// Check for negative base with non-integer exponent
	if (baseValue < 0 && !Number.isInteger(expValue)) {
		violations.push({
			source: 'power',
			parameter: 'base',
			constraint: 'base >= 0 pour exposant non entier',
			value: baseValue,
			messageFr: `Puissance invalide : base négative (${baseValue}) avec exposant non entier (${expValue})`,
			messageEn: `Invalid power: negative base (${baseValue}) with non-integer exponent (${expValue})`
		});
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Try to evaluate an expression to a number.
 * Returns null if cannot evaluate (e.g., contains unbound variables).
 */
function tryEvaluate(node: MathNode, bindings: Bindings): number | null {
	switch (node.type) {
		case 'number':
			return parseFloat(node.value);

		case 'variable':
			return bindings[node.name] ?? null;

		case 'greek':
			if (node.letter === 'pi') return Math.PI;
			return null;

		case 'opposite': {
			const val = tryEvaluate(node.operand, bindings);
			return val !== null ? -val : null;
		}

		case 'positive':
			return tryEvaluate(node.operand, bindings);

		case 'addition': {
			const left = tryEvaluate(node.left, bindings);
			const right = tryEvaluate(node.right, bindings);
			return left !== null && right !== null ? left + right : null;
		}

		case 'subtraction': {
			const left = tryEvaluate(node.left, bindings);
			const right = tryEvaluate(node.right, bindings);
			return left !== null && right !== null ? left - right : null;
		}

		case 'multiplication': {
			const left = tryEvaluate(node.left, bindings);
			const right = tryEvaluate(node.right, bindings);
			return left !== null && right !== null ? left * right : null;
		}

		case 'division': {
			const num = tryEvaluate(node.numerator, bindings);
			const den = tryEvaluate(node.denominator, bindings);
			if (num === null || den === null) return null;
			if (Math.abs(den) < 1e-10) return null; // Division by zero
			return num / den;
		}

		case 'superscript': {
			const base = tryEvaluate(node.base, bindings);
			const exp = tryEvaluate(node.superscript, bindings);
			if (base === null || exp === null) return null;
			return Math.pow(base, exp);
		}

		case 'delimiter':
			return tryEvaluate(node.content, bindings);

		case 'function': {
			if (node.args.length === 0) return null;
			const arg = tryEvaluate(node.args[0], bindings);
			if (arg === null) return null;
			return evaluateBuiltinFunction(node.name, arg);
		}

		default:
			return null;
	}
}

/**
 * Evaluate a builtin function.
 */
function evaluateBuiltinFunction(name: string, arg: number): number | null {
	const funcName = name.toLowerCase();
	switch (funcName) {
		case 'sqrt':
			return arg >= 0 ? Math.sqrt(arg) : null;
		case 'ln':
		case 'log':
			return arg > 0 ? Math.log(arg) : null;
		case 'log10':
			return arg > 0 ? Math.log10(arg) : null;
		case 'log2':
			return arg > 0 ? Math.log2(arg) : null;
		case 'sin':
			return Math.sin(arg);
		case 'cos':
			return Math.cos(arg);
		case 'tan':
			return Math.tan(arg);
		case 'asin':
		case 'arcsin':
			return arg >= -1 && arg <= 1 ? Math.asin(arg) : null;
		case 'acos':
		case 'arccos':
			return arg >= -1 && arg <= 1 ? Math.acos(arg) : null;
		case 'atan':
		case 'arctan':
			return Math.atan(arg);
		case 'exp':
			return Math.exp(arg);
		case 'abs':
			return Math.abs(arg);
		case 'floor':
			return Math.floor(arg);
		case 'ceil':
			return Math.ceil(arg);
		case 'round':
			return Math.round(arg);
		case 'sinh':
			return Math.sinh(arg);
		case 'cosh':
			return Math.cosh(arg);
		case 'tanh':
			return Math.tanh(arg);
		case 'acosh':
		case 'arccosh':
			return arg >= 1 ? Math.acosh(arg) : null;
		case 'asinh':
		case 'arcsinh':
			return Math.asinh(arg);
		case 'atanh':
		case 'arctanh':
			return arg > -1 && arg < 1 ? Math.atanh(arg) : null;
		default:
			return null;
	}
}
