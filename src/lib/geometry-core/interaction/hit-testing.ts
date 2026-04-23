/**
 * Hit-testing — find which element is under the cursor.
 *
 * Linear O(n) scan. Sufficient for < 200 elements.
 * Points are tested by distance to cursor.
 * Points are prioritized over other elements.
 */

import type { Construction } from '../graph/construction';
import { geoToNumber } from '../compute/to-number';

/**
 * Find the closest point (free or dependent) near the given math coordinates.
 * Returns the point ID, or null if none within threshold.
 */
export function findPointNear(
	construction: Construction,
	mathX: number,
	mathY: number,
	threshold: number
): string | null {
	let bestId: string | null = null;
	let bestDist = Infinity;

	for (const el of construction.getAllElements()) {
		if (el.type !== 'freePoint' && el.type !== 'midpoint') continue;

		const pos = construction.getPosition(el.id);
		if (!pos) continue;

		const dx = geoToNumber(pos.x) - mathX;
		const dy = geoToNumber(pos.y) - mathY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist <= threshold && dist < bestDist) {
			bestDist = dist;
			bestId = el.id;
		}
	}

	return bestId;
}

/**
 * Find the closest element of any type near the given math coordinates.
 * Points are prioritized: if a point is within threshold, it wins over other elements.
 * Returns the element ID, or null if none within threshold.
 */
export function findElementNear(
	construction: Construction,
	mathX: number,
	mathY: number,
	threshold: number
): string | null {
	// Points first (always prioritized for selection)
	const pointId = findPointNear(construction, mathX, mathY, threshold);
	if (pointId) return pointId;

	// TODO: segment/line/circle distance testing for Phase 3
	return null;
}
