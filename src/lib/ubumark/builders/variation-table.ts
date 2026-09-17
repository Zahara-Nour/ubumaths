/**
 * Du calcul de variations au nœud que l'application sait dessiner.
 *
 * ⚠️ **Ce module ne calcule aucune variation.** Il traduit ce que
 * `computeVariations` a trouvé — sens de variation, points critiques, extrema,
 * limites aux bornes — vers le `VariationTableNode` de
 * `VariationTable.svelte`. Recalculer ici ferait diverger le tableau de ce que
 * le reste de l'écran affirme.
 *
 * @module ubumark/builders/variation-table
 */

import type { MathNode } from '$lib/mathAST/types';
import type { VariationResult } from '$lib/mathAST/variations';
import { toLatex } from '$lib/mathAST/latex-generator';
import type {
	DomainPoint,
	SignRow,
	SignValue,
	VariationPosition,
	VariationRow,
	VariationTableNode,
	VariationValue
} from '$lib/ubumark/types/variation-table';

// =============================================================================
// Constantes
// =============================================================================

const MINUS_INFINITY = '-\\infty';
const PLUS_INFINITY = '+\\infty';

/** Le sens d'un intervalle, ramené au signe de la dérivée. */
type Direction = '+' | '-';

// =============================================================================
// Lecture de ce que `variations` a produit
// =============================================================================

/** Le LaTeX d'une borne d'intervalle. */
function endpointLatex(endpoint: { readonly value: MathNode }): string {
	return toLatex(endpoint.value);
}

/**
 * Les intervalles RÉELS, dans l'ordre.
 *
 * ⚠️ `computeVariations` insère un intervalle dégénéré `[c ; c]` étiqueté
 * « constant » à chaque point critique — mesuré sur `x^2-3x+2`, qui rend
 * `decreasing | constant | increasing`. Ce n'est pas un intervalle : c'est le
 * point lui-même, et il devient le zéro de la ligne des signes.
 */
function realIntervals(
	variations: VariationResult
): readonly { readonly direction: Direction }[] | null {
	const kept: { readonly direction: Direction }[] = [];

	for (const interval of variations.monotonicIntervals) {
		if (endpointLatex(interval.interval.lower) === endpointLatex(interval.interval.upper)) {
			continue;
		}
		if (interval.derivativeSign === 'positive') kept.push({ direction: '+' });
		else if (interval.derivativeSign === 'negative') kept.push({ direction: '-' });
		// Un sens indéterminé rendrait une colonne vide au milieu du tableau :
		// mieux vaut ne rien dessiner que dessiner un trou.
		else return null;
	}

	return kept.length === 0 ? null : kept;
}

/** Une limite aux bornes, telle que `computeVariations` la rend. */
type BoundaryLimit = NonNullable<VariationResult['boundaryLimits']>[number];

/** La limite d'une borne, en LaTeX — ou `null` si elle n'est pas exploitable. */
function limitLatex(limit: BoundaryLimit['limit']): string | null {
	if (limit === 'infinity') return PLUS_INFINITY;
	if (limit === 'negative_infinity') return MINUS_INFINITY;
	if (limit === 'indeterminate') return null;
	return toLatex(limit);
}

/**
 * La limite en une borne donnée, cherchée par son écriture.
 *
 * ⚠️ `boundaryLimits` est FACULTATIF — relevé par le typecheck, que vitest ne
 * fait pas. Sans lui, les deux cases d'extrémité resteraient vides et les
 * flèches partiraient de nulle part : on se replie.
 */
function limitAt(variations: VariationResult, pointLatex: string): string | null {
	for (const boundary of variations.boundaryLimits ?? []) {
		if (toLatex(boundary.point) === pointLatex) return limitLatex(boundary.limit);
	}
	return null;
}

// =============================================================================
// Position verticale
// =============================================================================

