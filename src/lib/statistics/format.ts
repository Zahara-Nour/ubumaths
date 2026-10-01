/**
 * Statistiques — écrire les indicateurs en français
 *
 * **Une** mise en forme pour l'action « Statistiques » de l'atelier, la
 * commande `.stats` du moteur et les lignes d'indicateurs des diagrammes
 * (chantier outils statistiques, Q38) : mêmes libellés accentués, même ordre,
 * même règle d'arrondi.
 *
 * ⚠️ Aucun import `$lib` : voir `statistics/describe`.
 *
 * @module statistics/format
 */

import type { Summary } from './describe';

// =============================================================================
// Types
// =============================================================================

/** Langue d'un document : séparateur décimal */
export type StatLocale = 'fr' | 'en';

// =============================================================================
// Fonctions
// =============================================================================

/** Retire le bruit flottant : 1.1000000000000003 → 1.1 */
function clean(value: number): number {
	const rounded = Number(value.toPrecision(12));
	return Object.is(rounded, -0) ? 0 : rounded;
}

/** Un nombre écrit tel quel, séparateur selon la langue, vrai signe moins. */
export function formatStatNumber(value: number, locale: StatLocale): string {
	const v = clean(value);
	const text = String(Math.abs(v));
	const decimal = locale === 'en' ? text : text.replace('.', ',');
	return v < 0 ? `−${decimal}` : decimal;
}

/** `= 15,75` si la valeur est exacte à 2 décimales, sinon `≈ 14,44` (Q13). */
export function formatApproxValue(value: number, locale: StatLocale): string {
	const rounded = Math.round(value * 100) / 100;
	const exact = Math.abs(rounded - value) <= 1e-9 * Math.max(1, Math.abs(value));
	return `${exact ? '=' : '≈'} ${formatStatNumber(rounded, locale)}`;
}

/** Les indicateurs d'une série, une ligne chacun, dans l'ordre du programme. */
export function formatSummary(summary: Summary, locale: StatLocale): string[] {
	const v = (value: number) => formatApproxValue(value, locale);
	return [
		`Effectif : ${formatStatNumber(summary.count, locale)}`,
		`Moyenne ${v(summary.mean)}`,
		`Médiane ${v(summary.median)}`,
		`Q1 ${v(summary.q1)}`,
		`Q3 ${v(summary.q3)}`,
		`Écart interquartile ${v(summary.iqr)}`,
		`D1 ${v(summary.d1)}`,
		`D9 ${v(summary.d9)}`,
		`Minimum ${v(summary.min)}`,
		`Maximum ${v(summary.max)}`,
		`Étendue ${v(summary.range)}`,
		`Variance ${v(summary.variance)}`,
		`Écart type ${v(summary.deviation)}`
	];
}
