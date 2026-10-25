/**
 * Atelier — le garde-fou des étapes de `.domaine`
 *
 * Avant de montrer les étapes de `pedagogical-domain` sous une ligne
 * `.domaine`, l'ensemble qu'elles CONCLUENT est comparé au domaine du moteur
 * (décision de David, 2026-10-13). Comparé PAR VALEUR, jamais par écriture :
 * ℝ \ {0} et ]−∞ ; 0[ ∪ ]0 ; +∞[ sont le même ensemble.
 *
 * La comparaison ne fait pas confiance au pipeline (qui vérifie déjà que ses
 * étapes prouvent son domaine, #1347) : elle teste l'appartenance de chaque
 * borne, de chaque point exclu, de leurs voisins immédiats et d'une grille de
 * points. Deux réunions d'intervalles privées de points isolés qui
 * s'accordent en tous ces points sont égales : c'est seulement là qu'elles
 * peuvent changer d'avis.
 *
 * ⚠️ Les points sondés sont calculés avec les MÊMES évaluateurs que
 * `containsValue` : `endpointToNumber` pour les bornes et les points exclus,
 * `evaluateNodeToApproximatedNumber` pour une exclusion périodique. Avec
 * `compile`, √2 tombait un ulp au-dessus de la borne que lit `containsValue` :
 * [√2 ; +∞[ et ]√2 ; +∞[ passaient pour égaux (revue du 2026-10-13).
 *
 * Limite : une exclusion périodique n'est sondée que sur ±4 périodes autour
 * de sa valeur de base (plus la grille). Deux familles qui coïncident là et
 * diffèrent plus loin passeraient pour égales ; le moteur ne produit que des
 * familles a + kp, qu'un tel échantillon départage.
 *
 * Dans le doute — une borne littérale (`]a ; +∞[`), un domaine par
 * conditions —, `false` : pas d'étapes.
 *
 * @module atelier/domain-steps-check
 */

import type { MathNode } from '$lib/mathAST/types';
import type { Domain } from '$lib/mathAST/domain/types';
import { containsValue } from '$lib/mathAST/domain/algebra';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import { computeNumericValue } from '$lib/mathAST/eval/numeric-value';

// =============================================================================
// Constantes
// =============================================================================

/** Des points de passage, loin des valeurs interdites usuelles (0, ±1, π/2). */
const GRID: readonly number[] = [
	-1000.3, -97.1, -10.7, -4.4, -2.7, -1.3, -0.45, 0.35, 0.8, 1.55, 2.4, 3.1, 4.6, 10.9, 98.3, 1000.7
];

/** L'écart d'un voisin immédiat, relatif à la valeur. */
const NEIGHBOUR = 1e-6;

/** Combien de périodes, de part et d'autre, pour une exclusion périodique. */
const PERIODS = 4;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les deux ensembles sont-ils égaux, par valeur ? `false` dès qu'une valeur
 * ne s'évalue pas en nombre.
 */
export function sameDomainByValue(a: Domain, b: Domain): boolean {
	const critical = [...criticalPoints(a), ...criticalPoints(b)];
	const probes = [...GRID];
	for (const c of critical) {
		if (c === null) return false;
		const step = NEIGHBOUR * Math.max(1, Math.abs(c));
		probes.push(c - step, c, c + step);
	}
	return probes.every((x) => containsValue(a, x) === containsValue(b, x));
}

/**
 * Là où l'ensemble peut changer d'avis : bornes finies, points exclus,
 * valeurs exclues périodiquement (quelques périodes). `null` pour une valeur
 * qui ne s'évalue pas ; un domaine par conditions n'en a jamais de sûre.
 */
function criticalPoints(domain: Domain): (number | null)[] {
	switch (domain.kind) {
		case 'universal':
		case 'empty':
			return [];
		case 'condition_domain':
			return [null];
		case 'periodic_exclusion': {
			const base = computeNumericValue(domain.basePoint);
			const period = computeNumericValue(domain.period);
			if (base === null || period === null || period === 0) return [null];
			const points: number[] = [];
			for (let k = -PERIODS; k <= PERIODS; k++) points.push(base + k * period);
			return points;
		}
		case 'interval_set': {
			const points: (number | null)[] = [];
			for (const interval of domain.intervals) {
				points.push(boundOf(interval.lower.value), boundOf(interval.upper.value));
			}
			for (const excluded of domain.excludedPoints) points.push(endpointOf(excluded.value));
			// Les infinis ne sont pas des points à sonder
			return points.filter((p) => p === null || Number.isFinite(p));
		}
	}
}

/** Une borne : ±∞ comprises (écartées ensuite), sinon sa valeur. */
function boundOf(node: MathNode): number | null {
	if (node.type === 'infinity') return node.sign === 'positive' ? Infinity : -Infinity;
	return endpointOf(node);
}

/** Une borne ou un point exclu, lu comme le lit `containsValue` ; `null` sinon. */
function endpointOf(node: MathNode): number | null {
	const value = endpointToNumber(node);
	return Number.isFinite(value) ? value : null;
}
