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

import type { TrousSegment, TrousSpec } from '../types/trous';
import { associerPlacedOf, displayedAssocierLabels, displayedOrder } from './associer';

// Types

/** Morceau d'une ligne à l'écran : le trou garde la ponctuation qui le suit (`glue`) */
export type TrousPiece =
	{ kind: 'text'; text: string } | { kind: 'hole'; hole: number; glue: string };

// Constantes

/** Ponctuation collée au trou qui la précède : jamais seule en début de ligne */
const TRAILING_PUNCTUATION = /^[.,;:!?)\]»…]+/;
export const TROUS_MIN_HOLES = 1;
export const TROUS_MAX_HOLES = 10;
/** Moins, la réponse se devinerait */
export const TROUS_MIN_LABELS = 3;
export const TROUS_MAX_LABELS = 12;
/** Étiquettes par rangée de la réserve, dans le PDF */
export const TROUS_RESERVE_COLUMNS = 6;

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

/**
 * Une ligne du texte prête pour l'écran : la ponctuation qui suit un trou (`.`, `,`)
 * passe dans le trou, pour ne jamais revenir seule à la ligne au téléphone
 */
export function trousPieces(line: readonly TrousSegment[]): TrousPiece[] {
	const pieces: TrousPiece[] = [];
	line.forEach((segment, index) => {
		if (segment.kind === 'hole') {
			const next = line[index + 1];
			const glue = next?.kind === 'text' ? (next.text.match(TRAILING_PUNCTUATION)?.[0] ?? '') : '';
			pieces.push({ kind: 'hole', hole: segment.hole, glue });
			return;
		}
		const previous = line[index - 1];
		const glued =
			previous?.kind === 'hole' ? (segment.text.match(TRAILING_PUNCTUATION)?.[0] ?? '') : '';
		const text = segment.text.slice(glued.length);
		if (text !== '') pieces.push({ kind: 'text', text });
	});
	return pieces;
}
