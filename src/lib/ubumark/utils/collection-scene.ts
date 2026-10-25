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
 * rangées de 5 + 5). Le vrac est tiré au hasard, mais d'une graine faite du
 * contenu du bloc : même bloc → même dessin, à l'écran comme au PDF.
 *
 * Chaque objet porte sa VALEUR (1 pour un jeton ou un cube, 10 pour une barre
 * ou un paquet) : la monnaie, bâtie sur cette scène, comparera des valeurs, pas
 * des nombres d'objets.
 *
 * @module ubumark/utils/collection-scene
 */

import type { CollectionSpec } from '../types/collection';

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

/** Paquets par ligne */
const PACKS_PER_ROW = 2;

/** Objets par rangée (5 + 5) */
const ROW_LENGTH = 10;

/** Cases du vrac par objet : moins d'une sur deux occupée, pour un vrai désordre */
const SCATTER_SPREAD = 1.6;

// ============================================================================
// TYPES
// ============================================================================

export type CollectionItemKind = 'jeton' | 'cube' | 'barre' | 'paquet';

export interface CollectionPoint {
	x: number;
	y: number;
}

export interface CollectionItem {
	kind: CollectionItemKind;
	/** Boîte englobante (coin haut gauche, taille) */
	x: number;
	y: number;
	width: number;
	height: number;
	/** Centre (cible du toucher, trait de la marque) */
	cx: number;
	cy: number;
	/** Valeur de l'objet : 1 (jeton, cube), 10 (barre, paquet) */
	value: number;
	/** Paquet : les centres de ses 10 jetons */
	jetons?: { cx: number; cy: number }[];
}

export interface CollectionScene {
	/** Taille du cadre, marges comprises */
	width: number;
	height: number;
	/** Dans l'ordre de lecture : groupes de dix, puis objets isolés */
	items: CollectionItem[];
}

// ============================================================================
// HASARD DÉTERMINISTE
// ============================================================================

