/**
 * Statistiques — loi uniforme discrète U(a ; b), en valeurs EXACTES
 *
 * Manche 13 (2026-10-04, maths complémentaires) : X prend chacune des
 * N = b − a + 1 valeurs entières de a à b avec la probabilité 1/N.
 *
 * ⚠️ Pas d'import `$lib` dans ce module (cf. v1) : chemins relatifs.
 *
 * @module statistics/uniform
 */

import { Fraction } from './fraction';
import type { RandomVariableLaw } from './random-variable';

// =============================================================================
// Constantes
// =============================================================================

/** Nombre de valeurs au plus, comme n + 1 pour la loi binomiale */
export const UNIFORM_MAX_VALUES = 1000;

// =============================================================================
// Fonctions
// =============================================================================

/** P(low ⩽ X ⩽ high) exacte, bornes entières : les valeurs comptées sur N */
export function uniformProbability(
	a: number,
	b: number,
	low: number,
	high: number
): { num: bigint; den: bigint } {
	const count = Math.max(0, Math.min(high, b) - Math.max(low, a) + 1);
	return { num: BigInt(count), den: BigInt(b - a + 1) };
}

/** E(X) = (a + b)/2, V(X) = (N² − 1)/12 */
export function uniformMoments(a: number, b: number): RandomVariableLaw {
	const n = BigInt(b - a + 1);
	const expectation = new Fraction(BigInt(a + b), 2n);
	const variance = new Fraction(n * n - 1n, 12n);
	return {
		expectation,
		variance,
		deviation: Math.sqrt(variance.toNumber()),
		exactDeviation: variance.sqrt()
	};
}
