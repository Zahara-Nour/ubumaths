/**
 * Position computation for derived geometry elements.
 *
 * Pure function that computes a point's position based on its element type
 * and the current positions of its dependencies.
 */

import type { GeoElement, GeoMeasure, GeoScalar } from '../types/elements';
import {
	isMidpoint,
	isIntersectionLL,
	isIntersectionLC,
	isIntersectionCC,
	isIntersectionLQ,
	isIntersectionQQ,
	isIntersectionLF,
	isIntersectionFF,
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
	isScalar,
	isSlider,
	isPointOnCurve,
	isPointOnQuadraticCurve,
	isPointOnSegment,
	isPointOnLine,
	isPointOnCircle,
	isPointOnArc
} from '../types/elements';
import type { GeoPoint } from '../types/primitives';
import type { GeoValue, ScalarParam } from '../types/geo-value';
import { isScalarRef } from '../types/geo-value';
import { geoAdd, geoSub, geoMul, geoDiv, geoSqrt, geoFromNumber } from '../compute/geo-arithmetic';
import { geoToNumber } from '../compute/to-number';
import { numeric } from '../types/geo-value';
import {
	intersectLL,
	intersectLC,
	intersectCC,
	intersectLQ,
	intersectQQ,
	intersectLF,
	intersectFF
} from '../geometry/intersections';
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
	/** Scalar value for measure, scalar, and slider elements. */
	scalarValue?: number | undefined;
}

/**
 * Resolve a ScalarParam to a numeric value.
 * If the param is a ScalarRef, looks up the value in scalarValues.
 * If the param is a GeoValue, converts to number directly.
 */
export function resolveScalarParam(
	param: ScalarParam,
	scalarValues?: ReadonlyMap<string, number>
): number {
	if (isScalarRef(param)) {
		return scalarValues?.get(param.scalarRef) ?? NaN;
	}
	return geoToNumber(param);
}

/**
 * Resolve a ScalarParam to a GeoValue (for exact arithmetic).
 * If the param is a ScalarRef, wraps the numeric value from scalarValues.
 * If the param is already a GeoValue, returns it directly.
 */
function resolveScalarParamToGeoValue(
	param: ScalarParam,
	scalarValues?: ReadonlyMap<string, number>
): GeoValue | null {
	if (isScalarRef(param)) {
		const val = scalarValues?.get(param.scalarRef);
		if (val === undefined || !Number.isFinite(val)) {
			return null;
		}
		return numeric(val);
	}
	return param;
}

/**
 * Compute the position of a derived element from its parents' positions.
 *
 * Returns { position, hasComputablePosition, scalarValue? }.
 * - position is null when computation failed (parallel lines, missing parents) or element has no position.
 * - hasComputablePosition distinguishes "no position because it's a segment" from "no position because parents are missing".
 * - scalarValue is set for measure, scalar, and slider elements.
 */
