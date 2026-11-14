/**
 * Réponse d'un programme tortue (bloc ```tortue d'une question)
 * =============================================================
 *
 * Réponse de l'élève : son programme, en notation texte (`notation.ts`). Réponse attendue
 * (`expectedAnswer` de la case) : la comparaison et le programme de référence,
 * `position | répéter 4 [ … ]` — la barre ne sert pas dans la notation, la séparation est sûre.
 *
 * @module ubumark/utils/tortue-answer
 */

import {
	COMPARAISONS_TORTUE,
	jugerProgrammeTortue,
	type ComparaisonTortue,
	type VerdictTortue
} from '$lib/shared/blockly/tortue/jugement';

const SEPARATEUR = ' | ';

/** Réponse attendue d'une case tortue : `position | <programme>` ou `forme | <programme>`. */
export function expectedTortueAnswer(comparer: ComparaisonTortue, attendu: string): string {
	return `${comparer}${SEPARATEUR}${attendu}`;
}

/** Lit une réponse attendue ; null si elle n'a pas la forme écrite par `expectedTortueAnswer`. */
export function readExpectedTortueAnswer(
	expected: string
): { comparer: ComparaisonTortue; attendu: string } | null {
	const at = expected.indexOf(SEPARATEUR);
	if (at < 0) return null;
	const comparer = COMPARAISONS_TORTUE.find((c) => c === expected.slice(0, at));
	if (comparer === undefined) return null;
	return { comparer, attendu: expected.slice(at + SEPARATEUR.length) };
}

/** Verdict du programme de l'élève ; une réponse attendue illisible n'est jamais juste. */
export function tortueAnswerVerdict(userAnswer: string, expected: string): VerdictTortue {
	const lu = readExpectedTortueAnswer(expected);
	if (lu === null) return { juste: false };
	return jugerProgrammeTortue(userAnswer, lu.attendu, lu.comparer);
}

export function isTortueAnswerCorrect(userAnswer: string, expected: string): boolean {
	return tortueAnswerVerdict(userAnswer, expected).juste;
}
