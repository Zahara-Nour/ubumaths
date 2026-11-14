/**
 * Associer deux colonnes : le mélange des étiquettes et la lecture d'une réponse
 * ==============================================================================
 *
 * Les étiquettes de droite sont mélangées comme celles d'un ```ranger
 * (`rangerOrder` : jamais l'ordre écrit, qui suit souvent l'ordre des éléments).
 * La réponse d'une place est la position AFFICHÉE de l'étiquette posée (`2`).
 *
 * @module ubumark/utils/associer
 */

import { createRandomSource } from '$lib/utils/random';
import type { AssocierSpec } from '../types/associer';
import { rangerOrder, textSeed } from './ranger';

// Constantes
export const ASSOCIER_MIN_ITEMS = 2;
export const ASSOCIER_MAX_ITEMS = 8;
/** Moins, la réponse se devinerait */
export const ASSOCIER_MIN_LABELS = 3;
export const ASSOCIER_MAX_LABELS = 10;

// Functions

/**
 * Étiquettes dans l'ordre où l'élève les voit, avec leur rang dans `labels`.
 * Dans une question (`case:` posée), le bloc est déjà mélangé : tel quel. Hors
 * question, mélange fixe tiré du texte des étiquettes (même rendu partout).
 */
export function displayedOrder(spec: Pick<AssocierSpec, 'caseIndex' | 'labels'>): number[] {
	if (spec.caseIndex !== undefined) return spec.labels.map((_, k) => k);
	return rangerOrder(spec.labels.length, createRandomSource(textSeed(spec.labels)));
}

/** Les étiquettes dans l'ordre affiché */
export function displayedAssocierLabels(
	spec: Pick<AssocierSpec, 'caseIndex' | 'labels'>
): string[] {
	return displayedOrder(spec).map((index) => spec.labels[index]);
}

/** Position affichée lue dans la réponse d'une place (`2`) ; `null` : place vide ou illisible */
export function associerPlacedOf(value: string, count: number): number | null {
	if (!/^\d{1,2}$/.test(value.trim())) return null;
	const position = Number(value.trim());
	return position < count ? position : null;
}
