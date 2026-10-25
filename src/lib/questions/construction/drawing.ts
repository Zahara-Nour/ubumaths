/**
 * Tracé de l'élève dans une case « figure » (bloc ```figure-a-completer)
 * ==================================================================
 *
 * Logique PURE de l'écran : toucher un point puis un autre trace une droite ;
 * près d'un point de la figure, le toucher est aimanté sur lui ; « Effacer »
 * enlève le départ en attente, sinon la dernière droite. Comportements validés
 * par David le 2026-10-25 (`docs/wip/geometrie-validation-progress.md` § 5).
 *
 * Aucune dépendance à geometry-core : les positions des points sont données
 * par l'appelant (la scène déjà calculée pour dessiner la figure).
 *
 * @module questions/construction/drawing
 */

import type { ConstructionCheck } from '$lib/ubumark/types/construction';
import { CONSTRUCTION_ANSWER_LIMITS, serializeConstructionAnswer, type DrawnLine } from './answer';
import type { Position } from './judge';

/** Rayon d'aimantation, en pixels À L'ÉCRAN (un doigt d'enfant sur tablette) */
export const SNAP_RADIUS_PX = 24;

/** Toucher hors d'un point : arrondi au centième d'unité (réponse courte, ~0,4 px) */
const FREE_TAP_DECIMALS = 2;

/** Deux touchers plus proches que ça : le même endroit (pas de droite) */
const SAME_TAP_EPSILON = 1e-9;

/** Ce que l'élève a tracé, et le départ d'une droite en attente du second toucher */
export interface Drawing {
	lines: DrawnLine[];
	start: Position | null;
}

export interface FigureWindow {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

function round(value: number): number {
	const factor = 10 ** FREE_TAP_DECIMALS;
	// `+ 0` : jamais de « -0 » dans la réponse
	return Math.round(value * factor) / factor + 0;
}

/**
 * Endroit retenu pour un toucher : le point de la figure le plus proche dans
 * le rayon (position exacte), sinon l'endroit touché, arrondi.
 *
 * @param radius - Rayon d'aimantation, en unités de la figure
 */
export function snapTap(
	tap: Position,
	points: ReadonlyMap<string, Position>,
	radius: number
): Position {
	let best: Position | null = null;
	let bestDistance = Infinity;
	for (const position of points.values()) {
		const distance = Math.hypot(position.x - tap.x, position.y - tap.y);
		if (distance <= radius && distance < bestDistance) {
			best = position;
			bestDistance = distance;
		}
	}
	return best ? { x: best.x, y: best.y } : { x: round(tap.x), y: round(tap.y) };
}

/**
 * Un toucher : premier → départ ; second → la droite. Toucher le départ une
 * seconde fois ne fait rien ; au-delà des plafonds du juge, la droite n'est
 * pas ajoutée (elle rendrait la réponse illisible).
 */
export function addTap(drawing: Drawing, position: Position): Drawing {
	const { start } = drawing;
	if (!start) return { lines: drawing.lines, start: position };
	if (Math.hypot(position.x - start.x, position.y - start.y) <= SAME_TAP_EPSILON) return drawing;
	const line: DrawnLine = {
		kind: 'droite',
		x1: start.x,
		y1: start.y,
		x2: position.x,
		y2: position.y
	};
	const lines = [...drawing.lines, line];
	if (
		lines.length > CONSTRUCTION_ANSWER_LIMITS.objects ||
		serializeConstructionAnswer(lines).length > CONSTRUCTION_ANSWER_LIMITS.chars
	) {
		return { lines: drawing.lines, start: null };
	}
	return { lines, start: null };
}

/** « Effacer » : le départ en attente, sinon la dernière droite */
export function eraseLast(drawing: Drawing): Drawing {
	if (drawing.start) return { lines: drawing.lines, start: null };
	return { lines: drawing.lines.slice(0, -1), start: null };
}

export function canErase(drawing: Drawing): boolean {
	return drawing.start !== null || drawing.lines.length > 0;
}

/** Bonne(s) droite(s) : une par vérification, par ses deux points */
export function solutionLines(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>
): DrawnLine[] {
	return checks.flatMap((check): DrawnLine[] => {
		const a = points.get(check.points[0]);
		const b = points.get(check.points[1]);
		if (!a || !b) return [];
		return [{ kind: 'droite', x1: a.x, y1: a.y, x2: b.x, y2: b.y }];
	});
}

/**
 * La droite, découpée aux bords de la fenêtre (elle « dépasse des deux
 * côtés ») ; null si elle ne traverse pas la fenêtre.
 */
export function clipLineToWindow(
	line: DrawnLine,
	window: FigureWindow
): { x1: number; y1: number; x2: number; y2: number } | null {
	const dx = line.x2 - line.x1;
	const dy = line.y2 - line.y1;
	let tMin = -Infinity;
	let tMax = Infinity;
	// Liang-Barsky, sur la droite entière (t de -∞ à +∞)
	const sides: [number, number][] = [
		[-dx, line.x1 - window.xMin],
		[dx, window.xMax - line.x1],
		[-dy, line.y1 - window.yMin],
		[dy, window.yMax - line.y1]
	];
	for (const [p, q] of sides) {
		if (p === 0) {
			if (q < 0) return null;
			continue;
		}
		const t = q / p;
		if (p < 0) tMin = Math.max(tMin, t);
		else tMax = Math.min(tMax, t);
	}
	if (tMin > tMax || !Number.isFinite(tMin) || !Number.isFinite(tMax)) return null;
	return {
		x1: line.x1 + tMin * dx,
		y1: line.y1 + tMin * dy,
		x2: line.x1 + tMax * dx,
		y2: line.y1 + tMax * dy
	};
}
