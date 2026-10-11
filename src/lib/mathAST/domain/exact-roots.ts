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
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import type { Domain, Interval } from './types';
import type { Endpoint } from '$lib/math/intervals/types';
import {
	ZERO,
	ONE,
	addRational,
	subRational,
	mulRational,
	divRational,
	negRational,
	isZero,
	isNegative,
	isInteger,
	rational,
	fromInteger,
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

// =============================================================================
// Polynômes et fractions rationnelles à coefficients rationnels
// =============================================================================

/** Coefficients par degré croissant : `[c0, c1, c2…]`. */
export type Poly = readonly Rational[];

export interface RationalFunction {
	readonly num: Poly;
	readonly den: Poly;
}

/** Degré maximal accepté (au-delà, on ne cherche pas). */
const MAX_DEGREE = 8;
/** Plus grand |coefficient entier| dont on énumère les diviseurs. */
const MAX_DIVISOR_SEARCH = 1_000_000n;

function trim(p: Poly): Poly {
	let end = p.length;
	while (end > 0 && isZero(p[end - 1])) end--;
	return p.slice(0, end);
}

function polyAdd(a: Poly, b: Poly): Poly {
	const out: Rational[] = [];
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		out.push(addRational(a[i] ?? ZERO, b[i] ?? ZERO));
	}
	return trim(out);
}

function polyNeg(a: Poly): Poly {
	return a.map(negRational);
}

function polyMul(a: Poly, b: Poly): Poly {
	if (a.length === 0 || b.length === 0) return [];
	const out: Rational[] = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			out[i + j] = addRational(out[i + j], mulRational(a[i], b[j]));
		}
	}
	return trim(out);
}

function degree(p: Poly): number {
	return trim(p).length - 1;
}

function evalPoly(p: Poly, x: Rational): Rational {
	let acc = ZERO;
	for (let i = p.length - 1; i >= 0; i--) acc = addRational(mulRational(acc, x), p[i]);
	return acc;
}

export function evalPolyFloat(p: Poly, x: number): number {
	let acc = 0;
	for (let i = p.length - 1; i >= 0; i--) acc = acc * x + rationalToNumber(p[i]);
	return acc;
}

const CONST_ONE: RationalFunction = { num: [ONE], den: [ONE] };

function rfMul(a: RationalFunction, b: RationalFunction): RationalFunction {
	return { num: polyMul(a.num, b.num), den: polyMul(a.den, b.den) };
}

function rfAdd(a: RationalFunction, b: RationalFunction): RationalFunction {
	return {
		num: polyAdd(polyMul(a.num, b.den), polyMul(b.num, a.den)),
		den: polyMul(a.den, b.den)
	};
}

function rfNeg(a: RationalFunction): RationalFunction {
	return { num: polyNeg(a.num), den: a.den };
}

function rfDiv(a: RationalFunction, b: RationalFunction): RationalFunction | null {
	if (trim(b.num).length === 0) return null;
	return { num: polyMul(a.num, b.den), den: polyMul(a.den, b.num) };
}

function rfDegreeOk(a: RationalFunction): boolean {
	return degree(a.num) <= MAX_DEGREE && degree(a.den) <= MAX_DEGREE;
}

/**
 * Lit `expr` comme une fraction rationnelle en `variable` à coefficients
 * rationnels exacts. `null` dès qu'apparaît autre chose (fonction, π, autre
 * lettre, exposant non entier…).
 */
export function toRationalFunction(expr: MathNode, variable: string): RationalFunction | null {
	const result = toRF(expr, variable);
	return result && rfDegreeOk(result) ? result : null;
}

function toRF(expr: MathNode, variable: string): RationalFunction | null {
	switch (expr.type) {
		case 'number': {
			const r = extractRational(expr);
			return r ? { num: trim([r]), den: [ONE] } : null;
		}
		case 'variable':
			return expr.name === variable ? { num: [ZERO, ONE], den: [ONE] } : null;
		case 'opposite': {
			const inner = toRF(expr.operand, variable);
			return inner ? rfNeg(inner) : null;
		}
		case 'positive':
			return toRF(expr.operand, variable);
		case 'delimiter':
			// Seul le regroupement est transparent (pas un intervalle, un vecteur…)
			return expr.semantic === undefined || expr.semantic === 'grouping'
				? toRF(expr.content, variable)
				: null;
		case 'addition':
		case 'subtraction': {
			const l = toRF(expr.left, variable);
			const r = toRF(expr.right, variable);
			if (!l || !r) return null;
			return rfAdd(l, expr.type === 'addition' ? r : rfNeg(r));
		}
		case 'multiplication': {
			const l = toRF(expr.left, variable);
			const r = toRF(expr.right, variable);
			return l && r ? rfMul(l, r) : null;
		}
		case 'division': {
			const l = toRF(expr.numerator, variable);
			const r = toRF(expr.denominator, variable);
			return l && r ? rfDiv(l, r) : null;
		}
		case 'superscript': {
			const exponent = extractRational(expr.superscript);
			if (!exponent || !isInteger(exponent)) return null;
			const n = Number(exponent.n);
			if (Math.abs(n) > MAX_DEGREE) return null;
			const base = toRF(expr.base, variable);
			if (!base) return null;
			let acc: RationalFunction = CONST_ONE;
			for (let i = 0; i < Math.abs(n); i++) {
				acc = rfMul(acc, base);
				if (!rfDegreeOk(acc)) return null;
			}
			return n >= 0 ? acc : rfDiv(CONST_ONE, acc);
		}
		default:
			return null;
	}
}

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

