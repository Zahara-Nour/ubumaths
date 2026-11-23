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
import { withSingleCellShown } from '#lib/ubumark/parser/variation-table-parser.ts';
import { createRandomSource, shuffled } from '#lib/utils/random.ts';
import { resolvedMarkdown } from '#lib/ubumark/types/template.ts';
import { evaluateExpression } from '#lib/math/index.ts';
import { roundToPrecision, type RoundingPrecision } from './rounding';
import type {
	InstanceBlank,
	InstanceExpectedError,
	QuestionInstance,
	QuestionVariation
} from './types';

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

/** `answer` (une écriture) a-t-elle la valeur de la référence, au sens du juge de la case ? */
function judgedEqual(
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
 * Même valeur ? L'erreur est présentée au juge sous ses DEUX écritures : le LaTeX
 * (`1.5~\unit{km}`, que le juge lit comme une saisie, unité comprise) et la forme
 * interne (`sqrt(8)`, quand le LaTeX `\sqrt{8}` ne se relit pas). Une seule qui
 * passe suffit.
 */
function sameValue(
	error: { answer: string; answerLatex: string },
	reference: string,
	referenceLatex: string,
	blank: InstanceBlank,
	instance: QuestionInstance
): boolean {
	return (
		judgedEqual(error.answerLatex, reference, referenceLatex, blank, instance) ||
		judgedEqual(error.answer, reference, referenceLatex, blank, instance)
	);
}

/**
 * Erreurs prévues proposées en choix : ni la valeur de la bonne réponse, ni
 * celle d'une erreur déjà gardée ; les `MAX_CHOICE_ERRORS` premières.
 */
function usableErrors(
	blank: InstanceBlank,
	instance: QuestionInstance,
	correct: string,
	correctLatex: string
): InstanceExpectedError[] {
	const kept: InstanceExpectedError[] = [];
	for (const error of blank.expectedErrors ?? []) {
		if (kept.length === MAX_CHOICE_ERRORS) break;
		// Même écriture : deux choix identiques à l'écran, même si le juge n'a pas su comparer
		const shown = [correctLatex, ...kept.map((other) => other.answerLatex)];
		if (shown.includes(error.answerLatex)) continue;
		if (sameValue(error, correct, correctLatex, blank, instance)) continue;
		if (kept.some((other) => sameValue(error, other.answer, other.answerLatex, blank, instance)))
			continue;
		kept.push(error);
	}
	return kept;
}

/**
 * La question tirée peut-elle se poser en QCM (hors valeurs du tirage) ? Le
 * panier et l'éditeur de série ne proposent « en QCM » qu'à une variation dont
 * l'exemple le peut (PR 4).
 */
export function canBeChoice(instance: QuestionInstance): boolean {
	const blanks = instance.blanks ?? [];
	if (blanks.length !== 1) return false;
	const [blank] = blanks;
	return (
		blank.type === 'math' &&
		// Case d'un bloc ```operation : sa réponse s'écrit autrement que les erreurs
		// prévues (`toFrenchDecimal`), la bonne se reconnaîtrait à sa forme
		blank.operation !== true &&
		// Ordre de grandeur, tolérance : pas UN arrondi à montrer → reste en saisie
		(blank.precision === undefined ||
			blank.precision.type === 'none' ||
			isRounding(blank.precision)) &&
		blank.neverChoice !== true &&
		// Bouton « impossible » : en QCM, le texte du bouton ne serait proposé que sur les
		// tirages sans réponse (il la donnerait) → reste en saisie, bouton sur tous les tirages
		blank.impossibleLabel === undefined &&
		(blank.expectedErrors?.length ?? 0) > 0 &&
		blank.expressionName === undefined &&
		(String(instance.statement).split('\\placeholder[0]{}').length === 2 ||
			// Case d'un tableau de variations (valeur, limite) : le tableau, sa case en « … »
			(blank.cellule === 'valeur' &&
				withSingleCellShown(String(instance.statement), BLANK_IN_FORMULA) !== null))
	);
}

/**
 * La variation PEUT-elle se poser en QCM, d'après le modèle seul (sans tirage) ?
 * Une seule case, à erreurs prévues, sans veto de l'auteur. Lecture légère pour
 * savoir s'il faut montrer le réglage ; l'exemple tiré tranche (`canBeChoice`).
 */
export function mayBeChoice(variation: QuestionVariation): boolean {
	const blanks = variation.blanks ?? [];
	if (blanks.length !== 1) return false;
	const [blank] = blanks;
	return blank.neverChoice !== true && (blank.expectedErrors?.length ?? 0) > 0;
}

function isRounding(
	precision: NonNullable<InstanceBlank['precision']>
): precision is RoundingPrecision {
	return precision.type === 'decimal' || precision.type === 'significant';
}

/** Écriture de l'arrondi, zéros finaux compris (`1.40` au centième) */
function roundedWriting(value: number, precision: RoundingPrecision): string {
	const rounded = roundToPrecision(value, precision);
	if (precision.type === 'decimal')
		return precision.digits >= 0 ? rounded.toFixed(precision.digits) : String(rounded);
	const text = rounded.toPrecision(precision.digits);
	return text.includes('e') ? String(rounded) : text;
}

/**
 * La bonne réponse telle qu'on la montre. Case à arrondir (choix de David,
 * 2026-11-22) : l'attendu du modèle est la valeur EXACTE (√2), le juge arrondit
 * lui-même ; le choix montre donc l'arrondi demandé (`1.41`), à condition que
 * le juge de la case le trouve juste (sinon `null` : la question reste en saisie).
 */
function correctAnswerShown(
	blank: InstanceBlank,
	instance: QuestionInstance
): { answer: string; latex: string } | null {
	const exact = {
		answer: blank.expectedAnswer,
		latex: blank.expectedAnswerLatex ?? blank.expectedAnswer
	};
	if (!blank.precision || !isRounding(blank.precision)) return exact;
	const value = evaluateExpression(blank.expectedAnswer);
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	const writing = roundedWriting(value, blank.precision);
	try {
		if (!isBlankValueCorrect(writing, blank, instance)) return null;
	} catch {
		return null;
	}
	return { answer: writing, latex: writing };
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
	if (!canBeChoice(instance)) return null;
	const blank = (instance.blanks ?? [])[0];
	const correct = correctAnswerShown(blank, instance);
	if (!correct) return null;
	const errors = usableErrors(blank, instance, correct.answer, correct.latex);
	if (errors.length === 0) return null;

	const correctLatex = correct.latex;
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
		expectedErrors: errors,
		fromExpectedErrors: true
	};
	const block = serializeChoiceBlock({
		caseIndex: 0,
		multiple: false,
		choices: order.map((index) => choices[index])
	});
	const source = String(instance.statement);
	const shown =
		blank.cellule === 'valeur'
			? withSingleCellShown(source, BLANK_IN_FORMULA)
			: source.replace('\\placeholder[0]{}', BLANK_IN_FORMULA);
	if (shown === null) return null;
	const statement = `${shown}\n\n${block}`;
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

/**
 * La question a-t-elle été posée en QCM depuis ses erreurs prévues ? Lit le
 * repère de la case (`fromExpectedErrors`) ; accepte une instance relue en base
 * (copie figée d'un contrôle). Un QCM écrit par l'auteur : non.
 */
export function isAnsweredAsChoice(instance: unknown): boolean {
	if (!instance || typeof instance !== 'object' || !('blanks' in instance)) return false;
	const { blanks } = instance;
	if (!Array.isArray(blanks) || blanks.length !== 1) return false;
	const blank: unknown = blanks[0];
	return (
		!!blank &&
		typeof blank === 'object' &&
		'type' in blank &&
		blank.type === 'choice' &&
		'fromExpectedErrors' in blank &&
		blank.fromExpectedErrors === true
	);
}
