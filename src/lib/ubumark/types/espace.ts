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
 * de la spécification) dit ce qu'on dessine : `cubes` (assemblage), `solide`
 * (cube, pavé, prisme, pyramide, cylindre, cône, boule) et `patron` (patron
 * d'un solide, ou faux patron).
 *
 * Le dessin est calculé par `utils/espace-scene.ts` (cubes),
 * `utils/espace-solides.ts` (solide) et `utils/espace-patrons.ts` (patron),
 * partagés écran / PDF.
 *
 * @module ubumark/types/espace
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Les mots d'ouverture (```mot) des blocs d'espace, un par genre */
export const ESPACE_FENCES = ['cubes', 'solide', 'patron'] as const;

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
 * `case:` posée par le générateur de questions ; `vues:` écrite par le serveur dans
 * l'énoncé masqué d'une évaluation, jamais par un auteur — chantier `fuite-enonce`)
 */
export const CUBES_KEYS = ['hauteurs', 'vue', 'dessiner', 'retrouver', 'case', 'vues'] as const;

/** Les clés du bloc ```solide */
export const SOLIDE_KEYS = ['forme', 'sommets', 'marquer', 'cotes', 'cachees', 'section'] as const;

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
export const SOLIDE_MAX_RATIO = 10;

/** Plus grande dimension écrite, et chiffres après la virgule (cotes écrites telles quelles) */
export const SOLIDE_MAX_DIMENSION = 1000;
export const SOLIDE_MAX_DECIMALS = 3;

/**
 * Les clés du bloc ```patron (`designer:`, `completer:` : gestes de l'élève,
 * lot 5 ; `case:` posée par le générateur de questions)
 */
export const PATRON_KEYS = [
	'solide',
	'forme',
	'faux',
	'tourner',
	'retourner',
	'dessous',
	'sommets',
	'faces',
	'marquer',
	'cotes',
	'designer',
	'completer',
	'case'
] as const;

/** Faces retirées par `completer:` : de 1 à 3 */
export const PATRON_COMPLETE_MAX = 3;

/** Les solides qui ont un patron (```patron, lot 4) : ceux de ```solide sans le cône ni la boule */
export const PATRON_SOLIDS = [
	'cube',
	'pave',
	'prisme-triangle',
	'prisme-triangle-rectangle',
	'pyramide-carree',
	'pyramide-rectangle',
	'pyramide-triangle',
	'cylindre'
] as const satisfies readonly SolideForm[];

export type PatronSolid = (typeof PATRON_SOLIDS)[number];

/** Bornes d'une grille de faces (`forme:` en X et .) */
export const PATRON_GRID_LIMITS = { rows: 6, cols: 6, cells: 10 } as const;

/** Quarts de tour de `tourner:`, dans le sens des aiguilles d'une montre */
export const PATRON_TURNS = [0, 90, 180, 270] as const;

export type PatronTurn = (typeof PATRON_TURNS)[number];

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
export type EspaceSpec = CubesSpec | SolideSpec | PatronSpec;

export interface CubesSpec {
	kind: 'cubes';
	heights: number[][];
	view: CubesView;
	/** Geste de l'élève (lot 2) ; absent : affichage seul */
	task?: CubesTask;
	/**
	 * Énoncé masqué d'une évaluation (`hauteurs: ? 0 ?` + `vues:`, chantier
	 * `fuite-enonce`) : les vues données, une hauteur par colonne de la vue
	 * (`sideColumns`) ; `heights` ne vaut alors que par son empreinte (1 sur un
	 * carreau occupé), jamais montrée comme une réponse avant le verdict
	 */
	givenViews?: Partial<Record<CubesSideView, number[]>>;
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
	/** Plan de coupe (`section:`, lot 6) ; null : aucun */
	section: SolideSection | null;
	/** Aucun geste (lot 3) : `spec.task` se lit sans savoir le genre */
	task?: undefined;
}

