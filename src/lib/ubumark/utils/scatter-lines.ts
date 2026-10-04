/**
 * Nuage de points — les textes d'un ajustement (manche 15)
 *
 * Écriture des nombres (arrondi unique, milliers groupés), de l'équation, de r,
 * de la relation retrouvée par changement de variable et des prévisions. Une
 * seule source pour le bloc ```nuage (`stat-chart-scene`) et la commande
 * `.ajustement` du moteur (PR c, Q173-Q177) : mêmes calculs, mêmes textes.
 *
 * ⚠️ Imports d'exécution RELATIFS seulement : le moteur (`mathAST`) importe ce
 * module, et `pnpm math` le fait tourner sous `tsx`, sans alias `$lib` (voir
 * `statistics/describe`). Les `import type` disparaissent à la compilation.
 *
 * @module ubumark/utils/scatter-lines
 */

import type { ContentLocale } from '$lib/types/locale';
import {
	isInterpolation,
	predictX,
	predictY,
	readExactValue,
	roundFraction,
	toSafeNumber,
	type BivariateFit
} from '../../statistics/bivariate';
import { Fraction } from '../../statistics/fraction';
import {
	relationX,
	relationY,
	type DecimalFit,
	type VariableChange
} from '../../statistics/variable-change';
import { STAT_TEXT } from './stat-chart-text';

// ============================================================================
// TYPES
// ============================================================================

/** `x = 4,5` ou `y = 25`, la valeur telle qu'écrite */
export interface ScatterPrediction {
	axis: 'x' | 'y';
	value: string;
}

