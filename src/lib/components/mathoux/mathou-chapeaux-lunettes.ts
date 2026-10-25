/**
 * Dessins des lunettes et des chapeaux des Mathoux (lot D des accessoires)
 * ========================================================================
 *
 * Versions choisies par David sur la planche (2026-10-25,
 * `scripts/mathoux-planches/chapeaux-lunettes.test.ts`) : lunettes rondes B
 * (monture dorée), lunettes de soleil A (verres noirs), monocle A (d'or à
 * chaînette), pince-nez A (doré, cordon noir), lunettes à gidouille A (spirales
 * noires) ; chapeau melon A (noir, ruban rouge), béret A (rouge), canotier A
 * (ruban rouge), haut-de-forme A (noir à ruban rouge), chapeau pointu B (noir à
 * la lune d'or).
 *
 * Chaque pièce est dessinée dans un repère propre à la tête du matou (demi-largeur
 * de tête 26) : les lunettes centrées entre les yeux (yeux en x = ±10,9), le
 * chapeau posé au sommet de la tête (son bord vers y = -1). La pose (`*Placement`)
 * ramène ce repère à la tête du stade ; les épaisseurs de trait sont divisées par
 * l'échelle, pour rester les mêmes à l'écran.
 *
 * Règles du dessin (phase 0, 2026-10-25) : chez le grand matou, le chapeau
 * remplace la couronne ; en sieste, ni lunettes ni chapeau (bonnet de nuit).
 */

import type { MathouGlassesId, MathouHatId } from '$lib/mathoux/decorations';
import type { DecorationShape } from './mathou-decorations';
import { CREAM, INK, RED, type PearGeometry } from './mathou-dessin';

// Types
export interface AccessoryPlacement {
	x: number;
	y: number;
	/** Échelle du repère de la pièce */
	s: number;
}

// Constantes
const GOLD = 'hsl(44, 85%, 58%)';
/** Noir de chapeau : un ton au-dessus de l'encre, pour que le contour se lise sur un chat noir */
const HAT_BLACK = 'hsl(220, 18%, 22%)';
const STRAW = 'hsl(38, 62%, 60%)';
const STRAW_LIGHT = 'hsl(40, 70%, 72%)';
/** Écart des yeux du matou (`hw * 0.42`) */
const EX = 10.9;
/** Demi-largeur de tête du repère des pièces (celle du matou) */
const HEAD_HW = 26;
/** Chapeau borné : énorme sur la grosse tête du chaton, minuscule sur le grand matou sinon */
const HAT_SCALE_MIN = 0.92;
const HAT_SCALE_MAX = 1.35;

const r1 = (n: number): number => Math.round(n * 10) / 10;
const r2 = (n: number): number => Math.round(n * 100) / 100;

// Functions
function circleD(cx: number, cy: number, r: number): string {
	return `M${r1(cx - r)} ${cy}A${r} ${r} 0 1 0 ${r1(cx + r)} ${cy}A${r} ${r} 0 1 0 ${r1(cx - r)} ${cy}Z`;
}

/** Ellipse, tournée de `deg` degrés autour de son centre */
function ellipseD(cx: number, cy: number, rx: number, ry: number, deg = 0): string {
	const a = (deg * Math.PI) / 180;
	const dx = rx * Math.cos(a);
	const dy = rx * Math.sin(a);
	const [x0, y0, x1, y1] = [r1(cx - dx), r1(cy - dy), r1(cx + dx), r1(cy + dy)];
	return `M${x0} ${y0}A${rx} ${ry} ${deg} 1 0 ${x1} ${y1}A${rx} ${ry} ${deg} 1 0 ${x0} ${y0}Z`;
}

function roundedRectD(x: number, y: number, w: number, h: number, r: number): string {
	return (
		`M${r1(x + r)} ${r1(y)}H${r1(x + w - r)}A${r} ${r} 0 0 1 ${r1(x + w)} ${r1(y + r)}` +
		`V${r1(y + h - r)}A${r} ${r} 0 0 1 ${r1(x + w - r)} ${r1(y + h)}` +
		`H${r1(x + r)}A${r} ${r} 0 0 1 ${r1(x)} ${r1(y + h - r)}` +
		`V${r1(y + r)}A${r} ${r} 0 0 1 ${r1(x + r)} ${r1(y)}Z`
	);
}

