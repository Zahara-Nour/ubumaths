/**
 * Erreurs de la classe sur un point du programme (chantier `erreurs-frequentes`, PR 2).
 *
 * Partagé entre le serveur (`server/stats/point-errors.ts`) et la fenêtre
 * « élèves concernés » du widget « Top points à remédier ».
 */

import type { EvaluationQuestionErrors } from '$lib/types/evaluation-breakdown';

/** Erreurs d'un modèle du point : mêmes blocs que le bilan d'un contrôle */
export interface PointTemplateErrors {
	templateId: string;
	title: string;
	/** Réponses de séries au-delà du plafond, non lues (les plus anciennes) */
	capped: boolean;
	errors: Extract<EvaluationQuestionErrors, { status: 'ok' }>;
}

export type ClassPointErrors =
	| {
			status: 'ok';
			/** Modèles ayant au moins une réponse écrite, du plus d'erreurs au moins */
			templates: PointTemplateErrors[];
	  }
	| { status: 'error'; message: string };

/** Plafond de traces de séries lues par modèle (les plus récentes) */
export const POINT_ERRORS_TRACE_CAP = 200;

export const POINT_ERRORS_MESSAGE = 'Les erreurs ne peuvent pas être chargées pour le moment.';
export const POINT_ERRORS_EMPTY =
	'Pas encore de réponse écrite sur ce point (les flash-cards ne gardent pas de réponse).';
