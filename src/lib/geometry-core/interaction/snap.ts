/**
 * Snap utilities — accrochage a la grille ou aux points existants.
 *
 * Snap results are always exact GeoValues (grid -> exact integer/fraction,
 * point -> exact position from the figure).
 */

import type { Figure } from '../graph/figure';
import type { GeoPoint } from '../types/primitives';
import { exact } from '../types/geo-value';
import { geoToNumber } from '../compute/to-number';
import { number } from '$lib/mathAST';

/**
 * Snap coordinates to the nearest grid position.
 * Returns exact GeoValues (snapped positions are exact by figure).
 */
export function snapToGrid(mathX: number, mathY: number, gridStep: number): GeoPoint {
	const snappedX = Math.round(mathX / gridStep) * gridStep;
	const snappedY = Math.round(mathY / gridStep) * gridStep;
	return {
		x: exact(number(snappedX)),
		y: exact(number(snappedY))
	};
}

/**
 * Snap to the nearest existing point in the figure.
 * Returns the point ID and its exact position, or null if none within threshold.
 */
export function snapToPoint(
	figure: Figure,
	mathX: number,
	mathY: number,
	threshold: number
): { id: string; position: GeoPoint } | null {
	let bestId: string | null = null;
	let bestDist = Infinity;
	let bestPos: GeoPoint | null = null;

	for (const el of figure.getAllElements()) {
		if (el.type !== 'freePoint' && el.type !== 'midpoint') continue;

		const pos = figure.getPosition(el.id);
		if (!pos) continue;

		const dx = geoToNumber(pos.x) - mathX;
		const dy = geoToNumber(pos.y) - mathY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist <= threshold && dist < bestDist) {
			bestDist = dist;
			bestId = el.id;
			bestPos = pos;
		}
	}

	if (!bestId || !bestPos) return null;
	return { id: bestId, position: bestPos };
}
