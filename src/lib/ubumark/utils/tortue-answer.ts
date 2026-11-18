/**
 * Réponse d'un programme tortue (bloc ```tortue d'une question)
 * =============================================================
 *
 * Réponse de l'élève : son programme, en notation texte (`notation.ts`). Réponse attendue
 * (`expectedAnswer` de la case) : la comparaison et le programme de référence,
 * `position | répéter 4 [ … ]` — la barre ne sert pas dans la notation, la séparation est sûre.
 * Avec un nombre maximal de blocs (`blocs:`) : `position | blocs 3 | répéter 4 [ … ]` ; sans,
 * la forme d'avant (réponses attendues des modèles déjà publiés inchangées). Avec un niveau
 * (`niveau: 4e | 3e`), il vient devant : `4e | position | …` ; sans, rien.
 *
 * @module ubumark/utils/tortue-answer
 */

import type { NiveauTortue } from '#lib/shared/blockly/tortue/interpreteur.ts';
import {
	COMPARAISONS_TORTUE,
	jugerProgrammeTortue,
	type ComparaisonTortue,
	type VerdictTortue
} from '#lib/shared/blockly/tortue/jugement.ts';

const SEPARATEUR = ' | ';

/** `blocs 3 | ` en tête du programme : le nombre maximal de blocs */
const BLOCS_MAX = /^blocs (\d+) \| /;

/** Niveaux écrits en tête de la réponse attendue (sans niveau : rien). */
const NIVEAUX_ECRITS: readonly NiveauTortue[] = ['4e', '3e'];

export interface ExpectedTortue {
	comparer: ComparaisonTortue;
	attendu: string;
	/** Nombre maximal de blocs (`blocs:`) ; null : sans limite */
	blocsMax: number | null;
	niveau: NiveauTortue;
}

/**
 * Réponse attendue d'une case tortue : `position | <programme>` ou `forme | <programme>`,
 * `position | blocs 3 | <programme>` avec un nombre maximal de blocs, `4e | position | …` avec
 * un niveau.
 */
export function expectedTortueAnswer(
	comparer: ComparaisonTortue,
	attendu: string,
	blocsMax: number | null = null,
	niveau: NiveauTortue = 'base'
): string {
	const prefixe = niveau === 'base' ? '' : `${niveau}${SEPARATEUR}`;
	const limite = blocsMax === null ? '' : `blocs ${blocsMax}${SEPARATEUR}`;
	return `${prefixe}${comparer}${SEPARATEUR}${limite}${attendu}`;
}

/** Lit une réponse attendue ; null si elle n'a pas la forme écrite par `expectedTortueAnswer`. */
export function readExpectedTortueAnswer(expected: string): ExpectedTortue | null {
	const niveau = NIVEAUX_ECRITS.find((n) => expected.startsWith(`${n}${SEPARATEUR}`)) ?? 'base';
	const sansNiveau =
		niveau === 'base' ? expected : expected.slice(niveau.length + SEPARATEUR.length);
	const at = sansNiveau.indexOf(SEPARATEUR);
	if (at < 0) return null;
	const comparer = COMPARAISONS_TORTUE.find((c) => c === sansNiveau.slice(0, at));
	if (comparer === undefined) return null;
	const reste = sansNiveau.slice(at + SEPARATEUR.length);
	const limite = BLOCS_MAX.exec(reste);
	if (limite === null) return { comparer, attendu: reste, blocsMax: null, niveau };
	return {
		comparer,
		attendu: reste.slice(limite[0].length),
		blocsMax: Number(limite[1]),
		niveau
	};
}

/** Verdict du programme de l'élève ; une réponse attendue illisible n'est jamais juste. */
export function tortueAnswerVerdict(userAnswer: string, expected: string): VerdictTortue {
	const lu = readExpectedTortueAnswer(expected);
	if (lu === null) return { juste: false };
	return jugerProgrammeTortue(userAnswer, lu.attendu, lu.comparer, lu.blocsMax, lu.niveau);
}

export function isTortueAnswerCorrect(userAnswer: string, expected: string): boolean {
	return tortueAnswerVerdict(userAnswer, expected).juste;
}
