/**
 * Bilan d'un contrôle par question et par notion (chantier `bilan-controle`, P6).
 *
 * Partagé entre le serveur (calcul, lecture) et la page résultats du professeur.
 */

/** Répartition des réponses : juste / partiel (½ point) / faux / sans réponse */
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
