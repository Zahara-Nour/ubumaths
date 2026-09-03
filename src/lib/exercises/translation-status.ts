/**
 * What is left to translate in an English worksheet
 * =================================================
 *
 * Resolution always falls back to French, so an English worksheet with an
 * untranslated exercise still generates — it just silently mixes languages.
 * That is exactly the failure a teacher must be able to see *before* printing,
 * hence this listing.
 *
 * A variation counts as translated when its **statement** is: a translated
 * solution alone still puts a French statement in front of the student.
 */

import { resolveExerciseVariationWithShared } from './types';
import type { ExerciseVariation, SharedExerciseDefaults } from './types';

/** The shape needed to judge translation status — any exercise-like row fits. */
export interface TranslatableExercise {
	id: string;
	title: string;
	shared?: SharedExerciseDefaults | null;
	variations?: ExerciseVariation[] | null;
}

/**
 * Whether the English statement actually differs from the French one.
 *
 * Deliberately asks the resolver rather than replaying its cascade: a second
 * implementation of the same rule is a second implementation to keep in sync,
 * and it drifted before this was written (a variation whose only statement was
 * an English translation was reported as untranslated).
 */
function comesOutInFrench(
	variation: ExerciseVariation,
	shared: SharedExerciseDefaults | null | undefined
): boolean {
	const french = resolveExerciseVariationWithShared(shared ?? undefined, variation, 'fr');
	const english = resolveExerciseVariationWithShared(shared ?? undefined, variation, 'en');

	// An empty statement is a content gap, not a translation gap: it prints
	// nothing rather than French, so it does not belong in this listing.
	if (!french.statement_md.trim()) return false;

	// Identical text in both languages means nothing was translated here.
	return english.statement_md === french.statement_md;
}

/**
 * Indices of the variations that would come out in French.
 *
 * Every variation is checked, not just the first: under variant mode a student
 * can be served any of them, so one untranslated variation is enough to make
 * the worksheet mix languages.
 */
export function untranslatedVariationIndices(exercise: TranslatableExercise): number[] {
	const variations = exercise.variations ?? [];

	return variations.flatMap((variation, index) =>
		comesOutInFrench(variation, exercise.shared) ? [index] : []
	);
}

/** True when every variation of the exercise has an English statement. */
export function isFullyTranslated(exercise: TranslatableExercise): boolean {
	// An exercise with no variation has no statement to translate; it cannot be
	// the reason a worksheet comes out in French.
	if (!exercise.variations?.length) return true;
	return untranslatedVariationIndices(exercise).length === 0;
}

/** Exercises of a worksheet that would fall back to French, in listing order. */
export function untranslatedExercises<T extends { exercise?: TranslatableExercise }>(
	worksheetExercises: readonly T[]
): TranslatableExercise[] {
	return worksheetExercises
		.map((row) => row.exercise)
		.filter((exercise): exercise is TranslatableExercise => Boolean(exercise))
		.filter((exercise) => !isFullyTranslated(exercise));
}
