/**
 * L'encadrement rigoureux d'une expression numérique (lot « défauts des grandes fractions »,
 * 2026-10-12) : deux nombres binaires à 256 bits qui contiennent TOUJOURS la valeur exacte, chaque
 * opération arrondie vers l'extérieur. Sert à trancher une comparaison dont un membre est trop
 * long à calculer exactement (`bounded-comparison.ts`).
 *
 * ⚠️ Pourquoi pas la valeur approchée du bouton ≈ : un membre lu par le flottant puis soustrait
 * d'un nombre presque égal perd toute précision — `(1+1/20000)^{20000}×10^{16} − 27182138745278831
 * < 0` répondait `false` (revue). Ici, l'erreur reste bornée à chaque pas : 2⁻²⁵⁶ relatif par
 * opération, quelques dizaines d'opérations pour une puissance (exponentiation rapide).
 *
 * Encadré : les nombres, `+ − × ÷`, l'opposé, les parenthèses, une puissance d'exposant entier.
 * Le reste (π, une racine, une fonction, une variable) n'a pas d'encadrement : `null`.
 *
 * @module mathAST/cli/interval
 */

import type { MathNode } from '../types';
import {
	isAddition,
	isDelimiter,
	isDivision,
	isMultiplication,
	isNumber,
	isOpposite,
	isSubtraction,
	isSuperscript
} from '../guards';
import { evaluateNodeToRational } from '../eval/evaluate';

// =============================================================================
// Types
// =============================================================================

/** Le nombre binaire m × 2^e. */
interface Binary {
	readonly m: bigint;
	readonly e: number;
}

/** [lo ; hi], qui contient la valeur exacte. */
export interface Enclosure {
	readonly lo: Binary;
	readonly hi: Binary;
}

type Direction = 'down' | 'up';

// =============================================================================
// Constantes
// =============================================================================

/** Les bits gardés : 2⁻²⁵⁶ d'erreur relative par opération. */
const PRECISION = 256;

/** Au-delà, l'exposant binaire ne tient plus dans un entier sûr : pas d'encadrement. */
const MAX_BINARY_EXPONENT = 2 ** 50;

/** Un exposant de puissance plus grand n'est pas encadré (`2^{10^{300}}`). */
const MAX_POWER = 2n ** 50n;

const ZERO: Binary = { m: 0n, e: 0 };
const ONE: Binary = { m: 1n, e: 0 };

// =============================================================================
// Nombres binaires, arrondis dans une direction
// =============================================================================

/** Hors des exposants représentables : l'encadrement abandonne. */
class OutOfRange extends Error {}

function bitLength(x: bigint): number {
	return x === 0n ? 0 : (x < 0n ? -x : x).toString(2).length;
}

/** ⌊x / 2^s⌋ ou ⌈x / 2^s⌉. */
function shiftRight(x: bigint, s: number, direction: Direction): bigint {
	const shift = BigInt(s);
	return direction === 'down' ? x >> shift : -(-x >> shift);
}

/** ⌊a / b⌋ ou ⌈a / b⌉, b ≠ 0. */
function divide(a: bigint, b: bigint, direction: Direction): bigint {
	const q = a / b;
	const exact = q * b === a;
	if (exact) return q;
	const negative = a < 0n !== b < 0n;
	// La division de BigInt tronque vers 0
	if (direction === 'down') return negative ? q - 1n : q;
	return negative ? q : q + 1n;
}

/** Ramené à PRECISION bits au plus, arrondi dans la direction donnée. */
function rounded(x: Binary, direction: Direction): Binary {
	if (!Number.isSafeInteger(x.e) || Math.abs(x.e) > MAX_BINARY_EXPONENT) throw new OutOfRange();
	const extra = bitLength(x.m) - PRECISION;
	return extra <= 0 ? x : { m: shiftRight(x.m, extra, direction), e: x.e + extra };
}

/** La même valeur, mantisse étendue à PRECISION bits (exacte). */
function widened(x: Binary): Binary {
	const missing = PRECISION - bitLength(x.m);
	return x.m === 0n || missing <= 0 ? x : { m: x.m << BigInt(missing), e: x.e - missing };
}

function negate(x: Binary): Binary {
	return { m: -x.m, e: x.e };
}

function add(a: Binary, b: Binary, direction: Direction): Binary {
	if (a.m === 0n) return rounded(b, direction);
	if (b.m === 0n) return rounded(a, direction);
	const x = widened(a);
	const y = widened(b);
	const [big, small] = x.e >= y.e ? [x, y] : [y, x];
	const gap = big.e - small.e;
	if (gap <= 2 * PRECISION) {
		return rounded({ m: (big.m << BigInt(gap)) + small.m, e: small.e }, direction);
	}
	// |small| < 2^(small.e + PRECISION) < 2^big.e : moins d'une unité de la dernière position de
	// big — la somme est entre big − 1 et big + 1 unité (sans décaler de millions de bits)
	const toward = direction === 'down' ? (small.m < 0n ? -1n : 0n) : small.m > 0n ? 1n : 0n;
	return rounded({ m: big.m + toward, e: big.e }, direction);
}

function multiply(a: Binary, b: Binary, direction: Direction): Binary {
	return rounded({ m: a.m * b.m, e: a.e + b.e }, direction);
}

function quotient(a: Binary, b: Binary, direction: Direction): Binary {
	const top = widened(a);
	const shift = 2 * PRECISION;
	return rounded(
		{ m: divide(top.m << BigInt(shift), b.m, direction), e: top.e - b.e - shift },
		direction
	);
}

