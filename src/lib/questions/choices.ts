/**
 * Choix d'un QCM : positions AFFICHÉES ↔ indices d'ORIGINE
 * =========================================================
 *
 * Le générateur mélange toujours les choix (`instance.shuffledChoices`) : l'élève
 * voit et clique des positions affichées, alors que `correctChoiceIndex` et
 * `validateAnswer` parlent en indices d'origine (ordre de `instance.choices`).
 * Toute traduction entre les deux passe par ici.
 *
 * Sans `shuffledChoices` (instance construite à la main), l'ordre affiché est
 * l'ordre d'origine : les fonctions rendent l'identité.
 *
 * @module questions/choices
 */

import type { QuestionInstance } from './types';

type ChoiceInstance = Pick<QuestionInstance, 'shuffledChoices' | 'correctChoiceIndex'>;

/**
 * Positions cliquées (ordre affiché) → indices d'origine, ceux qu'attend
 * `validateAnswer` et ceux qui sont enregistrés.
 * Une position hors de la liste affichée est écartée : elle ne peut désigner
 * aucun choix, et une réponse vide est refusée par la validation.
 */
export function toOriginalChoiceIndexes(
	instance: ChoiceInstance,
	displayedPositions: readonly number[]
): number[] {
	const shuffled = instance.shuffledChoices;
	if (!shuffled || shuffled.length === 0) return [...displayedPositions];

	return displayedPositions
		.filter((position) => Number.isInteger(position) && position >= 0 && position < shuffled.length)
		.map((position) => shuffled[position].originalIndex);
}

/**
 * Indice d'origine → position affichée. Rend l'indice lui-même si l'instance
 * n'est pas mélangée ou si l'indice n'y figure pas.
 */
export function toDisplayedChoicePosition(instance: ChoiceInstance, originalIndex: number): number {
	const shuffled = instance.shuffledChoices;
	if (!shuffled || shuffled.length === 0) return originalIndex;

	const position = shuffled.findIndex((choice) => choice.originalIndex === originalIndex);
	return position === -1 ? originalIndex : position;
}

/** Lettre affichée (A, B, C…) d'une position affichée */
export function choiceLetter(displayedPosition: number): string {
	return String.fromCharCode(65 + displayedPosition);
}

/** Indices d'origine des bons choix (`correctChoiceIndex` est stocké en chaînes) */
export function correctOriginalChoiceIndexes(instance: ChoiceInstance): number[] {
	const { correctChoiceIndex } = instance;
	if (correctChoiceIndex === undefined || correctChoiceIndex === '') return [];
	const raw = Array.isArray(correctChoiceIndex) ? correctChoiceIndex : [correctChoiceIndex];
	return raw.map(Number).filter((index) => Number.isInteger(index));
}

/** Le choix affiché à cette position est-il un bon choix ? */
export function isDisplayedChoiceCorrect(
	instance: ChoiceInstance,
	displayedPosition: number
): boolean {
	const [originalIndex] = toOriginalChoiceIndexes(instance, [displayedPosition]);
	if (originalIndex === undefined) return false;
	return correctOriginalChoiceIndexes(instance).includes(originalIndex);
}
