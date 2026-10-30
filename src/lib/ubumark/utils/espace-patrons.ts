/**
 * Bloc ```patron — pliage, dépliage, scène
 * ========================================
 *
 * Calcul pur, partagé par le parseur (un patron qui ne se plie pas, des faces
 * qui se chevauchent), l'écran (`Patron.svelte`) et le PDF (`espace-typst.ts`).
 * Chantier `solides`, lot 4 (§ 9 du journal), ADR 0034.
 *
 * Un patron est le DÉPLIAGE du polyèdre de ```solide (mêmes sommets 3D, mêmes
 * faces, `solideTopology`) le long d'un arbre de faces : chaque face posée à plat
 * de l'autre côté de l'arête commune avec sa mère. Chaque coin du patron sait
 * donc sur quel sommet du solide il vient : un même nom revient plusieurs fois.
 *
 * - Cube, pavé : l'arbre vient d'une GRILLE de cases (catalogue ou grille du
 *   prof) : on fait rouler le solide sur les cases, à partir de la face du
 *   dessous (ABCD, A en bas à gauche, le patron se pliant vers le lecteur). La
 *   grille se plie en solide si elle a 6 cases qui deviennent 6 faces
 *   différentes. Pour le pavé, chaque case devient le rectangle de sa face.
 * - Prisme, pyramide : arbres fixes (dispositions 1 et 2 du prisme, étoile de
 *   la pyramide).
 * - Cylindre : rectangle 2πr × h, un disque collé au milieu de chaque côté de
 *   longueur 2πr.
 *
 * Les faces se numérotent dans l'ordre de lecture du patron tel qu'écrit, avant
 * `tourner:` et `retourner:` (qui déplacent le dessin en bloc : noms et numéros
 * suivent) : celui de la grille pour le cube et le pavé, celui des centres des
 * faces pour les autres.
 *
 * Échelle : proportions, plus grand côté du dessin = `PATRON_SIZE` cm.
 * Repère de calcul : y vers le HAUT ; scène : y vers le BAS (SVG).
 *
 * @module ubumark/utils/espace-patrons
 */

import type { PatronSolid, PatronSpec, PatronTurn } from '../types/espace';
import type { EspacePoint } from './espace-scene';
import {
	SOLIDE_LABEL_SIZE,
	frenchNumber,
	polyhedronVertices,
	solideTopology,
	type Point3,
	type SolideLabel
} from './espace-solides';

// ============================================================================
// TYPES
// ============================================================================

export interface PatronFace {
	/** Le tour de la face, repère de calcul (y vers le haut) */
	points: EspacePoint[];
	/** Sommet du solide en chaque point du tour ; [] pour une face du cylindre */
	corners: number[];
	/** Indice de la face dans `solideTopology(…).faces` ; null : cylindre */
	solidFace: number | null;
	/** Disque du cylindre : son centre et le sommet (O, O') qu'il porte */
	center?: { at: EspacePoint; vertex: number };
}

export interface PatronNet {
	/** Dans l'ordre de lecture du patron tel qu'écrit (avant `tourner:`) */
	faces: PatronFace[];
	/** Pourquoi la grille ne se plie pas en solide ; null : elle se plie */
	notFolding: string | null;
	/** Deux faces qui se chevauchent sur le dessin (ordre de lecture, de 0) ; null : aucune */
	overlap: [number, number] | null;
}

/** `contour` : le bord du patron ; `pli` : arête commune à deux faces ; `cache` : hauteur, rayon */
export type PatronLineKind = 'contour' | 'pli' | 'cache';

export interface PatronLine {
	points: EspacePoint[];
	kind: PatronLineKind;
}