/** Spirale de la gidouille, centrée en (x, y) */
function spiralD(turns: number, r: number, x = 0, y = 0): string {
	let d = `M${x} ${y}`;
	const steps = turns * 24;
	for (let i = 1; i <= steps; i++) {
		const a = (i / 24) * 2 * Math.PI;
		const rr = (r * i) / steps;
		d += `L${r1(x + rr * Math.cos(a))} ${r1(y + rr * Math.sin(a))}`;
	}
	return d;
}

function starD(x: number, y: number, r: number): string {
	const q = r * 0.32;
	return `M${x} ${r1(y - r)}Q${r1(x + q)} ${r1(y - q)} ${r1(x + r)} ${y}Q${r1(x + q)} ${r1(y + q)} ${x} ${r1(y + r)}Q${r1(x - q)} ${r1(y + q)} ${r1(x - r)} ${y}Q${r1(x - q)} ${r1(y - q)} ${x} ${r1(y - r)}Z`;
}

/** Un trait aux bouts arrondis */
function line(d: string, color: string, width: number, u: number): DecorationShape {
	return { kind: 'path', d, fill: 'none', stroke: color, width: r1(width * u), round: true };
}

/** Monture : un trait d'encre ; en couleur, la couleur cernée d'encre */
function rim(d: string, color: string, u: number): DecorationShape[] {
	if (color === INK) return [{ kind: 'path', d, fill: 'none', stroke: INK, width: r1(1.9 * u) }];
	return [
		{ kind: 'path', d, fill: 'none', stroke: INK, width: r1(2.8 * u) },
		{ kind: 'path', d, fill: 'none', stroke: color, width: r1(1.5 * u) }
	];
}

/** Verre teinté clair : on voit l'œil au travers, et la forme du verre se lit sur un chat noir */
function tint(d: string): DecorationShape {
	return { kind: 'path', d, fill: CREAM, fillOpacity: 0.3 };
}

/** Pièce pleine cernée d'encre (chapeaux) */
function solid(d: string, fill: string, u: number, width = 2.4): DecorationShape {
	return { kind: 'path', d, fill, stroke: INK, width: r1(width * u) };
}

const BRIDGE = 'M-3.7 -1.2Q0 -4 3.7 -1.2';
const ARMS = 'M-18.1 -1.5L-24 -3M18.1 -1.5L24 -3';

function roundGlasses(u: number): DecorationShape[] {
	return [
		...[-EX, EX].flatMap((x) => {
			const d = circleD(x, 0, 7.2);
			return [tint(d), ...rim(d, GOLD, u)];
		}),
		...rim(BRIDGE, GOLD, u),
		...rim(ARMS, GOLD, u)
	];
}

function sunglasses(u: number): DecorationShape[] {
	return [
		...[-EX, EX].flatMap((x) => [
			solid(roundedRectD(r1(x - 7.4), -5.6, 14.8, 10.6, 3.6), INK, u, 1.9),
			line(`M${r1(x - 4)} -2.4L${r1(x - 1.6)} -3.8`, CREAM, 1.3, u)
		]),
		line('M-3.6 -2.6Q0 -4.2 3.6 -2.6M-18.4 -2L-24 -3.2M18.4 -2L24 -3.2', INK, 1.9, u)
	];
}

function monocle(u: number): DecorationShape[] {
	const d = circleD(EX, 0, 7.6);
	return [
		{
			kind: 'path',
			d: `M${r1(EX + 5.4)} 5.4Q${r1(EX + 10)} 16 ${r1(EX + 3)} 27`,
			fill: 'none',
			stroke: GOLD,
			width: r1(1.6 * u),
			// Chaînette : des maillons
			dash: `${r1(1.6 * u)} ${r1(1.1 * u)}`
		},
		tint(d),
		...rim(d, GOLD, u)
	];
}

function pinceNez(u: number): DecorationShape[] {
	return [
		line(`M${r1(-EX - 5.8)} 2Q${r1(-EX - 10)} 14 ${r1(-EX - 4)} 25`, INK, 1.3, u),
		...[-EX, EX].flatMap((x) => {
			const d = ellipseD(x, 1.2, 5.8, 5);
			return [tint(d), ...rim(d, GOLD, u)];
		}),
		...rim('M-5.1 0.4Q0 -5.6 5.1 0.4', GOLD, u)
	];
}

function spiralGlasses(u: number): DecorationShape[] {
	return [
		...[-EX, EX].flatMap((x) => {
			const d = circleD(x, 0, 7.2);
			return [
				{ kind: 'path', d, fill: CREAM } as const,
				line(spiralD(2.5, 5.8, x, 0), INK, 1.1, u),
				...rim(d, INK, u)
			];
		}),
		...rim(BRIDGE, INK, u),
		...rim(ARMS, INK, u)
	];
}

