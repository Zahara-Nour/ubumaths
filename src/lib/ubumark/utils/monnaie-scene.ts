/**
 * Bloc ```monnaie — la scène
 * ==========================
 *
 * Calcul pur d'un ensemble de pièces et billets (position de chaque coupure),
 * partagé par l'écran (`Monnaie.svelte`) et le PDF (`monnaie-typst.ts`) : les
 * deux ne peuvent pas diverger.
 *
 * Repère : origine en haut à gauche, y vers le BAS (comme en SVG), unités de
 * la scène. Un ensemble « pleine largeur » mesure `MONNAIE_VIEW.fullWidth`
 * (repère de la collection : 268 unités pour 8 cm) ; un plus étroit garde la
 * MÊME échelle (deux ensembles comparés ont des coupures de même taille).
 *
 * Disposition : billets en haut, en lignes qui passent à la ligne ; pièces
 * dessous. `rangé` : le plus grand d'abord, pièces en rangées ; `mélangé` :
 * billets dans un ordre tiré, pièces en vrac (`scatterCenters`). Le hasard
 * vient d'une graine faite de ce qui se dessine : même bloc → même dessin, à
 * l'écran comme au PDF.
 *
 * Plus la valeur est grande, plus la coupure est grande (billet plus long,
 * pièce de 2 € plus large que celle de 1 €), comme les vraies, sans leurs
 * proportions (décision 1 : rendu stylisé).
 *
 * @module ubumark/utils/monnaie-scene
 */

import type { MonnaieSpec } from '../types/monnaie';
import {
	findBoxAt,
	hashText,
	roundScene,
	scatterCenters,
	seededRandom,
	shiftBox,
	type SceneBox,
	type ScenePoint
} from './scene-commune';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Dimensions, en unités de la scène */
export const MONNAIE_VIEW = {
	/** Marge intérieure du cadre */
	pad: 8,
	/** Largeur d'un ensemble pleine largeur, marges comprises */
	fullWidth: 268,
	/** Diamètre des pièces, par valeur */
	coin: { 1: 18, 2: 21 } as Readonly<Record<number, number>>,
	/** Hauteur d'un billet, et sa longueur par valeur */
	noteHeight: 24,
	noteWidth: { 5: 44, 10: 48, 20: 52, 50: 58, 100: 64 } as Readonly<Record<number, number>>,
	/** Écart entre deux coupures d'une même ligne, et entre deux lignes */
	gap: 6,
	/** Écart entre les billets et les pièces */
	zoneGap: 10,
	/** Case du vrac : assez grande pour la pièce de 2 € (centres à ≥ 34 - 2 × 5 = 24 > 21) */
	cell: 34,
	jitter: 5,
	/** Colonnes du vrac, au plus (7 × 34 = 238 : tient dans la largeur) */
	maxColumns: 7,
	/** Taille intérieure d'un ensemble vide */
	empty: { width: 60, height: 40 },
	/** Toucher : une coupure répond jusqu'à cette distance de son bord */
	hitSlop: 4
} as const;

/**
 * Ce qui est écrit et tracé sur une coupure, en unités de la scène (écran et
 * PDF) : la valeur en gros au centre ; sur un billet, répétée en petit dans
 * deux coins ; la pièce de 2 € a un cœur et un anneau
 */
export const MONNAIE_LABEL = {
	note: { size: 10, radius: 3, cornerSize: 5.5, cornerBox: 8, cornerInset: 2 },
	coin: { size: 7, innerRatio: 0.72 }
} as const;

/** Cases du vrac par pièce : moins d'une sur deux occupée, pour un vrai désordre */
const SCATTER_SPREAD = 1.6;

/** Largeur disponible dans le cadre */
const INNER_WIDTH = MONNAIE_VIEW.fullWidth - 2 * MONNAIE_VIEW.pad;

// ============================================================================
// TYPES
// ============================================================================

export type MonnaieItemKind = 'billet' | 'piece';

export type MonnaiePoint = ScenePoint;

/** Boîte englobante et centre (cible du toucher, trait de la marque) : `SceneBox` */
export interface MonnaieItem extends SceneBox {
	kind: MonnaieItemKind;
	/** Valeur en euros, écrite sur la coupure */
	value: number;
}

export interface MonnaieScene {
	/** Taille du cadre, marges comprises */
	width: number;
	height: number;
	/** Dans l'ordre de lecture : billets, puis pièces */
	items: MonnaieItem[];
}

interface Zone {
	items: MonnaieItem[];
	width: number;
	height: number;
}

