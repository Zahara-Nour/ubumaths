/**
 * Intersections between plotted curves.
 *
 * The search itself is `findRoots` from mathAST — exact symbolic solving first,
 * numeric bisection as a fallback. This module only holds the grapheur's glue:
 * pairing the visible curves, keeping what falls inside the viewport, and
 * merging points that land on top of each other.
 *
 * It used to carry its own sweep-and-bisect implementation. That one could only
 * see a sign change, so a tangency was found by luck — when its abscissa
 * happened to fall on one of the 200 sample points — and missed otherwise.
 *
 * @module grapheur/intersections
 */

import type { Point, Viewport } from './types';
import type { AnalysisASTInfo, AnalysisInput } from './analysis';
import { isInsideRestriction } from './restriction';
import { subtract } from '$lib/mathAST/factory';
import { compile } from '$lib/mathAST/eval/compile';
import { findRoots } from '$lib/mathAST/analysis/roots';
import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Types
// =============================================================================

/** One intersection point, and the two curves that meet there. */
export interface IntersectionResult {
	readonly point: Point;
	readonly functionIds: readonly [string, string];
}

// =============================================================================
// Constants
// =============================================================================

/** Default distance below which two intersection points are considered one. */
const DEFAULT_DEDUP_TOLERANCE = 0.001;

/** Fenêtres gardées par paire avant que son cache ne soit vidé. */
const MAX_WINDOWS_PER_PAIR = 200;

// =============================================================================
// Cache
// =============================================================================

/**
 * Intersections, par paire d'expressions puis par fenêtre.
 *
 * Les points de croisement ne dépendent que des deux expressions et de la
 * fenêtre. Or deux composants les redemandent (points d'intersection, survol)
 * à chaque changement de la liste des courbes ou de la fenêtre : sans cache,
 * le calcul de toutes les paires se faisait deux fois, et ajouter une courbe
 * recalculait aussi les paires anciennes.
 *
 * Les valeurs des paramètres n'ont pas besoin de clé : `bindParameters` rend
 * un nœud distinct par jeu de valeurs (même raisonnement que `analyzeCached`).
 * La restriction de chaque courbe est appliquée APRÈS, par l'appelant.
 */
const intersectionCache = new WeakMap<MathNode, WeakMap<MathNode, Map<string, readonly Point[]>>>();

function viewportKey(viewport: Viewport): string {
	return `${viewport.xMin},${viewport.xMax},${viewport.yMin},${viewport.yMax}`;
}

// =============================================================================
// Core
// =============================================================================

/**
 * Find where two curves meet inside the viewport.
 *
 * Solves `f₁(x) − f₂(x) = 0`. A curve whose expression could not be compiled
 * carries no AST and yields no intersection.
 *
 * @param f1 - First curve
 * @param f2 - Second curve
 * @param viewport - Bounds; a point outside them is dropped, in x as in y
 * @returns The intersection points, ascending in x
 */
export function findIntersections(
	f1: AnalysisInput,
	f2: AnalysisInput,
	viewport: Viewport
): readonly Point[] {
	if (!f1.ast || !f2.ast) return [];

	const first = f1.ast.expression;
	const second = f2.ast.expression;
	const key = viewportKey(viewport);

	let bySecond = intersectionCache.get(first);
	if (!bySecond) {
		bySecond = new WeakMap();
		intersectionCache.set(first, bySecond);
	}
	let byWindow = bySecond.get(second);
	if (!byWindow) {
		byWindow = new Map();
		bySecond.set(second, byWindow);
	}

	const cached = byWindow.get(key);
	if (cached) return cached;

	// Un panoramique crée une clé par fenêtre traversée : on repart à zéro
	// plutôt que de laisser la carte enfler sans fin.
	if (byWindow.size >= MAX_WINDOWS_PER_PAIR) byWindow.clear();

	const points = computeIntersections(f1.ast, second, viewport);
	byWindow.set(key, points);
	return points;
}

/** Le calcul lui-même, sans cache : racines de `f₁ − f₂` dans la fenêtre. */
function computeIntersections(
	ast1: AnalysisASTInfo,
	second: MathNode,
	viewport: Viewport
): readonly Point[] {
	const difference = subtract(ast1.expression, second);

	let compiledDifference;
	try {
		compiledDifference = compile(difference);
	} catch {
		return [];
	}

	const points: Point[] = [];

	for (const root of findRoots(difference, compiledDifference, 'x', viewport.xMin, viewport.xMax)) {
		const y = ast1.compiledFn({ x: root.x });
		if (!Number.isFinite(y)) continue;
		if (y < viewport.yMin || y > viewport.yMax) continue;

		points.push({ x: root.x, y });
	}

	return points;
}

/**
 * Find the intersections of every pair among the given curves.
 *
 * @param functions - The curves to cross, built by `toAnalysisInputs()`
 * @param viewport - Current viewport bounds
 * @returns One result per intersection found, unordered
 */
export function findAllIntersections(
	functions: readonly AnalysisInput[],
	viewport: Viewport
): IntersectionResult[] {
	const results: IntersectionResult[] = [];

	for (let i = 0; i < functions.length; i++) {
		for (let j = i + 1; j < functions.length; j++) {
			const f1 = functions[i];
			const f2 = functions[j];

			for (const point of findIntersections(f1, f2, viewport)) {
				// Un croisement hors de l'ensemble d'une des courbes n'est pas tracé.
				if (!isInsideRestriction(f1.restriction, point.x)) continue;
				if (!isInsideRestriction(f2.restriction, point.x)) continue;
				results.push({ point, functionIds: [f1.id, f2.id] as const });
			}
		}
	}

	return results;
}

// =============================================================================
// Deduplication
// =============================================================================

/**
 * Drop intersection points that sit within `tolerance` of one already kept.
 *
 * Three curves meeting at one place produce three results for the same visual
 * point; only the first is kept.
 *
 * @param intersections - Results to filter
 * @param tolerance - Minimum distance between two distinct points
 * @returns The kept results, in their original order
 */
export function deduplicateIntersections(
	intersections: readonly IntersectionResult[],
	tolerance: number = DEFAULT_DEDUP_TOLERANCE
): IntersectionResult[] {
	const result: IntersectionResult[] = [];

	for (const intersection of intersections) {
		const isDuplicate = result.some(
			(existing) =>
				Math.abs(existing.point.x - intersection.point.x) < tolerance &&
				Math.abs(existing.point.y - intersection.point.y) < tolerance
		);

		if (!isDuplicate) result.push(intersection);
	}

	return result;
}
