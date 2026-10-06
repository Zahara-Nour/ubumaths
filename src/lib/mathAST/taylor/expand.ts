/**
 * Taylor Series Expansion
 *
 * Computes Taylor (or Maclaurin) series expansions of mathematical expressions.
 * Uses repeated differentiation and evaluation to build the polynomial approximation.
 *
 * Taylor series formula:
 *   f(x) = Sum_{n=0}^{N-1} (f^(n)(a) / n!) * (x - a)^n
 *
 * For Maclaurin series (a = 0):
 *   f(x) = f(0) + f'(0)*x + f''(0)*x^2/2! + f'''(0)*x^3/6 + ...
 *
 * @module mathAST/taylor
 */

import type { MathNode } from '../types';
import type { TaylorOptions } from './types';
import type { FunctionBindings } from '../eval/function-bindings';
import type { EvalValue, ComplexValueResult } from '../eval/types';
import { DEFAULT_TAYLOR_OPTIONS, MAX_TAYLOR_TERMS, TaylorError } from './types';
import { differentiate } from '../differentiation';
import { evaluate, evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { getVariables, substitute } from '../eval/substitute';
import { simplify } from '../simplify';
import { isAddition, isNumber, isOpposite, isSubtraction } from '../guards';
import {
	number,
	variable,
	add,
	subtract,
	multiply,
	power,
	opposite,
	divide,
	delimiter
} from '../factory';
import { numericNode } from '../common/numeric';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Compute factorial of n.
 * Returns as a number for coefficient computation.
 *
 * @param n - Non-negative integer
 * @returns n!
 */
function factorial(n: number): number {
	if (n < 0 || !Number.isInteger(n)) {
		throw new TaylorError(`Factorial requires non-negative integer, got ${n}`);
	}
	if (n === 0 || n === 1) return 1;

	let result = 1;
	for (let i = 2; i <= n; i++) {
		result *= i;
	}
	return result;
}

/**
 * Check if a value is effectively zero within floating-point tolerance.
 *
 * @param value - Number to check
 * @param tolerance - Tolerance threshold (default: 1e-15)
 * @returns True if value is close to zero
 */
function isEffectivelyZero(value: number, tolerance: number = 1e-15): boolean {
	return Math.abs(value) < tolerance;
}

/**
 * Type guard for MathNode values.
 */
function isMathNode(value: EvalValue): value is MathNode {
	return typeof value === 'object' && 'type' in value;
}

/**
 * Type guard for ComplexValueResult.
 */
function isComplex(value: EvalValue): value is ComplexValueResult {
	return typeof value === 'object' && 'real' in value && 'imag' in value;
}

/**
 * Convert evaluation result to a number.
 * Handles MathNode, number, and Complex values.
 *
 * @param value - Evaluation result value
 * @returns Numeric value
 * @throws Error if value is complex with non-zero imaginary part
 */
function valueToNumber(value: EvalValue): number {
	if (typeof value === 'number') {
		return value;
	}
	if (isComplex(value)) {
		if (value.imag !== 0) {
			throw new Error('Cannot convert complex number with non-zero imaginary part to number');
		}
		return value.real;
	}
	if (isMathNode(value)) {
		return evaluateNodeToApproximatedNumber(value);
	}
	throw new Error('Unknown value type');
}

/**
 * Simplify a coefficient for display.
 * Returns nice fractions when possible.
 *
 * @param value - Coefficient value
 * @returns Simplified coefficient as MathNode
 */
function coefficientToNode(value: number): MathNode {
	// Handle zero
	if (isEffectivelyZero(value)) {
		return number('0');
	}

	// Handle integers
	if (Number.isInteger(value)) {
		return numericNode(value);
	}

	// Try to find a simple fraction representation
	// Check denominators up to 100
	for (let d = 2; d <= 100; d++) {
		const n = value * d;
		if (Number.isInteger(Math.round(n)) && Math.abs(n - Math.round(n)) < 1e-10) {
			const numerator = Math.round(n);
			const g = gcd(Math.abs(numerator), d);
			const reducedNum = numerator / g;
			const reducedDen = d / g;
			if (reducedDen === 1) {
				return numericNode(reducedNum);
			}
			return divide(numericNode(reducedNum), numericNode(reducedDen), 'fraction');
		}
	}

	// Fall back to decimal representation
	// Use reasonable precision
	const formatted = value.toPrecision(10).replace(/\.?0+$/, '');
	return numericNode(formatted);
}

/**
 * Simple GCD for positive integers.
 */
function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b !== 0) {
		const temp = b;
		b = a % b;
		a = temp;
	}
	return a;
}

