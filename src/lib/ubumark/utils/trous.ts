/**
 * Texte à trous à étiquettes : bornes, réserve affichée, réponse d'une place
 * ==========================================================================
 *
 * Même mécanique que ```associer (`geste: étiquettes`) : la réserve est mélangée
 * comme les étiquettes d'associer (`displayedAssocierLabels`, jamais l'ordre écrit),
 * et la réponse d'un trou est la position AFFICHÉE de l'étiquette posée (`2`).
 *
 * @module ubumark/utils/trous
 */

import type { TrousSpec } from '../types/trous';
import { associerPlacedOf, displayedAssocierLabels, displayedOrder } from './associer';

// Constantes
export const TROUS_MIN_HOLES = 1;
export const TROUS_MAX_HOLES = 10;
/** Moins, la réponse se devinerait */
export const TROUS_MIN_LABELS = 3;
export const TROUS_MAX_LABELS = 12;

// Functions

/** Étiquettes dans l'ordre affiché, avec leur rang dans `labels` (comme associer) */
export function displayedTrousOrder(spec: Pick<TrousSpec, 'caseIndex' | 'labels'>): number[] {
	return displayedOrder(spec);
}

/** Les étiquettes de la réserve, dans l'ordre affiché */
export function displayedTrousLabels(spec: Pick<TrousSpec, 'caseIndex' | 'labels'>): string[] {
	return displayedAssocierLabels(spec);
}

/** Position affichée lue dans la réponse d'un trou (`2`) ; `null` : trou vide ou illisible */
export function trousPlacedOf(value: string, count: number): number | null {
	return associerPlacedOf(value, count);
}

/** Nombre de trous du bloc */
export function trousHoleCount(spec: Pick<TrousSpec, 'answers'>): number {
	return spec.answers.length;
}
