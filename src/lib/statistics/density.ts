/**
 * Statistiques — lois à densité : uniforme U([a ; b]) et exponentielle E(λ)
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
