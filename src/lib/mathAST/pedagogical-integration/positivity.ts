/**
 * Pedagogical Integration — u > 0 est-il CERTAIN ?
 *
 * Décision de David (2026-10-13) : une primitive de u′/u s'écrit `\ln|u|` en
 * général, et `\ln u` (sans valeur absolue) seulement quand u > 0 est certain :
 * pour tout réel (`x^2+1`), ou sur l'intervalle d'une intégrale définie
 * (`\frac1x` de 1 à e).
 *
 * « Certain » = u est un POLYNÔME (coefficients rationnels, `toPolynomial`)
 * et l'analyse de signe (`analyzeSign`) le prouve : domaine ℝ, zéros tous
 * résolus (`zerosUnresolved` absent), aucun zéro dans l'intervalle, et u > 0 en
 * un point de l'intervalle — u, continue, n'y change donc pas de signe
 * (théorème des valeurs intermédiaires). Pourquoi polynôme seulement :
 * `analyzeSign` ne liste pas tous les zéros d'une fonction périodique, sans
 * lever `zerosUnresolved` (revue du 2026-10-13 : cos x déclaré positif sur
 * [10.9 ; 12], où il s'annule en 7π/2 ≈ 10.9956). Les zéros d'un polynôme,
 * eux, sont en nombre fini et trouvés par le solveur, ou signalés non résolus.
 * Dans le doute : `false`, et la valeur absolue reste (toujours juste) —
 * `e^x + 1` garde donc |…|.
 *
 * @module mathAST/pedagogical-integration/positivity
 */

import type { MathNode } from '../types';
import { analyzeSign } from '../sign/analyze';
import { compile } from '../eval/compile';
import { numericValue } from '../integration/forbidden-value';
import { toPolynomial } from '../factor';

/** Un intervalle d'intégration, bornes numériques dans un ordre quelconque. */
export interface NumericInterval {
	readonly lower: MathNode;
	readonly upper: MathNode;
}

/** Marge des comparaisons numériques (un zéro sur une borne compte). */
const EPS = 1e-9;

/**
 * u > 0 est-il certain — pour tout réel, ou sur `interval` quand il est donné ?
 */
export function isCertainlyPositive(
	u: MathNode,
	variable: string,
	interval?: NumericInterval
): boolean {
	try {
		// Polynôme seulement : les zéros d'une autre fonction ne sont pas garantis complets
		if (toPolynomial(u, variable) === null) return false;
		const analysis = analyzeSign(u, { variable });
		if (analysis.zerosUnresolved || analysis.domain.kind !== 'universal') return false;

		if (interval === undefined) {
			return (
				analysis.zeros.length === 0 &&
				analysis.signedIntervals.length > 0 &&
				analysis.signedIntervals.every((s) => s.sign === 'positive')
			);
		}

		const a = numericValue(interval.lower);
		const b = numericValue(interval.upper);
		if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
		const [lo, hi] = a <= b ? [a, b] : [b, a];
		for (const zero of analysis.zeros) {
			const z = zero.approximate ?? numericValue(zero.value);
			if (!Number.isFinite(z)) return false;
			if (z >= lo - EPS && z <= hi + EPS) return false;
		}
		const middle = compile(u)({ [variable]: (lo + hi) / 2 });
		return Number.isFinite(middle) && middle > EPS;
	} catch {
		return false;
	}
}
