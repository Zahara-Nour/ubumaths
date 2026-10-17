/**
 * MathAST Normal Form - Rational Arithmetic
 *
 * Exact arithmetic operations on rational numbers using BigInt.
 * All operations maintain the invariants:
 * - Fractions are always reduced (gcd(|n|, d) = 1)
 * - Denominator is always positive (d > 0)
 * - Sign is stored in numerator only
 */

import type { Rational, ComparisonResult } from './types';

// =============================================================================
// Constants
// =============================================================================

/** The rational number 0 (zero) */
export const ZERO: Rational = { n: 0n, d: 1n };

/** The rational number 1 (one) */
export const ONE: Rational = { n: 1n, d: 1n };

/** The rational number -1 (minus one) */
export const MINUS_ONE: Rational = { n: -1n, d: 1n };

/** The rational number 2 (two) */
export const TWO: Rational = { n: 2n, d: 1n };

/** The rational number 1/2 (one half) */
export const HALF: Rational = { n: 1n, d: 2n };

// =============================================================================
// Helper Functions
// =============================================================================

/** Euclide, pour des entiers positifs. */
function euclid(a: bigint, b: bigint): bigint {
	while (b !== 0n) {
		const temp = b;
		b = a % b;
		a = temp;
	}
	return a;
}

/** Bits de tête lus par la boucle intérieure de Lehmer : les produits restent sous 2⁵³. */
const LEHMER_HEAD_BITS = 26;

/** Sous cette taille, Euclide seul (ses divisions tiennent dans un mot machine). */
const LEHMER_FROM = 1n << 64n;

/**
 * Computes the greatest common divisor of two BigInts.
 * Always returns a positive value.
 *
 * Lehmer (Knuth, algorithme L) au-delà de 64 bits : la suite des quotients d'Euclide est lue
 * sur les 26 bits de tête, en nombres exacts, puis appliquée d'un coup aux grands entiers.
 * Euclide seul est quadratique : 1,7 s pour deux nombres de 40 000 chiffres, et une somme de
 * cinq fractions géantes prenait 4,1 s dans Calcul (2026-10-12).
 *
 * @param a - First BigInt
 * @param b - Second BigInt
 * @returns The GCD of |a| and |b|, always positive
 *
 * @example
 * gcd(12n, 8n)  // 4n
 * gcd(-12n, 8n) // 4n
 * gcd(0n, 5n)   // 5n
 */
export function gcd(a: bigint, b: bigint): bigint {
	// Work with absolute values
	a = a < 0n ? -a : a;
	b = b < 0n ? -b : b;
	if (a < b) [a, b] = [b, a];

	while (b >= LEHMER_FROM) {
		const shift = BigInt(bitLength(a) - LEHMER_HEAD_BITS);
		let aHead = Number(a >> shift);
		let bHead = Number(b >> shift);
		let A = 1,
			B = 0,
			C = 0,
			D = 1;
		// Les quotients sont sûrs tant que les deux encadrements de Knuth s'accordent
		while (bHead + C !== 0 && bHead + D !== 0) {
			const q = Math.floor((aHead + A) / (bHead + C));
			if (q !== Math.floor((aHead + B) / (bHead + D))) break;
			[A, C] = [C, A - q * C];
			[B, D] = [D, B - q * D];
			[aHead, bHead] = [bHead, aHead - q * bHead];
		}
		if (B === 0) {
			// Aucun quotient sûr : un pas d'Euclide sur les grands entiers
			[a, b] = [b, a % b];
		} else {
			[a, b] = [BigInt(A) * a + BigInt(B) * b, BigInt(C) * a + BigInt(D) * b];
		}
	}

	return euclid(a, b);
}

/**
 * Computes the least common multiple of two BigInts.
 * Always returns a positive value.
 *
 * @param a - First BigInt
 * @param b - Second BigInt
 * @returns The LCM of |a| and |b|, always positive
 *
 * @example
 * lcm(4n, 6n)   // 12n
 * lcm(-4n, 6n)  // 12n
 * lcm(0n, 5n)   // 0n
 */