export interface PatronScene {
	/** Boîte du dessin, étiquettes comprises (cm) */
	width: number;
	height: number;
	/** Plus grand côté du patron seul : `PATRON_SIZE` */
	drawingWidth: number;
	drawingHeight: number;
	/** Faces marquées (teintées), dessinées d'abord */
	fills: EspacePoint[][];
	/** Plis, puis contour, puis tirets */
	lines: PatronLine[];
	dots: EspacePoint[];
	/** Noms des sommets, numéros des faces, cotes */
	labels: SolideLabel[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Plus grand côté du dessin, en cm */
export const PATRON_SIZE = 6;

/** Épaisseur d'un pli, en cm (contour : `ESPACE_STROKE`) */
export const PATRON_FOLD_STROKE = 0.015;

/**
 * Les 11 patrons du cube (`forme: 1` à `11`), `X` = une face. 1-6 : « 1-4-1 »
 * (la croix d'abord) ; 7-9 : « 2-3-1 » ; 10 : « 2-2-2 » ; 11 : « 3-3 ».
 */
export const CUBE_NETS: readonly (readonly string[])[] = [
	['.X..', 'XXXX', '.X..'],
	['X...', 'XXXX', 'X...'],
	['X...', 'XXXX', '.X..'],
	['X...', 'XXXX', '..X.'],
	['X...', 'XXXX', '...X'],
	['.X..', 'XXXX', '..X.'],
	['XX..', '.XXX', '.X..'],
	['XX..', '.XXX', '..X.'],
	['XX..', '.XXX', '...X'],
	['XX..', '.XX.', '..XX'],
	['XXX..', '..XXX']
];

/**
 * Faux patrons classiques du cube (`forme: faux 1` à `8`), 6 cases chacun : 5 en
 * ligne, un bloc 2 × 3, deux rabats du même côté (côte à côte, aux deux bouts,
 * espacés), un L, 3 + 3 décalés d'une case, un U.
 */
export const FALSE_CUBE_NETS: readonly (readonly string[])[] = [
	['XXXXX', 'X....'],
	['XXX', 'XXX'],
	['XX..', 'XXXX'],
	['X..X', 'XXXX'],
	['X.X.', 'XXXX'],
	['X...', 'X...', 'XXXX'],
	['XXX.', '.XXX'],
	['X.X', 'XXX', '.X.']
];

/** Nombre de dispositions de chaque solide (cube, pavé : celles du catalogue) */
export const PATRON_LAYOUTS: Record<PatronSolid, number> = {
	cube: CUBE_NETS.length,
	pave: CUBE_NETS.length,
	'prisme-triangle': 2,
	'prisme-triangle-rectangle': 2,
	'pyramide-carree': 1,
	'pyramide-rectangle': 1,
	'pyramide-triangle': 1,
	cylindre: 1
};

/** Prisme (faces de `PRISM_TOPOLOGY`) : la face du dessous ABED au centre, [enfant, mère] */
const PRISM_TREES: [number, number][][] = [
	// 1 : les deux triangles sur le rectangle du dessous
	[
		[3, 2],
		[4, 2],
		[0, 2],
		[1, 2]
	],
	// 2 : ABC sur le dessous, DEF sur le rectangle de droite
	[
		[3, 2],
		[4, 2],
		[0, 2],
		[1, 3]
	]
];

const EPS = 1e-6;

/** Segments d'un disque du cylindre */
const DISK_STEPS = 72;

/** Distance d'une étiquette de sommet à son point, en cm */
const LABEL_GAP = 0.28;

/** Distance d'une cote à son trait, en cm */
const COTE_GAP = 0.14;

/** Largeur estimée d'un caractère d'étiquette, en cm (boîte du dessin) */
const CHAR_WIDTH = 0.21;

// ============================================================================
// GRILLE
// ============================================================================

/** Une grille du catalogue en cases */
export const gridOf = (rows: readonly string[]): boolean[][] =>
	rows.map((row) => [...row].map((ch) => ch === 'X'));

/** Retire les rangées et colonnes vides au bord, complète les rangées courtes */
export function trimGrid(cells: boolean[][]): boolean[][] {
	const width = Math.max(0, ...cells.map((row) => row.length));
	const full = cells.map((row) => Array.from({ length: width }, (_, c) => row[c] ?? false));
	const rows = full.flatMap((row, r) => (row.some(Boolean) ? [r] : []));
	if (rows.length === 0) return [];
	const kept = full.slice(rows[0], rows[rows.length - 1] + 1);
	const cols = kept[0].flatMap((_, c) => (kept.some((row) => row[c]) ? [c] : []));
	return kept.map((row) => row.slice(cols[0], cols[cols.length - 1] + 1));
}

/** La grille retournée (symétrie gauche-droite), puis tournée dans le sens des aiguilles */
export function transformGrid(cells: boolean[][], turn: PatronTurn, mirror: boolean): boolean[][] {
	let grid = mirror ? cells.map((row) => [...row].reverse()) : cells.map((row) => [...row]);
	for (let k = 0; k < turn / 90; k++) {
		const rows = grid.length;
		const cols = grid[0]?.length ?? 0;
		grid = Array.from({ length: cols }, (_, r) =>
			Array.from({ length: rows }, (_, c) => grid[rows - 1 - c][r])
		);
	}
	return grid;
}

/** Les cases, dans l'ordre de lecture */
const squaresOf = (grid: boolean[][]): [number, number][] =>
	grid.flatMap((row, r) => row.flatMap((on, c): [number, number][] => (on ? [[r, c]] : [])));

/** Les cases se touchent-elles toutes, de proche en proche, par un côté ? */
export function gridIsConnected(cells: boolean[][]): boolean {
	const squares = squaresOf(cells);
	if (squares.length === 0) return false;
	const key = ([r, c]: [number, number]) => `${r},${c}`;
	const all = new Set(squares.map(key));
	const seen = new Set([key(squares[0])]);
	const queue = [squares[0]];
	while (queue.length > 0) {
		const [r, c] = queue.shift()!;
		for (const next of [
			[r + 1, c],
			[r - 1, c],
			[r, c + 1],
			[r, c - 1]
		] as [number, number][]) {
			if (all.has(key(next)) && !seen.has(key(next))) {
				seen.add(key(next));
				queue.push(next);
			}
		}
	}
	return seen.size === all.size;
}

// ============================================================================
// GÉOMÉTRIE
// ============================================================================

const sub3 = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot3 = (a: Point3, b: Point3) => a.x * b.x + a.y * b.y + a.z * b.z;
const scale3 = (a: Point3, k: number): Point3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const length3 = (a: Point3) => Math.sqrt(dot3(a, a));
const cross3 = (a: Point3, b: Point3): Point3 => ({
	x: a.y * b.z - a.z * b.y,
	y: a.z * b.x - a.x * b.z,
	z: a.x * b.y - a.y * b.x
});
const centroid3 = (points: Point3[]): Point3 =>
	scale3(
		points.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y, z: s.z + p.z }), { x: 0, y: 0, z: 0 }),
		1 / points.length
	);

