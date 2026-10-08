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
import {
	add,
	delimiter,
	divide,
	fraction,
	func,
	multiply,
	number,
	opposite,
	power,
	subtract
} from '../factory';
import { normalize, denormalize } from '../normal';
import { differentiate } from '../differentiation';
import { substitute } from '../eval/substitute';
import { mapNode } from '../transforms';
import { hashMathNode } from '../normal/hash';
import { containsVariable } from '../common/contains-variable';
import { extractExactRational, rationalToNode } from '../common/numeric';
import { divRational, mulRational, negRational } from '../normal/rational';
import { findNodes } from '../transforms';
import { toLatex } from '../latex-generator';
import { checkAbort, getActiveAbortChecker } from '../common/abort';

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
// Constantes
// =============================================================================

/** Taille (en bits) au-delà de laquelle l'argument d'arctan n'est pas réécrit */
const MAX_ARCTAN_BITS = 64;
/** Facteurs carrés k² cherchés jusqu'à k = MAX_SQUARE_FACTOR (au-delà : √ non réduite, valeur juste) */
const MAX_SQUARE_FACTOR = 10_000n;

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

// =============================================================================
// ln(u²ᵏ) = 2k ln|u|
// =============================================================================

/**
 * ln(u^{2k}) → 2k·ln|u| (k entier non nul) : la normalisation écrit
 * ln(u²) = 2 ln u, juste pour u > 0 seulement ; ln(x²) est définie pour tout
 * x ≠ 0 et sa primitive doit l'être aussi (revue de #947). `dropAbsOfPositive`
 * retire ensuite |·| quand u > 0 sur ℝ (ln((x² + 1)²) → 2 ln(x² + 1)).
 */
export function lnOfEvenPowerAsAbs(expr: MathNode): MathNode {
	return mapNode(expr, (n) => {
		if (!isFunction(n) || n.name !== 'ln' || n.args.length !== 1) return n;
		if (n.base !== undefined || n.power !== undefined) return n;
		const arg = unwrap(n.args[0]);
		if (!isSuperscript(arg)) return n;
		const exponent = extractExactRational(arg.superscript);
		if (exponent === null || exponent.d !== 1n || exponent.n === 0n || exponent.n % 2n !== 0n) {
			return n;
		}
		const lnAbs = func('ln', [func('abs', [unwrap(arg.base)])]);
		return multiply(rationalToNode(exponent), lnAbs, 'implicit');
	});
}

// =============================================================================
// k · u|u| (primitive de |au + b|)
// =============================================================================

/**
 * F = k · u|u| (u affine, k rationnel) écrite en produit, non développée :
 * ¼(2x − 1)|2x − 1| plutôt que ½x|2x − 1| − ¼|2x − 1| ; null sinon (aucune
 * valeur absolue, plusieurs arguments distincts, ou F n'est pas k · u|u|).
 */
export function absProductForm(expr: MathNode, variable: string): MathNode | null {
	const absNodes = findNodes(
		expr,
		(n) => isFunction(n) && n.name === 'abs' && containsVariable(n, variable)
	);
	if (absNodes.length === 0) return null;
	const first = absNodes[0];
	if (!isFunction(first) || first.args.length !== 1) return null;
	const hash = hashMathNode(first);
	if (absNodes.some((n) => hashMathNode(n) !== hash)) return null;

	const u = denormalize(normalize(first.args[0]));
	const ratio = denormalize(
		normalize(divide(expr, multiply(u, func('abs', [u]), 'implicit'), 'fraction'))
	);
	const k = extractExactRational(ratio);
	if (k === null || k.n === 0n) return null;

	const shownU = isVariable(u) ? u : delimiter('parentheses', u);
	const product = multiply(shownU, func('abs', [u]), 'implicit');
	const negative = k.n < 0n;
	const magnitude = { n: negative ? -k.n : k.n, d: k.d };
	const node =
		magnitude.n === 1n && magnitude.d === 1n
			? product
			: multiply(rationalToNode(magnitude), product, 'implicit');
	return negative ? opposite(node) : node;
}

// =============================================================================
// arctan((Px + Q)/S) : argument affine non développé
// =============================================================================

function bitLength(value: bigint): number {
	return (value < 0n ? -value : value).toString(2).length;
}

function bigintSqrt(value: bigint): bigint | null {
	if (value < 0n) return null;
	const root = BigInt(Math.round(Math.sqrt(Number(value))));
	for (const candidate of [root - 1n, root, root + 1n]) {
		if (candidate >= 0n && candidate * candidate === value) return candidate;
	}
	return null;
}

