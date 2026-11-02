/**
 * Blocs ```figure-a-completer et ```figure-de-travail — types
 * ========================================================
 *
 * Figure de départ (même en-tête, même langage que ```figure) que l'élève
 * complète avec des outils ; la case de la question est le bloc lui-même.
 * Figure de travail : l'élève y trace pour vérifier, rien n'est noté (aucune
 * vérification, `work`).
 * Le parseur rend un nœud `figure` qui porte `construction` (spécification :
 * `docs/wip/geometrie-validation-progress.md` § 3 et § 4).
 *
 * @module ubumark/types/construction
 */

/**
 * Outils proposés à l'élève (un seul par figure) : droite (CP-059), segment
 * (CP-060), point (un toucher, chantier `controles-figure` lot 2a)
 */
export const CONSTRUCTION_TOOLS = ['droite', 'segment', 'point'] as const;
export type ConstructionTool = (typeof CONSTRUCTION_TOOLS)[number];

/** Vérifications que l'auteur peut nommer dans `verifier:` */
export const CONSTRUCTION_CHECK_KINDS = [
	'droite_par',
	'carre',
	'rectangle',
	'symetrique',
	'point'
] as const;
export type ConstructionCheckKind = (typeof CONSTRUCTION_CHECK_KINDS)[number];

/** `droite_par A ; B` : une droite tracée passe par les points A et B */
export interface DroiteParCheck {
	kind: 'droite_par';
	points: [string, string];
	/** Ligne de la vérification dans le bloc (1 = première ligne après la clôture) */
	line: number;
}

/**
 * `carre A ; B` : le côté [AB] (déjà tracé) et les segments de l'élève forment
 * un carré, d'un côté ou de l'autre de [AB]
 */
export interface CarreCheck {
	kind: 'carre';
	points: [string, string];
	line: number;
}

/**
 * `rectangle A ; B ; C` : les côtés [AB] et [BC] (déjà tracés) et les segments
 * de l'élève forment le rectangle ABCD
 */
export interface RectangleCheck {
	kind: 'rectangle';
	points: [string, string, string];
	line: number;
}

/** Carré ou rectangle à compléter : une seule vérification de ce genre par figure */
export type PolygonCheck = CarreCheck | RectangleCheck;

/**
 * `symetrique par d` : l'élève trace l'image de tout ce qui est tracé dans la
 * figure sauf l'axe ; `par O` (un point) : symétrie centrale.
 * `symetrique A ; B ; C par d` : seulement les traits dont les deux bouts sont
 * parmi ces points (chantier `controles-figure`, lot 1, 2026-11-02)
 */
export interface SymetriqueCheck {
	kind: 'symetrique';
	/** Nom de l'axe (droite, segment) ou du centre (point) */
	by: string;
	/** Points listés (forme facultative) ; absent : tout le tracé */
	points?: string[];
	line: number;
}

/** Vérifications qui jugent l'ensemble des segments : une seule par figure */
export type SegmentFigureCheck = PolygonCheck | SymetriqueCheck;

/**
 * `point A' = symetrie(A, axe=d)` : l'élève place un point là où l'expression
 * du langage des figures le met (chantier `controles-figure`, lot 2a,
 * 2026-11-02). Plusieurs par figure : points jugés comme un ensemble. Le nom
 * n'est pas un objet de la figure (le langage n'a pas de prime) : il sert à
 * l'étiquette de la correction et aux messages.
 */
export interface PointCheck {
	kind: 'point';
	name: string;
	expression: string;
	line: number;
}

export type ConstructionCheck = DroiteParCheck | SegmentFigureCheck | PointCheck;

/** L'outil avec lequel se trace chaque vérification */
export const CHECK_TOOL: Record<ConstructionCheckKind, ConstructionTool> = {
	droite_par: 'droite',
	carre: 'segment',
	rectangle: 'segment',
	symetrique: 'segment',
	point: 'point'
};

export interface ConstructionSpec {
	tools: ConstructionTool[];
	checks: ConstructionCheck[];
	/**
	 * Numéro de la case de la question (`case: N`), posé par le générateur
	 * (`assign-blank-indices.ts`) ; absent hors d'une question à remplir.
	 */
	caseIndex?: number;
	/** Bloc ```figure-de-travail : tracés possibles, jamais notés (`checks` vide) */
	work?: true;
	/**
	 * `verifier: ?` : énoncé masqué d'une évaluation (chantier `fuite-enonce`),
	 * `checks` vide ; refusé dans un modèle
	 */
	masked?: true;
}
