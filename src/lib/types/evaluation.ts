/**
 * Séries et évaluations (chantier 4, décisions Q22-Q31).
 *
 * - Série : composition (titre, description, niveau, catégories). Sans statut.
 *   Verrouillée dès qu'un élève a commencé une évaluation qui l'utilise.
 * - Évaluation : une série passée sous une FORME (Entraînement | Course aux
 *   nombres), avec ses réglages, son statut et ses destinataires.
 */

import type { CartItem } from '$lib/stores/questionCart.svelte';
import { isDeadlinePassed as isDeadlinePassedUtil } from '$lib/utils/dates';

// ===========================================================================
// FORMES, STATUTS, BORNES
// ===========================================================================

/** Forme d'une évaluation : `interactive` = Entraînement, `course` = Course aux nombres */
export type EvaluationForm = 'interactive' | 'course';

export const EVALUATION_FORMS: readonly EvaluationForm[] = ['interactive', 'course'];

export const EVALUATION_FORM_LABELS: Record<EvaluationForm, string> = {
	interactive: 'Entraînement',
	course: 'Course aux nombres'
};

/** Course aux nombres : temps limite obligatoire, 1 à 60 min, 7 min par défaut (Q30) */
export const COURSE_TIME_LIMIT_MIN_MINUTES = 1;
export const COURSE_TIME_LIMIT_MAX_MINUTES = 60;
export const COURSE_TIME_LIMIT_DEFAULT_MINUTES = 7;

export type EvaluationStatus = 'draft' | 'published' | 'archived';

/** État d'une évaluation pour un élève (calculé) */
export type StudentEvaluationStatus = 'not_started' | 'in_progress' | 'completed' | 'expired';

export function isEvaluationForm(value: unknown): value is EvaluationForm {
	return value === 'interactive' || value === 'course';
}

export function formLabel(form: string): string {
	return isEvaluationForm(form) ? EVALUATION_FORM_LABELS[form] : form;
}

// ===========================================================================
// LIGNES EN BASE
// ===========================================================================

/** `public.series` */
export interface DbSeries {
	id: string;
	title: string;
	description: string | null;
	grade: string;
	categories: CartItem[];
	created_by: string;
	created_at: string;
	updated_at: string;
}

/** Série vue par son propriétaire : verrou et nombre d'évaluations */
export interface SeriesWithUsage extends DbSeries {
	locked: boolean;
	evaluations_count: number;
}

/** `public.evaluations` */
export interface DbEvaluation {
	id: string;
	series_id: string;
	form: EvaluationForm;
	/** Secondes ; obligatoire en Course aux nombres, null en Entraînement */
	time_limit: number | null;
	max_attempts: number | null;
	deadline: string | null;
	shuffle_questions: boolean;
	academic_period_id: string | null;
	status: EvaluationStatus;
	created_by: string;
	created_at: string;
	updated_at: string;
}

/** Évaluation avec sa série */
export interface EvaluationWithSeries extends DbEvaluation {
	series: DbSeries;
}

/** `public.evaluation_assignments` */
export interface DbEvaluationAssignment {
	id: string;
	evaluation_id: string;
	class_id: string | null;
	student_id: string | null;
	assigned_by: string;
	assigned_at: string;
}

/** Une tentative, telle que le professeur la voit (E21) */
export interface AttemptSummary {
	/** Note sur 20 ; null tant que la tentative n'est pas envoyée */
	grade: number | null;
	points_earned: number | null;
	total_questions: number | null;
	created_at: string | null;
	completed_at: string | null;
}

/** Assignation vue par l'élève, avec ses tentatives */
export interface AssignmentWithDetails extends DbEvaluationAssignment {
	evaluation: EvaluationWithSeries;
	attempts_count: number;
	/** Meilleure note sur 20 parmi les tentatives envoyées (Q36) */
	best_grade: number | null;
	/** Une tentative est ouverte (commencée, pas envoyée) : elle se reprend */
	has_open_attempt: boolean;
	last_attempt_at: string | null;
	status: StudentEvaluationStatus;
}

/** Une ligne du tableau de résultats du professeur */
export interface EvaluationResult {
	assignment_id: string;
	evaluation_id: string;
	title: string;
	grade: string;
	class_id: string | null;
	student_id: string;
	student_firstname: string | null;
	student_lastname: string | null;
	class_name: string | null;
	/** Meilleure note sur 20 parmi les tentatives envoyées (Q36) */
	best_grade: number | null;
	attempts_count: number;
	/** Toutes les tentatives, la plus récente d'abord (E21) */
	attempts: AttemptSummary[];
	last_attempt_at: string | null;
	status: StudentEvaluationStatus;
	total_questions: number | null;
}

// ===========================================================================
// DONNÉES DE FORMULAIRE
// ===========================================================================

/** Réglages d'une évaluation, tels que le formulaire les envoie */
export interface EvaluationSettingsInput {
	form: EvaluationForm;
	/** Minutes (Course aux nombres) ; null en Entraînement */
	time_limit_minutes: number | null;
	max_attempts: number | null;
	deadline: string | null;
	shuffle_questions: boolean;
}

export const DEFAULT_EVALUATION_SETTINGS: EvaluationSettingsInput = {
	form: 'interactive',
	time_limit_minutes: null,
	max_attempts: null,
	deadline: null,
	shuffle_questions: true
};

// ===========================================================================
// TENTATIVES
// ===========================================================================

/** Un élève peut-il commencer une tentative ? */
export interface AttemptValidation {
	can_attempt: boolean;
	reason?: string;
	attempts_remaining: number | null;
	deadline_passed: boolean;
	current_attempts: number;
}

// ===========================================================================
// STATISTIQUES
// ===========================================================================

export interface EvaluationStatistics {
	evaluation_id: string;
	total_assigned: number;
	not_started: number;
	in_progress: number;
	completed: number;
	expired: number;
	/** Sur 20, calculées sur la meilleure note de chaque élève */
	average_grade: number | null;
	min_grade: number | null;
	max_grade: number | null;
	completion_rate: number;
}

// ===========================================================================
// UTILITAIRES
// ===========================================================================

export function getAttemptsRemaining(
	currentAttempts: number,
	maxAttempts: number | null
): number | null {
	if (maxAttempts === null) return null;
	return Math.max(0, maxAttempts - currentAttempts);
}

export function getStudentStatus(
	attemptsCount: number,
	lastAttemptAt: string | null,
	deadline: string | null
): StudentEvaluationStatus {
	const deadlinePassed = isDeadlinePassedUtil(deadline);

	if (attemptsCount === 0) {
		return deadlinePassed ? 'expired' : 'not_started';
	}
	if (lastAttemptAt === null) {
		return 'in_progress';
	}
	return 'completed';
}

export function getStatusColor(status: StudentEvaluationStatus): string {
	switch (status) {
		case 'not_started':
			return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
		case 'in_progress':
			return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
		case 'completed':
			return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
		case 'expired':
			return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
	}
}

export function getStatusLabel(status: StudentEvaluationStatus): string {
	switch (status) {
		case 'not_started':
			return 'Non commencé';
		case 'in_progress':
			return 'En cours';
		case 'completed':
			return 'Terminé';
		case 'expired':
			return 'Expiré';
	}
}

/** Nombre total de questions d'une série */
export function countSeriesQuestions(categories: CartItem[]): number {
	return categories.reduce((sum, item) => sum + item.quantity, 0);
}

/** Note sur 20 à la française : 13,5/20 ; « – » sans note */
export function formatGrade(grade: number | null | undefined): string {
	if (grade === null || grade === undefined) return '–';
	return `${Number(grade).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}/20`;
}
