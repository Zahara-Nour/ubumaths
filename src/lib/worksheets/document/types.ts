/**
 * Le document d'une fiche, tel qu'un PDF l'imprime (ADR 0028)
 * ===========================================================
 *
 * Un seul modèle, rempli par deux adaptateurs :
 * - `documentFromTeacherCopy` : la copie recalculée côté prof (`InstanceData`) ;
 * - `documentFromStudentView` : la vue de l'élève, corrections déjà filtrées
 *   par le serveur.
 *
 * Les exercices y sont déjà dans l'ordre d'affichage et numérotés (règle unique
 * de `exercise-numbering.ts`) : le rendu n'a plus rien à trier, et une même
 * fiche donne les mêmes numéros dans tous les PDF.
 *
 * @module worksheets/document/types
 */

import type { ContentLocale } from '$lib/types/locale';
import type { CapitalPairs } from '$lib/mathAST/parser/types';
import type { WorksheetType } from '$lib/types/worksheets';

/**
 * Ce que contient le PDF (vocabulaire de l'ADR 0028) :
 * - `worksheet` : la fiche, énoncés seuls ;
 * - `answers` : les résultats seuls ;
 * - `correction` : le corrigé, toujours détaillé (ADR 0030).
 */
export type DocumentForm = 'worksheet' | 'answers' | 'correction';

/** Une section de la fiche, dans la langue du document */
export interface DocumentSection {
	id: string;
	title: string;
	/** Consigne de la section : fait partie de l'énoncé */
	instructions: string | null;
}

/**
 * Ce qu'un exercice peut imprimer après l'énoncé. Chaînes vides ramenées à
 * `null` : « non écrit » se teste une seule fois, ici.
 */
export interface DocumentCorrection {
	/** Le corrigé (markdown) ; `null` : correction non écrite */
	solution: string | null;
	/** Les résultats seuls (markdown) ; `null` : réponses non rédigées */
	answers: string | null;
}

/** Un exercice de la fiche, prêt à imprimer */
export interface DocumentExercise {
	/** Numéro affiché, déjà au style de la fiche (`3`, `C`, `III`) */
	number: string;
	/** Section d'affichage ; `null` : hors section (ou section inconnue) */
	sectionId: string | null;
	title: string | null;
	/** Énoncé (markdown) */
	statement: string;
	/**
	 * Réponses et corrigé. `null` : correction NON VISIBLE pour ce lecteur,
	 * jamais imprimée, quelle que soit la forme.
	 */
	correction: DocumentCorrection | null;
	points: number | null;
	/** Consigne du prof pour cet exercice : fait partie de l'énoncé */
	instructions: string | null;
	/** Exercice indispensable (★) */
	essential: boolean;
	/** Lettres déclarées comme fonctions ; absent : défauts du parseur */
	genericFunctions: string[] | null;
	/** Sens de deux majuscules collées (`AB`) ; absent : produit */
	capitalPairs?: CapitalPairs;
}

/**
 * Ce que le type de la fiche (ADR 0030, `worksheetHeader`) change au rendu
 * d'un exercice. Numérotation : toujours en chiffres arabes.
 */
export interface DocumentDisplay {
	/** Points par exercice affichés */
	showPoints: boolean;
	/** L'élève répond sur le sujet : un cadre de réponse sous l'énoncé */
	answersOnSheet: boolean;
	/**
	 * Copie d'un élève servant de document de classe (affectation dont chaque
	 * élève a sa version, D6) : ni numéro ni carré, le titre seul — l'ordre et
	 * les numéros de cette copie ne sont ceux de personne d'autre.
	 */
	titleOnly?: boolean;
}

/** Le document d'une fiche */
export interface WorksheetDocument {
	title: string;
	type: WorksheetType;
	locale: ContentLocale;
	description: string | null;
	/** L'affectation, quand le document en vient (consignes données à la classe) */
	assignment: { instructions: string | null } | null;
	/** Dans l'ordre d'affichage, numérotés */
	exercises: DocumentExercise[];
	/** Dans l'ordre d'affichage */
	sections: DocumentSection[];
	display: DocumentDisplay;
}