/**
 * Où placer une valeur dans sa case : en haut ou en bas.
 *
 * Elle se déduit des sens de part et d'autre, jamais d'un recalcul : un point
 * précédé d'une descente et suivi d'une montée est un minimum, donc en bas.
 */
function positionAt(
	before: Direction | undefined,
	after: Direction | undefined
): VariationPosition {
	if (before === undefined) return after === '-' ? 'top' : 'bottom';
	if (after === undefined) return before === '+' ? 'top' : 'bottom';
	if (before === '-' && after === '+') return 'bottom';
	if (before === '+' && after === '-') return 'top';
	return 'center';
}

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * Le tableau de variations d'une fonction — ou `null`.
 *
 * ⚠️ **`null` n'est pas un échec : c'est le repli.** L'appelant garde alors ce
 * qu'il affichait. Deux cas le déclenchent, tous deux mesurés :
 *
 * - **le domaine n'est pas ℝ** : une asymptote demande des doubles barres et
 *   des limites de part et d'autre, que cette version ne dessine pas encore ;
 * - **un extremum situé en ±∞** : sur `1/x`, `computeVariations` en rend
 *   QUATRE, tous aux bornes infinies et valant `\dfrac{1}{-\infty}`, pour une
 *   fonction qui n'en a aucun. Un tableau bâti là-dessus serait faux.
 *
 * @param variations - Ce que `computeVariations` a trouvé
 * @param label - Le nom de la fonction tel que l'élève l'a donné
 */
export function variationTableNode(
	variations: VariationResult,
	label = 'f'
): VariationTableNode | null {
	// Une asymptote ne se dessine pas encore : voir la docstring.
	if (variations.domain.kind !== 'universal') return null;

	// Un extremum sur une borne infinie n'est pas un extremum.
	for (const extremum of variations.extrema) {
		if (extremum.x.type === 'infinity') return null;
	}

	const intervals = realIntervals(variations);
	if (intervals === null) return null;

	const criticals = variations.criticalPoints;
	// Autant d'intervalles que de points critiques, plus un : sinon le tableau
	// serait décalé, et une colonne dirait le sens d'une autre.
	if (intervals.length !== criticals.length + 1) return null;

	const points = [MINUS_INFINITY, ...criticals.map((c) => toLatex(c.x)), PLUS_INFINITY];

	// ---- la ligne des signes de f'
	const signValues = new Map<string, SignValue>();
	intervals.forEach((interval, index) => {
		signValues.set(`${points[index]},${points[index + 1]}`, {
			type: 'sign',
			value: interval.direction
		});
	});
	for (const critical of criticals) {
		signValues.set(toLatex(critical.x), { type: 'marker', marker: 'zero' });
	}

	// ---- la ligne des variations de f
	const variationValues = new Map<string, VariationValue>();
	for (let index = 0; index < points.length; index++) {
		const before = index === 0 ? undefined : intervals[index - 1].direction;
		const after = index === points.length - 1 ? undefined : intervals[index].direction;

		const expression =
			index === 0 || index === points.length - 1
				? limitAt(variations, points[index])
				: valueAt(criticals[index - 1]);
		// Une case sans valeur laisserait une extrémité de flèche dans le vide.
		if (expression === null) return null;

		variationValues.set(points[index], { expression, position: positionAt(before, after) });
	}

	const domain: DomainPoint[] = points.map((expression) => ({ expression }));
	const signRow: SignRow = { type: 'sign', label: `${label}'(x)`, values: signValues };
	const variationRow: VariationRow = {
		type: 'variation',
		label: `${label}(x)`,
		values: variationValues
	};

	return {
		type: 'variation-table',
		variable: variations.variable,
		domain,
		rows: [signRow, variationRow]
	};
}

/** La valeur de la fonction en un point critique. */
function valueAt(critical: VariationResult['criticalPoints'][number]): string | null {
	return critical.y === undefined ? null : toLatex(critical.y);
}
