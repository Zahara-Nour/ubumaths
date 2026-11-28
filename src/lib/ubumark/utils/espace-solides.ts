/**
 * Bloc ```solide — la scène
 * =========================
 *
 * Calcul pur du dessin d'un solide en perspective cavalière (traits pleins ou
 * en tirets, face marquée, points, étiquettes), partagé par l'écran
 * (`Solide.svelte`) et le PDF (`espace-typst.ts`) : les deux ne peuvent pas
 * diverger. Chantier `solides`, lot 3 (§ 8 du journal), ADR 0034.
 *
 * Perspective : celle de ```cubes — face avant en vraie grandeur, fuyantes à
 * 45° vers le haut à droite, réduites de moitié. Polyèdres : projection et
 * arêtes cachées par le moteur de vue (`espace-vue.ts`), à la vue de départ ;
 * une arête est cachée (tirets) quand toutes ses faces tournent le dos à
 * l'œil. Cylindre, cône, boule : ellipses « à plat » (horizontales, comme le
 * CP et les manuels), moitié arrière en tirets ; les génératrices du cône
 * sont tangentes à l'ellipse.
 *
 * Section (`section:`, lot 6) : le polygone de coupe, teinté, contour en
 * trait plein épais ; le plan n'est pas dessiné ; boule coupée : sans équateur.
 *
 * Points déclarés (`points:`) : un disque et un nom ; vecteurs donnés
 * (`vecteurs:`) : une flèche, et pour `u = AB` la lettre près du milieu sous
 * une petite flèche (chantier `solide-vecteur`, lot 1).
 *
 * Échelle : les dimensions sont des proportions ; le dessin est ramené à
 * `SOLIDE_SIZE` cm sur son plus grand côté. Repère : y vers le BAS (SVG), une
 * unité = 1 cm, étiquettes comprises dans la boîte.
 *
 * Figure que l'on peut tourner (`tourner: oui`, chantier `solides-3d`, lot 2,
 * ADR 0045) : `buildSolideScene(spec, vue)` dessine le solide vu de `vue`,
 * dans un cadre FIXE — même échelle que le dessin fixe, centre du solide au
 * milieu d'un carré qui contient la figure sous tous les angles (la page ne
 * bouge pas quand la figure tourne). À la vue de départ, c'est le dessin fixe,
 * déplacé en bloc. Sans `vue` : le dessin fixe, celui du PDF. Cylindre, cône,
 * boule (lot 3) : `turnedRoundDraft`, de vrais ovales qui s'ouvrent avec la
 * bascule ; leur bascule de départ est celle de l'ovale à plat (`solideTilt`).
 *
 * @module ubumark/utils/espace-solides
 */

import type { SolideForm, SolidePoint, SolideSpec } from '../types/espace';
import { ESPACE_STROKE, type EspacePoint } from './espace-scene';
import {
	VUE_DE_DEPART,
	VUE_TILT,
	chordInSolid,
	hiddenEdges,
	hiddenStretches,
	planeInSolid,
	vueProjection,
	type EspaceVue,
	type Point3,
	type VueTilt
} from './espace-vue';

export type { Point3 } from './espace-vue';

// ============================================================================
// TYPES
// ============================================================================

/** Un trait : une arête (2 points) ou un arc (ligne brisée) */
export interface SolideLine {
	points: EspacePoint[];
	dashed: boolean;
	/** Arête marquée (`marquer: arete AE`) */
	thick: boolean;
	/** Ligne de renvoi d'une cote : trait fin, qu'on ne prend pas pour une arête */
	thin?: boolean;
}

/**
 * Une étiquette, centrée sur `at` ; `sub` : indice d'un nom de vecteur (`w1` →
 * w, indice 1), comme `\vec{w_{1}}` de la phrase de correction
 */
export interface SolideLabel {
	at: EspacePoint;
	text: string;
	sub?: string;
}

/** Taille d'un indice, relative à celle de l'étiquette */
export const SOLIDE_SUB_SCALE = 0.7;

/** Largeur d'une étiquette, en caractères (un indice compte pour sa taille) */
const labelChars = (label: SolideLabel) =>
	label.text.length + (label.sub?.length ?? 0) * SOLIDE_SUB_SCALE;

/**
 * Une flèche : le trait s'arrête au pied de la pointe (le bout arrondi ne la
 * dépasse pas) ; `head[0]` = l'extrémité ; `small` : flèche posée sur le nom
 * d'un vecteur
 */
export interface SolideArrow {
	shaft: [EspacePoint, EspacePoint];
	head: EspacePoint[];
	small: boolean;
}

export interface SolideScene {
	/** Boîte du dessin, étiquettes comprises (cm) */
	width: number;
	height: number;
	/** Plus grand côté du solide seul : `SOLIDE_SIZE` */
	drawingWidth: number;
	drawingHeight: number;
	/** Faces marquées (teintées), dessinées d'abord */
	fills: EspacePoint[][];
	/** Section (`section:`), teintée d'accent après les faces marquées ; null : aucune */
	section: EspacePoint[] | null;
	/** Tirets d'abord, puis traits pleins, puis arêtes marquées */
	lines: SolideLine[];
	dots: EspacePoint[];
	labels: SolideLabel[];
	/** Position de chaque sommet, dans l'ordre de `sommets:` */
	vertices: EspacePoint[];
	/** Position de chaque point déclaré (`points:`), dans l'ordre écrit */
	points: EspacePoint[];
	/** Vecteurs donnés, puis petites flèches de leurs noms ; dessinées après les traits */
	arrows: SolideArrow[];
	/**
	 * Droites données (`droites:`), dans l'ordre écrit : chacune en morceaux qui se
	 * suivent, en tirets là où une face du solide passe devant ; dessinées en
	 * couleur après les arêtes. Absent : le bloc n'a pas de droites.
	 */
	droites?: SolideLine[][];
	/**
	 * Segments donnés (`segments:`), puis les deux côtés du petit carré de chaque
	 * angle droit codé (`angles-droits:`), en morceaux : en tirets là où une face
	 * du solide passe devant ; dessinés en couleur, comme les droites. Absent : ni
	 * segment ni angle droit.
	 */
	segments?: SolideLine[];
	/**
	 * Plans donnés (`plans:`), dans l'ordre écrit : la partie du plan dans le
	 * solide, teintée après les faces marquées, et son bord en couleur, en tirets
	 * là où une face du solide passe devant. Absent : le bloc n'a pas de plans.
	 */
	plans?: SolidePlanShape[];
	/**
	 * Figure que l'on peut tourner seulement : la place de chaque nom de `labels`
	 * par rapport à son point (sommet, point déclaré, milieu du vecteur), à
	 * redonner à `buildSolideScene` pour tenir les noms pendant la rotation
	 */
	labelOffsets?: EspacePoint[];
}

/** Un plan donné, dessiné : son polygone dans le solide et les morceaux de son bord */
export interface SolidePlanShape {
	fill: EspacePoint[];
	border: SolideLine[];
}

/** Ce qu'il faut savoir d'une forme pour lire `sommets:` et `marquer:` */
export interface SolideTopology {
	vertexCount: number;
	/** Faces planes (indices des sommets, dans l'ordre du tour) ; aucune pour un solide rond */
	faces: number[][];
	edges: [number, number][];
	/** Faces désignées par leur place (`marquer: face dessus`) */
	places: Partial<Record<SolidePlace, number[]>>;
	/** Cylindre, cône, boule : seuls les sommets (centres) se marquent */
	curved: boolean;
	/** « un pavé », « une pyramide » */
	indefinite: string;
	/** « du pavé », « de la pyramide » */
	ofThe: string;
}

export const SOLIDE_PLACES = [
	'devant',
	'derriere',
	'dessus',
	'dessous',
	'gauche',
	'droite'
] as const;

export type SolidePlace = (typeof SOLIDE_PLACES)[number];

// ============================================================================
// CONSTANTES
// ============================================================================

/** Plus grand côté du dessin, en cm */
export const SOLIDE_SIZE = 4;

/** Épaisseur d'une arête marquée, en cm (trait courant : `ESPACE_STROKE`) */
export const SOLIDE_THICK_STROKE = 0.07;

/** Épaisseur d'une ligne de renvoi (cote de la hauteur d'une pyramide), en cm */
export const SOLIDE_LEADER_STROKE = 0.018;

/** Épaisseur d'un trait, la même à l'écran et au PDF */
export const solideLineStroke = (line: SolideLine) =>
	line.thick ? SOLIDE_THICK_STROKE : line.thin ? SOLIDE_LEADER_STROKE : ESPACE_STROKE;

/** Tirets d'une arête cachée, en cm (trait, blanc) */
export const SOLIDE_DASH = [0.12, 0.08] as const;

/** Rayon du point d'un sommet marqué ou d'un centre nommé, en cm */
export const SOLIDE_DOT_RADIUS = 0.06;

/** Taille du texte des étiquettes, en cm */
export const SOLIDE_LABEL_SIZE = 0.36;

/** Aplatissement des ellipses « à plat » (petit axe / grand axe), celui du CP */
const ELLIPSE_RATIO = 0.3;

/**
 * Cône le plus plat permis (hauteur / rayon) : en dessous de ELLIPSE_RATIO, le
 * sommet tombe dans l'ellipse et le cône ne se reconnaît plus ; marge jusqu'à 0,5
 */
export const SOLIDE_FLAT_CONE = 0.5;

/**
 * Solide rond que l'on peut tourner : son dessin « à plat » est la vraie vue
 * d'un œil placé à cette inclinaison au-dessus de l'horizontale (hauteurs non
 * raccourcies). La figure tournée en part et la garde dans la vue droite : seule
 * la hauteur raccourcit pendant le passage (chantier `solides-3d`, lot 3).
 */
const ROUND_ELEVATION = Math.asin(ELLIPSE_RATIO);
export const SOLIDE_ROUND_TILT: VueTilt = { atRest: ROUND_ELEVATION, straight: ROUND_ELEVATION };

/** Segments d'une ellipse ou d'un cercle complet */
const ARC_STEPS = 72;

/** Pointe d'une flèche : longueur et demi-largeur, en cm (petite flèche d'un nom : `SMALL_ARROW`) */
export const SOLIDE_ARROW = { length: 0.26, halfWidth: 0.09 } as const;
const SMALL_ARROW = { length: 0.09, halfWidth: 0.045 } as const;

/** Hauteur de la petite flèche d'un nom de vecteur au-dessus du centre de la lettre, en cm */
const NAME_ARROW_RISE = 0.24;

/** Ce que la petite flèche dépasse au-dessus de la boîte de la lettre (`labelBox`), en cm */
const NAME_ARROW_TOP = NAME_ARROW_RISE + SMALL_ARROW.halfWidth - SOLIDE_LABEL_SIZE / 2 - 0.03;

/** Écart d'un nom de point ou de vecteur aux points dessinés (sommets, points déclarés), en cm */
const DOT_CLEARANCE = 0.06;

/** Distance d'une étiquette de sommet à son point, en cm */
const LABEL_GAP = 0.28;
/**
 * Places essayées pour le nom d'un sommet, dans l'ordre : distance (× LABEL_GAP)
 * et écart d'angle (huitièmes de demi-tour) à la direction libre ; la première
 * qui ne touche aucun trait. Près de la direction libre d'abord, puis tout le
 * tour du sommet (E49 : un trait de section passe près du sommet)
 */
const NAME_PLACES: { gap: number; turn: number }[] = [
	[0, 1, -1],
	[2, -2],
	[3, -3],
	[4, -4],
	[5, -5],
	[6, -6],
	[7, -7],
	[8]
].flatMap((turns) =>
	[1, 1.35].flatMap((gap) => turns.map((k) => ({ gap, turn: (k * Math.PI) / 8 })))
);

