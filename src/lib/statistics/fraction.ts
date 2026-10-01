/**
 * Statistiques — fractions exactes
 *
 * En 1re, les probabilités sont des fractions (1/6) et l'espérance attendue est
 * 7/2, pas 3,5000000000000004 (chantier outils statistiques, Q40). Numérateur
 * et dénominateur en `bigint` : aucun débordement, même pour V(X) sur douze
 * valeurs à dénominateurs distincts.
 *
 * ⚠️ Aucun import `$lib` : voir `statistics/describe`.
 *
 * @module statistics/fraction
 */

// =============================================================================
// Constantes
// =============================================================================

/** `1/6`, `-3`, `0,25`, `0.25`, `25 %` */
const FRACTION_REGEX = /^(-?\d+)\s*\/\s*(\d+)$/;
const DECIMAL_REGEX = /^(-?)(\d+)(?:[.,](\d+))?\s*(%?)$/;

/** Plus grand dénominateur recherché pour un décimal de la machine */
const MAX_DENOMINATOR = 10_000;

/** Écart toléré entre un décimal de la machine et sa fraction */
const MACHINE_TOLERANCE = 1e-9;

/**
 * Chiffres d'un nombre écrit (numérateur, dénominateur, ou décimal sans la
 * virgule) : au-delà, ce n'est plus une probabilité de lycée, et les calculs
 * exacts grossiraient sans fin (revue du lot 6).
 */
const MAX_DIGITS = 15;

/** Au-delà, un décimal de la machine n'est plus représenté exactement */
const MAX_MACHINE_VALUE = 1e15;

// =============================================================================
// Fonctions
// =============================================================================

function gcd(a: bigint, b: bigint): bigint {
	let x = a < 0n ? -a : a;
	let y = b < 0n ? -b : b;
	while (y !== 0n) [x, y] = [y, x % y];
	return x;
}

/**
 * Racine carrée entière exacte de `n ≥ 0`, ou null.
 *
 * ⚠️ Méthode de Newton en `bigint`, qui converge en quelques tours. Corriger
 * une estimation flottante de 1 en 1 prenait 38 s pour une racine de l'ordre
 * de 10^26, et ne finissait plus au-delà : onglet figé (revue du lot 6).
 */
function exactSqrt(n: bigint): bigint | null {
	if (n < 0n) return null;
	if (n < 2n) return n;
	let x = n;
	let y = (x + 1n) / 2n;
	while (y < x) {
		x = y;
		y = (x + n / x) / 2n;
	}
	return x * x === n ? x : null;
}

// =============================================================================
// Classe
// =============================================================================

/** Une fraction irréductible, dénominateur strictement positif. */
export class Fraction {
	readonly num: bigint;
	readonly den: bigint;

	constructor(num: bigint, den: bigint = 1n) {
		if (den === 0n) throw new RangeError('Dénominateur nul');
		const sign = den < 0n ? -1n : 1n;
		const divisor = gcd(num, den) || 1n;
		this.num = (sign * num) / divisor;
		this.den = (sign * den) / divisor;
	}

	static readonly ZERO = new Fraction(0n);
	static readonly ONE = new Fraction(1n);

	/** Une écriture d'auteur, ou null si ce n'est pas un nombre. */
	static parse(text: string): Fraction | null {
		const t = text.trim().replace('−', '-');
		const ratio = FRACTION_REGEX.exec(t);
		if (ratio) {
			if (ratio[1].replace('-', '').length > MAX_DIGITS || ratio[2].length > MAX_DIGITS)
				return null;
			const den = BigInt(ratio[2]);
			return den === 0n ? null : new Fraction(BigInt(ratio[1]), den);
		}
		const decimal = DECIMAL_REGEX.exec(t);
		if (!decimal) return null;
		const [, minus, whole, decimals = '', percent] = decimal;
		if (whole.length + decimals.length > MAX_DIGITS) return null;
		const scale = 10n ** BigInt(decimals.length) * (percent === '%' ? 100n : 1n);
		const magnitude = BigInt(whole + decimals);
		return new Fraction(minus === '-' ? -magnitude : magnitude, scale);
	}

	/**
	 * La fraction d'un décimal de la machine (`1/6` vaut 0,1666… dans une liste
	 * de l'atelier), par fractions continues, dénominateur ≤ 10 000, à 10⁻⁹
	 * près ; null si aucune ne convient (π).
	 */
	static fromNumber(value: number): Fraction | null {
		if (!Number.isFinite(value) || Math.abs(value) > MAX_MACHINE_VALUE) return null;
		if (value === 0) return Fraction.ZERO;
		// Plus petit que la tolérance : il deviendrait 0 sans prévenir
		if (Math.abs(value) < MACHINE_TOLERANCE) return null;
		let [h0, h1, k0, k1] = [0, 1, 1, 0];
		let x = value;
		for (let i = 0; i < 64; i++) {
			const a = Math.floor(x);
			[h0, h1] = [h1, a * h1 + h0];
			[k0, k1] = [k1, a * k1 + k0];
			if (k1 > MAX_DENOMINATOR) return null;
			if (Math.abs(value - h1 / k1) <= MACHINE_TOLERANCE) {
				return new Fraction(BigInt(h1), BigInt(k1));
			}
			const rest = x - a;
			if (rest === 0) break;
			x = 1 / rest;
		}
		return null;
	}

	add(other: Fraction): Fraction {
		return new Fraction(this.num * other.den + other.num * this.den, this.den * other.den);
	}

	sub(other: Fraction): Fraction {
		return new Fraction(this.num * other.den - other.num * this.den, this.den * other.den);
	}

	mul(other: Fraction): Fraction {
		return new Fraction(this.num * other.num, this.den * other.den);
	}

	equals(other: Fraction): boolean {
		return this.num === other.num && this.den === other.den;
	}

	isNegative(): boolean {
		return this.num < 0n;
	}

	/** Strictement plus grande que `other` ? */
	greaterThan(other: Fraction): boolean {
		return this.num * other.den > other.num * this.den;
	}

	toNumber(): number {
		return Number(this.num) / Number(this.den);
	}

	/** Le décimal tombe-t-il juste (dénominateur fait de 2 et de 5) ? */
	isDecimal(): boolean {
		let d = this.den;
		for (const p of [2n, 5n]) while (d % p === 0n) d /= p;
		return d === 1n;
	}

	/** Racine carrée exacte (numérateur et dénominateur carrés parfaits), ou null. */
	sqrt(): Fraction | null {
		const n = exactSqrt(this.num);
		const d = exactSqrt(this.den);
		return n === null || d === null ? null : new Fraction(n, d);
	}

	/** `7/2`, `-3/4`, `5` — signe moins ASCII (la mise en forme pose le vrai). */
	toString(): string {
		return this.den === 1n ? String(this.num) : `${this.num}/${this.den}`;
	}
}