/** Les lignes des prévisions, et les points prévus (à dessiner) */
export interface PredictionLines {
	lines: string[];
	points: { x: number; y: number }[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Séparateur de milliers : espace insécable en français (comme `groupedCount`), virgule en anglais */
const SCATTER_THOUSANDS: Record<ContentLocale, string> = { fr: ' ', en: ',' };

/** Facteur de a dans la relation retrouvée, quand t change x : y = a·ln(x) + b */
const X_TERM: Record<VariableChange['fn'], string> = {
	ln: 'ln(x)',
	square: 'x²',
	sqrt: '√x',
	inverse: '/x'
};

// ============================================================================
// ÉCRITURE DES NOMBRES
// ============================================================================

/** Un nombre tel qu'écrit par l'auteur : vrai signe moins, séparateur selon la langue. */
export function asWritten(text: string, locale: ContentLocale): string {
	const minus = text.replace(/^-/, '−');
	if (minus.includes('/')) return minus;
	return locale === 'en' ? minus.replace(',', '.') : minus.replace('.', ',');
}

/**
 * Groupe les milliers d'un nombre déjà écrit (`613642,857` → `613 642,857`) à
 * partir de 10 000 seulement : une année ou « 1500 » (4 chiffres) ne se
 * groupe jamais, règle typographique française usuelle (fiche compilée).
 */
export function groupThousands(text: string, locale: ContentLocale): string {
	const match = /^([−-]?)(\d+)(.*)$/.exec(text);
	if (match === null || match[2].length < 5) return text;
	const grouped = match[2].replace(/\B(?=(\d{3})+(?!\d))/g, SCATTER_THOUSANDS[locale]);
	return `${match[1]}${grouped}${match[3]}`;
}

/** Un nombre arrondi une fois (Q172) : exact → écriture courte, sinon zéros gardés (`4,630`). */
export function scatterNumber(
	value: Fraction,
	places: number,
	locale: ContentLocale
): { text: string; exact: boolean } {
	const { digits, exact } = roundFraction(value, places);
	const shown = exact && digits.includes('.') ? digits.replace(/\.?0+$/, '') : digits;
	const decimal = locale === 'en' ? shown : shown.replace('.', ',');
	return { text: groupThousands(decimal.replace('-', '−'), locale), exact };
}

/**
 * L'écriture décimale la plus courte d'un flottant (`1.005`, `2.5e+28`), en
 * fraction exacte : arrondir CETTE écriture, pas le flottant (1,005 × 100
 * vaut 100,4999… et `Math.round` donnait 1,00, revue).
 */
export function shortestDecimal(value: number): Fraction {
	const match = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(Math.abs(value).toString())!;
	const decimals = match[2] ?? '';
	const exponent = Number(match[3] ?? 0) - decimals.length;
	const digits = BigInt(match[1] + decimals) * (value < 0 ? -1n : 1n);
	return exponent >= 0
		? new Fraction(digits * 10n ** BigInt(exponent))
		: new Fraction(digits, 10n ** BigInt(-exponent));
}

/**
 * Un décimal (changement de variable : ln et √ sont irrationnels) arrondi une
 * fois, demi vers le haut, par l'arrondi exact des autres valeurs du nuage ;
 * entiers groupés, jamais de notation « e ».
 */
export function scatterDecimal(
	value: number,
	places: number,
	locale: ContentLocale
): { text: string; exact: boolean } {
	return scatterNumber(shortestDecimal(value), places, locale);
}

/** `= 4,5` ou `≈ 4,630` : le signe dit si l'arrondi tombe juste */
export function related(rounded: { text: string; exact: boolean }): string {
	return `${rounded.exact ? '=' : '≈'} ${rounded.text}`;
}

// ============================================================================
// ÉQUATIONS
// ============================================================================

/**
 * `3,686x + 7,933`, `−x + 3`, `2x`, `5`, `0,5 ln(x) − 1`, `2/x + 1` : coefficients
 * déjà arrondis et écrits, `term` le facteur de a
 */
export function affineExpression(a: string, b: string, term: string): string {
	const isZero = (text: string) => /^−?[0,.]+$/.test(text);
	const joiner = term.startsWith('ln') ? ' ' : '';
	const slope = isZero(a)
		? ''
		: term.startsWith('/')
			? `${a}${term}`
			: a === '1'
				? term
				: a === '−1'
					? `−${term}`
					: `${a}${joiner}${term}`;
	if (slope === '') return b;
	if (isZero(b)) return slope;
	return b.startsWith('−') ? `${slope} − ${b.slice(1)}` : `${slope} + ${b}`;
}

/** `y = 3,686x + 7,933`, `y = −x + 3`, `y = 2x`, `y = 5` : coefficients arrondis */
export function scatterEquation(fit: BivariateFit, places: number, locale: ContentLocale): string {
	const a = scatterNumber(fit.slope, places, locale).text;
	const b = scatterNumber(fit.intercept, places, locale).text;
	return `y = ${affineExpression(a, b, 'x')}`;
}

/** Écriture d'un changement de variable : `z = ln(y)`, `t = x²` */
export function changeText(change: VariableChange): string {
	const v = change.on;
	const written: Record<VariableChange['fn'], string> = {
		ln: `ln(${v})`,
		square: `${v}²`,
		sqrt: `√${v}`,
		inverse: `1/${v}`
	};
	return `${change.variable} = ${written[change.fn]}`;
}

/**
 * Changement de variable : la droite du nuage transformé (`z = 0,401x + 0,723`)
 * et la relation retrouvée entre x et y (`y = e^(0,723) × e^(0,401x) ≈ …`),
 * coefficients arrondis. `sign` : la branche de `z = y²`.
 */
export function changedEquations(
	change: VariableChange,
	fit: DecimalFit,
	sign: number,
	places: number,
	locale: ContentLocale
): { lineEquation: string; relationText: string } {
	const round = (value: number) => scatterDecimal(value, places, locale);
	const a = round(fit.slope).text;
	const b = round(fit.intercept).text;
	const left = change.on === 'y' ? change.variable : 'y';
	const term = change.on === 'x' ? change.variable : 'x';
	const lineEquation = `${left} = ${affineExpression(a, b, term)}`;
	const linear = affineExpression(a, b, 'x');
	let relationText: string;
	if (change.on === 'x') {
		relationText = `y = ${affineExpression(a, b, X_TERM[change.fn])}`;
	} else if (change.fn === 'ln') {
		const exponent = affineExpression(a, '0', 'x');
		const factor = related(round(Math.exp(fit.intercept)));
		relationText =
			exponent === '0'
				? `y = e^(${b}) ${factor}`
				: `y = e^(${b}) × e^(${exponent}) ${factor} × e^(${exponent})`;
	} else if (change.fn === 'square') {
		relationText = `y = ${sign < 0 ? '−' : ''}√(${linear})`;
	} else if (change.fn === 'sqrt') {
		relationText = `y = (${linear})²`;
	} else {
		relationText = `y = 1/(${linear})`;
	}
	return { lineEquation, relationText };
}

// ============================================================================
// CORRÉLATION
// ============================================================================

/** r exact (`= 0,9`, `= −1`) quand r² est un carré, sinon `≈ 0,998` */
export function exactCorrelationText(
	correlation: NonNullable<BivariateFit['correlation']>,
	places: number,
	locale: ContentLocale
): string {
	if (correlation.exact !== null) return related(scatterNumber(correlation.exact, places, locale));
	const scale = 10 ** places;
	const value =
		(Math.sign(correlation.value) * Math.round(Math.abs(correlation.value) * scale)) / scale;
	const fixed = value.toFixed(places);
	const shown = locale === 'en' ? fixed : fixed.replace('.', ',');
	return `≈ ${shown.replace('-', '−')}`;
}

/** r d'un ajustement en décimal (changement de variable) */
export function decimalCorrelationText(
	correlation: number,
	places: number,
	locale: ContentLocale
): string {
	return related(scatterDecimal(correlation, places, locale));
}

// ============================================================================
// PRÉVISIONS
// ============================================================================

/** `x = 4,5`, la valeur telle qu'écrite (le parseur l'a vérifiée) */
function givenText({ axis, value }: ScatterPrediction, locale: ContentLocale): string {
	return `${axis} = ${groupThousands(asWritten(value.replaceAll('−', '-'), locale), locale)}`;
}

/** Prévisions (Q169) sur la droite exacte : la valeur, interpolation ou extrapolation */
export function exactPredictionLines(
	fit: BivariateFit,
	predictions: readonly ScatterPrediction[],
	places: number,
	locale: ContentLocale
): PredictionLines {
	const text = STAT_TEXT[locale].scatter;
	const relation = (value: Fraction) => related(scatterNumber(value, places, locale));
	const lines: string[] = [];
	const points: PredictionLines['points'] = [];
	for (const prediction of predictions) {
		const given = givenText(prediction, locale);
		const known = readExactValue(prediction.value)!;
		if (prediction.axis === 'x') {
			const y = predictY(fit, known);
			lines.push(text.prediction(given, `y ${relation(y)}`, isInterpolation(fit, known)));
			points.push({ x: toSafeNumber(known), y: toSafeNumber(y) });
			continue;
		}
		const x = predictX(fit, known);
		if (x === null) {
			lines.push(known.equals(fit.intercept) ? text.everyX(given) : text.noSolution(given));
			continue;
		}
		lines.push(text.prediction(given, `x ${relation(x)}`, isInterpolation(fit, x)));
		points.push({ x: toSafeNumber(x), y: toSafeNumber(known) });
	}
	return { lines, points };
}

/**
 * Prévisions sur la relation retrouvée (x, y d'origine), avec les
 * coefficients exacts de l'ajustement, arrondies une fois
 */
export function changedPredictionLines(
	change: VariableChange,
	fit: DecimalFit,
	sign: number,
	predictions: readonly ScatterPrediction[],
	places: number,
	locale: ContentLocale
): PredictionLines {
	const text = STAT_TEXT[locale].scatter;
	const relation = (value: number) => related(scatterDecimal(value, places, locale));
	const interpolation = (x: number) => x >= fit.minX && x <= fit.maxX;
	const lines: string[] = [];
	const points: PredictionLines['points'] = [];
	for (const prediction of predictions) {
		const given = givenText(prediction, locale);
		const known = toSafeNumber(readExactValue(prediction.value)!);
		if (prediction.axis === 'x') {
			const y = relationY(change, fit, known, sign);
			if (y === null || y === 'overflow') {
				lines.push(y === null ? text.notDefined(given) : text.tooLarge(given));
				continue;
			}
			lines.push(text.prediction(given, `y ${relation(y)}`, interpolation(known)));
			points.push({ x: known, y });
			continue;
		}
		const x = relationX(change, fit, known, sign);
		if (x === 'all') {
			lines.push(text.everyX(given));
			continue;
		}
		if (x === null || x === 'flat' || x === 'overflow') {
			// Le domaine passe avant la pente : « (pente nulle) » seulement si c'est la raison
			lines.push(
				x === 'flat'
					? text.noSolution(given)
					: x === 'overflow'
						? text.tooLarge(given)
						: text.noSolutionPlain(given)
			);
			continue;
		}
		lines.push(text.prediction(given, `x ${relation(x)}`, interpolation(x)));
		points.push({ x, y: known });
	}
	return { lines, points };
}
