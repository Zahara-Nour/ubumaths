/**
 * Statistiques — lois à densité : uniforme U([a ; b]), exponentielle E(λ) et
 * normale N(μ ; σ²) (2026-10-09)
 *
 * Manche 13 (2026-10-04, maths complémentaires, PR b). La loi uniforme se
 * calcule en fractions EXACTES (longueur / (b − a)) ; l'exponentielle en
 * flottants (`Math.exp`), arrondis une seule fois à l'affichage.
 *
 * ⚠️ Pas d'import `$lib` dans ce module (cf. v1) : chemins relatifs.
 *
 * @module statistics/density
 */

import { Fraction } from './fraction';
import type { RandomVariableLaw } from './random-variable';

// =============================================================================
// Fonctions
// =============================================================================

/** 1/x (x ≠ 0) */
function inverse(x: Fraction): Fraction {
	return new Fraction(x.den, x.num);
}

function min(x: Fraction, y: Fraction): Fraction {
	return x.greaterThan(y) ? y : x;
}

function max(x: Fraction, y: Fraction): Fraction {
	return x.greaterThan(y) ? x : y;
}

/**
 * P(low ⩽ X ⩽ high) pour X ~ U([a ; b]) : la longueur de [low ; high] ∩ [a ; b]
 * sur b − a ; `null` : pas de borne de ce côté. < et ⩽ donnent la même valeur.
 */
export function uniformDensityProbability(
	a: Fraction,
	b: Fraction,
	low: Fraction | null,
	high: Fraction | null
): Fraction {
	const from = low === null ? a : max(low, a);
	const to = high === null ? b : min(high, b);
	if (!to.greaterThan(from)) return Fraction.ZERO;
	return to.sub(from).mul(inverse(b.sub(a)));
}

/** E(X) = (a + b)/2, V(X) = (b − a)²/12 */
export function uniformDensityMoments(a: Fraction, b: Fraction): RandomVariableLaw {
	const length = b.sub(a);
	const expectation = a.add(b).mul(new Fraction(1n, 2n));
	const variance = length.mul(length).mul(new Fraction(1n, 12n));
	return {
		expectation,
		variance,
		deviation: Math.sqrt(variance.toNumber()),
		exactDeviation: variance.sqrt()
	};
}

/**
 * P(low ⩽ X ⩽ high) pour X ~ E(λ) : e^(−λ·low) − e^(−λ·high), bornes ramenées
 * à 0 ; `null` : pas de borne de ce côté.
 */
export function exponentialProbability(
	lambda: number,
	low: number | null,
	high: number | null
): number {
	const from = Math.max(low ?? 0, 0);
	if (high !== null && high <= from) return 0;
	const above = from === 0 ? 1 : Math.exp(-lambda * from);
	return high === null ? above : above - Math.exp(-lambda * high);
}

/** E(X) = 1/λ, V(X) = 1/λ², σ = 1/λ */
export function exponentialMoments(lambda: Fraction): RandomVariableLaw {
	const expectation = inverse(lambda);
	const variance = expectation.mul(expectation);
	return {
		expectation,
		variance,
		deviation: expectation.toNumber(),
		exactDeviation: expectation
	};
}

/** Densité de E(λ) en x ⩾ 0 */
export function exponentialDensity(lambda: number, x: number): number {
	return x < 0 ? 0 : lambda * Math.exp(-lambda * x);
}

// =============================================================================
// Loi normale N(μ ; σ²) (2026-10-09)
// =============================================================================

/** 2/√π */
const TWO_OVER_SQRT_PI = 2 / Math.sqrt(Math.PI);

/** Au-delà, erfc se calcule par fraction continue (précision relative de la queue) */
const ERFC_SERIES_LIMIT = 2.5;

/**
 * erfc(x) pour x ⩾ 0, à la précision de la machine : série sans termes
 * alternés (erf(x) = 2/√π e^(−x²) Σ 2ⁿ x^(2n+1)/(1·3·…·(2n+1))) jusqu'à 2,5,
 * puis fraction continue de Laplace (Lentz), qui garde la précision RELATIVE
 * des petites queues (Φ(−8) ≈ 6,2 × 10⁻¹⁶). Pas de table.
 */
function erfcPositive(x: number): number {
	if (x < ERFC_SERIES_LIMIT) {
		let term = x;
		let sum = x;
		for (let n = 1; n < 500; n++) {
			term *= (2 * x * x) / (2 * n + 1);
			sum += term;
			if (term < sum * 1e-17) break;
		}
		return 1 - TWO_OVER_SQRT_PI * Math.exp(-x * x) * sum;
	}
	// erfc(x) = e^(−x²)/√π · 1/(x + (1/2)/(x + 1/(x + (3/2)/(x + …))))
	const tiny = 1e-300;
	let f = x;
	let c = x;
	let d = 0;
	for (let n = 1; n < 500; n++) {
		const a = n / 2;
		d = x + a * d;
		d = d === 0 ? 1 / tiny : 1 / d;
		c = x + a / c;
		if (c === 0) c = tiny;
		const delta = c * d;
		f *= delta;
		if (Math.abs(delta - 1) < 1e-16) break;
	}
	return Math.exp(-x * x) / (Math.sqrt(Math.PI) * f);
}

/** Φ(z) = P(Z ⩽ z) pour Z ~ N(0 ; 1) */
export function normalCdf(z: number): number {
	if (z === Infinity) return 1;
	if (z === -Infinity) return 0;
	return z >= 0 ? 1 - 0.5 * erfcPositive(z / Math.SQRT2) : 0.5 * erfcPositive(-z / Math.SQRT2);
}

/**
 * P(low ⩽ X ⩽ high) pour X ~ N(μ ; σ²) (σ > 0) ; `null` : pas de borne de ce
 * côté. Une seule borne : la queue directement, sans soustraction (précision).
 */
export function normalProbability(
	mu: number,
	sigma: number,
	low: number | null,
	high: number | null
): number {
	if (low === null && high === null) return 1;
	if (high === null) return normalCdf((mu - low!) / sigma);
	if (low === null) return normalCdf((high - mu) / sigma);
	if (high <= low) return 0;
	return normalCdf((high - mu) / sigma) - normalCdf((low - mu) / sigma);
}

/** Densité de N(μ ; σ²) en x */
export function normalDensity(mu: number, sigma: number, x: number): number {
	const z = (x - mu) / sigma;
	return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** E(X) = μ, V(X) = σ², σ = √(σ²) (exact si σ² est un carré) */
export function normalMoments(mu: Fraction, variance: Fraction): RandomVariableLaw {
	return {
		expectation: mu,
		variance,
		deviation: Math.sqrt(variance.toNumber()),
		exactDeviation: variance.sqrt()
	};
}
