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
 * 45° vers le haut à droite, réduites de moitié. Polyèdres : une arête est
 * cachée (tirets) quand toutes ses faces tournent le dos à l'œil. Cylindre,
 * cône, boule : ellipses « à plat » (horizontales, comme le CP et les
 * manuels), moitié arrière en tirets ; les génératrices du cône sont
 * tangentes à l'ellipse.
 *
 * Section (`section:`, lot 6) : le polygone de coupe, teinté, contour en
 * trait plein épais ; le plan n'est pas dessiné ; boule coupée : sans équateur.
 *
 * Échelle : les dimensions sont des proportions ; le dessin est ramené à
 * `SOLIDE_SIZE` cm sur son plus grand côté. Repère : y vers le BAS (SVG), une
 * unité = 1 cm, étiquettes comprises dans la boîte.
 *
 * @module ubumark/utils/espace-solides
 */

import type { SolideForm, SolideSpec } from '../types/espace';
import type { EspacePoint } from './espace-scene';

// ============================================================================
// TYPES
// ============================================================================

/** Un trait : une arête (2 points) ou un arc (ligne brisée) */
export interface SolideLine {
	points: EspacePoint[];
	dashed: boolean;
	/** Arête marquée (`marquer: arete AE`) */
	thick: boolean;
}

/** Une étiquette, centrée sur `at` */
export interface SolideLabel {
	at: EspacePoint;
	text: string;
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

/** Tirets d'une arête cachée, en cm (trait, blanc) */
export const SOLIDE_DASH = [0.12, 0.08] as const;

/** Rayon du point d'un sommet marqué ou d'un centre nommé, en cm */
export const SOLIDE_DOT_RADIUS = 0.06;

/** Taille du texte des étiquettes, en cm */
export const SOLIDE_LABEL_SIZE = 0.36;

/** Déport des fuyantes pour une profondeur de 1 : 0,5 × arête, à 45° */
const DEPTH_SHIFT = 0.5 * Math.SQRT1_2;

/** Vers l'œil : les points (x, y, z) et (x − K, y − K, z + 1) se confondent au dessin */
const TOWARD_EYE = { x: DEPTH_SHIFT, y: DEPTH_SHIFT, z: -1 };

/** Aplatissement des ellipses « à plat » (petit axe / grand axe), celui du CP */
const ELLIPSE_RATIO = 0.3;

/**
 * Cône le plus plat permis (hauteur / rayon) : en dessous de ELLIPSE_RATIO, le
 * sommet tombe dans l'ellipse et le cône ne se reconnaît plus ; marge jusqu'à 0,5
 */
export const SOLIDE_FLAT_CONE = 0.5;

/** Segments d'une ellipse ou d'un cercle complet */
const ARC_STEPS = 72;

/** Distance d'une étiquette de sommet à son point, en cm */
const LABEL_GAP = 0.28;

/** Distance d'une cote à son trait, en cm */
const COTE_GAP = 0.14;

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

export interface Point3 {
	x: number;
	y: number;
	z: number;
}

/** Projection cavalière, y vers le HAUT (repère de calcul) */
const project = (p: Point3): EspacePoint => ({
	x: p.x + p.z * DEPTH_SHIFT,
	y: p.y + p.z * DEPTH_SHIFT
});

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
			const [a, h] = dims;
			const depth = (a * Math.sqrt(3)) / 2;
			return [p(a / 2, h, depth / 3), p(0, 0, 0), p(a, 0, 0), p(a / 2, 0, depth)];
		}
		default:
			return [];
	}
}

const sub = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Point3, b: Point3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Point3, b: Point3): Point3 => ({
	x: a.y * b.z - a.z * b.y,
	y: a.z * b.x - a.x * b.z,
	z: a.x * b.y - a.y * b.x
});
const centroid = (points: Point3[]): Point3 => ({
	x: points.reduce((s, p) => s + p.x, 0) / points.length,
	y: points.reduce((s, p) => s + p.y, 0) / points.length,
	z: points.reduce((s, p) => s + p.z, 0) / points.length
});

/** La face tourne-t-elle vers l'œil ? (normale sortante, de face ou par la tranche) */
function facesEye(face: number[], vertices: Point3[], center: Point3): boolean {
	const [a, b, c] = face.map((i) => vertices[i]);
	let normal = cross(sub(b, a), sub(c, a));
	if (dot(normal, sub(centroid(face.map((i) => vertices[i])), center)) < 0) {
		normal = { x: -normal.x, y: -normal.y, z: -normal.z };
	}
	return dot(normal, TOWARD_EYE) > -1e-9;
}

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