function exactRationalOf(node: MathNode): Rational | null {
	try {
		return extractExactRational(denormalize(normalize(node)));
	} catch {
		return null;
	}
}

/** Px + Q (P entier > 0, Q entier) */
function integerAffine(variable: string, p: bigint, q: bigint): MathNode {
	const x: MathNode = { type: 'variable', name: variable };
	const px = p === 1n ? x : multiply(number(p.toString()), x, 'implicit');
	if (q === 0n) return px;
	return q > 0n ? add(px, number(q.toString())) : subtract(px, number((-q).toString()));
}

/** Argument m(x + r) réécrit (Px + Q)/S, S = √(P²/m²) simplifié ; null sinon */
function affineArctanArgument(arg: MathNode, variable: string): MathNode | null {
	let slopeNode: MathNode;
	try {
		slopeNode = differentiate(arg, { variable });
	} catch {
		return null;
	}
	if (containsVariable(slopeNode, variable)) return null;
	const atZero = substitute(arg, { [variable]: number('0') }, { maxIterations: 1 });
	const r = exactRationalOf(fraction(atZero, slopeNode));
	const t = exactRationalOf(multiply(slopeNode, slopeNode, 'implicit'));
	if (r === null || r.n === 0n || t === null || t.n <= 0n) return null;
	const m = exactRationalOf(slopeNode);
	const negative = m !== null ? m.n < 0n : (exactRationalOf(atZero)?.n ?? 0n) * r.n < 0n;

	// P = dénominateur de r : Px + Pr entiers ; S² = P²/t = u/v
	const p = r.d;
	const q = r.n;
	const u = p * p * t.d;
	const v = t.n;
	let node: MathNode;
	const uv = u * v;
	// Entiers géants (coefficients décimaux, ≈ 1e62) : extraire les carrés
	// gèlerait l'onglet ; l'argument est alors rendu inchangé
	if (bitLength(uv) > MAX_ARCTAN_BITS) return null;
	const sqrtUV = bigintSqrt(uv);
	if (sqrtUV !== null) {
		// S = √(uv)/v rationnel : (Px + Q)·v/√(uv) ramené en fraction d'entiers
		const num = { n: v, d: sqrtUV };
		const g = gcdBig(gcdBig(p * num.n, q * num.n), num.d);
		const P = (p * num.n) / g;
		const Q = (q * num.n) / g;
		const D = num.d / g;
		const affine = integerAffine(variable, P, Q);
		node = D === 1n ? affine : fraction(affine, number(D.toString()));
	} else {
		// S = √(uv)/v : (Px + Q)·v/√(uv), √(uv) sans facteur carré extrait
		let inside = uv;
		let outside = 1n;
		const shouldAbort = getActiveAbortChecker();
		for (let k = 2n; k <= MAX_SQUARE_FACTOR && k * k <= inside; k++) {
			checkAbort(shouldAbort);
			while (inside % (k * k) === 0n) {
				inside /= k * k;
				outside *= k;
			}
		}
		// v/(outside·√inside) : P, Q multipliés par v/outside (entiers après réduction)
		const g = gcdBig(gcdBig(p * v, q * v), outside);
		const P = (p * v) / g;
		const Q = (q * v) / g;
		const O = outside / g;
		const root = func('sqrt', [number(inside.toString())]);
		const denominator = O === 1n ? root : multiply(number(O.toString()), root, 'implicit');
		node = fraction(integerAffine(variable, P, Q), denominator);
	}
	return negative ? opposite(node) : node;
}

function gcdBig(a: bigint, b: bigint): bigint {
	let x = a < 0n ? -a : a;
	let y = b < 0n ? -b : b;
	while (y !== 0n) [x, y] = [y, x % y];
	return x === 0n ? 1n : x;
}

/**
 * arctan(⅔√3 x + ⅓√3) → arctan((2x + 1)/√3), arctan(½x + ½) → arctan((x + 1)/2) :
 * écriture de classe de la forme canonique ((x + p)/q). Seuls les arguments
 * affines AVEC terme constant sont réécrits (arctan(½x) inchangé).
 */
export function arctanClassForm(expr: MathNode, variable: string): MathNode {
	return mapNode(expr, (n) => {
		if (!isFunction(n) || n.name !== 'arctan' || n.args.length !== 1) return n;
		if (!containsVariable(n.args[0], variable)) return n;
		const rewritten = affineArctanArgument(n.args[0], variable);
		return rewritten === null ? n : func('arctan', [rewritten]);
	});
}
