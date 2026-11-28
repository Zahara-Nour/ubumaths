/**
 * Réponse d'une case « programme Python » (bloc ```python-a-ecrire)
 * =================================================================
 *
 * Le juge de la case (`validateAnswer`) est synchrone, Python ne l'est pas : la case exécute
 * les essais AVANT la validation (`judgePythonCase`, dans le navigateur) et range dans sa
 * valeur le code de l'élève ET le verdict obtenu. Le juge ne fait que lire ce verdict.
 *
 * - Valeur de la case : `python1:` + JSON `{ code, verdict }` ; `verdict` vaut null tant que
 *   le programme n'a pas tourné (temps écoulé avant « Valider » : fausse).
 * - Réponse attendue (`expectedAnswer`) : `python-attendu1:` + JSON `{ fonction, solution,
 *   essais, exiger }`, la solution de l'auteur part au navigateur (Q2, entraînement seulement).
 *
 * Le verdict vient du navigateur : il n'est JAMAIS cru par une correction serveur (une case
 * Python n'entre pas dans une évaluation notée, et `gradeQuestion` la compte fausse).
 *
 * @module questions/python/python-answer
 */

import { z } from 'zod';
import { PYTHON_EXIGENCES, type PythonExigence } from '#lib/ubumark/types/python-a-ecrire.ts';

// ============================================================================
// TYPES
// ============================================================================

/** Verdict d'un programme, calculé dans le navigateur */
export interface PythonVerdict {
	juste: boolean;
	/** Message à l'élève (premier essai raté, erreur de syntaxe…) */
	message?: string;
}

/** Valeur de la case : le code de l'élève, et son verdict s'il a tourné */
export interface PythonAnswer {
	code: string;
	verdict: PythonVerdict | null;
}

/** Ce qu'il faut pour juger un programme : la réponse attendue de la case */
export interface PythonExpected {
	fonction: string;
	solution: string;
	essais: string[];
	exiger: PythonExigence[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const ANSWER_PREFIX = 'python1:';
const EXPECTED_PREFIX = 'python-attendu1:';

/** Plus long programme lu (un élève n'écrit pas 20 000 caractères pour une fonction seuil) */
const MAX_CODE_LENGTH = 20_000;

/** Message d'un programme qui n'a pas tourné (temps écoulé avant « Valider ») */
export const PYTHON_NOT_RUN = 'Ton programme n’a pas été essayé.';

const verdictSchema = z.object({
	juste: z.boolean(),
	message: z.string().max(1000).optional()
});

const answerSchema = z.object({
	code: z.string().max(MAX_CODE_LENGTH),
	verdict: verdictSchema.nullable()
});

const expectedSchema = z.object({
	fonction: z.string().min(1).max(100),
	solution: z.string().min(1).max(MAX_CODE_LENGTH),
	essais: z.array(z.string().min(1).max(500)).min(1).max(50),
	exiger: z.array(z.enum(PYTHON_EXIGENCES)).max(PYTHON_EXIGENCES.length)
});

// ============================================================================
// FONCTIONS
// ============================================================================

/** JSON préfixé lu par un schéma ; null si le préfixe, le JSON ou la forme manque */
function readPrefixed<T>(value: string, prefix: string, schema: z.ZodType<T>): T | null {
	if (!value.startsWith(prefix)) return null;
	let raw: unknown;
	try {
		raw = JSON.parse(value.slice(prefix.length));
	} catch {
		return null;
	}
	const parsed = schema.safeParse(raw);
	return parsed.success ? parsed.data : null;
}

/** Valeur de la case pour un code et son verdict (null : pas encore essayé) */
export function writePythonAnswer(answer: PythonAnswer): string {
	return `${ANSWER_PREFIX}${JSON.stringify(answer)}`;
}

/** Lit la valeur de la case ; null si elle n'a pas la forme écrite par `writePythonAnswer` */
export function readPythonAnswer(value: string): PythonAnswer | null {
	return readPrefixed(value, ANSWER_PREFIX, answerSchema);
}

/**
 * La valeur de la case pour la trace de la tentative (`answer_parts`, borne de la base par
 * case) : telle quelle si elle tient ; sinon le code raccourci (fini par « … »), le verdict
 * gardé, toujours lisible par `readPythonAnswer`. Sans cela, un long programme ferait refuser
 * toute la tentative (400), perdue sans bruit.
 */
export function pythonAnswerForTrace(value: string, maxLength: number): string {
	if (value.length <= maxLength) return value;
	const answer = readPythonAnswer(value);
	if (answer === null) return value.slice(0, maxLength);
	let code = answer.code;
	let encoded = value;
	// Le JSON échappe retours à la ligne et guillemets : on raccourcit jusqu'à ce que ça tienne
	while (encoded.length > maxLength && code.length > 0) {
		const surplus = encoded.length - maxLength;
		code = code.slice(0, Math.max(0, code.length - Math.max(surplus, 1)));
		encoded = writePythonAnswer({ code: `${code}…`, verdict: answer.verdict });
	}
	// Code vide : il reste le verdict (message ≤ 1 000 caractères), qui tient sous la borne
	return encoded;
}

/** Réponse attendue d'une case Python */
export function expectedPythonAnswer(expected: PythonExpected): string {
	return `${EXPECTED_PREFIX}${JSON.stringify(expected)}`;
}

/** Lit une réponse attendue ; null si elle n'a pas la forme écrite par `expectedPythonAnswer` */
export function readExpectedPythonAnswer(expected: string): PythonExpected | null {
	return readPrefixed(expected, EXPECTED_PREFIX, expectedSchema);
}

/**
 * Verdict de la case, lu dans sa valeur : juste seulement si le programme a tourné et passé
 * tous les essais. Une valeur illisible n'est jamais juste.
 */
export function pythonAnswerVerdict(value: string): PythonVerdict {
	const answer = readPythonAnswer(value);
	if (answer === null) return { juste: false };
	if (answer.verdict === null) return { juste: false, message: PYTHON_NOT_RUN };
	return answer.verdict;
}
