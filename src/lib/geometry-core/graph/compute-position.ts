/**
 * Position computation for derived geometry elements.
 *
 * Pure function that computes a point's position based on its element type
 * and the current positions of its dependencies.
 */

import type { GeoElement, GeoMeasure } from '../types/elements';
import {
	isMidpoint,
	isIntersectionLL,
	isIntersectionLC,
	isIntersectionCC,
	isReflectedPoint,
	isRotatedPoint,
	isTranslatedPoint,
	isDilatedPoint,
	isReflectedOverLine,
	isProjectedPoint,
	isAffinityPoint,
	isInvertedPoint,
	isAngleMark,
	isSegmentMark,
	isMeasure,
	isPointOnCurve,
	isPointOnQuadraticCurve
} from '../types/elements';
import type { GeoPoint } from '../types/primitives';
import type { GeoValue } from '../types/geo-value';
import { geoAdd, geoSub, geoMul, geoDiv, geoSqrt, geoFromNumber } from '../compute/geo-arithmetic';
import { geoToNumber } from '../compute/to-number';
import { numeric } from '../types/geo-value';
import { intersectLL, intersectLC, intersectCC } from '../geometry/intersections';
import { resolveVectorComponents } from './vector-components';
import {
	reflectPoint,
	rotate,
	translate,
	dilate,
	reflectOverLine,
	projectOnLine,
	applyAffinity,
	invertPoint
} from '../geometry/transformations';
import { conicPointFromParam } from './conic-helpers';

export interface ComputePositionResult {
	position: GeoPoint | null;
	/** True when this element type should have a position (derived points, marks). */
	hasComputablePosition: boolean;
	measureValue?: number | undefined;
}

/**
 * Compute the position of a derived element from its parents' positions.
 *
 * Returns { position, hasComputablePosition, measureValue? }.
 * - position is null when computation failed (parallel lines, missing parents) or element has no position.
 * - hasComputablePosition distinguishes "no position because it's a segment" from "no position because parents are missing".
 * - measureValue is set only for measure elements.
 */
