/**
 * Tentative d'évaluation : ce qu'échangent le navigateur et le serveur
 * (chantier 5, ADR 0015). Le navigateur ne reçoit AVANT l'envoi que des
 * questions publiques ; la correction complète n'arrive qu'avec la note.
 */

import type { CartItem } from '$lib/stores/questionCart.svelte';
import type { PublicQuestion } from '$lib/questions/public-question';
import type { QuestionPoints } from '$lib/questions/grading';
import type { QuestionInstance, ValidationStatus } from '$lib/questions/types';
import type { DetailedVerdict } from '$lib/utils/answer-validator';

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

/**
 * Réponse de l'élève telle que la copie l'affiche. QCM : choix cochés en
 * indices d'ORIGINE (comme partout dans l'application, cf. `questions/choices`),
 * jamais en positions affichées.
 */
export interface CorrectedAnswer {
	values?: string[];
	choiceIndexes?: number[];
}

/**
 * Détail INDISPONIBLE (Q173) : budget de recalcul épuisé, question non corrigée
 * faute de budget, ou validateur en échec. Aucun statut par case : un statut
 * deviné peut être faux ; seul le statut ENREGISTRÉ de la question est sûr.
 */
export interface UnavailableDetail {
	unavailable: true;
	/** Statut enregistré (celui de la note) */
	status: ValidationStatus;
}

/** Détail d'une question corrigée : recalculé case par case, ou indisponible */
export type CorrectedDetail = DetailedVerdict | UnavailableDetail;

/** Une question corrigée par le serveur, renvoyée APRÈS l'envoi */
export interface CorrectedQuestion {
	position: number;
	/** Instance complète (correction comprise), sans graine */
	instance: QuestionInstance;
	answer: CorrectedAnswer | null;
	status: ValidationStatus;
	points: QuestionPoints;
	isCorrect: boolean;
	/** ½ point partiel (cases vides, QCM incomplet), pas une forme non optimale */
	partial: boolean;
	feedback?: string;
	/**
	 * Statut de chaque case (QCM : de chaque choix), RECALCULÉ par le serveur à
	 * l'affichage (Q102 a, jamais stocké) ; statut global = `status`.
	 * Indisponible (Q173) : statut de la question seul, aucun statut par case.
	 */
	detail?: CorrectedDetail;
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
