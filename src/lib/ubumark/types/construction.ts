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
 * Règle graduée (chantier `regle-graduee`, ADR 0036) : poser son 0 puis sa
 * direction ; le segment s'arrête sur ses graduations du millimètre.
 */
export const CONSTRUCTION_TOOLS = [
	'droite',
	'segment',
	'point',
	'equerre',
	'compas',
	'report',
	'rapporteur',
	'regle'
] as const;
export type ConstructionTool = (typeof CONSTRUCTION_TOOLS)[number];

/** Les instruments du papier uni (une palette qui en contient permet le papier uni) */
export const INSTRUMENT_TOOLS: readonly ConstructionTool[] = [
	'equerre',
	'compas',
	'report',
	'rapporteur',
	'regle'
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
	mesure: ['rapporteur'],
	// Chantier `regle-graduee` (ADR 0036) : segment de longueur donnée, papier uni seulement
	segment: ['regle', 'segment']
};

/** `bissectrice(A, O, B)` : trois points nommés, le sommet au milieu (lot 9, § 25) */
const BISSECTRICE_REGEX =
	/^bissectrice\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*([A-Za-z][A-Za-z0-9_]*)\s*\)$/;

/** Les trois points d'une bissectrice (A, sommet, B) ; null pour une autre expression */
export function bissectriceOf(expression: string): [string, string, string] | null {
	const match = BISSECTRICE_REGEX.exec(expression.trim());
	return match ? [match[1], match[2], match[3]] : null;
}

/**
 * Cercle de centre donné (chantier `cercle-triangle-rectangle`, n° 19, 2026-11-08) :
 * `cercle(O, passant=A)` (centre O passant par A) ou `cercle(O, rayon=distance(D, E))`
 * (rayon pris sur [DE], au Report) ; `cercle(O, rayon=4 cm)` (chantier
 * `regle-graduee`, PR 3 : compas ouvert sur la règle graduée ; `length` en mm,
 * NaN si pas au mm près — le parseur refuse NaN et 0)
 */
export type CenteredCircle =
	| { center: string; kind: 'passant'; through: string }
	| { center: string; kind: 'rayon'; from: string; to: string }
	| { center: string; kind: 'longueur'; length: number; unit: LengthUnit };

const CIRCLE_NAME = '([A-Za-z][A-Za-z0-9_]*)';
const CENTERED_THROUGH_REGEX = new RegExp(
	`^cercle\\(\\s*${CIRCLE_NAME}\\s*,\\s*passant\\s*=\\s*${CIRCLE_NAME}\\s*\\)$`
);
/** `cercle(O, rayon=4 cm)` : le texte de la longueur, lu par `readLengthText` */
const CENTERED_LENGTH_REGEX = new RegExp(
	`^cercle\\(\\s*${CIRCLE_NAME}\\s*,\\s*rayon\\s*=\\s*(\\d[^)]*?)\\s*\\)$`
);
const CENTERED_RADIUS_REGEX = new RegExp(
	`^cercle\\(\\s*${CIRCLE_NAME}\\s*,\\s*rayon\\s*=\\s*distance\\(\\s*${CIRCLE_NAME}\\s*,\\s*${CIRCLE_NAME}\\s*\\)\\s*\\)$`
);

/** Le centre et le point de passage (ou les bouts du rayon) ; null pour une autre expression */
export function centeredCircleOf(expression: string): CenteredCircle | null {
	const text = expression.trim();
	const through = CENTERED_THROUGH_REGEX.exec(text);
	if (through) return { center: through[1], kind: 'passant', through: through[2] };
	const radius = CENTERED_RADIUS_REGEX.exec(text);
	if (radius) return { center: radius[1], kind: 'rayon', from: radius[2], to: radius[3] };
	const length = CENTERED_LENGTH_REGEX.exec(text);
	const read = length ? readLengthText(length[2]) : null;
	if (length && read) return { center: length[1], kind: 'longueur', ...read };
	return null;
}

