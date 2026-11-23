/**
 * Bloc ```trous — type du nœud (texte à trous à étiquettes)
 * =========================================================
 *
 * Lu par `parser/trous-parser.ts`. Le prof écrit son texte, chaque trou étant sa
 * bonne étiquette entre crochets (`[arithmétique]`, `[$r$]`) ; `intrus: a ; b`
 * en dernière ligne ajoute des étiquettes sans trou. Dans l'énoncé d'une instance,
 * les trous sont vides (`[]`), les étiquettes dans l'ordre AFFICHÉ (`étiquettes:`)
 * et `caseIndex` relie le bloc à `blanks[caseIndex]` (premier trou ; une case par
 * trou). Hors question (cours, page d'aide), le bloc se lit seul, réponses comprises.
 *
 * @module ubumark/types/trous
 */

import type { BaseNode } from './ast';

/** Un morceau d'une ligne du texte : du markdown en ligne, ou un trou (son rang) */
export type TrousSegment = { kind: 'text'; text: string } | { kind: 'hole'; hole: number };

export interface TrousSpec {
	/** Case du premier trou (`case: N`, posée par le générateur) ; absente hors question */
	caseIndex?: number;
	/** Les lignes non vides du texte, chacune coupée en morceaux de texte et trous */
	lines: TrousSegment[][];
	/**
	 * Étiquettes (ubumark), chacune une fois : dans l'ordre de leur première
	 * apparition, intrus en dernier (bloc du prof), ou dans l'ordre affiché (instance)
	 */
	labels: string[];
	/** Bonne étiquette de chaque trou (rang dans `labels`) ; `null` : trou vide (instance) */
	answers: (number | null)[];
	/** Messages pour l'auteur (bloc mal écrit) */
	errors: string[];
}

export interface TrousNode extends BaseNode, TrousSpec {
	type: 'trous';
	/** Texte entre les clôtures, tel qu'écrit (éditeur riche : bloc gardé tel quel) */
	source: string;
}
