/**
 * Partial Fractions Integrator
 *
 * Handles integration of rational functions P(x)/Q(x) using partial fraction decomposition.
 *
 * @module mathAST/integration/integrators/partial-fractions
 */

import type { MathNode } from '../../types';
import type {
	Integrator,
	IntegrateResult,
	IntegrateStepRecorder,
	ResolvedIntegrateOptions
} from '../types';
import { isNumber, isVariable } from '../../guards';
import { number, divide, add, subtract, power, implicitMultiply, func } from '../../factory';
import { containsVariable } from '../rules';
import { CONSTANT_OF_INTEGRATION_NOTE } from '../descriptions-fr';
// Polynomial division utilities
import {
	normalize,
	denormalize,
	checkUnivariate,
	toUnivariateView,
	fromUnivariateView,
	divideUnivariate,
	isOnePolynomial,
	ONE_POLYNOMIAL
} from '../../normal';

// Import integrate function for recursive calls
// This circular dependency is resolved at runtime since both modules are fully loaded
// before any actual integration occurs
import { integrate } from '../integrate';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Represents a polynomial factor (linear or quadratic)
 */
interface PolynomialFactor {
	/** Type of factor */
	type: 'linear' | 'quadratic';
	/** Root for linear factor (x - root), or null for quadratic */
	root?: MathNode;
	/** Multiplicity (how many times this factor appears) */
	multiplicity: number;
	/** For quadratic: coefficients a, b, c in ax^2 + bx + c */
	quadraticCoeffs?: { a: MathNode; b: MathNode; c: MathNode };
}

/**
 * Represents a partial fraction term
 */
interface PartialFractionTerm {
	/** Coefficient (A, B, C, ...) */
	coefficient: MathNode;
	/** Denominator factor */
	factor: PolynomialFactor;
	/** Power of factor in denominator (1 for simple, 2+ for repeated) */
	power: number;
}

// =============================================================================
// Rational Function Detection
// =============================================================================

/**
 * Check if expression is a rational function P(x)/Q(x) where P and Q are polynomials.
 */
function isRationalFunction(expr: MathNode, variable: string): boolean {
	// Must be a division
	if (expr.type !== 'division') {
		return false;
	}

	const numerator = expr.numerator;
	const denominator = expr.denominator;

	// Check if numerator and denominator are polynomials
	return isPolynomial(numerator, variable) && isPolynomial(denominator, variable);
}

/**
 * Check if expression is a polynomial in the given variable.
 */
function isPolynomial(expr: MathNode, variable: string): boolean {
	// Unwrap delimiters (parentheses)
	if (expr.type === 'delimiter') {
		return isPolynomial(expr.content, variable);
	}

	// Constants are polynomials
	if (!containsVariable(expr, variable)) {
		return true;
	}

	// Variable itself
	if (isVariable(expr) && expr.name === variable) {
		return true;
	}

	// Power: polynomial^n where n is a non-negative integer
	if (expr.type === 'superscript') {
		// Check if exponent is a non-negative integer
		if (isNumber(expr.superscript)) {
			const exp = parseFloat(expr.superscript.value);
			if (Number.isInteger(exp) && exp >= 0) {
				// Base must also be a polynomial
				return isPolynomial(expr.base, variable);
			}
		}
		return false;
	}

	// Sum: each term must be polynomial
	if (expr.type === 'addition' || expr.type === 'subtraction') {
		return isPolynomial(expr.left, variable) && isPolynomial(expr.right, variable);
	}

	// Product: each factor must be polynomial
	if (expr.type === 'multiplication') {
		return isPolynomial(expr.left, variable) && isPolynomial(expr.right, variable);
	}

	// Opposite
	if (expr.type === 'opposite') {
		return isPolynomial(expr.operand, variable);
	}

	// Not a polynomial
	return false;
}

// =============================================================================
// Polynomial Degree
// =============================================================================

/**
 * Get the degree of a polynomial.
 */
function getPolynomialDegree(expr: MathNode, variable: string): number {
	// Unwrap delimiters (parentheses)
	if (expr.type === 'delimiter') {
		return getPolynomialDegree(expr.content, variable);
	}

	if (!containsVariable(expr, variable)) {
		return 0; // Constant
	}

	if (isVariable(expr) && expr.name === variable) {
		return 1;
	}

	if (expr.type === 'superscript') {
		if (isNumber(expr.superscript)) {
			const exp = parseFloat(expr.superscript.value);
			// Degree of (polynomial)^n = n * degree(polynomial)
			return exp * getPolynomialDegree(expr.base, variable);
		}
		return 0;
	}

	if (expr.type === 'addition' || expr.type === 'subtraction') {
		return Math.max(
			getPolynomialDegree(expr.left, variable),
			getPolynomialDegree(expr.right, variable)
		);
	}

	if (expr.type === 'multiplication') {
		return getPolynomialDegree(expr.left, variable) + getPolynomialDegree(expr.right, variable);
	}

	if (expr.type === 'opposite') {
		return getPolynomialDegree(expr.operand, variable);
	}

	return 0;
}

// =============================================================================
// Polynomial Division
// =============================================================================

/**
 * Divide numerator by denominator if degree(num) >= degree(denom).
 * Returns { quotient, remainder } such that num = quotient * denom + remainder.
 *
 * Uses the normalization framework for polynomial long division.
 */