/** FNV-1a 32 bits d'une chaîne */
function hash(text: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** mulberry32 : suite de nombres dans [0, 1) tirée d'une graine */
function random(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Au centième : coordonnées lisibles, identiques à l'écran et au PDF */
const round = (v: number) => Math.round(v * 100) / 100;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Un objet isolé (jeton ou cube) centré en (cx, cy) */
function unitItem(kind: 'jeton' | 'cube', cx: number, cy: number): CollectionItem {
	const half = COLLECTION_VIEW.object / 2;
	return {
		kind,
		x: round(cx - half),
		y: round(cy - half),
		width: COLLECTION_VIEW.object,
		height: COLLECTION_VIEW.object,
		cx: round(cx),
		cy: round(cy),
		value: 1
	};
}

/** Barres de dix côte à côte, ou paquets deux par ligne ; renvoie aussi la taille de la zone */
function groupItems(
	spec: CollectionSpec,
	tens: number
): { items: CollectionItem[]; width: number; height: number } {
	const v = COLLECTION_VIEW;
	const items: CollectionItem[] = [];
	if (tens === 0) return { items, width: 0, height: 0 };

	if (spec.drawing === 'barres') {
		for (let i = 0; i < tens; i++) {
			const x = i * (v.object + v.barGap);
			items.push({
				kind: 'barre',
				x,
				y: 0,
				width: v.object,
				height: 10 * v.object,
				cx: x + v.object / 2,
				cy: 5 * v.object,
				value: 10
			});
		}
		return { items, width: tens * (v.object + v.barGap) - v.barGap, height: 10 * v.object };
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
function rowItems(
	kind: 'jeton' | 'cube',
	count: number
): { items: CollectionItem[]; width: number; height: number } {
	const v = COLLECTION_VIEW;
	const items: CollectionItem[] = [];
	for (let i = 0; i < count; i++) {
		const column = i % ROW_LENGTH;
		const cx = v.object / 2 + column * v.pitch + (column >= 5 ? v.rowSplit : 0);
		const cy = v.object / 2 + Math.floor(i / ROW_LENGTH) * v.pitch;
		items.push(unitItem(kind, cx, cy));
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
 * Vrac : chaque objet dans sa case d'une grille plus grande que nécessaire,
 * cases tirées au hasard, objet décalé de ± `jitter` dans sa case. Deux centres
 * restent à au moins `cell - 2 jitter` (= 1,5 objet) : rien ne se touche.
 */
function scatterItems(
	kind: 'jeton' | 'cube',
	count: number,
	seed: number
): { items: CollectionItem[]; width: number; height: number } {
	const v = COLLECTION_VIEW;
	const next = random(seed);
	const cells = Math.ceil(count * SCATTER_SPREAD);
	const columns = Math.min(v.maxColumns, Math.max(3, Math.ceil(Math.sqrt(cells))));
	const rows = Math.ceil(cells / columns);

	// Tirage de `count` cases parmi rows × columns (Fisher-Yates partiel)
	const all = Array.from({ length: rows * columns }, (_, i) => i);
	for (let i = 0; i < count; i++) {
		const j = i + Math.floor(next() * (all.length - i));
		[all[i], all[j]] = [all[j], all[i]];
	}
	const chosen = all.slice(0, count).sort((a, b) => a - b);

	const items = chosen.map((cellIndex) => {
		const column = cellIndex % columns;
		const row = Math.floor(cellIndex / columns);
		const dx = (next() * 2 - 1) * v.jitter;
		const dy = (next() * 2 - 1) * v.jitter;
		return unitItem(kind, (column + 0.5) * v.cell + dx, (row + 0.5) * v.cell + dy);
	});
	return { items, width: columns * v.cell, height: rows * v.cell };
}

/** Décaler des objets de (dx, dy) */
function shift(items: CollectionItem[], dx: number, dy: number): CollectionItem[] {
	return items.map((item) => ({
		...item,
		x: round(item.x + dx),
		y: round(item.y + dy),
		cx: round(item.cx + dx),
		cy: round(item.cy + dy),
		...(item.jetons && {
			jetons: item.jetons.map((j) => ({ cx: round(j.cx + dx), cy: round(j.cy + dy) }))
		})
	}));
}

/** La scène de la collection n° `setIndex` du bloc */
export function buildCollectionScene(spec: CollectionSpec, setIndex: number): CollectionScene {
	const v = COLLECTION_VIEW;
	const set = spec.sets[setIndex];
	const unitKind = spec.drawing === 'barres' ? 'cube' : 'jeton';

	const groups = groupItems(spec, set.tens);
	const seed = hash(JSON.stringify({ spec, setIndex }));
	const units =
		set.units === 0
			? { items: [], width: 0, height: 0 }
			: spec.unitLayout === 'rangées'
				? rowItems(unitKind, set.units)
				: scatterItems(unitKind, set.units, seed);

	if (groups.items.length === 0 && units.items.length === 0) {
		return {
			width: v.empty.width + 2 * v.pad,
			height: v.empty.height + 2 * v.pad,
			items: []
		};
	}

	const unitsTop = groups.height + (groups.height > 0 && units.height > 0 ? v.zoneGap : 0);
	return {
		width: Math.max(groups.width, units.width) + 2 * v.pad,
		height: unitsTop + units.height + 2 * v.pad,
		items: [...shift(groups.items, v.pad, v.pad), ...shift(units.items, v.pad, v.pad + unitsTop)]
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
	const slop = COLLECTION_VIEW.hitSlop;
	let best: number | null = null;
	let bestDistance = Infinity;
	scene.items.forEach((item, i) => {
		const inside =
			point.x >= item.x - slop &&
			point.x <= item.x + item.width + slop &&
			point.y >= item.y - slop &&
			point.y <= item.y + item.height + slop;
		if (!inside) return;
		const distance = Math.hypot(point.x - item.cx, point.y - item.cy);
		if (distance < bestDistance) {
			best = i;
			bestDistance = distance;
		}
	});
	return best;
}
