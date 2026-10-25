/**
 * Scènes d'objets — le code commun
 * ================================
 *
 * Ce que partagent les scènes de ```collection et de ```monnaie (phase 0 :
 * `docs/archive/wip/monnaie-progress.md` § 7, décision 8) : le hasard déterministe,
 * le vrac sans chevauchement, le décalage d'objets et le toucher. Chaque bloc
 * garde sa propre scène (ses objets, sa disposition) ; rien ici ne connaît les
 * cubes ni les euros.
 *
 * Repère : origine en haut à gauche, y vers le BAS (comme en SVG), unités de
 * la scène.
 *
 * @module ubumark/utils/scene-commune
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ScenePoint {
	x: number;
	y: number;
}

/** Un objet dessiné : sa boîte englobante (coin haut gauche, taille) et son centre */
export interface SceneBox {
	x: number;
	y: number;
	width: number;
	height: number;
	cx: number;
	cy: number;
}

export interface ScatterOptions {
	/** Côté de la case d'un objet */
	cell: number;
	/** L'objet bouge de ± `jitter` autour du centre de sa case */
	jitter: number;
	/** Cases par objet (> 1) : moins d'une case sur `spread` occupée */
	spread: number;
	/** Colonnes, au moins et au plus */
	minColumns: number;
	maxColumns: number;
}

/** Centres tirés d'un vrac, et la taille de la zone */
export interface Scatter {
	centers: { cx: number; cy: number }[];
	width: number;
	height: number;
}

// ============================================================================
// HASARD DÉTERMINISTE
// ============================================================================

/** FNV-1a 32 bits d'une chaîne : la graine d'un dessin */
export function hashText(text: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** mulberry32 : suite de nombres dans [0, 1) tirée d'une graine */
export function seededRandom(seed: number): () => number {
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
export const roundScene = (v: number) => Math.round(v * 100) / 100;

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Vrac : chaque objet dans sa case d'une grille plus grande que nécessaire,
 * cases tirées au hasard, objet décalé de ± `jitter` dans sa case. Deux centres
 * restent à au moins `cell - 2 jitter` : avec une case assez grande pour le
 * plus gros objet, rien ne se touche. Centres dans l'ordre de lecture.
 */
export function scatterCenters(count: number, seed: number, options: ScatterOptions): Scatter {
	const { cell, jitter, spread, minColumns, maxColumns } = options;
	const next = seededRandom(seed);
	const cells = Math.ceil(count * spread);
	const columns = Math.min(maxColumns, Math.max(minColumns, Math.ceil(Math.sqrt(cells))));
	const rows = Math.ceil(cells / columns);

	// Tirage de `count` cases parmi rows × columns (Fisher-Yates partiel)
	const all = Array.from({ length: rows * columns }, (_, i) => i);
	for (let i = 0; i < count; i++) {
		const j = i + Math.floor(next() * (all.length - i));
		[all[i], all[j]] = [all[j], all[i]];
	}
	const chosen = all.slice(0, count).sort((a, b) => a - b);

	const centers = chosen.map((cellIndex) => {
		const column = cellIndex % columns;
		const row = Math.floor(cellIndex / columns);
		const dx = (next() * 2 - 1) * jitter;
		const dy = (next() * 2 - 1) * jitter;
		return { cx: (column + 0.5) * cell + dx, cy: (row + 0.5) * cell + dy };
	});
	return { centers, width: columns * cell, height: rows * cell };
}

/** Un objet décalé de (dx, dy), coordonnées au centième */
export function shiftBox<T extends SceneBox>(item: T, dx: number, dy: number): T {
	return {
		...item,
		x: roundScene(item.x + dx),
		y: roundScene(item.y + dy),
		cx: roundScene(item.cx + dx),
		cy: roundScene(item.cy + dy)
	};
}

/**
 * L'objet touché en `point` (coordonnées de la scène) : celui dont la boîte,
 * élargie de `slop`, contient le point ; le plus proche s'il y en a deux.
 */
export function findBoxAt(
	items: readonly SceneBox[],
	point: ScenePoint,
	slop: number
): number | null {
	let best: number | null = null;
	let bestDistance = Infinity;
	items.forEach((item, i) => {
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
