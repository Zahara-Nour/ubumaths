/**
 * Réponse d'un programme de calcul (bloc ```calcul d'une question)
 * ================================================================
 *
 * Réponse de l'élève : son programme, en notation texte (`calcul/notation.ts`). Réponse
 * attendue (`expectedAnswer` de la case) : les nombres d'essai et le programme de référence,
 * `−3 ; 0 ; 2,5 | afficher (nombre + 2) × 4` — la barre ne sert ni dans les essais ni dans la
 * notation, la séparation est sûre.
 *
 * @module ubumark/utils/calcul-answer
 */

import {
	ecrireEssais,
	jugerProgrammeCalcul,
	lireEssais,
	type VerdictCalcul
} from '$lib/shared/blockly/calcul/jugement';

const SEPARATEUR = ' | ';

/** Réponse attendue d'une case calcul : `<essais> | <programme>`. */
export function expectedCalculAnswer(essais: readonly number[], attendu: string): string {
	return `${ecrireEssais(essais)}${SEPARATEUR}${attendu}`;
}

/** Lit une réponse attendue ; null si elle n'a pas la forme écrite par `expectedCalculAnswer`. */
export function readExpectedCalculAnswer(
	expected: string
): { essais: number[]; attendu: string } | null {
	const at = expected.indexOf(SEPARATEUR);
	if (at < 0) return null;
	const essais = lireEssais(expected.slice(0, at));
	if (!essais.ok) return null;
	return { essais: essais.essais, attendu: expected.slice(at + SEPARATEUR.length) };
}

/** Verdict du programme de l'élève ; une réponse attendue illisible n'est jamais juste. */
export function calculAnswerVerdict(userAnswer: string, expected: string): VerdictCalcul {
	const lu = readExpectedCalculAnswer(expected);
	if (lu === null) return { juste: false };
	return jugerProgrammeCalcul(userAnswer, lu.attendu, lu.essais);
}

export function isCalculAnswerCorrect(userAnswer: string, expected: string): boolean {
	return calculAnswerVerdict(userAnswer, expected).juste;
}