export function lcm(a: bigint, b: bigint): bigint {
	// Work with absolute values
	a = a < 0n ? -a : a;
	b = b < 0n ? -b : b;

	if (a === 0n || b === 0n) return 0n;

	return (a / gcd(a, b)) * b;
}

/**
 * Returns the absolute value of a BigInt.
 *
 * @param n - A BigInt
 * @returns |n|
 */
export function absBigInt(n: bigint): bigint {
	return n < 0n ? -n : n;
}

// =============================================================================
// Constructor
// =============================================================================

/**
 * Creates a new Rational from numerator and denominator.
 * Automatically reduces the fraction and normalizes the sign.
 *
 * @param n - Numerator
 * @param d - Denominator (must not be zero)
 * @returns A reduced Rational with positive denominator
 * @throws Error if denominator is zero
 *
 * @example
 * rational(6n, 9n)   // { n: 2n, d: 3n }
 * rational(-6n, 9n)  // { n: -2n, d: 3n }
 * rational(6n, -9n)  // { n: -2n, d: 3n }
 * rational(0n, 5n)   // { n: 0n, d: 1n }
 */
export function rational(n: bigint, d: bigint): Rational {
	if (d === 0n) {
		throw new Error('Rational: denominator cannot be zero');
	}

	// Handle zero numerator
	if (n === 0n) {
		return ZERO;
	}

	// Normalize sign: move negative to numerator
	if (d < 0n) {
		n = -n;
		d = -d;
	}

	// Reduce fraction
	const g = gcd(n, d);
	return {
		n: n / g,
		d: d / g
	};
}

/**
 * Creates a Rational from an integer.
 *
 * @param n - An integer (BigInt or number)
 * @returns A Rational representing the integer
 *
 * @example
 * fromInteger(5n)  // { n: 5n, d: 1n }
 * fromInteger(5)   // { n: 5n, d: 1n }
 */
export function fromInteger(n: bigint | number): Rational {
	const bigN = typeof n === 'number' ? BigInt(n) : n;
	if (bigN === 0n) return ZERO;
	if (bigN === 1n) return ONE;
	if (bigN === -1n) return MINUS_ONE;
	return { n: bigN, d: 1n };
}

// =============================================================================
// Arithmetic Operations
// =============================================================================

/**
 * Adds two rationals.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns a + b, reduced
 *
 * @example
 * addRational({ n: 1n, d: 2n }, { n: 1n, d: 3n }) // { n: 5n, d: 6n }
 */
export function addRational(a: Rational, b: Rational): Rational {
	// a/c + b/d = (ad + bc) / cd
	const n = a.n * b.d + b.n * a.d;
	const d = a.d * b.d;
	return rational(n, d);
}

/**
 * Subtracts two rationals.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns a - b, reduced
 *
 * @example
 * subRational({ n: 1n, d: 2n }, { n: 1n, d: 3n }) // { n: 1n, d: 6n }
 */
export function subRational(a: Rational, b: Rational): Rational {
	// a/c - b/d = (ad - bc) / cd
	const n = a.n * b.d - b.n * a.d;
	const d = a.d * b.d;
	return rational(n, d);
}

/**
 * Multiplies two rationals.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns a * b, reduced
 *
 * @example
 * mulRational({ n: 2n, d: 3n }, { n: 3n, d: 4n }) // { n: 1n, d: 2n }
 */
export function mulRational(a: Rational, b: Rational): Rational {
	// Quick check for zero
	if (a.n === 0n || b.n === 0n) return ZERO;

	// (a/b) * (c/d) = ac/bd
	return rational(a.n * b.n, a.d * b.d);
}

/**
 * Divides two rationals.
 *
 * @param a - Dividend
 * @param b - Divisor (must not be zero)
 * @returns a / b, reduced
 * @throws Error if b is zero
 *
 * @example
 * divRational({ n: 2n, d: 3n }, { n: 4n, d: 5n }) // { n: 5n, d: 6n }
 */
export function divRational(a: Rational, b: Rational): Rational {
	if (b.n === 0n) {
		throw new Error('Rational: division by zero');
	}

	// Quick check for zero numerator
	if (a.n === 0n) return ZERO;

	// (a/b) / (c/d) = (ad) / (bc)
	return rational(a.n * b.d, a.d * b.n);
}