/**
 * Marge du cadre d'une figure que l'on peut tourner, autour du plus grand
 * cercle que parcourt un point du solide, en cm : la place du nom d'un sommet
 * (au plus loin `LABEL_GAP` × 1,35, plus sa demi-boîte)
 */
const TURN_PAD = 0.75;

/**
 * Ce qu'une droite dépasse du solide, de chaque côté, en part de sa plus grande
 * dimension ; un point donné par ses coordonnées ne sort pas du solide de plus
 * que cela (`solide-parser.ts`)
 */
export const DROITE_OVERHANG = 0.18;

/** Le côté du carré d'un angle droit codé, en part de la plus grande dimension du solide */
const RIGHT_ANGLE_SIZE = 0.1;

/** Nom d'un point déclaré sur une figure à droites : second tour de places, à cette part de l'écart habituel */
const POINT_NAME_FAR = 1.7;

/** Le nom d'une droite : vide laissé entre sa boîte et le trait, en cm */
const DROITE_NAME_CLEAR = 0.08;

/** Le nom d'une droite : à cette distance de son bout, le long du trait, en cm */
const DROITE_NAME_BACK = [0.35, 0.8, 1.25];

/**
 * Le nom d'un plan : écrit en un point du plan, pris parmi son milieu et les
 * points à ces parts du chemin du milieu vers chaque coin et chaque milieu de côté
 */
const PLAN_NAME_TOWARD = [0.3, 0.55];

/** Le nom d'un plan écrit à côté de son bord : à ces parts du côté, à ces écarts en plus (cm) */
const PLAN_NAME_AWAY = [0, 0.3, 0.6];
const PLAN_NAME_ALONG = [0.5, 0.3, 0.7];

/** Distance d'une cote à son trait, en cm */
const COTE_GAP = 0.14;

/** Ligne de renvoi : ce qu'elle dépasse à droite du solide, en cm */
const LEADER_RUN = 0.3;

/**
 * Hauteurs essayées pour le bout du renvoi, par rapport au milieu de la hauteur
 * (cm, vers le bas) : un peu au-dessus d'abord, puis en s'éloignant
 */
const LEADER_RISES = [-0.5, -0.3, -0.7, -0.1, -0.9, 0.1, -1.1, 0.3, -1.3, 0.5];

/** Largeur estimée d'un caractère d'étiquette, en cm (boîte du dessin) */
const CHAR_WIDTH = 0.21;

const BOX_TOPOLOGY = {
	vertexCount: 8,
	faces: [
		[0, 1, 2, 3],
		[4, 5, 6, 7],
		[0, 1, 5, 4],
		[3, 2, 6, 7],
		[0, 3, 7, 4],
		[1, 2, 6, 5]
	],
	places: {
		dessous: [0, 1, 2, 3],
		dessus: [4, 5, 6, 7],
		devant: [0, 1, 5, 4],
		derriere: [3, 2, 6, 7],
		gauche: [0, 3, 7, 4],
		droite: [1, 2, 6, 5]
	}
};

const PRISM_TOPOLOGY = {
	vertexCount: 6,
	faces: [
		[0, 1, 2],
		[3, 4, 5],
		[0, 1, 4, 3],
		[1, 2, 5, 4],
		[2, 0, 3, 5]
	],
	places: {
		devant: [0, 1, 2],
		derriere: [3, 4, 5],
		dessous: [0, 1, 4, 3],
		droite: [1, 2, 5, 4],
		gauche: [2, 0, 3, 5]
	}
};

const SQUARE_PYRAMID_TOPOLOGY = {
	vertexCount: 5,
	faces: [
		[1, 2, 3, 4],
		[0, 1, 2],
		[0, 2, 3],
		[0, 3, 4],
		[0, 4, 1]
	],
	places: { dessous: [1, 2, 3, 4] }
};

const TRIANGLE_PYRAMID_TOPOLOGY = {
	vertexCount: 4,
	faces: [
		[1, 2, 3],
		[0, 1, 2],
		[0, 2, 3],
		[0, 3, 1]
	],
	places: { dessous: [1, 2, 3] }
};

// ============================================================================
// TOPOLOGIE
// ============================================================================

/** Les arêtes d'une liste de faces (chaque paire une fois, la plus petite d'abord) */
function edgesOf(faces: number[][]): [number, number][] {
	const edges: [number, number][] = [];
	for (const face of faces) {
		face.forEach((v, i) => {
			const w = face[(i + 1) % face.length];
			const edge: [number, number] = v < w ? [v, w] : [w, v];
			if (!edges.some(([a, b]) => a === edge[0] && b === edge[1])) edges.push(edge);
		});
	}
	return edges;
}

function polyhedron(
	shape: { vertexCount: number; faces: number[][]; places: SolideTopology['places'] },
	indefinite: string,
	ofThe: string
): SolideTopology {
	return { ...shape, edges: edgesOf(shape.faces), curved: false, indefinite, ofThe };
}

function round(vertexCount: number, indefinite: string, ofThe: string): SolideTopology {
	return { vertexCount, faces: [], edges: [], places: {}, curved: true, indefinite, ofThe };
}

/** Sommets, faces, arêtes et places d'une forme */
export function solideTopology(form: SolideForm): SolideTopology {
	switch (form) {
		case 'cube':
			return polyhedron(BOX_TOPOLOGY, 'un cube', 'du cube');
		case 'pave':
			return polyhedron(BOX_TOPOLOGY, 'un pavé', 'du pavé');
		case 'prisme-triangle':
		case 'prisme-triangle-rectangle':
			return polyhedron(PRISM_TOPOLOGY, 'un prisme', 'du prisme');
		case 'pyramide-carree':
		case 'pyramide-rectangle':
			return polyhedron(SQUARE_PYRAMID_TOPOLOGY, 'une pyramide', 'de la pyramide');
		case 'pyramide-triangle':
			return polyhedron(TRIANGLE_PYRAMID_TOPOLOGY, 'une pyramide', 'de la pyramide');
		case 'cylindre':
			return round(2, 'un cylindre', 'du cylindre');
		case 'cone':
			return round(2, 'un cône', 'du cône');
		case 'boule':
			return round(1, 'une boule', 'de la boule');
	}
}

// ============================================================================
// GÉOMÉTRIE
// ============================================================================

/** La bascule que le dessin d'une forme ajoute à celle de la vue (pour `turnVue`) */
export const solideTilt = (form: SolideForm): VueTilt =>
	solideTopology(form).curved ? SOLIDE_ROUND_TILT : VUE_TILT;

/** Sommets 3D d'un polyèdre : x vers la droite, y vers le haut, z vers le fond */
export function polyhedronVertices(form: SolideForm, dims: number[]): Point3[] {
	const p = (x: number, y: number, z: number): Point3 => ({ x, y, z });
	const box = (l: number, d: number, h: number) => [
		p(0, 0, 0),
		p(l, 0, 0),
		p(l, 0, d),
		p(0, 0, d),
		p(0, h, 0),
		p(l, h, 0),
		p(l, h, d),
		p(0, h, d)
	];
	const prism = (front: Point3[], length: number) => [
		...front,
		...front.map((v) => p(v.x, v.y, length))
	];
	switch (form) {
		case 'cube':
			return box(dims[0], dims[0], dims[0]);
		case 'pave':
			return box(dims[0], dims[1], dims[2]);
		case 'prisme-triangle':
			return prism([p(0, 0, 0), p(dims[0], 0, 0), p(dims[0] / 2, dims[1], 0)], dims[2]);
		case 'prisme-triangle-rectangle':
			return prism([p(0, 0, 0), p(dims[0], 0, 0), p(0, dims[1], 0)], dims[2]);
		case 'pyramide-carree':
		case 'pyramide-rectangle': {
			const [l, d, h] = form === 'pyramide-carree' ? [dims[0], dims[0], dims[1]] : dims;
			return [p(l / 2, h, d / 2), p(0, 0, 0), p(l, 0, 0), p(l, 0, d), p(0, 0, d)];
		}
		case 'pyramide-triangle': {
			// Un sommet devant (B), une arête au fond (AC) : avec un sommet au fond, celui-ci
			// se projetait presque sur l'arête du sommet S au sommet de devant à droite
			const [a, h] = dims;
			const depth = (a * Math.sqrt(3)) / 2;
			return [p(a / 2, h, (2 * depth) / 3), p(0, 0, depth), p(a / 2, 0, 0), p(a, 0, depth)];
		}
		default:
			return [];
	}
}

/**
 * Le point où la droite (a b) coupe `other` : un plan (trois points) ou une autre
 * droite (deux points, dans un même plan que la première). Le lecteur du bloc a
 * déjà refusé les cas sans point unique (parallèles, droite dans le plan…)
 */
export function meetPoint(a: Point3, b: Point3, other: Point3[]): Point3 {
	const minus = (p: Point3, q: Point3) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
	const cross = (u: Point3, v: Point3) => ({
		x: u.y * v.z - u.z * v.y,
		y: u.z * v.x - u.x * v.z,
		z: u.x * v.y - u.y * v.x
	});
	const dot = (u: Point3, v: Point3) => u.x * v.x + u.y * v.y + u.z * v.z;
	const u = minus(b, a);
	const [p, q, r] = other;
	let t: number;
	if (r !== undefined) {
		// Plan : n · (a + t u − p) = 0
		const n = cross(minus(q, p), minus(r, p));
		t = dot(n, minus(p, a)) / dot(n, u);
	} else {
		// Droite (p q) : a + t u = p + s v, lu le long de u × v
		const v = minus(q, p);
		const n = cross(u, v);
		t = dot(cross(minus(p, a), v), n) / dot(n, n);
	}
	return { x: a.x + t * u.x, y: a.y + t * u.y, z: a.z + t * u.z };
}

/**
 * Les points nommables d'un polyèdre, en 3D : les sommets, puis chaque point
 * déclaré (isobarycentre de ses points `of`, sommets ou points déclarés avant lui ;
 * ou point donné par ses coordonnées dans le repère du solide, `coords` ; ou point
 * d'intersection, `meet`)
 */
export function solidePoints3(
	form: SolideForm,
	dims: number[],
	points: Pick<SolidePoint, 'of' | 'coords' | 'meet'>[]
): Point3[] {
	const all = polyhedronVertices(form, dims);
	for (const point of points) {
		if (point.meet !== undefined) {
			const { line, other } = point.meet;
			all.push(
				meetPoint(
					all[line[0]],
					all[line[1]],
					other.map((i) => all[i])
				)
			);
			continue;
		}
		// Par ses coordonnées : origine + x × premier vecteur + y × deuxième + z × troisième
		if (point.coords !== undefined) {
			const { origin, axes, values } = point.coords;
			const o = all[origin];
			const along = (pick: (p: Point3) => number) =>
				pick(o) + axes.reduce((sum, axis, i) => sum + values[i] * (pick(all[axis]) - pick(o)), 0);
			all.push({ x: along((p) => p.x), y: along((p) => p.y), z: along((p) => p.z) });
			continue;
		}
		const of = point.of.map((i) => all[i]);
		all.push({
			x: of.reduce((s, p) => s + p.x, 0) / of.length,
			y: of.reduce((s, p) => s + p.y, 0) / of.length,
			z: of.reduce((s, p) => s + p.z, 0) / of.length
		});
	}
	return all;
}

const bounds3 = (points: Point3[]) => ({
	minX: Math.min(...points.map((p) => p.x)),
	maxX: Math.max(...points.map((p) => p.x)),
	minY: Math.min(...points.map((p) => p.y)),
	maxY: Math.max(...points.map((p) => p.y)),
	minZ: Math.min(...points.map((p) => p.z)),
	maxZ: Math.max(...points.map((p) => p.z))
});

