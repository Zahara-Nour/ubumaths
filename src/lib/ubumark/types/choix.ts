/**
 * Bloc ```choix — type du nœud (case « choix », chantier figure-et-choix)
 * =======================================================================
 *
 * Lu par `parser/choix-parser.ts`. Dans l'énoncé d'une instance, les choix sont
 * dans l'ordre AFFICHÉ et `caseIndex` relie le bloc à `blanks[caseIndex]` ; hors
 * question (cours, aperçu), le bloc se lit seul, liste A, B, C non cliquable.
 *
 * @module ubumark/types/choix
 */

import type { BaseNode } from './ast';

export interface ChoiceNode extends BaseNode {
	type: 'choice';
	/** Case de la question (`case: N`, posée par le générateur) ; absente hors question */
	caseIndex?: number;
	/** `plusieurs: oui` : cases à cocher ; sinon ronds */
	multiple: boolean;
	/** Choix (markdown), dans l'ordre du bloc */
	choices: string[];
	/** Messages pour l'auteur (bloc mal écrit) */
	errors: string[];
	/** Texte entre les clôtures, tel qu'écrit (éditeur riche : bloc gardé tel quel) */
	source: string;
}