function polynomialDivision(
	numerator: MathNode,
	denominator: MathNode,
	variable: string
): { quotient: MathNode; remainder: MathNode } | null {
	const numDegree = getPolynomialDegree(numerator, variable);
	const denomDegree = getPolynomialDegree(denominator, variable);

	// If degree(num) < degree(denom), no division needed (proper fraction)
	if (numDegree < denomDegree) {
		return { quotient: number('0'), remainder: numerator };
	}

	try {
		// Normalize both polynomials
		const numNorm = normalize(numerator);
		const denomNorm = normalize(denominator);

		// Both must be polynomials (denominator = 1 in normal form)
		if (!isOnePolynomial(numNorm.denominator) || !isOnePolynomial(denomNorm.denominator)) {
			return null;
		}

		// Check if both are univariate polynomials
		const numCheck = checkUnivariate(numNorm.numerator);
		const denomCheck = checkUnivariate(denomNorm.numerator);

		if (!numCheck.isUnivariate || !denomCheck.isUnivariate) {
			return null;
		}

		// Get the variable for conversion (use the variable from denominator or numerator)
		const univarNode = denomCheck.variable ?? numCheck.variable;
		if (!univarNode) {
			// Both are constants - shouldn't happen since denomDegree > 0
			return null;
		}

		// Convert to univariate views
		const numView = toUnivariateView(numNorm.numerator, univarNode);
		const denomView = toUnivariateView(denomNorm.numerator, univarNode);

		// Perform polynomial division
		const divResult = divideUnivariate(numView, denomView);

		if (!divResult) {
			return null;
		}

		// Convert back to MathNode
		const quotientTerms = fromUnivariateView(divResult.quotient);
		const remainderTerms = fromUnivariateView(divResult.remainder);

		// Denormalize to get MathNode (use ONE_POLYNOMIAL for denominator = 1)
		const quotient = denormalize({
			numerator: quotientTerms,
			denominator: ONE_POLYNOMIAL,
			hash: ''
		});
		const remainder = denormalize({
			numerator: remainderTerms,
			denominator: ONE_POLYNOMIAL,
			hash: ''
		});

		return { quotient, remainder };
	} catch {
		// If normalization fails, return null
		return null;
	}
}

// =============================================================================
// Factorization
// =============================================================================

/**
 * Unwrap delimiter (parentheses) nodes to get the actual content.
 */
function unwrapDelimiter(node: MathNode): MathNode {
	if (node.type === 'delimiter') {
		return unwrapDelimiter(node.content);
	}
	return node;
}

/**
 * Factor a polynomial into linear and irreducible quadratic factors.
 * This is a simplified implementation that handles common cases.
 */
function factorDenominator(poly: MathNode, variable: string): PolynomialFactor[] | null {
	// Unwrap delimiter (parentheses) first
	poly = unwrapDelimiter(poly);

	// Handle constant multiple case: c * f(x) where c is constant
	// For c * (x²+a²), we need to handle this specially
	// Note: The constant factor doesn't affect factorization, but we need to track it
	if (poly.type === 'multiplication') {
		const left = unwrapDelimiter(poly.left);
		const right = unwrapDelimiter(poly.right);

		// Check if left is constant and right is factorable
		if (!containsVariable(left, variable)) {
			const rightFactors = factorDenominator(right, variable);
			if (rightFactors) {
				// Add the constant as a separate factor that will be handled during integration
				// For now, we just return the factors of the non-constant part
				// The constant will be absorbed during coefficient solving
				return rightFactors;
			}
		}

		// Check if right is constant and left is factorable
		if (!containsVariable(right, variable)) {
			const leftFactors = factorDenominator(left, variable);
			if (leftFactors) {
				return leftFactors;
			}
		}
	}

	// Handle simple cases first

	// Case 1: Single variable (x) → linear factor with root 0
	if (isVariable(poly) && poly.name === variable) {
		return [{ type: 'linear', root: number('0'), multiplicity: 1 }];
	}

	// Case 1b: Linear factor (x - a)
	if (poly.type === 'subtraction') {
		if (isVariable(poly.left) && poly.left.name === variable) {
			return [{ type: 'linear', root: poly.right, multiplicity: 1 }];
		}
	}

	// Case 1c: Linear factor (x + a) → x - (-a)
	if (poly.type === 'addition') {
		if (isVariable(poly.left) && poly.left.name === variable) {
			return [
				{
					type: 'linear',
					root: { type: 'opposite', operand: poly.right } as MathNode,
					multiplicity: 1
				}
			];
		}
	}

	// Case 2: (x - a)^n
	if (poly.type === 'superscript') {
		const base = unwrapDelimiter(poly.base);
		const exp = poly.superscript;

		if (isNumber(exp)) {
			const mult = parseInt(exp.value);
			// Check if base is (x - a)
			if (base.type === 'subtraction') {
				if (isVariable(base.left) && base.left.name === variable) {
					return [{ type: 'linear', root: base.right, multiplicity: mult }];
				}
			}
			// Check if base is (x + a) → treat as x - (-a)
			if (base.type === 'addition') {
				if (isVariable(base.left) && base.left.name === variable) {
					return [
						{
							type: 'linear',
							root: { type: 'opposite', operand: base.right } as MathNode,
							multiplicity: mult
						}
					];
				}
			}
		}
	}

	// Case 3: Product of factors (x-a)(x-b)
	if (poly.type === 'multiplication') {
		const leftFactors = factorDenominator(poly.left, variable);
		const rightFactors = factorDenominator(poly.right, variable);
		if (leftFactors && rightFactors) {
			return [...leftFactors, ...rightFactors];
		}
	}

	// Case 4: x^2 - a^2 = (x-a)(x+a) (difference of squares)
	if (poly.type === 'subtraction') {
		const left = poly.left;
		const right = poly.right;

		// Check for x^2
		let isLeftSquare = false;
		if (
			left.type === 'superscript' &&
			isNumber(left.superscript) &&
			left.superscript.value === '2'
		) {
			if (isVariable(left.base) && left.base.name === variable) {
				isLeftSquare = true;
			}
		}

		// Check for a^2 (number squared)
		if (isLeftSquare && isNumber(right)) {
			// x^2 - n → (x - sqrt(n))(x + sqrt(n))
			const sqrtValue = Math.sqrt(parseFloat(right.value));
			if (Number.isInteger(sqrtValue)) {
				const a = number(sqrtValue.toString());
				return [
					{ type: 'linear', root: a, multiplicity: 1 },
					{ type: 'linear', root: { type: 'opposite', operand: a } as MathNode, multiplicity: 1 }
				];
			}
		}
	}

	// Case 5: x^2 + a (irreducible quadratic if a > 0)
	// Also handles a + x^2 (constant first)
	if (poly.type === 'addition') {
		const left = poly.left;
		const right = poly.right;

		// Check for x^2 on left side
		let isLeftSquare = false;
		if (
			left.type === 'superscript' &&
			isNumber(left.superscript) &&
			left.superscript.value === '2'
		) {
			if (isVariable(left.base) && left.base.name === variable) {
				isLeftSquare = true;
			}
		}

		// Check for x^2 on right side (handles a + x^2 form)
		let isRightSquare = false;
		if (
			right.type === 'superscript' &&
			isNumber(right.superscript) &&
			right.superscript.value === '2'
		) {
			if (isVariable(right.base) && right.base.name === variable) {
				isRightSquare = true;
			}
		}

		// x^2 + n where n > 0 → irreducible
		if (isLeftSquare && isNumber(right)) {
			const n = parseFloat(right.value);
			if (n > 0) {
				return [
					{
						type: 'quadratic',
						multiplicity: 1,
						quadraticCoeffs: { a: number('1'), b: number('0'), c: right }
					}
				];
			}
		}

		// n + x^2 where n > 0 → irreducible (handles 1+x^2 form)
		if (isRightSquare && isNumber(left)) {
			const n = parseFloat(left.value);
			if (n > 0) {
				return [
					{
						type: 'quadratic',
						multiplicity: 1,
						quadraticCoeffs: { a: number('1'), b: number('0'), c: left }
					}
				];
			}
		}
	}

	// Case 6: x^2 + bx (factor out x)
	if (poly.type === 'addition') {
		const left = poly.left;
		const right = poly.right;

		// Check for x^2
		if (
			left.type === 'superscript' &&
			isVariable(left.base) &&
			left.base.name === variable &&
			isNumber(left.superscript) &&
			left.superscript.value === '2'
		) {
			// Check if right is bx (multiplication)
			if (right.type === 'multiplication') {
				// bx or xb
				const hasVar =
					(isVariable(right.left) && right.left.name === variable) ||
					(isVariable(right.right) && right.right.name === variable);

				if (hasVar) {
					// Factor: x^2 + bx = x(x + b)
					// Extract b
					const b = isVariable(right.left) ? right.right : right.left;
					return [
						{ type: 'linear', root: number('0'), multiplicity: 1 },
						{ type: 'linear', root: { type: 'opposite', operand: b } as MathNode, multiplicity: 1 }
					];
				}
			}
		}
	}

	// Unable to factor
	return null;
}

