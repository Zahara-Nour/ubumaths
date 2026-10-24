/**
 * Dessins des décorations de panse des Mathoux (lot B des accessoires)
 * ====================================================================
 *
 * Versions choisies par David sur la planche (2026-10-24,
 * `scripts/mathoux-planches/decorations.test.ts`) : cœur A (rouge), étoile B
 * (rouge sur pastille crème), petite gidouille A (spirale noire sur pastille
 * crème), cocarde A (à rubans), médaille A (à ruban), blason A (rouge au
 * chevron d'or).
 *
 * Chaque dessin vit dans un repère centré (rayon utile ≈ 10) ; `decorationPlacement`
 * le pose au milieu de la panse, à la taille de la panse. Races à motif de panse :
 * smoking, marbré, arlequin → par-dessus le motif ; Lunaire → dans le creux du
 * croissant, un peu plus petit.
 */

import type { MathouDecorationId } from '$lib/mathoux/decorations';
import type { MathouPattern } from './mathou-races';
import { CREAM, INK, RED, type PearGeometry } from './mathou-dessin';

// Types
export type DecorationShape =
	| {
			kind: 'path';
			d: string;
			fill: string;
			stroke?: string;
			width?: number;
			/** Bouts de trait arrondis (spirales) */
			round?: boolean;
	  }
	| {
			kind: 'circle';
			cx: number;
			cy: number;
			r: number;
			fill: string;
			stroke?: string;
			width?: number;
	  };

export interface DecorationPlacement {
	x: number;
	y: number;
	/** Échelle du repère de la décoration */
	k: number;
}

// Constantes
const GOLD = 'hsl(44, 85%, 58%)';
const W = 1.6;

const r1 = (n: number): number => Math.round(n * 10) / 10;

function starPath(r: number, inner: number): string {
	const pts: string[] = [];
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const rr = i % 2 === 0 ? r : r * inner;
		pts.push(`${r1(rr * Math.cos(a))} ${r1(rr * Math.sin(a))}`);
	}
	return `M${pts.join('L')}Z`;
}

/** Spirale d'Archimède partant du centre : la gidouille du Père Ubu */
function spiral(turns: number, r: number): string {
	let d = 'M0 0';
	const steps = turns * 24;
	for (let i = 1; i <= steps; i++) {
		const a = (i / 24) * 2 * Math.PI;
		const rr = (r * i) / steps;
		d += `L${r1(rr * Math.cos(a))} ${r1(rr * Math.sin(a))}`;
	}
	return d;
}

/** Cercle festonné (rosette) */
function scallops(n: number, r: number, bump: number): string {
	let d = '';
	for (let i = 0; i <= n; i++) {
		const a = (i / n) * 2 * Math.PI;
		const x = r1(r * Math.cos(a));
		const y = r1(r * Math.sin(a));
		d += i === 0 ? `M${x} ${y}` : `A${bump} ${bump} 0 0 1 ${x} ${y}`;
	}
	return d + 'Z';
}

// Les trous de la Grande Passoire
const COLANDER_HOLES: [number, number][] = [
	[0, 4],
	[-3.6, 2],
	[3.6, 2],
	[-3.6, 6],
	[3.6, 6],
	[0, 0.2],
	[0, 7.8]
];

export const DECORATION_SHAPES: Record<MathouDecorationId, readonly DecorationShape[]> = {
	heart: [
		{
			kind: 'path',
			d: 'M0 9C-13 0 -10 -11 0 -5C10 -11 13 0 0 9Z',
			fill: RED,
			stroke: INK,
			width: W
		}
	],
	star: [
		{ kind: 'circle', cx: 0, cy: 0, r: 10.5, fill: CREAM, stroke: INK, width: W },
		{ kind: 'path', d: starPath(8, 0.45), fill: RED, stroke: INK, width: 1.1 }
	],
	gidouille: [
		{ kind: 'circle', cx: 0, cy: 0, r: 10, fill: CREAM, stroke: INK, width: W },
		{ kind: 'path', d: spiral(3, 7.6), fill: 'none', stroke: INK, width: 1.5, round: true }
	],
	cockade: [
		{
			kind: 'path',
			d: 'M-3 4L-7 15L-4 13.5L-2.5 16.5L0 5Z M3 4L7 15L4 13.5L2.5 16.5L0 5Z',
			fill: RED,
			stroke: INK,
			width: 1.2
		},
		{ kind: 'path', d: scallops(14, 10, 2.4), fill: RED, stroke: INK, width: W },
		{ kind: 'circle', cx: 0, cy: 0, r: 6.4, fill: CREAM, stroke: INK, width: 1.2 },
		{ kind: 'circle', cx: 0, cy: 0, r: 3, fill: INK }
	],
	medal: [
		{ kind: 'path', d: 'M-6 -15H6L4 -3H-4Z', fill: RED, stroke: INK, width: 1.2 },
		{ kind: 'path', d: 'M-1.6 -15H1.6L1.1 -3H-1.1Z', fill: CREAM },
		{ kind: 'circle', cx: 0, cy: 4, r: 8.5, fill: GOLD, stroke: INK, width: W },
		...COLANDER_HOLES.map(([cx, cy]): DecorationShape => ({
			kind: 'circle',
			cx,
			cy,
			r: 1.1,
			fill: INK
		}))
	],
	coat_of_arms: [
		{
			kind: 'path',
			d: 'M-9 -10H9V0C9 6 4 9.5 0 11.5C-4 9.5 -9 6 -9 0Z',
			fill: RED,
			stroke: INK,
			width: W
		},
		{
			kind: 'path',
			d: 'M-8.4 4L0 -4L8.4 4V8.2L0 0L-8.4 8.2Z',
			fill: GOLD,
			stroke: INK,
			width: 1
		}
	]
};

// Functions
/**
 * Où poser la décoration : au milieu de la panse, un peu au-dessus du plus large,
 * à la taille de la panse ; pour le Lunaire, dans le creux du croissant.
 */
export function decorationPlacement(
	geo: PearGeometry,
	pattern: MathouPattern
): DecorationPlacement {
	const s = geo.stage.bw / 64;
	const k = r1(1.7 * s * 100) / 100;
	if (pattern === 'plastron') {
		return { x: 100, y: r1(geo.waistY - 4 - geo.stage.moon * 0.12), k: k * 0.9 };
	}
	return { x: 100, y: r1(geo.waistY - 8 * s), k };
}
