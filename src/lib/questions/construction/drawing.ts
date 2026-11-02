/**
 * Tracé de l'élève dans une case « figure » (bloc ```figure-a-completer)
 * ==================================================================
 *
 * Logique PURE de l'écran : toucher un point puis un autre trace une droite ;
 * près d'un point de la figure, le toucher est aimanté sur lui ; outil point :
 * un toucher place un point ; « Effacer » enlève le départ en attente, sinon
 * le dernier objet. Comportements validés
 * par David le 2026-10-25 (`docs/wip/geometrie-validation-progress.md` § 5).
 *
 * Aucune dépendance à geometry-core : les positions des points sont données
 * par l'appelant (la scène déjà calculée pour dessiner la figure).
 *
 * @module questions/construction/drawing
 */

import type { ConstructionCheck, ConstructionTool } from '$lib/ubumark/types/construction';
import type { FigureStep } from '$lib/ubumark/types/figure';
import {
	CONSTRUCTION_ANSWER_LIMITS,
	isDrawnLine,
	serializeConstructionAnswer,
	type DrawnLine,
	type DrawnObject
} from './answer';
import type { Position } from './judge';
import { isPointCheck, pointSolution, type ExpectedPoints, type PointSolution } from './point';
import { polygonSolution } from './polygon';
import { symmetrySolution, type FigureShapes } from './symmetry';

/** Rayon d'aimantation, en pixels À L'ÉCRAN (un doigt d'enfant sur tablette) */
export const SNAP_RADIUS_PX = 24;

/** Toucher hors d'un point : arrondi au centième d'unité (réponse courte, ~0,4 px) */
const FREE_TAP_DECIMALS = 2;

/** Deux touchers plus proches que ça : le même endroit (pas de droite) */
const SAME_TAP_EPSILON = 1e-9;

/** Case « figure » d'une question, telle que l'écran la passe à la figure */
export interface ConstructionAnswerInput {
	/** Réponse déjà tracée (`droite(…)|…`), '' sinon */
	value: string;
	/** true juste, false faux, null pas encore corrigé */
	isCorrect: boolean | null;
	disabled: boolean;
	onChange: (value: string) => void;
}

/** Ce que l'élève a tracé ou placé, et le départ d'une droite en attente du second toucher */
export interface Drawing {
	objects: DrawnObject[];
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
 * Quadrillage avec l'outil segment (CP-060) : chaque toucher va au nœud le
 * plus proche (plus de toucher libre, verdict du conseil § 2).
 */
export function snapToGrid(tap: Position, grid: FigureStep, window?: FigureWindow): Position {
	const node = (value: number, step: number, min: number, max: number) => {
		let n = Math.round(value / step) * step;
		// Bord de fenêtre hors des nœuds : rester sur un nœud de la fenêtre
		if (n < min - 1e-9) n += step;
		else if (n > max + 1e-9) n -= step;
		// `+ 0` : jamais de « -0 » dans la réponse
		return n + 0;
	};
	return {
		x: node(tap.x, grid.x, window?.xMin ?? -Infinity, window?.xMax ?? Infinity),
		y: node(tap.y, grid.y, window?.yMin ?? -Infinity, window?.yMax ?? Infinity)
	};
}

/** L'objet ajouté, sauf au-delà des plafonds du juge (il rendrait la réponse illisible) */
function withObject(drawing: Drawing, object: DrawnObject): Drawing {
	const objects = [...drawing.objects, object];
	if (
		objects.length > CONSTRUCTION_ANSWER_LIMITS.objects ||
		serializeConstructionAnswer(objects).length > CONSTRUCTION_ANSWER_LIMITS.chars
	) {
		return { objects: drawing.objects, start: null };
	}
	return { objects, start: null };
}

/**
 * Un toucher : outil point → le point (rien s'il y est déjà) ; sinon premier → départ ; second → la
 * droite (ou le segment, qui s'arrête à ses deux bouts). Toucher le départ une
 * seconde fois ne fait rien.
 */
export function addTap(
	drawing: Drawing,
	position: Position,
	tool: ConstructionTool = 'droite'
): Drawing {
	if (tool === 'point') {
		// Toucher un point déjà posé (double toucher) ne fait rien, comme le départ d'un trait
		const placed = drawing.objects.some(
			(o) =>
				o.kind === 'point' && Math.hypot(o.x - position.x, o.y - position.y) <= SAME_TAP_EPSILON
		);
		if (placed) return { objects: drawing.objects, start: null };
		return withObject(drawing, { kind: 'point', x: position.x, y: position.y });
	}
	const { start } = drawing;
	if (!start) return { objects: drawing.objects, start: position };
	if (Math.hypot(position.x - start.x, position.y - start.y) <= SAME_TAP_EPSILON) return drawing;
	return withObject(drawing, {
		kind: tool,
		x1: start.x,
		y1: start.y,
		x2: position.x,
		y2: position.y
	});
}

/** « Effacer » : le départ en attente, sinon le dernier objet */
export function eraseLast(drawing: Drawing): Drawing {
	if (drawing.start) return { objects: drawing.objects, start: null };
	return { objects: drawing.objects.slice(0, -1), start: null };
}

export function canErase(drawing: Drawing): boolean {
	return drawing.start !== null || drawing.objects.length > 0;
}

/**
 * La bonne figure : une droite par vérification `droite_par`, par ses deux
 * points ; carré / rectangle : les côtés qui manquent (carré : du côté où
 * l'élève a le plus tracé, d'où `drawn`) ; symétrique : l'image, sans ce que
 * la figure de départ trace déjà (`shapes`).
 */
export function solutionLines(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>,
	drawn: readonly DrawnObject[] = [],
	shapes?: FigureShapes
): DrawnLine[] {
	return checks.flatMap((check): DrawnLine[] => {
		if (check.kind === 'point') return [];
		if (check.kind === 'symetrique') return symmetrySolution(check, points, shapes);
		if (check.kind !== 'droite_par')
			return polygonSolution(check, points, drawn.filter(isDrawnLine));
		const a = points.get(check.points[0]);
		const b = points.get(check.points[1]);
		if (!a || !b) return [];
		return [{ kind: 'droite', x1: a.x, y1: a.y, x2: b.x, y2: b.y }];
	});
}

/** Les points à placer : où ils vont, avec leur nom (vérifications `point`) */
export function solutionPoints(
	checks: readonly ConstructionCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>
): PointSolution[] {
	return pointSolution(checks.filter(isPointCheck), expected, points);
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
