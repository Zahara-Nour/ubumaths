/**
 * Bloc ```monnaie — types
 * =======================
 *
 * Pièces et billets fictifs en euros et centimes, à lire ou comparer (CP-043,
 * CP-042, CP-044 et CP-071 en partie ; CE1-054 à 057, 086 ; phase 0 :
 * `docs/archive/wip/monnaie-progress.md`, centimes :
 * `docs/wip/monnaie-centimes-progress.md`) :
 *
 * ```monnaie
 * billets: 20 10 10 ; 1×50
 * pièces: 3×2 1 50c ;
 * disposition: rangé | mélangé
 * légendes: Léa ; Tom
 * ```
 *
 * ou `montant: 48` (le bloc choisit les coupures). Le nœud porte les coupures
 * de chaque ensemble ; le dessin est calculé par `utils/monnaie-scene.ts`,
 * partagé écran / PDF.
 *
 * À construire (`construire: 35`, `réserve: 1 2 5 10 20`, chantier
 * `docs/wip/construire-progress.md`) : l'élève pose des coupures de la réserve
 * sur un plan vide ; dans une question, le bloc porte une case (`case: N`, posée
 * par le générateur) dont la réponse est la somme posée (`utils/monnaie-construire.ts`).
 *
 * @module ubumark/types/monnaie
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/**
 * Pièces, en euros, de la plus grande à la plus petite : 1 et 2 € (CP), puis les
 * six pièces de centimes (CE1, chantier `docs/wip/monnaie-centimes-progress.md`).
 * Les valeurs restent en euros dans le nœud (`0.5` = 50 c) ; tout calcul se fait
 * en centimes entiers (`utils/monnaie-valeurs.ts`)
 */
export const MONNAIE_COINS = [2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01] as const;

/** Pièces de centimes, de la plus grande à la plus petite */
export const MONNAIE_CENT_COINS = [0.5, 0.2, 0.1, 0.05, 0.02, 0.01] as const;

/** Billets, en euros, du plus grand au plus petit (200 et 500 € : CE1, plafond 1 000 €) */
export const MONNAIE_NOTES = [500, 200, 100, 50, 20, 10, 5] as const;

/**
 * Largeur d'un ensemble « pleine largeur », en cm : 8 cm (écran et PDF), 10 cm
 * dans un choix de QCM ; un ensemble plus étroit garde la même échelle. Pas
 * 3 cm comme la collection : l'enfant doit LIRE chaque valeur, illisible à
 * 3 cm (≈ 3 pt). 6 cm décidé par David le 2026-10-25, puis 10 cm le 2026-10-26 :
 * un petit porte-monnaie n'occupe qu'une part de la largeur, et à 6 cm le « 2 € »
 * d'une pièce faisait ≈ 6 px à l'écran (390 px), ≈ 4,5 pt au PDF
 */
export const MONNAIE_SIZE_CM = { min: 2, max: 12, default: 8, choice: 10 } as const;

/** Ensembles d'un bloc (comparaison) */
export const MONNAIE_MAX_SETS = 3;

/** Bornes d'un ensemble : 1 000 € (CE1, décision c2-1) ; 30 objets au plus (décision 5) */
export const MONNAIE_LIMITS = { total: 1000, objects: 30 } as const;

/** Somme à construire (`construire:`), en euros : de 1 c à 1 000 € */
export const MONNAIE_BUILD_RANGE = { min: 0.01, max: 1000 } as const;

/**
 * Coupures permises par défaut d'un bloc à construire, de la plus grande à la plus
 * petite ; une somme à centimes y ajoute `MONNAIE_CENT_COINS`
 */
export const MONNAIE_DEFAULT_RESERVE = [50, 20, 10, 5, 2, 1] as const;

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
	/** Somme à construire (`construire:`) : plan vide, aucun ensemble dessiné (`sets` vide) */
	build?: number;
	/** Coupures permises d'un bloc à construire, de la plus grande à la plus petite */
	reserve?: number[];
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
	/** Bloc à construire dans une question : numéro de sa case (`case: N`, posé par le générateur) */
	caseIndex?: number;
}

export interface MonnaieBlockRange {
	startIndex: number;
	endIndex: number;
}