/**
 * Build a term of the Taylor series.
 *
 * @param coefficient - The coefficient (f^(n)(a) / n!)
 * @param varNode - The variable node
 * @param center - The center point
 * @param degree - The power (n)
 * @returns The term as a MathNode
 */
function buildTerm(
	coefficient: number,
	varNode: MathNode,
	center: number,
	degree: number
): MathNode | null {
	// Skip zero coefficients
	if (isEffectivelyZero(coefficient)) {
		return null;
	}

	const baseTerm = centeredBase(varNode, center);

	// Degree 0: just the coefficient
	if (degree === 0) {
		return coefficientToNode(coefficient);
	}

	// Build coefficient node
	const coeffNode = coefficientToNode(Math.abs(coefficient));
	const isNegative = coefficient < 0;

	// Degree 1: coeff * x or coeff * (x - a)
	if (degree === 1) {
		let term: MathNode;
		// Handle coefficient = 1 case
		if (Math.abs(coefficient) === 1) {
			term = baseTerm;
		} else {
			term = multiply(coeffNode, baseTerm, 'implicit');
		}
		return isNegative ? opposite(term) : term;
	}

	// Degree > 1: coeff * (x - a)^n
	const powerTerm = power(baseTerm, number(degree.toString()));

	let term: MathNode;
	// Handle coefficient = 1 case
	if (Math.abs(coefficient) === 1) {
		term = powerTerm;
	} else {
		term = multiply(coeffNode, powerTerm, 'implicit');
	}

	return isNegative ? opposite(term) : term;
}

/**
 * Le facteur (x - a) d'un terme, x seul en 0.
 *
 * Les parenthèses sont portées par l'AST : le rendu n'en ajoute aucune
 * d'après la priorité des opérateurs, donc `power(add(x, -1), 2)`
 * s'afficherait « x + -1^2 », qui se lit x + 1 — une autre expression.
 */
function centeredBase(varNode: MathNode, center: number): MathNode {
	if (center === 0) return varNode;
	if (center > 0) {
		// (x - a)
		return delimiter('parentheses', subtract(varNode, number(center.toString())));
	}
	// (x - (-a)) = (x + |a|)
	return delimiter('parentheses', add(varNode, number(Math.abs(center).toString())));
}

/**
 * Un terme dont le coefficient est une EXPRESSION (`a`, `-a^3/6`) : c'est le
 * cas d'une fonction à paramètre littéral, `a x^2` ou `sin(a x)`.
 *
 * Un coefficient négatif garde son `opposite` à l'extérieur, pour que la somme
 * s'écrive « x - t » ; une somme se met entre parenthèses avant le facteur.
 */
function buildSymbolicTerm(
	coefficient: MathNode,
	varNode: MathNode,
	center: number,
	degree: number
): MathNode {
	if (degree === 0) return coefficient;
	const isNegative = isOpposite(coefficient);
	const magnitude = isOpposite(coefficient) ? coefficient.operand : coefficient;
	const base = centeredBase(varNode, center);
	const powered = degree === 1 ? base : power(base, number(degree.toString()));
	const factor =
		isAddition(magnitude) || isSubtraction(magnitude)
			? delimiter('parentheses', magnitude)
			: magnitude;
	const term =
		isNumber(factor) && factor.value === '1' ? powered : multiply(factor, powered, 'implicit');
	return isNegative ? opposite(term) : term;
}

/**
 * Coefficient f⁽ⁿ⁾(a)/n! calculé SYMBOLIQUEMENT, quand l'expression contient
 * un paramètre littéral (`a` dans `a x^2`) que l'évaluation numérique ne sait
 * pas chiffrer.
 *
 * ⚠️ La dérivée doit d'abord être définie au point : on la chiffre avec un
 * petit jeu de valeurs d'essai des paramètres, et on ne refuse que si elle est
 * indéfinie pour TOUTES (`ln(a x)` en 0). Une seule valeur ne suffit pas :
 * `√(a−1) x` est indéfini pour a = 0,73 mais pas pour a = 2,31.
 *
 * ⚠️ Le coefficient simplifié est ensuite RE-VÉRIFIÉ à une valeur d'essai où
 * la dérivée est définie : si `simplify` a perdu un facteur (`a i` → `a`),
 * l'écart est détecté et le développement refusé plutôt que rendu faux.
 */