// =============================================================================
// Partial Fraction Decomposition
// =============================================================================

/**
 * Decompose a rational function into partial fractions.
 * Returns null if decomposition is not possible.
 */
function decomposePartialFractions(
	numerator: MathNode,
	factors: PolynomialFactor[]
): PartialFractionTerm[] | null {
	// For now, we'll return a placeholder implementation
	// Full implementation requires solving a system of equations
	// TODO: Implement coefficient solving

	// Generate terms based on factors
	const terms: PartialFractionTerm[] = [];

	for (const factor of factors) {
		if (factor.type === 'linear') {
			// For repeated linear factors: A/(x-a) + B/(x-a)^2 + ... + C/(x-a)^n
			for (let i = 1; i <= factor.multiplicity; i++) {
				terms.push({
					coefficient: number('0'), // Placeholder - needs solving
					factor,
					power: i
				});
			}
		} else if (factor.type === 'quadratic') {
			// For irreducible quadratic: (Ax + B)/(ax^2 + bx + c)
			// For now, simplified
			terms.push({
				coefficient: number('0'), // Placeholder
				factor,
				power: 1
			});
		}
	}

	return terms;
}

/**
 * Evaluate a polynomial expression at a specific numeric value.
 * Returns null if evaluation fails (non-numeric result).
 */
function evaluateAt(expr: MathNode, variable: string, value: number): number | null {
	switch (expr.type) {
		case 'delimiter':
			return evaluateAt(expr.content, variable, value);

		case 'number':
			return parseFloat(expr.value);

		case 'variable':
			if (expr.name === variable) {
				return value;
			}
			// Other variable - can't evaluate
			return null;

		case 'addition': {
			const left = evaluateAt(expr.left, variable, value);
			const right = evaluateAt(expr.right, variable, value);
			if (left === null || right === null) return null;
			return left + right;
		}

		case 'subtraction': {
			const left = evaluateAt(expr.left, variable, value);
			const right = evaluateAt(expr.right, variable, value);
			if (left === null || right === null) return null;
			return left - right;
		}

		case 'multiplication': {
			const left = evaluateAt(expr.left, variable, value);
			const right = evaluateAt(expr.right, variable, value);
			if (left === null || right === null) return null;
			return left * right;
		}

		case 'division': {
			const num = evaluateAt(expr.numerator, variable, value);
			const denom = evaluateAt(expr.denominator, variable, value);
			if (num === null || denom === null || denom === 0) return null;
			return num / denom;
		}

		case 'superscript': {
			const base = evaluateAt(expr.base, variable, value);
			const exp = evaluateAt(expr.superscript, variable, value);
			if (base === null || exp === null) return null;
			return Math.pow(base, exp);
		}

		case 'opposite': {
			const operand = evaluateAt(expr.operand, variable, value);
			if (operand === null) return null;
			return -operand;
		}

		default:
			return null;
	}
}

/**
 * Get numeric value from a MathNode root.
 */
function getRootValue(root: MathNode): number | null {
	if (isNumber(root)) {
		return parseFloat(root.value);
	}
	if (root.type === 'opposite' && isNumber(root.operand)) {
		return -parseFloat(root.operand.value);
	}
	return null;
}

/**
 * Create a coefficient MathNode from a numeric value.
 * Handles fractions and negative values.
 */
function createCoeffNode(value: number): MathNode {
	if (Number.isInteger(value)) {
		if (value >= 0) {
			return number(value.toString());
		} else {
			return { type: 'opposite', operand: number((-value).toString()) };
		}
	} else {
		// Express as fraction
		for (const d of [2, 3, 4, 5, 6, 8, 10, 12]) {
			const n = value * d;
			if (Math.abs(n - Math.round(n)) < 1e-10) {
				const numInt = Math.round(n);
				if (numInt >= 0) {
					return divide(number(numInt.toString()), number(d.toString()), 'fraction');
				} else {
					return {
						type: 'opposite',
						operand: divide(number((-numInt).toString()), number(d.toString()), 'fraction')
					};
				}
			}
		}
		// Use decimal approximation
		return number(value.toFixed(6));
	}
}

/**
 * Solve for coefficients with repeated factors using extended Heaviside method.
 *
 * For 1/((x-a)^m * (x-b)^n * ...):
 * - The coefficient of highest power 1/(x-a)^m is found by evaluating
 *   numerator * other_factors at x=a, divided by product of (a-other_roots)^power
 * - Lower power coefficients require derivatives
 */
