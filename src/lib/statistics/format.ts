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
import type { Fraction } from './fraction';
import type { RandomVariableLaw } from './random-variable';
import { roundNumber } from './rounding';

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

/**
 * `= 15,75` si la valeur est exacte à 2 décimales, sinon `≈ 14,44` (Q13).
 * Arrondi : la règle unique de `statistics/rounding` (−0,125 → −0,13).
 */
export function formatApproxValue(value: number, locale: StatLocale): string {
	const rounded = roundNumber(value, 2);
	const exact = Math.abs(rounded - value) <= 1e-9 * Math.max(1, Math.abs(value));
	return `${exact ? '=' : '≈'} ${formatStatNumber(rounded, locale)}`;
}

/**
 * Comme `formatApproxValue`, mais une valeur sous 0,01 garde deux chiffres
 * significatifs : σ = 1/1000 s'écrivait « ≈ 0 » (`.normale Y 1000 0,001`,
 * revue du 2026-10-09). Réservé aux indicateurs d'une loi.
 */
export function formatLawApproxValue(value: number, locale: StatLocale): string {
	if (value === 0 || Math.abs(value) >= 0.01) return formatApproxValue(value, locale);
	const places = Math.min(20, 1 - Math.floor(Math.log10(Math.abs(value))));
	const rounded = roundNumber(value, places);
	const exact = Math.abs(rounded - value) <= 1e-9 * Math.abs(value);
	const digits = Math.abs(rounded)
		.toFixed(places)
		.replace(/\.?0+$/, '');
	const text = locale === 'en' ? digits : digits.replace('.', ',');
	return `${exact ? '=' : '≈'} ${rounded < 0 ? '−' : ''}${text}`;
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

/** Indicateurs d'une variable aléatoire (lot 6) */
export type LawIndicator = 'esperance' | 'variance' | 'ecart-type';

const LAW_INDICATORS: readonly LawIndicator[] = ['esperance', 'variance', 'ecart-type'];

/** `7/2`, `−3/4`, `5` : vrai signe moins. */
export function formatFraction(value: Fraction): string {
	return value.toString().replace('-', '−');
}

/**
 * Une valeur exacte en fraction, suivie de son décimal : `7/2 = 3,5` s'il tombe
 * juste, `35/12 ≈ 2,92` sinon ; un entier seul.
 */
function exactWithDecimal(value: Fraction, locale: StatLocale): string {
	const exact = formatFraction(value);
	if (value.den === 1n) return `= ${exact}`;
	return `= ${exact} ${formatLawApproxValue(value.toNumber(), locale)}`;
}

/**
 * E, V et σ d'une variable aléatoire, en français (Q40) : fractions exactes,
 * écart type approché sauf racine exacte.
 */
export function formatLawIndicators(
	name: string,
	law: RandomVariableLaw,
	locale: StatLocale,
	indicators: readonly LawIndicator[] = LAW_INDICATORS
): string[] {
	return indicators.map((indicator) => {
		switch (indicator) {
			case 'esperance':
				return `E(${name}) ${exactWithDecimal(law.expectation, locale)}`;
			case 'variance':
				return `V(${name}) ${exactWithDecimal(law.variance, locale)}`;
			case 'ecart-type':
				return law.exactDeviation === null
					? `σ(${name}) ${formatLawApproxValue(law.deviation, locale)}`
					: `σ(${name}) ${exactWithDecimal(law.exactDeviation, locale)}`;
		}
	});
}
