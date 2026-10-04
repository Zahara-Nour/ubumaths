/**
 * Statistiques — loi géométrique G(p), en valeurs EXACTES
 *
 * Manche 13 (2026-10-04, maths complémentaires) : X compte les épreuves
 * jusqu'au premier succès, valeurs 1, 2, 3… Avec q = 1 − p,
 * P(X > k) = q^k, donc P(low ⩽ X ⩽ high) = q^(low − 1) − q^high : un calcul en
 * fractions (BigInt), arrondi une seule fois à l'affichage (`roundExact`).
 *
 * ⚠️ Pas d'import `$lib` dans ce module (cf. v1) : chemins relatifs.
 *
 * @module statistics/geometric
 */

import { Fraction } from './fraction';
import type { RandomVariableLaw } from './random-variable';

// =============================================================================
// Constantes
// =============================================================================

/** Bornes des probabilités demandées au plus : q^1 000 reste instantané */
export const GEOMETRIC_MAX_K = 1000;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * P(low ⩽ X ⩽ high) exacte, bornes ENTIÈRES ; `high` null : pas de borne
 * haute (P(X ⩾ low)). Une borne basse sous 1 compte à partir de 1.
 *
 * ⚠️ En entiers bruts, SANS réduction : avec p = a/b irréductible, q = (b − a)/b
 * l'est aussi, et ses puissances encore. Passer par `Fraction` lançait un PGCD
 * sur ~50 000 bits par probabilité (3 s pour un p à 14 chiffres près de
 * k = 1 000, revue). `roundExact` n'exige pas une fraction réduite.
 */
export function geometricProbability(
	p: Fraction,
	low: number,
	high: number | null
): { num: bigint; den: bigint } {
	const from = Math.max(low, 1);
	if (high !== null && high < from) return { num: 0n, den: 1n };
	const b = p.den;
	const q = b - p.num;
	// q^(from − 1) − q^high = (q^(from − 1) · b^(high − from + 1) − q^high) / b^high
	if (high === null) return { num: q ** BigInt(from - 1), den: b ** BigInt(from - 1) };
	return {
		num: q ** BigInt(from - 1) * b ** BigInt(high - from + 1) - q ** BigInt(high),
		den: b ** BigInt(high)
	};
}

/**
 * P(X ⩾ low | X ⩾ given) exacte (low ⩾ given, bornes entières) : sans mémoire,
 * q^(low − given), bornes ramenées à 1. Pas de division de deux probabilités.
 */
export function geometricConditional(
	p: Fraction,
	low: number,
	given: number
): { num: bigint; den: bigint } {
	const m = BigInt(Math.max(low, 1) - Math.max(given, 1));
	return { num: (p.den - p.num) ** m, den: p.den ** m };
}

/** E(X) = 1/p, V(X) = (1 − p)/p², σ : la forme du module (`formatLawIndicators`) */
export function geometricMoments(p: Fraction): RandomVariableLaw {
	const expectation = new Fraction(p.den, p.num);
	const variance = Fraction.ONE.sub(p).mul(expectation).mul(expectation);
	return {
		expectation,
		variance,
		deviation: Math.sqrt(variance.toNumber()),
		exactDeviation: variance.sqrt()
	};
}