/** −1, 0, 1 : a par rapport à b. */
function compare(a: Binary, b: Binary): number {
	const sa = a.m === 0n ? 0 : a.m < 0n ? -1 : 1;
	const sb = b.m === 0n ? 0 : b.m < 0n ? -1 : 1;
	if (sa !== sb) return sa < sb ? -1 : 1;
	if (sa === 0) return 0;
	// Même signe : les magnitudes par leur bit de tête, puis exactement
	const topA = bitLength(a.m) + a.e;
	const topB = bitLength(b.m) + b.e;
	if (topA !== topB) return (topA > topB ? 1 : -1) * sa;
	const e = Math.min(a.e, b.e);
	const ma = a.m << BigInt(a.e - e);
	const mb = b.m << BigInt(b.e - e);
	return ma === mb ? 0 : ma > mb ? 1 : -1;
}

// =============================================================================
// Encadrements
// =============================================================================

function point(x: Binary): Enclosure {
	return { lo: x, hi: x };
}

function fromFraction(n: bigint, d: bigint): Enclosure {
	const num: Binary = { m: n, e: 0 };
	const den: Binary = { m: d, e: 0 };
	return { lo: quotient(num, den, 'down'), hi: quotient(num, den, 'up') };
}

function sum(a: Enclosure, b: Enclosure): Enclosure {
	return { lo: add(a.lo, b.lo, 'down'), hi: add(a.hi, b.hi, 'up') };
}

function opposite(a: Enclosure): Enclosure {
	return { lo: negate(a.hi), hi: negate(a.lo) };
}

function product(a: Enclosure, b: Enclosure): Enclosure {
	const pairs: [Binary, Binary][] = [
		[a.lo, b.lo],
		[a.lo, b.hi],
		[a.hi, b.lo],
		[a.hi, b.hi]
	];
	const downs = pairs.map(([x, y]) => multiply(x, y, 'down'));
	const ups = pairs.map(([x, y]) => multiply(x, y, 'up'));
	return {
		lo: downs.reduce((min, x) => (compare(x, min) < 0 ? x : min)),
		hi: ups.reduce((max, x) => (compare(x, max) > 0 ? x : max))
	};
}

function containsZero(a: Enclosure): boolean {
	return compare(a.lo, ZERO) <= 0 && compare(a.hi, ZERO) >= 0;
}

/** 1/b, si b ne contient pas 0. */
function reciprocal(b: Enclosure): Enclosure | null {
	if (containsZero(b)) return null;
	return { lo: quotient(ONE, b.hi, 'down'), hi: quotient(ONE, b.lo, 'up') };
}

/** a^k par exponentiation rapide (k ≥ 0). */
function power(a: Enclosure, k: bigint): Enclosure {
	let result = point(ONE);
	let base = a;
	for (let rest = k; rest > 0n; rest >>= 1n) {
		if (rest & 1n) result = product(result, base);
		if (rest > 1n) base = product(base, base);
	}
	return result;
}

/** L'entier exact d'un encadrement réduit à un point entier, ou `null`. */
function integerOf(a: Enclosure): bigint | null {
	if (compare(a.lo, a.hi) !== 0) return null;
	const { m, e } = a.lo;
	if (e >= 0) return e > 64 ? null : m << BigInt(e);
	const unit = 1n << BigInt(-e);
	return m % unit === 0n ? m / unit : null;
}

function enclose(node: MathNode): Enclosure | null {
	if (isNumber(node)) {
		const { n, d } = evaluateNodeToRational(node);
		return fromFraction(n, d);
	}
	if (isDelimiter(node)) return enclose(node.content);
	if (isOpposite(node)) {
		const operand = enclose(node.operand);
		return operand === null ? null : opposite(operand);
	}
	if (isAddition(node) || isSubtraction(node) || isMultiplication(node) || isDivision(node)) {
		const [leftNode, rightNode] = isDivision(node)
			? [node.numerator, node.denominator]
			: [node.left, node.right];
		const left = enclose(leftNode);
		const right = enclose(rightNode);
		if (left === null || right === null) return null;
		if (isAddition(node)) return sum(left, right);
		if (isSubtraction(node)) return sum(left, opposite(right));
		if (isMultiplication(node)) return product(left, right);
		const inverse = reciprocal(right);
		return inverse === null ? null : product(left, inverse);
	}
	if (isSuperscript(node)) {
		const exponent = enclose(node.superscript);
		const k = exponent === null ? null : integerOf(exponent);
		const base = enclose(node.base);
		if (k === null || base === null || k > MAX_POWER || -k > MAX_POWER) return null;
		if (k === 0n) return containsZero(base) ? null : point(ONE);
		if (k > 0n) return power(base, k);
		const inverse = reciprocal(base);
		return inverse === null ? null : power(inverse, -k);
	}
	return null;
}

/**
 * L'encadrement d'une expression numérique, ou `null` si elle en contient une partie non
 * encadrée (π, une racine, une fonction, une variable) ou sort des exposants représentables.
 */
export function enclosure(node: MathNode): Enclosure | null {
	try {
		return enclose(node);
	} catch {
		// Hors des exposants représentables (`OutOfRange`), un nombre illisible : pas d'encadrement
		return null;
	}
}

/**
 * −1 ou 1 si les encadrements sont disjoints (a < b, a > b) ; 0 si ce sont deux points égaux ;
 * `null` s'ils se recouvrent — le sens n'est pas sûr.
 */
export function compareEnclosures(a: Enclosure, b: Enclosure): number | null {
	if (compare(a.hi, b.lo) < 0) return -1;
	if (compare(b.hi, a.lo) < 0) return 1;
	const points = compare(a.lo, a.hi) === 0 && compare(b.lo, b.hi) === 0;
	return points && compare(a.lo, b.lo) === 0 ? 0 : null;
}
