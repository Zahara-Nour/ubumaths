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
 * - Le recalcul a lui-même un budget de temps : au-delà (ou si le validateur
 *   échoue), détail INDISPONIBLE (Q173) — statut de la question seul, aucun
 *   statut par case deviné. Copie relue au renvoi (409) : budget réduit.
 */

import {
	validateAnswerDetailed,
	type DetailedVerdict,
	type StudentAnswer
} from '$lib/utils/answer-validator';
import {
	getQuestionType,
	type QuestionInstance,
	type ValidationStatus
} from '$lib/questions/types';
import { statusFromBlankStatuses } from '$lib/questions/grading';
import type {
	CorrectedAnswer,
	CorrectedDetail,
	UnavailableDetail
} from '$lib/types/evaluation-attempt';
import {
	GRADING_BUDGET_EXCEEDED_FEEDBACK,
	SUBMISSION_GRADING_BUDGET_MS,
	SUBMITTED_COPY_DETAIL_BUDGET_MS
} from './grading-budget';

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

/**
 * Repli (Q173) : détail INDISPONIBLE. Aucun statut par case n'est deviné (un
 * statut copié de la question serait faux pour une question juste + fausse, ou
 * à ½ point) : seul le statut enregistré est servi.
 */
function unavailableDetail(item: DetailItem): UnavailableDetail {
	return { unavailable: true, status: item.status };
}

/** Verdict détaillé recalculé ; statut global = celui enregistré */
export function detailOfCorrected(
	item: DetailItem,
	validate: DetailBudget['validate'] = validateAnswerDetailed
): CorrectedDetail {
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
		return unavailableDetail(item);
	}
}

/**
 * Verdicts détaillés d'une copie, dans l'ordre, dans la limite d'un budget de
 * temps total (même défaut que la correction).
 */
export function detailsWithinBudget(
	items: readonly DetailItem[],
	budget: DetailBudget = {}
): CorrectedDetail[] {
	const budgetMs = budget.budgetMs ?? SUBMISSION_GRADING_BUDGET_MS;
	const clock = budget.clock ?? (() => performance.now());
	const startedAt = clock();
	return items.map((item) => {
		if (item.feedback === GRADING_BUDGET_EXCEEDED_FEEDBACK) return unavailableDetail(item);
		if (clock() - startedAt >= budgetMs) return unavailableDetail(item);
		return detailOfCorrected(item, budget.validate);
	});
}

/**
 * Verdicts détaillés d'une copie DÉJÀ notée relue (renvoi → 409, Q173) : budget
 * RÉDUIT à `SUBMITTED_COPY_DETAIL_BUDGET_MS`, même si un budget plus long est
 * fourni. Cette relecture ne note rien : elle n'a pas à occuper le serveur 5 s.
 */
export function submittedCopyDetails(
	items: readonly DetailItem[],
	budget: DetailBudget = {}
): CorrectedDetail[] {
	const budgetMs = Math.min(
		budget.budgetMs ?? SUBMITTED_COPY_DETAIL_BUDGET_MS,
		SUBMITTED_COPY_DETAIL_BUDGET_MS
	);
	return detailsWithinBudget(items, { ...budget, budgetMs });
}
