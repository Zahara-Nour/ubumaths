/**
 * Diagramme en barres à construire — calcul pur
 * ==============================================
 *
 * ` ```barres ` + `placer:` (chantier `docs/wip/reponses-a-placer-progress.md`
 * § 17, 18) : l'élève monte chaque barre à construire ; la réponse de sa case
 * est la hauteur posée (`12`), `''` tant que la barre n'est pas construite.
 * Aimant à l'unité, même sur un axe gradué de 2 en 2 (lire l'échelle).
 *
 * @module ubumark/utils/barres-placer
 */

import type { StatChartAxis, StatChartSpec } from '../types/stat-chart';

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
