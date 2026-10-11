/**
 * Polynômes et fractions rationnelles à coefficients RATIONNELS exacts (bigint).
 *
 * Déplacé de `domain/exact-roots.ts` (ADR 0024, lot 1) : le lecteur
 * `toRationalFunction` y était l'extracteur de coefficients le plus sûr du
 * moteur (exact, `Rational`, refus net de tout ce qui n'est pas une fraction
 * rationnelle en la variable). `domain/` l'importe désormais d'ici ; le
 * comportement n'a pas changé.
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import {
	ZERO,
	ONE,
	addRational,
	mulRational,
	divRational,
	negRational,
	isZero,
	isInteger,
	lcm,
	rationalToNumber
} from '../normal/rational';
import { extractRational } from '../common/numeric';

// =============================================================================
// Types et bornes
// =============================================================================

/** Coefficients par degré croissant : `[c0, c1, c2…]`. */
export type Poly = readonly Rational[];

export interface RationalFunction {
	readonly num: Poly;
	readonly den: Poly;
}

/**
 * Degré maximal lu (numérateur et dénominateur, exposant entier compris) : au-delà,
 * `toRationalFunction` rend `null`. Huit couvre tout le programme du lycée.
 */
export const MAX_POLYNOMIAL_DEGREE = 8;

// =============================================================================
// Arithmétique
// =============================================================================

/** Retire les coefficients dominants nuls ; le polynôme nul devient `[]`. */
export function trimPoly(p: Poly): Poly {
	let end = p.length;
	while (end > 0 && isZero(p[end - 1])) end--;
	return p.slice(0, end);
}

export function addPoly(a: Poly, b: Poly): Poly {
	const out: Rational[] = [];
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		out.push(addRational(a[i] ?? ZERO, b[i] ?? ZERO));
	}
	return trimPoly(out);
}

export function negPoly(a: Poly): Poly {
	return a.map(negRational);
}

export function mulPoly(a: Poly, b: Poly): Poly {
	if (a.length === 0 || b.length === 0) return [];
	const out: Rational[] = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			out[i + j] = addRational(out[i + j], mulRational(a[i], b[j]));
		}
	}
	return trimPoly(out);
}

/** Degré ; −1 pour le polynôme nul. */
export function polyDegree(p: Poly): number {
	return trimPoly(p).length - 1;
}

/** Valeur exacte en `x` (Horner). */
export function evalPoly(p: Poly, x: Rational): Rational {
	let acc = ZERO;
	for (let i = p.length - 1; i >= 0; i--) acc = addRational(mulRational(acc, x), p[i]);
	return acc;
}

/** Valeur approchée en `x` (Horner, flottants) : pour un signe, jamais pour une égalité. */
export function evalPolyFloat(p: Poly, x: number): number {
	let acc = 0;
	for (let i = p.length - 1; i >= 0; i--) acc = acc * x + rationalToNumber(p[i]);
	return acc;
}

/** Division synthétique de `p` par `(x − r)` ; `r` doit être racine (reste ignoré). */
export function deflate(p: Poly, r: Rational): Poly {
	const n = p.length - 1;
	const out: Rational[] = Array.from({ length: n }, () => ZERO);
	let carry = ZERO;
	for (let i = n; i >= 1; i--) {
		carry = addRational(p[i], mulRational(carry, r));
		out[i - 1] = carry;
	}
	return trimPoly(out);
}

/**
 * Divise `p` par (x − r) tant que `r` en est racine, `limit` fois au plus :
 * le quotient exact et le nombre de divisions faites (la multiplicité de `r`
 * quand `limit` ne coupe pas). Sert aux limites `0/0`, où la racine est connue.
 */
export function divideOutRoot(
	p: Poly,
	r: Rational,
	limit = Number.POSITIVE_INFINITY
): { quotient: Poly; multiplicity: number } {
	let quotient = trimPoly(p);
	let multiplicity = 0;
	while (multiplicity < limit && quotient.length > 1 && isZero(evalPoly(quotient, r))) {
		quotient = deflate(quotient, r);
		multiplicity++;
	}
	return { quotient, multiplicity };
}

/** Coefficients multipliés par le PPCM des dénominateurs : des entiers, même signe. */
export function integerCoefficients(p: Poly): bigint[] {
	let common = 1n;
	for (const c of p) common = lcm(common, c.d);
	return p.map((c) => (c.n * common) / c.d);
}

// =============================================================================
// Fractions rationnelles
// =============================================================================

const CONST_ONE: RationalFunction = { num: [ONE], den: [ONE] };

function rfMul(a: RationalFunction, b: RationalFunction): RationalFunction {
	return { num: mulPoly(a.num, b.num), den: mulPoly(a.den, b.den) };
}

function rfAdd(a: RationalFunction, b: RationalFunction): RationalFunction {
	return {
		num: addPoly(mulPoly(a.num, b.den), mulPoly(b.num, a.den)),
		den: mulPoly(a.den, b.den)
	};
}

function rfNeg(a: RationalFunction): RationalFunction {
	return { num: negPoly(a.num), den: a.den };
}

function rfDiv(a: RationalFunction, b: RationalFunction): RationalFunction | null {
	if (trimPoly(b.num).length === 0) return null;
	return { num: mulPoly(a.num, b.den), den: mulPoly(a.den, b.num) };
}

function rfDegreeOk(a: RationalFunction): boolean {
	return polyDegree(a.num) <= MAX_POLYNOMIAL_DEGREE && polyDegree(a.den) <= MAX_POLYNOMIAL_DEGREE;
}

/**
 * Lit `expr` comme une fraction rationnelle en `variable` à coefficients
 * rationnels exacts. `null` dès qu'apparaît autre chose (fonction, π, autre
 * lettre, exposant non entier…) ou qu'un degré dépasse `MAX_POLYNOMIAL_DEGREE`.
 */
export function toRationalFunction(expr: MathNode, variable: string): RationalFunction | null {
	const result = toRF(expr, variable);
	return result && rfDegreeOk(result) ? result : null;
}

/**
 * Lit `expr` comme un POLYNÔME en `variable` (fraction rationnelle de
 * dénominateur constant), coefficients exacts ; `null` sinon.
 */
export function toPolynomial(expr: MathNode, variable: string): Poly | null {
	const rf = toRationalFunction(expr, variable);
	if (rf === null) return null;
	const den = trimPoly(rf.den);
	if (den.length !== 1) return null;
	return trimPoly(rf.num.map((c) => divRational(c, den[0])));
}

function toRF(expr: MathNode, variable: string): RationalFunction | null {
	switch (expr.type) {
		case 'number': {
			const r = extractRational(expr);
			return r ? { num: trimPoly([r]), den: [ONE] } : null;
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
			if (Math.abs(n) > MAX_POLYNOMIAL_DEGREE) return null;
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