// ============================================================================
// FONCTIONS
// ============================================================================

function item(kind: MonnaieItemKind, value: number, x: number, y: number): MonnaieItem {
	const width = kind === 'billet' ? MONNAIE_VIEW.noteWidth[value] : MONNAIE_VIEW.coin[value];
	const height = kind === 'billet' ? MONNAIE_VIEW.noteHeight : width;
	return {
		kind,
		value,
		x: roundScene(x),
		y: roundScene(y),
		width,
		height,
		cx: roundScene(x + width / 2),
		cy: roundScene(y + height / 2)
	};
}

/** Mélange déterministe (Fisher-Yates) */
function shuffled(values: readonly number[], next: () => number): number[] {
	const out = [...values];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * Coupures en lignes, de gauche à droite, à la ligne quand la largeur est
 * pleine ; chaque ligne a la hauteur `lineHeight`, coupures centrées dedans
 */
function flow(kind: MonnaieItemKind, values: readonly number[], lineHeight: number): Zone {
	const { gap } = MONNAIE_VIEW;
	const items: MonnaieItem[] = [];
	let x = 0;
	let y = 0;
	let width = 0;
	for (const value of values) {
		const size = kind === 'billet' ? MONNAIE_VIEW.noteWidth[value] : MONNAIE_VIEW.coin[value];
		if (x > 0 && x + size > INNER_WIDTH) {
			x = 0;
			y += lineHeight + gap;
		}
		const height = kind === 'billet' ? MONNAIE_VIEW.noteHeight : size;
		items.push(item(kind, value, x, y + (lineHeight - height) / 2));
		width = Math.max(width, x + size);
		x += size + gap;
	}
	return { items, width, height: values.length === 0 ? 0 : y + lineHeight };
}

/** Pièces en vrac : une case du vrac chacune, dans un ordre tiré */
function scatterCoins(coins: readonly number[], seed: number): Zone {
	const v = MONNAIE_VIEW;
	const { centers, width, height } = scatterCenters(coins.length, seed, {
		cell: v.cell,
		jitter: v.jitter,
		spread: SCATTER_SPREAD,
		minColumns: 3,
		maxColumns: v.maxColumns
	});
	const order = shuffled(coins, seededRandom(seed ^ 0x5bd1e995));
	const items = centers.map(({ cx, cy }, i) => {
		const d = v.coin[order[i]];
		return item('piece', order[i], cx - d / 2, cy - d / 2);
	});
	return { items, width, height };
}

/** La scène de l'ensemble n° `setIndex` du bloc */
export function buildMonnaieScene(spec: MonnaieSpec, setIndex: number): MonnaieScene {
	const v = MONNAIE_VIEW;
	const set = spec.sets[setIndex];
	// Graine : ce qui se DESSINE, ni la taille ni les légendes (un choix de QCM
	// imprimé reçoit `taille: 3cm`, il doit garder le dessin de l'écran)
	const { sets, layout } = spec;
	const seed = hashText(JSON.stringify({ sets, layout, setIndex }));
	const next = seededRandom(seed);

	const mixed = layout === 'mélangé';
	const notes = flow('billet', mixed ? shuffled(set.notes, next) : set.notes, v.noteHeight);
	const coins =
		set.coins.length === 0
			? { items: [], width: 0, height: 0 }
			: mixed
				? scatterCoins(set.coins, seed)
				: flow('piece', set.coins, v.coin[2]);

	if (notes.items.length === 0 && coins.items.length === 0) {
		return {
			width: v.empty.width + 2 * v.pad,
			height: v.empty.height + 2 * v.pad,
			items: []
		};
	}

	const coinsTop = notes.height + (notes.height > 0 && coins.height > 0 ? v.zoneGap : 0);
	return {
		width: Math.max(notes.width, coins.width) + 2 * v.pad,
		height: coinsTop + coins.height + 2 * v.pad,
		items: [
			...notes.items.map((it) => shiftBox(it, v.pad, v.pad)),
			...coins.items.map((it) => shiftBox(it, v.pad, v.pad + coinsTop))
		]
	};
}

/**
 * La coupure touchée en `point` (coordonnées de la scène) : celle dont la
 * boîte, élargie de `hitSlop`, contient le point ; la plus proche s'il y en a deux.
 */
export function findMonnaieItemAt(scene: MonnaieScene, point: MonnaiePoint): number | null {
	return findBoxAt(scene.items, point, MONNAIE_VIEW.hitSlop);
}
