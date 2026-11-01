/**
 * Droite graduée à placer — graduations et réponse
 * ================================================
 *
 * L'élève pose UN point sur une graduation (chantier
 * `docs/wip/reponses-a-placer-progress.md` § 4, 6). Une graduation se désigne
 * par son rang k (0 = `start`) ; sa réponse s'écrit par `placerAnswer`, la même
 * fonction pour la réponse attendue et pour celle de l'élève : le juge ordinaire
 * les compare sans souci d'écriture (`placer: 0.75` ou `3/4`, même réponse).
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/number-line-placer
 */

import type { NumberLineConfig } from '../types/number-line';
import { numVal } from './number-line-render';

// Constantes

/** Plus grand dénominateur cherché pour écrire une graduation en fraction */
const MAX_DENOMINATOR = 1000;

// Functions

/** Écart toléré entre une valeur et une graduation (calculs en virgule flottante) */
function tolerance(config: NumberLineConfig): number {
	return 1e-9 * Math.max(1, Math.abs(numVal(config.step)));
}

/** Nombre de graduations, `start` et `end` compris */
export function graduationCount(config: NumberLineConfig): number {
	const start = numVal(config.start);
	const step = numVal(config.step);
	return Math.floor((numVal(config.end) - start) / step + 1e-9) + 1;
}

/** Valeur de la graduation de rang k */
export function graduationValue(config: NumberLineConfig, k: number): number {
	return numVal(config.start) + k * numVal(config.step);
}

/** Rang de la graduation qui porte cette valeur ; null hors de la droite ou entre deux graduations */
export function indexOfValue(config: NumberLineConfig, value: number): number | null {
	if (!Number.isFinite(value)) return null;
	const k = Math.round((value - numVal(config.start)) / numVal(config.step));
	if (k < 0 || k >= graduationCount(config)) return null;
	return Math.abs(graduationValue(config, k) - value) <= tolerance(config) ? k : null;
}

/** Rang de la graduation la plus proche d'une valeur, ramené sur la droite */
export function nearestIndex(config: NumberLineConfig, value: number): number {
	const k = Math.round((value - numVal(config.start)) / numVal(config.step));
	return Math.max(0, Math.min(graduationCount(config) - 1, k));
}

/** Fraction p/q (q > 0, la plus petite) d'une valeur ; null si aucune jusqu'à MAX_DENOMINATOR */
function asFraction(value: number): { p: number; q: number } | null {
	for (let q = 1; q <= MAX_DENOMINATOR; q++) {
		const p = Math.round(value * q);
		if (Math.abs(p / q - value) < 1e-9) return { p, q };
	}
	return null;
}

/** Un dénominateur de la forme 2^a·5^b s'écrit en décimal fini */
function isDecimalDenominator(q: number): boolean {
	let rest = q;
	while (rest % 2 === 0) rest /= 2;
	while (rest % 5 === 0) rest /= 5;
	return rest === 1;
}

/**
 * Valeur décimale sans erreur d'arrondi visible (`0.30000000000000004` → `0.3`),
 * jamais en notation exponentielle (`1e-7` : illisible au juge, `e` = Euler au dessin)
 */
export function decimalString(value: number): string {
	const rounded = Math.round(value * 1e9) / 1e9;
	const text = rounded.toFixed(9).replace(/\.?0+$/, '');
	return text === '-0' ? '0' : text;
}

/**
 * Réponse de la graduation k : entier (`7`), décimal à point (`0.75`), sinon
 * fraction LaTeX (`\frac{4}{3}`)
 */
export function placerAnswer(config: NumberLineConfig, k: number): string {
	const value = graduationValue(config, k);
	const fraction = asFraction(value);
	if (fraction === null || isDecimalDenominator(fraction.q)) return decimalString(value);
	const sign = fraction.p < 0 ? '-' : '';
	return `${sign}\\frac{${Math.abs(fraction.p)}}{${fraction.q}}`;
}

/** Rang de la graduation d'une réponse (écrite par `placerAnswer`) ; null si vide ou illisible */
export function indexOfAnswer(config: NumberLineConfig, answer: string): number | null {
	const text = answer.trim();
	if (text === '') return null;
	const frac = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(text);
	if (frac) {
		const value = (frac[1] === '-' ? -1 : 1) * (Number(frac[2]) / Number(frac[3]));
		return indexOfValue(config, value);
	}
	if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
	return indexOfValue(config, Number(text));
}

/**
 * La graduation k écrite pour l'élève : `7`, `0,3`, `4/3`. Sur une droite au pas
 * écrit en fraction (`step: 1/5`), la graduation se lit en fraction du pas,
 * même quand elle s'écrirait en décimal : `4/5`, `5/10`, jamais `0,8`.
 */
export function placerText(config: NumberLineConfig, k: number): string {
	const value = graduationValue(config, k);
	const stepFraction = config.step.expression.includes('/')
		? asFraction(numVal(config.step))
		: null;
	if (stepFraction !== null) {
		const numerator = Math.round(value * stepFraction.q);
		// Départ hors des multiples du pas (`start: 0.5`, `step: 1/5`) : écriture ordinaire
		if (Math.abs(numerator - value * stepFraction.q) < 1e-9) {
			if (numerator % stepFraction.q === 0) return String(numerator / stepFraction.q);
			return `${numerator}/${stepFraction.q}`;
		}
	}
	const fraction = asFraction(value);
	if (fraction === null || isDecimalDenominator(fraction.q)) {
		return decimalString(value).replace('.', ',');
	}
	return `${fraction.p}/${fraction.q}`;
}