/** Une cote à poser, en repère de calcul ; `side` : côté où écrire le texte */
interface Cote {
	at: EspacePoint;
	value: number;
	side: 'dessous' | 'droite' | 'gauche' | 'dessus' | 'bas-droite' | 'haut-gauche';
}

/** Ce que la géométrie d'une forme donne, avant mise à l'échelle (repère de calcul) */
interface Draft {
	lines: SolideLine[];
	fills: EspacePoint[][];
	vertices: EspacePoint[];
	/** Sommets qui sont des centres (étiquette à gauche, point si nommé) */
	centers: number[];
	/** Arêtes (polyèdres) : un nom se pose dans le plus grand angle libre entre elles */
	edges: [number, number][];
	cotes: Cote[];
	/** Polygone de la section ; null : aucune */
	section: EspacePoint[] | null;
	/** Noms des sommets de la section : point et direction (vers l'extérieur) */
	sectionLabels: { at: EspacePoint; away: EspacePoint; text: string }[];
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

function polyhedronDraft(spec: SolideSpec): Draft {
	const topology = solideTopology(spec.form);
	const points3 = polyhedronVertices(spec.form, spec.dims);
	const center = centroid(points3);
	const vertices = points3.map(project);
	const seen = topology.faces.map((face) => facesEye(face, points3, center));
	const lines = topology.edges.map(([a, b]) => {
		const hidden = topology.faces.every(
			(face, i) => !(face.includes(a) && face.includes(b)) || !seen[i]
		);
		const line = segment(vertices[a], vertices[b], spec.hidden && hidden);
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
		 * Hauteur en tirets ; sa cote à la fraction `along` du pied vers le sommet :
		 * au milieu pour une pyramide, au tiers pour un prisme (sous l'arête cachée du fond)
		 */
		const height = (apex: EspacePoint, foot: EspacePoint, value: number, along = 0.5) => {
			lines.push(segment(apex, foot, true));
			const at = { x: foot.x + (apex.x - foot.x) * along, y: foot.y + (apex.y - foot.y) * along };
			cotes.push({ at, value, side: 'droite' });
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
				height(v[2], middle(v[0], v[1]), d1, 1 / 3);
				cotes.push({ at: middle(v[1], v[4]), value: d2, side: 'bas-droite' });
				break;
			case 'prisme-triangle-rectangle':
				cotes.push({ at: middle(v[0], v[1]), value: d0, side: 'dessous' });
				cotes.push({ at: middle(v[0], v[2]), value: d1, side: 'gauche' });
				cotes.push({ at: middle(v[1], v[4]), value: d2, side: 'bas-droite' });
				break;
			case 'pyramide-carree':
			case 'pyramide-triangle': {
				cotes.push({ at: middle(v[1], v[2]), value: d0, side: 'dessous' });
				const base = points3.slice(1);
				height(v[0], project({ ...centroid(base), y: 0 }), d1);
				break;
			}
			case 'pyramide-rectangle':
				cotes.push({ at: middle(v[1], v[2]), value: d0, side: 'dessous' });
				cotes.push({ at: middle(v[2], v[3]), value: d1, side: 'bas-droite' });
				height(v[0], project({ ...centroid(points3.slice(1)), y: 0 }), d2);
				break;
		}
	}
	const { section, sectionLabels } = boxSection(spec, topology, points3, lines, cotes);
	return {
		lines,
		fills,
		vertices,
		centers: [],
		edges: topology.edges,
		cotes,
		section,
		sectionLabels
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
	cotes: Cote[]
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
				cotes
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
				cotes
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
				cotes
			};
		}
	}
}

/** Boîte d'une étiquette centrée en `at` */
const labelBox = (label: SolideLabel) => {
	const halfWidth = (label.text.length * CHAR_WIDTH) / 2 + 0.03;
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

/** Le dessin d'un solide */
export function buildSolideScene(spec: SolideSpec): SolideScene {
	const draft = solideTopology(spec.form).curved ? roundDraft(spec) : polyhedronDraft(spec);

	// Mise à l'échelle (plus grand côté : SOLIDE_SIZE) et passage en y vers le bas
	const geometry = bounds([...draft.lines.flatMap((l) => l.points), ...draft.vertices]);
	const scale =
		SOLIDE_SIZE / Math.max(geometry.maxX - geometry.minX, geometry.maxY - geometry.minY);
	const toScreen = (p: EspacePoint): EspacePoint => ({
		x: (p.x - geometry.minX) * scale,
		y: (geometry.maxY - p.y) * scale
	});
	const lines = draft.lines.map((l) => ({ ...l, points: l.points.map(toScreen) }));
	const fills = draft.fills.map((f) => f.map(toScreen));
	const section = draft.section?.map(toScreen) ?? null;
	const vertices = draft.vertices.map(toScreen);

	// Noms des sommets : à l'extérieur, en s'éloignant du centre du dessin
	const labels: SolideLabel[] = [];
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
		const free = freeDirection(i, vertices, draft.edges);
		if (free) {
			dx = free.x;
			dy = free.y;
		}
		if (draft.centers.includes(i) || Math.hypot(dx, dy) < 1e-6) {
			// Un centre : son nom à gauche, un peu plus bas
			dx = -1;
			dy = 0.35;
		}
		const length = Math.hypot(dx, dy);
		labels.push({
			at: { x: p.x + (dx / length) * LABEL_GAP, y: p.y + (dy / length) * LABEL_GAP },
			text: name
		});
		if (draft.centers.includes(i)) dots.push(p);
	});
	for (const mark of spec.marks) {
		if (mark.kind !== 'sommet') continue;
		const p = vertices[mark.vertex];
		if (!dots.includes(p)) dots.push(p);
	}

