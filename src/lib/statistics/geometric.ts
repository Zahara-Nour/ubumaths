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

/** q^m exacte (m ⩾ 0) */
function power(q: Fraction, m: number): Fraction {
	return new Fraction(q.num ** BigInt(m), q.den ** BigInt(m));
}

/**
 * P(low ⩽ X ⩽ high) exacte, bornes ENTIÈRES ; `high` null : pas de borne
 * haute (P(X ⩾ low)). Une borne basse sous 1 compte à partir de 1.
 */
export function geometricProbability(
	p: Fraction,
	low: number,
	high: number | null
): { num: bigint; den: bigint } {
	const from = Math.max(low, 1);
	if (high !== null && high < from) return { num: 0n, den: 1n };
	const q = Fraction.ONE.sub(p);
	const above = power(q, from - 1);
	const result = high === null ? above : above.sub(power(q, high));
	return { num: result.num, den: result.den };
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