/** Distance du point p au segment [a, b] */
function distanceToSegment(p: EspacePoint, a: EspacePoint, b: EspacePoint): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const squared = dx * dx + dy * dy;
	const t =
		squared === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / squared));
	return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

const centroid = (points: Point3[]): Point3 => ({
	x: points.reduce((s, p) => s + p.x, 0) / points.length,
	y: points.reduce((s, p) => s + p.y, 0) / points.length,
	z: points.reduce((s, p) => s + p.z, 0) / points.length
});

/** Arc d'ellipse à plat (repère de calcul), de l'angle `from` à `to` */
function arc(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	from: number,
	to: number
): EspacePoint[] {
	const steps = Math.max(8, Math.ceil((ARC_STEPS * Math.abs(to - from)) / (2 * Math.PI)));
	return Array.from({ length: steps + 1 }, (_, i) => {
		const t = from + ((to - from) * i) / steps;
		return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
	});
}

/** Nombre à la française */
export const frenchNumber = (n: number) => String(Number(n.toFixed(4))).replace('.', ',');

// ============================================================================
// SCÈNE
// ============================================================================

/**
 * Une cote à poser, en repère de calcul ; `side` : côté où écrire le texte ;
 * `renvoi` : hors du solide, à droite, relié à `at` par un trait fin
 */
interface Cote {
	at: EspacePoint;
	value: number;
	side: 'dessous' | 'droite' | 'gauche' | 'dessus' | 'bas-droite' | 'haut-gauche' | 'renvoi';
}

/** Ce que la géométrie d'une forme donne, avant mise à l'échelle (repère de calcul) */
interface Draft {
	lines: SolideLine[];
	fills: EspacePoint[][];
	vertices: EspacePoint[];
	/** Sommets qui sont des centres (étiquette à gauche, point si nommé) */
	centers: number[];
	/** Sommets que plus aucun trait ne montre (cône vu de haut) : un point s'ils sont nommés */
	lone?: number[];
	/** Arêtes (polyèdres) : un nom se pose dans le plus grand angle libre entre elles */
	edges: [number, number][];
	cotes: Cote[];
	/** Polygone de la section ; null : aucune */
	section: EspacePoint[] | null;
	/** Noms des sommets de la section : point et direction (vers l'extérieur) */
	sectionLabels: { at: EspacePoint; away: EspacePoint; text: string }[];
	/** Points déclarés (`points:`) ; aucun pour un solide rond */
	points: EspacePoint[];
	/** Droites données (`droites:`), chacune en morceaux qui se suivent ; polyèdres seulement */
	droites?: SolideLine[][];
	/** Segments donnés, puis carrés des angles droits codés, en morceaux ; polyèdres seulement */
	segments?: SolideLine[];
	/**
	 * Plans donnés (`plans:`) ; `spots` : les points du plan où écrire le nom d'un plan
	 * nommé, du plus dégagé au moins dégagé sur le dessin de départ ; `borderSpots` : des
	 * points de son bord (`side` : le côté, de `fill[side]` au suivant), à côté desquels
	 * écrire le nom quand il n'a pas la place dans le plan, les plus longs côtés du
	 * dessin de départ d'abord ; polyèdres seulement
	 */
	plans?: (SolidePlanShape & {
		spots: EspacePoint[];
		borderSpots: { at: EspacePoint; side: number }[];
	})[];
}

/**
 * La place du nom d'un plan : `inside`, le rang d'un point du plan (`spots`) ;
 * sinon à côté du bord, à l'écart `offset` (écran, cm) du point `border` de
 * `borderSpots`
 */
type PlanSpot = { inside: number } | { border: number; offset: EspacePoint };

/** Un solide vu d'une vue : son dessin, le centre autour duquel il tourne, sa plus grande demi-diagonale */
interface TurnedDraft extends Draft {
	/** Le centre du solide, projeté (repère de calcul) */
	pivot: EspacePoint;
	/** Distance, dans l'espace, du centre au point nommable le plus éloigné */
	reach: number;
}

const segment = (a: EspacePoint, b: EspacePoint, dashed: boolean): SolideLine => ({
	points: [a, b],
	dashed,
	thick: false
});
const middle = (a: EspacePoint, b: EspacePoint): EspacePoint => ({
	x: (a.x + b.x) / 2,
	y: (a.y + b.y) / 2
});

function polyhedronDraft(spec: SolideSpec, vue: EspaceVue = VUE_DE_DEPART): TurnedDraft {
	const topology = solideTopology(spec.form);
	const points3 = polyhedronVertices(spec.form, spec.dims);
	// Vue de départ : la cavalière ; une figure que l'on peut tourner : la vue du moment (ADR 0045)
	const center3 = centroid(points3);
	const view = vueProjection(vue, center3);
	const project = view.project;
	const vertices = points3.map(project);
	const hiddenEdge = hiddenEdges(points3, topology.faces, topology.edges, view);
	const lines = topology.edges.map(([a, b], k) => {
		const line = segment(vertices[a], vertices[b], spec.hidden && hiddenEdge[k]);
		const marked = spec.marks.some(
			(m) => m.kind === 'arete' && m.vertices.includes(a) && m.vertices.includes(b)
		);
		return marked ? { ...line, thick: true } : line;
	});
	const fills = spec.marks.flatMap((m) =>
		m.kind === 'face' ? [m.vertices.map((i) => vertices[i])] : []
	);

	const cotes: Cote[] = [];
	if (spec.cotes) {
		const [d0, d1, d2] = spec.dims;
		const v = vertices;
		/**
		 * Hauteur d'un prisme en tirets ; sa cote au tiers, sous l'arête cachée du fond
		 */
		const height = (apex: EspacePoint, foot: EspacePoint, value: number) => {
			lines.push(segment(apex, foot, true));
			const at = { x: foot.x + (apex.x - foot.x) / 3, y: foot.y + (apex.y - foot.y) / 3 };
			cotes.push({ at, value, side: 'droite' });
		};
		/**
		 * Hauteur d'une pyramide en tirets, du sommet au centre de la base ; sa cote
		 * renvoyée hors du solide depuis le milieu : dedans, une arête latérale
		 * traversait le texte (n° 17 de `outils-manquants.md`)
		 */
		const pyramidHeight = (value: number) => {
			const apex = v[0];
			const foot = project({ ...centroid(points3.slice(1)), y: 0 });
			lines.push(segment(apex, foot, true));
			cotes.push({ at: middle(apex, foot), value, side: 'renvoi' });
		};
		switch (spec.form) {
			case 'cube':
				cotes.push({ at: middle(v[0], v[1]), value: d0, side: 'dessous' });
				break;
			case 'pave':
				cotes.push({ at: middle(v[0], v[1]), value: d0, side: 'dessous' });
				cotes.push({ at: middle(v[1], v[2]), value: d1, side: 'bas-droite' });
				// Hauteur à gauche : à droite, l'arête du fond passerait dans le texte
				cotes.push({ at: middle(v[0], v[4]), value: d2, side: 'gauche' });
				break;
			case 'prisme-triangle':
				cotes.push({ at: middle(v[0], v[1]), value: d0, side: 'dessous' });
				height(v[2], middle(v[0], v[1]), d1);
				cotes.push({ at: middle(v[1], v[4]), value: d2, side: 'bas-droite' });
				break;
			case 'prisme-triangle-rectangle':
				cotes.push({ at: middle(v[0], v[1]), value: d0, side: 'dessous' });
				cotes.push({ at: middle(v[0], v[2]), value: d1, side: 'gauche' });
				cotes.push({ at: middle(v[1], v[4]), value: d2, side: 'bas-droite' });
				break;
			case 'pyramide-carree':
				cotes.push({ at: middle(v[1], v[2]), value: d0, side: 'dessous' });
				pyramidHeight(d1);
				break;
			case 'pyramide-triangle':
				// B devant : [AB] est raide, le texte en dessous serait traversé ; [BC] monte
				// vers le fond comme la fuyante du pavé
				cotes.push({ at: middle(v[2], v[3]), value: d0, side: 'bas-droite' });
				pyramidHeight(d1);
				break;
			case 'pyramide-rectangle':
				cotes.push({ at: middle(v[1], v[2]), value: d0, side: 'dessous' });
				cotes.push({ at: middle(v[2], v[3]), value: d1, side: 'bas-droite' });
				pyramidHeight(d2);
				break;
		}
	}
	const { section, sectionLabels } = boxSection(spec, topology, points3, lines, cotes, project);
	const named3 = solidePoints3(spec.form, spec.dims, spec.points);
	const points = named3.slice(points3.length).map(project);

	// Droites données : de part et d'autre de la corde dans le solide, en tirets là
	// où une face passe devant (lot 7a, question (c))
	const box = bounds3(points3);
	const overhang =
		DROITE_OVERHANG * Math.max(box.maxX - box.minX, box.maxY - box.minY, box.maxZ - box.minZ);
	const ends3: Point3[] = [];
	const droites = spec.droites?.map((droite) => {
		const a = named3[droite.from];
		const b = named3[droite.to];
		const along = (t: number): Point3 => ({
			x: a.x + (b.x - a.x) * t,
			y: a.y + (b.y - a.y) * t,
			z: a.z + (b.z - a.z) * t
		});
		const [enter, leave] = chordInSolid(points3, topology.faces, a, b);
		const beyond = overhang / Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
		const from = along(enter - beyond);
		const to = along(leave + beyond);
		ends3.push(from, to);
		const stretches = spec.hidden
			? hiddenStretches(points3, topology.faces, topology.edges, from, to, view)
			: [{ from: 0, to: 1, hidden: false }];
		const at = (t: number) =>
			project({
				x: from.x + (to.x - from.x) * t,
				y: from.y + (to.y - from.y) * t,
				z: from.z + (to.z - from.z) * t
			});
		return stretches.map((stretch) => segment(at(stretch.from), at(stretch.to), stretch.hidden));
	});

	// Segments donnés, puis carrés des angles droits codés (outil n° 72) : d'un point
	// à l'autre, en tirets là où une face passe devant, comme les droites
	const piecesOf = (from: Point3, to: Point3): SolideLine[] => {
		const stretches = spec.hidden
			? hiddenStretches(points3, topology.faces, topology.edges, from, to, view)
			: [{ from: 0, to: 1, hidden: false }];
		const at = (t: number) =>
			project({
				x: from.x + (to.x - from.x) * t,
				y: from.y + (to.y - from.y) * t,
				z: from.z + (to.z - from.z) * t
			});
		return stretches.map((stretch) => segment(at(stretch.from), at(stretch.to), stretch.hidden));
	};
	const size3 = Math.max(box.maxX - box.minX, box.maxY - box.minY, box.maxZ - box.minZ);
	const givenSegments =
		spec.segments === undefined && spec.rightAngles === undefined
			? undefined
			: [
					...(spec.segments ?? []).flatMap((s) => piecesOf(named3[s.from], named3[s.to])),
					...(spec.rightAngles ?? []).flatMap((angle) => {
						const corner = named3[angle.at];
						const toward = (p: Point3) => {
							const length = Math.hypot(p.x - corner.x, p.y - corner.y, p.z - corner.z);
							return {
								length,
								unit: {
									x: (p.x - corner.x) / length,
									y: (p.y - corner.y) / length,
									z: (p.z - corner.z) / length
								}
							};
						};
						const u = toward(named3[angle.from]);
						const w = toward(named3[angle.to]);
						// Le côté du carré : une part du solide, jamais plus du tiers d'un côté de l'angle
						const side = Math.min(RIGHT_ANGLE_SIZE * size3, Math.min(u.length, w.length) / 3);
						const shifted = (a: number, b: number): Point3 => ({
							x: corner.x + side * (a * u.unit.x + b * w.unit.x),
							y: corner.y + side * (a * u.unit.y + b * w.unit.y),
							z: corner.z + side * (a * u.unit.z + b * w.unit.z)
						});
						return [
							...piecesOf(shifted(1, 0), shifted(1, 1)),
							...piecesOf(shifted(1, 1), shifted(0, 1))
						];
					})
				];

	// Plans donnés : la partie du plan dans le solide ; son bord en tirets là où une
	// face passe devant (lot 7b, question (c))
	const lerp = (p: Point3, q: Point3, t: number): Point3 => ({
		x: p.x + (q.x - p.x) * t,
		y: p.y + (q.y - p.y) * t,
		z: p.z + (q.z - p.z) * t
	});
	const polygons3 = (spec.plans ?? []).map((plan) => {
		const [a, b, c] = plan.through.map((i) => named3[i]);
		return planeInSolid(points3, topology.edges, a, b, c);
	});
	// Le nom d'un plan se choisit sur le dessin de départ, puis suit son point du plan
	const restProject = vueProjection(VUE_DE_DEPART, center3).project;
	const restObstacles: [EspacePoint, EspacePoint][] = [
		...topology.edges.map(([i, j]): [EspacePoint, EspacePoint] => [
			restProject(points3[i]),
			restProject(points3[j])
		]),
		...ends3.flatMap((p, i): [EspacePoint, EspacePoint][] =>
			i % 2 === 0 ? [[restProject(p), restProject(ends3[i + 1])]] : []
		),
		...polygons3.flatMap((polygon) =>
			polygon.map((p, i): [EspacePoint, EspacePoint] => [
				restProject(p),
				restProject(polygon[(i + 1) % polygon.length])
			])
		)
	];
	const restNamed = named3.map(restProject);
	const plans = spec.plans?.map((plan, k) => {
		const polygon = polygons3[k];
		const border = polygon.flatMap((from, i) => {
			const to = polygon[(i + 1) % polygon.length];
			const stretches = spec.hidden
				? hiddenStretches(points3, topology.faces, topology.edges, from, to, view)
				: [{ from: 0, to: 1, hidden: false }];
			return stretches.map((stretch) =>
				segment(
					project(lerp(from, to, stretch.from)),
					project(lerp(from, to, stretch.to)),
					stretch.hidden
				)
			);
		});
		let spots: EspacePoint[] = [];
		let borderSpots: { at: EspacePoint; side: number }[] = [];
		if (plan.name !== null) {
			const middle3 = centroid(polygon);
			const toward = polygon.flatMap((p, i) => [
				p,
				lerp(p, polygon[(i + 1) % polygon.length], 0.5)
			]);
			// Du plus dégagé au moins dégagé : le plus loin de tout trait et de tout point
			// nommé du dessin de départ (à égalité, l'ordre écrit : le milieu d'abord)
			const room = (spot: Point3) => {
				const p = restProject(spot);
				return Math.min(
					...restObstacles.map(([a, b]) => distanceToSegment(p, a, b)),
					...restNamed.map((q) => Math.hypot(p.x - q.x, p.y - q.y))
				);
			};
			spots = [middle3, ...PLAN_NAME_TOWARD.flatMap((t) => toward.map((p) => lerp(middle3, p, t)))]
				.map((spot, i) => ({ spot, i, room: room(spot) }))
				.sort((p, q) => (Math.abs(q.room - p.room) > 1e-9 ? q.room - p.room : p.i - q.i))
				.map(({ spot }) => project(spot));
			const restLength = (side: number) => {
				const a = restProject(polygon[side]);
				const b = restProject(polygon[(side + 1) % polygon.length]);
				return Math.hypot(b.x - a.x, b.y - a.y);
			};
			borderSpots = polygon
				.map((_, side) => ({ side, length: restLength(side) }))
				.sort((p, q) =>
					Math.abs(q.length - p.length) > 1e-9 ? q.length - p.length : p.side - q.side
				)
				.flatMap(({ side }) =>
					PLAN_NAME_ALONG.map((t) => ({
						at: project(lerp(polygon[side], polygon[(side + 1) % polygon.length], t)),
						side
					}))
				);
		}
		return { fill: polygon.map(project), border, spots, borderSpots };
	});
	return {
		pivot: project(center3),
		reach: Math.max(
			...[...named3, ...ends3].map((p) =>
				Math.hypot(p.x - center3.x, p.y - center3.y, p.z - center3.z)
			)
		),
		...(droites !== undefined && { droites }),
		...(givenSegments !== undefined && { segments: givenSegments }),
		...(plans !== undefined && { plans }),
		lines,
		fills,
		vertices,
		centers: [],
		edges: topology.edges,
		cotes,
		section,
		sectionLabels,
		points
	};
}