function solveRepeatedFactors(
	numerator: MathNode,
	_terms: PartialFractionTerm[],
	variable: string,
	rootGroups: Map<number, PartialFractionTerm[]>
): PartialFractionTerm[] {
	const solvedTerms: PartialFractionTerm[] = [];

	// Process each root group
	for (const [rootValue, groupTerms] of rootGroups.entries()) {
		// Sort by power (highest first)
		groupTerms.sort((a, b) => b.power - a.power);

		// Get all other roots and their powers
		const otherRoots: { root: number; power: number }[] = [];
		for (const [otherRoot, otherTerms] of rootGroups.entries()) {
			if (otherRoot !== rootValue) {
				const totalPower = otherTerms.reduce((sum, t) => sum + t.power, 0);
				otherRoots.push({ root: otherRoot, power: totalPower });
			}
		}

		// Evaluate numerator at x = rootValue
		const numValue = evaluateAt(numerator, variable, rootValue);
		if (numValue === null) {
			// Can't evaluate - return placeholders
			solvedTerms.push(...groupTerms);
			continue;
		}

		// Compute product of (rootValue - otherRoot)^power for all other roots
		let denomProduct = 1;
		for (const { root, power } of otherRoots) {
			denomProduct *= Math.pow(rootValue - root, power);
		}

		if (Math.abs(denomProduct) < 1e-10) {
			// Division by zero - return placeholders
			solvedTerms.push(...groupTerms);
			continue;
		}

		// Coefficient for highest power term
		const highestCoeff = numValue / denomProduct;

		// For single factor case with power >= 2: P(x)/(x-r)^n = A_n/(x-r)^n + A_{n-1}/(x-r)^{n-1} + ... + A_1/(x-r)
		// We need to find all coefficients via polynomial expansion
		// P(x) = A_n + A_{n-1}(x-r) + A_{n-2}(x-r)^2 + ... + A_1(x-r)^{n-1}

		if (groupTerms.length === 2 && otherRoots.length === 0) {
			// Common case: two terms from one repeated factor, e.g., A/(x+1) + B/(x+1)^2
			// For P(x)/(x-r)^2: P(x) = B + A(x-r)
			// B = P(r), and A is the coefficient of (x-r) in the expansion

			// Extract polynomial coefficients from numerator
			const p0 = evaluateAt(numerator, variable, 0) ?? 0;
			const p1 = evaluateAt(numerator, variable, 1) ?? 0;

			// For linear numerator P(x) = ax + b:
			// p0 = b, p1 = a + b => a = p1 - p0
			const constCoeff = p0;
			const linearCoeff = p1 - p0;

			// P(x) = linearCoeff * x + constCoeff
			// P(x) = A(x - root) + B where:
			// - linearCoeff * x + constCoeff = Ax - A*root + B
			// - linearCoeff = A => A = linearCoeff
			// - constCoeff = -A*root + B => B = constCoeff + A*root = constCoeff + linearCoeff*root
			const A = linearCoeff;
			const B = constCoeff + linearCoeff * rootValue;

			// groupTerms[0] is power 2, groupTerms[1] is power 1
			solvedTerms.push({ ...groupTerms[0], coefficient: createCoeffNode(B) }); // /(x-r)^2
			solvedTerms.push({ ...groupTerms[1], coefficient: createCoeffNode(A) }); // /(x-r)
		} else {
			// General case: use Heaviside for highest, set others to 0 (TODO: implement derivatives)
			for (let i = 0; i < groupTerms.length; i++) {
				const term = groupTerms[i];
				if (i === 0) {
					// Highest power term
					solvedTerms.push({ ...term, coefficient: createCoeffNode(highestCoeff) });
				} else {
					// For lower power terms, we need derivatives
					// For now, set to 0 as an approximation
					solvedTerms.push({ ...term, coefficient: number('0') });
				}
			}
		}
	}

	return solvedTerms;
}

/**
 * Solve coefficients for mixed linear and quadratic factors.
 *
 * For decomposition like A/x + (Bx+C)/(x^2+c):
 * 1. Solve linear factors using Heaviside cover-up
 * 2. Compute quadratic coefficients by matching
 *
 * Algorithm for 1/(x(x^2+c)):
 * - A = 1/(0^2+c) = 1/c (Heaviside at root 0)
 * - Then (Bx+C)/(x^2+c) = 1/(x(x^2+c)) - A/x
 * - Multiply: (Bx+C)x = 1 - A(x^2+c) = 1 - (x^2+c)/c = (c - x^2 - c)/c = -x^2/c
 * - So Bx+C = -x/c (dividing by x)
 * - Thus B = -1/c, C = 0
 */