// -----------------------------------------------------------------------------
// Les quatre opérations sur des fractions DÉJÀ RÉDUITES (Henrici, Knuth 4.5.1)
// -----------------------------------------------------------------------------
// Le pgcd porte sur les termes, pas sur le résultat deux fois plus grand : une somme de cinq
// fractions d'environ 9 000 chiffres passe de 979 ms à 74 ms (pgcd de Lehmer compris,
// 2026-10-12). ⚠️ Contrat : deux fractions réduites, dénominateur positif — sinon le résultat
// peut ne pas l'être. Le dépôt construit des rationnels à la main sans les réduire
// (`{ n, d: d * 2n }`) : `addRational` et les autres gardent donc leur réduction complète, et
// seul le calcul en fractions d'`evaluate`, dont chaque valeur sort de `rational()`, s'en sert.

/** n₁/d₁ + n₂/d₂, deux fractions réduites. */
function sumOfReduced(n1: bigint, d1: bigint, n2: bigint, d2: bigint): Rational {
	const g = gcd(d1, d2);
	if (g === 1n) return { n: n1 * d2 + n2 * d1, d: d1 * d2 };
	const t = n1 * (d2 / g) + n2 * (d1 / g);
	if (t === 0n) return ZERO;
	const h = gcd(t, g);
	return { n: t / h, d: (d1 / g) * (d2 / h) };
}

/** (n₁/d₁)(n₂/d₂), deux fractions réduites : simplification croisée avant le produit. */
function productOfReduced(n1: bigint, d1: bigint, n2: bigint, d2: bigint): Rational {
	if (n1 === 0n || n2 === 0n) return ZERO;
	const g1 = gcd(n1, d2);
	const g2 = gcd(n2, d1);
	return { n: (n1 / g1) * (n2 / g2), d: (d1 / g2) * (d2 / g1) };
}

/** a + b, deux fractions réduites (voir le contrat ci-dessus). */
export function addReduced(a: Rational, b: Rational): Rational {
	return sumOfReduced(a.n, a.d, b.n, b.d);
}

/** a − b, deux fractions réduites. */
export function subReduced(a: Rational, b: Rational): Rational {
	return sumOfReduced(a.n, a.d, -b.n, b.d);
}

/** a × b, deux fractions réduites. */
export function mulReduced(a: Rational, b: Rational): Rational {
	return productOfReduced(a.n, a.d, b.n, b.d);
}

/** a ÷ b, deux fractions réduites, b non nul. */
export function divReduced(a: Rational, b: Rational): Rational {
	if (b.n === 0n) throw new Error('Rational: division by zero');
	// Le signe passe au numérateur : le dénominateur reste positif
	return b.n < 0n ? productOfReduced(a.n, a.d, -b.d, -b.n) : productOfReduced(a.n, a.d, b.d, b.n);
}

/**
 * Negates a rational.
 *
 * @param r - A rational
 * @returns -r
 *
 * @example
 * negRational({ n: 2n, d: 3n }) // { n: -2n, d: 3n }
 */
export function negRational(r: Rational): Rational {
	if (r.n === 0n) return ZERO;
	return { n: -r.n, d: r.d };
}

/**
 * Computes the absolute value of a rational.
 *
 * @param r - A rational
 * @returns |r|
 *
 * @example
 * absRational({ n: -2n, d: 3n }) // { n: 2n, d: 3n }
 */
export function absRational(r: Rational): Rational {
	if (r.n >= 0n) return r;
	return { n: -r.n, d: r.d };
}

/**
 * Computes the floor of a rational (greatest integer ≤ r).
 *
 * @param r - A rational
 * @returns floor(r) as a bigint
 *
 * @example
 * floorRational({ n: 7n, d: 2n })   // 3n  (floor(3.5) = 3)
 * floorRational({ n: -7n, d: 2n })  // -4n (floor(-3.5) = -4)
 * floorRational({ n: 6n, d: 2n })   // 3n  (floor(3) = 3)
 */
