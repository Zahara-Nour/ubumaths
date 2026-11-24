/**
 * Noms qui ne se chevauchent pas (écran)
 * =======================================
 *
 * À l'écran, le nom d'un point s'écrit en haut à droite du point, celui d'un
 * segment ou d'une demi-droite près de son milieu, celui d'une droite vers le
 * bout de sa partie visible. Ces places fixes se recouvrent dès que deux
 * objets se touchent : le nom « s » d'un segment sur celui de son milieu I,
 * le nom d'une droite sur celui d'un point posé près du bord, le nom de P sur
 * le petit carré d'angle droit tracé en P.
 *
 * `placeLabels` choisit, objet par objet, la première place libre parmi
 * quelques places candidates (la place habituelle d'abord : une figure sans
 * conflit ne bouge pas). Sont occupés : les noms déjà posés, les points, les
 * codages d'angle (arcs, carrés) et de longueur (traits), et le bord du
 * cadre. Les noms des points passent d'abord (dans l'ordre de la figure),
 * puis ceux des segments et demi-droites, puis ceux des droites : un nom de
 * droite se déplace le long d'elle plutôt que de chasser le nom d'un point.
 *
 * Un nom placé par l'auteur (`labelOffset`) ne bouge pas : il occupe sa place.
 * Rien ne change pour les exports (SVG, TikZ, Typst) : ce placement ne sert
 * qu'aux figures animées (constructions), qui le demandent.
 *
 * @module geometry-core/rendering/label-avoidance
 */

import type { Figure } from '../graph/figure';
import type { CoordinateTransformer } from '../viewport/viewport';
import type { GeoElement } from '../types/elements';
import { isPointElement } from '../types/elements';
import {
	angleToSVG,
	arcToSVG,
	lineToSVG,
	pointToSVG,
	rayToSVG,
	resolveScreenStyle,
	segmentMarkToSVG,
	segmentToSVG,
	type LineSVG
} from './svg-primitives';

// ============================================================================
// TYPES
// ============================================================================

/** Position SVG du texte : début de la ligne de base (`text-anchor: start`) */
export interface LabelPlacement {
	x: number;
	y: number;
}

