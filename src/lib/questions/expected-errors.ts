/**
 * Erreurs prévues d'une case (chantier `idees-format`, idée 3)
 * ============================================================
 *
 * L'auteur écrit, pour une case, des réponses fausses qu'il attend et le message
 * à donner à l'élève qui les fait (« si l'élève répond 3, lui écrire : “Tu as
 * soustrait au lieu d'additionner.” »). Phase 0 validée par David le 2026-11-21 :
 *
 * - Q1 : l'élève a fait « cette erreur » quand sa réponse a la MÊME VALEUR que
 *   l'erreur prévue, quelle que soit l'écriture (`8/6` pour `4/3`) : même juge de
 *   valeur que la correction (`isBlankValueCorrect`), sans forme exigée ni règles ;
 * - seulement sur une case FAUSSE : une mauvaise forme a la bonne valeur, une
 *   réponse juste n'est jamais une erreur (l'erreur prévue qui tombe sur la bonne
 *   réponse d'un tirage est donc ignorée d'elle-même) ;
 * - deux erreurs prévues de même valeur : la première écrite l'emporte ;
 * - Q3 : cases à écriture mathématique ordinaire seulement (le générateur refuse
 *   les autres) ;
 * - outils-manquants n° 75 (Q3, 2026-11-28) : sur une case à forme exigée, la
 *   réponse de la bonne valeur mais de mauvaise forme fait l'erreur prévue que
 *   l'élève a ÉCRITE telle quelle (même arbre : `7/5` et `\frac{7}{5}`, pas
 *   `14/10`) ; comparer la valeur la déclencherait sur toute mauvaise forme ;
 * - idée 4 : une case répondue en QCM (`choice-from-errors.ts`) porte ses
 *   erreurs prévues dans l'ordre de ses choix : le choix coché dit l'erreur.
 *
 * Calculé à la lecture, jamais stocké ; la note ne change jamais.
 *
 * @module questions/expected-errors
 */

import { isBlankValueCorrect, type BlankVerdict } from '#lib/utils/answer-validator.ts';
import type { InstanceBlank, InstanceExpectedError, QuestionInstance } from './types';
import { isChoiceBlank } from './choice-case';
import { readingOf } from './formula-reading';
import { parseLatex } from '#lib/mathAST/parser/index.ts';
import { nodesEqual } from '#lib/mathAST/normal/index.ts';
import { bareDecimalCommaToPoint, expectsSeparatorComma } from '#lib/mathAST/decimal-comma.ts';
import { expectedErrorOfChoice } from './choice-from-errors';

// Constantes

/** Au-delà, la réponse n'est pas comparée (garde de coût, comme les types d'erreur) */
const MAX_COMPARED_LENGTH = 300;

// Functions

/**
 * La case telle que le juge la verrait si l'erreur prévue était la réponse
 * attendue : valeur seule, sans forme exigée, ni règles, ni `rulesSuffice`.
 * Précision et unité de la case restent (une erreur prévue se compare comme la
 * réponse juste).
 */
function blankExpecting(blank: InstanceBlank, error: InstanceExpectedError): InstanceBlank {
	return {
		...blank,
		expectedAnswer: error.answer,
		expectedAnswerLatex: error.answerLatex,
		requiredForm: undefined,
		validationRules: undefined,
		rulesSuffice: undefined,
		expectedErrors: undefined
	};
}

/** La réponse a-t-elle la valeur de cette erreur prévue ? (un juge qui lève : non) */
function matches(
	answer: string,
	blank: InstanceBlank,
	error: InstanceExpectedError,
	instance: QuestionInstance
): boolean {
	try {
		return isBlankValueCorrect(answer, blankExpecting(blank, error), instance);
	} catch {
		return false;
	}
}

/** La réponse est-elle l'erreur prévue écrite telle quelle ? (même arbre, lu comme la case) */
function sameWriting(answer: string, error: InstanceExpectedError, instance: QuestionInstance) {
	try {
		const reading = readingOf(instance);
		// Virgule décimale nue (`1,4`) relue comme `1.4`, sauf écriture à virgule séparatrice
		const read = (latex: string) =>
			parseLatex(expectsSeparatorComma(latex) ? latex : bareDecimalCommaToPoint(latex), reading);
		return nodesEqual(read(answer), read(error.answerLatex));
	} catch {
		return false;
	}
}

/**
 * L'erreur prévue que fait la réponse d'une case, `null` s'il n'y en a pas :
 * case juste, vide ou non notée, case sans erreur prévue, cases appariées
 * librement, réponse d'aucune valeur prévue ; mauvaise forme : seulement sur
 * une case à forme exigée, l'erreur prévue écrite telle quelle (n° 75).
 */
export function expectedErrorOf(
	instance: QuestionInstance,
	verdict: BlankVerdict
): InstanceExpectedError | null {
	if (verdict.ungraded) return null;
	if (verdict.status !== 'incorrect' && verdict.status !== 'bad_form') return null;
	// Cases appariées librement : la case de l'élève n'est pas celle de l'auteur
	if (instance.options?.orderIndependent === true) return null;
	const blank = instance.blanks?.[verdict.index];
	const errors = blank?.expectedErrors;
	if (!blank || !errors || errors.length === 0) return null;
	const answer = verdict.answer.trim();
	if (verdict.status === 'bad_form') {
		if (!blank.requiredForm || isChoiceBlank(blank)) return null;
		if (answer === '' || answer.length > MAX_COMPARED_LENGTH) return null;
		return errors.find((error) => sameWriting(answer, error, instance)) ?? null;
	}
	if (isChoiceBlank(blank)) return expectedErrorOfChoice(blank, answer);
	if (answer === '' || answer.length > MAX_COMPARED_LENGTH) return null;
	return errors.find((error) => matches(answer, blank, error, instance)) ?? null;
}
