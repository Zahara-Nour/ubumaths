/**
 * Statistiques — loi binomiale B(n ; p), en valeurs EXACTES
 *
 * Manche 11 (2026-10-03, Terminale spécialité) : P(X = k), P(X ⩽ k),
 * P(k ⩽ X ⩽ k′). Avec p = a/b, toutes les probabilités ont le dénominateur
 * commun b^n : P(X = k) = C(n, k) · a^k · (b − a)^(n − k) / b^n. Le calcul se
 * fait en entiers (BigInt), et l'arrondi décimal aussi : aucun flottant, donc
 * aucun arrondi faux sur un demi (le défaut de #671).
 *
 * ⚠️ Pas d'import `$lib` dans ce module (cf. v1) : chemins relatifs.
 *
 * @module statistics/binomial
 */

import { Fraction } from './fraction';
import type { RandomVariableLaw } from './random-variable';

// =============================================================================
// Types
// =============================================================================

export interface BinomialDistribution {
	readonly n: number;
	readonly p: Fraction;
	/** Numérateurs de P(X = k), k de 0 à n, sur le dénominateur commun */
	readonly numerators: readonly bigint[];
	/** b^n */
	readonly denominator: bigint;
}

// =============================================================================
// Constantes
// =============================================================================

/** n au plus : 1 001 numérateurs d'au plus ~3 000 chiffres, calcul instantané */
export const BINOMIAL_MAX_N = 1000;

// =============================================================================
// Fonctions
// =============================================================================

/** La loi B(n ; p), exacte. `n` entier de 1 à 1 000, `p` entre 0 et 1 (vérifiés avant). */
export function binomialDistribution(n: number, p: Fraction): BinomialDistribution {
	const a = p.num;
	const b = p.den;
	const q = b - a;
	const numerators: bigint[] = [];
	// C(n, k) mis à jour de proche en proche : C(n, k + 1) = C(n, k) · (n − k) / (k + 1)
	let coefficient = 1n;
	for (let k = 0; k <= n; k++) {
		numerators.push(coefficient * a ** BigInt(k) * q ** BigInt(n - k));
		coefficient = (coefficient * BigInt(n - k)) / BigInt(k + 1);
	}
	return { n, p, numerators, denominator: b ** BigInt(n) };
}

/** P(X ∈ A) exacte, A décrit par un prédicat sur k */
export function binomialProbability(
	law: BinomialDistribution,
	contains: (k: number) => boolean
): { num: bigint; den: bigint } {
	let num = 0n;
	law.numerators.forEach((value, k) => {
		if (contains(k)) num += value;
	});
	return { num, den: law.denominator };
}

/** E(X) = np, V(X) = np(1 − p), σ : la forme du module (`formatLawIndicators`) */
export function binomialMoments(law: BinomialDistribution): RandomVariableLaw {
	const n = new Fraction(BigInt(law.n));
	const expectation = n.mul(law.p);
	const variance = expectation.mul(Fraction.ONE.sub(law.p));
	return {
		expectation,
		variance,
		deviation: Math.sqrt(variance.toNumber()),
		exactDeviation: variance.sqrt()
	};
}

/**
 * num/den (positif, au plus 1) arrondi à `places` décimales, demi vers le
 * haut, en entiers. `digits` s'écrit avec un point (`0.850`) ; `exact` : la
 * valeur tombe juste à cette précision.
 */
export function roundExact(
	num: bigint,
	den: bigint,
	places: number
): { digits: string; exact: boolean } {
	const scale = 10n ** BigInt(places);
	const scaled = num * scale;
	const quotient = scaled / den;
	const remainder = scaled % den;
	// Demi vers le haut : reste ⩾ den / 2
	const rounded = 2n * remainder >= den ? quotient + 1n : quotient;
	const text = rounded.toString().padStart(places + 1, '0');
	const digits = places === 0 ? text : `${text.slice(0, -places)}.${text.slice(-places)}`;
	return { digits, exact: remainder === 0n };
}
