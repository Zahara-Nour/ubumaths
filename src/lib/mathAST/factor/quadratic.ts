/**
 * Racines exactes de a·x² + b·x + c (a ≠ 0, coefficients rationnels), par Δ.
 *
 * Déplacé de `domain/exact-roots.ts` (ADR 0024, lot 1), où la même analyse
 * fabriquait directement des nœuds de racines ; elle rend ici les PARTIES
 * exactes (centre, écart, radicande), et chacun écrit ce qu'il veut : `domain`
 * des bornes `(1 + √5)/2`, le noyau de factorisation des facteurs `x − 1 − √2`.
 *
 * Le radicande est réduit (k²·m, m sans facteur carré) par `extractPerfectPower`
 * de `normal/radical.ts`, et le carré parfait testé d'abord par la racine
 * entière exacte `integerNthRoot` (Newton, rapide même sur de grands entiers).
 */

import type { Rational } from '../normal/types';
import {
	addRational,
	subRational,
	mulRational,
	divRational,
	negRational,
	isZero,
	isNegative,
	rational,
	fromInteger
} from '../normal/rational';
import { integerNthRoot, extractPerfectPower } from '../normal/radical';

export type QuadraticRootParts =
	/** Δ < 0 : aucune racine réelle */
	| { readonly kind: 'none' }
	/** Δ = 0 : racine double */
	| { readonly kind: 'double'; readonly root: Rational }
	/** Δ carré d'un rationnel : deux racines rationnelles, la plus petite d'abord si a > 0 */
	| { readonly kind: 'rational'; readonly roots: readonly [Rational, Rational] }
	/** Δ > 0 non carré : racines `center ± offset·√radicand` (offset > 0, radicande > 1 sans facteur carré) */
	| {
			readonly kind: 'surd';
			readonly center: Rational;
			readonly offset: Rational;
			readonly radicand: bigint;
	  }
	/** Δ > 0 non carré, radicande au-delà de `maxRadicand` : pas réduit */
	| { readonly kind: 'irrational' };

/**
 * Le discriminant Δ = b² − 4ac, exact. Seul calcul de Δ sur ℚ du moteur :
 * `quadraticRootParts` et les stratégies de `factoriser` (« On calcule Δ »)
 * le partagent.
 */
export function discriminant(a: Rational, b: Rational, c: Rational): Rational {
	return subRational(mulRational(b, b), mulRational(fromInteger(4), mulRational(a, c)));
}

/**
 * Analyse exacte des racines de a·x² + b·x + c.
 *
 * `maxRadicand` borne l'entier dont on extrait les facteurs carrés (division
 * d'essai, en √n) ; au-delà, un Δ non carré rend `irrational`. Sans borne
 * (`domain`), la réduction se fait toujours.
 */
export function quadraticRootParts(
	a: Rational,
	b: Rational,
	c: Rational,
	maxRadicand?: bigint
): QuadraticRootParts {
	const delta = discriminant(a, b, c);
	if (isNegative(delta)) return { kind: 'none' };
	const twoA = mulRational(fromInteger(2), a);
	const center = divRational(negRational(b), twoA);
	if (isZero(delta)) return { kind: 'double', root: center };

	// √(p/q) = √(p·q)/q, et p·q = k²·m
	const radicand = delta.n * delta.d;
	const exactRoot = integerNthRoot(radicand, 2n);
	let k: bigint;
	let m: bigint;
	if (exactRoot !== null) {
		k = exactRoot;
		m = 1n;
	} else {
		if (maxRadicand !== undefined && radicand > maxRadicand) return { kind: 'irrational' };
		[k, m] = extractPerfectPower(radicand, 2n);
	}

	let offset = divRational(rational(k, delta.d), twoA);
	if (isNegative(offset)) offset = negRational(offset);
	if (m === 1n) {
		return {
			kind: 'rational',
			roots: [subRational(center, offset), addRational(center, offset)]
		};
	}
	return { kind: 'surd', center, offset, radicand: m };
}
