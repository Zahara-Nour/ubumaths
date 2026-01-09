/**
 * MathAST Normal Form - Denormalization Algorithm
 *
 * Reconstructs a MathNode from a NormalForm.
 * This is the inverse of normalization, producing a simplified
 * but human-readable expression.
 */

import type { MathNode, NumberNode } from '../types';
import type {
	NormalForm,
	NormalTerm,
	AlgebraicCoefficient,
	AlgebraicTerm,
	SymbolicFactor,
	SimplifiedRadical,
	Rational
} from './types';
import { isZero as isZeroRational, isOne as isOneRational, isNegative } from './rational';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a number node from a bigint.
 */
function numberNode(value: bigint): NumberNode {
	return { type: 'number', value: value.toString() };
}

/**
 * Creates a number node from a rational.
 * If denominator is 1, returns just the numerator.
 * Otherwise, returns a fraction.
 */
function rationalToNode(r: Rational): MathNode {
	if (r.d === 1n) {
		return numberNode(r.n);
	}

	// Return as fraction
	return {
		type: 'division',
		numerator: numberNode(r.n < 0n ? -r.n : r.n),
		denominator: numberNode(r.d),
		displayStyle: 'fraction' as const,
		...(r.n < 0n && { operatorMetadata: undefined })
	};
}

/**
 * Wraps a node in a negation if needed.
 */
function maybeNegate(node: MathNode, isNeg: boolean): MathNode {
	if (!isNeg) return node;
	return {
		type: 'opposite',
		operand: node
	};
}

/**
 * Creates a multiplication node.
 */
function multiplyNodes(left: MathNode, right: MathNode): MathNode {
	return {
		type: 'multiplication',
		left,
		right,
		displayStyle: 'implicit' as const
	};
}

/**
 * Creates an addition node.
 */
function addNodes(left: MathNode, right: MathNode): MathNode {
	return {
		type: 'addition',
		left,
		right
	};
}

/**
 * Creates a subtraction node.
 */
function subtractNodes(left: MathNode, right: MathNode): MathNode {
	return {
		type: 'subtraction',
		left,
		right
	};
}

/**
 * Creates a power node.
 */
function powerNode(base: MathNode, exponent: MathNode): MathNode {
	return {
		type: 'superscript',
		base,
		superscript: exponent
	};
}

/**
 * Creates a sqrt function node.
 */
function sqrtNode(arg: MathNode): MathNode {
	return {
		type: 'function',
		name: 'sqrt',
		args: [arg]
	};
}

/**
 * Creates a root function node (nth root).
 */
function rootNode(arg: MathNode, index: bigint): MathNode {
	if (index === 2n) {
		return sqrtNode(arg);
	}
	if (index === 3n) {
		return {
			type: 'function',
			name: 'cbrt',
			args: [arg]
		};
	}
	// General nth root using root function
	return {
		type: 'function',
		name: 'root',
		args: [arg, { type: 'number', value: index.toString() }]
	};
}

/**
 * Creates the imaginary unit node i = complex(0, 1).
 */
function imaginaryUnitNode(): MathNode {
	return {
		type: 'complex',
		real: { type: 'number', value: '0' },
		imaginary: { type: 'number', value: '1' }
	};
}

// =============================================================================
// Denormalization Functions
// =============================================================================

/**
 * Denormalizes a simplified radical to a MathNode.
 *
 * @param radical - The simplified radical
 * @returns A MathNode representing the radical
 */
function denormalizeRadical(radical: SimplifiedRadical): MathNode {
	return rootNode(numberNode(radical.radicand), radical.index);
}

/**
 * Denormalizes an algebraic term to a MathNode.
 *
 * An algebraic term is: rational * product of radicals * (possibly i)
 *
 * @param term - The algebraic term
 * @returns A MathNode representing the term
 */
