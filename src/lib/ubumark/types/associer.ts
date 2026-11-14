/**
 * Bloc ```associer — type du nœud (associer deux colonnes)
 * ========================================================
 *
 * Lu par `parser/associer-parser.ts`. Le prof écrit chaque élément de gauche avec
 * sa bonne étiquette (`- élément -> étiquette`) ; `- -> intrus` ajoute une
 * étiquette sans élément. Dans l'énoncé d'une instance, les étiquettes sont dans
 * l'ordre AFFICHÉ (mélangé), les liens retirés, et `caseIndex` relie le bloc à
 * `blanks[caseIndex]` (premier élément ; une case par élément). Hors question
 * (cours, page d'aide), le bloc se lit seul, liens compris.
 *
 * @module ubumark/types/associer
 */

import type { BaseNode } from './ast';

/**
 * Geste de l'élève : `relier` (défaut), un trait d'un point à l'autre ; `etiquettes`
 * (`geste: étiquettes`), poser une étiquette sur la place de chaque élément
 */
export type AssocierGesture = 'relier' | 'etiquettes';

export interface AssocierSpec {
	/** Case du premier élément (`case: N`, posée par le générateur) ; absente hors question */
	caseIndex?: number;
	gesture: AssocierGesture;
	/** Éléments de gauche (ubumark), dans l'ordre écrit */
	items: string[];
	/**
	 * Étiquettes de droite (ubumark), chacune une fois : dans l'ordre de leur
	 * première apparition (bloc du prof), ou dans l'ordre affiché (instance)
	 */
	labels: string[];
	/** Bonne étiquette de chaque élément (rang dans `labels`) ; `null` : lien retiré (instance) */
	answers: (number | null)[];
	/** Messages pour l'auteur (bloc mal écrit) */
	errors: string[];
}

export interface AssocierNode extends BaseNode, AssocierSpec {
	type: 'associer';
	/** Texte entre les clôtures, tel qu'écrit (éditeur riche : bloc gardé tel quel) */
	source: string;
}
