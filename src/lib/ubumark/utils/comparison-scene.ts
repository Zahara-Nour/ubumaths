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

// ============================================================================
// CONSTANTES
// ============================================================================

/** Les lignes, dans l'ordre de Q112 ; `group` ouvre un groupe */
const ROWS: readonly { header: string; value: (s: Summary) => number; group?: true }[] = [
	{ header: 'Effectif', value: (s) => s.count },
	{ header: 'Moyenne', value: (s) => s.mean, group: true },
	{ header: 'Écart type', value: (s) => s.deviation },
	{ header: 'Médiane', value: (s) => s.median, group: true },
	{ header: 'Q1', value: (s) => s.q1 },
	{ header: 'Q3', value: (s) => s.q3 },
	{ header: 'Écart interquartile', value: (s) => s.iqr },
	{ header: 'Minimum', value: (s) => s.min, group: true },
	{ header: 'Maximum', value: (s) => s.max },
	{ header: 'Étendue', value: (s) => s.range }
];

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Une case : la règle de « Statistiques » (Q13) — `15,75` si exact au
 * centième, `≈ 14,44` sinon ; l'effectif, un entier, tel quel.
 */
function cellText(header: string, value: number, locale: ContentLocale): string {
	if (header === 'Effectif') return formatStatNumber(value, locale);
	return formatApproxValue(value, locale).replace(/^= /, '');
}

export function buildComparisonScene(
	series: readonly { name: string; summary: Summary }[],
	locale: ContentLocale = 'fr'
): ComparisonScene {
	const names = series.map((s) => s.name);
	const title = `Comparaison de ${names.join(' et ')}`;
	return {
		kind: 'comparaison',
		title: null,
		accessibleTitle: title,
		description: title,
		pixelSize: { width: 0, height: 0 },
		indicators: [],
		columns: names,
		rows: ROWS.map((row) => ({
			header: row.header,
			cells: series.map((s) => cellText(row.header, row.value(s.summary), locale)),
			groupStart: row.group === true
		}))
	};
}
