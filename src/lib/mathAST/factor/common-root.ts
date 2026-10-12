/**
 * Lever un `0/0` en a = p/q comme un élève (V23, chantier K21).
 *
 * N et D ont la racine a : on sort de chacun le facteur ENTIER primitif
 * `q·x − p` (`2x − 1`, pas `x − 1/2` ; `x − 3` quand a est entier), et la
 * fraction restante est réduite de son contenu numérique commun
 * (`(2x + 2)/2` → `x + 1`). Par le lemme de Gauss, un N à coefficients entiers
 * garde un quotient entier.
 *
 * Utilisé par la voie algorithmique (`limits/algebraic.ts`) et la voie
 * pédagogique (`pedagogical-limits/`), qui annoncent le même facteur.
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { variable as variableNode } from '../factory';
import { divRational, isZero, rational } from '../normal/rational';
import { type Poly, divideOutRoot, trimPoly } from './polynomial';
import { primitivePart } from './factor';
import { polynomialNode } from './polynomial-node';

export interface CommonRootDivision {
	/** Le facteur entier primitif `q·x − p`, coefficients par degré croissant */
	readonly factor: readonly bigint[];
	/** N / (q·x − p)^k, non réduit (ce qu'écrit la factorisation de N) */
	readonly numerator: Poly;
	/** D / (q·x − p)^k, non réduit */
	readonly denominator: Poly;
	/** La fraction numerator/denominator réduite de son contenu commun */
	readonly reducedNumerator: Poly;
	readonly reducedDenominator: Poly;
}

/** `q·x − p` pour a = p/q (q > 0) : le facteur entier primitif de la racine a. */
export function integerLinearFactor(a: Rational): readonly bigint[] {
	return [-a.n, a.d];
}

/**
 * Le facteur entier primitif `q·x − p` de la racine a = p/q, en nœud :
 * `2x - 1` pour 1/2, `3x + 2` pour −2/3, `x - 3` pour 3, `x` pour 0.
 */
export function integerLinearFactorNode(variable: string, a: Rational): MathNode {
	return polynomialNode(integerLinearFactor(a), variableNode(variable));
}

/**
 * Sortir `(q·x − p)^k` de N et de D, a = p/q racine des deux au moins k fois.
 * `null` si l'un des deux n'a pas a pour racine k fois.
 */
export function divideOutCommonRoot(
	num: Poly,
	den: Poly,
	a: Rational,
	k = 1
): CommonRootDivision | null {
	const n = divideOutRoot(num, a, k);
	const d = divideOutRoot(den, a, k);
	if (n.multiplicity < k || d.multiplicity < k) return null;

	// (x − a)^k = (q·x − p)^k / q^k : le quotient se divise par q^k
	const scale = rational(BigInt(a.d) ** BigInt(k), 1n);
	const numerator = n.quotient.map((c) => divRational(c, scale));
	const denominator = d.quotient.map((c) => divRational(c, scale));
	const reduced = reduceContent(numerator, denominator);
	return {
		factor: integerLinearFactor(a),
		numerator,
		denominator,
		reducedNumerator: reduced.numerator,
		reducedDenominator: reduced.denominator
	};
}

/**
 * N/D réduite de son contenu : N = cN·P, D = cD·Q (P, Q primitifs, dominant
 * > 0), et c = cN/cD irréductible donne (c.n·P)/(c.d·Q).
 */
function reduceContent(num: Poly, den: Poly): { numerator: Poly; denominator: Poly } {
	if (trimPoly(num).length === 0 || trimPoly(den).length === 0) {
		return { numerator: num, denominator: den };
	}
	const pn = primitivePart(num);
	const pd = primitivePart(den);
	const c = divRational(pn.content, pd.content);
	return {
		numerator: pn.primitive.map((v) => rational(v * c.n, 1n)),
		denominator: pd.primitive.map((v) => rational(v * c.d, 1n))
	};
}

/** Le facteur `(q·x − p)` en texte, pour une phrase : `(2x − 1)`, `(x + 3)`, `x`, puissance en exposant. */
export function linearFactorText(variable: string, a: Rational, k = 1): string {
	const [constant, leading] = integerLinearFactor(a);
	const head = leading === 1n ? variable : `${leading}${variable}`;
	const body = isZero(a)
		? head
		: `(${head} ${constant < 0n ? '−' : '+'} ${constant < 0n ? -constant : constant})`;
	return k === 1 ? body : `${body}${superscriptDigits(k)}`;
}

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

function superscriptDigits(k: number): string {
	return [...String(k)].map((digit) => SUPERSCRIPTS[Number(digit)]).join('');
}
