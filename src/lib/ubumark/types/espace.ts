/**
 * Bloc ```cubes (nœud `espace`) — types
 * =====================================
 *
 * Assemblage de cubes en perspective cavalière, ou l'une de ses vues
 * (chantier `solides`, ADR 0034) :
 *
 * ```cubes
 * hauteurs: 2 1 1 / 1 0 1
 * vue: perspective
 * ```
 *
 * Un seul nœud `espace` pour tous les blocs « d'espace » : le genre (`kind`
 * de la spécification) dit ce qu'on dessine. Au lot 1 SEUL le genre `cubes`
 * existe ; les genres `solide` et `patron` viendront ensuite.
 *
 * Le dessin (polygones) est calculé par `utils/espace-scene.ts`, partagé
 * écran / PDF.
 *
 * @module ubumark/types/espace
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Les mots d'ouverture (```mot) des blocs d'espace, un par genre */
export const ESPACE_FENCES = ['cubes'] as const;

export type EspaceKind = (typeof ESPACE_FENCES)[number];

/** Bornes d'un assemblage de cubes : 6 rangées × 6 colonnes × 6 niveaux */
export const CUBES_LIMITS = { rows: 6, cols: 6, height: 6 } as const;

/** Les vues d'un assemblage (`vue:`), la perspective par défaut */
export const CUBES_VIEWS = ['perspective', 'dessus', 'face', 'droite', 'gauche'] as const;

export type CubesView = (typeof CUBES_VIEWS)[number];

/** Les clés du bloc ```cubes */
export const CUBES_KEYS = ['hauteurs', 'vue'] as const;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const ESPACE_UNAVAILABLE = 'Solide indisponible';

// ============================================================================
// NŒUD
// ============================================================================

/**
 * Ce que dit un bloc d'espace, par genre.
 *
 * `cubes` : `heights[r][c]` = nombre de cubes empilés ; rangée 0 = AU FOND,
 * dernière rangée = DEVANT ; colonnes de gauche à droite. Les rangées et
 * colonnes vides au bord sont déjà retirées, un trou intérieur reste.
 */
export type EspaceSpec = { kind: 'cubes'; heights: number[][]; view: CubesView };

export interface EspaceNode extends BaseNode {
	type: 'espace';
	/** Le mot d'ouverture du bloc (aller-retour de l'éditeur riche) */
	genre: EspaceKind;
	/** Texte du bloc, sans les clôtures */
	source: string;
	/** null si le bloc est en erreur */
	spec: EspaceSpec | null;
	/** Phrases pour l'AUTEUR (jamais montrées à l'élève), « Ligne N : … » */
	errors: string[];
}

export interface EspaceBlockRange {
	startIndex: number;
	endIndex: number;
}
