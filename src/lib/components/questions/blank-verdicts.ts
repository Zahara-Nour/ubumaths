/**
 * Couleur de chaque case après soumission (FlashCard).
 *
 * Chaque case prend le statut que lui donne le verdict détaillé du validateur
 * (`validateAnswerDetailed`, celui du verso) : verte si elle est juste, ambre si
 * elle est juste mais perfectible (`unoptimal_form`), rouge sinon (fausse, mauvaise
 * forme, vide). Plus de comparaison textuelle : `6\,m` pour l'attendu `6[m]`,
 * `3.1` pour `3{,}1` ou `\dfrac{1}{2}` pour `\frac{1}{2}` sont verts.
 */

import type { QuestionInstance } from '$lib/questions/types';
import { validateAnswerDetailed } from '$lib/utils/answer-validator';

// Types
export interface BlankColors {
	/** Une entrée par case : juste en valeur (verte ou ambre) */
	verdicts: boolean[];
	/** Une entrée par case : juste mais perfectible (ambre) */
	unoptimal: boolean[];
}

// Functions
export function computeBlankColors(
	values: string[],
	instance: QuestionInstance,
	latex?: string[]
): BlankColors {
	const blanks = instance.blanks ?? [];
	if (blanks.length === 0) return { verdicts: [], unoptimal: [] };
	const statuses = validateAnswerDetailed(instance, {
		values: values.slice(0, blanks.length),
		latex: latex?.slice(0, blanks.length)
	}).blanks.map((b) => b.status);
	return {
		verdicts: statuses.map((s) => s === 'correct' || s === 'unoptimal_form'),
		unoptimal: statuses.map((s) => s === 'unoptimal_form')
	};
}

/** Juste en valeur, case par case (verte ou ambre) ; la FlashCard lit `computeBlankColors` */
export function computeBlankVerdicts(
	values: string[],
	instance: QuestionInstance,
	latex?: string[]
): boolean[] {
	return computeBlankColors(values, instance, latex).verdicts;
}