/**
 * Un patron (```patron, lot 4) : un solide déplié.
 *
 * Cube, pavé : `cells` = la grille des faces telle qu'écrite (catalogue ou
 * grille du prof), rangée 0 en haut, bords vides retirés. Prisme, pyramide,
 * cylindre : `layout` = la disposition (prisme 1 ou 2, les autres 1).
 * `tourner:` et `retourner:` déplacent le dessin en bloc.
 *
 * Les faces se numérotent dans l'ordre de lecture du patron AVANT `tourner:`
 * (de gauche à droite, de haut en bas ; noms et numéros suivent le dessin
 * tourné), de 0 ici (de 1 pour le prof).
 */
export interface PatronSpec {
	kind: 'patron';
	solid: PatronSolid;
	/** Dimensions du solide (proportions) ; cube sans dimension : [1] */
	dims: number[];
	/** Dimensions écrites par le prof (un cube peut s'en passer, mais pas pour `cotes:`) */
	dimsWritten: boolean;
	/** Cube, pavé : la grille ; null pour les autres solides */
	cells: boolean[][] | null;
	/** Prisme, pyramide, cylindre : la disposition (de 1) */
	layout: number;
	/** `faux: oui` ou `forme: faux N` : la grille ne se plie PAS en cube */
	faux: boolean;
	turn: PatronTurn;
	mirror: boolean;
	/** Cube, pavé : la face (ordre de lecture, de 0) qui devient la face du dessous */
	bottom: number;
	/** Nom de chaque sommet du SOLIDE (`null` : sans nom ; `'?'` : à trouver) ; `null` : aucun nom */
	names: (string | null)[] | null;
	/** `faces: numeros` : chaque face porte son numéro */
	numbers: boolean;
	marks: PatronMark[];
	cotes: { unit: '' | (typeof SOLIDE_UNITS)[number] } | null;
	/** Geste de l'élève (lot 5) ; absent : affichage seul */
	task?: PatronTask;
}

/**
 * Ce que `designer:` fait toucher, calculé par le pliage : la face opposée à la
 * face marquée, ses voisines, les faces qui se touchent en un sommet, la face
 * qui devient une face nommée du solide.
 */
export type PatronTarget =
	| { kind: 'opposee' }
	| { kind: 'voisines' }
	| { kind: 'sommet'; name: string }
	| { kind: 'face'; name: string };

/**
 * Geste de l'élève sur un patron (lot 5, § 10 du journal) :
 * - `designer` : l'élève touche des faces ; `faces` = les faces attendues (ordre
 *   de lecture, de 0), calculées par le pliage ;
 * - `completer` : les cases `removed` (ordre de lecture, de 0) sont retirées du
 *   patron du cube, l'élève pose autant de faces ; juste si tout se plie en cube
 *   (énoncé masqué d'une évaluation : `masked` faces, `removed` vide).
 */
export type PatronTask =
	| { kind: 'designer'; target: PatronTarget; faces: number[] }
	| {
			kind: 'completer';
			removed: number[];
			/**
			 * Énoncé masqué d'une évaluation (`completer: ? ?`, chantier `fuite-enonce`) :
			 * le nombre de faces à poser ; `cells` est alors le patron amputé (déjà
			 * tourné, retourné) et `removed` est vide
			 */
			masked?: number;
	  };

/** Ce que `marquer:` désigne sur un patron : des faces du dessin (de 0), ou un sommet du solide */
export type PatronMark =
	| { kind: 'face'; faces: number[]; label: string }
	| { kind: 'sommet'; vertex: number; label: string };

/**
 * Plan de coupe d'un ```solide (lot 6), distance dans les unités de `forme:` :
 * - `face` (cube, pavé) : parallèle à la face `face` (sommets dans l'ordre écrit),
 *   à `distance` de cette face ; `names` : noms des sommets de la section, le
 *   i-ème sur l'arête qui part de `face[i]` ; `label` : « face ABCD », « face du dessus » ;
 * - `perpendiculaire` (cylindre) : ⊥ à l'axe, à `distance` au-dessus de la base du bas ;
 * - `parallele` (cylindre) : plan de face, à `distance` de l'axe, côté de l'œil ;
 * - `boule` : horizontal, à `distance` au-dessus du centre.
 */
export type SolideSection =
	| { kind: 'face'; face: number[]; distance: number; names: string[] | null; label: string }
	| { kind: 'perpendiculaire' | 'parallele' | 'boule'; distance: number };

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