/**
 * Pour chaque face d'un pavé, l'arête où écrire la distance du plan (une arête
 * qui part de la face, ni sous une cote du pavé ni cachée), son sommet sur la
 * face et le côté du texte
 */
const SECTION_COTE: Record<string, { from: number; to: number; side: Cote['side'] }> = {
	// Dans la face avant, contre [BF] : à droite, le texte toucherait C et sa cote
	'0,1,2,3': { from: 1, to: 5, side: 'gauche' },
	'4,5,6,7': { from: 5, to: 1, side: 'gauche' },
	'0,1,4,5': { from: 4, to: 7, side: 'haut-gauche' },
	'2,3,6,7': { from: 7, to: 4, side: 'haut-gauche' },
	'0,3,4,7': { from: 7, to: 6, side: 'dessus' },
	'1,2,5,6': { from: 6, to: 7, side: 'dessus' }
};

/** Section d'un cube ou d'un pavé parallèlement à une face */
function boxSection(
	spec: SolideSpec,
	topology: SolideTopology,
	points3: Point3[],
	lines: SolideLine[],
	cotes: Cote[],
	project: (p: Point3) => EspacePoint
): Pick<Draft, 'section' | 'sectionLabels'> {
	const cut = spec.section;
	if (cut?.kind !== 'face') return { section: null, sectionLabels: [] };
	const across = (v: number) => {
		const edge = topology.edges.find(
			(e) => e.includes(v) && !cut.face.includes(e[0] === v ? e[1] : e[0])
		);
		return edge === undefined ? v : edge[0] === v ? edge[1] : edge[0];
	};
	const toward = (from: number, to: number, distance: number): Point3 => {
		const a = points3[from];
		const b = points3[to];
		const k = distance / Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
		return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
	};
	const section3 = cut.face.map((v) => toward(v, across(v), cut.distance));
	const section = section3.map(project);
	section.forEach((p, i) => {
		lines.push({ ...segment(p, section[(i + 1) % section.length], false), thick: true });
	});
	if (spec.cotes) {
		const key = [...cut.face].sort((a, b) => a - b).join(',');
		const where = SECTION_COTE[key];
		const foot = project(points3[where.from]);
		const end = project(toward(where.from, where.to, cut.distance));
		cotes.push({ at: middle(foot, end), value: cut.distance, side: where.side });
	}
	// Noms : en s'écartant de l'arête qui porte le point, vers l'extérieur du solide
	const center = project(centroid(points3));
	const sectionLabels = (cut.names ?? []).map((text, i) => {
		const p = section[i];
		const a = project(points3[cut.face[i]]);
		const b = project(points3[across(cut.face[i])]);
		const along = { x: b.x - a.x, y: b.y - a.y };
		const length = Math.hypot(along.x, along.y) || 1;
		const u = { x: along.x / length, y: along.y / length };
		const out = { x: p.x - center.x, y: p.y - center.y };
		const k = out.x * u.x + out.y * u.y;
		let away = { x: out.x - k * u.x, y: out.y - k * u.y };
		if (Math.hypot(away.x, away.y) < 1e-9) away = { x: -u.y, y: u.x };
		return { at: p, away, text };
	});
	return { section, sectionLabels };
}

/** Contour d'une section : trait plein épais, fermé */
const sectionOutline = (points: EspacePoint[]): SolideLine => ({
	points: [...points, points[0]],
	dashed: false,
	thick: true
});

function roundDraft(spec: SolideSpec): Draft {
	const [r, h] = spec.dims;
	const ry = r * ELLIPSE_RATIO;
	const back = spec.hidden;
	const lines: SolideLine[] = [];
	const cotes: Cote[] = [];
	const plainArc = (points: EspacePoint[], dashed = false): SolideLine => ({
		points,
		dashed,
		thick: false
	});
	switch (spec.form) {
		case 'cylindre': {
			lines.push(plainArc(arc(0, 0, r, ry, 0, Math.PI), back));
			lines.push(plainArc(arc(0, 0, r, ry, Math.PI, 2 * Math.PI)));
			lines.push(plainArc(arc(0, h, r, ry, 0, 2 * Math.PI)));
			lines.push(segment({ x: -r, y: 0 }, { x: -r, y: h }, false));
			lines.push(segment({ x: r, y: 0 }, { x: r, y: h }, false));
			if (spec.cotes) {
				lines.push(segment({ x: 0, y: h }, { x: r, y: h }, false));
				// Au bout du rayon, hors de l'ellipse
				cotes.push({ at: { x: r, y: h }, value: r, side: 'droite' });
				// Hauteur à gauche : à droite, elle toucherait la cote du rayon (cylindre bas)
				cotes.push({ at: { x: -r, y: h / 2 }, value: h, side: 'gauche' });
			}
			let section: EspacePoint[] | null = null;
			const cut = spec.section;
			if (cut?.kind === 'perpendiculaire') {
				section = arc(0, cut.distance, r, ry, 0, 2 * Math.PI);
				// Distance le long de la génératrice de droite (la hauteur est à gauche)
				if (spec.cotes) {
					cotes.push({ at: { x: r, y: cut.distance / 2 }, value: cut.distance, side: 'droite' });
				}
			} else if (cut?.kind === 'parallele') {
				// Plan de face, côté de l'œil : sur l'ellipse à plat, la profondeur −d monte de −d × ry / r
				const half = Math.sqrt(r * r - cut.distance * cut.distance);
				const low = (-cut.distance * ry) / r;
				section = [
					{ x: -half, y: low },
					{ x: half, y: low },
					{ x: half, y: h + low },
					{ x: -half, y: h + low }
				];
				// Distance à l'axe : en tirets, du centre de la base du bas au bord de la section
				if (spec.cotes && cut.distance > 0) {
					lines.push(segment({ x: 0, y: 0 }, { x: 0, y: low }, true));
					cotes.push({ at: { x: 0, y: -ry }, value: cut.distance, side: 'dessous' });
				}
			}
			if (section !== null) lines.push(sectionOutline(section));
			return {
				section,
				sectionLabels: [],
				lines,
				fills: [],
				vertices: [
					{ x: 0, y: 0 },
					{ x: 0, y: h }
				],
				centers: [0, 1],
				edges: [],
				cotes,
				points: []
			};
		}
		case 'cone': {
			const apex = { x: 0, y: h };
			// Points de tangence depuis le sommet (h > ry : cône trop plat refusé au parseur)
			const t = Math.asin(ry / h);
			lines.push(plainArc(arc(0, 0, r, ry, t, Math.PI - t), back));
			lines.push(plainArc(arc(0, 0, r, ry, Math.PI - t, 2 * Math.PI + t)));
			const foot = (s: number) => ({ x: s * r * Math.cos(t), y: ry * Math.sin(t) });
			lines.push(segment(foot(-1), apex, false));
			lines.push(segment(foot(1), apex, false));
			if (spec.cotes) {
				lines.push(segment({ x: 0, y: 0 }, { x: r, y: 0 }, true));
				lines.push(segment(apex, { x: 0, y: 0 }, true));
				// Rayon : au bout, hors de l'ellipse ; hauteur : au tiers, où le cône est large
				cotes.push({ at: { x: r, y: 0 }, value: r, side: 'droite' });
				cotes.push({ at: { x: 0, y: h / 3 }, value: h, side: 'droite' });
			}
			return {
				section: null,
				sectionLabels: [],
				lines,
				fills: [],
				vertices: [apex, { x: 0, y: 0 }],
				centers: [1],
				edges: [],
				cotes,
				points: []
			};
		}
		default: {
			// Boule ; coupée, sans équateur (il se confondrait avec la section à `section: 0`)
			const cut = spec.section?.kind === 'boule' ? spec.section : null;
			lines.push(plainArc(arc(0, 0, r, r, 0, 2 * Math.PI)));
			if (cut === null) {
				lines.push(plainArc(arc(0, 0, r, ry, 0, Math.PI), back));
				lines.push(plainArc(arc(0, 0, r, ry, Math.PI, 2 * Math.PI)));
			}
			if (spec.cotes) {
				lines.push(segment({ x: 0, y: 0 }, { x: r, y: 0 }, true));
				// Sous le rayon : au-dessus, l'équateur arrière passerait dans le texte
				cotes.push({ at: { x: r / 2, y: 0 }, value: r, side: 'dessous' });
			}
			let section: EspacePoint[] | null = null;
			if (cut !== null) {
				// Vue inclinée dont l'ellipse à plat est l'ombre (sin = ELLIPSE_RATIO) : la hauteur
				// se raccourcit de cos ; l'ellipse reste alors dans le cercle, même près du pôle
				const radius = Math.sqrt(r * r - cut.distance * cut.distance);
				const y = cut.distance * Math.sqrt(1 - ELLIPSE_RATIO ** 2);
				section = arc(0, y, radius, radius * ELLIPSE_RATIO, 0, 2 * Math.PI);
				lines.push(sectionOutline(section));
				if (spec.cotes && cut.distance > 0) {
					lines.push(segment({ x: 0, y: 0 }, { x: 0, y }, true));
					cotes.push({ at: { x: 0, y: y / 2 }, value: cut.distance, side: 'gauche' });
				}
			}
			return {
				section,
				sectionLabels: [],
				lines,
				fills: [],
				vertices: [{ x: 0, y: 0 }],
				centers: [0],
				edges: [],
				cotes,
				points: []
			};
		}
	}
}

