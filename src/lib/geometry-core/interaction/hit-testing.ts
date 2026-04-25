/**
 * Hit-testing — find which element is under the cursor.
 *
 * Linear O(n) scan. Sufficient for < 200 elements.
 * Points are tested by distance to cursor.
 * Points are prioritized over other elements.
 */

import type { Figure } from '../graph/figure';
import { geoToNumber } from '../compute/to-number';
import { isPointElement } from '../types/elements';

/**
 * Find the closest point (free or dependent) near the given math coordinates.
 * Returns the point ID, or null if none within threshold.
 */
export function findPointNear(
	figure: Figure,
	mathX: number,
	mathY: number,
	threshold: number
): string | null {
	let bestId: string | null = null;
	let bestDist = Infinity;

	for (const el of figure.getAllElements()) {
		if (!isPointElement(el)) continue;
		if (!el.visible) continue;

		const pos = figure.getPosition(el.id);
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
 * Distance from point (px, py) to segment [(x1,y1), (x2,y2)].
 */
function distToSegment(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;
	if (lenSq < 1e-20) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

	const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
	const projX = x1 + t * dx;
	const projY = y1 + t * dy;
	return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Distance from point (px, py) to infinite line through (x1,y1) and (x2,y2).
 */
function distToLine(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;
	if (lenSq < 1e-20) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

	return Math.abs(dy * (px - x1) - dx * (py - y1)) / Math.sqrt(lenSq);
}

/**
 * Distance from point (px, py) to ray from (ox, oy) through (tx, ty).
 */
function distToRay(px: number, py: number, ox: number, oy: number, tx: number, ty: number): number {
	const dx = tx - ox;
	const dy = ty - oy;
	const lenSq = dx * dx + dy * dy;
	if (lenSq < 1e-20) return Math.sqrt((px - ox) ** 2 + (py - oy) ** 2);

	const t = ((px - ox) * dx + (py - oy) * dy) / lenSq;
	if (t <= 0) return Math.sqrt((px - ox) ** 2 + (py - oy) ** 2);

	const projX = ox + t * dx;
	const projY = oy + t * dy;
	return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Distance from point (px, py) to circle with center (cx, cy) and radius r.
 */
function distToCircle(px: number, py: number, cx: number, cy: number, r: number): number {
	const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
	return Math.abs(d - r);
}

/**
 * Find the closest element of any type near the given math coordinates.
 * Points are prioritized: if a point is within threshold, it wins over other elements.
 * Returns the element ID, or null if none within threshold.
 */
export function findElementNear(
	figure: Figure,
	mathX: number,
	mathY: number,
	threshold: number
): string | null {
	// Points first (always prioritized for selection)
	const pointId = findPointNear(figure, mathX, mathY, threshold);
	if (pointId) return pointId;

	let bestId: string | null = null;
	let bestDist = Infinity;

	for (const el of figure.getAllElements()) {
		if (!el.visible) continue;
		let dist = Infinity;

		if (el.type === 'segment') {
			const p1 = figure.getPosition(el.startId);
			const p2 = figure.getPosition(el.endId);
			if (p1 && p2) {
				dist = distToSegment(
					mathX,
					mathY,
					geoToNumber(p1.x),
					geoToNumber(p1.y),
					geoToNumber(p2.x),
					geoToNumber(p2.y)
				);
			}
		} else if (el.type === 'line') {
			const p1 = figure.getPosition(el.point1Id);
			const p2 = figure.getPosition(el.point2Id);
			if (p1 && p2) {
				dist = distToLine(
					mathX,
					mathY,
					geoToNumber(p1.x),
					geoToNumber(p1.y),
					geoToNumber(p2.x),
					geoToNumber(p2.y)
				);
			}
		} else if (el.type === 'ray') {
			const origin = figure.getPosition(el.originId);
			const through = figure.getPosition(el.throughId);
			if (origin && through) {
				dist = distToRay(
					mathX,
					mathY,
					geoToNumber(origin.x),
					geoToNumber(origin.y),
					geoToNumber(through.x),
					geoToNumber(through.y)
				);
			}
		} else if (el.type === 'circleByRadius') {
			const center = figure.getPosition(el.centerId);
			if (center) {
				dist = distToCircle(
					mathX,
					mathY,
					geoToNumber(center.x),
					geoToNumber(center.y),
					geoToNumber(el.radius)
				);
			}
		} else if (el.type === 'tangentLine') {
			// Tangent is a line: get x₀, compute tangent point and slope
			const fnEl = figure.getElementById(el.functionId);
			if (fnEl && fnEl.type === 'function') {
				let x0: number | null = null;
				if (el.pointOnCurveId) {
					const pos = figure.getPosition(el.pointOnCurveId);
					if (pos) x0 = geoToNumber(pos.x);
				} else if (el.x0 !== undefined) {
					x0 = geoToNumber(el.x0);
				}
				if (x0 !== null) {
					const y0 = fnEl.compiledFn({ x: x0 });
					const m = fnEl.compiledDerivative({ x: x0 });
					if (Number.isFinite(y0) && Number.isFinite(m)) {
						dist = distToLine(mathX, mathY, x0, y0, x0 + 1, y0 + m);
					}
				}
			}
		} else if (el.type === 'function') {
			// Perpendicular distance: |f(x) - y| / sqrt(1 + f'(x)²)
			const y = el.compiledFn({ x: mathX });
			if (Number.isFinite(y)) {
				const dy = el.compiledDerivative({ x: mathX });
				const slope = Number.isFinite(dy) ? dy : 0;
				dist = Math.abs(y - mathY) / Math.sqrt(1 + slope * slope);
			}
		} else if (el.type === 'quadraticCurve') {
			// Distance to implicit curve F(x,y)=0: |F(x,y)| / |∇F(x,y)|
			const [A, B, C, D, E, F] = el.coefficients;
			const Fval =
				A * mathX * mathX + B * mathX * mathY + C * mathY * mathY + D * mathX + E * mathY + F;
			const dFx = 2 * A * mathX + B * mathY + D;
			const dFy = B * mathX + 2 * C * mathY + E;
			const gradNorm = Math.sqrt(dFx * dFx + dFy * dFy);
			if (gradNorm > 1e-10) {
				dist = Math.abs(Fval) / gradNorm;
			}
		} else if (el.type === 'circleByPoint') {
			const center = figure.getPosition(el.centerId);
			const edge = figure.getPosition(el.edgePointId);
			if (center && edge) {
				const cx = geoToNumber(center.x);
				const cy = geoToNumber(center.y);
				const r = Math.sqrt((geoToNumber(edge.x) - cx) ** 2 + (geoToNumber(edge.y) - cy) ** 2);
				dist = distToCircle(mathX, mathY, cx, cy, r);
			}
		}

		if (dist <= threshold && dist < bestDist) {
			bestDist = dist;
			bestId = el.id;
		}
	}

	return bestId;
}
