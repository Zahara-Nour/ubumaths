/**
 * Familles périodiques de valeurs interdites (c + q·π + k·p·π, k ∈ ℤ), en calcul exact.
 *
 * Partagé par `algebra.ts` (intersection et réunion de deux domaines) et
 * `compute.ts` (domaine d'un produit, d'une somme). Une `PeriodicExclusion`
 * n'écrit qu'UNE famille : deux familles ne se combinent ici que lorsque le
 * résultat en est encore une (kπ et π/2 + kπ → kπ/2), sinon `null`.
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import type { PeriodicExclusion } from './types';
import {
	ZERO as RATIONAL_ZERO,
	ONE as RATIONAL_ONE,
	addRational,
	subRational,
	mulRational,
	divRational,
	negRational,
	isZero as isRationalZero,
	isNegative as isRationalNegative
} from '../normal/rational';
import { constantRational, rationalNode } from './exact-roots';
import { periodicExclusion } from './factory';
import { number as numberNode, divide, multiply, add, opposite, piConstant } from '../factory';
import { compile } from '../eval/compile';

/** Un point ou une période exacts : c + q·π, c et q rationnels. */
interface PiAffine {
	readonly c: Rational;
	readonly q: Rational;
}

/** Au-delà, deux familles de périodes trop éloignées : refus plutôt qu'un long calcul. */
const MAX_MERGED_POINTS = 512n;

/** `c + q·π` lu sur un nœud écrit par ce module (`π/4`, `1 + π/2`, `−3π/2`) ; `null` sinon. */
function piAffineParts(node: MathNode): PiAffine | null {
	switch (node.type) {
		case 'constant':
			return node.constant === 'pi' ? { c: RATIONAL_ZERO, q: RATIONAL_ONE } : null;
		case 'number': {
			const value = constantRational(node);
			return value && { c: value, q: RATIONAL_ZERO };
		}
		case 'delimiter':
			return piAffineParts(node.content);
		case 'opposite': {
			const inner = piAffineParts(node.operand);
			return inner && { c: negRational(inner.c), q: negRational(inner.q) };
		}
		case 'addition':
		case 'subtraction': {
			const left = piAffineParts(node.left);
			const right = piAffineParts(node.right);
			if (left === null || right === null) return null;
			const combine = node.type === 'addition' ? addRational : subRational;
			return { c: combine(left.c, right.c), q: combine(left.q, right.q) };
		}
		case 'multiplication': {
			const left = piAffineParts(node.left);
			const right = piAffineParts(node.right);
			if (left === null || right === null) return null;
			// Un des deux facteurs est un rationnel pur (pas de π² ici)
			if (!isRationalZero(left.q) && !isRationalZero(right.q)) return null;
			const [scale, other] = isRationalZero(left.q) ? [left.c, right] : [right.c, left];
			return { c: mulRational(scale, other.c), q: mulRational(scale, other.q) };
		}
		case 'division': {
			const top = piAffineParts(node.numerator);
			const bottom = piAffineParts(node.denominator);
			if (top === null || bottom === null) return null;
			if (!isRationalZero(bottom.q) || isRationalZero(bottom.c)) return null;
			return { c: divRational(top.c, bottom.c), q: divRational(top.q, bottom.c) };
		}
		default:
			return null;
	}
}

function gcdBig(a: bigint, b: bigint): bigint {
	let [x, y] = [a < 0n ? -a : a, b < 0n ? -b : b];
	while (y !== 0n) [x, y] = [y, x % y];
	return x;
}

function lcmBig(a: bigint, b: bigint): bigint {
	return (a / gcdBig(a, b)) * b;
}

function reduceRational(r: Rational): Rational {
	const g = gcdBig(r.n, r.d);
	return g === 0n ? r : { n: r.n / g, d: r.d / g };
}

/** q·π exact : `π`, `π/4`, `3π/2`, `−π/4`. */
export function piMultipleNode(q: Rational): MathNode {
	const negative = isRationalNegative(q);
	const n = negative ? -q.n : q.n;
	const pi = piConstant();
	const top: MathNode = n === 1n ? pi : multiply(numberNode(n.toString()), pi, 'implicit');
	const body: MathNode = q.d === 1n ? top : divide(top, numberNode(q.d.toString()), 'inline');
	return negative ? opposite(body) : body;
}

/** c + q·π écrit comme `createLinearPeriodicExclusion` : `π/4`, `1 + π/2`, `0`. */
function piAffineNode(c: Rational, q: Rational): MathNode {
	const reduced = reduceRational(q);
	const piPart = isRationalZero(reduced) ? null : piMultipleNode(reduced);
	if (piPart === null) return rationalNode(c);
	return isRationalZero(c) ? piPart : add(rationalNode(c), piPart);
}