const centroid2 = (points: EspacePoint[]): EspacePoint => ({
	x: points.reduce((s, p) => s + p.x, 0) / points.length,
	y: points.reduce((s, p) => s + p.y, 0) / points.length
});
const middle = (a: EspacePoint, b: EspacePoint): EspacePoint => ({
	x: (a.x + b.x) / 2,
	y: (a.y + b.y) / 2
});
const unit2 = (a: EspacePoint): EspacePoint => {
	const n = Math.hypot(a.x, a.y);
	return { x: a.x / n, y: a.y / n };
};
const samePoint = (a: EspacePoint, b: EspacePoint, eps = EPS) =>
	Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;

/**
 * La face racine à plat, vue de l'INTÉRIEUR du solide (le patron se plie vers le
 * lecteur) : son premier sommet à l'origine, le deuxième sur l'axe des x.
 * Le repère 3D (x à droite, y en haut, z vers le fond) est indirect : d'où
 * `normale × u`, qui met D (au fond) au-dessus de A pour la face ABCD.
 */
function rootPlacement(face: number[], vertices: Point3[], center: Point3): EspacePoint[] {
	const points = face.map((i) => vertices[i]);
	const origin = points[0];
	const along = sub3(points[1], origin);
	const u = scale3(along, 1 / length3(along));
	let normal = cross3(along, sub3(points[2], origin));
	if (dot3(normal, sub3(centroid3(points), center)) < 0) normal = scale3(normal, -1);
	normal = scale3(normal, 1 / length3(normal));
	const v = cross3(normal, u);
	return points.map((p) => ({ x: dot3(sub3(p, origin), u), y: dot3(sub3(p, origin), v) }));
}

/**
 * Une face posée à plat le long de l'arête (a, b) de sa mère, déjà à plat en
 * (pa, pb), de l'autre côté que la mère : chaque sommet garde sa distance à
 * l'arête et sa position le long d'elle.
 */
function unfold(
	face: number[],
	vertices: Point3[],
	hinge: [number, number],
	at: [EspacePoint, EspacePoint],
	parentCenter: EspacePoint
): EspacePoint[] {
	const [a, b] = hinge.map((i) => vertices[i]);
	const [pa, pb] = at;
	const axis = sub3(b, a);
	const e = scale3(axis, 1 / length3(axis));
	const e2 = unit2({ x: pb.x - pa.x, y: pb.y - pa.y });
	let n2 = { x: -e2.y, y: e2.x };
	const m = middle(pa, pb);
	if (n2.x * (parentCenter.x - m.x) + n2.y * (parentCenter.y - m.y) > 0) {
		n2 = { x: -n2.x, y: -n2.y };
	}
	return face.map((i) => {
		const w = sub3(vertices[i], a);
		const t = dot3(w, e);
		const d = length3(sub3(w, scale3(e, t)));
		return { x: pa.x + e2.x * t + n2.x * d, y: pa.y + e2.y * t + n2.y * d };
	});
}

/** La face fille, posée contre l'arête (va, vb) de sa mère */
function childFace(
	parent: PatronFace,
	solidFace: number,
	faces: number[][],
	vertices: Point3[],
	va: number,
	vb: number
): PatronFace {
	const pa = parent.points[parent.corners.indexOf(va)];
	const pb = parent.points[parent.corners.indexOf(vb)];
	return {
		points: unfold(faces[solidFace], vertices, [va, vb], [pa, pb], centroid2(parent.points)),
		corners: [...faces[solidFace]],
		solidFace
	};
}

/** Directions de la grille : à droite, à gauche, en haut, en bas (repère de calcul) */
const GRID_STEPS = [
	{ dr: 0, dc: 1, x: 1, y: 0 },
	{ dr: 0, dc: -1, x: -1, y: 0 },
	{ dr: -1, dc: 0, x: 0, y: 1 },
	{ dr: 1, dc: 0, x: 0, y: -1 }
];

