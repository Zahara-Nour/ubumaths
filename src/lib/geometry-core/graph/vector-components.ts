/**
 * Shared helper to extract (dx, dy) displacement from any vector element type.
 *
 * Used by both Figure.getVectorComponents() and computeElementPosition() to
 * avoid logic duplication. Works recursively for derived vectors (sum, scaled, negate).
 */

import type { GeoElement } from '../types/elements';
import type { GeoPoint } from '../types/primitives';
import type { GeoValue } from '../types/geo-value';
import { geoAdd, geoSub, geoMul, geoOpposite } from '../compute/geo-arithmetic';

export function resolveVectorComponents(
	id: string,
	elements: ReadonlyMap<string, GeoElement>,
	positions: ReadonlyMap<string, GeoPoint>
): { dx: GeoValue; dy: GeoValue } | null {
	const el = elements.get(id);
	if (!el) return null;

	if (el.type === 'vectorByPoints') {
		const p1 = positions.get(el.startId);
		const p2 = positions.get(el.endId);
		if (!p1 || !p2) return null;
		return { dx: geoSub(p2.x, p1.x), dy: geoSub(p2.y, p1.y) };
	}
	if (el.type === 'freeVector') {
		return { dx: el.dx, dy: el.dy };
	}
	if (el.type === 'vectorSum') {
		const c1 = resolveVectorComponents(el.vector1Id, elements, positions);
		const c2 = resolveVectorComponents(el.vector2Id, elements, positions);
		if (!c1 || !c2) return null;
		return el.negate
			? { dx: geoSub(c1.dx, c2.dx), dy: geoSub(c1.dy, c2.dy) }
			: { dx: geoAdd(c1.dx, c2.dx), dy: geoAdd(c1.dy, c2.dy) };
	}
	if (el.type === 'vectorScaled') {
		const c = resolveVectorComponents(el.vectorId, elements, positions);
		if (!c) return null;
		return { dx: geoMul(el.factor, c.dx), dy: geoMul(el.factor, c.dy) };
	}
	if (el.type === 'vectorNegate') {
		const c = resolveVectorComponents(el.vectorId, elements, positions);
		if (!c) return null;
		return { dx: geoOpposite(c.dx), dy: geoOpposite(c.dy) };
	}
	return null;
}