/** Valeur numérique (via `compile`, seul générateur sûr) ; null si non finie. */
function nodeNumber(node: MathNode): number | null {
	try {
		const value = compile(node)({});
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

function sameNodeNumber(x: MathNode, y: MathNode): boolean {
	const [vx, vy] = [nodeNumber(x), nodeNumber(y)];
	return vx !== null && vy !== null && Math.abs(vx - vy) < 1e-12;
}

/** Deux familles qui décrivent le même ensemble (même période, bases décalées d'une période). */
export function samePeriodicFamily(a: PeriodicExclusion, b: PeriodicExclusion): boolean {
	const pa = nodeNumber(a.period);
	const pb = nodeNumber(b.period);
	const ba = nodeNumber(a.basePoint);
	const bb = nodeNumber(b.basePoint);
	if (pa === null || pb === null || ba === null || bb === null) return false;
	if (Math.abs(pa - pb) > 1e-12) return false;
	const k = Math.round((ba - bb) / pa);
	return Math.abs(ba - bb - k * pa) < 1e-12;
}

/**
 * Deux familles ramenées en entiers, en unités de π/D, sur une période commune L.
 * `null` hors du calcul exact (période décimale, base non lue) ; `differentShift`
 * quand les parties rationnelles diffèrent : c + qπ = c' + q'π impose c = c'
 * (π irrationnel), les deux familles n'ont alors aucun point commun.
 */
type IntegerFamilies =
	| { readonly kind: 'differentShift' }
	| {
			readonly kind: 'exact';
			readonly c: Rational;
			readonly D: bigint;
			readonly L: bigint;
			readonly residuesA: readonly bigint[];
			readonly residuesB: readonly bigint[];
	  };

function toIntegerFamilies(a: PeriodicExclusion, b: PeriodicExclusion): IntegerFamilies | null {
	const baseA = piAffineParts(a.basePoint);
	const baseB = piAffineParts(b.basePoint);
	const periodA = piAffineParts(a.period);
	const periodB = piAffineParts(b.period);
	if (baseA === null || baseB === null || periodA === null || periodB === null) return null;
	// Périodes : des multiples rationnels POSITIFS de π (jamais un décimal)
	const periods = [periodA, periodB];
	if (periods.some((p) => !isRationalZero(p.c) || isRationalZero(p.q) || isRationalNegative(p.q))) {
		return null;
	}
	if (subRational(baseA.c, baseB.c).n !== 0n) return { kind: 'differentShift' };

	const D = [baseA.q, baseB.q, periodA.q, periodB.q].reduce((acc, r) => lcmBig(acc, r.d), 1n);
	const toInt = (r: Rational): bigint => (r.n * D) / r.d;
	const [qA, qB, pA, pB] = [toInt(baseA.q), toInt(baseB.q), toInt(periodA.q), toInt(periodB.q)];
	const L = lcmBig(pA, pB);
	if (L / pA + L / pB > MAX_MERGED_POINTS) return null;
	const modL = (n: bigint): bigint => ((n % L) + L) % L;
	const residuesA: bigint[] = [];
	const residuesB: bigint[] = [];
	for (let i = 0n; i < L / pA; i++) residuesA.push(modL(qA + i * pA));
	for (let i = 0n; i < L / pB; i++) residuesB.push(modL(qB + i * pB));
	return { kind: 'exact', c: baseA.c, D, L, residuesA, residuesB };
}

function compareBig(x: bigint, y: bigint): number {
	return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * La réunion des deux familles (les x interdits par l'une OU l'autre), quand
 * elle forme encore une seule famille : kπ et π/2 + kπ → kπ/2 ; π/4 + kπ/2 et
 * kπ ne se rangent pas en une famille (`null`). Calcul exact : les points d'une
 * période commune L, ramenés dans [0 ; L[, doivent être régulièrement espacés.
 * Rend l'une des deux familles d'origine, inchangée, quand elle suffit.
 */
export function mergePeriodicFamilies(
	a: PeriodicExclusion,
	b: PeriodicExclusion
): PeriodicExclusion | null {
	if (samePeriodicFamily(a, b)) return a;
	const families = toIntegerFamilies(a, b);
	if (families === null || families.kind === 'differentShift') return null;
	const { c, D, L, residuesA, residuesB } = families;
	const sorted = [...new Set([...residuesA, ...residuesB])].sort(compareBig);
	const count = BigInt(sorted.length);
	if (L % count !== 0n) return null;
	const step = L / count;
	if (sorted.some((r, i) => r !== sorted[0] + BigInt(i) * step)) return null;

	const merged = periodicExclusion(
		piAffineNode(c, { n: sorted[0], d: D }),
		piMultipleNode(reduceRational({ n: step, d: D }))
	);
	// Le même ensemble qu'une des deux : son écriture d'origine, inchangée
	if (samePeriodicFamily(merged, a) && sameNodeNumber(merged.period, a.period)) return a;
	if (samePeriodicFamily(merged, b) && sameNodeNumber(merged.period, b.period)) return b;
	return merged;
}

/**
 * Les points communs aux deux familles : `'none'` quand il n'y en a aucun
 * (kπ et π/2 + kπ), la famille commune sinon (kπ et kπ/2 → kπ), `null` hors du
 * calcul exact. Deux progressions arithmétiques se coupent en au plus une
 * progression, de période L.
 */
export function commonPeriodicPoints(
	a: PeriodicExclusion,
	b: PeriodicExclusion
): PeriodicExclusion | 'none' | null {
	if (samePeriodicFamily(a, b)) return a;
	const families = toIntegerFamilies(a, b);
	if (families === null) return null;
	if (families.kind === 'differentShift') return 'none';
	const { c, D, L, residuesA, residuesB } = families;
	const inB = new Set(residuesB);
	const common = residuesA.filter((r) => inB.has(r));
	if (common.length === 0) return 'none';
	// Au plus un résidu modulo L (lemme chinois) ; plusieurs = lecture fausse, refus
	if (common.length > 1) return null;
	const family = periodicExclusion(
		piAffineNode(c, { n: common[0], d: D }),
		piMultipleNode(reduceRational({ n: L, d: D }))
	);
	if (samePeriodicFamily(family, a) && sameNodeNumber(family.period, a.period)) return a;
	if (samePeriodicFamily(family, b) && sameNodeNumber(family.period, b.period)) return b;
	return family;
}
