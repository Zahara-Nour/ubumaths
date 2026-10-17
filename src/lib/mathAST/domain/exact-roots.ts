/**
 * Racines EXACTES pour le calcul de domaine.
 *
 * Le pipeline historique (`preimage.ts`) classe l'expression en polynôme à
 * coefficients FLOTTANTS et rend des bornes décimales (`0.3333333333333333`,
 * `1.4142135623730951`) ; il ne reconnaissait pas non plus `x - 1/2` (une
 * division par une constante était « complexe », donc la contrainte était
 * ignorée en silence : `1/(x-1/2)` → ℝ).
 *
 * Ici : l'expression est lue comme une fraction rationnelle P/Q à coefficients
 * RATIONNELS exacts (bigint), ses racines sont cherchées exactement
 * (racines rationnelles, puis second degré → a ± b√m, puis bicarré), et
 * l'inéquation `P/Q ⊳ c` est résolue par un tableau de signes dont les bornes
 * sont des nœuds exacts (`1/3`, `(1+√5)/2`, `√2/2`).
 *
 * Toute fonction rend `null` quand elle ne sait pas faire EXACTEMENT : à
 * l'appelant de se rabattre sur le chemin historique ou de refuser.
 *
 * Depuis l'ADR 0024, la lecture (`toRationalFunction`), les racines
 * rationnelles ±p/q et l'analyse de Δ vivent dans `factor/`, partagées avec le
 * noyau de factorisation ; ce fichier garde l'écriture des racines en bornes
 * (`rationalNode`, `surdNode`), le bicarré et les inéquations.
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import type { Domain, Interval } from './types';
import type { Endpoint } from '$lib/math/intervals/types';
import {
	ONE,
	ZERO,
	divRational,
	mulRational,
	negRational,
	isZero,
	isNegative,
	lcm,
	absBigInt,
	rationalToNumber,
	compareRational
} from '../normal/rational';
import { extractRational } from '../common/numeric';
import { number, opposite, divide, add, subtract, multiply, sqrt as sqrtNode } from '../factory';
import {
	intervalDomain,
	interval,
	openEndpoint,
	closedEndpoint,
	negInfinityEndpoint,
	posInfinityEndpoint,
	excludedPoint,
	emptyDomain,
	universalDomain
} from './factory';
// Lecture exacte, arithmétique des polynômes, ±p/q et Δ : partagés avec le noyau
// de factorisation (ADR 0024), qui les a repris d'ici
import {
	type Poly,
	addPoly,
	negPoly,
	trimPoly,
	evalPolyFloat,
	toRationalFunction
} from '../factor/polynomial';
import { extractRationalRoots } from '../factor/rational-roots';
import { quadraticRootParts } from '../factor/quadratic';

export { toRationalFunction, evalPolyFloat };
export type { Poly, RationalFunction } from '../factor/polynomial';

// =============================================================================
// Racines exactes
// =============================================================================

export interface ExactRoot {
	readonly value: number;
	readonly node: MathNode;
}

/** Nœud d'un rationnel : `3`, `opposite(3)`, `1/3` (inline), `opposite(1/3)`. */
export function rationalNode(r: Rational): MathNode {
	const negative = isNegative(r);
	const n = absBigInt(r.n);
	const body: MathNode =
		r.d === 1n
			? number(n.toString())
			: divide(number(n.toString()), number(r.d.toString()), 'inline');
	return negative ? opposite(body) : body;
}

/**
 * R + sign·S·√m sous la forme (A ± B√m)/C, A, B, C entiers, B, C > 0.
 * `S` > 0, `m` > 1 sans facteur carré.
 */
function surdNode(R: Rational, S: Rational, m: bigint, sign: 1 | -1): ExactRoot {
	const value = rationalToNumber(R) + sign * rationalToNumber(S) * Math.sqrt(Number(m));
	const C = lcm(R.d, S.d);
	const A = (R.n * C) / R.d;
	const B = (S.n * C) / S.d;
	const root = sqrtNode(number(m.toString()));
	const radicalTerm: MathNode = B === 1n ? root : multiply(number(B.toString()), root, 'implicit');
	let numerator: MathNode;
	if (A === 0n) {
		numerator = sign === 1 ? radicalTerm : opposite(radicalTerm);
		if (C === 1n) return { value, node: numerator };
		// −√2/2 : le signe devant la fraction
		const frac = divide(radicalTerm, number(C.toString()), 'inline');
		return { value, node: sign === 1 ? frac : opposite(frac) };
	}
	const head: MathNode = A < 0n ? opposite(number((-A).toString())) : number(A.toString());
	numerator = sign === 1 ? add(head, radicalTerm) : subtract(head, radicalTerm);
	return {
		value,
		node: C === 1n ? numerator : divide(numerator, number(C.toString()), 'inline')
	};
}

