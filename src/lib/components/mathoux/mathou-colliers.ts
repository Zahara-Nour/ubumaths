/**
 * Dessins des colliers des Mathoux (lot C des accessoires)
 * ========================================================
 *
 * Versions choisies par David sur la planche (2026-10-25,
 * `scripts/mathoux-planches/colliers.test.ts`) : ruban à grelot A (rouge), nœud
 * papillon A (rouge), collier de cuir A (médaille d'or), collier de l'Ordre B
 * (plaques rouge et or, médaille de la Grande Passoire).
 *
 * Un collier a deux parties :
 *   - la BANDE, qui fait le tour du cou, en coordonnées de l'affiche ;
 *   - ce qui PEND (grelot, nœud, médaille), dans un repère dont l'origine est le
 *     point d'accroche, posé par `collarNeck`.
 * Règle de la fraise (2026-10-25, recommandation acceptée) : chez le grand matou,
 * la bande passe sous la fraise et seul ce qui pend dépasse dessous.
 */

import type { MathouCollarId } from '$lib/mathoux/decorations';
import type { MathouStage } from './mathou-races';
import type { DecorationShape } from './mathou-decorations';
import { INK, RED, pearGeometry } from './mathou-dessin';

// Types
/** Où passe le collier */
export interface CollarNeck {
	/** Hauteur des bouts du collier, sur le contour du cou */
	y: number;
	/** Demi-largeur du cou à cette hauteur */
	w: number;
	/** Échelle des pendentifs et des grains (1,7 = matou) */
	s: number;
	/** Hauteur du point d'accroche : sous la fraise chez le grand matou */
	hang: number;
}

export interface CollarDrawing {
	band: DecorationShape[];
	pendant: readonly DecorationShape[];
}

// Constantes
const GOLD = 'hsl(44, 85%, 58%)';
const LEATHER = 'hsl(25, 45%, 32%)';

/** Mesuré sur le rendu : sous la bouche et les moustaches, là où le corps est le plus étroit */
const NECK_AT: Record<MathouStage, { y: number; w: number }> = {
	chaton: { y: 99, w: 37 },
	matou: { y: 82, w: 24.5 },
	grand_matou: { y: 91, w: 20 }
};

/** Bas de la fraise du grand matou (godrons à `shoulderY + 2 + 1.8`, rayon 6) */
const RUFF_BOTTOM = pearGeometry('grand_matou').shoulderY + 2 + 1.8 + 6;

const r1 = (n: number): number => Math.round(n * 10) / 10;

// Les trous de la Grande Passoire, sous le point d'accroche
const COLANDER_HOLES: [number, number][] = [
	[0, 0],
	[-2.6, -1.5],
	[2.6, -1.5],
	[-2.6, 1.5],
	[2.6, 1.5],
	[0, -3],
	[0, 3]
];

const PENDANTS: Record<MathouCollarId, readonly DecorationShape[]> = {
	bell: [
		{ kind: 'path', d: 'M-1.6 -0.4H1.6', fill: 'none', stroke: INK, width: 1.4, round: true },
		{ kind: 'circle', cx: 0, cy: 4.6, r: 4.6, fill: GOLD, stroke: INK, width: 1.4 },
		{ kind: 'path', d: 'M-3.4 4.4H3.4', fill: 'none', stroke: INK, width: 0.9 },
		{ kind: 'path', d: 'M0 5.6V9', fill: 'none', stroke: INK, width: 1.2, round: true },
		{ kind: 'circle', cx: 0, cy: 5.6, r: 1, fill: INK }
	],
	bow_tie: [
		{ kind: 'path', d: 'M0 3L-8 -1.5V8.5Z M0 3L8 -1.5V8.5Z', fill: RED, stroke: INK, width: 1.4 },
		{ kind: 'path', d: roundedRect(-2.2, 0.2, 4.4, 5.6, 1.2), fill: RED, stroke: INK, width: 1.4 }
	],
	leather: [
		{ kind: 'circle', cx: 0, cy: -0.2, r: 1.6, fill: 'none', stroke: INK, width: 1.2 },
		{ kind: 'circle', cx: 0, cy: 5.4, r: 4.4, fill: GOLD, stroke: INK, width: 1.4 },
		{ kind: 'circle', cx: 0, cy: 5.4, r: 2.6, fill: 'none', stroke: INK, width: 0.7 }
	],
	order_chain: [
		{ kind: 'circle', cx: 0, cy: 6, r: 5.4, fill: GOLD, stroke: INK, width: 1.4 },
		...COLANDER_HOLES.map(([cx, cy]): DecorationShape => ({
			kind: 'circle',
			cx,
			cy: r1(cy + 6),
			r: 0.85,
			fill: INK
		}))
	]
};

