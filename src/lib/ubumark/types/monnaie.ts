/**
 * Bloc ```monnaie — types
 * =======================
 *
 * Pièces et billets fictifs en euros, à lire ou comparer (CP-043, CP-042,
 * CP-044 et CP-071 en partie ; phase 0 : `docs/wip/monnaie-progress.md`) :
 *
 * ```monnaie
 * billets: 20 10 10 ; 1×50
 * pièces: 3×2 1 ;
 * disposition: rangé | mélangé
 * légendes: Léa ; Tom
 * ```
 *
 * ou `montant: 48` (le bloc choisit les coupures). Le nœud porte les coupures
 * de chaque ensemble ; le dessin est calculé par `utils/monnaie-scene.ts`,
 * partagé écran / PDF.
 *
 * @module ubumark/types/monnaie
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Pièces de la v1, en euros (décision 2) */
export const MONNAIE_COINS = [2, 1] as const;

/** Billets de la v1, en euros (décision 2) */
export const MONNAIE_NOTES = [100, 50, 20, 10, 5] as const;

/** Billets qui existent mais viendront avec un lot CE1 (plafond 1 000 €) */
export const MONNAIE_RESERVED_NOTES = [200, 500] as const;

/**
 * Largeur d'un ensemble « pleine largeur », en cm : 8 cm (écran et PDF), 3 cm
 * dans un choix de QCM ; un ensemble plus étroit garde la même échelle
 */
export const MONNAIE_SIZE_CM = { min: 2, max: 12, default: 8, choice: 3 } as const;

/** Ensembles d'un bloc (comparaison) */
export const MONNAIE_MAX_SETS = 3;

/** Bornes d'un ensemble : CP, montants jusqu'à 100 € ; 30 objets au plus (décision 5) */
export const MONNAIE_LIMITS = { total: 100, objects: 30 } as const;

/** Longueur maximale d'une légende, en caractères */
export const MONNAIE_CAPTION_MAX = 40;

/** Légendes données d'office quand le bloc a plusieurs ensembles */
export const MONNAIE_DEFAULT_CAPTIONS = ['A', 'B', 'C'] as const;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const MONNAIE_UNAVAILABLE = 'Monnaie indisponible';

/**
 * Nom accessible d'un ensemble : il ne dit JAMAIS le total, sinon un lecteur
 * d'écran donnerait la réponse (les valeurs écrites sur chaque coupure restent
 * visibles : l'enfant doit les lire)
 */
export const MONNAIE_ARIA_LABEL = 'Pièces et billets';

export const MONNAIE_LAYOUTS = ['rangé', 'mélangé'] as const;

/** `rangé` : triés, le plus grand d'abord ; `mélangé` : billets dans un ordre tiré, pièces en vrac */
export type MonnaieLayout = (typeof MONNAIE_LAYOUTS)[number];

// ============================================================================
// NŒUD
// ============================================================================

/** Un ensemble : valeurs de ses billets et de ses pièces, en euros, du plus grand au plus petit */
export interface MonnaieSet {
	notes: number[];
	coins: number[];
}

export interface MonnaieSpec {
	/** 1 à 3 ensembles, dans l'ordre des valeurs séparées par `;` */
	sets: MonnaieSet[];
	/** Une légende par ensemble, ou null (A, B, C d'office s'il y en a plusieurs) */
	captions: string[] | null;
	layout: MonnaieLayout;
	/** Taille donnée par `taille:` ; null = taille par défaut du contexte */
	sizeCm: number | null;
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface MonnaieIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```monnaie */
	line?: number;
}

export interface MonnaieNode extends BaseNode {
	type: 'monnaie';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: MonnaieSpec | null;
	errors: MonnaieIssue[];
}

export interface MonnaieBlockRange {
	startIndex: number;
	endIndex: number;
}
