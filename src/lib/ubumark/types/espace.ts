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

/** Les vues que l'élève peut dessiner (`dessiner:`) : toutes sauf la perspective */
export const CUBES_DRAWN_VIEWS = ['dessus', 'face', 'droite', 'gauche'] as const;

export type CubesDrawnView = (typeof CUBES_DRAWN_VIEWS)[number];

/** Les vues données à `retrouver:` : la vue de dessus est TOUJOURS donnée (grille de saisie) */
export const CUBES_SIDE_VIEWS = ['face', 'droite', 'gauche'] as const;

export type CubesSideView = (typeof CUBES_SIDE_VIEWS)[number];

/**
 * Les clés du bloc ```cubes (`dessiner:`, `retrouver:` : gestes de l'élève ;
 * `case:` posée par le générateur de questions)
 */
export const CUBES_KEYS = ['hauteurs', 'vue', 'dessiner', 'retrouver', 'case'] as const;

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
export type EspaceSpec = {
	kind: 'cubes';
	heights: number[][];
	view: CubesView;
	/** Geste de l'élève (lot 2) ; absent : affichage seul */
	task?: CubesTask;
};

/**
 * Geste de l'élève sur un assemblage :
 * - `dessiner` : la perspective et un quadrillage vide, l'élève colorie la vue `view` ;
 * - `retrouver` : la vue de dessus (grille de saisie) et les vues `views`, l'élève
 *   écrit une hauteur par carreau ; jugé « mêmes vues ».
 */
export type CubesTask =
	{ kind: 'dessiner'; view: CubesDrawnView } | { kind: 'retrouver'; views: CubesSideView[] };

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
	/** Geste dans une question : sa case, posée par le générateur (`case: N`) */
	caseIndex?: number;
}

export interface EspaceBlockRange {
	startIndex: number;
	endIndex: number;
}
