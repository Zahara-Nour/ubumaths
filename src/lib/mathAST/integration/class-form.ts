/**
 * Écriture de CLASSE de la primitive finale (décision de David, 2026-10-07).
 * Aucune réécriture ne change la valeur, sauf la constante d'intégration
 * (`dropConstantTerms`), arbitraire par définition.
 *
 * - `powerOfSumForm` : c·uⁿ⁺¹ gardée en puissance de u (⅓(x + 1)³,
 *   −1/(6(3x + 2)²), ⅔(x + 3)^{3/2}) au lieu d'être développée ;
 * - `groupLnTerms` : a ln|x| + b ln|x| → (a + b) ln|x| ;
 * - `dropConstantTerms` : ¼x⁴ + ⅔x³ + ½x² − 1/12 → sans −1/12 (constante
 *   parasite d'un développement).
 *
 * L'ordre des termes de la forme terme à terme est dans `laurent-form.ts`.
 *
 * @module mathAST/integration/class-form
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import {
	isAddition,
	isDelimiter,
	isDivision,
	isFunction,
	isMultiplication,
	isOpposite,
	isSubtraction,
	isSuperscript,
	isVariable
} from '../guards';
import { add, delimiter, fraction, multiply, number, opposite, power, subtract } from '../factory';
import { containsVariable } from '../common/contains-variable';
import { extractExactRational, rationalToNode } from '../common/numeric';
import { divRational, mulRational, negRational } from '../normal/rational';
import { findNodes } from '../transforms';
import { toLatex } from '../latex-generator';

// =============================================================================
// Types
// =============================================================================

interface SignedTerm {
	readonly negative: boolean;
	readonly node: MathNode;
}

interface PowerOfSum {
	coefficient: Rational;
	base: MathNode | null;
	exponent: Rational | null;
}

// =============================================================================
// Sommes signées
// =============================================================================

/** Termes signés d'une somme (addition, soustraction, opposé) */
function signedTerms(node: MathNode, negative = false): SignedTerm[] {
	if (isAddition(node)) {
		return [...signedTerms(node.left, negative), ...signedTerms(node.right, negative)];
	}
	if (isSubtraction(node)) {
		return [...signedTerms(node.left, negative), ...signedTerms(node.right, !negative)];
	}
	if (isOpposite(node)) return signedTerms(node.operand, !negative);
	return [{ negative, node }];
}

function sumOf(terms: readonly SignedTerm[]): MathNode {
	const [first, ...rest] = terms;
	return rest.reduce<MathNode>(
		(sum, term) => (term.negative ? subtract(sum, term.node) : add(sum, term.node)),
		first.negative ? opposite(first.node) : first.node
	);
}

function unwrap(node: MathNode): MathNode {
	return isDelimiter(node) ? unwrap(node.content) : node;
}

// =============================================================================
// c·uᵖ gardée en puissance
// =============================================================================

/** Rassemble les facteurs : constantes rationnelles et UNE puissance de somme */
function collectFactors(node: MathNode, inverted: boolean, into: PowerOfSum): boolean {
	if (isOpposite(node)) {
		into.coefficient = negRational(into.coefficient);
		return collectFactors(node.operand, inverted, into);
	}
	if (isMultiplication(node)) {
		return collectFactors(node.left, inverted, into) && collectFactors(node.right, inverted, into);
	}
	if (isDivision(node)) {
		return (
			collectFactors(node.numerator, inverted, into) &&
			collectFactors(node.denominator, !inverted, into)
		);
	}
	if (isDelimiter(node)) return collectFactors(node.content, inverted, into);
	return collectLeaf(node, inverted, into);
}

function collectLeaf(node: MathNode, inverted: boolean, into: PowerOfSum): boolean {
	const variables = findNodes(node, isVariable);
	if (variables.length === 0) {
		const value = extractExactRational(node);
		if (value === null || value.n === 0n) return false;
		into.coefficient = inverted
			? divRational(into.coefficient, value)
			: mulRational(into.coefficient, value);
		return true;
	}
	if (into.base !== null || !isSuperscript(node)) return false;
	const base = unwrap(node.base);
	if (!isAddition(base) && !isSubtraction(base)) return false;
	const exponent = extractExactRational(node.superscript);
	if (exponent === null) return false;
	into.base = base;
	into.exponent = inverted ? negRational(exponent) : exponent;
	return true;
}