/** Le cube ou le pavé roulé sur la grille, à partir de la case du dessous */
function gridNet(spec: PatronSpec): { faces: PatronFace[]; notFolding: string | null } {
	const topology = solideTopology(spec.solid);
	const vertices = polyhedronVertices(spec.solid, spec.dims);
	const center = centroid3(vertices);
	const grid = spec.cells ?? [];
	const squares = squaresOf(grid);
	const index = new Map(squares.map(([r, c], i) => [`${r},${c}`, i]));
	const faces: (PatronFace | null)[] = squares.map(() => null);
	const root = Math.min(spec.bottom, squares.length - 1);
	faces[root] = {
		points: rootPlacement(topology.faces[0], vertices, center),
		corners: [...topology.faces[0]],
		solidFace: 0
	};
	const queue = [root];
	while (queue.length > 0) {
		const s = queue.shift()!;
		const parent = faces[s]!;
		const [r, c] = squares[s];
		const middleOfParent = centroid2(parent.points);
		for (const step of GRID_STEPS) {
			const k = index.get(`${r + step.dr},${c + step.dc}`);
			if (k === undefined || faces[k] !== null) continue;
			// L'arête de la mère tournée vers la case voisine
			const n = parent.points.length;
			const side = parent.points.findIndex((p, i) => {
				const toEdge = unit2({
					x: middle(p, parent.points[(i + 1) % n]).x - middleOfParent.x,
					y: middle(p, parent.points[(i + 1) % n]).y - middleOfParent.y
				});
				return toEdge.x * step.x + toEdge.y * step.y > 0.99;
			});
			const va = parent.corners[side];
			const vb = parent.corners[(side + 1) % n];
			const solidFace = topology.faces.findIndex(
				(f, fi) => fi !== parent.solidFace && f.includes(va) && f.includes(vb)
			);
			faces[k] = childFace(parent, solidFace, topology.faces, vertices, va, vb);
			queue.push(k);
		}
	}
	const placed = faces as PatronFace[];
	const what = spec.solid === 'cube' ? 'un cube' : 'un pavé';
	let notFolding: string | null = null;
	if (placed.length !== 6) {
		notFolding = `${placed.length} case${placed.length > 1 ? 's' : ''} : ${what} a 6 faces`;
	} else {
		for (let i = 0; i < 6 && notFolding === null; i++) {
			for (let j = i + 1; j < 6; j++) {
				if (placed[i].solidFace === placed[j].solidFace) {
					notFolding = `les cases ${i + 1} et ${j + 1} se recouvrent une fois pliées`;
					break;
				}
			}
		}
	}
	return { faces: placed, notFolding };
}

/** Prisme, pyramide : l'arbre fixe de la disposition */
function treeNet(spec: PatronSpec): PatronFace[] {
	const topology = solideTopology(spec.solid);
	const vertices = polyhedronVertices(spec.solid, spec.dims);
	const center = centroid3(vertices);
	const prism = spec.solid.startsWith('prisme');
	// Prisme : la face du dessous (ABED) ; pyramide : la base, en étoile
	const root = prism ? 2 : 0;
	const tree: [number, number][] = prism
		? PRISM_TREES[spec.layout - 1]
		: topology.faces.slice(1).map((_, i): [number, number] => [i + 1, 0]);
	const placed = new Map<number, PatronFace>();
	placed.set(root, {
		points: rootPlacement(topology.faces[root], vertices, center),
		corners: [...topology.faces[root]],
		solidFace: root
	});
	for (const [child, mother] of tree) {
		const parent = placed.get(mother)!;
		const [va, vb] = topology.faces[child].filter((v) => topology.faces[mother].includes(v));
		placed.set(child, childFace(parent, child, topology.faces, vertices, va, vb));
	}
	return [...placed.values()];
}

/** Un disque en ligne brisée */
const disk = (cx: number, cy: number, r: number): EspacePoint[] =>
	Array.from({ length: DISK_STEPS }, (_, i) => {
		const t = (2 * Math.PI * i) / DISK_STEPS;
		return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
	});

/** Cylindre : le disque O' en haut, le rectangle, le disque O en bas */
function cylinderNet(spec: PatronSpec): PatronFace[] {
	const [r, h] = spec.dims;
	const w = 2 * Math.PI * r;
	return [
		{
			points: disk(w / 2, h + r, r),
			corners: [],
			solidFace: null,
			center: { at: { x: w / 2, y: h + r }, vertex: 1 }
		},
		{
			points: [
				{ x: 0, y: 0 },
				{ x: w, y: 0 },
				{ x: w, y: h },
				{ x: 0, y: h }
			],
			corners: [],
			solidFace: null
		},
		{
			points: disk(w / 2, -r, r),
			corners: [],
			solidFace: null,
			center: { at: { x: w / 2, y: -r }, vertex: 0 }
		}
	];
}

/** Retournement (symétrie gauche-droite) puis quart(s) de tour dans le sens des aiguilles */
function placeRigidly(faces: PatronFace[], turn: PatronTurn, mirror: boolean): PatronFace[] {
	const angle = (turn * Math.PI) / 180;
	const move = (p: EspacePoint): EspacePoint => {
		const x = mirror ? -p.x : p.x;
		// Sens des aiguilles, repère y vers le haut : rotation d'angle −θ
		return {
			x: x * Math.cos(angle) + p.y * Math.sin(angle),
			y: -x * Math.sin(angle) + p.y * Math.cos(angle)
		};
	};
	return faces.map((f) => ({
		...f,
		points: f.points.map(move),
		...(f.center && { center: { ...f.center, at: move(f.center.at) } })
	}));
}

