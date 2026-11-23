/**
 * Diagramme en barres à construire — calcul pur
 * ==============================================
 *
 * ` ```barres ` + `placer:` (chantier `docs/wip/reponses-a-placer-progress.md`
 * § 17, 18) : l'élève monte chaque barre à construire ; la réponse de sa case
 * est la hauteur posée (`12`), `''` tant que la barre n'est pas construite.
 * Aimant à l'unité, même sur un axe gradué de 2 en 2 (lire l'échelle).
 *
 * `axe: à choisir` (§ 24, 25) : l'élève choisit d'abord ce que vaut une
 * graduation (`SCALE_STEPS`, sur `SCALE_TICKS` graduations) ; sa case vient
 * avant celles des barres. Juste : la plus petite échelle où tout rentre.
 *
 * @module ubumark/utils/barres-placer
 */

import type { StatChartAxis, StatChartSpec } from '../types/stat-chart';

// Constantes

/** Ce que peut valoir une graduation (`axe: à choisir`) */
export const SCALE_STEPS = [1, 2, 5, 10] as const;
/** Nombre de graduations de l'axe à choisir : jusqu'à 100 au plus (§ 20) */
export const SCALE_TICKS = 10;

// Types

/** Une barre à construire : son rang dans les données, son nom, l'effectif attendu */
export interface BarToPlace {
	index: number;
	label: string;
	expected: number;
}

/** Les barres à construire, dans l'ordre des données (celui des cases) */
export function barsToPlace(spec: StatChartSpec): BarToPlace[] {
	return (spec.toPlace ?? []).map((index) => ({
		index,
		label: spec.data[index].label,
		expected: spec.data[index].value
	}));
}

/** Nombre de cases du diagramme : l'échelle (`axe: à choisir`), puis une par barre */
export function barsCaseCount(spec: StatChartSpec): number {
	return (spec.toPlace?.length ?? 0) + (spec.chooseScale ? 1 : 0);
}

/** Axe d'une échelle choisie : `SCALE_TICKS` graduations de `step` */
export function scaleAxis(step: number): StatChartAxis {
	return { max: SCALE_TICKS * step, step };
}

/** La plus petite échelle où toutes les barres rentrent ; null : aucune */
export function adaptedScale(values: readonly number[]): number | null {
	const highest = Math.max(0, ...values);
	return SCALE_STEPS.find((step) => highest <= scaleAxis(step).max) ?? null;
}

/**
 * Le diagramme juste : toutes les barres dessinées ; échelle à choisir : à la
 * plus petite échelle où tout rentre
 */
export function solvedSpec(spec: StatChartSpec): StatChartSpec {
	const scale = spec.chooseScale ? adaptedScale(spec.data.map((d) => d.value)) : null;
	return {
		...spec,
		toPlace: null,
		chooseScale: false,
		axis: scale === null ? (spec.axis ?? null) : scaleAxis(scale)
	};
}

/** Échelle lue dans la réponse de sa case ; null : pas choisie (ou hors des choix) */
export function scaleOfAnswer(value: string): number | null {
	const step = Number(value.trim());
	return (SCALE_STEPS as readonly number[]).includes(step) ? step : null;
}

/** Phrase de la correction pour l'échelle ; null quand elle est juste */
export function scaleMistake(
	data: readonly { label: string; value: number }[],
	chosen: number | null
): string | null {
	if (chosen === null) return 'Tu n’as pas choisi l’échelle.';
	const over = data.find((d) => d.value > scaleAxis(chosen).max);
	if (over)
		return `Avec ${chosen} par graduation, la barre ${over.label} (${over.value}) ne rentre pas.`;
	const best = adaptedScale(data.map((d) => d.value));
	if (best === null || best === chosen) return null;
	return `Avec ${chosen} par graduation, ton diagramme rentre, mais avec ${best} il serait plus grand et plus lisible.`;
}

/** Hauteur posée lue dans la réponse d'une case ; null : barre pas construite */
export function barValueOfAnswer(value: string): number | null {
	const trimmed = value.trim();
	return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/**
 * Hauteur sous le doigt : `ratio` = part de l'axe (0 en bas, 1 en haut),
 * arrondie à l'unité, bornée à l'axe
 */
export function barValueAt(axis: StatChartAxis, ratio: number): number {
	return Math.min(axis.max, Math.max(0, Math.round(ratio * axis.max)));
}

/** Phrase de la correction pour une barre ; null quand elle est juste */
export function barMistake(label: string, placed: number | null, expected: number): string | null {
	if (placed === null) return `Tu n’as pas construit la barre ${label}.`;
	if (placed === expected) return null;
	return `Ta barre ${label} monte à ${placed}.`;
}