function denormalizeAlgebraicTerm(term: AlgebraicTerm): MathNode {
	const { rational, radicals, hasImaginaryUnit } = term;

	// Handle zero
	if (isZeroRational(rational)) {
		return numberNode(0n);
	}

	// Build the radical product (including imaginary unit if present)
	let product: MathNode | null = null;

	for (const radical of radicals) {
		const radNode = denormalizeRadical(radical);
		if (product === null) {
			product = radNode;
		} else {
			product = multiplyNodes(product, radNode);
		}
	}

	// Add imaginary unit if present
	if (hasImaginaryUnit === true) {
		const iNode = imaginaryUnitNode();
		if (product === null) {
			product = iNode;
		} else {
			product = multiplyNodes(product, iNode);
		}
	}

	// Handle coefficient
	const absRational: Rational = { n: rational.n < 0n ? -rational.n : rational.n, d: rational.d };
	const isNeg = isNegative(rational);

	if (isOneRational(absRational)) {
		// Coefficient is 1 or -1
		if (product === null) {
			return maybeNegate(numberNode(1n), isNeg);
		}
		return maybeNegate(product, isNeg);
	}

	// Non-unit coefficient
	const coeffNode = rationalToNode(absRational);

	if (product === null) {
		return maybeNegate(coeffNode, isNeg);
	}

	return maybeNegate(multiplyNodes(coeffNode, product), isNeg);
}

/**
 * Denormalizes an algebraic coefficient to a MathNode.
 *
 * An algebraic coefficient is a sum of algebraic terms.
 *
 * @param coef - The algebraic coefficient
 * @returns A MathNode representing the coefficient
 */
export function denormalizeCoefficient(coef: AlgebraicCoefficient): MathNode {
	if (coef.terms.length === 0) {
		return numberNode(0n);
	}

	if (coef.terms.length === 1) {
		return denormalizeAlgebraicTerm(coef.terms[0]);
	}

	// Multiple terms: build sum
	let result = denormalizeAlgebraicTerm(coef.terms[0]);

	for (let i = 1; i < coef.terms.length; i++) {
		const term = coef.terms[i];
		const termNode = denormalizeAlgebraicTerm(term);

		// Check if term is negative for subtraction
		if (isNegative(term.rational)) {
			// Remove the negation from termNode and use subtraction
			const posRational = { n: -term.rational.n, d: term.rational.d };
			const posTerm = { ...term, rational: posRational };
			result = subtractNodes(result, denormalizeAlgebraicTerm(posTerm));
		} else {
			result = addNodes(result, termNode);
		}
	}

	return result;
}

/**
 * Denormalizes a symbolic factor with fractional exponent.
 *
 * Examples:
 * - x^{1/2} → √x
 * - x^{3/2} → x√x (x^1 × x^{1/2})
 * - x^{5/2} → x²√x (x^2 × x^{1/2})
 * - x^{1/3} → ∛x
 * - x^{4/3} → x∛x (x^1 × x^{1/3})
 * - x^{2/3} → ∛(x²)
 *
 * @param base - The base node
 * @param exponent - The fractional exponent
 * @returns A MathNode representing base^exponent
 */
function denormalizeFractionalPower(base: MathNode, exponent: Rational): MathNode {
	const { n, d } = exponent;

	// Handle negative exponents: x^{-n/d} = 1 / x^{n/d}
	if (n < 0n) {
		const posExp: Rational = { n: -n, d };
		const posNode = denormalizeFractionalPower(base, posExp);
		return {
			type: 'division',
			numerator: numberNode(1n),
			denominator: posNode,
			displayStyle: 'fraction' as const
		};
	}

	// Split into integer part and remainder
	// n/d = intPart + remainder/d
	const intPart = n / d; // Integer division
	const remainder = n % d;

	// Case: no remainder (should be integer, but just in case)
	if (remainder === 0n) {
		if (intPart === 1n) return base;
		return powerNode(base, numberNode(intPart));
	}

	// Case: only fractional part (intPart = 0)
	if (intPart === 0n) {
		// x^{r/d} where r < d
		// If r = 1: d-th root of x
		if (remainder === 1n) {
			return rootNode(base, d);
		}
		// If r > 1: d-th root of x^r
		const innerPower = powerNode(base, numberNode(remainder));
		return rootNode(innerPower, d);
	}

	// Case: both integer and fractional parts
	// x^{intPart + remainder/d} = x^intPart × x^{remainder/d}
	const intPartNode = intPart === 1n ? base : powerNode(base, numberNode(intPart));

	// Fractional part
	let fracPartNode: MathNode;
	if (remainder === 1n) {
		// x^{1/d} = d-th root of x
		fracPartNode = rootNode(base, d);
	} else {
		// x^{r/d} = d-th root of x^r
		const innerPower = powerNode(base, numberNode(remainder));
		fracPartNode = rootNode(innerPower, d);
	}

	return multiplyNodes(intPartNode, fracPartNode);
}

/**
 * Denormalizes a monomial (array of symbolic factors) to a MathNode.
 *
 * @param monomial - The symbolic monomial
 * @returns A MathNode representing the monomial
 */
