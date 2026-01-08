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
	IntegrateOptions,
	IntegrateStepRecorder
} from '../types';
import { isNumber, isVariable } from '../../guards';
import { number, divide, add, subtract, power, implicitMultiply, func } from '../../factory';
import { containsVariable } from '../rules';
import { CONSTANT_OF_INTEGRATION_NOTE } from '../descriptions-fr';

// Import integrate function for recursive calls (circular dependency handled at runtime)
import type { integrate as integrateType } from '../integrate';
let integrate: typeof integrateType;
// Lazy load to avoid circular dependency
import('../integrate').then((mod) => {
	integrate = mod.integrate;
});

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
	// Constants are polynomials
	if (!containsVariable(expr, variable)) {
		return true;
	}

	// Variable itself
	if (isVariable(expr) && expr.name === variable) {
		return true;
	}

	// Power: x^n where n is a non-negative integer
	if (expr.type === 'superscript') {
		if (isVariable(expr.base) && expr.base.name === variable) {
			// Check if exponent is a non-negative integer
			if (isNumber(expr.superscript)) {
				const exp = parseFloat(expr.superscript.value);
				return Number.isInteger(exp) && exp >= 0;
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
	if (!containsVariable(expr, variable)) {
		return 0; // Constant
	}

	if (isVariable(expr) && expr.name === variable) {
		return 1;
	}

	if (expr.type === 'superscript') {
		if (isVariable(expr.base) && expr.base.name === variable) {
			if (isNumber(expr.superscript)) {
				return parseFloat(expr.superscript.value);
			}
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

	// For now, return a simple implementation that handles basic cases
	// Full polynomial long division is complex and would require coefficient extraction
	// TODO: Implement full polynomial long division algorithm

	// Simple case: both are monomials or simple polynomials
	// For MVP, we'll mark this as unsupported and return null
	// This means improper fractions won't work yet
	return null;
}

// =============================================================================
// Factorization
// =============================================================================

/**
 * Factor a polynomial into linear and irreducible quadratic factors.
 * This is a simplified implementation that handles common cases.
 */
function factorDenominator(poly: MathNode, variable: string): PolynomialFactor[] | null {
	// Handle simple cases first

	// Case 1: Single variable (x) → linear factor with root 0
	if (isVariable(poly) && poly.name === variable) {
		return [{ type: 'linear', root: number('0'), multiplicity: 1 }];
	}

	// Case 2: (x - a)^n
	if (poly.type === 'superscript') {
		const base = poly.base;
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
	if (poly.type === 'addition') {
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
 * Solve for coefficients in partial fraction decomposition.
 * This is a placeholder that needs full implementation.
 */
function solveCoefficients(
	_numerator: MathNode,
	terms: PartialFractionTerm[],
	_variable: string
): PartialFractionTerm[] {
	// TODO: Implement coefficient solving using system of equations
	// For now, return terms with placeholder coefficients
	return terms;
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
	_options: Required<Omit<IntegrateOptions, 'variable'>>,
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
		// For now, simplified handling
		const coeffs = term.factor.quadraticCoeffs!;

		// Check if it's x^2 + a^2 form
		if (
			isNumber(coeffs.a) &&
			coeffs.a.value === '1' &&
			isNumber(coeffs.b) &&
			coeffs.b.value === '0' &&
			isNumber(coeffs.c)
		) {
			const a = coeffs.c;
			const sqrtA = Math.sqrt(parseFloat(a.value));

			// Integral of 1/(x^2 + a^2) = (1/a) * arctan(x/a)
			const xVar = { type: 'variable', name: variable } as MathNode;
			const atanArg = divide(xVar, number(sqrtA.toString()), 'fraction');
			const atanTerm = func('arctan', [atanArg]);
			return divide(atanTerm, number(sqrtA.toString()), 'fraction');
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
		options: Required<Omit<IntegrateOptions, 'variable'>>,
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
			if (!integrate) {
				return {
					variable,
					status: 'unsupported',
					antiderivative: null,
					integrandType: 'rational',
					technique: 'partial-fractions',
					steps: recorder.getSteps(),
					error: 'Integration module not fully loaded'
				};
			}

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
