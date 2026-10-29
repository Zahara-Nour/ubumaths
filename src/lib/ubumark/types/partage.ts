/**
 * Bloc ```partage — types
 * =======================
 *
 * Figure partagée en parts égales, dont certaines sont coloriées (fractions,
 * CM1 / CM2 ; phase 0 : `docs/wip/fractions-a-colorier-progress.md`) :
 *
 * ```partage
 * forme: bande 8
 * gris: 3
 * ```
 *
 * Le nœud porte la forme et les rangs coloriés ; le dessin (polygones des
 * parts) est calculé par `utils/partage-scene.ts`, partagé écran / PDF.
 *
 * @module ubumark/types/partage
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Nombre de parts d'une bande ou d'un disque */
export const PARTAGE_PARTS = { min: 2, max: 12 } as const;

/** Lignes et colonnes d'une grille (10 × 10 : les centièmes) */
export const PARTAGE_GRID = { min: 1, max: 10 } as const;

/** Nombre de parts du carré coupé par ses deux diagonales */
export const PARTAGE_SQUARE_PARTS = 4;

/** Les clés du bloc (`colorier:` et `case:` : figure à colorier dans une question) */
export const PARTAGE_KEYS = ['forme', 'gris', 'colorier', 'case'] as const;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const PARTAGE_UNAVAILABLE = 'Partage indisponible';

// ============================================================================
// NŒUD
// ============================================================================

export type PartageShape =
	| { kind: 'bande'; parts: number }
	| { kind: 'grille'; rows: number; cols: number }
	| { kind: 'disque'; parts: number }
	| { kind: 'carre-diagonales' };

/** Nombre total de parts d'une forme */
export function partageTotal(shape: PartageShape): number {
	switch (shape.kind) {
		case 'bande':
		case 'disque':
			return shape.parts;
		case 'grille':
			return shape.rows * shape.cols;
		case 'carre-diagonales':
			return PARTAGE_SQUARE_PARTS;
	}
}

/** Ce que l'élève doit colorier (`colorier: 3/8`) */
export interface PartageColorier {
	/** Fraction telle qu'écrite par le prof, pour les phrases de la correction */
	num: number;
	den: number;
	/** Nombre de parts à colorier sur CETTE figure (num × total ÷ den, entier) */
	parts: number;
}

export interface PartageSpec {
	shape: PartageShape;
	/** Rangs coloriés (à partir de 1), distincts, en ordre croissant ; vide : aucune part coloriée */
	gray: number[];
	/**
	 * Figure à colorier (une question) : la figure est dessinée SANS part coloriée,
	 * l'élève colorie. Exclusif avec `gris:`.
	 */
	colorier?: PartageColorier;
}

export interface PartageNode extends BaseNode {
	type: 'partage';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: PartageSpec | null;
	/** Phrases pour l'AUTEUR (jamais montrées à l'élève), « Ligne N : … » */
	errors: string[];
	/** Figure à colorier : sa case, posée par le générateur (`case: N`) */
	caseIndex?: number;
}

export interface PartageBlockRange {
	startIndex: number;
	endIndex: number;
}