export function computeElementPosition(
	el: GeoElement,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>,
	scalarValues?: ReadonlyMap<string, number>
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
		const pos = computeIntersectionLCPos(
			el.lineId,
			el.circleId,
			el.index,
			positions,
			elements,
			scalarValues
		);
		return { position: pos, hasComputablePosition: true };
	}

	if (isIntersectionCC(el)) {
		const pos = computeIntersectionCCPos(
			el.circle1Id,
			el.circle2Id,
			el.index,
			positions,
			elements,
			scalarValues
		);
		return { position: pos, hasComputablePosition: true };
	}

	if (isIntersectionLQ(el)) {
		const pos = computeIntersectionLQPos(
			el.lineId,
			el.curveId,
			el.index,
			positions,
			elements,
			scalarValues
		);
		return { position: pos, hasComputablePosition: true };
	}

	if (isIntersectionQQ(el)) {
		const pos = computeIntersectionQQPos(
			el.curve1Id,
			el.curve2Id,
			el.index,
			positions,
			elements,
			scalarValues
		);
		return { position: pos, hasComputablePosition: true };
	}

	if (isIntersectionLF(el)) {
		const pos = computeIntersectionLFPos(
			el.lineId,
			el.functionId,
			el.index,
			el.xMin,
			el.xMax,
			positions,
			elements
		);
		return { position: pos, hasComputablePosition: true };
	}

	if (isIntersectionFF(el)) {
		const pos = computeIntersectionFFPos(
			el.function1Id,
			el.function2Id,
			el.index,
			el.xMin,
			el.xMax,
			elements
		);
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
		if (source && center) {
			const angle = resolveScalarParamToGeoValue(el.angle, scalarValues);
			if (!angle) return { position: null, hasComputablePosition: true };
			return { position: rotate(source, center, angle), hasComputablePosition: true };
		}
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
		if (source && center) {
			const factor = resolveScalarParamToGeoValue(el.factor, scalarValues);
			if (!factor) return { position: null, hasComputablePosition: true };
			return { position: dilate(source, center, factor), hasComputablePosition: true };
		}
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
		const scalarValue = computeMeasureValue(el, positions);
		return { position: null, hasComputablePosition: false, scalarValue };
	}

	if (isScalar(el)) {
		const scalarValue = computeScalarValue(el, positions, elements, scalarValues);
		return { position: null, hasComputablePosition: false, scalarValue };
	}

	if (isSlider(el)) {
		return { position: null, hasComputablePosition: false, scalarValue: el.value };
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

	if (isPointOnSegment(el)) {
		const segEl = elements.get(el.segmentId);
		if (segEl && segEl.type === 'segment') {
			const startPos = positions.get(segEl.startId);
			const endPos = positions.get(segEl.endId);
			if (startPos && endPos) {
				const t = el.t;
				// P = start + t * (end - start)
				const x = geoAdd(startPos.x, geoMul(numeric(t), geoSub(endPos.x, startPos.x)));
				const y = geoAdd(startPos.y, geoMul(numeric(t), geoSub(endPos.y, startPos.y)));
				return { position: { x, y }, hasComputablePosition: true };
			}
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isPointOnLine(el)) {
		const lineEl = elements.get(el.lineId);
		if (lineEl && (lineEl.type === 'line' || lineEl.type === 'ray')) {
			const p1Id = lineEl.type === 'line' ? lineEl.point1Id : lineEl.originId;
			const p2Id = lineEl.type === 'line' ? lineEl.point2Id : lineEl.throughId;
			const p1 = positions.get(p1Id);
			const p2 = positions.get(p2Id);
			if (p1 && p2) {
				const t = el.t;
				const x = geoAdd(p1.x, geoMul(numeric(t), geoSub(p2.x, p1.x)));
				const y = geoAdd(p1.y, geoMul(numeric(t), geoSub(p2.y, p1.y)));
				return { position: { x, y }, hasComputablePosition: true };
			}
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isPointOnCircle(el)) {
		const circEl = elements.get(el.circleId);
		if (circEl && (circEl.type === 'circleByRadius' || circEl.type === 'circleByPoint')) {
			const centerPos = positions.get(circEl.centerId);
			if (centerPos) {
				let r: number;
				if (circEl.type === 'circleByRadius') {
					r = resolveScalarParam(circEl.radius, scalarValues);
				} else {
					const edgePos = positions.get(circEl.edgePointId);
					if (!edgePos) return { position: null, hasComputablePosition: true };
					const dx = geoToNumber(edgePos.x) - geoToNumber(centerPos.x);
					const dy = geoToNumber(edgePos.y) - geoToNumber(centerPos.y);
					r = Math.sqrt(dx * dx + dy * dy);
				}
				if (!Number.isFinite(r)) return { position: null, hasComputablePosition: true };
				const cx = geoToNumber(centerPos.x);
				const cy = geoToNumber(centerPos.y);
				const x = cx + r * Math.cos(el.theta);
				const y = cy + r * Math.sin(el.theta);
				return { position: { x: numeric(x), y: numeric(y) }, hasComputablePosition: true };
			}
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isPointOnArc(el)) {
		const arcEl = elements.get(el.arcId);
		if (arcEl) {
			let centerPos: GeoPoint | undefined;
			let r: number;
			let startAngle: number;
			let endAngle: number;

			if (arcEl.type === 'arcByAngles') {
				centerPos = positions.get(arcEl.centerId);
				if (!centerPos) return { position: null, hasComputablePosition: true };
				r = resolveScalarParam(arcEl.radius, scalarValues);
				startAngle = resolveScalarParam(arcEl.startAngle, scalarValues);
				endAngle = resolveScalarParam(arcEl.endAngle, scalarValues);
			} else if (arcEl.type === 'arcByPoints') {
				centerPos = positions.get(arcEl.centerId);
				const startPos = positions.get(arcEl.startId);
				const endPos = positions.get(arcEl.endId);
				if (!centerPos || !startPos || !endPos)
					return { position: null, hasComputablePosition: true };
				const cx = geoToNumber(centerPos.x);
				const cy = geoToNumber(centerPos.y);
				const dx1 = geoToNumber(startPos.x) - cx;
				const dy1 = geoToNumber(startPos.y) - cy;
				r = Math.sqrt(dx1 * dx1 + dy1 * dy1);
				startAngle = Math.atan2(dy1, dx1);
				const dx2 = geoToNumber(endPos.x) - cx;
				const dy2 = geoToNumber(endPos.y) - cy;
				endAngle = Math.atan2(dy2, dx2);
			} else {
				return { position: null, hasComputablePosition: true };
			}

			// Normalize sweep to be positive (counterclockwise arc)
			let sweep = endAngle - startAngle;
			if (sweep < 0) sweep += 2 * Math.PI;
			// Degenerate arc (start === end): point stays at startAngle
			if (sweep === 0) sweep = 2 * Math.PI;
			const theta = startAngle + el.t * sweep;

			const cx = geoToNumber(centerPos.x);
			const cy = geoToNumber(centerPos.y);
			const x = cx + r * Math.cos(theta);
			const y = cy + r * Math.sin(theta);
			return { position: { x: numeric(x), y: numeric(y) }, hasComputablePosition: true };
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
	elements: ReadonlyMap<string, GeoElement>,
	scalarValues?: ReadonlyMap<string, number>
): { center: GeoPoint; radius: GeoValue } | null {
	const el = elements.get(circleId);
	if (!el) return null;
	if (el.type === 'circleByRadius') {
		const center = positions.get(el.centerId);
		if (!center) return null;
		const radius = resolveScalarParamToGeoValue(el.radius, scalarValues);
		if (!radius) return null;
		return { center, radius };
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
	elements: ReadonlyMap<string, GeoElement>,
	scalarValues?: ReadonlyMap<string, number>
): GeoPoint | null {
	const line = getLineLikePoints(lineId, positions, elements);
	const circle = getCircleParams(circleId, positions, elements, scalarValues);
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
	elements: ReadonlyMap<string, GeoElement>,
	scalarValues?: ReadonlyMap<string, number>
): GeoPoint | null {
	const c1 = getCircleParams(circle1Id, positions, elements, scalarValues);
	const c2 = getCircleParams(circle2Id, positions, elements, scalarValues);
	if (!c1 || !c2) return null;
	const pts = intersectCC(c1.center, c1.radius, c2.center, c2.radius);
	if (!pts || index >= pts.length) return null;
	return pts[index];
}

/**
 * Get conic coefficients [A,B,C,D,E,F] from a quadraticCurve or circle element.
 * For circles, converts to conic form: [1, 0, 1, -2cx, -2cy, cx²+cy²-r²].
 */
function getConicCoefficients(
	id: string,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>,
	scalarValues?: ReadonlyMap<string, number>
): readonly [number, number, number, number, number, number] | null {
	const el = elements.get(id);
	if (!el) return null;

	if (el.type === 'quadraticCurve') {
		return el.coefficients;
	}

	// Convert circle to conic coefficients
	const circle = getCircleParams(id, positions, elements, scalarValues);
	if (!circle) return null;
	const cx = geoToNumber(circle.center.x);
	const cy = geoToNumber(circle.center.y);
	const r = geoToNumber(circle.radius);
	return [1, 0, 1, -2 * cx, -2 * cy, cx * cx + cy * cy - r * r];
}

function computeIntersectionLQPos(
	lineId: string,
	curveId: string,
	index: 0 | 1,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>,
	scalarValues?: ReadonlyMap<string, number>
): GeoPoint | null {
	const line = getLineLikePoints(lineId, positions, elements);
	const coeffs = getConicCoefficients(curveId, positions, elements, scalarValues);
	if (!line || !coeffs) return null;
	const pts = intersectLQ(line.p1, line.p2, coeffs);
	if (!pts || index >= pts.length) return null;
	return pts[index];
}

function computeIntersectionQQPos(
	curve1Id: string,
	curve2Id: string,
	index: 0 | 1 | 2 | 3,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>,
	scalarValues?: ReadonlyMap<string, number>
): GeoPoint | null {
	const coeffs1 = getConicCoefficients(curve1Id, positions, elements, scalarValues);
	const coeffs2 = getConicCoefficients(curve2Id, positions, elements, scalarValues);
	if (!coeffs1 || !coeffs2) return null;
	const pts = intersectQQ(coeffs1, coeffs2);
	if (!pts || index >= pts.length) return null;
	return pts[index];
}

function computeIntersectionLFPos(
	lineId: string,
	functionId: string,
	index: number,
	xMin: number,
	xMax: number,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>
): GeoPoint | null {
	const line = getLineLikePoints(lineId, positions, elements);
	const fnEl = elements.get(functionId);
	if (!line || !fnEl || fnEl.type !== 'function') return null;
	const pts = intersectLF(line.p1, line.p2, fnEl.expression, fnEl.compiledFn, xMin, xMax);
	if (!pts || index >= pts.length) return null;
	return pts[index];
}

function computeIntersectionFFPos(
	function1Id: string,
	function2Id: string,
	index: number,
	xMin: number,
	xMax: number,
	elements: ReadonlyMap<string, GeoElement>
): GeoPoint | null {
	const fn1 = elements.get(function1Id);
	const fn2 = elements.get(function2Id);
	if (!fn1 || fn1.type !== 'function' || !fn2 || fn2.type !== 'function') return null;
	const pts = intersectFF(fn1.expression, fn1.compiledFn, fn2.expression, xMin, xMax);
	if (!pts || index >= pts.length) return null;
	return pts[index];
}

function computeScalarValue(
	el: GeoScalar,
	positions: ReadonlyMap<string, GeoPoint>,
	elements: ReadonlyMap<string, GeoElement>,
	scalarValues?: ReadonlyMap<string, number>
): number | undefined {
	switch (el.scalarKind) {
		case 'distance': {
			const [aId, bId] = el.targetIds;
			const a = positions.get(aId);
			const b = positions.get(bId);
			if (!a || !b) return undefined;
			const dx = geoToNumber(a.x) - geoToNumber(b.x);
			const dy = geoToNumber(a.y) - geoToNumber(b.y);
			return Math.sqrt(dx * dx + dy * dy);
		}
		case 'distance_point_line': {
			const [pointId, lineId] = el.targetIds;
			const p = positions.get(pointId);
			const lineEl = elements.get(lineId);
			if (!p || !lineEl) return undefined;
			let lp1Id: string, lp2Id: string;
			if (lineEl.type === 'line') {
				lp1Id = lineEl.point1Id;
				lp2Id = lineEl.point2Id;
			} else if (lineEl.type === 'segment') {
				lp1Id = lineEl.startId;
				lp2Id = lineEl.endId;
			} else if (lineEl.type === 'ray') {
				lp1Id = lineEl.originId;
				lp2Id = lineEl.throughId;
			} else {
				return undefined;
			}
			const a = positions.get(lp1Id);
			const b = positions.get(lp2Id);
			if (!a || !b) return undefined;
			const ax = geoToNumber(a.x),
				ay = geoToNumber(a.y);
			const bx = geoToNumber(b.x),
				by = geoToNumber(b.y);
			const px = geoToNumber(p.x),
				py = geoToNumber(p.y);
			const abx = bx - ax,
				aby = by - ay;
			const apx = px - ax,
				apy = py - ay;
			const lenAB = Math.sqrt(abx * abx + aby * aby);
			if (lenAB < 1e-15) return undefined;
			return Math.abs(abx * apy - aby * apx) / lenAB;
		}
		case 'angle': {
			const [p1Id, vId, p2Id] = el.targetIds;
			const p1 = positions.get(p1Id);
			const v = positions.get(vId);
			const p2 = positions.get(p2Id);
			if (!p1 || !v || !p2) return undefined;
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
		case 'polar_angle': {
			const [centerId, pointId] = el.targetIds;
			const center = positions.get(centerId);
			const point = positions.get(pointId);
			if (!center || !point) return undefined;
			const dx = geoToNumber(point.x) - geoToNumber(center.x);
			const dy = geoToNumber(point.y) - geoToNumber(center.y);
			if (Math.abs(dx) < 1e-15 && Math.abs(dy) < 1e-15) return undefined;
			const rad = Math.atan2(dy, dx);
			return (rad * 180) / Math.PI;
		}
		case 'area': {
			const points = el.targetIds.map((tid) => positions.get(tid));
			if (points.some((p) => !p)) return undefined;
			let sum = 0;
			const n = points.length;
			for (let i = 0; i < n; i++) {
				const xi = geoToNumber(points[i]!.x);
				const yi = geoToNumber(points[i]!.y);
				const xn = geoToNumber(points[(i + 1) % n]!.x);
				const yn = geoToNumber(points[(i + 1) % n]!.y);
				sum += xi * yn - xn * yi;
			}
			return Math.abs(sum) / 2;
		}
		case 'norme': {
			const vecId = el.targetIds[0];
			const comp = resolveVectorComponents(vecId, elements, positions);
			if (!comp) return undefined;
			const dx = geoToNumber(comp.dx);
			const dy = geoToNumber(comp.dy);
			return Math.sqrt(dx * dx + dy * dy);
		}
		case 'expression': {
			if (!el.compute) return undefined;
			try {
				return el.compute(scalarValues ?? new Map());
			} catch {
				return undefined;
			}
		}
	}
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
