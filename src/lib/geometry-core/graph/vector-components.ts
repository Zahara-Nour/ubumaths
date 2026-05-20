/**
 * Shared helper to extract (dx, dy) displacement from any vector element type.
 *
 * Used by both Figure.getVectorComponents() and computeElementPosition() to
 * avoid logic duplication. Works recursively for derived vectors (sum, scaled, negate).
 */

import type { GeoElement } from '../types/elements';
import { isLine } from '../types/elements';
import type { GeoPoint } from '../types/primitives';
import type { GeoValue } from '../types/geo-value';
import { geoAdd, geoSub, geoMul, geoOpposite } from '../compute/geo-arithmetic';
import { geoToNumber } from '../compute/to-number';

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
	if (el.type === 'vectorOrientedAlongLine') {
		// Read both line endpoints to compute the (possibly flipped) direction
		// of `lineId` so dot(dir(lineId), dir(referenceLineId)) ≥ 0.
		const line = elements.get(el.lineId);
		const ref = elements.get(el.referenceLineId);
		if (!line || !isLine(line) || !ref || !isLine(ref)) return null;
		const lp1 = positions.get(line.point1Id);
		const lp2 = positions.get(line.point2Id);
		const rp1 = positions.get(ref.point1Id);
		const rp2 = positions.get(ref.point2Id);
		if (!lp1 || !lp2 || !rp1 || !rp2) return null;
		const ldx = geoSub(lp2.x, lp1.x);
		const ldy = geoSub(lp2.y, lp1.y);
		const rdx = geoToNumber(rp2.x) - geoToNumber(rp1.x);
		const rdy = geoToNumber(rp2.y) - geoToNumber(rp1.y);
		const lnx = geoToNumber(ldx);
		const lny = geoToNumber(ldy);
		const dot = lnx * rdx + lny * rdy;
		return dot >= 0 ? { dx: ldx, dy: ldy } : { dx: geoOpposite(ldx), dy: geoOpposite(ldy) };
	}
	return null;
}
