/**
 * Bloc ```yohaku — types
 * ======================
 *
 * Grille 2 × 2 jugée par ses contraintes (chantier `outil-yohaku`, journal
 * `docs/wip/outil-yohaku-progress.md`, outil n° 56). Au bout de chaque ligne et de chaque
 * colonne, son produit (ou sa somme) ; l'élève remplit les cases entre crochets. Plusieurs
 * remplissages sont justes : la grille est jugée sur ses produits, pas sur une solution.
 *
 * ```yohaku
 * opération: produit
 * ligne: [x+2] | [x+3]
 * ligne: [2x+1] | x+1
 * ```
 *
 * L'auteur écrit UNE solution (syntaxe maison, variables `{{a}}` résolues avant) ; le bloc
 * calcule les produits, développés et réduits.
 *
 * @module ubumark/types/yohaku
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Taille de la grille (Q1 de la phase 0 : 2 × 2 seulement) */
export const YOHAKU_TAILLE = 2;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const YOHAKU_UNAVAILABLE = 'Grille indisponible';

export type YohakuOperation = 'somme' | 'produit';

// ============================================================================
// GRILLE
// ============================================================================

export interface YohakuCase {
	/** La solution de l'auteur, en syntaxe maison nettoyée (`x - 3`) */
	source: string;
	/** La même, en LaTeX (affichage et corrigé) */
	latex: string;
	/** Entre crochets : l'élève la remplit */
	aRemplir: boolean;
}

export interface YohakuSpec {
	operation: YohakuOperation;
	/** Cases, par ligne puis par colonne (`cases[ligne][colonne]`, 0 = en haut / à gauche) */
	cases: YohakuCase[][];
	/** Total de chaque ligne, en LaTeX (développé, réduit) */
	lignes: string[];
	/** Total de chaque colonne, en LaTeX */
	colonnes: string[];
	/** `solution: oui` : la solution montrée dans les cases (corrigé imprimé, cours) */
	solution: boolean;
}

// ============================================================================
// NŒUD
// ============================================================================

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface YohakuIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```yohaku */
	line?: number;
}

export interface YohakuNode extends BaseNode {
	type: 'yohaku';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: YohakuSpec | null;
	errors: YohakuIssue[];
	/** Sa case, posée par le générateur (`case: N`), question seulement */
	caseIndex?: number;
}

export interface YohakuBlockRange {
	startIndex: number;
	endIndex: number;
}