/**
 * Un solide rond vu d'une vue : de vrais ovales (un cercle horizontal regardé
 * de l'inclinaison e a pour petit axe r × sin e), les hauteurs raccourcies de
 * cos e. Tourner autour de l'axe (`vue.yaw`) ne change rien au solide nu ; le
 * rayon coté, la coupe parallèle à l'axe et sa distance, eux, tournent (lot 4).
 * À la vue de départ : le dessin « à plat » de `roundDraft`, trait pour trait,
 * cotes comprises.
 */
function turnedRoundDraft(spec: SolideSpec, vue: EspaceVue): TurnedDraft {
	const [r, h = 0] = spec.dims;
	const back = spec.hidden;
	const ball = spec.form === 'boule';
	// Rien de basculé : les nombres du dessin fixe, sans passer par sinus et cosinus
	const still = vue.pitch === 0 && vue.oblique === 1;
	const elevation = ROUND_ELEVATION + vue.pitch;
	// Petit axe des ovales, signé : négatif, on regarde par-dessous (le fond passe en bas)
	const ry = r * (still ? ELLIPSE_RATIO : Math.sin(elevation));
	// Au repos les hauteurs sont entières ; le passage les amène à leur vraie longueur
	const stretch = 1 + vue.oblique * (1 / Math.cos(ROUND_ELEVATION) - 1);
	// Ce que devient une hauteur de 1 : cylindre et cône (entière au repos) ; boule
	// (toujours la vraie vue : son contour reste un cercle)
	const rise = ball
		? still
			? Math.sqrt(1 - ELLIPSE_RATIO ** 2)
			: Math.max(0, Math.cos(elevation))
		: still
			? 1
			: Math.max(0, Math.cos(elevation)) * stretch;
	const top = h * rise;
	const fromAbove = ry >= 0;
	const cy = Math.cos(vue.yaw);
	const sy = Math.sin(vue.yaw);
	/**
	 * Un point du solide (x à droite, y le long de l'axe, z vers le fond), tourné
	 * autour de l'axe puis vu de l'inclinaison de la vue
	 */
	const place = (x: number, y: number, z: number): EspacePoint => ({
		x: x * cy + z * sy,
		y: y * rise + ((-x * sy + z * cy) * ry) / r
	});
	const plainArc = (points: EspacePoint[], dashed = false): SolideLine => ({
		points,
		dashed,
		thick: false
	});
	const shared = { fills: [], edges: [], sectionLabels: [], points: [] };
	// Le centre du solide ; aucun point n'en est plus loin que `reach`, passage compris
	const axis = {
		pivot: { x: 0, y: top / 2 },
		reach: Math.hypot(r, h / 2 / Math.cos(ROUND_ELEVATION))
	};
	const lines: SolideLine[] = [];
	const cotes: Cote[] = [];
	switch (spec.form) {
		case 'cylindre': {
			// Caché : le fond du cercle du bas vu de dessus, celui du cercle du haut vu de dessous
			lines.push(plainArc(arc(0, 0, r, ry, 0, Math.PI), back && fromAbove));
			lines.push(plainArc(arc(0, 0, r, ry, Math.PI, 2 * Math.PI)));
			if (fromAbove) lines.push(plainArc(arc(0, top, r, ry, 0, 2 * Math.PI)));
			else {
				lines.push(plainArc(arc(0, top, r, ry, 0, Math.PI), back));
				lines.push(plainArc(arc(0, top, r, ry, Math.PI, 2 * Math.PI)));
			}
			lines.push(segment({ x: -r, y: 0 }, { x: -r, y: top }, false));
			lines.push(segment({ x: r, y: 0 }, { x: r, y: top }, false));
			if (spec.cotes) {
				// Le rayon du disque du haut : derrière le solide quand on regarde par-dessous
				lines.push(segment(place(0, h, 0), place(r, h, 0), back && !fromAbove));
				cotes.push({ at: place(r, h, 0), value: r, side: 'droite' });
				cotes.push({ at: place(-r, h / 2, 0), value: h, side: 'gauche' });
			}
			let section: EspacePoint[] | null = null;
			const cut = spec.section;
			if (cut?.kind === 'perpendiculaire') {
				section = arc(0, cut.distance * rise, r, ry, 0, 2 * Math.PI);
				if (spec.cotes) {
					cotes.push({ at: place(r, cut.distance / 2, 0), value: cut.distance, side: 'droite' });
				}
			} else if (cut?.kind === 'parallele') {
				// Plan à `distance` de l'axe, du côté de l'œil au départ : il tourne avec le solide
				const half = Math.sqrt(r * r - cut.distance * cut.distance);
				section = [
					place(-half, 0, -cut.distance),
					place(half, 0, -cut.distance),
					place(half, h, -cut.distance),
					place(-half, h, -cut.distance)
				];
				if (spec.cotes && cut.distance > 0) {
					lines.push(segment(place(0, 0, 0), place(0, 0, -cut.distance), true));
					cotes.push({ at: place(0, 0, -r), value: cut.distance, side: 'dessous' });
				}
			}
			if (section !== null) lines.push(sectionOutline(section));
			return {
				...shared,
				...axis,
				section,
				cotes,
				lines,
				vertices: [
					{ x: 0, y: 0 },
					{ x: 0, y: top }
				],
				centers: [0, 1]
			};
		}
		case 'cone': {
			const apex = { x: 0, y: top };
			const flat = Math.abs(ry);
			const outside = top > flat + 1e-9;
			if (outside) {
				// Sommet hors de l'ovale : deux traits tangents ; vu de dessus, l'arc du fond est caché
				const t = Math.asin(flat / top);
				lines.push(plainArc(arc(0, 0, r, flat, t, Math.PI - t), back && fromAbove));
				lines.push(plainArc(arc(0, 0, r, flat, Math.PI - t, 2 * Math.PI + t)));
				const foot = (s: number) => ({ x: s * r * Math.cos(t), y: flat * Math.sin(t) });
				lines.push(segment(foot(-1), apex, false));
				lines.push(segment(foot(1), apex, false));
			} else {
				// Sommet dans l'ovale (vu de haut ou de bas) : il ne reste que l'ovale, entier
				lines.push(plainArc(arc(0, 0, r, flat, 0, 2 * Math.PI)));
			}
			if (spec.cotes) {
				// Rayon de la base et hauteur : traits de construction, toujours en tirets
				lines.push(segment(place(0, 0, 0), place(r, 0, 0), true));
				lines.push(segment(apex, place(0, 0, 0), true));
				cotes.push({ at: place(r, 0, 0), value: r, side: 'droite' });
				cotes.push({ at: place(0, h / 3, 0), value: h, side: 'droite' });
			}
			return {
				...shared,
				...axis,
				section: null,
				cotes,
				lines,
				vertices: [apex, { x: 0, y: 0 }],
				centers: [1],
				// Plus de traits qui s'y rejoignent : son nom, s'il en a un, flotterait sans point
				...(!outside && { lone: [0] })
			};
		}
		default: {
			// Boule ; coupée, sans équateur (il se confondrait avec la section à `section: 0`)
			const cut = spec.section?.kind === 'boule' ? spec.section : null;
			lines.push(plainArc(arc(0, 0, r, r, 0, 2 * Math.PI)));
			if (cut === null) {
				lines.push(plainArc(arc(0, 0, r, ry, 0, Math.PI), back));
				lines.push(plainArc(arc(0, 0, r, ry, Math.PI, 2 * Math.PI)));
			}
			if (spec.cotes) {
				lines.push(segment(place(0, 0, 0), place(r, 0, 0), true));
				cotes.push({ at: place(r / 2, 0, 0), value: r, side: 'dessous' });
			}
			let section: EspacePoint[] | null = null;
			if (cut !== null) {
				const radius = Math.sqrt(r * r - cut.distance * cut.distance);
				const y = cut.distance * rise;
				section = arc(0, y, radius, (radius * ry) / r, 0, 2 * Math.PI);
				lines.push(sectionOutline(section));
				if (spec.cotes && cut.distance > 0) {
					lines.push(segment({ x: 0, y: 0 }, { x: 0, y }, true));
					cotes.push({ at: { x: 0, y: y / 2 }, value: cut.distance, side: 'gauche' });
				}
			}
			return {
				...shared,
				section,
				cotes,
				lines,
				pivot: { x: 0, y: 0 },
				reach: r,
				vertices: [{ x: 0, y: 0 }],
				centers: [0]
			};
		}
	}
}

/** Boîte d'une étiquette centrée en `at` */
/** Boîte d'une étiquette (coins bas-gauche, haut-droit), en cm ; exportée pour les tests */
export const labelBox = (label: SolideLabel) => {
	const halfWidth = (labelChars(label) * CHAR_WIDTH) / 2 + 0.03;
	const halfHeight = SOLIDE_LABEL_SIZE / 2 + 0.03;
	return [
		{ x: label.at.x - halfWidth, y: label.at.y - halfHeight },
		{ x: label.at.x + halfWidth, y: label.at.y + halfHeight }
	];
};

/** Deux étiquettes se touchent-elles ? */
const overlaps = (a: SolideLabel, b: SolideLabel) => {
	const [a0, a1] = labelBox(a);
	const [b0, b1] = labelBox(b);
	return a0.x < b1.x && b0.x < a1.x && a0.y < b1.y && b0.y < a1.y;
};

const bounds = (points: EspacePoint[]) => ({
	minX: Math.min(...points.map((p) => p.x)),
	maxX: Math.max(...points.map((p) => p.x)),
	minY: Math.min(...points.map((p) => p.y)),
	maxY: Math.max(...points.map((p) => p.y))
});