/**
 * Palette d'un cercle de centre donné : le compas, et le Report si le rayon est
 * pris sur un segment, la règle graduée s'il est donné en cm
 */
export function centeredCircleTools(circle: CenteredCircle): ConstructionTool[] {
	if (circle.kind === 'longueur') return ['regle', 'compas'];
	return circle.kind === 'passant' ? ['compas'] : ['compas', 'report'];
}

/** Palette déduite d'une droite sur quadrillage (lot 3) : les nœuds suffisent, sans Report */
export const LINE_GRID_TOOLS: ConstructionTool[] = ['droite', 'equerre', 'compas'];

/**
 * Palette d'un triangle à construire : celle du lot 4 (trois longueurs), ou,
 * avec un angle (lot 7, § 21), Rapporteur · Règle · Segment, plus le Report et
 * le Compas s'il reste une longueur à reporter ; triangle rectangle (n° 20) :
 * Segment · Équerre (· Report, ou · Règle graduée pour un côté en cm) sur papier
 * uni, Segment seul sur quadrillage
 */
export function triangleTools(
	check: Pick<TriangleCheck, 'angles' | 'lengths'>,
	grid = false
): ConstructionTool[] {
	// Triangle rectangle (n° 20) : l'équerre et le Report sur papier uni, le segment seul sur quadrillage
	if (rightAngleOf(check)) {
		if (grid) return ['segment'];
		// Côté coté en cm (PR 4 de `regle-graduee`) : la règle graduée à la place du Report
		if (check.lengths.some(isRuledLength)) return ['segment', 'equerre', 'regle'];
		return check.lengths.length > 0 ? ['segment', 'equerre', 'report'] : ['segment', 'equerre'];
	}
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
	'mesure',
	'segment'
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
 * Carré ou rectangle coté sur papier uni (chantier `regle-graduee`, PR 6, Q19) :
 * `carre A ; B ; C ; D` ou `rectangle A ; B ; C ; D : BC = 3 cm`. [AB] est tracé
 * dans la figure, C et D n'y sont pas (leurs noms servent aux messages). L'élève
 * construit les angles droits à l'équerre et prend les longueurs à la règle
 * graduée. Carré : le côté est [AB] ; rectangle : `height`, la longueur de [BC]
 * en millimètres entiers. Seul dans la figure.
 */
export interface RuledPolygonCheck {
	kind: 'carre' | 'rectangle';
	points: [string, string, string, string];
	ruled: true;
	/** Rectangle seulement : la longueur de [BC] (= [AD]) */
	height?: { length: number; unit: LengthUnit };
	line: number;
}

/** Palette d'un carré ou d'un rectangle coté (PR 6 de `regle-graduee`) */
export const RULED_POLYGON_TOOLS: ConstructionTool[] = ['segment', 'equerre', 'regle'];

/** Carré ou rectangle coté sur papier uni (PR 6), pas la forme du quadrillage */
export function isRuledPolygonCheck(check: ConstructionCheck): check is RuledPolygonCheck {
	return 'ruled' in check;
}

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
export type TriangleLength =
	| { side: [string, string]; source: [string] | [string, string] }
	/** Sur quadrillage (n° 20) : `AC = 3 carreaux`, le long d'une ligne du quadrillage */
	| { side: [string, string]; squares: number }
	/**
	 * À la règle graduée (chantier `regle-graduee`, PR 4) : `AC = 4 cm`, en
	 * millimètres entiers ; triangle rectangle sur papier uni seulement
	 */
	| { side: [string, string]; length: number; unit: LengthUnit };

/** Une longueur donnée en carreaux (n° 20) */
export function isSquaresLength(
	length: TriangleLength
): length is Extract<TriangleLength, { squares: number }> {
	return 'squares' in length;
}

/** Une longueur donnée en cm ou mm, à la règle graduée (PR 4 de `regle-graduee`) */
export function isRuledLength(
	length: TriangleLength
): length is Extract<TriangleLength, { length: number }> {
	return 'length' in length;
}

/** Le triangle rectangle (n° 20) : son angle droit, construit à l'équerre ; null sinon */
export function rightAngleOf(check: Pick<TriangleCheck, 'angles'>): TriangleAngle | null {
	return check.angles.find((g) => g.measure === 90) ?? null;
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
 * Triangle rectangle (n° 20) : un angle de 90° (construit à l'équerre), seul ou
 * avec la longueur du côté qui le porte (`CAB = 90 ; AC = u`, `AC = 3 carreaux`,
 * ou `AC = 4 cm` à la règle graduée, PR 4 de `regle-graduee`).
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

/**
 * Unité dans laquelle l'auteur a écrit la longueur (messages à l'élève dans la
 * même) : `6 cm` ou `5,3 cm` → cm décimaux ; `5 cm 3 mm` → cm et mm ; `72 mm` → mm
 */
export type LengthUnit = 'cm' | 'cm-mm' | 'mm';

/** `6 cm`, `5,3 cm` (virgule ou point) */
const CM_REGEX = /^(\d{1,3})(?:[,.](\d{1,3}))?\s*cm$/;
/** `5 cm 3 mm` : des centimètres et un chiffre de millimètres */
const CM_MM_REGEX = /^(\d{1,3})\s*cm\s*(\d)\s*mm$/;
/** `72 mm` */
const MM_REGEX = /^(\d{1,4})\s*mm$/;

/**
 * Longueur écrite par l'auteur → millimètres (null : illisible ; NaN : pas au mm
 * près) ; segment de longueur donnée et cercle de rayon donné en cm
 */
export function readLengthText(text: string): { length: number; unit: LengthUnit } | null {
	const cmMm = CM_MM_REGEX.exec(text);
	if (cmMm) return { length: Number(cmMm[1]) * 10 + Number(cmMm[2]), unit: 'cm-mm' };
	const mm = MM_REGEX.exec(text);
	if (mm) return { length: Number(mm[1]), unit: 'mm' };
	const cm = CM_REGEX.exec(text);
	if (!cm) return null;
	const decimals = cm[2] ?? '';
	// Plus d'un chiffre après la virgule (non nul) : pas au millimètre près
	if (decimals.replace(/0+$/, '').length > 1) return { length: NaN, unit: 'cm' };
	return { length: Number(cm[1]) * 10 + Number(decimals.charAt(0) || '0'), unit: 'cm' };
}

/**
 * `segment AB = 6 cm` (chantier `regle-graduee`, CE2-039, ADR 0036) : A est un
 * point de la figure ; l'élève trace à la règle graduée un segment d'un bout en
 * A, de la longueur donnée (B : le nom de l'autre bout, pour les messages).
 * 1 unité de la figure = 1 cm. `length` : en millimètres entiers, plus de 0.
 * `segment AB = 6 cm sur [Ax)` (PR 2, § 4 du journal) : le segment se trace le
 * long de la demi-droite x de la figure, d'origine A (`x = demidroite(A, X)`).
 */
export interface SegmentLengthCheck {
	kind: 'segment';
	point: string;
	end: string;
	length: number;
	unit: LengthUnit;
	/** Nom de la demi-droite d'origine A le long de laquelle tracer ; absent : direction libre */
	ray?: string;
	line: number;
}

export type ConstructionCheck =
	| DroiteParCheck
	| SegmentFigureCheck
	| RuledPolygonCheck
	| PointCheck
	| LineCheck
	| CircleCheck
	| TriangleCheck
	| AngleCheck
	| MeasureCheck
	| SegmentLengthCheck;

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
	mesure: 'rapporteur',
	// Le segment est exigé aussi (cohérence du parseur) ; la règle graduée est l'outil de départ
	segment: 'regle'
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