function symbolicCoefficient(
	derivative: MathNode,
	varName: string,
	center: number,
	degree: number,
	parameters: readonly string[],
	functions?: FunctionBindings
): MathNode {
	const probeAt = (value: number) =>
		Object.fromEntries(parameters.map((name) => [name, value] as const));
	const realValue = (node: MathNode): number | null => {
		try {
			const result = evaluate(node, { mode: 'decimal', functions });
			if (result.status !== 'value') return null;
			const value = valueToNumber(result.value);
			return Number.isFinite(value) ? value : null;
		} catch {
			return null;
		}
	};

	let probe: Record<string, number> | null = null;
	let expected = 0;
	for (const value of PARAMETER_PROBES) {
		const checked = realValue(substitute(derivative, { ...probeAt(value), [varName]: center }));
		if (checked !== null) {
			probe = probeAt(value);
			expected = checked;
			break;
		}
	}
	if (probe === null) {
		throw new Error('Derivative is not defined at the center');
	}

	const atCenter = substitute(derivative, { [varName]: center });
	const scaled =
		degree < 2 ? atCenter : divide(atCenter, numericNode(factorial(degree)), 'fraction');
	const coefficient = simplify(scaled).result;

	const recomputed = realValue(substitute(coefficient, probe));
	const actual = recomputed === null ? null : recomputed * factorial(degree);
	if (actual === null || Math.abs(actual - expected) > 1e-9 * Math.max(1, Math.abs(expected))) {
		throw new Error('Symbolic coefficient does not match the derivative');
	}
	return coefficient;
}

/**
 * Valeurs d'essai d'un paramètre littéral : quelconques, non entières, des
 * deux signes et des deux côtés de 1, pour qu'une racine ou un logarithme du
 * paramètre soit défini pour au moins l'une d'elles.
 */
const PARAMETER_PROBES = [0.7319, -0.7319, 2.31, -2.31] as const;

/**
 * Constantes que `getVariables` rend comme des lettres : jamais des
 * paramètres. `i` surtout : le prendre pour un paramètre réel donnerait un
 * développement faux d'une fonction à valeurs complexes.
 */
const CONSTANT_NAMES: ReadonlySet<string> = new Set(['pi', 'e', 'i']);

// =============================================================================
// Main Taylor Expansion Function
// =============================================================================

/**
 * Compute the Taylor series expansion of an expression.
 *
 * The Taylor series is computed by:
 * 1. Repeatedly differentiating the expression
 * 2. Evaluating each derivative at the center point
 * 3. Building the polynomial sum
 *
 * @param expr - The expression to expand
 * @param options - Taylor expansion options
 * @param functions - Optional function bindings for generic functions
 * @returns The Taylor polynomial as a MathNode
 *
 * @throws TaylorError if:
 *   - Number of terms exceeds MAX_TAYLOR_TERMS (20)
 *   - Expression cannot be differentiated
 *   - Derivatives cannot be evaluated at the center
 *
 * @example
 * ```typescript
 * // Maclaurin series of sin(x), 5 terms
 * const sinExpr = func('sin', [variable('x')]);
 * const taylor = taylorExpand(sinExpr, { terms: 5 });
 * // Result: x - x^3/6 + x^5/120
 *
 * // Taylor series of e^x at x=0, 4 terms
 * const expExpr = func('exp', [variable('x')]);
 * const taylor = taylorExpand(expExpr, { terms: 4 });
 * // Result: 1 + x + x^2/2 + x^3/6
 *
 * // Taylor series centered at a=1
 * const lnExpr = func('ln', [variable('x')]);
 * const taylor = taylorExpand(lnExpr, { terms: 4, center: 1 });
 * // Result: (x-1) - (x-1)^2/2 + (x-1)^3/3 - (x-1)^4/4
 * ```
 */