/**
 * Direction du plus grand angle libre entre les arêtes d'un sommet (à l'écran) :
 * le nom s'y pose sans toucher de trait. null : sommet sans arête.
 */
function freeDirection(
	vertex: number,
	vertices: EspacePoint[],
	edges: [number, number][]
): EspacePoint | null {
	const p = vertices[vertex];
	const angles = edges
		.filter((e) => e.includes(vertex))
		.map(([a, b]) => vertices[a === vertex ? b : a])
		.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) > 1e-9)
		.map((q) => Math.atan2(q.y - p.y, q.x - p.x))
		.sort((a, b) => a - b);
	if (angles.length === 0) return null;
	let best = { gap: -1, middle: 0 };
	angles.forEach((angle, k) => {
		const next = k + 1 < angles.length ? angles[k + 1] : angles[0] + 2 * Math.PI;
		if (next - angle > best.gap) best = { gap: next - angle, middle: (angle + next) / 2 };
	});
	return { x: Math.cos(best.middle), y: Math.sin(best.middle) };
}

/** Une flèche de `from` à `to` (écran) ; pointe de taille `size` */
function arrowOf(
	from: EspacePoint,
	to: EspacePoint,
	size: { length: number; halfWidth: number },
	small: boolean
): SolideArrow {
	// Vecteur vu par le bout (figure tournée) : réduit à un point, sans direction
	const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
	const ux = (to.x - from.x) / length;
	const uy = (to.y - from.y) / length;
	const head = Math.min(size.length, Math.hypot(to.x - from.x, to.y - from.y) / 2);
	const base = { x: to.x - ux * head, y: to.y - uy * head };
	return {
		shaft: [from, base],
		head: [
			to,
			{ x: base.x - uy * size.halfWidth, y: base.y + ux * size.halfWidth },
			{ x: base.x + uy * size.halfWidth, y: base.y - ux * size.halfWidth }
		],
		small
	};
}

/** Une flèche de vecteur (taille `SOLIDE_ARROW`) de `from` à `to`, à l'écran : celle que trace l'élève */
export function solideArrowBetween(from: EspacePoint, to: EspacePoint): SolideArrow {
	return arrowOf(from, to, SOLIDE_ARROW, false);
}

/** Le segment [a, b] traverse-t-il la boîte ? (Liang-Barsky) */
function segmentHitsBox(a: EspacePoint, b: EspacePoint, box: EspacePoint[]): boolean {
	const [lo, hi] = box;
	let t0 = 0;
	let t1 = 1;
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const clips: [number, number][] = [
		[-dx, a.x - lo.x],
		[dx, hi.x - a.x],
		[-dy, a.y - lo.y],
		[dy, hi.y - a.y]
	];
	for (const [p, q] of clips) {
		if (p === 0) {
			if (q < 0) return false;
			continue;
		}
		const r = q / p;
		if (p < 0) t0 = Math.max(t0, r);
		else t1 = Math.min(t1, r);
		if (t0 > t1) return false;
	}
	return true;
}

/**
 * L'étiquette ne touche ni une de `placed`, ni un trait de `segments`, ni un
 * point de `dots` ; `rise` : hauteur en plus au-dessus de la boîte
 */
function isFree(
	c: SolideLabel,
	placed: SolideLabel[],
	segments: [EspacePoint, EspacePoint][],
	dots: EspacePoint[],
	rise = 0
): boolean {
	if (placed.some((l) => overlaps(c, l))) return false;
	const [lo, hi] = labelBox(c);
	const box = [{ x: lo.x, y: lo.y - rise }, hi];
	const inside = (p: EspacePoint) =>
		p.x > box[0].x - DOT_CLEARANCE &&
		p.x < box[1].x + DOT_CLEARANCE &&
		p.y > box[0].y - DOT_CLEARANCE &&
		p.y < box[1].y + DOT_CLEARANCE;
	return !segments.some(([a, b]) => segmentHitsBox(a, b, box)) && !dots.some(inside);
}

/**
 * La première étiquette qui ne touche ni une de `placed` ni un trait de
 * `segments` ; à défaut, la première qui ne touche aucune étiquette ; la
 * première sinon. `rise` : hauteur en plus au-dessus de la boîte (petite flèche
 * d'un nom de vecteur).
 */
function firstFree(
	candidates: SolideLabel[],
	placed: SolideLabel[],
	segments: [EspacePoint, EspacePoint][],
	dots: EspacePoint[],
	rise = 0
): SolideLabel {
	const clearOfLabels = (c: SolideLabel) => !placed.some((l) => overlaps(c, l));
	const clearOfLines = (c: SolideLabel) => isFree(c, [], segments, dots, rise);
	return (
		candidates.find((c) => clearOfLabels(c) && clearOfLines(c)) ??
		candidates.find(clearOfLabels) ??
		candidates[0]
	);
}

/** Une cote écrite à côté de son trait, du côté `side` du point `p` (écran) */
function sideCote(
	side: Exclude<Cote['side'], 'renvoi'>,
	p: EspacePoint,
	text: string
): SolideLabel {
	const halfWidth = (text.length * CHAR_WIDTH) / 2;
	const halfHeight = SOLIDE_LABEL_SIZE / 2;
	const shift = {
		dessous: { x: 0, y: COTE_GAP + halfHeight },
		dessus: { x: 0, y: -(COTE_GAP + halfHeight) },
		droite: { x: COTE_GAP + halfWidth, y: 0 },
		gauche: { x: -(COTE_GAP + halfWidth), y: 0 },
		// Plus bas que le milieu de la fuyante : loin du nom du sommet du fond
		'bas-droite': { x: COTE_GAP + halfWidth, y: COTE_GAP + halfHeight / 2 },
		// Au-dessus d'une fuyante du haut à gauche : hors du dessin
		'haut-gauche': { x: -(COTE_GAP + halfWidth / 2), y: -(COTE_GAP + halfHeight) }
	}[side];
	return { at: { x: p.x + shift.x, y: p.y + shift.y }, text };
}

/**
 * Cote renvoyée hors du solide : un trait fin de `from` (milieu de la hauteur) à
 * droite de tous les sommets, le texte au bout ; le premier bout (`LEADER_RISES`)
 * dont le texte ne touche ni un trait ni une étiquette, et dont le trait ne
 * traverse aucune étiquette ; le premier sinon
 */
function leaderCote(
	from: EspacePoint,
	text: string,
	vertices: EspacePoint[],
	lines: SolideLine[],
	labels: SolideLabel[]
): { line: SolideLine; label: SolideLabel } {
	const right = Math.max(...vertices.map((v) => v.x));
	const halfWidth = (text.length * CHAR_WIDTH) / 2;
	const segments = lines.flatMap((l) =>
		l.points.slice(1).map((p, i): [EspacePoint, EspacePoint] => [l.points[i], p])
	);
	const options = LEADER_RISES.map((rise) => {
		const end = { x: right + LEADER_RUN, y: from.y + rise };
		return {
			line: { points: [from, end], dashed: false, thick: false, thin: true },
			label: { at: { x: end.x + COTE_GAP / 2 + halfWidth, y: end.y }, text }
		};
	});
	const clear = (o: (typeof options)[number]) => {
		const box = labelBox(o.label);
		const [a, b] = o.line.points;
		return (
			!labels.some((l) => overlaps(o.label, l) || segmentHitsBox(a, b, labelBox(l))) &&
			!segments.some(([p, q]) => segmentHitsBox(p, q, box))
		);
	};
	return options.find(clear) ?? options[0];
}

/**
 * Le dessin d'un solide. `vue` : figure que l'on peut tourner, vue de là, dans
 * son cadre fixe ; absente : le dessin fixe.
 * `held` (figure tournée) : places des noms à tenir (`labelOffsets` d'une scène
 * du même bloc) — pendant que la figure tourne, un nom ne change pas de côté ;
 * sans elles, chaque nom est placé pour cette vue.
 * Les cotes (`cotes:`) ne sont écrites qu'à la vue de départ : leur place est
 * pensée pour elle (Q1 du chantier `solides-3d`) ; les traits qui les
 * accompagnent (hauteur, rayon) restent et tournent (Q7).
 */
export function buildSolideScene(
	spec: SolideSpec,
	vue?: EspaceVue,
	held?: EspacePoint[]
): SolideScene {
	return layoutSolide(spec, vue, held).scene;
}

/**
 * La scène, et pour une figure tournée la place que prennent ses cotes (textes
 * et traits de renvoi), repérée depuis le centre du solide : le cadre la
 * réserve à chaque angle
 */