// Functions
function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
	return (
		`M${r1(x + r)} ${r1(y)}H${r1(x + w - r)}A${r} ${r} 0 0 1 ${r1(x + w)} ${r1(y + r)}` +
		`V${r1(y + h - r)}A${r} ${r} 0 0 1 ${r1(x + w - r)} ${r1(y + h)}` +
		`H${r1(x + r)}A${r} ${r} 0 0 1 ${r1(x)} ${r1(y + h - r)}` +
		`V${r1(y + r)}A${r} ${r} 0 0 1 ${r1(x + r)} ${r1(y)}Z`
	);
}

/**
 * Le cou d'un stade ; pendant la transformation d'un stade à l'autre (`from`, `t`
 * de 0 à 1), entre les deux. `underRuff` : la fraise est dessinée, ce qui pend
 * s'accroche sous elle.
 */
export function collarNeck(
	stage: MathouStage,
	underRuff: boolean,
	from?: MathouStage,
	t = 1
): CollarNeck {
	const a = NECK_AT[from ?? stage];
	const b = NECK_AT[stage];
	const y = a.y + (b.y - a.y) * t;
	const w = a.w + (b.w - a.w) * t;
	const s = r1(((w / 24.5) * 0.9 + 0.1) * 1.7);
	return { y: r1(y), w: r1(w), s, hang: underRuff ? r1(RUFF_BOTTOM - 1) : r1(y + 2) };
}

/** Courbe du collier : des bouts sur le contour, creusée au milieu */
function curve(n: CollarNeck): string {
	return `M${r1(100 - n.w)} ${r1(n.y - 2)}Q100 ${r1(n.y + 6)} ${r1(100 + n.w)} ${r1(n.y - 2)}`;
}

function pointOn(n: CollarNeck, t: number): [number, number] {
	const [x0, y0, x1, y1, x2, y2] = [100 - n.w, n.y - 2, 100, n.y + 6, 100 + n.w, n.y - 2];
	const u = 1 - t;
	return [
		r1(u * u * x0 + 2 * u * t * x1 + t * t * x2),
		r1(u * u * y0 + 2 * u * t * y1 + t * t * y2)
	];
}

/** Bande pleine, cernée d'encre */
function strap(n: CollarNeck, color: string, thick: number): DecorationShape[] {
	const d = curve(n);
	const width = r1(thick * n.s * 0.75);
	return [
		{ kind: 'path', d, fill: 'none', stroke: INK, width: r1(width + 2.4), round: true },
		{ kind: 'path', d, fill: 'none', stroke: color, width, round: true }
	];
}

function band(collar: MathouCollarId, n: CollarNeck): DecorationShape[] {
	switch (collar) {
		case 'bell':
			return strap(n, RED, 4);
		case 'bow_tie':
			return strap(n, INK, 1.6);
		case 'leather': {
			// Cuir clouté d'or
			const studs = Array.from({ length: 6 }, (_, i): DecorationShape => {
				const [cx, cy] = pointOn(n, (i + 0.5) / 6);
				return { kind: 'circle', cx, cy, r: 1.3, fill: GOLD };
			});
			return [...strap(n, LEATHER, 4.6), ...studs];
		}
		case 'order_chain': {
			// Plaques alternées or et rouge
			const h = r1(2.6 * n.s * 0.75);
			return Array.from({ length: 8 }, (_, i): DecorationShape => {
				const [x, y] = pointOn(n, (i + 0.5) / 8);
				return {
					kind: 'path',
					d: roundedRect(r1(x - h), r1(y - h * 0.8), r1(2 * h), r1(1.6 * h), 0.8),
					fill: i % 2 === 0 ? GOLD : RED,
					stroke: INK,
					width: 1.1
				};
			});
		}
	}
}

/** Le dessin d'un collier sur ce cou */
export function collarDrawing(collar: MathouCollarId, n: CollarNeck): CollarDrawing {
	return { band: band(collar, n), pendant: PENDANTS[collar] };
}
