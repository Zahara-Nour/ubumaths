/**
 * Case répondue en QCM depuis ses erreurs prévues (chantier `idees-format`, idée 4)
 * =================================================================================
 *
 * Le prof coche « en QCM » pour une variation d'une ligne de série : la case de
 * la question tirée devient une case choix (ADR 0033) dont les choix sont la
 * bonne réponse et jusqu'à trois erreurs prévues (idée 3), mélangés. Phase 0
 * validée par David le 2026-11-21 :
 *
 * - sans doublon de VALEUR (même juge que l'erreur prévue : `8/2` vaut `4`) ;
 *   une erreur prévue qui vaut la bonne réponse sur ce tirage est retirée ; de
 *   deux erreurs de même valeur, la première écrite reste ;
 * - Q2 : moins de choix s'il manque des erreurs prévues (2 choix au moins) ;
 *   aucune utilisable sur ce tirage → la question reste en saisie (`null`) ;
 * - Q3 : question à UNE seule case ; l'auteur peut interdire le QCM sur une
 *   case (`neverChoice`) → reste en saisie ;
 * - cocher une erreur prévue affiche son message (`expectedErrorOf`).
 *
 * On transforme la question APRÈS le tirage, sans toucher au générateur : une
 * même graine donne les mêmes nombres en saisie et en QCM, et le mélange tire
 * sur une source de hasard à part. La question en QCM n'est jamais rejouée
 * depuis la graine seule : l'évaluation fige l'instance au démarrage (Q42).
 *
 * Forme produite : choix dans l'ordre d'ORIGINE = bonne réponse (indice 0)
 * puis les erreurs gardées, dans l'ordre de l'auteur ; `expectedErrors[k]`
 * est le choix `k + 1`. La case de la formule devient des pointillés et le bloc
 * ```choix suit l'énoncé.
 *
 * @module questions/choice-from-errors
 */

import { isBlankValueCorrect } from '#lib/utils/answer-validator.ts';
import { serializeChoiceBlock } from '#lib/ubumark/parser/choix-parser.ts';
import { createRandomSource, shuffled } from '#lib/utils/random.ts';
import { resolvedMarkdown } from '#lib/ubumark/types/template.ts';
import type { InstanceBlank, InstanceExpectedError, QuestionInstance } from './types';

// Constantes

/** Erreurs prévues proposées au plus (4 choix avec la bonne réponse) */
export const MAX_CHOICE_ERRORS = 3;

/** Ce que devient la case dans la formule */
const BLANK_IN_FORMULA = '\\ldots';

// Functions

/**
 * Graine du mélange des choix, MÉLANGÉE (autre constante que celle des erreurs
 * prévues du générateur) : la source de l'instance n'est jamais consommée.
 */
function choiceOrderSeed(seed: number): number {
	return Math.imul(seed ^ 0x27d4eb2f, 0x165667b1) >>> 0;
}

/** Les deux réponses ont-elles la même valeur, au sens du juge de la case ? */
function sameValue(
	answer: string,
	reference: string,
	referenceLatex: string,
	blank: InstanceBlank,
	instance: QuestionInstance
): boolean {
	const judge: InstanceBlank = {
		...blank,
		expectedAnswer: reference,
		expectedAnswerLatex: referenceLatex,
		requiredForm: undefined,
		validationRules: undefined,
		rulesSuffice: undefined,
		expectedErrors: undefined
	};
	try {
		return isBlankValueCorrect(answer, judge, instance);
	} catch {
		return false;
	}
}

/**
 * Erreurs prévues proposées en choix : ni la valeur de la bonne réponse, ni
 * celle d'une erreur déjà gardée ; les `MAX_CHOICE_ERRORS` premières.
 */
function usableErrors(blank: InstanceBlank, instance: QuestionInstance): InstanceExpectedError[] {
	const kept: InstanceExpectedError[] = [];
	for (const error of blank.expectedErrors ?? []) {
		if (kept.length === MAX_CHOICE_ERRORS) break;
		const correct = blank.expectedAnswer;
		const correctLatex = blank.expectedAnswerLatex ?? correct;
		if (sameValue(error.answer, correct, correctLatex, blank, instance)) continue;
		if (
			kept.some((other) =>
				sameValue(error.answer, other.answer, other.answerLatex, blank, instance)
			)
		)
			continue;
		kept.push(error);
	}
	return kept;
}

/** La case peut-elle devenir un QCM (hors tirage) ? */
function isEligible(instance: QuestionInstance): boolean {
	const blanks = instance.blanks ?? [];
	if (blanks.length !== 1) return false;
	const [blank] = blanks;
	return (
		blank.type === 'math' &&
		blank.neverChoice !== true &&
		(blank.expectedErrors?.length ?? 0) > 0 &&
		blank.expressionName === undefined &&
		String(instance.statement).split('\\placeholder[0]{}').length === 2
	);
}

/**
 * La question tirée, sa case répondue en QCM ; `null` quand elle reste en
 * saisie (plusieurs cases, veto de l'auteur, aucune erreur prévue utilisable sur
 * ce tirage…). `seed` : la graine de la question (mélange des choix). La
 * question reçue n'est pas modifiée.
 */
export function asChoiceInstance(
	instance: QuestionInstance,
	seed: number
): QuestionInstance | null {
	if (!isEligible(instance)) return null;
	const blank = (instance.blanks ?? [])[0];
	const errors = usableErrors(blank, instance);
	if (errors.length === 0) return null;

	const correctLatex = blank.expectedAnswerLatex ?? blank.expectedAnswer;
	const choices = [correctLatex, ...errors.map((error) => error.answerLatex)].map(
		(latex) => `$${latex}$`
	);
	const order = shuffled(
		choices.map((_, index) => index),
		createRandomSource(choiceOrderSeed(seed))
	);
	const choiceBlank: InstanceBlank = {
		type: 'choice',
		expectedAnswer: '0',
		choice: { choices, order, multiple: false },
		expectedErrors: errors
	};
	const block = serializeChoiceBlock({
		caseIndex: 0,
		multiple: false,
		choices: order.map((index) => choices[index])
	});
	const statement = `${String(instance.statement).replace('\\placeholder[0]{}', BLANK_IN_FORMULA)}\n\n${block}`;
	return {
		...instance,
		statement: resolvedMarkdown(statement),
		blanks: [choiceBlank]
	};
}

/**
 * L'erreur prévue que porte un choix d'une case venue des erreurs prévues
 * (choix `k + 1` → `expectedErrors[k]`) ; `null` pour la bonne réponse, rien
 * ou plusieurs cochés.
 */
export function expectedErrorOfChoice(
	blank: InstanceBlank,
	answer: string
): InstanceExpectedError | null {
	if (!/^\d+$/.test(answer)) return null;
	const index = Number(answer);
	if (index < 1) return null;
	return blank.expectedErrors?.[index - 1] ?? null;
}
