/**
 * Boîte à moustaches à construire — calcul pur
 * ============================================
 *
 * ` ```boite-a-moustaches ` + `placer:` (palier 2, journal
 * `docs/wip/boite-a-moustaches-progress.md` § 5) : l'élève pose les cinq traits
 * de chaque boîte à construire (minimum, Q1, médiane, Q3, maximum) sur l'axe
 * écrit par le prof, aimantés à ses graduations.
 *
 * Cinq cases par boîte, dans l'ordre des traits : la réponse d'une case est la
 * valeur posée (`decimalString` : `12`, `12.5`), `''` tant que le trait n'est pas
 * posé. Ordre libre pendant le geste : des traits dans le désordre sont
 * simplement faux (décision 5 du 2026-11-01).
 *
 * @module ubumark/utils/boxplot-placer
 */

import type { BoxPlotData, StatChartSpec } from '../types/stat-chart';
import { decimalString } from './number-line-placer';

// Constantes

/** Les cinq traits d'une boîte, dans l'ordre de ses cases */
export const BOX_TRAITS = ['min', 'q1', 'median', 'q3', 'max'] as const;
export type BoxTrait = (typeof BOX_TRAITS)[number];

/** Libellé du bouton de chaque trait */
export const BOX_TRAIT_BUTTONS: Record<BoxTrait, string> = {
	min: 'Min',
	q1: 'Q1',
	median: 'Médiane',
	q3: 'Q3',
	max: 'Max'
};

/** Le trait dans une phrase : « ta médiane », « le maximum » */
const TRAIT_WORDS: Record<BoxTrait, { possessive: string; definite: string; spoken: string }> = {
	min: { possessive: 'Ton minimum', definite: 'le minimum', spoken: 'minimum' },
	q1: { possessive: 'Ton Q1', definite: 'Q1', spoken: 'premier quartile' },
	median: { possessive: 'Ta médiane', definite: 'la médiane', spoken: 'médiane' },
	q3: { possessive: 'Ton Q3', definite: 'Q3', spoken: 'troisième quartile' },
	max: { possessive: 'Ton maximum', definite: 'le maximum', spoken: 'maximum' }
};

/** Cases d'une boîte à construire */
export const CASES_PER_BOX = BOX_TRAITS.length;

// Types

/** Une boîte à construire : son rang dans le bloc, son nom, ses cinq valeurs attendues */
export interface BoxToPlace {
	index: number;
	name: string | null;
	expected: readonly number[];
}

// Functions

/** Les boîtes à construire, dans l'ordre de l'auteur (celui des cases) */
export function boxesToPlace(spec: StatChartSpec): BoxToPlace[] {
	const plot = spec.boxPlot;
	if (!plot) return [];
	return (plot.toPlace ?? []).map((index) => ({
		index,
		name: plot.boxes[index].name,
		expected: plot.boxes[index].values
	}));
}

/** Nombre de cases du bloc : cinq par boîte à construire */
export function boxPlotCaseCount(spec: StatChartSpec): number {
	return (spec.boxPlot?.toPlace?.length ?? 0) * CASES_PER_BOX;
}

/** Réponse d'une case pour une valeur posée (et la réponse attendue, écrite pareil) */
export function boxValueAnswer(value: number): string {
	return decimalString(value);
}

/** Valeur posée lue dans la réponse d'une case ; null : trait pas posé */
export function boxValueOfAnswer(answer: string): number | null {
	const text = answer.trim();
	if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
	return Number(text);
}

/** Graduations de l'axe écrit, de `min` à `max` */
export function axisGraduations(axis: NonNullable<BoxPlotData['axis']>): number[] {
	const count = Math.round((axis.max - axis.min) / axis.step);
	return Array.from({ length: count + 1 }, (_, k) =>
		Number((axis.min + k * axis.step).toPrecision(12))
	);
}

/** La valeur est-elle sur une graduation de l'axe ? */
export function isOnGraduation(axis: NonNullable<BoxPlotData['axis']>, value: number): boolean {
	const k = (value - axis.min) / axis.step;
	return Math.abs(k - Math.round(k)) < 1e-9 && value >= axis.min - 1e-9 && value <= axis.max + 1e-9;
}

/**
 * Valeur sous le doigt : `ratio` = part de l'axe (0 à gauche, 1 à droite),
 * aimantée à la graduation la plus proche, bornée à l'axe
 */
export function boxValueAt(axis: NonNullable<BoxPlotData['axis']>, ratio: number): number {
	const count = Math.round((axis.max - axis.min) / axis.step);
	const k = Math.min(count, Math.max(0, Math.round(ratio * count)));
	return Number((axis.min + k * axis.step).toPrecision(12));
}

/** La graduation voisine (`delta` = ±1), bornée à l'axe ; trait pas posé : le bas de l'axe */
export function stepValue(
	axis: NonNullable<BoxPlotData['axis']>,
	value: number | null,
	delta: 1 | -1
): number {
	if (value === null) return axis.min;
	const count = Math.round((axis.max - axis.min) / axis.step);
	const k = Math.round((value - axis.min) / axis.step) + delta;
	return Number((axis.min + Math.min(count, Math.max(0, k)) * axis.step).toPrecision(12));
}

/** Le trait dit par le lecteur d'écran : « médiane : 12 », « médiane pas posée » */
export function traitText(trait: BoxTrait, value: string | null): string {
	const word = TRAIT_WORDS[trait].spoken;
	return value === null ? `${word} pas posé${trait === 'median' ? 'e' : ''}` : `${word} : ${value}`;
}

/**
 * Phrase de la correction pour un trait jugé faux (le jugement vient de la case :
 * l'énoncé d'évaluation ne porte pas l'attendu). `boxName` : le nom de la boîte
 * quand le bloc en construit plusieurs.
 */
export function boxTraitMistake(
	trait: BoxTrait,
	placed: string | null,
	boxName: string | null = null
): string {
	const where = boxName === null ? '' : ` (boîte ${boxName})`;
	const words = TRAIT_WORDS[trait];
	if (placed === null) return `Tu n’as pas placé ${words.definite}${where}.`;
	return `${words.possessive}${where} est à ${placed}.`;
}

/** Le diagramme juste : toutes les boîtes dessinées */
export function solvedBoxPlotSpec(spec: StatChartSpec): StatChartSpec {
	if (!spec.boxPlot) return spec;
	return { ...spec, boxPlot: { ...spec.boxPlot, toPlace: null } };
}