/** Racines réelles de a·x² + b·x + c (a ≠ 0), exactes ; `null` si Δ n'a pas été réduit. */
function quadraticRoots(a: Rational, b: Rational, c: Rational): ExactRoot[] | null {
	const parts = quadraticRootParts(a, b, c);
	switch (parts.kind) {
		case 'none':
			return [];
		case 'double':
			return [{ value: rationalToNumber(parts.root), node: rationalNode(parts.root) }];
		case 'rational':
			return parts.roots.map((r) => ({ value: rationalToNumber(r), node: rationalNode(r) }));
		case 'surd':
			return [
				surdNode(parts.center, parts.offset, parts.radicand, -1),
				surdNode(parts.center, parts.offset, parts.radicand, 1)
			];
		case 'irrational':
			// Sans borne sur le radicande, n'arrive pas ; « pas exact » par prudence
			return null;
	}
}

/**
 * Racines réelles EXACTES (sans multiplicité, triées) d'un polynôme non nul.
 * `null` si une partie irréductible de degré ≥ 3 reste (pas de forme exacte
 * simple), ou si le polynôme est nul.
 */
export function exactRealRoots(poly: Poly): ExactRoot[] | null {
	const trimmed = trimPoly(poly);
	if (trimmed.length === 0) return null;
	const roots: ExactRoot[] = [];

	// x = 0, puis racines rationnelles ±p/q, avec multiplicités (dédoublonnées plus bas)
	const { roots: found, rest: p } = extractRationalRoots(trimmed);

	for (const r of found) roots.push({ value: rationalToNumber(r), node: rationalNode(r) });

	const d = p.length - 1;
	if (d === 1) {
		const r = divRational(negRational(p[0]), p[1]);
		roots.push({ value: rationalToNumber(r), node: rationalNode(r) });
	} else if (d === 2) {
		const quadratic = quadraticRoots(p[2], p[1], p[0]);
		if (!quadratic) return null;
		roots.push(...quadratic);
	} else if (d === 4 && isZero(p[1]) && isZero(p[3])) {
		// Bicarré : t = x², racines t rationnelles > 0 seulement
		const ts = quadraticRoots(p[4], p[2], p[0]);
		if (!ts) return null;
		for (const t of ts) {
			if (t.value < 0) continue;
			const tr = extractRationalFromNode(t.node);
			if (!tr) return null;
			if (isZero(tr)) {
				roots.push({ value: 0, node: number('0') });
				continue;
			}
			const rootsOfT = quadraticRoots(ONE, ZERO, negRational(tr));
			if (!rootsOfT) return null;
			roots.push(...rootsOfT);
		}
	} else if (d >= 3) {
		return null;
	}

	return dedupeSorted(roots);
}

function extractRationalFromNode(node: MathNode): Rational | null {
	if (node.type === 'division') {
		const n = extractRational(node.numerator);
		const d = extractRational(node.denominator);
		return n && d && !isZero(d) ? divRational(n, d) : null;
	}
	if (node.type === 'opposite') {
		const inner = extractRationalFromNode(node.operand);
		return inner ? negRational(inner) : null;
	}
	return extractRational(node);
}

function dedupeSorted(roots: ExactRoot[]): ExactRoot[] {
	const sorted = [...roots].sort((a, b) => a.value - b.value);
	const out: ExactRoot[] = [];
	for (const r of sorted) {
		if (out.length > 0 && Math.abs(out[out.length - 1].value - r.value) < 1e-12) continue;
		out.push(r);
	}
	return out;
}

// =============================================================================
// Zéros et inéquations exacts
// =============================================================================

/** Zéros exacts de `expr` (fraction rationnelle) ; `null` si inconnu. */
export function exactZeros(expr: MathNode, variable: string): ExactRoot[] | null {
	const rf = toRationalFunction(expr, variable);
	if (!rf) return null;
	if (trimPoly(rf.num).length === 0) return null; // identiquement nul
	const zeros = exactRealRoots(rf.num);
	if (!zeros) return null;
	const poles = trimPoly(rf.den).length > 1 ? exactRealRoots(rf.den) : [];
	if (!poles) return null;
	return zeros.filter((z) => !poles.some((p) => Math.abs(p.value - z.value) < 1e-12));
}