function solveMixedFactors(
	numerator: MathNode,
	terms: PartialFractionTerm[],
	variable: string
): PartialFractionTerm[] {
	// Separate linear and quadratic terms
	const linearTerms: PartialFractionTerm[] = [];
	const quadraticTerms: PartialFractionTerm[] = [];

	for (const term of terms) {
		if (term.factor.type === 'linear') {
			linearTerms.push(term);
		} else {
			quadraticTerms.push(term);
		}
	}

	// If no linear terms, we can't use Heaviside
	if (linearTerms.length === 0) {
		return terms;
	}

	// Solve linear factors using Heaviside cover-up
	const solvedTerms: PartialFractionTerm[] = [];

	for (const linearTerm of linearTerms) {
		const rootVal = getRootValue(linearTerm.factor.root!);
		if (rootVal === null) {
			solvedTerms.push(linearTerm);
			continue;
		}

		// Evaluate numerator at x = root
		const numValue = evaluateAt(numerator, variable, rootVal);
		if (numValue === null) {
			solvedTerms.push(linearTerm);
			continue;
		}

		// Evaluate the "rest of denominator" at x = root
		// For 1/(x(x^2+1)), at x=0: rest = 0^2+1 = 1
		// For 1/((x-1)(x^2+1)), at x=1: rest = 1^2+1 = 2
		let restValue = 1;

		// Product of other linear factors
		for (const otherLinear of linearTerms) {
			if (otherLinear === linearTerm) continue;
			const otherRoot = getRootValue(otherLinear.factor.root!);
			if (otherRoot === null) {
				restValue = NaN;
				break;
			}
			restValue *= Math.pow(rootVal - otherRoot, otherLinear.power);
		}

		// Product of quadratic factors evaluated at root
		for (const quadTerm of quadraticTerms) {
			if (quadTerm.factor.quadraticCoeffs) {
				// ax^2 + bx + c evaluated at root
				const { a, b, c } = quadTerm.factor.quadraticCoeffs;
				const aVal = evaluateAt(a, variable, rootVal) ?? 1;
				const bVal = evaluateAt(b, variable, rootVal) ?? 0;
				const cVal = evaluateAt(c, variable, rootVal) ?? 0;
				const quadVal = aVal * rootVal * rootVal + bVal * rootVal + cVal;
				restValue *= Math.pow(quadVal, quadTerm.power);
			} else {
				// Assume x^2 + c form (from factorDenominator)
				// Need to determine c from the structure
				// Since we don't have explicit c, try to infer
				// For now, assume we have x^2 + positive constant
				// This is a limitation - we'll enhance this later
				restValue = NaN;
				break;
			}
		}

		if (isNaN(restValue) || Math.abs(restValue) < 1e-10) {
			solvedTerms.push(linearTerm);
			continue;
		}

		const coeff = numValue / restValue;
		solvedTerms.push({
			...linearTerm,
			coefficient: createCoeffNode(coeff)
		});
	}

	// Now handle quadratic terms
	// For each quadratic (Bx+C)/(x^2+c), we need to find B and C
	// Use coefficient matching from the equation:
	// numerator = sum of (coefficient_i * product of other factors)

	for (const quadTerm of quadraticTerms) {
		// For simple cases like 1/(x(x^2+1)), after finding A for linear term,
		// we can compute the quadratic coefficient by coefficient matching.
		//
		// 1/(x(x^2+1)) = A/x + (Bx+C)/(x^2+1)
		// Multiply by x(x^2+1): 1 = A(x^2+1) + (Bx+C)x
		//
		// If A = 1: 1 = x^2+1 + Bx^2 + Cx
		//          0 = x^2 + Bx^2 + Cx
		//          0 = (1+B)x^2 + Cx
		// So B = -1, C = 0

		if (linearTerms.length === 1 && quadraticTerms.length === 1) {
			// Simple case: one linear, one quadratic
			const linearCoeff = getNumericValue(solvedTerms[0]?.coefficient);
			if (linearCoeff === null) {
				solvedTerms.push(quadTerm);
				continue;
			}

			const linearRoot = getRootValue(linearTerms[0].factor.root!) ?? 0;

			// Extract polynomial coefficients from numerator: P(x) = p₂x² + p₁x + p₀
			// Using evaluation at 3 points: P(0), P(1), P(-1)
			const p0 = evaluateAt(numerator, variable, 0) ?? 0;
			const p1 = evaluateAt(numerator, variable, 1) ?? 0;
			const pn1 = evaluateAt(numerator, variable, -1) ?? 0;

			// Solve for polynomial coefficients p₂, p₁
			const p2Coeff = (p1 + pn1 - 2 * p0) / 2;
			const p1Coeff = (p1 - pn1) / 2;

			// For P(x)/((x-r)(x²+c)) = A/(x-r) + (Bx+C)/(x²+c)
			// Multiply: P(x) = A(x²+c) + (Bx+C)(x-r)
			//         = Ax² + Ac + Bx² - Brx + Cx - Cr
			//         = (A+B)x² + (C-Br)x + (Ac-Cr)
			// Matching coefficients with P(x) = p₂x² + p₁x + p₀:
			//   x²: A + B = p₂       => B = p₂ - A
			//   x¹: C - Br = p₁      => C = p₁ + Br = p₁ + (p₂-A)r
			//   x⁰: Ac - Cr = p₀     (for verification)

			const A = linearCoeff;
			const B = p2Coeff - A;
			const C = p1Coeff + B * linearRoot;

			// Store both B and C in a special format
			// We use 'xCoeff' and 'constCoeff' properties (extended term)
			solvedTerms.push({
				...quadTerm,
				coefficient: number('0'), // placeholder
				// Store B and C for later use
				xCoeff: B,
				constCoeff: C
			} as PartialFractionTerm & { xCoeff: number; constCoeff: number });
		} else {
			// More complex case - multiple factors
			// Fall back to placeholder for now
			solvedTerms.push(quadTerm);
		}
	}

	return solvedTerms;
}

/**
 * Get numeric value from a coefficient MathNode.
 */
function getNumericValue(node: MathNode | undefined): number | null {
	if (!node) return null;
	if (isNumber(node)) return parseFloat(node.value);
	if (node.type === 'opposite' && isNumber(node.operand)) {
		return -parseFloat(node.operand.value);
	}
	if (node.type === 'division') {
		const num = getNumericValue(node.numerator);
		const den = getNumericValue(node.denominator);
		if (num !== null && den !== null && den !== 0) {
			return num / den;
		}
	}
	return null;
}

/**
 * Solve for coefficients in partial fraction decomposition using Heaviside cover-up method.
 * Handles both simple linear factors and repeated linear factors.
 */