export function floorRational(r: Rational): bigint {
	if (r.n >= 0n) {
		// For positive: BigInt division truncates toward zero = floor
		return r.n / r.d;
	} else {
		// For negative: need to round down (more negative)
		// floor(-7/2) = floor(-3.5) = -4
		const quotient = r.n / r.d;
		const remainder = r.n % r.d;
		return remainder !== 0n ? quotient - 1n : quotient;
	}
}

/**
 * Computes the ceiling of a rational (smallest integer ≥ r).
 *
 * @param r - A rational
 * @returns ceil(r) as a bigint
 *
 * @example
 * ceilRational({ n: 7n, d: 2n })   // 4n  (ceil(3.5) = 4)
 * ceilRational({ n: -7n, d: 2n })  // -3n (ceil(-3.5) = -3)
 * ceilRational({ n: 6n, d: 2n })   // 3n  (ceil(3) = 3)
 */
export function ceilRational(r: Rational): bigint {
	if (r.n <= 0n) {
		// For negative or zero: BigInt division truncates toward zero = ceil
		return r.n / r.d;
	} else {
		// For positive: need to round up
		// ceil(7/2) = ceil(3.5) = 4
		const quotient = r.n / r.d;
		const remainder = r.n % r.d;
		return remainder !== 0n ? quotient + 1n : quotient;
	}
}

/**
 * Rounds a rational to the nearest integer (half-up rounding).
 *
 * @param r - A rational
 * @returns round(r) as a bigint
 *
 * @example
 * roundRational({ n: 7n, d: 2n })   // 4n  (round(3.5) = 4)
 * roundRational({ n: 5n, d: 2n })   // 3n  (round(2.5) = 3)
 * roundRational({ n: -7n, d: 2n })  // -4n (round(-3.5) = -4)
 * roundRational({ n: 3n, d: 2n })   // 2n  (round(1.5) = 2)
 */
export function roundRational(r: Rational): bigint {
	// Round half-up: round(n/d) = floor(n/d + 0.5) = floor((2n + d) / (2d))
	// For negative: round(-3.5) = -4 (rounds away from zero at .5)
	const quotient = r.n / r.d;
	const remainder = absBigInt(r.n % r.d);

	// Check if |remainder| >= d/2, i.e., 2*|remainder| >= d
	const shouldRoundAway = 2n * remainder >= r.d;

	if (r.n >= 0n) {
		return shouldRoundAway ? quotient + 1n : quotient;
	} else {
		return shouldRoundAway ? quotient - 1n : quotient;
	}
}

/**
 * Computes the reciprocal (inverse) of a rational.
 *
 * @param r - A rational (must not be zero)
 * @returns 1/r
 * @throws Error if r is zero
 *
 * @example
 * reciprocal({ n: 2n, d: 3n }) // { n: 3n, d: 2n }
 */
export function reciprocal(r: Rational): Rational {
	if (r.n === 0n) {
		throw new Error('Rational: reciprocal of zero');
	}

	// Handle sign normalization
	if (r.n < 0n) {
		return { n: -r.d, d: -r.n };
	}
	return { n: r.d, d: r.n };
}

/**
 * Raises a rational to an integer power.
 *
 * @param base - The base rational
 * @param exp - The exponent (must be a safe integer)
 * @returns base^exp
 * @throws Error if 0^negative
 *
 * @example
 * powRational({ n: 2n, d: 3n }, 2)  // { n: 4n, d: 9n }
 * powRational({ n: 2n, d: 3n }, -1) // { n: 3n, d: 2n }
 */
export function powRational(base: Rational, exp: number): Rational {
	if (!Number.isInteger(exp)) {
		throw new Error('Rational: power exponent must be an integer');
	}

	// Handle special cases
	if (exp === 0) return ONE;
	if (exp === 1) return base;
	if (base.n === 0n) {
		if (exp < 0) throw new Error('Rational: 0 raised to negative power');
		return ZERO;
	}
	if (isOne(base)) return ONE;
	if (exp === -1) return reciprocal(base);

	// Une fraction irréductible élevée à une puissance reste irréductible : nᵏ / dᵏ par
	// la puissance native de BigInt, la base réduite une seule fois. ⚠️ Pas de
	// multiplications successives réduites chacune par un pgcd : (101/100)^100000
	// prenait 194 s (2 ms ainsi), (1+1/10000)^10000 bloquait Calcul 14 s (2026-10-12)
	let reduced = rational(base.n, base.d);
	if (exp < 0) {
		reduced = reciprocal(reduced);
		exp = -exp;
	}
	const e = BigInt(exp);
	return { n: reduced.n ** e, d: reduced.d ** e };
}

