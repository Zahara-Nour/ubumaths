/**
 * Ordre et numéros des exercices d'un document — partagé par les deux adaptateurs
 *
 * La règle elle-même est celle de `exercise-numbering.ts` ; ce module la
 * branche sur le document : numéro au style de la fiche, exercice d'une
 * section inconnue rangé hors section (comme le fait la règle).
 *
 * @module worksheets/document/numbering
 */

import {
	groupExercisesForDisplay,
	type NumberableExercise,
	type NumberableSection
} from '$lib/worksheets/exercise-numbering';
import { formatNumber } from '$lib/typst/utils';
import type { NumberingStyle } from '$lib/types/worksheets';

/** Un exercice source, à sa place dans le document */
export interface PlacedExercise<E> {
	exercise: E;
	/** Numéro affiché, au style de la fiche */
	number: string;
	/** Section d'affichage ; `null` : hors section */
	sectionId: string | null;
}

/**
 * Les exercices dans l'ordre d'affichage, numérotés en continu.
 *
 * @param preserveExerciseOrder - vrai : l'ordre reçu prime sur `position`
 *   (copie tirée au sort, `exercise_order`)
 */
export function placeExercises<E extends NumberableExercise, S extends NumberableSection>(
	exercises: readonly E[],
	sections: readonly S[],
	numberingStyle: NumberingStyle,
	preserveExerciseOrder: boolean
): PlacedExercise<E>[] {
	return groupExercisesForDisplay(exercises, sections, { preserveExerciseOrder }).flatMap((group) =>
		group.exercises.map(({ exercise, number }) => ({
			exercise,
			number: formatNumber(number, numberingStyle),
			sectionId: group.section?.id ?? null
		}))
	);
}

/** Texte vide ou blanc ramené à `null` : « non écrit » */
export function writtenOrNull(text: string | null | undefined): string | null {
	return text?.trim() ? text : null;
}