	// Cotes : le texte à côté du trait, du côté demandé
	const unit = spec.cotes?.unit ? ` ${spec.cotes.unit}` : '';
	for (const cote of draft.cotes) {
		const text = `${frenchNumber(cote.value)}${unit}`;
		const halfWidth = (text.length * CHAR_WIDTH) / 2;
		const halfHeight = SOLIDE_LABEL_SIZE / 2;
		const p = toScreen(cote.at);
		const shift = {
			dessous: { x: 0, y: COTE_GAP + halfHeight },
			dessus: { x: 0, y: -(COTE_GAP + halfHeight) },
			droite: { x: COTE_GAP + halfWidth, y: 0 },
			gauche: { x: -(COTE_GAP + halfWidth), y: 0 },
			// Plus bas que le milieu de la fuyante : loin du nom du sommet du fond
			'bas-droite': { x: COTE_GAP + halfWidth, y: COTE_GAP + halfHeight / 2 },
			// Au-dessus d'une fuyante du haut à gauche : hors du dessin
			'haut-gauche': { x: -(COTE_GAP + halfWidth / 2), y: -(COTE_GAP + halfHeight) }
		}[cote.side];
		labels.push({ at: { x: p.x + shift.x, y: p.y + shift.y }, text });
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
		const free = candidates.find((c) => !labels.some((l) => overlaps(c, l)));
		labels.push(free ?? candidates[0]);
	}

	// Cadrage : tout dans la boîte, étiquettes comprises
	const all = bounds([...lines.flatMap((l) => l.points), ...vertices, ...labels.flatMap(labelBox)]);
	const shift = (p: EspacePoint): EspacePoint => ({ x: p.x - all.minX, y: p.y - all.minY });
	const order = (l: SolideLine) => (l.thick ? 2 : l.dashed ? 0 : 1);
	return {
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
		vertices: vertices.map(shift)
	};
}

/**
 * Nom accessible : JAMAIS le nom du solide (ce serait la réponse de « nommer le
 * solide ») ; les marques et les cotes, qui sont dans l'énoncé, y sont lues.
 */
export function solideLabel(spec: SolideSpec): string {
	const parts = ['Solide en perspective cavalière'];
	for (const mark of spec.marks) {
		parts.push(`${mark.label} ${mark.kind === 'sommet' ? 'marqué' : 'marquée'}`);
	}
	if (spec.cotes) {
		const unit = spec.cotes.unit ? ` ${spec.cotes.unit}` : '';
		const values = spec.dims.map((d) => `${frenchNumber(d)}${unit}`);
		parts.push(`${values.length > 1 ? 'longueurs' : 'longueur'} ${values.join(', ')}`);
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
	return parts.join(', ');
}