function bowler(u: number): DecorationShape[] {
	return [
		solid(ellipseD(0, 0, 18.5, 3.6), HAT_BLACK, u),
		solid('M-13 0C-13.5 -25 13.5 -25 13 0Q0 2.6 -13 0Z', HAT_BLACK, u),
		solid('M-13 -1.4L-12.8 -6Q0 -3.8 12.8 -6L13 -1.4Q0 1 -13 -1.4Z', RED, u, 1.4),
		line('M-6 -15Q-4 -17.5 -1 -18.2', CREAM, 1.4, u)
	];
}

function beret(u: number): DecorationShape[] {
	return [
		line('M4 -13.5Q4.4 -17.5 7 -19.4', INK, 2.4, u),
		solid(ellipseD(2, -7, 19, 7.6, -8), RED, u),
		solid('M-14.5 -2Q0 2 14.5 -2L14.5 1Q0 5 -14.5 1Z', RED, u),
		line('M-9 -10Q-4 -12.6 2 -12.6', CREAM, 1.3, u)
	];
}

function boater(u: number): DecorationShape[] {
	return [
		solid(ellipseD(0, 0, 22, 4.2), STRAW, u),
		line('M-19 0.6L-16.5 2.2M-14 2.6L-11.8 3.6M14 2.6L11.8 3.6M19 0.6L16.5 2.2', INK, 0.8, u),
		solid('M-12 0V-11Q0 -13.5 12 -11V0Q0 2.5 -12 0Z', STRAW, u),
		solid(ellipseD(0, -11.2, 12, 2.4), STRAW_LIGHT, u),
		solid('M-12 -1.4V-5.6Q0 -3.4 12 -5.6V-1.4Q0 0.8 -12 -1.4Z', RED, u, 1.4)
	];
}

function topHat(u: number): DecorationShape[] {
	return [
		solid(ellipseD(0, -1, 20, 4), HAT_BLACK, u),
		solid('M-11 0L-12.5 -30Q0 -33 12.5 -30L11 0Q0 3 -11 0Z', HAT_BLACK, u),
		line('M-12.3 -29.6Q0 -27 12.3 -29.6', INK, 1.2, u),
		solid('M-11.3 -4.6L-11.8 -11.4Q0 -9 11.8 -11.4L11.3 -4.6Q0 -2.2 -11.3 -4.6Z', RED, u, 1.4)
	];
}

function pointedHat(u: number): DecorationShape[] {
	return [
		solid(ellipseD(0, -1, 20, 4), HAT_BLACK, u),
		solid(
			'M-14 0Q-4 -14 2 -31Q4 -34.5 8.5 -33.5Q5 -29.5 4 -24Q7 -12 14 0Q0 3 -14 0Z',
			HAT_BLACK,
			u
		),
		// Lune et étoile d'or
		solid('M1.5 -18A6 6 0 1 0 6.5 -8A4.6 4.6 0 1 1 1.5 -18Z', GOLD, u, 1),
		solid(starD(-5, -6, 2.2), GOLD, u, 1)
	];
}

const GLASSES: Record<MathouGlassesId, (u: number) => DecorationShape[]> = {
	round_glasses: roundGlasses,
	sunglasses,
	monocle,
	pince_nez: pinceNez,
	spiral_glasses: spiralGlasses
};

const HATS: Record<MathouHatId, (u: number) => DecorationShape[]> = {
	bowler,
	beret,
	boater,
	top_hat: topHat,
	pointed_hat: pointedHat
};

/** Où se posent les lunettes : entre les yeux, à l'échelle de la tête */
export function glassesPlacement(geo: PearGeometry): AccessoryPlacement {
	return { x: geo.hx, y: geo.hy, s: r2(geo.stage.hw / HEAD_HW) };
}

/** Où se pose le chapeau : au sommet de la tête, à une échelle bornée */
export function hatPlacement(geo: PearGeometry): AccessoryPlacement {
	const k = geo.stage.hw / HEAD_HW;
	return {
		x: geo.hx,
		y: geo.stage.top,
		s: r2(Math.min(Math.max(k, HAT_SCALE_MIN), HAT_SCALE_MAX))
	};
}

/** Le dessin des lunettes, pour une pose à l'échelle `s` */
export function glassesDrawing(id: MathouGlassesId, s: number): DecorationShape[] {
	return GLASSES[id](1 / s);
}

/** Le dessin du chapeau, pour une pose à l'échelle `s` */
export function hatDrawing(id: MathouHatId, s: number): DecorationShape[] {
	return HATS[id](1 / s);
}