/** Ordre de lecture des centres des faces : de haut en bas, puis de gauche à droite */
function readingOrder(faces: PatronFace[]): PatronFace[] {
	const centerOf = (f: PatronFace) => f.center?.at ?? centroid2(f.points);
	return [...faces].sort((a, b) => {
		const ca = centerOf(a);
		const cb = centerOf(b);
		return Math.abs(ca.y - cb.y) > EPS ? cb.y - ca.y : ca.x - cb.x;
	});
}

/** Deux polygones convexes se chevauchent-ils (plus qu'un bord commun) ? */
function convexOverlap(p: EspacePoint[], q: EspacePoint[], eps: number): boolean {
	for (const polygon of [p, q]) {
		for (let i = 0; i < polygon.length; i++) {
			const a = polygon[i];
			const b = polygon[(i + 1) % polygon.length];
			const axis = { x: a.y - b.y, y: b.x - a.x };
			const project = (pts: EspacePoint[]) => pts.map((pt) => pt.x * axis.x + pt.y * axis.y);
			const pp = project(p);
			const qq = project(q);
			const length = Math.hypot(axis.x, axis.y);
			if (
				Math.min(Math.max(...pp), Math.max(...qq)) - Math.max(Math.min(...pp), Math.min(...qq)) <=
				eps * length
			) {
				return false;
			}
		}
	}
	return true;
}

/** Le patron à plat (repère de calcul), tourné et retourné ; faces dans l'ordre de lecture d'avant */
export function patronNet(spec: PatronSpec): PatronNet {
	let faces: PatronFace[];
	let notFolding: string | null = null;
	if (spec.cells !== null) {
		({ faces, notFolding } = gridNet(spec));
	} else {
		faces = readingOrder(spec.solid === 'cylindre' ? cylinderNet(spec) : treeNet(spec));
	}
	faces = placeRigidly(faces, spec.turn, spec.mirror);
	const all = faces.flatMap((f) => f.points);
	const size = Math.max(
		Math.max(...all.map((p) => p.x)) - Math.min(...all.map((p) => p.x)),
		Math.max(...all.map((p) => p.y)) - Math.min(...all.map((p) => p.y))
	);
	let overlap: [number, number] | null = null;
	for (let i = 0; i < faces.length && overlap === null; i++) {
		for (let j = i + 1; j < faces.length; j++) {
			if (convexOverlap(faces[i].points, faces[j].points, 1e-7 * size)) {
				overlap = [i, j];
				break;
			}
		}
	}
	return { faces, notFolding, overlap };
}

// ============================================================================
// COTES
// ============================================================================

/** Une longueur à écrire, et les arêtes du solide qui la portent */
interface CoteTarget {
	value: number;
	accepts: (va: number, vb: number) => boolean;
}

/** Les longueurs que `cotes:` écrit (chacune une fois) ; cylindre : r et h, à part */
function coteTargets(spec: PatronSpec): CoteTarget[] {
	const vertices = polyhedronVertices(spec.solid, spec.dims);
	const direction = (va: number, vb: number) => sub3(vertices[vb], vertices[va]);
	const along = (axis: 'x' | 'y' | 'z') => (va: number, vb: number) =>
		Math.abs(direction(va, vb)[axis]) > EPS &&
		length3(direction(va, vb)) - Math.abs(direction(va, vb)[axis]) < EPS;
	const pair =
		(...pairs: [number, number][]) =>
		(va: number, vb: number) =>
			pairs.some(([a, b]) => (a === va && b === vb) || (a === vb && b === va));
	const lateral = (va: number, vb: number) => Math.abs(va - vb) === 3;
	const [d0, d1, d2] = spec.dims;
	let targets: CoteTarget[];
	switch (spec.solid) {
		case 'cube':
			targets = [{ value: d0, accepts: () => true }];
			break;
		case 'pave':
			targets = [
				{ value: d0, accepts: along('x') },
				{ value: d1, accepts: along('z') },
				{ value: d2, accepts: along('y') }
			];
			break;
		case 'prisme-triangle':
			targets = [
				{ value: d0, accepts: pair([0, 1], [3, 4]) },
				{ value: d2, accepts: lateral }
			];
			break;
		case 'prisme-triangle-rectangle':
			targets = [
				{ value: d0, accepts: pair([0, 1], [3, 4]) },
				{ value: d1, accepts: pair([0, 2], [3, 5]) },
				{ value: d2, accepts: lateral }
			];
			break;
		case 'pyramide-rectangle':
			targets = [
				{ value: d0, accepts: (va, vb) => va > 0 && vb > 0 && along('x')(va, vb) },
				{ value: d1, accepts: (va, vb) => va > 0 && vb > 0 && along('z')(va, vb) }
			];
			break;
		case 'pyramide-carree':
		case 'pyramide-triangle':
			targets = [{ value: d0, accepts: (va, vb) => va > 0 && vb > 0 }];
			break;
		case 'cylindre':
			return [];
	}
	// Une longueur égale à une autre ne s'écrit qu'une fois
	const merged: CoteTarget[] = [];
	for (const target of targets) {
		const same = merged.find((m) => Math.abs(m.value - target.value) < EPS);
		if (same) {
			const before = same.accepts;
			same.accepts = (va, vb) => before(va, vb) || target.accepts(va, vb);
		} else {
			merged.push({ ...target });
		}
	}
	return merged;
}

