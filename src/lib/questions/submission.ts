/**
 * Copie d'une évaluation, telle que la page l'envoie au serveur (chantier 5)
 * =========================================================================
 *
 * Aucun verdict, aucune durée totale (le serveur mesure), aucun LaTeX à part
 * (la forme est jugée sur la valeur). Par question : durée et fin (validée,
 * temps écoulé), même vide, pour la trace écrite par le serveur (PR 4 bis). Bornée ICI aux limites du schéma de
 * l'envoi : une case trop longue ou trop de cases ne font pas refuser toute la
 * copie, elles sont tronquées.
 */

import type { SubmittedAnswer } from './grading';
import type { TestAnswerResult } from '$lib/types/test';
import { MAX_SERIES_QUESTIONS } from '$lib/validation/series';

// Constantes (partagées avec le schéma Zod de l'envoi)
/** Réponses d'une copie : borne des séries enregistrées */
export const MAX_ATTEMPT_ANSWERS = MAX_SERIES_QUESTIONS;
/** Cases d'une question */
export const MAX_ANSWER_PARTS = 50;
/** Une case, en LaTeX */
export const MAX_ANSWER_LENGTH = 2_000;
/** Une journée : au-delà, un temps (en secondes) est forcément fabriqué */
export const MAX_ANSWER_SECONDS = 86_400;

// Types
export type SubmittedPositionAnswer = SubmittedAnswer & {
	position: number;
	timeSpent?: number;
	/** Fin de la question, pour sa trace (PR 4 bis) ; absente : laissée par « Terminer » */
	endReason?: 'validated' | 'timeout';
};

export interface Submission {
	answers: SubmittedPositionAnswer[];
}

// Functions
function toAnswer(position: number, answer: TestAnswerResult | undefined): SubmittedPositionAnswer {
	const data = answer?.userAnswer;
	// Fin et durée partent même pour une question vide : la trace en a besoin (PR 4 bis)
	const timing: Pick<SubmittedPositionAnswer, 'timeSpent' | 'endReason'> = {};
	if (data) {
		timing.timeSpent = Math.min(MAX_ANSWER_SECONDS, Math.max(0, Math.round(data.timeSpent ?? 0)));
	}
	if (answer?.endReason) timing.endReason = answer.endReason;
	// Chrono écoulé sans rien taper : `value` vaut '' → question vide
	if (!data || data.value === '') return { position, ...timing };
	const value = data.value;
	const values = (Array.isArray(value) ? value : [value])
		.slice(0, MAX_ANSWER_PARTS)
		.map((v) => String(v).slice(0, MAX_ANSWER_LENGTH));
	return { position, values, ...timing };
}

/**
 * @param positions - rang, dans la tentative, de chaque question affichée
 * @param answers - réponses collectées, dans l'ordre d'affichage
 */
export function toSubmission(
	positions: readonly number[],
	answers: ReadonlyArray<TestAnswerResult | undefined>
): Submission {
	return {
		answers: positions
			.slice(0, MAX_ATTEMPT_ANSWERS)
			.map((position, index) => toAnswer(position, answers[index]))
	};
}
