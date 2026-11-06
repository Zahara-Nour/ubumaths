/**
 * Bloc ```collection — types
 * ==========================
 *
 * Collections d'objets à dénombrer ou comparer (CP-001, CP-070, CP-004 en
 * partie ; phase 0 : `docs/archive/wip/collection-progress.md`) :
 *
 * ```collection
 * milliers: 1 ; 0
 * centaines: 2 ; 4
 * dizaines: 3 ; 2
 * unités: 15 ; 8
 * dessin: barres | paquets
 * unités en: vrac | rangées
 * légendes: A ; B
 * ```
 *
 * Le nœud porte les quantités et les réglages ; le dessin (position de chaque
 * objet) est calculé par `utils/collection-scene.ts`, partagé écran / PDF.
 *
 * À construire (`construire: 34`, chantier `docs/wip/construire-progress.md`) :
 * l'élève pose barres et cubes sur un plan vide ; dans une question, le bloc
 * porte une case (`case: N`, posée par le générateur) dont la réponse est la
 * valeur posée (`utils/collection-construire.ts`).
 *
 * @module ubumark/types/collection
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/**
 * Largeur d'une collection « pleine largeur », en cm : 8 cm (écran et PDF), 12 cm
 * pour un bloc à centaines ou milliers (`large`, objets dessinés plus petits), 3 cm dans
 * un choix de QCM. Une collection plus étroite garde la même échelle : deux
 * collections comparées ont des objets de même taille.
 */
export const COLLECTION_SIZE_CM = { min: 2, max: 12, default: 8, choice: 3, large: 12 } as const;

/** Nombre de collections d'un bloc (comparaison) */
export const COLLECTION_MAX_SETS = 3;

/** Bornes des quantités (CP : nombres jusqu'à 100) */
export const COLLECTION_LIMITS = { tens: 10, units: 100, total: 100 } as const;

/**
 * Bornes d'un bloc à centaines ou milliers (CE1, CE2 : jusqu'à 9 999 ; le BO
 * cite « 32 centaines », « 27 dizaines »). Phase 0 : `docs/wip/collection-centaines-progress.md`
 */
export const COLLECTION_LARGE_LIMITS = {
	thousands: 9,
	hundreds: 40,
	tens: 30,
	units: 100,
	total: 9999
} as const;

/** Valeur à construire (`construire:`) ; à partir de `large`, plaques (et gros cubes dès 1 000) */
export const COLLECTION_BUILD_RANGE = { min: 1, max: 9999, large: 100 } as const;

/** Longueur maximale d'une légende, en caractères */
export const COLLECTION_CAPTION_MAX = 40;

/** Légendes données d'office quand le bloc a plusieurs collections */
export const COLLECTION_DEFAULT_CAPTIONS = ['A', 'B', 'C'] as const;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const COLLECTION_UNAVAILABLE = 'Collection indisponible';

/**
 * Nom accessible d'une collection : il ne dit JAMAIS combien d'objets elle
 * compte, sinon un lecteur d'écran donnerait la réponse
 */
export const COLLECTION_ARIA_LABEL = "Collection d'objets";

export const COLLECTION_DRAWINGS = ['barres', 'paquets'] as const;
export const COLLECTION_UNIT_LAYOUTS = ['vrac', 'rangées'] as const;

/** `barres` : barres de dix cubes et cubes ; `paquets` : 10 jetons entourés et jetons */
export type CollectionDrawing = (typeof COLLECTION_DRAWINGS)[number];
/** `vrac` : objets isolés éparpillés ; `rangées` : lignes de 5 + 5 */
export type CollectionUnitLayout = (typeof COLLECTION_UNIT_LAYOUTS)[number];

// ============================================================================
// NŒUD
// ============================================================================

/** Une collection : gros cubes de mille, plaques de cent, groupes de dix et objets isolés */
export interface CollectionSet {
	thousands: number;
	hundreds: number;
	tens: number;
	units: number;
}

export interface CollectionSpec {
	/** 1 à 3 collections, dans l'ordre des lignes `dizaines:` / `unités:` */
	sets: CollectionSet[];
	/** Une légende par collection, ou null (A, B, C d'office s'il y en a plusieurs) */
	captions: string[] | null;
	drawing: CollectionDrawing;
	unitLayout: CollectionUnitLayout;
	/** Taille donnée par `taille:` ; null = taille par défaut du contexte */
	sizeCm: number | null;
	/** Valeur à construire (`construire:`) : plan vide, aucun ensemble dessiné (`sets` vide) */
	build?: number;
	/**
	 * Bloc à centaines ou milliers (`centaines:` ou `milliers:` écrit, ou `construire:`
	 * de 100 et plus) : plafonds `COLLECTION_LARGE_LIMITS`, objets dessinés plus petits
	 */
	large?: true;
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface CollectionIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```collection */
	line?: number;
}

export interface CollectionNode extends BaseNode {
	type: 'collection';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: CollectionSpec | null;
	errors: CollectionIssue[];
	/** Bloc à construire dans une question : numéro de sa case (`case: N`, posé par le générateur) */
	caseIndex?: number;
}

export interface CollectionBlockRange {
	startIndex: number;
	endIndex: number;
}