function integerCoefficients(p: Poly): bigint[] {
	let common = 1n;
	for (const c of p) common = lcm(common, c.d);
	return p.map((c) => (c.n * common) / c.d);
}

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

/** Division synthétique de p par (x − r) ; r doit être racine. */
function deflate(p: Poly, r: Rational): Poly {
	const n = p.length - 1;
	const out: Rational[] = Array.from({ length: n }, () => ZERO);
	let carry = ZERO;
	for (let i = n; i >= 1; i--) {
		carry = addRational(p[i], mulRational(carry, r));
		out[i - 1] = carry;
	}
	return trim(out);
}

/** Décompose un entier positif en k²·m, m sans facteur carré. */
function squareFree(n: bigint): { k: bigint; m: bigint } {
	let k = 1n;
	let m = n;
	for (let i = 2n; i * i <= m; i++) {
		while (m % (i * i) === 0n) {
			m /= i * i;
			k *= i;
		}
	}
	return { k, m };
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

/** Racines réelles de a·x² + b·x + c (a ≠ 0), exactes. */
function quadraticRoots(a: Rational, b: Rational, c: Rational): ExactRoot[] {
	const delta = subRational(mulRational(b, b), mulRational(fromInteger(4), mulRational(a, c)));
	if (isNegative(delta)) return [];
	const twoA = mulRational(fromInteger(2), a);
	const R = divRational(negRational(b), twoA);
	if (isZero(delta)) return [{ value: rationalToNumber(R), node: rationalNode(R) }];
	// √(p/q) = √(p·q)/q
	const { k, m } = squareFree(delta.n * delta.d);
	let S = divRational(rational(k, delta.d), twoA);
	if (isNegative(S)) S = negRational(S);
	if (m === 1n) {
		const r1 = subRational(R, S);
		const r2 = addRational(R, S);
		return [
			{ value: rationalToNumber(r1), node: rationalNode(r1) },
			{ value: rationalToNumber(r2), node: rationalNode(r2) }
		];
	}
	return [surdNode(R, S, m, -1), surdNode(R, S, m, 1)];
}

/**
 * Racines réelles EXACTES (sans multiplicité, triées) d'un polynôme non nul.
 * `null` si une partie irréductible de degré ≥ 3 reste (pas de forme exacte
 * simple), ou si le polynôme est nul.
 */
export function exactRealRoots(poly: Poly): ExactRoot[] | null {
	let p = trim(poly);
	if (p.length === 0) return null;
	const roots: ExactRoot[] = [];
	const found: Rational[] = [];

	// x = 0
	while (p.length > 1 && isZero(p[0])) {
		found.push(ZERO);
		p = p.slice(1);
	}

	// Racines rationnelles ±p/q
	if (p.length > 2) {
		const ints = integerCoefficients(p);
		const ps = divisors(ints[0]);
		const qs = divisors(ints[ints.length - 1]);
		if (ps && qs) {
			for (const num of ps) {
				for (const den of qs) {
					for (const s of [1n, -1n]) {
						const candidate = rational(s * num, den);
						while (p.length > 1 && isZero(evalPoly(p, candidate))) {
							found.push(candidate);
							p = deflate(p, candidate);
						}
					}
				}
			}
		}
	}

	for (const r of found) roots.push({ value: rationalToNumber(r), node: rationalNode(r) });

	const d = p.length - 1;
	if (d === 1) {
		const r = divRational(negRational(p[0]), p[1]);
		roots.push({ value: rationalToNumber(r), node: rationalNode(r) });
	} else if (d === 2) {
		roots.push(...quadraticRoots(p[2], p[1], p[0]));
	} else if (d === 4 && isZero(p[1]) && isZero(p[3])) {
		// Bicarré : t = x², racines t rationnelles > 0 seulement
		const ts = quadraticRoots(p[4], p[2], p[0]);
		for (const t of ts) {
			if (t.value < 0) continue;
			const tr = extractRationalFromNode(t.node);
			if (!tr) return null;
			if (isZero(tr)) {
				roots.push({ value: 0, node: number('0') });
				continue;
			}
			const rootsOfT = quadraticRoots(ONE, ZERO, negRational(tr));
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
	if (trim(rf.num).length === 0) return null; // identiquement nul
	const zeros = exactRealRoots(rf.num);
	if (!zeros) return null;
	const poles = trim(rf.den).length > 1 ? exactRealRoots(rf.den) : [];
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
	const g = trim(polyAdd(rf.num, polyNeg(rf.den.map((c) => mulRational(c, bound)))));
	const den = trim(rf.den);
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