export function taylorExpand(
	expr: MathNode,
	options?: TaylorOptions,
	functions?: FunctionBindings
): MathNode {
	const varName = options?.variable ?? DEFAULT_TAYLOR_OPTIONS.variable;
	const center = options?.center ?? DEFAULT_TAYLOR_OPTIONS.center;
	const numTerms = options?.terms ?? DEFAULT_TAYLOR_OPTIONS.terms;

	// Validate number of terms
	if (numTerms < 1) {
		throw new TaylorError('Number of terms must be at least 1', undefined, `Got ${numTerms}`);
	}
	if (numTerms > MAX_TAYLOR_TERMS) {
		throw new TaylorError(
			`Number of terms exceeds maximum of ${MAX_TAYLOR_TERMS}`,
			undefined,
			`Got ${numTerms}. This limit prevents performance issues.`
		);
	}

	// Variable node for building terms
	const varNode = variable(varName);

	// Collect non-zero terms
	const terms: MathNode[] = [];
	let currentExpr = expr;
	// Les lettres autres que la variable : des paramètres (`a` dans `a x^2`).
	// Un nom de fonction de l'élève n'en est pas un.
	const parameters = [...getVariables(expr)].filter(
		(name) => name !== varName && !CONSTANT_NAMES.has(name) && functions?.[name] === undefined
	);

	for (let n = 0; n < numTerms; n++) {
		try {
			// Evaluate the nth derivative at the center
			const substituted = substitute(currentExpr, { [varName]: center });
			const evalResult = evaluate(substituted, { mode: 'decimal', functions });
			if (evalResult.status === 'value') {
				// Compute coefficient: f^(n)(a) / n!
				const coefficient = valueToNumber(evalResult.value) / factorial(n);

				// Build the term if coefficient is non-zero
				const term = buildTerm(coefficient, varNode, center, n);
				if (term !== null) {
					terms.push(term);
				}
			} else if (parameters.length > 0) {
				// Un paramètre littéral ne se chiffre pas : coefficient symbolique
				const coefficient = symbolicCoefficient(
					currentExpr,
					varName,
					center,
					n,
					parameters,
					functions
				);
				if (!(isNumber(coefficient) && Number(coefficient.value) === 0)) {
					terms.push(buildSymbolicTerm(coefficient, varNode, center, n));
				}
			} else {
				throw new Error('Unknown value type');
			}

			// Differentiate for next iteration (except on last iteration)
			if (n < numTerms - 1) {
				currentExpr = differentiate(currentExpr, {
					variable: varName,
					simplify: true,
					functions
				});
			}
		} catch (err) {
			// If evaluation fails (e.g., at a point where function is undefined),
			// we still try to continue with remaining terms
			const message = err instanceof Error ? err.message : 'Unknown error';
			throw new TaylorError(
				`Cannot compute Taylor term ${n} at center=${center}`,
				undefined,
				`Error during ${n === 0 ? 'evaluation' : 'differentiation/evaluation'}: ${message}`
			);
		}
	}

	// If all terms are zero, return 0
	if (terms.length === 0) {
		return number('0');
	}

	// Build the sum
	// Start with the first term
	let result = terms[0];

	// Add remaining terms
	for (let i = 1; i < terms.length; i++) {
		const term = terms[i];
		// Un terme négatif arrive enveloppé dans `opposite` : on l'ajoute comme
		// une soustraction, sinon la somme s'affiche « x + -t » au lieu de « x - t ».
		if (term.type === 'opposite') {
			result = subtract(result, term.operand);
		} else {
			result = add(result, term);
		}
	}

	return result;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Compute Maclaurin series (Taylor series centered at 0).
 *
 * @param expr - The expression to expand
 * @param numTerms - Number of terms (default: 5)
 * @param varName - Variable name (default: 'x')
 * @param functions - Optional function bindings
 * @returns The Maclaurin polynomial
 *
 * @example
 * ```typescript
 * // sin(x) ~ x - x^3/6 + x^5/120
 * const result = maclaurin(func('sin', [variable('x')]), 3);
 * ```
 */
export function maclaurin(
	expr: MathNode,
	numTerms: number = 5,
	varName: string = 'x',
	functions?: FunctionBindings
): MathNode {
	return taylorExpand(expr, { variable: varName, center: 0, terms: numTerms }, functions);
}
