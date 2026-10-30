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
 * de la spécification) dit ce qu'on dessine : `cubes` (assemblage) et `solide`
 * (cube, pavé, prisme, pyramide, cylindre, cône, boule) ; `patron` viendra
 * ensuite.
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
export const ESPACE_FENCES = ['cubes', 'solide'] as const;

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

/** Les clés du bloc ```solide */
export const SOLIDE_KEYS = ['forme', 'sommets', 'marquer', 'cotes', 'cachees'] as const;

/**
 * Les formes d'un ```solide (mot de `forme:`, puis la base s'il y a lieu) et le
 * nombre de leurs dimensions.
 */
export const SOLIDE_FORMS = {
	cube: 1,
	pave: 3,
	'prisme-triangle': 3,
	'prisme-triangle-rectangle': 3,
	'pyramide-carree': 2,
	'pyramide-rectangle': 3,
	'pyramide-triangle': 2,
	cylindre: 2,
	cone: 2,
	boule: 1
} as const;

export type SolideForm = keyof typeof SOLIDE_FORMS;

/** Unités de `cotes:` (`''` : `cotes: oui`, nombres sans unité) */
export const SOLIDE_UNITS = ['cm', 'mm', 'm'] as const;

/** Rapport le plus grand permis entre deux dimensions d'un solide */
export const SOLIDE_MAX_RATIO = 20;

/** Plus grande dimension écrite, et chiffres après la virgule (cotes écrites telles quelles) */
export const SOLIDE_MAX_DIMENSION = 1000;
export const SOLIDE_MAX_DECIMALS = 3;

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
export type EspaceSpec = CubesSpec | SolideSpec;

export interface CubesSpec {
	kind: 'cubes';
	heights: number[][];
	view: CubesView;
	/** Geste de l'élève (lot 2) ; absent : affichage seul */
	task?: CubesTask;
}

/**
 * Un solide en perspective cavalière (```solide, lot 3).
 *
 * Les sommets sont numérotés dans l'ordre documenté de `sommets:` (celui de
 * `solideTopology`) : cube, pavé ABCDEFGH (ABCD en bas, E sur A) ; prisme ABC
 * devant, DEF derrière ; pyramide S puis la base ; cône S, O ; cylindre O, O' ;
 * boule O.
 */
export interface SolideSpec {
	kind: 'solide';
	form: SolideForm;
	/** Dans l'ordre de `forme:` (proportions : le dessin est mis à l'échelle) */
	dims: number[];
	/** Nom de chaque sommet (`null` : sans nom, `-`) ; `null` : aucun nom */
	names: (string | null)[] | null;
	marks: SolideMark[];
	/** Écrire les dimensions sur le dessin ; `unit: ''` : sans unité */
	cotes: { unit: '' | (typeof SOLIDE_UNITS)[number] } | null;
	/** Arêtes cachées en tirets (`cachees: non` : tout en plein) */
	hidden: boolean;
	/** Aucun geste (lot 3) : `spec.task` se lit sans savoir le genre */
	task?: undefined;
}

/** Ce que `marquer:` désigne ; `label` : sa lecture (« face ABCD », « face du dessus ») */
export type SolideMark =
	| { kind: 'face'; vertices: number[]; label: string }
	| { kind: 'arete'; vertices: [number, number]; label: string }
	| { kind: 'sommet'; vertex: number; label: string };

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
