/**
 * Bloc ```collection — la scène
 * =============================
 *
 * Calcul pur d'une collection (position de chaque objet), partagé par l'écran
 * (`Collection.svelte`) et le PDF (`collection-typst.ts`) : les deux ne peuvent
 * pas diverger.
 *
 * Repère : origine en haut à gauche, y vers le BAS (comme en SVG), unités de
 * la scène. Une collection « pleine largeur » mesure `COLLECTION_VIEW.fullWidth`
 * ; une plus étroite garde la MÊME échelle (objets de même taille partout :
 * deux collections comparées ne trompent pas l'œil par leur dessin).
 *
 * Disposition : les groupes de dix en haut (barres côte à côte, ou paquets de
 * 10 jetons entourés, deux par ligne), les objets isolés dessous (vrac ou
 * rangées de 5 + 5).
 *
 * Grand bloc (`spec.large` : centaines ou milliers, chantier
 * `docs/wip/collection-centaines-progress.md`) : de haut en bas gros cubes,
 * plaques, barres, cubes, chaque zone revenant à la ligne quand elle est
 * pleine ; tout est dessiné à moitié taille (`COLLECTION_LARGE_VIEW`), pour
 * 4 plaques par rangée. Plaques et gros cubes portent leur dessin (`faces`,
 * `lines`), calculé ici pour l'écran comme pour le PDF. Le vrac est tiré au hasard, mais d'une graine faite du
 * contenu du bloc : même bloc → même dessin, à l'écran comme au PDF.
 *
 * Chaque objet porte sa VALEUR (1 pour un jeton ou un cube, 10 pour une barre
 * ou un paquet). Hasard, vrac, décalage et toucher viennent de
 * `scene-commune.ts`, partagés avec ```monnaie.
 *
 * @module ubumark/utils/collection-scene
 */

import type { CollectionSpec } from '../types/collection';
import {
	findBoxAt,
	hashText,
	roundScene,
	scatterCenters,
	shiftBox,
	type SceneBox,
	type ScenePoint
} from './scene-commune';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Dimensions, en unités de la scène */
export const COLLECTION_VIEW = {
	/** Marge intérieure du cadre */
	pad: 8,
	/** Largeur d'une collection pleine largeur, marges comprises */
	fullWidth: 268,
	/** Côté d'un cube, diamètre d'un jeton */
	object: 12,
	/** Écart entre deux barres */
	barGap: 6,
	/** Pas des objets rangés (paquets, rangées) */
	pitch: 16,
	/** Écart en plus entre le 5e et le 6e objet d'une rangée */
	rowSplit: 8,
	/** Marge intérieure d'un paquet, autour de ses jetons */
	packPad: 5,
	/** Écart entre deux paquets */
	packGap: 10,
	/** Écart entre les groupes de dix et les objets isolés */
	zoneGap: 14,
	/** Case du vrac : l'objet y bouge de ± `jitter` autour du centre */
	cell: 28,
	jitter: 4.9,
	/** Colonnes du vrac, au plus */
	maxColumns: 9,
	/** Taille intérieure d'une collection vide */
	empty: { width: 60, height: 40 },
	/** Toucher : un objet répond jusqu'à cette distance de son bord */
	hitSlop: 6
} as const;

/**
 * Grand bloc (centaines, milliers) : objets à moitié taille, mêmes marges et
 * même largeur pleine que `COLLECTION_VIEW`
 */
export const COLLECTION_LARGE_VIEW = {
	object: 6,
	barGap: 3,
	pitch: 8,
	rowSplit: 4,
	zoneGap: 8,
	cell: 14,
	jitter: 2.45,
	maxColumns: 18,
	/** Écart entre deux plaques, deux gros cubes, deux rangées de barres */
	blockGap: 4,
	/** Gros cube : décalage de la face arrière (perspective cavalière) */
	depth: 18
} as const;

/** Les mesures communes aux deux échelles */
type SceneDims = Record<
	'object' | 'barGap' | 'pitch' | 'rowSplit' | 'zoneGap' | 'cell' | 'jitter' | 'maxColumns',
	number
>;

/** Paquets par ligne */
const PACKS_PER_ROW = 2;

/** Objets par rangée (5 + 5) */
const ROW_LENGTH = 10;

/** Cases du vrac par objet : moins d'une sur deux occupée, pour un vrai désordre */
const SCATTER_SPREAD = 1.6;