/**
 * Résout `expr ⊳ bound` (⊳ ∈ {≥, >, ≤, <}) par tableau de signes exact.
 * Les pôles ne sont jamais solutions. `null` si l'expression n'est pas une
 * fraction rationnelle, ou si une racine n'a pas de forme exacte.
 */
export function solveRationalInequality(
	expr: MathNode,
	op: '>=' | '<=',
	bound: Rational,
	strict: boolean,
	variable: string
): Domain | null {
	const rf = toRationalFunction(expr, variable);
	if (!rf) return null;
	// g = P − c·Q ; signe de (P − cQ)/Q = signe de (P − cQ)·Q
	const g = trimPoly(addPoly(rf.num, negPoly(rf.den.map((c) => mulRational(c, bound)))));
	const den = trimPoly(rf.den);
	const poles = den.length > 1 ? exactRealRoots(den) : [];
	if (!poles) return null;
	const equal = g.length === 0 ? [] : exactRealRoots(g);
	if (!equal) return null;

	interface Point {
		readonly root: ExactRoot;
		readonly pole: boolean;
	}
	const points: Point[] = [];
	for (const p of poles) points.push({ root: p, pole: true });
	for (const e of equal) {
		if (!points.some((q) => Math.abs(q.root.value - e.value) < 1e-12)) {
			points.push({ root: e, pole: false });
		}
	}
	points.sort((a, b) => a.root.value - b.root.value);

	const satisfies = (value: number): boolean => {
		if (op === '>=') return strict ? value > 0 : value >= 0;
		return strict ? value < 0 : value <= 0;
	};
	const signAt = (x: number): number => {
		if (g.length === 0) return 0;
		return evalPolyFloat(g, x) * evalPolyFloat(den, x);
	};

	// Morceaux : région 0, point 1, région 1, …, point k, région k
	const regionOk: boolean[] = [];
	for (let i = 0; i <= points.length; i++) {
		let x: number;
		if (points.length === 0) x = 0;
		else if (i === 0) x = points[0].root.value - 1;
		else if (i === points.length) x = points[points.length - 1].root.value + 1;
		else x = (points[i - 1].root.value + points[i].root.value) / 2;
		regionOk.push(satisfies(signAt(x)));
	}
	const pointOk = points.map((p) => !p.pole && satisfies(0));

	// Morceaux j : pair = région j/2, impair = point (j−1)/2
	const k = points.length;
	const pieceOk = (j: number): boolean => (j % 2 === 0 ? regionOk[j / 2] : pointOk[(j - 1) / 2]);
	const lowerOf = (j: number): Endpoint => {
		if (j % 2 === 1) return closedEndpoint(points[(j - 1) / 2].root.node);
		const i = j / 2;
		return i === 0 ? negInfinityEndpoint() : openEndpoint(points[i - 1].root.node);
	};
	const upperOf = (j: number): Endpoint => {
		if (j % 2 === 1) return closedEndpoint(points[(j - 1) / 2].root.node);
		const i = j / 2;
		return i === k ? posInfinityEndpoint() : openEndpoint(points[i].root.node);
	};

	const intervals: Interval[] = [];
	const excluded: MathNode[] = [];
	const last = 2 * k;
	let j = 0;
	while (j <= last) {
		if (!pieceOk(j)) {
			j++;
			continue;
		}
		const runStart = j;
		while (j + 1 <= last) {
			if (pieceOk(j + 1)) {
				j++;
			} else if (j + 2 <= last && j % 2 === 0 && pieceOk(j + 2)) {
				// point non admis entre deux régions admises : ℝ \ {a}
				excluded.push(points[j / 2].root.node);
				j += 2;
			} else break;
		}
		intervals.push(interval(lowerOf(runStart), upperOf(j)));
		j++;
	}

	if (intervals.length === 0) return emptyDomain();
	const onlyRealLine =
		intervals.length === 1 &&
		intervals[0].lower.value.type === 'infinity' &&
		intervals[0].upper.value.type === 'infinity';
	if (onlyRealLine && excluded.length === 0) return universalDomain();
	return intervalDomain(intervals, excluded.map(excludedPoint));
}

/** Rationnel exact d'un nœud constant (`1`, `-1`, `\frac{1}{2}`) ; sinon null. */
export function constantRational(node: MathNode): Rational | null {
	return extractRationalFromNode(node);
}

export { compareRational };