/** Les longueurs écrites par `cotes:`, dans l'ordre du dessin (nom accessible) */
export function patronCoteValues(spec: PatronSpec): number[] {
	if (spec.solid === 'cylindre') return [spec.dims[0], spec.dims[1]];
	const values = coteTargets(spec).map((t) => t.value);
	// Prisme isocèle : la hauteur du triangle, tracée en tirets
	return spec.solid === 'prisme-triangle' ? [...values, spec.dims[1]] : values;
}

// ============================================================================
// SCÈNE
// ============================================================================

/** Un côté d'une face du dessin */
interface Side {
	a: EspacePoint;
	b: EspacePoint;
	face: number;
	/** Sommets du solide aux deux bouts (null : cylindre) */
	vertices: [number, number] | null;
}

const bounds = (points: EspacePoint[]) => ({
	minX: Math.min(...points.map((p) => p.x)),
	maxX: Math.max(...points.map((p) => p.x)),
	minY: Math.min(...points.map((p) => p.y)),
	maxY: Math.max(...points.map((p) => p.y))
});

/** Boîte d'une étiquette centrée en `at` */
const labelBox = (label: SolideLabel) => {
	const halfWidth = (label.text.length * CHAR_WIDTH) / 2 + 0.03;
	const halfHeight = SOLIDE_LABEL_SIZE / 2 + 0.03;
	return [
		{ x: label.at.x - halfWidth, y: label.at.y - halfHeight },
		{ x: label.at.x + halfWidth, y: label.at.y + halfHeight }
	];
};

/** Le point est-il strictement dans le polygone ? */
function inside(p: EspacePoint, polygon: EspacePoint[]): boolean {
	let result = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const a = polygon[i];
		const b = polygon[j];
		if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
			result = !result;
		}
	}
	return result;
}

/**
 * Direction où poser le nom d'un coin : le plus grand angle libre entre les
 * côtés qui en partent, hors des faces.
 */
function freeDirection(p: EspacePoint, sides: Side[], faces: EspacePoint[][]): EspacePoint {
	const angles = sides
		.flatMap((s) => (samePoint(s.a, p) ? [s.b] : samePoint(s.b, p) ? [s.a] : []))
		.map((q) => Math.atan2(q.y - p.y, q.x - p.x))
		.sort((a, b) => a - b);
	const gaps = angles.map((angle, k) => {
		const next = k + 1 < angles.length ? angles[k + 1] : angles[0] + 2 * Math.PI;
		return { gap: next - angle, middle: (angle + next) / 2 };
	});
	gaps.sort((a, b) => b.gap - a.gap);
	for (const { middle: m } of gaps) {
		const dir = { x: Math.cos(m), y: Math.sin(m) };
		const probe = { x: p.x + dir.x * 0.05, y: p.y + dir.y * 0.05 };
		if (!faces.some((f) => inside(probe, f))) return dir;
	}
	return gaps.length > 0
		? { x: Math.cos(gaps[0].middle), y: Math.sin(gaps[0].middle) }
		: { x: -1, y: 0 };
}

/** Texte d'une cote posé à côté d'un point, dans la direction `normal` */
function coteLabel(at: EspacePoint, normal: EspacePoint, text: string): SolideLabel {
	const halfWidth = (text.length * CHAR_WIDTH) / 2;
	const halfHeight = SOLIDE_LABEL_SIZE / 2;
	const reach = COTE_GAP + Math.abs(normal.x) * halfWidth + Math.abs(normal.y) * halfHeight;
	return { at: { x: at.x + normal.x * reach, y: at.y + normal.y * reach }, text };
}

/** Normale d'un côté, tournée vers l'extérieur de sa face */
function outward(side: Side, face: EspacePoint[]): EspacePoint {
	const d = unit2({ x: side.b.x - side.a.x, y: side.b.y - side.a.y });
	const n = { x: -d.y, y: d.x };
	const m = middle(side.a, side.b);
	const c = centroid2(face);
	return n.x * (c.x - m.x) + n.y * (c.y - m.y) > 0 ? { x: -n.x, y: -n.y } : n;
}

