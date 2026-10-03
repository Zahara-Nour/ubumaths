/**
 * Scène de la comparaison de deux séries
 * ======================================
 *
 * Outils statistiques v2, lot 5, PR (a) (Q111-Q114, 2026-10-03 ; 2de `2-169`) :
 * `.comparer L M` dessine sous la ligne de l'historique un tableau d'indicateurs,
 * une colonne par série, dans l'ordre du programme (couples moyenne–écart type,
 * médiane–écart interquartile). Aucune phrase de conclusion : la comparaison
 * écrite reste le travail de l'élève.
 *
 * @module ubumark/utils/comparison-scene
 */

import type { ContentLocale } from '$lib/types/locale';
import type { Summary } from '$lib/statistics/describe';
import { formatApproxValue, formatStatNumber } from '$lib/statistics/format';
import type { ComparisonScene } from './stat-chart-scene';
import { STAT_TEXT, type IndicatorRowId } from './stat-chart-text';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Les lignes, dans l'ordre de Q112 ; `group` ouvre un groupe ; le nom vient de la langue */
const ROWS: readonly {
	id: Exclude<IndicatorRowId, 'medianClass'>;
	value: (s: Summary) => number;
	group?: true;
}[] = [
	{ id: 'count', value: (s) => s.count },
	{ id: 'mean', value: (s) => s.mean, group: true },
	{ id: 'deviation', value: (s) => s.deviation },
	{ id: 'median', value: (s) => s.median, group: true },
	{ id: 'q1', value: (s) => s.q1 },
	{ id: 'q3', value: (s) => s.q3 },
	{ id: 'iqr', value: (s) => s.iqr },
	{ id: 'min', value: (s) => s.min, group: true },
	{ id: 'max', value: (s) => s.max },
	{ id: 'range', value: (s) => s.range }
];

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Une case : la règle de « Statistiques » (Q13) — `15,75` si exact au
 * centième, `≈ 14,44` sinon ; l'effectif, un entier, tel quel.
 */
function cellText(id: IndicatorRowId, value: number, locale: ContentLocale): string {
	if (id === 'count') return formatStatNumber(value, locale);
	return formatApproxValue(value, locale).replace(/^= /, '');
}

/**
 * @param only les lignes voulues (identifiants), dans cet ordre (`indicateurs:` d'un bloc à
 *   deux séries, Q118) ; toutes, groupées, par défaut (`.comparer`)
 */
export function buildComparisonScene(
	series: readonly { name: string; summary: Summary }[],
	locale: ContentLocale = 'fr',
	only?: readonly IndicatorRowId[]
): ComparisonScene {
	const names = series.map((s) => s.name);
	const title = STAT_TEXT[locale].comparison(names);
	return {
		kind: 'comparaison',
		title: null,
		accessibleTitle: title,
		description: title,
		pixelSize: { width: 0, height: 0 },
		indicators: [],
		columns: names,
		rows: (only === undefined
			? ROWS
			: only.flatMap((id) => ROWS.filter((row) => row.id === id))
		).map((row) => ({
			id: row.id,
			header: STAT_TEXT[locale].rows[row.id],
			cells: series.map((s) => cellText(row.id, row.value(s.summary), locale)),
			// Groupes marqués seulement pour le tableau complet
			groupStart: only === undefined && row.group === true
		}))
	};
}
