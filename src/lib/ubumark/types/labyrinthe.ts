/**
 * Bloc ```labyrinthe — types
 * ==========================
 *
 * Grille de nombres à parcourir (chantier `labyrinthe`, journal
 * `docs/archive/wip/labyrinthe/labyrinthe-progress.md`, outil n° 53). L'élève va de l'entrée (à gauche) à une
 * sortie (à droite) en ne passant que par les cases dont le nombre suit la règle.
 *
 * ```labyrinthe
 * grille: 6 x 4
 * règle: premier
 * parcourir: oui
 * ```
 *
 * Le chemin et les nombres sont tirés d'une graine (`graine:`, posée par le générateur dans
 * une question ; sinon tirée du texte du bloc) : même texte, même labyrinthe.
 *
 * @module ubumark/types/labyrinthe
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Colonnes : 3 à 7 ; lignes : 2 à 7 */
export const LABYRINTHE_MIN_COLONNES = 3;
export const LABYRINTHE_MAX_COLONNES = 7;
export const LABYRINTHE_MIN_LIGNES = 2;
export const LABYRINTHE_MAX_LIGNES = 7;

/** Diviseur d'une règle « multiple de n » : 2 à 99 */
export const LABYRINTHE_MIN_DIVISEUR = 2;
export const LABYRINTHE_MAX_DIVISEUR = 99;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const LABYRINTHE_UNAVAILABLE = 'Labyrinthe indisponible';

/** Rangs d'un chiffre, du plus petit au plus grand ; leur position (0 = unités) */
export const RANGS = [
	'dix-millièmes',
	'millièmes',
	'centièmes',
	'dixièmes',
	'unités',
	'dizaines',
	'centaines',
	'unités de mille',
	'dizaines de mille'
] as const;

export type Rang = (typeof RANGS)[number];

/** Position d'un rang : -4 (dix-millièmes) à 4 (dizaines de mille) */
export const positionDuRang = (rang: Rang): number => RANGS.indexOf(rang) - 4;

// ============================================================================
// RÈGLE ET GRILLE
// ============================================================================

export type Regle =
	| { kind: 'premier' }
	| { kind: 'multiple'; diviseur: number }
	| { kind: 'chiffre'; rang: Rang; chiffre: number };

/** Une case : ligne (1 = en haut) et colonne (1 = à gauche) */
export interface Case {
	ligne: number;
	col: number;
}

/** Un labyrinthe tiré */
export interface Labyrinthe {
	/** Ligne de l'entrée, sur le bord gauche */
	entree: number;
	/** Nombres écrits, par ligne puis par colonne (`nombres[ligne - 1][col - 1]`) */
	nombres: string[][];
	/** Le seul chemin juste, de l'entrée à sa sortie (la ligne de sa dernière case) */
	chemin: Case[];
}

// ============================================================================
// NŒUD
// ============================================================================

export interface LabyrintheSpec extends Labyrinthe {
	colonnes: number;
	lignes: number;
	regle: Regle;
	/** `parcourir: oui` : une question, l'élève trace le chemin */
	parcourir: boolean;
	/** `solution: oui` : le chemin montré (corrigé imprimé, cours) */
	solution: boolean;
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface LabyrintheIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```labyrinthe */
	line?: number;
}

export interface LabyrintheNode extends BaseNode {
	type: 'labyrinthe';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: LabyrintheSpec | null;
	errors: LabyrintheIssue[];
	/** Sa case, posée par le générateur (`case: N`), question seulement */
	caseIndex?: number;
}

export interface LabyrintheBlockRange {
	startIndex: number;
	endIndex: number;
}