/** Le dessin d'un patron */
export function buildPatronScene(spec: PatronSpec): PatronScene {
	const net = patronNet(spec);

	// Mise à l'échelle (plus grand côté : PATRON_SIZE) et passage en y vers le bas
	const geometry = bounds(net.faces.flatMap((f) => f.points));
	const scale =
		PATRON_SIZE / Math.max(geometry.maxX - geometry.minX, geometry.maxY - geometry.minY);
	const toScreen = (p: EspacePoint): EspacePoint => ({
		x: (p.x - geometry.minX) * scale,
		y: (geometry.maxY - p.y) * scale
	});
	const faces = net.faces.map((f) => ({
		...f,
		points: f.points.map(toScreen),
		...(f.center && { center: { ...f.center, at: toScreen(f.center.at) } })
	}));
	const polygons = faces.map((f) => f.points);

	// Côtés : commun à deux faces → pli, sinon contour
	const sides: Side[] = [];
	const lines: PatronLine[] = [];
	faces.forEach((f, fi) => {
		if (f.center) {
			lines.push({ points: [...f.points, f.points[0]], kind: 'contour' });
			return;
		}
		f.points.forEach((a, i) => {
			const j = (i + 1) % f.points.length;
			sides.push({
				a,
				b: f.points[j],
				face: fi,
				vertices: f.corners.length > 0 ? [f.corners[i], f.corners[j]] : null
			});
		});
	});
	const shared = (s: Side, t: Side) =>
		(samePoint(s.a, t.a) && samePoint(s.b, t.b)) || (samePoint(s.a, t.b) && samePoint(s.b, t.a));
	const folds: PatronLine[] = [];
	const contour: Side[] = [];
	sides.forEach((s, i) => {
		const twin = sides.findIndex((t, j) => j !== i && shared(s, t));
		if (twin < 0) contour.push(s);
		else if (twin > i) folds.push({ points: [s.a, s.b], kind: 'pli' });
	});
	lines.unshift(
		...folds,
		...contour.map((s): PatronLine => ({ points: [s.a, s.b], kind: 'contour' }))
	);

	// Noms des sommets : un par coin du dessin, le même nom plusieurs fois
	const labels: SolideLabel[] = [];
	const dots: EspacePoint[] = [];
	const corners: { at: EspacePoint; vertices: number[] }[] = [];
	for (const f of faces) {
		f.corners.forEach((vertex, i) => {
			const known = corners.find((c) => samePoint(c.at, f.points[i]));
			if (!known) corners.push({ at: f.points[i], vertices: [vertex] });
			else if (!known.vertices.includes(vertex)) known.vertices.push(vertex);
		});
	}
	for (const corner of corners) {
		const names = [...new Set(corner.vertices.map((v) => spec.names?.[v] ?? null))].filter(
			(n): n is string => n !== null
		);
		if (names.length === 0) continue;
		const dir = freeDirection(corner.at, sides, polygons);
		labels.push({
			at: { x: corner.at.x + dir.x * LABEL_GAP, y: corner.at.y + dir.y * LABEL_GAP },
			text: names.join('/')
		});
	}
	// Centres des disques (cylindre) : point et nom à gauche, comme ```solide
	for (const f of faces) {
		const name = f.center ? (spec.names?.[f.center.vertex] ?? null) : null;
		if (!f.center || name === null) continue;
		const length = Math.hypot(1, 0.35);
		labels.push({
			at: {
				x: f.center.at.x - (1 / length) * LABEL_GAP,
				y: f.center.at.y + (0.35 / length) * LABEL_GAP
			},
			text: name
		});
		dots.push(f.center.at);
	}

	// Numéros des faces (au centre ; disque : au-dessus du centre, loin de son nom)
	if (spec.numbers) {
		faces.forEach((f, i) => {
			const c = f.center
				? {
						x: f.center.at.x,
						y: f.center.at.y - (bounds(f.points).maxY - bounds(f.points).minY) / 4
					}
				: centroid2(f.points);
			labels.push({ at: c, text: String(i + 1) });
		});
	}

	// Marques
	const fills: EspacePoint[][] = [];
	for (const mark of spec.marks) {
		if (mark.kind === 'face') {
			for (const i of mark.faces) fills.push(faces[i].points);
			continue;
		}
		for (const corner of corners) {
			if (corner.vertices.includes(mark.vertex) && !dots.some((d) => samePoint(d, corner.at))) {
				dots.push(corner.at);
			}
		}
		for (const f of faces) {
			if (f.center?.vertex === mark.vertex && !dots.some((d) => samePoint(d, f.center!.at))) {
				dots.push(f.center.at);
			}
		}
	}

	// Cotes : chaque longueur une fois, sur le côté du contour le plus à l'extérieur
	const dashed: PatronLine[] = [];
	if (spec.cotes) {
		const unit = spec.cotes.unit ? ` ${spec.cotes.unit}` : '';
		const text = (value: number) => `${frenchNumber(value)}${unit}`;
		const middleOfNet = centroid2(polygons.flat());
		const outermost = (candidates: Side[]) =>
			candidates.reduce((best, s) => {
				const m = middle(s.a, s.b);
				const bm = middle(best.a, best.b);
				return Math.hypot(m.x - middleOfNet.x, m.y - middleOfNet.y) >
					Math.hypot(bm.x - middleOfNet.x, bm.y - middleOfNet.y) + EPS
					? s
					: best;
			});
		if (spec.solid === 'cylindre') {
			const [r, h] = spec.dims;
			// Un rayon du disque O, en tirets, sa longueur au-dessus
			const bottom = faces.find((f) => f.center?.vertex === 0)!;
			const o = bottom.center!.at;
			const end = { x: o.x + r * scale, y: o.y };
			dashed.push({ points: [o, end], kind: 'cache' });
			labels.push(coteLabel(middle(o, end), { x: 0, y: -1 }, text(r)));
			// La hauteur sur un côté du rectangle de longueur h
			const rectangle = faces.findIndex((f) => !f.center);
			const heights = contour.filter(
				(s) =>
					s.face === rectangle &&
					Math.abs(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) - h * scale) < 1e-6
			);
			if (heights.length > 0) {
				const side = heights[0];
				labels.push(
					coteLabel(middle(side.a, side.b), outward(side, faces[rectangle].points), text(h))
				);
			}
		} else {
			const targets = coteTargets(spec);
			const area = (points: EspacePoint[]) =>
				Math.abs(
					points.reduce((s, p, i) => {
						const q = points[(i + 1) % points.length];
						return s + p.x * q.y - q.x * p.y;
					}, 0)
				) / 2;
			for (const target of targets) {
				const candidates = contour.filter((s) => s.vertices && target.accepts(...s.vertices));
				if (candidates.length > 0) {
					const side = outermost(candidates);
					labels.push(
						coteLabel(
							middle(side.a, side.b),
							outward(side, faces[side.face].points),
							text(target.value)
						)
					);
					continue;
				}
				// Longueur portée seulement par des plis (base d'une pyramide en étoile) :
				// la cote dans la plus grande des deux faces, le long du pli
				const folded = sides.filter(
					(s) => s.vertices && target.accepts(...s.vertices) && !contour.includes(s)
				);
				if (folded.length === 0) continue;
				const side = outermost(
					folded.filter((s) => {
						const twin = folded.find((t) => t !== s && shared(s, t));
						return !twin || area(faces[s.face].points) >= area(faces[twin.face].points);
					})
				);
				const n = outward(side, faces[side.face].points);
				labels.push(coteLabel(middle(side.a, side.b), { x: -n.x, y: -n.y }, text(target.value)));
			}
			// Prisme isocèle : la hauteur du triangle ABC, en tirets
			if (spec.solid === 'prisme-triangle') {
				const triangle = faces.find((f) => f.solidFace === 0)!;
				const at = (v: number) => triangle.points[triangle.corners.indexOf(v)];
				const foot = middle(at(0), at(1));
				const apex = at(2);
				dashed.push({ points: [apex, foot], kind: 'cache' });
				// Le texte à droite de la hauteur (ou au-dessus, si elle est couchée)
				const d = unit2({ x: apex.x - foot.x, y: apex.y - foot.y });
				let n = { x: -d.y, y: d.x };
				if (n.x < -EPS || (Math.abs(n.x) < EPS && n.y > 0)) n = { x: -n.x, y: -n.y };
				labels.push(coteLabel(middle(apex, foot), n, text(spec.dims[1])));
			}
		}
	}
	lines.push(...dashed);

	// Cadrage : tout dans la boîte, étiquettes comprises
	const all = bounds([...lines.flatMap((l) => l.points), ...labels.flatMap(labelBox)]);
	const shift = (p: EspacePoint): EspacePoint => ({ x: p.x - all.minX, y: p.y - all.minY });
	return {
		width: all.maxX - all.minX,
		height: all.maxY - all.minY,
		drawingWidth: (geometry.maxX - geometry.minX) * scale,
		drawingHeight: (geometry.maxY - geometry.minY) * scale,
		fills: fills.map((f) => f.map(shift)),
		lines: lines.map((l) => ({ ...l, points: l.points.map(shift) })),
		dots: dots.map(shift),
		labels: labels.map((l) => ({ ...l, at: shift(l.at) }))
	};
}

/**
 * Nom accessible : JAMAIS « patron » ni le nom du solide (ce serait la réponse de
 * « est-ce un patron du cube ? ») ; numéros, marques et cotes, qui sont dans
 * l'énoncé, y sont lus.
 */
export function patronLabel(spec: PatronSpec): string {
	const parts = ['Assemblage de polygones à plier'];
	if (spec.numbers) parts.push('faces numérotées');
	for (const mark of spec.marks) {
		parts.push(`${mark.label} ${mark.kind === 'sommet' ? 'marqué' : 'marquée'}`);
	}
	if (spec.cotes) {
		const unit = spec.cotes.unit ? ` ${spec.cotes.unit}` : '';
		const values = patronCoteValues(spec).map((d) => `${frenchNumber(d)}${unit}`);
		parts.push(`${values.length > 1 ? 'longueurs' : 'longueur'} ${values.join(', ')}`);
	}
	return parts.join(', ');
}
