/**
 * Bloc ```ranger — type du nœud (étiquettes à ranger)
 * ===================================================
 *
 * Lu par `parser/ranger-parser.ts`. Dans l'énoncé d'une instance, les étiquettes
 * sont dans l'ordre AFFICHÉ (mélangé) et `caseIndex` relie le bloc à
 * `blanks[caseIndex]` (première place ; une case par place). Hors question (cours,
 * page d'aide), le bloc se lit seul, dans l'ordre écrit.
 *
 * @module ubumark/types/ranger
 */

import type { BaseNode } from './ast';

/** Signe entre deux places : `<` (croissant, défaut) ou `>` (décroissant) */
export type RangerSign = '<' | '>';

export interface RangerSpec {
	/** Case de la première place (`case: N`, posée par le générateur) ; absente hors question */
	caseIndex?: number;
	sign: RangerSign;
	/** Étiquettes (ubumark), dans l'ordre du bloc */
	labels: string[];
	/** Messages pour l'auteur (bloc mal écrit) */
	errors: string[];
}

export interface RangerNode extends BaseNode, RangerSpec {
	type: 'ranger';
	/** Texte entre les clôtures, tel qu'écrit (éditeur riche : bloc gardé tel quel) */
	source: string;
}
