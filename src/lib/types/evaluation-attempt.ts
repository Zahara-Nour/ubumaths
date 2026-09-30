/**
 * Tentative d'évaluation : ce qu'échangent le navigateur et le serveur
 * (chantier 5, ADR 0015). Le navigateur ne reçoit AVANT l'envoi que des
 * questions publiques ; la correction complète n'arrive qu'avec la note.
 */

import type { CartItem } from '$lib/stores/questionCart.svelte';
import type { PublicQuestion } from '$lib/questions/public-question';
import type { QuestionPoints, SubmittedAnswer } from '$lib/questions/grading';
import type { QuestionInstance, ValidationStatus } from '$lib/questions/types';

export interface EvaluationStartSummary {
	id: string;
	form: 'interactive' | 'course';
	time_limit: number | null;
	title: string;
}

/** Réponse de `POST /api/evaluations/assignments/[id]/start` */
export type EvaluationStartResponse =
	| { preview: true; evaluation: EvaluationStartSummary & { categories: CartItem[] } }
	| {
			preview: false;
			evaluation: EvaluationStartSummary;
			attempt: {
				id: string;
				resumed: boolean;
				/** Course : secondes restantes ; Entraînement : null */
				remainingSeconds: number | null;
				questions: PublicQuestion[];
			};
	  };

/** Une question corrigée par le serveur, renvoyée APRÈS l'envoi */
export interface CorrectedQuestion {
	position: number;
	/** Instance complète (correction comprise), sans graine */
	instance: QuestionInstance;
	answer: SubmittedAnswer | null;
	status: ValidationStatus;
	points: QuestionPoints;
	isCorrect: boolean;
	feedback?: string;
}

/** Réponse de `POST /api/evaluations/attempts/[id]/submit` */
export interface EvaluationSubmitResponse {
	attemptId: string;
	/** Course reçue après temps limite + 30 s : note 0, aucune réponse comptée */
	late: boolean;
	grade: number;
	pointsEarned: number;
	totalQuestions: number;
	/** Questions entièrement justes (« 7/10 questions ») */
	correctCount: number;
	questions: CorrectedQuestion[];
}