export function denormalizeMonomial(monomial: readonly SymbolicFactor[]): MathNode | null {
	if (monomial.length === 0) {
		return null; // Empty monomial = 1, handled by caller
	}

	let result: MathNode | null = null;

	for (const factor of monomial) {
		const { base, exponent } = factor;

		let factorNode: MathNode;

		if (isOneRational(exponent)) {
			// Exponent is 1: just use the base
			factorNode = base;
		} else if (exponent.d === 1n) {
			// Integer exponent
			factorNode = powerNode(base, numberNode(exponent.n));
		} else {
			// Fractional exponent: use smart rendering
			factorNode = denormalizeFractionalPower(base, exponent);
		}

		if (result === null) {
			result = factorNode;
		} else {
			result = multiplyNodes(result, factorNode);
		}
	}

	return result;
}

/**
 * Denormalizes a normal term to a MathNode.
 *
 * A normal term is: coefficient * monomial
 *
 * @param term - The normal term
 * @returns A MathNode representing the term
 */
export function denormalizeTerm(term: NormalTerm): MathNode {
	const coeffNode = denormalizeCoefficient(term.coefficient);
	const monomialNode = denormalizeMonomial(term.monomial);

	// If coefficient is zero, return 0
	if (term.coefficient.terms.length === 0) {
		return numberNode(0n);
	}

	// If monomial is empty (1), return just the coefficient
	if (monomialNode === null) {
		return coeffNode;
	}

	// If coefficient is 1, return just the monomial
	if (
		term.coefficient.terms.length === 1 &&
		term.coefficient.terms[0].radicals.length === 0 &&
		isOneRational(term.coefficient.terms[0].rational)
	) {
		return monomialNode;
	}

	// If coefficient is -1, return negated monomial
	if (
		term.coefficient.terms.length === 1 &&
		term.coefficient.terms[0].radicals.length === 0 &&
		term.coefficient.terms[0].rational.n === -1n &&
		term.coefficient.terms[0].rational.d === 1n
	) {
		return {
			type: 'opposite',
			operand: monomialNode
		};
	}

	// General case: coefficient * monomial
	return multiplyNodes(coeffNode, monomialNode);
}

/**
 * Denormalizes a polynomial (array of terms) to a MathNode.
 *
 * @param terms - The polynomial terms
 * @returns A MathNode representing the polynomial
 */
function denormalizePolynomial(terms: readonly NormalTerm[]): MathNode {
	if (terms.length === 0) {
		return numberNode(0n);
	}

	if (terms.length === 1) {
		return denormalizeTerm(terms[0]);
	}

	// Build sum of terms
	let result = denormalizeTerm(terms[0]);

	for (let i = 1; i < terms.length; i++) {
		const term = terms[i];

		// Check if the coefficient is negative
		const isNegativeCoeff =
			term.coefficient.terms.length > 0 && isNegative(term.coefficient.terms[0].rational);

		if (isNegativeCoeff) {
			// Negate the coefficient and use subtraction
			const negatedCoeff: AlgebraicCoefficient = {
				terms: term.coefficient.terms.map((t) => ({
					...t,
					rational: { n: -t.rational.n, d: t.rational.d }
				}))
			};
			const negatedTerm: NormalTerm = {
				coefficient: negatedCoeff,
				monomial: term.monomial
			};
			result = subtractNodes(result, denormalizeTerm(negatedTerm));
		} else {
			result = addNodes(result, denormalizeTerm(term));
		}
	}

	return result;
}

/**
 * Denormalizes a NormalForm back to a MathNode.
 *
 * This is the main entry point for denormalization.
 *
 * @param form - The normal form to denormalize
 * @returns A MathNode representing the expression
 */
export function denormalize(form: NormalForm): MathNode {
	const numNode = denormalizePolynomial(form.numerator);

	// Check if denominator is 1
	if (
		form.denominator.length === 1 &&
		form.denominator[0].monomial.length === 0 &&
		form.denominator[0].coefficient.terms.length === 1 &&
		form.denominator[0].coefficient.terms[0].radicals.length === 0 &&
		isOneRational(form.denominator[0].coefficient.terms[0].rational)
	) {
		return numNode;
	}

	// General fraction
	const denNode = denormalizePolynomial(form.denominator);

	return {
		type: 'division',
		numerator: numNode,
		denominator: denNode,
		displayStyle: 'fraction' as const
	};
}
