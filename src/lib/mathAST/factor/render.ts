/**
 * Écrire une `Factorization` en `MathNode`, coefficients entiers dès que
 * possible : `(2x + 3)(x − 1)`, jamais `2(x + 3/2)(x − 1)` (ADR 0024).
 *
 * Tout passe par la fabrique, sans littéral négatif (un négatif est un
 * `opposite`) ; une somme facteur d'un produit ou élevée à une puissance est
 * mise entre parenthèses (`delimiter` de regroupement, comme à la lecture).
 * Le constant −1 s'écrit en signe devant le produit : `-(x − 3)(x + 3)`.
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import {
	add,
	fraction,
	multiply,
	number,
	opposite,
	parentheses,
	power,
	sqrt,
	subtract,
	variable as variableNode
} from '../factory';
import { isAddition, isSubtraction } from '../guards';
import { isOne, isMinusOne, isNegative, isZero, negRational } from '../normal/rational';
import { rationalToNode } from '../common/numeric';
import { polynomialNode } from './polynomial-node';
import type { Factorization, PolynomialFactor, SurdFactor } from './factor';

/** `offset·√radicand` écrit `B√m` ou `B√m / C` (offset = B/C > 0). */
function radicalTerm(offset: Rational, radicand: bigint): MathNode {
	const root = sqrt(number(radicand.toString()));
	const numerator =
		offset.n === 1n ? root : multiply(number(offset.n.toString()), root, 'implicit');
	return offset.d === 1n ? numerator : fraction(numerator, number(offset.d.toString()));
}

/** `x − center − sign·offset·√m`, à plat : `x - 1 - \sqrt{2}`. */
function surdFactorNode(factor: SurdFactor, x: MathNode): MathNode {
	let acc: MathNode = x;
	if (!isZero(factor.center)) {
		acc = isNegative(factor.center)
			? add(acc, rationalToNode(negRational(factor.center)))
			: subtract(acc, rationalToNode(factor.center));
	}
	const term = radicalTerm(factor.offset, factor.radicand);
	return factor.sign === 1 ? subtract(acc, term) : add(acc, term);
}

function baseNode(factor: PolynomialFactor, x: MathNode): MathNode {
	return factor.kind === 'integer'
		? polynomialNode(factor.coefficients, x)
		: surdFactorNode(factor, x);
}

/** Facteur prêt pour un produit : parenthèses autour d'une somme, puissance si besoin. */
function productFactor(base: MathNode, multiplicity: number, bare: boolean): MathNode {
	const isSum = isAddition(base) || isSubtraction(base);
	const wrapped = isSum && (!bare || multiplicity > 1) ? parentheses(base) : base;
	return multiplicity > 1 ? power(wrapped, number(multiplicity.toString())) : wrapped;
}

/**
 * Le produit `constante × facteurs^multiplicité × reste`, dans l'ordre de
 * `factorization.factors`, le reste en dernier.
 */
export function factorizationToNode(factorization: Factorization): MathNode {
	const x = variableNode(factorization.variable);
	const bases: Array<{ base: MathNode; multiplicity: number }> = factorization.factors.map(
		(factor) => ({ base: baseNode(factor, x), multiplicity: factor.multiplicity })
	);
	if (factorization.rest !== null) {
		bases.push({ base: polynomialNode(factorization.rest, x), multiplicity: 1 });
	}

	const { constant } = factorization;
	if (bases.length === 0) return rationalToNode(constant);

	// Un facteur seul, sans constante, s'écrit sans parenthèses : `x^2 + 1`
	const bare = isOne(constant) && bases.length === 1;
	const nodes = bases.map(({ base, multiplicity }) => productFactor(base, multiplicity, bare));
	const product = nodes
		.slice(1)
		.reduce<MathNode>((acc, node) => multiply(acc, node, 'implicit'), nodes[0]);

	if (isOne(constant)) return product;
	if (isMinusOne(constant)) return opposite(product);
	return [rationalToNode(constant), ...nodes].reduce((acc, node) =>
		multiply(acc, node, 'implicit')
	);
}
