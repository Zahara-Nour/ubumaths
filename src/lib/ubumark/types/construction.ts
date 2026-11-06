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
 * Outils proposés à l'élève : droite (la règle, CP-059), segment (CP-060), point
 * (un toucher, chantier `controles-figure` lot 2a), équerre (perpendiculaire à
 * une droite par un point) et compas (cercle par son centre et un point),
 * lot 2b. Plusieurs outils : une palette (papier uni, instruments). Report :
 * prendre un écartement entre deux points, puis piquer le compas ailleurs
 * (lot 4, `docs/archive/wip/controles-figure-progress.md` § 13). Rapporteur : poser
 * son centre et sa base, puis placer des repères aux graduations (lot 5, § 16).
 */
export const CONSTRUCTION_TOOLS = [
	'droite',
	'segment',
	'point',
	'equerre',
	'compas',
	'report',
	'rapporteur'
] as const;
export type ConstructionTool = (typeof CONSTRUCTION_TOOLS)[number];

/** Les instruments du papier uni (une palette qui en contient permet le papier uni) */
export const INSTRUMENT_TOOLS: readonly ConstructionTool[] = [
	'equerre',
	'compas',
	'report',
	'rapporteur'
];

/**
 * Palette déduite sans `grille:` (décision de David, 2026-11-02,
 * `docs/archive/wip/controles-figure-progress.md` § 7) : placer un point ou tracer un
 * symétrique sur papier uni demande les instruments.
 */
export const PLAIN_PAPER_TOOLS: Partial<Record<ConstructionCheckKind, ConstructionTool[]>> = {
	// Lot 4 (§ 13) : le Report, pour le 4e sommet d'un parallélogramme
	point: ['point', 'droite', 'equerre', 'compas', 'report'],
	symetrique: ['segment', 'droite', 'equerre', 'compas'],
	// Lot 3 (§ 9) : la même palette sur quadrillage (équerre gardée, décision de David) ;
	// lot 9 (§ 25) : le Report garde l'écartement des deux cercles égaux (papier uni
	// seulement, `LINE_GRID_TOOLS` sur quadrillage)
	droite: ['droite', 'equerre', 'compas', 'report'],
	// Lot 3b (§ 11) : cercle circonscrit, papier uni seulement ; Report : lot 9 (§ 25)
	cercle: ['droite', 'equerre', 'compas', 'report'],
	// Lot 4 (§ 13) : triangle de trois longueurs, papier uni seulement ; lot 7 (§ 21) : le
	// rapporteur s'y ajoute quand un angle est donné (`triangleTools`)
	triangle: ['segment', 'compas', 'report', 'droite'],
	// Lot 5 (§ 16) : angle de mesure donnée, papier uni seulement
	angle: ['rapporteur', 'segment'],
	// Lot 6 (§ 19) : mesurer un angle, le rapporteur seul
	mesure: ['rapporteur']
};

/** `bissectrice(A, O, B)` : trois points nommés, le sommet au milieu (lot 9, § 25) */
const BISSECTRICE_REGEX =
	/^bissectrice\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*([A-Za-z][A-Za-z0-9_]*)\s*\)$/;

/** Les trois points d'une bissectrice (A, sommet, B) ; null pour une autre expression */
export function bissectriceOf(expression: string): [string, string, string] | null {
	const match = BISSECTRICE_REGEX.exec(expression.trim());
	return match ? [match[1], match[2], match[3]] : null;
}

/** Palette déduite d'une droite sur quadrillage (lot 3) : les nœuds suffisent, sans Report */
export const LINE_GRID_TOOLS: ConstructionTool[] = ['droite', 'equerre', 'compas'];

/**
 * Palette d'un triangle à construire : celle du lot 4 (trois longueurs), ou,
 * avec un angle (lot 7, § 21), Rapporteur · Règle · Segment, plus le Report et
 * le Compas s'il reste une longueur à reporter
 */
export function triangleTools(
	check: Pick<TriangleCheck, 'angles' | 'lengths'>
): ConstructionTool[] {
	if (check.angles.length === 0) return [...(PLAIN_PAPER_TOOLS.triangle ?? [])];
	const tools: ConstructionTool[] = ['rapporteur', 'droite', 'segment'];
	return check.lengths.length > 0 ? [...tools, 'report', 'compas'] : tools;
}