export function computeElementPosition(
	el: GeoElement,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>
): ComputePositionResult {
	if (isMidpoint(el)) {
		const p1 = positions.get(el.point1Id);
		const p2 = positions.get(el.point2Id);
		if (!p1 || !p2) return { position: null, hasComputablePosition: true };

		const two = geoFromNumber(2);
		const mx = geoDiv(geoAdd(p1.x, p2.x), two);
		const my = geoDiv(geoAdd(p1.y, p2.y), two);
		if (mx === null || my === null) {
			throw new Error(`computePosition: unexpected null computing midpoint "${el.id}"`);
		}
		return { position: { x: mx, y: my }, hasComputablePosition: true };
	}

	if (isIntersectionLL(el)) {
		const pos = computeIntersectionLL(el.line1Id, el.line2Id, positions, elements);
		return { position: pos, hasComputablePosition: true };
	}

	if (isIntersectionLC(el)) {
		const pos = computeIntersectionLCPos(el.lineId, el.circleId, el.index, positions, elements);
		return { position: pos, hasComputablePosition: true };
	}

	if (isIntersectionCC(el)) {
		const pos = computeIntersectionCCPos(el.circle1Id, el.circle2Id, el.index, positions, elements);
		return { position: pos, hasComputablePosition: true };
	}

	if (isReflectedPoint(el)) {
		const source = positions.get(el.sourceId);
		const center = positions.get(el.centerId);
		if (source && center)
			return { position: reflectPoint(source, center), hasComputablePosition: true };
		return { position: null, hasComputablePosition: true };
	}

	if (isRotatedPoint(el)) {
		const source = positions.get(el.sourceId);
		const center = positions.get(el.centerId);
		if (source && center)
			return { position: rotate(source, center, el.angle), hasComputablePosition: true };
		return { position: null, hasComputablePosition: true };
	}

	if (isTranslatedPoint(el)) {
		const source = positions.get(el.sourceId);
		if (!source) return { position: null, hasComputablePosition: true };

		// Vector-based translation: read displacement from the vector element
		if (el.vectorId) {
			const comp = resolveVectorComponents(el.vectorId, elements, positions);
			if (comp) {
				return {
					position: translate(source, { x: comp.dx, y: comp.dy }),
					hasComputablePosition: true
				};
			}
			return { position: null, hasComputablePosition: true };
		}

		// Classic two-point translation: displacement = endPoint - startPoint
		const vStart = positions.get(el.vectorStartId);
		const vEnd = positions.get(el.vectorEndId);
		if (vStart && vEnd) {
			const vector: GeoPoint = {
				x: geoSub(vEnd.x, vStart.x),
				y: geoSub(vEnd.y, vStart.y)
			};
			return { position: translate(source, vector), hasComputablePosition: true };
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isDilatedPoint(el)) {
		const source = positions.get(el.sourceId);
		const center = positions.get(el.centerId);
		if (source && center)
			return { position: dilate(source, center, el.factor), hasComputablePosition: true };
		return { position: null, hasComputablePosition: true };
	}

	if (isReflectedOverLine(el)) {
		const source = positions.get(el.sourceId);
		const lp1 = positions.get(el.linePoint1Id);
		const lp2 = positions.get(el.linePoint2Id);
		if (source && lp1 && lp2) {
			const result = reflectOverLine(source, lp1, lp2);
			return { position: result ?? null, hasComputablePosition: true };
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isProjectedPoint(el)) {
		const source = positions.get(el.sourceId);
		const lp1 = positions.get(el.linePoint1Id);
		const lp2 = positions.get(el.linePoint2Id);
		if (source && lp1 && lp2) {
			const result = projectOnLine(source, lp1, lp2);
			return { position: result ?? null, hasComputablePosition: true };
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isAffinityPoint(el)) {
		const source = positions.get(el.sourceId);
		const lp1 = positions.get(el.linePoint1Id);
		const lp2 = positions.get(el.linePoint2Id);
		if (source && lp1 && lp2) {
			const result = applyAffinity(source, lp1, lp2, el.factor);
			return { position: result ?? null, hasComputablePosition: true };
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isInvertedPoint(el)) {
		const source = positions.get(el.sourceId);
		const center = positions.get(el.centerId);
		if (source && center) {
			return { position: invertPoint(source, center, el.radius), hasComputablePosition: true };
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isSegmentMark(el)) {
		const p1 = positions.get(el.startId);
		const p2 = positions.get(el.endId);
		if (p1 && p2) {
			const two = geoFromNumber(2);
			const mx = geoDiv(geoAdd(p1.x, p2.x), two);
			const my = geoDiv(geoAdd(p1.y, p2.y), two);
			if (mx !== null && my !== null)
				return { position: { x: mx, y: my }, hasComputablePosition: true };
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isMeasure(el)) {
		const measureValue = computeMeasureValue(el, positions);
		return { position: null, hasComputablePosition: false, measureValue };
	}

	if (isAngleMark(el)) {
		const vertexPos = positions.get(el.vertexId);
		return { position: vertexPos ?? null, hasComputablePosition: true };
	}

	if (isPointOnCurve(el)) {
		const fnEl = elements.get(el.functionId);
		if (fnEl && fnEl.type === 'function') {
			const xNum = geoToNumber(el.x0);
			const yNum = fnEl.compiledFn({ x: xNum });
			if (Number.isFinite(yNum)) {
				return { position: { x: el.x0, y: numeric(yNum) }, hasComputablePosition: true };
			}
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isPointOnQuadraticCurve(el)) {
		const curveEl = elements.get(el.curveId);
		if (curveEl && curveEl.type === 'quadraticCurve') {
			const pos = conicPointFromParam(curveEl.conic, el.t);
			if (pos) {
				return { position: { x: numeric(pos.x), y: numeric(pos.y) }, hasComputablePosition: true };
			}
		}
		return { position: null, hasComputablePosition: true };
	}

	// Free points, segments, lines, rays, circles, curves: no position to compute here.
	return { position: null, hasComputablePosition: false };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLineLikePoints(
	lineId: string,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>
): { p1: GeoPoint; p2: GeoPoint } | null {
	const el = elements.get(lineId);
	if (!el) return null;

	let id1: string;
	let id2: string;

	if (el.type === 'segment') {
		id1 = el.startId;
		id2 = el.endId;
	} else if (el.type === 'line') {
		id1 = el.point1Id;
		id2 = el.point2Id;
	} else if (el.type === 'ray') {
		id1 = el.originId;
		id2 = el.throughId;
	} else {
		return null;
	}

	const p1 = positions.get(id1);
	const p2 = positions.get(id2);
	if (!p1 || !p2) return null;
	return { p1, p2 };
}

function computeIntersectionLL(
	line1Id: string,
	line2Id: string,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>
): GeoPoint | null {
	const line1 = getLineLikePoints(line1Id, positions, elements);
	const line2 = getLineLikePoints(line2Id, positions, elements);
	if (!line1 || !line2) return null;
	return intersectLL(line1.p1, line1.p2, line2.p1, line2.p2);
}

function getCircleParams(
	circleId: string,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>
): { center: GeoPoint; radius: GeoValue } | null {
	const el = elements.get(circleId);
	if (!el) return null;
	if (el.type === 'circleByRadius') {
		const center = positions.get(el.centerId);
		if (!center) return null;
		return { center, radius: el.radius };
	}
	if (el.type === 'circleByPoint') {
		const center = positions.get(el.centerId);
		const edge = positions.get(el.edgePointId);
		if (!center || !edge) return null;
		const dx = geoSub(edge.x, center.x);
		const dy = geoSub(edge.y, center.y);
		const radius = geoSqrt(geoAdd(geoMul(dx, dx), geoMul(dy, dy)));
		if (radius === null) return null;
		return { center, radius };
	}
	return null;
}

function computeIntersectionLCPos(
	lineId: string,
	circleId: string,
	index: 0 | 1,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>
): GeoPoint | null {
	const line = getLineLikePoints(lineId, positions, elements);
	const circle = getCircleParams(circleId, positions, elements);
	if (!line || !circle) return null;
	const pts = intersectLC(line.p1, line.p2, circle.center, circle.radius);
	if (!pts || index >= pts.length) return null;
	return pts[index];
}

function computeIntersectionCCPos(
	circle1Id: string,
	circle2Id: string,
	index: 0 | 1,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>
): GeoPoint | null {
	const c1 = getCircleParams(circle1Id, positions, elements);
	const c2 = getCircleParams(circle2Id, positions, elements);
	if (!c1 || !c2) return null;
	const pts = intersectCC(c1.center, c1.radius, c2.center, c2.radius);
	if (!pts || index >= pts.length) return null;
	return pts[index];
}

function computeMeasureValue(
	el: GeoMeasure,
	positions: ReadonlyMap<string, GeoPoint>
): number | undefined {
	const pts = el.targetIds.map((tid) => positions.get(tid));
	if (pts.some((p) => !p)) return undefined;

	if (el.measureType === 'distance') {
		const [a, b] = pts as [GeoPoint, GeoPoint];
		const dx = geoToNumber(a.x) - geoToNumber(b.x);
		const dy = geoToNumber(a.y) - geoToNumber(b.y);
		return Math.sqrt(dx * dx + dy * dy);
	}

	if (el.measureType === 'angle') {
		const [p1, v, p2] = pts as [GeoPoint, GeoPoint, GeoPoint];
		const vax = geoToNumber(p1.x) - geoToNumber(v.x);
		const vay = geoToNumber(p1.y) - geoToNumber(v.y);
		const vbx = geoToNumber(p2.x) - geoToNumber(v.x);
		const vby = geoToNumber(p2.y) - geoToNumber(v.y);
		const dot = vax * vbx + vay * vby;
		const lenA = Math.sqrt(vax * vax + vay * vay);
		const lenB = Math.sqrt(vbx * vbx + vby * vby);
		if (lenA < 1e-15 || lenB < 1e-15) return undefined;
		const cosAngle = Math.max(-1, Math.min(1, dot / (lenA * lenB)));
		const radians = Math.acos(cosAngle);
		return (radians * 180) / Math.PI;
	}

	if (el.measureType === 'area') {
		const points = pts as GeoPoint[];
		let sum = 0;
		const n = points.length;
		for (let i = 0; i < n; i++) {
			const xi = geoToNumber(points[i].x);
			const yi = geoToNumber(points[i].y);
			const xn = geoToNumber(points[(i + 1) % n].x);
			const yn = geoToNumber(points[(i + 1) % n].y);
			sum += xi * yn - xn * yi;
		}
		return Math.abs(sum) / 2;
	}

	return undefined;
}
