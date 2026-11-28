/**
 * Tentative d'évaluation : ce qu'échangent le navigateur et le serveur
 * (chantier 5, ADR 0015). Le navigateur ne reçoit AVANT l'envoi que des
 * questions publiques ; la correction complète n'arrive qu'avec la note.
 */

import type { SeriesItem } from '#lib/validation/series.ts';
import type { PublicQuestion } from '#lib/questions/public-question.ts';
import type { QuestionPoints } from '#lib/questions/grading.ts';
import type { QuestionInstance, ValidationStatus } from '#lib/questions/types.ts';
import type { DetailedVerdict } from '#lib/utils/answer-validator.ts';

export interface EvaluationStartSummary {
	id: string;
	form: 'interactive' | 'course';
	time_limit: number | null;
	title: string;
}

/** Temps d'une Course sans temps limite enregistré : même repli partout */
export const DEFAULT_COURSE_TIME_LIMIT_SECONDS = 300;

/** Réponse de `POST /api/evaluations/assignments/[id]/start` */
export type EvaluationStartResponse =
	| { preview: true; evaluation: EvaluationStartSummary & { items: SeriesItem[] } }
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
 * Réponse de `GET /api/evaluations/assignments/[id]` : page d'attente d'un
 * contrôle assigné, lue AVANT le démarrage (rien n'est créé).
 */
export interface EvaluationOverviewResponse {
	/** Propriétaire ou admin non destinataire : aperçu, rien ne sera rattaché */
	preview: boolean;
	evaluation: EvaluationStartSummary;
	/** Questions de la tentative en cours, ou que le tirage vise */
	questionCount: number;
	/**
	 * Course : temps imparti, ou temps RESTANT d'une tentative en cours ;
	 * Contrôle blanc : somme des chronos des questions
	 */
	durationSeconds: number;
	/** Une tentative est déjà commencée : « C'est parti ! » la reprend */
	resumed: boolean;
}

/**
 * Réponse de l'élève telle que la copie l'affiche : une valeur par case (case
 * choix : indices d'ORIGINE « 0;2 », jamais des positions affichées).
 */
export interface CorrectedAnswer {
	values?: string[];
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
