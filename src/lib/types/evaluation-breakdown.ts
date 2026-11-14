/**
 * Bilan d'un contrôle par question et par notion (chantier `bilan-controle`, P6).
 *
 * Partagé entre le serveur (calcul, lecture) et la page résultats du professeur.
 */

import type { QuestionInstance, ValidationStatus } from '$lib/questions/types';
import type { CorrectedDetail } from '$lib/types/evaluation-attempt';

/** Répartition des réponses : juste (1) / partiel (½) / faux, mauvaise forme comprise (0) / sans réponse */
export interface BreakdownCounts {
	correct: number;
	partial: number;
	incorrect: number;
	empty: number;
}

/** Réponses comptées sur une ligne du bilan */
export interface BreakdownTally extends BreakdownCounts {
	/** Nombre de réponses comptées */
	answers: number;
	/** Points obtenus (1 / ½ / 0 par réponse) */
	pointsEarned: number;
	/** Points obtenus / points possibles, en % ; null sans réponse */
	successRate: number | null;
}

/** Une question de la série (un modèle) */
export interface QuestionBreakdown extends BreakdownTally {
	/** null : modèle supprimé depuis */
	templateId: string | null;
	title: string;
}

/** Une notion du programme (branche › notion) */
export interface NotionBreakdown extends BreakdownTally {
	/** null : « Sans notion » (modèle sans point du programme) */
	notionId: string | null;
	branch: string | null;
	notion: string;
}

export type EvaluationBreakdown =
	| {
			status: 'ok';
			/** Copies comptées (une par élève, la meilleure) */
			copies: number;
			/** Copies rendues en retard (aucune réponse), non comptées */
			lateCopies: number;
			/** Dans l'ordre de la composition */
			questions: QuestionBreakdown[];
			/** Du taux le plus faible au plus fort, « Sans notion » en dernier */
			notions: NotionBreakdown[];
	  }
	| { status: 'error'; message: string };

/** Libellés des lignes particulières */
export const NO_NOTION_LABEL = 'Sans notion';
export const DELETED_TEMPLATE_LABEL = 'Modèle supprimé';
export const UNKNOWN_TEMPLATE_LABEL = 'Modèle indisponible';
export const BREAKDOWN_ERROR_MESSAGE = 'Le bilan ne peut pas être calculé pour le moment.';

// ---------------------------------------------------------------------------
// Erreurs de la classe sur une question (chantier `erreurs-frequentes`, PR 1)
// ---------------------------------------------------------------------------

/** Message quand les erreurs d'une question ne se chargent pas */
export const QUESTION_ERRORS_MESSAGE = 'Les erreurs ne peuvent pas être chargées pour le moment.';

/** Une case d'une question à plusieurs cases : réponses fausses ou partielles / réponses jugées */
export interface BlankErrorStat {
	/** Numéro de la case, à partir de 1 */
	blank: number;
	errors: number;
	answers: number;
}

/** Même énoncé tiré ET même réponse : un groupe, avec les élèves concernés */
export interface QuestionErrorGroup {
	/** Énoncé tiré (instance complète, sans la position dans la copie) */
	instance: QuestionInstance;
	/** Réponse de l'élève, une valeur par case */
	values: string[];
	/** Statut enregistré : faux, mauvaise forme ou forme non optimale */
	status: ValidationStatus;
	/** Verdict recalculé par le serveur (ou indisponible) */
	verdict: CorrectedDetail;
	/** Noms des élèves, en texte brut */
	students: string[];
}

export type EvaluationQuestionErrors =
	| {
			status: 'ok';
			/** Copies comptées ayant répondu à cette question (sans réponse comprises) */
			answers: number;
			/** Réponses laissées sans réponse, comptées à part */
			withoutAnswer: number;
			/** Statistiques par case ; vide sauf question à plusieurs cases hors QCM */
			blanks: BlankErrorStat[];
			/** Réponses fausses ou partielles, regroupées ; vide : aucune erreur */
			groups: QuestionErrorGroup[];
	  }
	| { status: 'error'; message: string };
