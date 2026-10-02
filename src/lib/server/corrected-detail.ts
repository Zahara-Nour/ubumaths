/**
 * Statuts case par case d'une copie d'évaluation (lot 2, décision Q102 a)
 * =====================================================================
 *
 * Le résultat attendu d'une évaluation colore chaque case selon SON statut.
 * Rien n'est stocké : à chaque affichage (envoi, copie déjà notée), le serveur
 * recalcule le verdict détaillé depuis l'instance FIGÉE et la réponse
 * enregistrée, avec le même validateur que la note (`detailBlanks`).
 *
 * - Le statut global servi est TOUJOURS celui enregistré (celui de la note) ;
 *   un recalcul divergent est journalisé, sans donnée d'élève.
 * - Une question que la correction n'a pas pu juger (budget épuisé, Q59) n'est
 *   pas recalculée : la recalculer coûterait autant, et contredirait ses 0 point.
 * - Le recalcul a lui-même un budget de temps : au-delà, repli sans validation.
 */

import {
	validateAnswerDetailed,
	type BlankVerdict,
	type ChoiceVerdict,
	type DetailedVerdict,
	type StudentAnswer
} from '$lib/utils/answer-validator';
import {
	getQuestionType,
	type QuestionInstance,
	type ValidationStatus
} from '$lib/questions/types';
import { statusFromBlankStatuses } from '$lib/questions/grading';
import type { CorrectedAnswer } from '$lib/types/evaluation-attempt';
import { GRADING_BUDGET_EXCEEDED_FEEDBACK, SUBMISSION_GRADING_BUDGET_MS } from './grading-budget';

// Types
export interface DetailItem {
	instance: QuestionInstance;
	answer: CorrectedAnswer | null;
	/** Statut enregistré (celui de la note) */
	status: ValidationStatus;
	feedback?: string;
}

export interface DetailBudget {
	budgetMs?: number;
	/** Horloge monotone en millisecondes */
	clock?: () => number;
	/** Validateur (tests) */
	validate?: (instance: QuestionInstance, answer: StudentAnswer) => DetailedVerdict;
}

// Functions
/** Réponse enregistrée → réponse du validateur (case math : la valeur EST le LaTeX, comme à la note) */
function studentAnswerOf(
	instance: QuestionInstance,
	answer: CorrectedAnswer | null
): StudentAnswer {
	if (getQuestionType(instance) === 'multiple_choice') {
		return { choiceIndexes: answer?.choiceIndexes ?? [] };
	}
	const values = answer?.values ?? (instance.blanks ?? []).map(() => '');
	return { values, latex: values };
}

/** Choix d'un QCM sans validation : bons choix de l'instance, cochés enregistrés */
function choicesWithoutValidation(
	instance: QuestionInstance,
	checkedIndexes: readonly number[]
): ChoiceVerdict[] {
	const checked = new Set(checkedIndexes);
	return (instance.choices ?? []).map((choice, originalIndex) => {
		const isChecked = checked.has(originalIndex);
		const isCorrect = choice.isCorrect === true;
		return {
			originalIndex,
			isCorrect,
			checked: isChecked,
			outcome: isChecked
				? isCorrect
					? 'checked-correct'
					: 'checked-wrong'
				: isCorrect
					? 'missed'
					: 'unchecked'
		};
	});
}

/**
 * Repli SANS validation : chaque case remplie prend le statut enregistré
 * (« faux » si la question n'est pas juste), une case vide reste vide.
 */
function fallbackDetail(item: DetailItem): DetailedVerdict {
	const answer = studentAnswerOf(item.instance, item.answer);
	if (getQuestionType(item.instance) === 'multiple_choice') {
		return {
			status: item.status,
			blanks: [],
			choices: choicesWithoutValidation(item.instance, answer.choiceIndexes ?? [])
		};
	}
	const filledStatus: ValidationStatus =
		item.status === 'correct' || item.status === 'unoptimal_form' ? item.status : 'incorrect';
	const blanks: BlankVerdict[] = (answer.values ?? []).map((value, index) => ({
		index,
		status: value.trim() === '' ? 'empty' : filledStatus,
		remarks: [],
		answer: value
	}));
	return { status: item.status, blanks, ...(item.feedback && { feedback: item.feedback }) };
}

/** Verdict détaillé recalculé ; statut global = celui enregistré */
export function detailOfCorrected(
	item: DetailItem,
	validate: DetailBudget['validate'] = validateAnswerDetailed
): DetailedVerdict {
	try {
		const detail = validate(item.instance, studentAnswerOf(item.instance, item.answer));
		const isChoice = getQuestionType(item.instance) === 'multiple_choice';
		const recomputed = isChoice
			? detail.status
			: statusFromBlankStatuses(detail.blanks.map((b) => b.status));
		// QCM : `validateAnswerDetailed` ne connaît pas le ½ du barème, seuls les cases comptent
		if (!isChoice && recomputed !== item.status) {
			console.warn('[corrected-detail] Statut recalculé différent du statut enregistré', {
				recomputed,
				stored: item.status
			});
		}
		return { ...detail, status: item.status };
	} catch {
		return fallbackDetail(item);
	}
}

/**
 * Verdicts détaillés d'une copie, dans l'ordre, dans la limite d'un budget de
 * temps total (même défaut que la correction).
 */
export function detailsWithinBudget(
	items: readonly DetailItem[],
	budget: DetailBudget = {}
): DetailedVerdict[] {
	const budgetMs = budget.budgetMs ?? SUBMISSION_GRADING_BUDGET_MS;
	const clock = budget.clock ?? (() => performance.now());
	const startedAt = clock();
	return items.map((item) => {
		if (item.feedback === GRADING_BUDGET_EXCEEDED_FEEDBACK) return fallbackDetail(item);
		if (clock() - startedAt >= budgetMs) return fallbackDetail(item);
		return detailOfCorrected(item, budget.validate);
	});
}