// =============================================================================
// Comparison Operations
// =============================================================================

/**
 * Compares two rationals.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 *
 * @example
 * compareRational({ n: 1n, d: 3n }, { n: 1n, d: 2n }) // -1 (1/3 < 1/2)
 */
export function compareRational(a: Rational, b: Rational): ComparisonResult {
	// Compare a/c with b/d by comparing ad with bc
	const left = a.n * b.d;
	const right = b.n * a.d;

	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

/**
 * Checks if two rationals are equal.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns true if a = b
 */
export function equalRational(a: Rational, b: Rational): boolean {
	// Since rationals are always reduced, we can compare directly
	return a.n === b.n && a.d === b.d;
}

// =============================================================================
// Predicates
// =============================================================================

/**
 * Checks if a rational is zero.
 *
 * @param r - A rational
 * @returns true if r = 0
 */
export function isZero(r: Rational): boolean {
	return r.n === 0n;
}

/**
 * Checks if a rational is one.
 *
 * @param r - A rational
 * @returns true if r = 1
 */
export function isOne(r: Rational): boolean {
	return r.n === 1n && r.d === 1n;
}

/**
 * Checks if a rational is minus one.
 *
 * @param r - A rational
 * @returns true if r = -1
 */
export function isMinusOne(r: Rational): boolean {
	return r.n === -1n && r.d === 1n;
}

/**
 * Checks if a rational is negative.
 *
 * @param r - A rational
 * @returns true if r < 0
 */
export function isNegative(r: Rational): boolean {
	return r.n < 0n;
}

/**
 * Checks if a rational is positive.
 *
 * @param r - A rational
 * @returns true if r > 0
 */
export function isPositive(r: Rational): boolean {
	return r.n > 0n;
}

/**
 * Checks if a rational is an integer.
 *
 * @param r - A rational
 * @returns true if r has denominator 1
 */
export function isInteger(r: Rational): boolean {
	return r.d === 1n;
}

// =============================================================================
// Conversion
// =============================================================================

/**
 * Les bits du quotient entier calculé quand les termes ne tiennent pas dans un
 * flottant : au moins 54, plus un bit « collant » pour un arrondi correct.
 */
const QUOTIENT_BITS = 64;

/** Le nombre de bits d'un entier positif. */
function bitLength(x: bigint): number {
	return x === 0n ? 0 : x.toString(2).length;
}

/**
 * Converts a rational to an approximate floating-point number.
 *
 * ⚠️ Des termes au-delà de 10³⁰⁸ ne se convertissent pas un à un : (1001/1000)¹⁰⁰⁰
 * porte 3001 chiffres en haut et en bas, et `Number(n) / Number(d)` rendait
 * Infinity / Infinity = NaN pour une valeur de 2,7169 (2026-10-11 : la suite qui
 * tend vers e, les intérêts composés, π²⁰ en mode décimal). Dans ce cas, le
 * quotient est calculé en entiers sur 64 bits, puis remis à l'échelle par des
 * puissances de 2 (exactes). Un vrai débordement reste un débordement :
 * Infinity au-delà du plus grand flottant, 0 en deçà du plus petit.
 *
 * @param r - A rational
 * @returns Approximate floating-point value
 *
 * @example
 * rationalToNumber({ n: 1n, d: 3n }) // 0.3333333333333333
 */
export function rationalToNumber(r: Rational): number {
	const quotient = Number(r.n) / Number(r.d);
	// Cas ordinaire : les deux termes tiennent dans un flottant (division par zéro : inchangée)
	if ((Number.isFinite(quotient) && (quotient !== 0 || r.n === 0n)) || r.d === 0n) {
		return quotient;
	}

	const negative = r.n < 0n !== r.d < 0n;
	const n = absBigInt(r.n);
	const d = absBigInt(r.d);
	// La valeur vaut environ 2^magnitude ; q = n·2^shift / d porte environ QUOTIENT_BITS bits
	const magnitude = bitLength(n) - bitLength(d);
	const shift = QUOTIENT_BITS - magnitude;
	const numerator = shift >= 0 ? n << BigInt(shift) : n;
	const denominator = shift >= 0 ? d : d << BigInt(-shift);
	let q = numerator / denominator;
	// Bit collant : un reste non nul départage une égalité apparente (2⁵³ + 1 + ε
	// s'arrondit à 2⁵³ + 2, pas à 2⁵³) — sans lui, troncature puis arrondi = 1 ulp d'écart
	if (numerator % denominator !== 0n) q |= 1n;
	// valeur = q · 2^-shift, en deux facteurs : sous ~2⁻¹⁰¹⁰, 2^-shift seul
	// sous-dépasserait vers 0 (shift > 1074) et la valeur, dénormale, serait perdue
	const half = Math.trunc(-shift / 2);
	const value = Number(q) * 2 ** half * 2 ** (-shift - half);
	return negative ? -value : value;
}

/**
 * Converts a rational to a string representation.
 *
 * @param r - A rational
 * @returns String like "3/4" or "5" (if integer)
 */
export function rationalToString(r: Rational): string {
	if (r.d === 1n) {
		return r.n.toString();
	}
	return `${r.n}/${r.d}`;
}

/**
 * Parses a string into a rational.
 * Supports formats: "3", "-3", "3/4", "-3/4"
 *
 * @param s - String to parse
 * @returns A rational
 * @throws Error if string is invalid
 */
export function parseRational(s: string): Rational {
	const trimmed = s.trim();

	if (trimmed.includes('/')) {
		const [numStr, denStr] = trimmed.split('/');
		const n = BigInt(numStr.trim());
		const d = BigInt(denStr.trim());
		return rational(n, d);
	}

	return fromInteger(BigInt(trimmed));
}

/**
 * Converts a floating-point number to a Rational.
 *
 * Used to convert results from transcendental functions (Math.*)
 * back to Rational for continued exact BigInt arithmetic.
 *
 * The conversion uses a decimal scale factor to represent the float
 * as a fraction, then reduces it.
 *
 * @param x - Floating-point number to convert
 * @param precision - Number of decimal places to preserve (default: 15)
 * @returns A Rational approximating the float
 * @throws Error if x is not finite (NaN, Infinity, -Infinity)
 *
 * @example
 * floatToRational(0.5)     // { n: 1n, d: 2n }
 * floatToRational(Math.PI) // Rational approximation of π
 * floatToRational(0)       // { n: 0n, d: 1n }
 */
export function floatToRational(x: number, precision: number = 15): Rational {
	if (!Number.isFinite(x)) {
		throw new Error(`Cannot convert ${x} to Rational`);
	}

	if (x === 0) return ZERO;

	// Entier exact (floor, round, min… d'un entier) : sans passer par x × 10¹⁵, qui dépasse
	// 2⁵³ dès x ≥ 10⁴ et ne redonne plus un entier (mod refusait alors l'argument).
	// `isInteger` et non `isSafeInteger` : au-delà de 2⁵³ tout flottant fini est entier,
	// et `BigInt(x)` en donne la valeur exacte (infini et NaN : false)
	if (Number.isInteger(x)) return rational(BigInt(x), 1n);

	// Adjust scale based on magnitude to preserve precision for very small numbers.
	// For x = 1e-100 with precision 15, a fixed 10^15 scale would round to 0.
	// Instead, use 10^(precision - min(0, magnitude)) so the scaled value has
	// enough significant digits.
	const magnitude = Math.floor(Math.log10(Math.abs(x)));
	const neededDigits = precision - Math.min(0, magnitude);

	// Cap at 300 to avoid Number(scale) becoming Infinity (max float ~1.8e308)
	const safeDigits = Math.min(neededDigits, 300);
	const scale = 10n ** BigInt(safeDigits);
	const numerator = BigInt(Math.round(x * Number(scale)));

	// rational() will automatically reduce the fraction
	return rational(numerator, scale);
}