/** Vérifications que l'auteur peut nommer dans `verifier:` */
export const CONSTRUCTION_CHECK_KINDS = [
	'droite_par',
	'carre',
	'rectangle',
	'symetrique',
	'point',
	'droite',
	'cercle',
	'triangle',
	'angle',
	'mesure'
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

/**
 * `droite m = mediatrice(A, B)` : une des droites tracées par l'élève (règle,
 * équerre) est celle que l'expression du langage des figures donne ; les autres
 * traits sont de construction (chantier `controles-figure`, lot 3, 2026-11-02).
 * Le nom sert aux messages et à la correction.
 */
export interface LineCheck {
	kind: 'droite';
	name: string;
	expression: string;
	line: number;
}

/**
 * `cercle c = cercle_circonscrit(A, B, C)` : un des cercles tracés par l'élève
 * (compas) est celui que l'expression du langage des figures donne, construit
 * (centre et point de passage construits) ; les autres traits sont de
 * construction (chantier `controles-figure`, lot 3b, 2026-11-02).
 */
export interface CircleCheck {
	kind: 'cercle';
	name: string;
	expression: string;
	line: number;
}

/**
 * Une longueur donnée d'un triangle : le côté (ses deux sommets) et ce qui la
 * donne, un segment nommé de la figure (`['u']`) ou deux points visibles
 * (`['A', 'B']`)
 */
export interface TriangleLength {
	side: [string, string];
	source: [string] | [string, string];
}

/**
 * Un angle donné d'un triangle (lot 7) : `CAB = 40` — `vertex` (A ou B) est
 * son sommet, `base` l'autre bout de [AB] ; mesure entière en degrés, 1..179
 */
export interface TriangleAngle {
	vertex: string;
	base: string;
	measure: number;
}

/**
 * `triangle ABC : AC = u ; BC = v` : [AB] est tracé ; l'élève trace [AC] et
 * [BC] (outil segment), C = leur extrémité commune, construite au compas, aux
 * longueurs données (chantier `controles-figure`, lot 4, 2026-11-03).
 * Lot 7 (§ 21) : un côté et deux angles (`CAB = 40 ; ABC = 65`, au rapporteur)
 * ou deux côtés et l'angle compris (`AC = u ; CAB = 40`).
 * Deux données en tout : `lengths` ([AC] puis [BC]) et `angles` (en A puis en B).
 */
export interface TriangleCheck {
	kind: 'triangle';
	points: [string, string, string];
	lengths: TriangleLength[];
	angles: TriangleAngle[];
	line: number;
}

/**
 * `angle AOy = 50` : le côté [OA) est donné ; l'élève trace au segment le côté
 * [Oy) (y : son nom, pour les messages) tel que l'angle AOy mesure 50°, d'un
 * côté ou de l'autre de (OA), depuis un repère du rapporteur (chantier
 * `controles-figure`, lot 5, 2026-11-03). `points` : A puis O ; `measure` :
 * degrés entiers, de 1 à 179.
 */
export interface AngleCheck {
	kind: 'angle';
	points: [string, string];
	side: string;
	measure: number;
	line: number;
}

/**
 * `mesure AOB` : l'angle AOB est tracé (ses deux côtés) ; l'élève le mesure au
 * rapporteur et tape sa mesure en degrés, sous la figure. La mesure attendue est
 * calculée sur la figure (chantier `controles-figure`, lot 6, 2026-11-03).
 * `points` : A, O (le sommet), B.
 */
export interface MeasureCheck {
	kind: 'mesure';
	points: [string, string, string];
	/**
	 * `mesure AOB, rapporteur posé` (lot 8, § 23) : le rapporteur apparaît posé en O,
	 * base sur le premier côté nommé, figé ; l'élève tape seulement la mesure
	 */
	posed?: true;
	line: number;
}

export type ConstructionCheck =
	| DroiteParCheck
	| SegmentFigureCheck
	| PointCheck
	| LineCheck
	| CircleCheck
	| TriangleCheck
	| AngleCheck
	| MeasureCheck;

/** L'outil avec lequel se trace chaque vérification */
export const CHECK_TOOL: Record<ConstructionCheckKind, ConstructionTool> = {
	droite_par: 'droite',
	carre: 'segment',
	rectangle: 'segment',
	symetrique: 'segment',
	point: 'point',
	droite: 'droite',
	cercle: 'compas',
	triangle: 'segment',
	// Le segment est exigé aussi (coherence du parseur) ; le rapporteur est l'outil de départ
	angle: 'rapporteur',
	mesure: 'rapporteur'
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