/** Boîte SVG (y vers le bas) */
export interface LabelBox {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

interface Seg {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

interface Obstacles {
	boxes: LabelBox[];
	segs: Seg[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Taille des noms à l'écran (`.label` de GeometryCanvas) */
export const LABEL_FONT_SIZE_PX = 14;
/** Haut des lettres au-dessus de la ligne de base, en em */
const ASCENT_EM = 0.72;
/** Bas des lettres sous la ligne de base, en em */
const DESCENT_EM = 0.22;
/** Marge autour d'une boîte de nom (le halo blanc du texte) */
const PAD_PX = 1;
/** Pas d'échantillonnage d'un arc de codage */
const ARC_SAMPLES = 8;
/** Places essayées le long d'une droite (fraction de sa partie visible) */
const LINE_TS = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
/** Places essayées le long d'un segment ou d'une demi-droite */
const SEGMENT_TS = [0.5, 0.35, 0.65, 0.2, 0.8];

// ============================================================================
// FONCTIONS — boîtes
// ============================================================================

/** Largeur approchée d'un nom (police KaTeX_Main) */
export function labelWidth(text: string, fontSizePx = LABEL_FONT_SIZE_PX): number {
	let em = 0;
	for (const ch of text) {
		if (ch === '′' || ch === '″' || ch === '‴' || ch === "'") em += 0.3;
		else if (/[A-Z]/.test(ch)) em += 0.72;
		else if (/[mw]/.test(ch)) em += 0.8;
		else if (/[il1]/.test(ch)) em += 0.3;
		else em += 0.52;
	}
	return em * fontSizePx;
}

/** Boîte d'un nom écrit depuis `(x, y)` (début de la ligne de base) */
export function labelBox(
	text: string,
	at: LabelPlacement,
	fontSizePx = LABEL_FONT_SIZE_PX
): LabelBox {
	return {
		x0: at.x,
		y0: at.y - ASCENT_EM * fontSizePx,
		x1: at.x + labelWidth(text, fontSizePx),
		y1: at.y + DESCENT_EM * fontSizePx
	};
}

export function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
	return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function overlapArea(a: LabelBox, b: LabelBox): number {
	const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
	const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
	return w > 0 && h > 0 ? w * h : 0;
}

function inflate(b: LabelBox, d: number): LabelBox {
	return { x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d };
}

/** Le segment coupe-t-il la boîte (Liang-Barsky) ? */
export function segmentHitsBox(s: Seg, b: LabelBox): boolean {
	const dx = s.x2 - s.x1;
	const dy = s.y2 - s.y1;
	let t0 = 0;
	let t1 = 1;
	const clip = (p: number, q: number): boolean => {
		if (Math.abs(p) < 1e-12) return q >= 0;
		const r = q / p;
		if (p < 0) {
			if (r > t1) return false;
			if (r > t0) t0 = r;
		} else {
			if (r < t0) return false;
			if (r < t1) t1 = r;
		}
		return true;
	};
	return (
		clip(-dx, s.x1 - b.x0) &&
		clip(dx, b.x1 - s.x1) &&
		clip(-dy, s.y1 - b.y0) &&
		clip(dy, b.y1 - s.y1)
	);
}

// ============================================================================
// FONCTIONS — obstacles
// ============================================================================

/**
 * Traits d'un chemin SVG de codage ou d'arc : `M … L … L …` (carré d'angle
 * droit) ou `M sx sy A r r 0 grand sens ex ey` (arc, échantillonné). Le
 * centre de l'arc se déduit de ses deux bouts (formule de la norme SVG).
 */
export function pathSegments(path: string): Seg[] {
	const nums = (path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
	if (path.includes('A') && nums.length >= 9) {
		const [sx, sy, r, , , largeArc, sweepFlag, ex, ey] = nums;
		const hx = (sx - ex) / 2;
		const hy = (sy - ey) / 2;
		const h2 = hx * hx + hy * hy;
		if (h2 < 1e-12 || r <= 0) return [];
		const sign = largeArc !== sweepFlag ? 1 : -1;
		const coef = sign * Math.sqrt(Math.max(0, (r * r - h2) / h2));
		const cx = coef * hy + (sx + ex) / 2;
		const cy = -coef * hx + (sy + ey) / 2;
		const a0 = Math.atan2(sy - cy, sx - cx);
		let d = Math.atan2(ey - cy, ex - cx) - a0;
		if (sweepFlag === 1) while (d <= 0) d += 2 * Math.PI;
		else while (d >= 0) d -= 2 * Math.PI;
		const rr = Math.max(r, Math.sqrt(h2));
		const segs: Seg[] = [];
		let px = sx;
		let py = sy;
		for (let i = 1; i <= ARC_SAMPLES; i++) {
			const a = a0 + (d * i) / ARC_SAMPLES;
			const qx = cx + rr * Math.cos(a);
			const qy = cy + rr * Math.sin(a);
			segs.push({ x1: px, y1: py, x2: qx, y2: qy });
			px = qx;
			py = qy;
		}
		return segs;
	}
	const segs: Seg[] = [];
	for (let i = 2; i + 1 < nums.length; i += 2) {
		segs.push({ x1: nums[i - 2], y1: nums[i - 1], x2: nums[i], y2: nums[i + 1] });
	}
	return segs;
}

function collectObstacles(
	elements: readonly GeoElement[],
	figure: Figure,
	transformer: CoordinateTransformer
): Obstacles {
	const obstacles: Obstacles = { boxes: [], segs: [] };
	for (const el of elements) {
		if (isPointElement(el)) {
			const pt = pointToSVG(el.id, figure, transformer);
			if (!pt) continue;
			const r = resolveScreenStyle(el, figure.defaults).pointSize + PAD_PX;
			obstacles.boxes.push({ x0: pt.cx - r, y0: pt.cy - r, x1: pt.cx + r, y1: pt.cy + r });
		} else if (el.type === 'angle') {
			const svg = angleToSVG(el.id, figure, transformer);
			if (!svg) continue;
			for (const path of svg.paths) obstacles.segs.push(...pathSegments(path));
		} else if (el.type === 'arcByAngles' || el.type === 'arcByPoints') {
			const svg = arcToSVG(el.id, figure, transformer);
			if (svg) obstacles.segs.push(...pathSegments(svg.path));
		} else if (el.type === 'segmentMark') {
			const svg = segmentMarkToSVG(el.id, figure, transformer);
			if (svg) obstacles.segs.push(...svg.ticks);
		}
	}
	return obstacles;
}

// ============================================================================
// FONCTIONS — places candidates
// ============================================================================

/** Places d'un nom de point, la place habituelle (en haut à droite) d'abord */
function pointCandidates(cx: number, cy: number, ps: number, w: number): LabelPlacement[] {
	const fs = LABEL_FONT_SIZE_PX;
	const right = cx + ps + 4;
	const left = cx - ps - 4 - w;
	const centre = cx - w / 2;
	const above = cy - (ps + 2);
	const below = cy + ps + 2 + ASCENT_EM * fs;
	const middle = cy + (ASCENT_EM * fs) / 2;
	return [
		{ x: right, y: above },
		{ x: left, y: above },
		{ x: right, y: below },
		{ x: left, y: below },
		{ x: right, y: middle },
		{ x: left, y: middle },
		{ x: centre, y: cy - ps - 4 },
		{ x: centre, y: below + 2 }
	];
}

/** Places d'un nom de segment ou de demi-droite : le long du trait, d'un côté puis de l'autre */
function segmentCandidates(svg: LineSVG, w: number): LabelPlacement[] {
	const out: LabelPlacement[] = [];
	for (const t of SEGMENT_TS) {
		const mx = svg.x1 + t * (svg.x2 - svg.x1);
		const my = svg.y1 + t * (svg.y2 - svg.y1);
		out.push({ x: mx + 6, y: my - 8 });
		out.push({ x: mx - 6 - w, y: my + 8 + ASCENT_EM * LABEL_FONT_SIZE_PX });
	}
	return out;
}

/** Places d'un nom de droite : vers le bout visible d'abord, d'un côté puis de l'autre */
function lineCandidates(svg: LineSVG): LabelPlacement[] {
	const dx = svg.x2 - svg.x1;
	const dy = svg.y2 - svg.y1;
	const len = Math.sqrt(dx * dx + dy * dy) || 1;
	const nx = -dy / len;
	const ny = dx / len;
	const sign = ny > 0 ? -1 : 1;
	const offset = 10 + 5 * Math.abs(nx);
	const out: LabelPlacement[] = [];
	for (const t of LINE_TS) {
		const mx = svg.x1 + t * dx;
		const my = svg.y1 + t * dy;
		out.push({ x: mx + sign * nx * offset, y: my + sign * ny * offset });
		out.push({ x: mx - sign * nx * offset, y: my - sign * ny * offset });
	}
	return out;
}

/** Place par défaut du nom (celle d'avant ce module), pour un nom placé à la main */
function defaultPlacement(
	el: GeoElement,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): { at: LabelPlacement; candidates: (w: number) => LabelPlacement[] } | null {
	if (isPointElement(el)) {
		const pt = pointToSVG(el.id, figure, transformer);
		if (!pt) return null;
		const ps = resolveScreenStyle(el, figure.defaults).pointSize;
		const off = el.labelOffset;
		return {
			at: off
				? { x: pt.cx + off.dx, y: pt.cy + off.dy }
				: { x: pt.cx + ps + 4, y: pt.cy - (ps + 2) },
			candidates: (w) => pointCandidates(pt.cx, pt.cy, ps, w)
		};
	}
	if (el.type === 'segment' || el.type === 'ray') {
		const svg =
			el.type === 'segment'
				? segmentToSVG(el.id, figure, transformer)
				: rayToSVG(el.id, figure, transformer, dims);
		if (!svg) return null;
		const off = el.labelOffset ?? { dx: 6, dy: -8 };
		return {
			at: { x: (svg.x1 + svg.x2) / 2 + off.dx, y: (svg.y1 + svg.y2) / 2 + off.dy },
			candidates: (w) => segmentCandidates(svg, w)
		};
	}
	if (el.type === 'line') {
		const svg = lineToSVG(el.id, figure, transformer, dims);
		if (!svg) return null;
		const candidates = lineCandidates(svg);
		const first = candidates[0];
		const off = el.labelOffset;
		const t = LINE_TS[0];
		return {
			at: off
				? { x: svg.x1 + t * (svg.x2 - svg.x1) + off.dx, y: svg.y1 + t * (svg.y2 - svg.y1) + off.dy }
				: first,
			candidates: () => candidates
		};
	}
	return null;
}

function labelRank(el: GeoElement): number {
	if (isPointElement(el)) return 0;
	if (el.type === 'segment' || el.type === 'ray') return 1;
	return 2;
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

/**
 * Place les noms des points, segments, demi-droites et droites visibles de la
 * figure sans qu'ils se chevauchent. Rend, par id d'élément, la position SVG
 * du texte (début de la ligne de base).
 */
export function placeLabels(
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): Map<string, LabelPlacement> {
	const placements = new Map<string, LabelPlacement>();
	const elements = figure.getAllElements().filter((el) => el.visible);
	const obstacles = collectObstacles(elements, figure, transformer);
	const frame: LabelBox = { x0: 0, y0: 0, x1: dims.width, y1: dims.height };

	const named = elements.filter((el) => el.label && !(isPointElement(el) && el.labelHidden));
	const fixed = named.filter((el) => el.labelOffset);
	const free = named
		.filter((el) => !el.labelOffset)
		.map((el, i) => ({ el, i }))
		.sort((a, b) => labelRank(a.el) - labelRank(b.el) || a.i - b.i)
		.map(({ el }) => el);

	// Un nom placé à la main occupe sa place
	for (const el of fixed) {
		const place = defaultPlacement(el, figure, transformer, dims);
		if (!place || !el.label) continue;
		placements.set(el.id, place.at);
		obstacles.boxes.push(labelBox(el.label, place.at));
	}

	for (const el of free) {
		const text = el.label;
		const place = defaultPlacement(el, figure, transformer, dims);
		if (!place || !text) continue;
		let best: LabelPlacement | null = null;
		let bestCost = Infinity;
		for (const at of place.candidates(labelWidth(text))) {
			const box = labelBox(text, at);
			const hit = inflate(box, PAD_PX);
			let cost = 0;
			for (const b of obstacles.boxes) cost += overlapArea(hit, b);
			for (const s of obstacles.segs) if (segmentHitsBox(s, hit)) cost += 50;
			const inFrame = box.x0 >= 0 && box.y0 >= 0 && box.x1 <= frame.x1 && box.y1 <= frame.y1;
			if (!inFrame) cost += 1000;
			if (cost < bestCost) {
				best = at;
				bestCost = cost;
			}
			if (cost === 0) break;
		}
		const chosen = best ?? place.at;
		placements.set(el.id, chosen);
		obstacles.boxes.push(labelBox(text, chosen));
	}
	return placements;
}