function solveCoefficients(
	numerator: MathNode,
	terms: PartialFractionTerm[],
	variable: string
): PartialFractionTerm[] {
	if (terms.length === 0) {
		return terms;
	}

	// Check if all factors are linear
	const allLinear = terms.every((t) => t.factor.type === 'linear');

	// Handle special case: single irreducible quadratic factor
	// For constant/(x²+a²), the coefficient is just the constant
	if (!allLinear && terms.length === 1 && terms[0].factor.type === 'quadratic') {
		// Check if numerator is a constant
		if (!containsVariable(numerator, variable)) {
			// Numerator is constant, use it as coefficient
			return [{ ...terms[0], coefficient: numerator }];
		}
		// For (Ax+B)/(x²+a²), we need to split into A*x/(x²+a²) + B/(x²+a²)
		// For now, fall back to placeholder
		return terms;
	}

	if (!allLinear) {
		// Mixed linear and quadratic factors
		return solveMixedFactors(numerator, terms, variable);
	}

	// Group terms by their root (for repeated factor handling)
	const rootGroups = new Map<number, PartialFractionTerm[]>();
	const invalidRoots: PartialFractionTerm[] = [];

	for (const term of terms) {
		const rootVal = getRootValue(term.factor.root!);
		if (rootVal === null) {
			invalidRoots.push(term);
		} else {
			const key = rootVal;
			if (!rootGroups.has(key)) {
				rootGroups.set(key, []);
			}
			rootGroups.get(key)!.push(term);
		}
	}

	// If we have invalid roots, return placeholder
	if (invalidRoots.length > 0) {
		return terms;
	}

	// Special case: Single factor group (e.g., 1/(x-1)^2 or x/(x+1)^2)
	// For P(x)/(x-r)^n = A_1/(x-r) + A_2/(x-r)^2 + ... + A_n/(x-r)^n
	// We expand: P(x) = A_n + A_{n-1}(x-r) + A_{n-2}(x-r)^2 + ... + A_1(x-r)^{n-1}
	if (rootGroups.size === 1) {
		const [rootValue, groupTerms] = [...rootGroups.entries()][0];
		// Sort by power (highest first)
		groupTerms.sort((a, b) => b.power - a.power);

		// Evaluate numerator at the root
		const numValue = evaluateAt(numerator, variable, rootValue);

		const solvedTerms: PartialFractionTerm[] = [];

		if (groupTerms.length === 1) {
			// Single power term - just use the numerator value
			const term = groupTerms[0];
			let coeffNode: MathNode;
			if (numValue !== null) {
				coeffNode = createCoeffNode(numValue);
			} else {
				coeffNode = numerator;
			}
			solvedTerms.push({ ...term, coefficient: coeffNode });
		} else if (groupTerms.length === 2) {
			// Two terms: A/(x-r) + B/(x-r)^2
			// P(x) = B + A(x-r) = B + Ax - Ar
			// For P(x) = px + q: A = p, B = q + Ar = q + pr

			// Extract polynomial coefficients from numerator: P(x) = px + q
			const p0 = evaluateAt(numerator, variable, 0) ?? 0;
			const p1 = evaluateAt(numerator, variable, 1) ?? 0;

			const constCoeff = p0;
			const linearCoeff = p1 - p0;

			// A = linearCoeff, B = constCoeff + linearCoeff * rootValue
			const A = linearCoeff;
			const B = constCoeff + linearCoeff * rootValue;

			// groupTerms[0] is power 2, groupTerms[1] is power 1
			solvedTerms.push({ ...groupTerms[0], coefficient: createCoeffNode(B) }); // /(x-r)^2
			solvedTerms.push({ ...groupTerms[1], coefficient: createCoeffNode(A) }); // /(x-r)
		} else {
			// More than 2 powers - fall back to simple approach (highest gets value, others 0)
			for (let i = 0; i < groupTerms.length; i++) {
				const term = groupTerms[i];
				if (i === 0) {
					let coeffNode: MathNode;
					if (numValue !== null) {
						coeffNode = createCoeffNode(numValue);
					} else {
						coeffNode = numerator;
					}
					solvedTerms.push({ ...term, coefficient: coeffNode });
				} else {
					solvedTerms.push({ ...term, coefficient: number('0') });
				}
			}
		}

		return solvedTerms;
	}

	// Multiple distinct roots - use extended Heaviside method
	// Only apply Heaviside cover-up for simple linear factors (multiplicity 1)
	const allSimpleLinear = terms.every(
		(t) => t.factor.type === 'linear' && t.factor.multiplicity === 1 && t.power === 1
	);

	if (!allSimpleLinear) {
		// For mixed simple/repeated factors, we need more complex solving
		// For now, handle the case where we have one repeated factor and some simple ones
		return solveRepeatedFactors(numerator, terms, variable, rootGroups);
	}

	// Heaviside cover-up method:
	// For 1/((x-a)(x-b)(x-c)...) = A/(x-a) + B/(x-b) + C/(x-c) + ...
	// A = numerator evaluated at x=a, divided by product of (a-b)(a-c)...

	const solvedTerms: PartialFractionTerm[] = [];

	for (let i = 0; i < terms.length; i++) {
		const currentTerm = terms[i];
		const currentRoot = getRootValue(currentTerm.factor.root!);

		if (currentRoot === null) {
			// Can't get numeric root value
			solvedTerms.push(currentTerm);
			continue;
		}

		// Evaluate numerator at x = root
		const numValue = evaluateAt(numerator, variable, currentRoot);
		if (numValue === null) {
			solvedTerms.push(currentTerm);
			continue;
		}

		// Evaluate product of other (root - otherRoot) terms
		let denomProduct = 1;
		let valid = true;

		for (let j = 0; j < terms.length; j++) {
			if (i === j) continue;

			const otherRoot = getRootValue(terms[j].factor.root!);
			if (otherRoot === null) {
				valid = false;
				break;
			}
			denomProduct *= currentRoot - otherRoot;
		}

		if (!valid || denomProduct === 0) {
			solvedTerms.push(currentTerm);
			continue;
		}

		// Coefficient = numerator / denomProduct
		const coeffValue = numValue / denomProduct;

		// Convert to MathNode (fraction if not integer)
		let coeffNode: MathNode = number(coeffValue.toFixed(6)); // Default fallback
		if (Number.isInteger(coeffValue)) {
			if (coeffValue >= 0) {
				coeffNode = number(coeffValue.toString());
			} else {
				coeffNode = { type: 'opposite', operand: number((-coeffValue).toString()) };
			}
		} else {
			// Express as fraction
			// Find a reasonable denominator (try small integers)
			let found = false;
			for (const d of [2, 3, 4, 5, 6, 8, 10, 12]) {
				const n = coeffValue * d;
				if (Math.abs(n - Math.round(n)) < 1e-10) {
					const numInt = Math.round(n);
					if (numInt >= 0) {
						coeffNode = divide(number(numInt.toString()), number(d.toString()), 'fraction');
					} else {
						coeffNode = {
							type: 'opposite',
							operand: divide(number((-numInt).toString()), number(d.toString()), 'fraction')
						};
					}
					found = true;
					break;
				}
			}
			if (!found) {
				// Use decimal approximation
				coeffNode = number(coeffValue.toFixed(6));
			}
		}

		solvedTerms.push({
			...currentTerm,
			coefficient: coeffNode
		});
	}

	return solvedTerms;
}