// ============================================================================
// TYPES
// ============================================================================

export type CollectionItemKind = 'jeton' | 'cube' | 'barre' | 'paquet' | 'plaque' | 'gros-cube';

export type CollectionPoint = ScenePoint;

/** Un trait du dessin d'un objet */
export interface CollectionLine {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

/** Boîte englobante et centre (cible du toucher, trait de la marque) : `SceneBox` */
export interface CollectionItem extends SceneBox {
	kind: CollectionItemKind;
	/** Valeur de l'objet : 1 (jeton, cube), 10 (barre, paquet), 100 (plaque), 1 000 (gros cube) */
	value: number;
	/** Paquet : les centres de ses 10 jetons */
	jetons?: { cx: number; cy: number }[];
	/** Gros cube : ses trois faces visibles (devant, dessus, côté droit), polygones remplis */
	faces?: CollectionPoint[][];
	/** Plaque, gros cube : le quadrillage de 10 × 10, tracé par-dessus les faces */
	lines?: CollectionLine[];
}

export interface CollectionScene {
	/** Taille du cadre, marges comprises */
	width: number;
	height: number;
	/** Dans l'ordre de lecture : groupes de dix, puis objets isolés */
	items: CollectionItem[];
}

// ============================================================================
// FONCTIONS
// ============================================================================

/** Un objet isolé (jeton ou cube) centré en (cx, cy), de côté `size` */
function unitItem(kind: 'jeton' | 'cube', cx: number, cy: number, size: number): CollectionItem {
	const half = size / 2;
	return {
		kind,
		x: roundScene(cx - half),
		y: roundScene(cy - half),
		width: size,
		height: size,
		cx: roundScene(cx),
		cy: roundScene(cy),
		value: 1
	};
}

interface Zone {
	items: CollectionItem[];
	width: number;
	height: number;
}

const EMPTY_ZONE: Zone = { items: [], width: 0, height: 0 };

/**
 * `count` boîtes de `width` × `height`, de gauche à droite, à la ligne quand
 * la largeur intérieure d'une collection pleine largeur est remplie
 */
function gridZone(
	count: number,
	width: number,
	height: number,
	gapX: number,
	gapY: number,
	make: (x: number, y: number) => CollectionItem
): Zone {
	if (count === 0) return EMPTY_ZONE;
	const inner = COLLECTION_VIEW.fullWidth - 2 * COLLECTION_VIEW.pad;
	const perRow = Math.max(1, Math.floor((inner + gapX) / (width + gapX)));
	const items = Array.from({ length: count }, (_, i) =>
		make((i % perRow) * (width + gapX), Math.floor(i / perRow) * (height + gapY))
	);
	const columns = Math.min(count, perRow);
	const rows = Math.ceil(count / perRow);
	return {
		items,
		width: columns * (width + gapX) - gapX,
		height: rows * (height + gapY) - gapY
	};
}

/** Une barre de dix, verticale */
function barItem(x: number, y: number, size: number): CollectionItem {
	return {
		kind: 'barre',
		x,
		y,
		width: size,
		height: 10 * size,
		cx: x + size / 2,
		cy: y + 5 * size,
		value: 10
	};
}

/** Les 9 traits d'un quadrillage de 10 parts, de `from` à `to`, en avançant de `step` */
function gridLines(
	from: CollectionPoint,
	to: CollectionPoint,
	step: CollectionPoint
): CollectionLine[] {
	return Array.from({ length: 9 }, (_, i) => ({
		x1: roundScene(from.x + (i + 1) * step.x),
		y1: roundScene(from.y + (i + 1) * step.y),
		x2: roundScene(to.x + (i + 1) * step.x),
		y2: roundScene(to.y + (i + 1) * step.y)
	}));
}

/** Une plaque de cent : un carré de 10 × 10 cubes */
function plateItem(x: number, y: number, size: number): CollectionItem {
	const side = 10 * size;
	return {
		kind: 'plaque',
		x,
		y,
		width: side,
		height: side,
		cx: x + side / 2,
		cy: y + side / 2,
		value: 100,
		lines: [
			...gridLines({ x, y }, { x, y: y + side }, { x: size, y: 0 }),
			...gridLines({ x, y }, { x: x + side, y }, { x: 0, y: size })
		]
	};
}

/**
 * Un gros cube de mille, en perspective cavalière : la face de devant en bas
 * à gauche, le dessus et le côté droit fuyant de `depth` vers le haut à droite
 */
function bigCubeItem(x: number, y: number, size: number, depth: number): CollectionItem {
	const side = 10 * size;
	const d = depth / 10;
	const p = (px: number, py: number): CollectionPoint => ({ x: roundScene(px), y: roundScene(py) });
	const front = [
		p(x, y + depth),
		p(x + side, y + depth),
		p(x + side, y + depth + side),
		p(x, y + depth + side)
	];
	const top = [p(x, y + depth), p(x + depth, y), p(x + depth + side, y), p(x + side, y + depth)];
	const right = [
		p(x + side, y + depth),
		p(x + side + depth, y),
		p(x + side + depth, y + side),
		p(x + side, y + depth + side)
	];
	return {
		kind: 'gros-cube',
		x,
		y,
		width: side + depth,
		height: side + depth,
		cx: x + (side + depth) / 2,
		cy: y + (side + depth) / 2,
		value: 1000,
		faces: [front, top, right],
		lines: [
			// Devant : colonnes, puis rangées
			...gridLines({ x, y: y + depth }, { x, y: y + depth + side }, { x: size, y: 0 }),
			...gridLines({ x, y: y + depth }, { x: x + side, y: y + depth }, { x: 0, y: size }),
			// Dessus : traits qui fuient, puis traits parallèles au devant
			...gridLines({ x, y: y + depth }, { x: x + depth, y }, { x: size, y: 0 }),
			...gridLines({ x, y: y + depth }, { x: x + side, y: y + depth }, { x: d, y: -d }),
			// Côté droit : traits verticaux, puis traits qui fuient
			...gridLines(
				{ x: x + side, y: y + depth },
				{ x: x + side, y: y + depth + side },
				{ x: d, y: -d }
			),
			...gridLines({ x: x + side, y: y + depth }, { x: x + side + depth, y }, { x: 0, y: size })
		]
	};
}

/** Barres de dix côte à côte, ou paquets deux par ligne ; renvoie aussi la taille de la zone */
function groupItems(spec: CollectionSpec, tens: number, dims: SceneDims): Zone {
	const v = COLLECTION_VIEW;
	const items: CollectionItem[] = [];
	if (tens === 0) return EMPTY_ZONE;

	if (spec.drawing === 'barres') {
		return gridZone(tens, dims.object, 10 * dims.object, dims.barGap, 2 * dims.barGap, (x, y) =>
			barItem(x, y, dims.object)
		);
	}

	const packWidth = 2 * v.packPad + 4 * v.pitch + v.object;
	const packHeight = 2 * v.packPad + v.pitch + v.object;
	for (let i = 0; i < tens; i++) {
		const x = (i % PACKS_PER_ROW) * (packWidth + v.packGap);
		const y = Math.floor(i / PACKS_PER_ROW) * (packHeight + v.packGap);
		const jetons = Array.from({ length: 10 }, (_, k) => ({
			cx: x + v.packPad + v.object / 2 + (k % 5) * v.pitch,
			cy: y + v.packPad + v.object / 2 + Math.floor(k / 5) * v.pitch
		}));
		items.push({
			kind: 'paquet',
			x,
			y,
			width: packWidth,
			height: packHeight,
			cx: x + packWidth / 2,
			cy: y + packHeight / 2,
			value: 10,
			jetons
		});
	}
	const columns = Math.min(tens, PACKS_PER_ROW);
	const rows = Math.ceil(tens / PACKS_PER_ROW);
	return {
		items,
		width: columns * (packWidth + v.packGap) - v.packGap,
		height: rows * (packHeight + v.packGap) - v.packGap
	};
}

/** Rangées de 10 (5 + 5), de haut en bas */
function rowItems(kind: 'jeton' | 'cube', count: number, dims: SceneDims): Zone {
	const v = dims;
	const items: CollectionItem[] = [];
	for (let i = 0; i < count; i++) {
		const column = i % ROW_LENGTH;
		const cx = v.object / 2 + column * v.pitch + (column >= 5 ? v.rowSplit : 0);
		const cy = v.object / 2 + Math.floor(i / ROW_LENGTH) * v.pitch;
		items.push(unitItem(kind, cx, cy, v.object));
	}
	const columns = Math.min(count, ROW_LENGTH);
	const rows = Math.ceil(count / ROW_LENGTH);
	return {
		items,
		width: (columns - 1) * v.pitch + (columns > 5 ? v.rowSplit : 0) + v.object,
		height: (rows - 1) * v.pitch + v.object
	};
}

/**
 * Vrac (`scatterCenters`) : deux centres restent à au moins `cell - 2 jitter`
 * (= 1,5 objet) : rien ne se touche.
 */
function scatterItems(kind: 'jeton' | 'cube', count: number, seed: number, dims: SceneDims): Zone {
	const v = dims;
	const { centers, width, height } = scatterCenters(count, seed, {
		cell: v.cell,
		jitter: v.jitter,
		spread: SCATTER_SPREAD,
		minColumns: 3,
		maxColumns: v.maxColumns
	});
	return { items: centers.map(({ cx, cy }) => unitItem(kind, cx, cy, v.object)), width, height };
}

/** Décaler des objets de (dx, dy) */
function shift(items: CollectionItem[], dx: number, dy: number): CollectionItem[] {
	return items.map((item) => ({
		...shiftBox(item, dx, dy),
		...(item.jetons && {
			jetons: item.jetons.map((j) => ({ cx: roundScene(j.cx + dx), cy: roundScene(j.cy + dy) }))
		}),
		...(item.faces && {
			faces: item.faces.map((face) =>
				face.map((p) => ({ x: roundScene(p.x + dx), y: roundScene(p.y + dy) }))
			)
		}),
		...(item.lines && {
			lines: item.lines.map((l) => ({
				x1: roundScene(l.x1 + dx),
				y1: roundScene(l.y1 + dy),
				x2: roundScene(l.x2 + dx),
				y2: roundScene(l.y2 + dy)
			}))
		})
	}));
}

/** La scène de la collection n° `setIndex` du bloc */
export function buildCollectionScene(spec: CollectionSpec, setIndex: number): CollectionScene {
	const v = COLLECTION_VIEW;
	const large = COLLECTION_LARGE_VIEW;
	const dims: SceneDims = spec.large ? large : v;
	const set = spec.sets[setIndex];
	const unitKind = spec.drawing === 'barres' ? 'cube' : 'jeton';

	// Graine : ce qui se DESSINE, ni la taille ni les légendes (un choix de QCM
	// imprimé reçoit `taille: 3cm`, il doit garder le dessin de l'écran). Un petit
	// bloc garde la graine d'avant les centaines : son dessin publié ne bouge pas
	const { drawing, unitLayout } = spec;
	const sets = spec.large ? spec.sets : spec.sets.map(({ tens, units }) => ({ tens, units }));
	const seed = hashText(JSON.stringify({ sets, drawing, unitLayout, setIndex }));
	const side = 10 * large.object;
	const bigCubeSide = side + large.depth;
	// Du haut vers le bas : gros cubes, plaques, groupes de dix, objets isolés
	const zones: Zone[] = [
		gridZone(set.thousands, bigCubeSide, bigCubeSide, large.blockGap, large.blockGap, (x, y) =>
			bigCubeItem(x, y, large.object, large.depth)
		),
		gridZone(set.hundreds, side, side, large.blockGap, large.blockGap, (x, y) =>
			plateItem(x, y, large.object)
		),
		groupItems(spec, set.tens, dims),
		set.units === 0
			? EMPTY_ZONE
			: spec.unitLayout === 'rangées'
				? rowItems(unitKind, set.units, dims)
				: scatterItems(unitKind, set.units, seed, dims)
	].filter((zone) => zone.items.length > 0);

	if (zones.length === 0) {
		return {
			width: v.empty.width + 2 * v.pad,
			height: v.empty.height + 2 * v.pad,
			items: []
		};
	}

	const items: CollectionItem[] = [];
	let top = 0;
	for (const zone of zones) {
		items.push(...shift(zone.items, v.pad, v.pad + top));
		top += zone.height + dims.zoneGap;
	}
	return {
		width: Math.max(...zones.map((zone) => zone.width)) + 2 * v.pad,
		height: top - dims.zoneGap + 2 * v.pad,
		items
	};
}

/**
 * L'objet touché en `point` (coordonnées de la scène) : celui dont la boîte,
 * élargie de `hitSlop`, contient le point ; le plus proche s'il y en a deux.
 */
export function findCollectionItemAt(
	scene: CollectionScene,
	point: CollectionPoint
): number | null {
	return findBoxAt(scene.items, point, COLLECTION_VIEW.hitSlop);
}
