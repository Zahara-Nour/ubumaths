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

import type { VariationResult } from '$lib/mathAST/variations';
import { limitValueLatex, variationValueLatex } from '$lib/mathAST/variations/latex';
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

/** Le sens d'un intervalle, ramené au signe de la dérivée. */
type Direction = '+' | '-';

// =============================================================================
// Lecture de ce que `variations` a produit
// =============================================================================

/** Un intervalle d'étude, ses bornes en LaTeX et son sens. */
interface Studied {
	readonly lower: string;
	readonly upper: string;
	readonly lowerOpen: boolean;
	readonly direction: Direction;
}

/**
 * Les intervalles RÉELS, dans l'ordre.
 *
 * ⚠️ `computeVariations` insère un intervalle dégénéré `[c ; c]` étiqueté
 * « constant » à chaque point critique — mesuré sur `x^2-3x+2`, qui rend
 * `decreasing | constant | increasing`. Ce n'est pas un intervalle : c'est le
 * point lui-même, et il devient le zéro de la ligne des signes.
 */
function realIntervals(variations: VariationResult): readonly Studied[] | null {
	const kept: Studied[] = [];

	for (const { interval, derivativeSign } of variations.monotonicIntervals) {
		const lower = variationValueLatex(interval.lower.value);
		const upper = variationValueLatex(interval.upper.value);
		if (lower === upper) continue;
		// Un sens indéterminé rendrait une colonne vide au milieu du tableau :
		// mieux vaut ne rien dessiner que dessiner un trou.
		if (derivativeSign !== 'positive' && derivativeSign !== 'negative') return null;
		kept.push({
			lower,
			upper,
			lowerOpen: interval.lower.type === 'open',
			direction: derivativeSign === 'positive' ? '+' : '-'
		});
	}

	return kept.length === 0 ? null : kept;
}

/** De quel côté on approche un point : par la gauche, par la droite. */
type Side = 'left' | 'right';

/**
 * La limite en un point, approché d'un côté donné — ou `null`.
 *
 * ⚠️ `boundaryLimits` est FACULTATIF — relevé par le typecheck, que vitest ne
 * fait pas. Sans lui, les cases d'extrémité resteraient vides et les flèches
 * partiraient de nulle part : on se replie.
 */
function limitAt(variations: VariationResult, pointLatex: string, side: Side): string | null {
	for (const boundary of variations.boundaryLimits ?? []) {
		if (variationValueLatex(boundary.point) !== pointLatex) continue;
		// En ±∞ le côté est sans objet ; ailleurs, le bon côté ou « des deux »
		const direction = boundary.direction;
		if (boundary.point.type !== 'infinity' && direction !== undefined && direction !== 'both') {
			if (direction !== side) continue;
		}
		return limitValueLatex(boundary.limit);
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
 * qu'il affichait. Cas mesurés :
 *
 * - **un domaine troué** (`√(x²−1)`) : deux intervalles qui ne se touchent pas
 *   ne tiennent pas dans une seule ligne de flèches ;
 * - **un extremum situé en ±∞** : sur `1/x`, `computeVariations` en rendait
 *   QUATRE, tous aux bornes infinies — un tableau bâti là-dessus serait faux ;
 * - **une limite inconnue** ou un sens indéterminé : une case vide laisserait
 *   une flèche partir de nulle part.
 *
 * Une valeur interdite (`1/(2x-1)` en 1/2) se dessine en double barre, avec
 * la limite de chaque côté — le moteur y coupe l'étude depuis le 2026-10-09.
 *
 * @param variations - Ce que `computeVariations` a trouvé
 * @param label - Le nom de la fonction tel que l'élève l'a donné
 */
export function variationTableNode(
	variations: VariationResult,
	label = 'f'
): VariationTableNode | null {
	// Un extremum sur une borne infinie n'est pas un extremum.
	for (const extremum of variations.extrema) {
		if (extremum.x.type === 'infinity') return null;
	}

	const intervals = realIntervals(variations);
	if (intervals === null) return null;

	// Les intervalles doivent se toucher : un domaine troué se replie
	for (let index = 1; index < intervals.length; index++) {
		if (intervals[index].lower !== intervals[index - 1].upper) return null;
	}

	const criticals = new Map(variations.criticalPoints.map((c) => [variationValueLatex(c.x), c]));
	const points = [intervals[0].lower, ...intervals.map((interval) => interval.upper)];

	// ---- la ligne des signes de f'
	const signValues = new Map<string, SignValue>();
	intervals.forEach((interval) => {
		signValues.set(`${interval.lower},${interval.upper}`, {
			type: 'sign',
			value: interval.direction
		});
	});

	// ---- la ligne des variations de f
	const variationValues = new Map<string, VariationValue>();
	for (let index = 0; index < points.length; index++) {
		const point = points[index];
		const before = index === 0 ? undefined : intervals[index - 1].direction;
		const after = index === points.length - 1 ? undefined : intervals[index].direction;

		if (index === 0 || index === points.length - 1) {
			const expression = limitAt(variations, point, index === 0 ? 'right' : 'left');
			// Une case sans valeur laisserait une extrémité de flèche dans le vide.
			if (expression === null) return null;
			variationValues.set(point, { expression, position: positionAt(before, after) });
			continue;
		}

		const critical = criticals.get(point);
		if (critical !== undefined) {
			const expression = valueAt(critical);
			if (expression === null) return null;
			signValues.set(point, { type: 'marker', marker: 'zero' });
			variationValues.set(point, { expression, position: positionAt(before, after) });
			continue;
		}

		// Ni point critique ni borne : une valeur interdite, la double barre
		const left = limitAt(variations, point, 'left');
		const right = limitAt(variations, point, 'right');
		if (left === null || right === null) return null;
		signValues.set(point, { type: 'marker', marker: 'asymptote' });
		variationValues.set(point, {
			expression: '',
			position: 'center',
			marker: 'asymptote',
			limits: [
				{ expression: left, position: positionAt(before, undefined) },
				{ expression: right, position: positionAt(undefined, after) }
			]
		});
	}

	const domain: DomainPoint[] = points.map((expression, index) =>
		index === 0 && intervals[0].lowerOpen && expression !== MINUS_INFINITY
			? { expression, open: true }
			: { expression }
	);
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
	return critical.y === undefined ? null : variationValueLatex(critical.y);
}