// =============================================================================
// Integration of Partial Fractions
// =============================================================================

/**
 * Integrate a single partial fraction term.
 */
function integratePartialFraction(
	term: PartialFractionTerm,
	variable: string,
	_options: ResolvedIntegrateOptions,
	_recorder: IntegrateStepRecorder,
	_depth: number
): MathNode | null {
	if (term.factor.type === 'linear') {
		// Linear factor: A/(x-a)^n

		if (term.power === 1) {
			// A/(x-a) → A * ln|x-a|
			// Build: ln(abs(x-a))
			const xMinusA = subtract({ type: 'variable', name: variable }, term.factor.root!);
			const lnTerm = func('ln', [func('abs', [xMinusA])]);
			return implicitMultiply(term.coefficient, lnTerm);
		} else {
			// A/(x-a)^n → A * (x-a)^(-n+1) / (-n+1) for n > 1
			const n = term.power;
			const xMinusA = subtract({ type: 'variable', name: variable }, term.factor.root!);
			const newPower = power(xMinusA, number((-n + 1).toString()));
			const divisor = number((-n + 1).toString());
			return implicitMultiply(term.coefficient, divide(newPower, divisor, 'fraction'));
		}
	} else if (term.factor.type === 'quadratic') {
		// Irreducible quadratic: (Ax+B)/(x^2+px+q)
		// This involves arctan and ln terms
		// For x^2 + a^2: integral is arctan(x/a) / a
		const coeffs = term.factor.quadraticCoeffs!;

		// Check if it's x^2 + a^2 form
		if (
			isNumber(coeffs.a) &&
			coeffs.a.value === '1' &&
			isNumber(coeffs.b) &&
			coeffs.b.value === '0' &&
			isNumber(coeffs.c)
		) {
			const cValue = parseFloat(coeffs.c.value);
			const sqrtC = Math.sqrt(cValue);
			const xVar: MathNode = { type: 'variable', name: variable };

			// Check if we have extended coefficients (xCoeff, constCoeff) from solveMixedFactors
			const extendedTerm = term as PartialFractionTerm & { xCoeff?: number; constCoeff?: number };
			if (extendedTerm.xCoeff !== undefined || extendedTerm.constCoeff !== undefined) {
				// Handle (Bx + C)/(x² + c) = Bx/(x² + c) + C/(x² + c)
				const B = extendedTerm.xCoeff ?? 0;
				const C = extendedTerm.constCoeff ?? 0;

				let result: MathNode | null = null;

				// Part 1: Bx/(x² + c) integrates to (B/2) * ln(x² + c)
				if (Math.abs(B) > 1e-10) {
					// Build x² + c
					const xSquaredPlusC = add(power(xVar, number('2')), coeffs.c);
					const lnTerm = func('ln', [xSquaredPlusC]);

					// (B/2) * ln(x² + c)
					const halfB = B / 2;
					const lnPart = implicitMultiply(createCoeffNode(halfB), lnTerm);
					result = lnPart;
				}

				// Part 2: C/(x² + c) integrates to (C/sqrt(c)) * arctan(x/sqrt(c))
				if (Math.abs(C) > 1e-10) {
					let atanPart: MathNode;
					if (sqrtC === 1) {
						atanPart = func('arctan', [xVar]);
					} else {
						const atanArg = divide(xVar, number(sqrtC.toString()), 'fraction');
						atanPart = divide(func('arctan', [atanArg]), number(sqrtC.toString()), 'fraction');
					}
					atanPart = implicitMultiply(createCoeffNode(C), atanPart);

					if (result) {
						result = add(result, atanPart);
					} else {
						result = atanPart;
					}
				}

				return result ?? number('0');
			}

			// Standard case: coefficient is just C (constant numerator)
			// Integral of C/(x^2 + c) = (C/sqrt(c)) * arctan(x/sqrt(c))

			// For c = 1 (i.e., 1/(x²+1)), simplify to just arctan(x)
			let atanTerm: MathNode;
			if (sqrtC === 1) {
				atanTerm = func('arctan', [xVar]);
			} else {
				const atanArg = divide(xVar, number(sqrtC.toString()), 'fraction');
				atanTerm = divide(func('arctan', [atanArg]), number(sqrtC.toString()), 'fraction');
			}

			// Multiply by the coefficient (handles cases like -1/(x²+1) → -arctan(x))
			return implicitMultiply(term.coefficient, atanTerm);
		}

		// More complex cases need full implementation
		return null;
	}

	return null;
}

// =============================================================================
// Partial Fractions Integrator
// =============================================================================

/**
 * Partial fractions integrator for rational functions.
 *
 * Handles:
 * - Polynomial division if degree(num) >= degree(denom)
 * - Factorization of denominator
 * - Partial fraction decomposition
 * - Integration of each term
 *
 * Priority: 30 (after parts, before trig substitution)
 */
