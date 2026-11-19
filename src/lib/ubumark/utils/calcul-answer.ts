/**
 * Réponse d'un programme de calcul (bloc ```calcul d'une question)
 * ================================================================
 *
 * Réponse de l'élève : son programme, en notation texte (`calcul/notation.ts`). Réponse
 * attendue (`expectedAnswer` de la case) : les nombres d'essai et le programme de référence,
 * `−3 ; 0 ; 2,5 | afficher (nombre + 2) × 4` — la barre ne sert ni dans les essais ni dans la
 * notation, la séparation est sûre. Au-dessus de la 5e, le niveau vient devant :
 * `4e | −3 ; 0 | …` (les réponses attendues de 5e, publiées, gardent leur forme).
 *
 * @module ubumark/utils/calcul-answer
 */

import { NIVEAUX_CALCUL, type NiveauCalcul } from '#lib/shared/blockly/calcul/interpreteur.ts';
import {
	ecrireEssais,
	jugerProgrammeCalcul,
	lireEssais,
	type VerdictCalcul
} from '#lib/shared/blockly/calcul/jugement.ts';

const SEPARATEUR = ' | ';

/** Réponse attendue d'une case calcul : `[<niveau> | ]<essais> | <programme>`. */
export function expectedCalculAnswer(
	essais: readonly number[],
	attendu: string,
	niveau: NiveauCalcul = '5e'
): string {
	const prefixe = niveau === '5e' ? '' : `${niveau}${SEPARATEUR}`;
	return `${prefixe}${ecrireEssais(essais)}${SEPARATEUR}${attendu}`;
}

/** Lit une réponse attendue ; null si elle n'a pas la forme écrite par `expectedCalculAnswer`. */
export function readExpectedCalculAnswer(
	expected: string
): { essais: number[]; attendu: string; niveau: NiveauCalcul } | null {
	let reste = expected;
	let niveau: NiveauCalcul = '5e';
	const prefixe = NIVEAUX_CALCUL.find((n) => n !== '5e' && reste.startsWith(`${n}${SEPARATEUR}`));
	if (prefixe) {
		niveau = prefixe;
		reste = reste.slice(prefixe.length + SEPARATEUR.length);
	}
	const at = reste.indexOf(SEPARATEUR);
	if (at < 0) return null;
	const essais = lireEssais(reste.slice(0, at));
	if (!essais.ok) return null;
	return { essais: essais.essais, attendu: reste.slice(at + SEPARATEUR.length), niveau };
}

/** Verdict du programme de l'élève ; une réponse attendue illisible n'est jamais juste. */
export function calculAnswerVerdict(userAnswer: string, expected: string): VerdictCalcul {
	const lu = readExpectedCalculAnswer(expected);
	if (lu === null) return { juste: false };
	return jugerProgrammeCalcul(userAnswer, lu.attendu, lu.essais, lu.niveau);
}

export function isCalculAnswerCorrect(userAnswer: string, expected: string): boolean {
	return calculAnswerVerdict(userAnswer, expected).juste;
}