function layoutSolide(
	spec: SolideSpec,
	vue?: EspaceVue,
	held?: EspacePoint[]
): {
	scene: SolideScene;
	coteMarks: EspacePoint[];
	coteLabels: SolideLabel[];
	coteLines: SolideLine[];
	/** Pour chaque plan, la place de son nom (sans nom : la première) */
	planSpots: PlanSpot[];
} {
	const curved = solideTopology(spec.form).curved;
	// Le dessin fixe donne l'échelle, que la figure tournée garde
	const polyhedron = curved ? null : polyhedronDraft(spec);
	const fixed = polyhedron ?? roundDraft(spec);
	const view = (at: EspaceVue) => (curved ? turnedRoundDraft(spec, at) : polyhedronDraft(spec, at));
	const turned = vue !== undefined ? view(vue) : null;
	// Les longueurs ne sont écrites qu'à la vue de départ
	const atStart = vue === undefined || (vue.yaw === 0 && vue.pitch === 0 && vue.oblique === 1);
	// Le dessin au repos, repéré depuis le centre du solide
	const rest = turned === null ? null : (polyhedron ?? view(VUE_DE_DEPART));
	const draft = turned ?? fixed;

	// Mise à l'échelle (plus grand côté : SOLIDE_SIZE) et passage en y vers le bas
	const geometry = bounds([...fixed.lines.flatMap((l) => l.points), ...fixed.vertices]);
	const scale =
		SOLIDE_SIZE / Math.max(geometry.maxX - geometry.minX, geometry.maxY - geometry.minY);
	// Figure tournée : repérée depuis le centre du solide, qui ne bouge pas
	const toScreen =
		turned === null
			? (p: EspacePoint): EspacePoint => ({
					x: (p.x - geometry.minX) * scale,
					y: (geometry.maxY - p.y) * scale
				})
			: (p: EspacePoint): EspacePoint => ({
					x: (p.x - turned.pivot.x) * scale,
					y: (turned.pivot.y - p.y) * scale
				});
	const lines = draft.lines.map((l) => ({ ...l, points: l.points.map(toScreen) }));
	const fills = draft.fills.map((f) => f.map(toScreen));
	const section = draft.section?.map(toScreen) ?? null;
	const vertices = draft.vertices.map(toScreen);
	const points = draft.points.map(toScreen);
	const named = [...vertices, ...points];
	const droites = draft.droites?.map((pieces) =>
		pieces.map((l) => ({ ...l, points: l.points.map(toScreen) }))
	);
	const givenSegments = draft.segments?.map((l) => ({ ...l, points: l.points.map(toScreen) }));
	const givenSegmentEnds = (givenSegments ?? []).map((l): [EspacePoint, EspacePoint] => [
		l.points[0],
		l.points[1]
	]);
	// Chaque droite d'un bout à l'autre : les noms l'évitent
	const droiteSegments = (droites ?? []).map((pieces): [EspacePoint, EspacePoint] => [
		pieces[0].points[0],
		pieces[pieces.length - 1].points[1]
	]);
	const plans = draft.plans?.map((plan) => ({
		fill: plan.fill.map(toScreen),
		border: plan.border.map((l) => ({ ...l, points: l.points.map(toScreen) })),
		spots: plan.spots.map(toScreen),
		borderSpots: plan.borderSpots.map((spot) => ({ ...spot, at: toScreen(spot.at) }))
	}));
	// Le bord de chaque plan, côté par côté : les noms des points l'évitent
	const planSegments = (plans ?? []).flatMap((plan) =>
		plan.fill.map((p, i, all): [EspacePoint, EspacePoint] => [p, all[(i + 1) % all.length]])
	);
	// Les sommets dans le repère du dessin fixe, pour l'angle libre où poser un nom : deux
	// angles libres égaux (sommets D et F d'un pavé) sont départagés par le dernier chiffre,
	// qui doit être le même au repos que dans le dessin fixe — sinon le nom change de côté
	const fixedVertices = draft.vertices.map((p) => ({
		x: (p.x - geometry.minX) * scale,
		y: (geometry.maxY - p.y) * scale
	}));

	// Traits du dessin (arêtes, contour de la section) : les noms des sommets les évitent
	const edgeSegments: [EspacePoint, EspacePoint][] = [
		...lines.flatMap((l) =>
			l.points.slice(1).map((p, i): [EspacePoint, EspacePoint] => [l.points[i], p])
		),
		...(section ?? []).map((p, i, all): [EspacePoint, EspacePoint] => [
			p,
			all[(i + 1) % all.length]
		]),
		...droiteSegments,
		...givenSegmentEnds
	];

	// Noms des sommets : à l'extérieur, en s'éloignant du centre du dessin
	const labels: SolideLabel[] = [];
	// Les noms que l'on peut tenir (sommets, points de la section, points, vecteurs) et
	// le point auquel chacun est attaché ; les cotes n'en sont pas
	const anchors: EspacePoint[] = [];
	const anchored: SolideLabel[] = [];
	// Places tenues : toutes ou aucune (celles d'un autre bloc ne valent rien)
	const nameCount =
		(spec.names?.filter((n) => n !== null).length ?? 0) +
		draft.sectionLabels.length +
		spec.points.length +
		spec.vectors.filter((v) => v.name !== null).length +
		(spec.droites?.filter((d) => d.name !== null).length ?? 0);
	const holding = turned !== null && held !== undefined && held.length === nameCount;
	/** Le nom attaché à `anchor` : à sa place tenue, sinon parmi `candidates` */
	const nameAt = (
		anchor: EspacePoint,
		candidates: SolideLabel[],
		find: () => SolideLabel
	): SolideLabel => {
		const offset = holding ? held[anchors.length] : undefined;
		anchors.push(anchor);
		const label =
			offset === undefined
				? find()
				: { ...candidates[0], at: { x: anchor.x + offset.x, y: anchor.y + offset.y } };
		anchored.push(label);
		return label;
	};
	const unit = spec.cotes?.unit ? ` ${spec.cotes.unit}` : '';
	const coteText = (cote: Cote) => `${frenchNumber(cote.value)}${unit}`;
	// Figure cotée, ailleurs qu'au repos sans nom tenu : les cotes du repos, pour leur
	// place dans le cadre et, de retour à la vue de départ pendant que les noms se
	// replacent, pour les écrire là où elles seront (le renvoi d'une pyramide évite les noms)
	const atRest =
		turned !== null && spec.cotes !== null && !(atStart && !holding)
			? layoutSolide(spec, VUE_DE_DEPART)
			: null;
	const writtenCotes = atStart && atRest === null ? draft.cotes : [];
	// Les cotes écrites à côté de leur trait : le nom d'un centre les évite (boule coupée
	// près du centre : la distance du plan s'écrit là où le nom se pose d'habitude)
	const sideCotes = writtenCotes.flatMap((cote) =>
		cote.side === 'renvoi' ? [] : [sideCote(cote.side, toScreen(cote.at), coteText(cote))]
	);
	const dots: EspacePoint[] = [];
	const middleOfDrawing = {
		x: vertices.reduce((s, p) => s + p.x, 0) / vertices.length,
		y: vertices.reduce((s, p) => s + p.y, 0) / vertices.length
	};
	spec.names?.forEach((name, i) => {
		if (name === null) return;
		const p = vertices[i];
		let dx = p.x - middleOfDrawing.x;
		let dy = p.y - middleOfDrawing.y;
		const free = freeDirection(i, fixedVertices, draft.edges);
		if (free) {
			dx = free.x;
			dy = free.y;
		}
		if (draft.centers.includes(i) || Math.hypot(dx, dy) < 1e-6) {
			// Un centre : son nom à gauche, un peu plus bas
			dx = -1;
			dy = 0.35;
		}
		// La place habituelle d'abord ; si elle touche un trait (angle libre étroit,
		// trait de section), un peu plus loin ou en tournant un peu
		const base = Math.atan2(dy, dx);
		const candidates = NAME_PLACES.map(({ gap, turn }) => ({
			at: {
				x: p.x + Math.cos(base + turn) * LABEL_GAP * gap,
				y: p.y + Math.sin(base + turn) * LABEL_GAP * gap
			},
			text: name
		}));
		const others = vertices.filter((_, k) => k !== i);
		const taken = draft.centers.includes(i) ? [...labels, ...sideCotes] : labels;
		labels.push(nameAt(p, candidates, () => firstFree(candidates, taken, edgeSegments, others)));
		if (draft.centers.includes(i) || draft.lone?.includes(i)) dots.push(p);
	});
	for (const mark of spec.marks) {
		if (mark.kind !== 'sommet') continue;
		const p = vertices[mark.vertex];
		if (!dots.includes(p)) dots.push(p);
	}

	// Cotes : le texte à côté du trait, du côté demandé ; figure tournée : à la vue de
	// départ seulement
	const coteMarks: EspacePoint[] = [];
	const coteLabels: SolideLabel[] = [];
	const coteLines: SolideLine[] = [];
	if (atRest !== null && atStart) {
		lines.push(...atRest.coteLines);
		labels.push(...atRest.coteLabels);
	}
	for (const cote of writtenCotes) {
		const text = coteText(cote);
		const p = toScreen(cote.at);
		if (cote.side === 'renvoi') {
			const leader = leaderCote(p, text, vertices, lines, labels);
			lines.push(leader.line);
			labels.push(leader.label);
			coteLines.push(leader.line);
			coteLabels.push(leader.label);
			coteMarks.push(...leader.line.points, ...labelBox(leader.label));
			continue;
		}
		const label = sideCote(cote.side, p, text);
		labels.push(label);
		coteLabels.push(label);
		coteMarks.push(...labelBox(label));
	}

	// Noms des sommets de la section : vers l'extérieur, sinon en tournant, sans
	// toucher une étiquette déjà posée (noms des sommets, cotes)
	for (const name of draft.sectionLabels) {
		const p = toScreen(name.at);
		// `away` en repère de calcul (y vers le haut) → écran
		const base = Math.atan2(-name.away.y, name.away.x);
		const turns = [0, 1, -1, 2, -2, 3, -3, 4].map((k) => base + (k * Math.PI) / 4);
		const candidates = turns.map((t) => ({
			at: { x: p.x + Math.cos(t) * LABEL_GAP, y: p.y + Math.sin(t) * LABEL_GAP },
			text: name.text
		}));
		labels.push(
			nameAt(
				p,
				candidates,
				() => candidates.find((c) => !labels.some((l) => overlaps(c, l))) ?? candidates[0]
			)
		);
	}

	// Flèches des vecteurs donnés ; les traits que les noms des points et des vecteurs évitent
	// Le repère (lot 7c) : ses trois vecteurs, depuis l'origine, après les vecteurs donnés
	const repereVectors = (spec.repere?.axes ?? []).map((to) => ({
		from: spec.repere?.origin ?? 0,
		to
	}));
	const arrows: SolideArrow[] = [...spec.vectors, ...repereVectors].map((v) =>
		arrowOf(named[v.from], named[v.to], SOLIDE_ARROW, false)
	);
	const segments: [EspacePoint, EspacePoint][] = [
		...lines.flatMap((l) =>
			l.points.slice(1).map((p, i): [EspacePoint, EspacePoint] => [l.points[i], p])
		),
		...arrows.map((a): [EspacePoint, EspacePoint] => [a.shaft[0], a.head[0]]),
		...droiteSegments,
		...givenSegmentEnds,
		...planSegments
	];

	// Plans nommés : « (P) » écrit dans le plan, en un point du plan qu'il suit quand la
	// figure tourne (il ne se tient pas comme les autres noms). Le point se choisit sur le
	// dessin fixe : le plus dégagé où le nom ne touche ni trait ni étiquette déjà posée ;
	// s'il n'y a pas la place dans le plan (plan mince ou petit), à côté de son bord,
	// à un écart fixe d'un point du bord
	const planSpots: PlanSpot[] =
		turned !== null && spec.plans?.some((plan) => plan.name !== null)
			? layoutSolide(spec).planSpots
			: (spec.plans ?? []).map(() => ({ inside: 0 }));
	const planNames: SolideLabel[] = [];
	spec.plans?.forEach((plan, k) => {
		const shape = plans?.[k];
		if (plan.name === null || shape === undefined || shape.spots.length === 0) return;
		const text = `(${plan.name})`;
		if (turned === null) {
			const free = (at: EspacePoint) => isFree({ at, text }, labels, segments, named);
			const inside = shape.spots.findIndex(free);
			if (inside >= 0) planSpots[k] = { inside };
			else {
				const middleOfPlan = {
					x: shape.fill.reduce((sum, p) => sum + p.x, 0) / shape.fill.length,
					y: shape.fill.reduce((sum, p) => sum + p.y, 0) / shape.fill.length
				};
				const [lo, hi] = labelBox({ at: { x: 0, y: 0 }, text });
				// À côté d'un côté, vers l'extérieur du plan d'abord ; l'écart dépend de la pente
				// du côté, comme pour le nom d'une droite
				const beside = shape.borderSpots.flatMap((spot, border) => {
					const from = shape.fill[spot.side];
					const to = shape.fill[(spot.side + 1) % shape.fill.length];
					const length = Math.hypot(to.x - from.x, to.y - from.y);
					if (length < 1e-9) return [];
					const u = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
					const out =
						-u.y * (spot.at.x - middleOfPlan.x) + u.x * (spot.at.y - middleOfPlan.y) < 0 ? -1 : 1;
					const gap =
						(Math.abs(u.y) * (hi.x - lo.x)) / 2 +
						(Math.abs(u.x) * (hi.y - lo.y)) / 2 +
						DROITE_NAME_CLEAR;
					return PLAN_NAME_AWAY.flatMap((away) =>
						[out, -out].map((side) => ({
							border,
							away,
							offset: { x: -side * u.y * (gap + away), y: side * u.x * (gap + away) }
						}))
					);
				});
				// Tout contre le bord d'abord, quel que soit le côté ; plus loin ensuite
				beside.sort((p, q) => p.away - q.away);
				const outside = beside.find(({ border, offset }) =>
					free({
						x: shape.borderSpots[border].at.x + offset.x,
						y: shape.borderSpots[border].at.y + offset.y
					})
				);
				// Nulle part : dans le plan, là où il ne touche au moins aucune étiquette
				const fallback = shape.spots.findIndex(
					(at) => !labels.some((l) => overlaps({ at, text }, l))
				);
				planSpots[k] = outside ?? { inside: Math.max(fallback, 0) };
			}
		}
		const spot = planSpots[k];
		let at = shape.spots[0];
		if ('inside' in spot) at = shape.spots[spot.inside] ?? at;
		else {
			const anchor = shape.borderSpots[spot.border]?.at ?? at;
			at = { x: anchor.x + spot.offset.x, y: anchor.y + spot.offset.y };
		}
		const label = { at, text };
		if (!('inside' in spot)) planNames.push(label);
		labels.push(label);
	});

	// Points déclarés : un disque ; le nom en s'éloignant du milieu du dessin, sinon
	// en tournant, sans toucher une étiquette déjà posée
	spec.points.forEach((point, k) => {
		const p = points[k];
		dots.push(p);
		const dx = p.x - middleOfDrawing.x;
		const dy = p.y - middleOfDrawing.y;
		// Au milieu du dessin (centre du cube) : à gauche, un peu plus bas, comme un centre
		const base = Math.hypot(dx, dy) < 1e-6 ? Math.atan2(0.35, -1) : Math.atan2(dy, dx);
		const turns = [0, 1, -1, 2, -2, 3, -3, 4].map((t) => base + (t * Math.PI) / 4);
		// Avec des droites, un point où passe une droite n'a souvent plus de place libre
		// tout près : un second tour, plus loin (sans droites, les places d'avant)
		const gaps = spec.droites === undefined && spec.plans === undefined ? [1] : [1, POINT_NAME_FAR];
		const candidates = gaps.flatMap((gap) =>
			turns.map((t) => ({
				at: {
					x: p.x + Math.cos(t) * LABEL_GAP * gap,
					y: p.y + Math.sin(t) * LABEL_GAP * gap
				},
				text: point.name
			}))
		);
		const others = named.filter((_, i) => i !== vertices.length + k);
		labels.push(nameAt(p, candidates, () => firstFree(candidates, labels, segments, others)));
	});

	// Vecteurs donnés : un nom près du milieu de la flèche, du côté extérieur d'abord
	for (const vector of spec.vectors) {
		const from = named[vector.from];
		const to = named[vector.to];
		if (vector.name === null) continue;
		const length = Math.hypot(to.x - from.x, to.y - from.y);
		// Vu par le bout (figure tournée) : pas de direction, le nom se pose au-dessus
		let normal =
			length < 1e-9
				? { x: 0, y: -1 }
				: { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
		const mid = middle(from, to);
		if (normal.x * (mid.x - middleOfDrawing.x) + normal.y * (mid.y - middleOfDrawing.y) < 0) {
			normal = { x: -normal.x, y: -normal.y };
		}
		const candidates = [1.3, 1.9].flatMap((gap) =>
			[0.5, 0.4, 0.6, 0.3, 0.7].flatMap((t) =>
				[1, -1].map((side) => ({
					at: {
						x: from.x + (to.x - from.x) * t + side * normal.x * LABEL_GAP * gap,
						y: from.y + (to.y - from.y) * t + side * normal.y * LABEL_GAP * gap
					},
					text: vector.name?.[0] ?? '',
					...(vector.name !== null && vector.name.length > 1 && { sub: vector.name.slice(1) })
				}))
			)
		);
		const label = nameAt(mid, candidates, () =>
			firstFree(candidates, labels, segments, named, NAME_ARROW_TOP)
		);
		labels.push(label);
		// La petite flèche au-dessus de la lettre, de gauche à droite (sens de la lecture)
		const half = Math.max(labelChars(label) * CHAR_WIDTH, CHAR_WIDTH * 1.2) / 2;
		const y = label.at.y - NAME_ARROW_RISE;
		arrows.push(
			arrowOf({ x: label.at.x - half, y }, { x: label.at.x + half, y }, SMALL_ARROW, true)
		);
	}

	// Droites nommées : « (d) » près d'un bout, à côté du trait, du côté libre
	const droiteNames: SolideLabel[] = [];
	spec.droites?.forEach((droite, k) => {
		if (droite.name === null) return;
		const [start, end] = droiteSegments[k];
		const length = Math.hypot(end.x - start.x, end.y - start.y);
		// Vue par le bout (figure tournée) : pas de direction, le nom se pose au-dessus
		const u =
			length < 1e-9
				? { x: 1, y: 0 }
				: { x: (end.x - start.x) / length, y: (end.y - start.y) / length };
		const text = `(${droite.name})`;
		// L'écart au trait dépend de sa pente : la boîte du nom, large et basse, ne doit
		// pas toucher sa propre droite (en biais, son coin est plus près que son milieu)
		const [lo, hi] = labelBox({ at: { x: 0, y: 0 }, text });
		const gap =
			(Math.abs(u.y) * (hi.x - lo.x)) / 2 + (Math.abs(u.x) * (hi.y - lo.y)) / 2 + DROITE_NAME_CLEAR;
		const candidates = DROITE_NAME_BACK.map((back) => Math.min(back, length / 2)).flatMap((back) =>
			[
				{ from: end, toward: -1 },
				{ from: start, toward: 1 }
			].flatMap(({ from, toward }) =>
				[-1, 1].map((side) => ({
					at: {
						x: from.x + toward * u.x * back - side * u.y * gap,
						y: from.y + toward * u.y * back + side * u.x * gap
					},
					text
				}))
			)
		);
		const label = nameAt(end, candidates, () => firstFree(candidates, labels, segments, named));
		droiteNames.push(label);
		labels.push(label);
	});

	// Cadrage : tout dans la boîte, étiquettes comprises ; figure tournée : un carré
	// fixe autour du centre du solide, où elle tient sous tous les angles
	const drawn = [
		...lines.flatMap((l) => l.points),
		...vertices,
		...points,
		...labels.flatMap(labelBox),
		...arrows.flatMap((a) => [...a.shaft, ...a.head]),
		...droiteSegments.flat()
	];
	let all = bounds(drawn);
	if (turned !== null && rest !== null) {
		// Au repos (cavalière, ovales à plat), le dessin peut dépasser ce cercle
		const restDrawn = [
			...rest.vertices,
			...rest.points,
			...rest.lines.flatMap((l) => l.points),
			...(rest.droites ?? []).flatMap((pieces) => pieces.flatMap((l) => l.points))
		];
		const restReach = Math.max(
			...restDrawn.map((p) => Math.max(Math.abs(p.x - rest.pivot.x), Math.abs(p.y - rest.pivot.y)))
		);
		const half = Math.max(turned.reach, restReach) * scale + TURN_PAD;
		// Nom de droite tenu pendant la rotation : sa place, prise le long d'un trait qui
		// a tourné depuis, peut pointer hors du cadre — il y est ramené
		// (de même le nom d'un plan écrit à côté de son bord)
		for (const label of [...droiteNames, ...planNames]) {
			const [lo, hi] = labelBox(label);
			const within = (v: number, size: number) =>
				Math.min(Math.max(v, -half + size / 2), half - size / 2);
			label.at = { x: within(label.at.x, hi.x - lo.x), y: within(label.at.y, hi.y - lo.y) };
		}
		// La place des cotes de la vue de départ (placées sans nom tenu), réservée à
		// chaque angle : le cadre ne change pas quand elles s'effacent
		const reserved = atRest?.coteMarks ?? coteMarks;
		all = bounds([{ x: -half, y: -half }, { x: half, y: half }, ...reserved]);
	}
	const shift = (p: EspacePoint): EspacePoint => ({ x: p.x - all.minX, y: p.y - all.minY });
	const order = (l: SolideLine) => (l.thick ? 2 : l.dashed ? 0 : 1);
	const scene: SolideScene = {
		width: all.maxX - all.minX,
		height: all.maxY - all.minY,
		drawingWidth: (geometry.maxX - geometry.minX) * scale,
		drawingHeight: (geometry.maxY - geometry.minY) * scale,
		fills: fills.map((f) => f.map(shift)),
		section: section?.map(shift) ?? null,
		lines: lines
			.map((l) => ({ ...l, points: l.points.map(shift) }))
			.sort((a, b) => order(a) - order(b)),
		dots: dots.map(shift),
		labels: labels.map((l) => ({ ...l, at: shift(l.at) })),
		vertices: vertices.map(shift),
		points: points.map(shift),
		arrows: arrows.map((a) => ({
			shaft: [shift(a.shaft[0]), shift(a.shaft[1])],
			head: a.head.map(shift),
			small: a.small
		})),
		...(droites !== undefined && {
			droites: droites.map((pieces) => pieces.map((l) => ({ ...l, points: l.points.map(shift) })))
		}),
		...(givenSegments !== undefined && {
			segments: givenSegments.map((l) => ({ ...l, points: l.points.map(shift) }))
		}),
		...(plans !== undefined && {
			plans: plans.map((plan) => ({
				fill: plan.fill.map(shift),
				border: plan.border.map((l) => ({ ...l, points: l.points.map(shift) }))
			}))
		}),
		// Une place par nom que l'on peut tenir, dans l'ordre où ils sont posés
		...(turned !== null && {
			labelOffsets: anchored.map((l, i) => ({
				x: l.at.x - anchors[i].x,
				y: l.at.y - anchors[i].y
			}))
		})
	};
	return { scene, coteMarks, coteLabels, coteLines, planSpots };
}

/**
 * Nom accessible : JAMAIS le nom du solide (ce serait la réponse de « nommer le
 * solide ») ; les marques et les cotes, qui sont dans l'énoncé, y sont lues.
 */
export function solideLabel(spec: SolideSpec): string {
	const parts = ['Solide en perspective cavalière'];
	const turnable = spec.rotate ? ['figure que l’on peut tourner'] : [];
	for (const mark of spec.marks) {
		parts.push(`${mark.label} ${mark.kind === 'sommet' ? 'marqué' : 'marquée'}`);
	}
	if (spec.cotes) {
		const unit = spec.cotes.unit ? ` ${spec.cotes.unit}` : '';
		const values = spec.dims.map((d) => `${frenchNumber(d)}${unit}`);
		parts.push(`${values.length > 1 ? 'longueurs' : 'longueur'} ${values.join(', ')}`);
	}
	// Points et vecteurs donnés : ils sont dans l'énoncé
	const known = [...(spec.names ?? []), ...spec.points.map((p) => p.name)];
	for (const point of spec.points) parts.push(`point ${point.name} ${point.label}`);
	for (const vector of spec.vectors) {
		const ends = `${known[vector.from]}${known[vector.to]}`;
		parts.push(vector.name === null ? `vecteur ${ends}` : `vecteur ${vector.name} égal à ${ends}`);
	}
	if (spec.repere !== undefined) parts.push(`repère d’origine ${known[spec.repere.origin]}`);
	// Droites données : leurs points seulement, jamais une position relative (la réponse)
	for (const droite of spec.droites ?? []) {
		const through = `(${known[droite.from]}${known[droite.to]})`;
		parts.push(
			droite.name === null ? `droite ${through}` : `droite ${droite.name} égale à ${through}`
		);
	}
	// Segments et angles droits donnés : ils sont dans l'énoncé (jamais leur longueur)
	for (const given of spec.segments ?? []) {
		parts.push(`segment [${known[given.from]}${known[given.to]}]`);
	}
	for (const angle of spec.rightAngles ?? []) {
		parts.push(`angle droit en ${known[angle.at]}`);
	}
	// Plans donnés : leurs points seulement, jamais une position relative (la réponse)
	for (const plan of spec.plans ?? []) {
		const through = `(${plan.through.map((i) => known[i]).join('')})`;
		parts.push(plan.name === null ? `plan ${through}` : `plan ${plan.name} égal à ${through}`);
	}
	// Jamais la nature de la section (rectangle, disque) : la réponse de 3e-020
	const cut = spec.section;
	if (cut) {
		parts.push('coupé par un plan');
		if (cut.kind === 'face' && cut.names) parts.push(`section ${cut.names.join('')}`);
		if (spec.cotes && cut.distance > 0) {
			const unit = spec.cotes.unit ? ` ${spec.cotes.unit}` : '';
			parts.push(`plan à ${frenchNumber(cut.distance)}${unit}`);
		}
	}
	return [...parts, ...turnable].join(', ');
}