/** |p| ≥ 2 entier, p = −1, ou demi-entier > 1 (√ gardée par l'écriture actuelle) */
function isKeptExponent({ n, d }: Rational): boolean {
	const magnitude = n < 0n ? -n : n;
	if (d === 1n) return magnitude >= 2n || n === -1n;
	return d === 2n && magnitude > 2n;
}

/**
 * c·uᵖ (u somme contenant la variable, c et p rationnels) écrite en puissance
 * de u : ⅓(x + 1)³, −1/(6(3x + 2)²), ⅔(x + 3)^{3/2} ; null sinon.
 */
export function powerOfSumForm(expr: MathNode, variable: string): MathNode | null {
	const found: PowerOfSum = { coefficient: { n: 1n, d: 1n }, base: null, exponent: null };
	if (!collectFactors(expr, false, found)) return null;
	const { coefficient, base, exponent } = found;
	if (base === null || exponent === null || !containsVariable(base, variable)) return null;
	if (!isKeptExponent(exponent)) return null;

	const coefficientNegative = coefficient.n < 0n;
	const magnitude = coefficientNegative ? -coefficient.n : coefficient.n;
	const exponentMagnitude = exponent.n < 0n ? negRational(exponent) : exponent;
	// (2x − 1)¹ s'écrit (2x − 1)
	const raised =
		exponentMagnitude.n === 1n && exponentMagnitude.d === 1n
			? delimiter('parentheses', base)
			: power(delimiter('parentheses', base), rationalToNode(exponentMagnitude));
	let node: MathNode;
	if (exponent.n > 0n) {
		node =
			magnitude === 1n && coefficient.d === 1n
				? raised
				: multiply(rationalToNode({ n: magnitude, d: coefficient.d }), raised, 'implicit');
	} else {
		const denominator =
			coefficient.d === 1n
				? raised
				: multiply(number(coefficient.d.toString()), raised, 'implicit');
		node = fraction(number(magnitude.toString()), denominator);
	}
	return coefficientNegative ? opposite(node) : node;
}

// =============================================================================
// Termes en ln regroupés
// =============================================================================

function factorsOf(node: MathNode): MathNode[] {
	return isMultiplication(node) ? [...factorsOf(node.left), ...factorsOf(node.right)] : [node];
}

function productOf(factors: readonly MathNode[]): MathNode | null {
	if (factors.length === 0) return null;
	return factors.reduce((product, factor) => multiply(product, factor, 'implicit'));
}

function containsLn(node: MathNode): boolean {
	return findNodes(node, (n) => isFunction(n) && n.name === 'ln').length > 0;
}

/** a ln|x| + b ln|x| → (a + b) ln|x| (même partie en la variable, contenant ln) */
export function groupLnTerms(expr: MathNode, variable: string): MathNode {
	const terms = signedTerms(expr);
	if (terms.length < 2) return expr;
	const split = terms.map((term) => {
		const factors = factorsOf(term.node);
		const variablePart = productOf(factors.filter((f) => containsVariable(f, variable)));
		const coefficient = productOf(factors.filter((f) => !containsVariable(f, variable)));
		return { term, variablePart, coefficient };
	});
	const groups = new Map<string, typeof split>();
	for (const piece of split) {
		if (piece.variablePart === null || !containsLn(piece.variablePart)) continue;
		const key = toLatex(piece.variablePart);
		groups.set(key, [...(groups.get(key) ?? []), piece]);
	}
	if (![...groups.values()].some((group) => group.length > 1)) return expr;

	const emitted = new Set<string>();
	const result: SignedTerm[] = [];
	for (const piece of split) {
		const key = piece.variablePart === null ? null : toLatex(piece.variablePart);
		const group = key === null ? undefined : groups.get(key);
		if (key === null || group === undefined || group.length < 2 || piece.variablePart === null) {
			result.push(piece.term);
			continue;
		}
		if (emitted.has(key)) continue;
		emitted.add(key);
		const coefficients = sumOf(
			group.map(({ term, coefficient }) => ({
				negative: term.negative,
				node: coefficient ?? number('1')
			}))
		);
		result.push({
			negative: false,
			node: multiply(delimiter('parentheses', coefficients), piece.variablePart, 'implicit')
		});
	}
	return sumOf(result);
}

// =============================================================================
// Constante parasite
// =============================================================================

/** Les termes sans la variable d'une somme qui la contient : retirés (constante d'intégration) */
export function dropConstantTerms(expr: MathNode, variable: string): MathNode {
	const terms = signedTerms(expr);
	const kept = terms.filter((term) => containsVariable(term.node, variable));
	if (kept.length === 0 || kept.length === terms.length) return expr;
	return sumOf(kept);
}