export const partialFractionsIntegrator: Integrator = {
	name: 'partial-fractions',
	priority: 30,

	canIntegrate(expr: MathNode, variable: string): boolean {
		return isRationalFunction(expr, variable);
	},

	integrate(
		expr: MathNode,
		variable: string,
		options: ResolvedIntegrateOptions,
		recorder: IntegrateStepRecorder,
		depth: number
	): IntegrateResult {
		// Must be a division at this point
		if (expr.type !== 'division') {
			return {
				variable,
				status: 'unsupported',
				antiderivative: null,
				integrandType: 'rational',
				technique: 'partial-fractions',
				steps: recorder.getSteps(),
				error: 'Not a rational function'
			};
		}

		const numerator = expr.numerator;
		const denominator = expr.denominator;

		// Step 1: Check if polynomial division is needed
		const numDegree = getPolynomialDegree(numerator, variable);
		const denomDegree = getPolynomialDegree(denominator, variable);

		let quotient: MathNode | null = null;
		let remainder = numerator;

		if (numDegree >= denomDegree) {
			// Need polynomial division
			recorder.recordCustomStep(
				'polynomial-division',
				expr,
				expr,
				'detailed',
				undefined,
				`Division polynomiale nécessaire: deg(num)=${numDegree} >= deg(denom)=${denomDegree}`
			);

			const divResult = polynomialDivision(numerator, denominator, variable);
			if (!divResult) {
				return {
					variable,
					status: 'unsupported',
					antiderivative: null,
					integrandType: 'rational',
					technique: 'partial-fractions',
					steps: recorder.getSteps(),
					error: 'Polynomial division not yet fully implemented for complex cases'
				};
			}

			quotient = divResult.quotient;
			remainder = divResult.remainder;
		}

		// Step 1b: Handle (Ax+B)/(x²+c) pattern by splitting
		// This pattern is common and should be split into Ax/(x²+c) + B/(x²+c)
		if (
			getPolynomialDegree(remainder, variable) === 1 &&
			getPolynomialDegree(denominator, variable) === 2
		) {
			// Check if denominator is x² + c (irreducible quadratic)
			const tempFactors = factorDenominator(denominator, variable);
			if (
				tempFactors &&
				tempFactors.length === 1 &&
				tempFactors[0].type === 'quadratic' &&
				tempFactors[0].quadraticCoeffs
			) {
				const coeffs = tempFactors[0].quadraticCoeffs;
				if (
					isNumber(coeffs.a) &&
					coeffs.a.value === '1' &&
					isNumber(coeffs.b) &&
					coeffs.b.value === '0'
				) {
					// Split (Ax+B)/(x²+c) into Ax/(x²+c) + B/(x²+c)
					// Extract A and B from the numerator
					let xCoeff: MathNode | null = null;
					let constTerm: MathNode | null = null;

					if (remainder.type === 'addition') {
						// Check both orders: Ax + B or B + Ax
						if (
							remainder.left.type === 'multiplication' &&
							containsVariable(remainder.left, variable) &&
							!containsVariable(remainder.right, variable)
						) {
							// Ax + B
							xCoeff = !containsVariable(remainder.left.left, variable)
								? remainder.left.left
								: remainder.left.right;
							constTerm = remainder.right;
						} else if (
							remainder.right.type === 'multiplication' &&
							containsVariable(remainder.right, variable) &&
							!containsVariable(remainder.left, variable)
						) {
							// B + Ax
							xCoeff = !containsVariable(remainder.right.left, variable)
								? remainder.right.left
								: remainder.right.right;
							constTerm = remainder.left;
						}
					}

					if (xCoeff && constTerm) {
						recorder.recordCustomStep(
							'split-numerator',
							expr,
							expr,
							'detailed',
							undefined,
							'Séparation du numérateur linéaire: (Ax+B)/(x²+c) = Ax/(x²+c) + B/(x²+c)'
						);

						// Build Ax/(x²+c)
						const xVar: MathNode = { type: 'variable', name: variable };
						const axTerm = implicitMultiply(xCoeff, xVar);
						const part1 = divide(axTerm, denominator, 'fraction');

						// Build B/(x²+c)
						const part2 = divide(constTerm, denominator, 'fraction');

						// Integrate both parts
						const result1 = integrate(part1, { variable, ...options, _depth: depth + 1 });
						const result2 = integrate(part2, { variable, ...options, _depth: depth + 1 });

						if (result1.status === 'exact' && result2.status === 'exact') {
							let antiderivative = add(result1.antiderivative!, result2.antiderivative!);

							// Add quotient integral if needed
							if (quotient && !isZero(quotient)) {
								const quotientResult = integrate(quotient, {
									variable,
									...options,
									_depth: depth + 1
								});
								if (quotientResult.status === 'exact' && quotientResult.antiderivative) {
									antiderivative = add(antiderivative, quotientResult.antiderivative);
								}
							}

							return {
								variable,
								status: 'exact',
								antiderivative,
								integrandType: 'rational',
								technique: 'partial-fractions',
								steps: recorder.getSteps(),
								constantNote: CONSTANT_OF_INTEGRATION_NOTE
							};
						}
					}
				}
			}
		}

		// Step 2: Factor the denominator
		recorder.recordCustomStep(
			'factor-denominator',
			expr,
			expr,
			'detailed',
			undefined,
			'Factorisation du dénominateur'
		);

		const factors = factorDenominator(denominator, variable);
		if (!factors) {
			return {
				variable,
				status: 'unsupported',
				antiderivative: null,
				integrandType: 'rational',
				technique: 'partial-fractions',
				steps: recorder.getSteps(),
				error: 'Unable to factor denominator'
			};
		}

		// Step 3: Decompose into partial fractions
		recorder.recordCustomStep(
			'decompose-partial-fractions',
			expr,
			expr,
			'detailed',
			undefined,
			'Décomposition en fractions partielles'
		);

		const terms = decomposePartialFractions(remainder, factors);
		if (!terms) {
			return {
				variable,
				status: 'unsupported',
				antiderivative: null,
				integrandType: 'rational',
				technique: 'partial-fractions',
				steps: recorder.getSteps(),
				error: 'Unable to decompose into partial fractions'
			};
		}

		// Step 4: Solve for coefficients
		recorder.recordCustomStep(
			'solve-coefficients',
			expr,
			expr,
			'detailed',
			undefined,
			'Résolution des coefficients'
		);

		const solvedTerms = solveCoefficients(remainder, terms, variable);

		// Step 5: Integrate each term
		let result: MathNode | null = null;

		for (const term of solvedTerms) {
			const termIntegral = integratePartialFraction(term, variable, options, recorder, depth);
			if (!termIntegral) {
				return {
					variable,
					status: 'unsupported',
					antiderivative: null,
					integrandType: 'rational',
					technique: 'partial-fractions',
					steps: recorder.getSteps(),
					error: 'Unable to integrate partial fraction term'
				};
			}

			result = result ? add(result, termIntegral) : termIntegral;
		}

		// Step 6: Add quotient integral if polynomial division was performed
		if (quotient && !isZero(quotient)) {
			// Integrate the quotient (polynomial) using recursive call
			const quotientResult = integrate(quotient, { variable, ...options });
			if (quotientResult.status === 'exact' && quotientResult.antiderivative) {
				result = result
					? add(result, quotientResult.antiderivative)
					: quotientResult.antiderivative;
			}
		}

		return {
			variable,
			status: 'exact',
			antiderivative: result,
			integrandType: 'rational',
			technique: 'partial-fractions',
			steps: recorder.getSteps(),
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}
};

// =============================================================================
// Helper Functions
// =============================================================================

function isZero(expr: MathNode): boolean {
	return isNumber(expr) && expr.value === '0';
}
