/**
 * Racines rationnelles exactes d'un polynôme à coefficients rationnels :
 * théorème des racines rationnelles (±p/q, p | a₀, q | aₙ), puis division
 * synthétique par chaque racine trouvée, autant de fois qu'elle annule le
 * quotient (les multiplicités sont gardées).
 *
 * Déplacé de `domain/exact-roots.ts` (ADR 0024, lot 1), où c'était la seule
 * implémentation exacte du théorème ; `exactRealRoots` l'appelle désormais
 * d'ici. Deux changements sans effet sur ce qu'il rend :
 * - les candidats sont dédoublonnés (`2/2` n'est plus retesté après `1`) et
 *   rangés par hauteur croissante (max(p, q)) : le quotient final et le multiset
 *   des racines ne dépendent pas de l'ordre des essais ;
 * - une borne optionnelle sur le nombre de candidats (le noyau de factorisation
 *   la pose, `domain` non).
 */

import type { Rational } from '../normal/types';
import { ZERO, isZero, rational, absBigInt, gcd } from '../normal/rational';
import { type Poly, trimPoly, evalPoly, deflate, integerCoefficients } from './polynomial';

/** Plus grand |coefficient entier| (a₀ ou aₙ) dont on énumère les diviseurs. */
export const MAX_DIVISOR_SEARCH = 1_000_000n;

export interface RationalRootSearch {
	/** Racines trouvées, chacune répétée selon sa multiplicité, dans l'ordre des essais. */
	readonly roots: readonly Rational[];
	/**
	 * Quotient du polynôme par les `(x − r)` trouvés ; même coefficient dominant.
	 * Sans racine rationnelle si `complete`, sauf s'il est de degré 1 (laissé à l'appelant).
	 */
	readonly rest: Poly;
	/**
	 * `false` quand la recherche a été sautée (a₀ ou aₙ au-delà de
	 * `MAX_DIVISOR_SEARCH`) ou coupée (`maxCandidates` atteint) alors que le
	 * reste est de degré ≥ 2 : il peut encore avoir une racine rationnelle.
	 */
	readonly complete: boolean;
}

/** Diviseurs positifs de |n|, `null` si n = 0 ou |n| > `MAX_DIVISOR_SEARCH`. */
function divisors(n: bigint): bigint[] | null {
	const a = absBigInt(n);
	if (a === 0n || a > MAX_DIVISOR_SEARCH) return null;
	const out: bigint[] = [];
	for (let i = 1n; i * i <= a; i++) {
		if (a % i === 0n) {
			out.push(i);
			if (i * i !== a) out.push(a / i);
		}
	}
	return out;
}

/** ±p/q irréductibles, par hauteur max(p, q) croissante, puis p, puis q, `+` avant `−`. */
function candidates(ps: readonly bigint[], qs: readonly bigint[]): Rational[] {
	const pairs: Array<{ p: bigint; q: bigint }> = [];
	for (const p of ps) {
		for (const q of qs) {
			if (gcd(p, q) === 1n) pairs.push({ p, q });
		}
	}
	const height = (pair: { p: bigint; q: bigint }): bigint => (pair.p > pair.q ? pair.p : pair.q);
	pairs.sort((a, b) => {
		const ha = height(a);
		const hb = height(b);
		if (ha !== hb) return ha < hb ? -1 : 1;
		if (a.p !== b.p) return a.p < b.p ? -1 : 1;
		return a.q < b.q ? -1 : a.q > b.q ? 1 : 0;
	});
	return pairs.flatMap(({ p, q }) => [rational(p, q), rational(-p, q)]);
}

/**
 * Extrait les racines rationnelles de `poly` (non nul), avec multiplicités :
 * d'abord x = 0, puis les candidats ±p/q si le degré restant est ≥ 2.
 * `maxCandidates` borne le nombre de candidats essayés (illimité par défaut).
 */
export function extractRationalRoots(
	poly: Poly,
	maxCandidates: number = Number.POSITIVE_INFINITY
): RationalRootSearch {
	let p = trimPoly(poly);
	const roots: Rational[] = [];

	// x = 0
	while (p.length > 1 && isZero(p[0])) {
		roots.push(ZERO);
		p = p.slice(1);
	}
	if (p.length <= 2) return { roots, rest: p, complete: true };

	// Racines rationnelles ±p/q
	const ints = integerCoefficients(p);
	const ps = divisors(ints[0]);
	const qs = divisors(ints[ints.length - 1]);
	if (!ps || !qs) return { roots, rest: p, complete: false };

	const all = candidates(ps, qs);
	const tried = all.length > maxCandidates ? all.slice(0, maxCandidates) : all;
	for (const candidate of tried) {
		if (p.length <= 1) break;
		while (p.length > 1 && isZero(evalPoly(p, candidate))) {
			roots.push(candidate);
			p = deflate(p, candidate);
		}
	}
	return { roots, rest: p, complete: tried.length === all.length || p.length <= 2 };
}
