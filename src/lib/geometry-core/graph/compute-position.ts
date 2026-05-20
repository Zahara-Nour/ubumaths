/**
 * Position computation for derived geometry elements.
 *
 * Pure function that computes a point's position based on its element type
 * and the current positions of its dependencies.
 */

import type { GeoElement, GeoScalar } from '../types/elements';
import { isOsculatingCircle } from '../types/elements';
import { computeArcLength, computeCurvature, computeOsculatingCircle } from './parametric-calculus';
import {
	isMidpoint,
	isIntersectionLL,
	isIntersectionLC,
	isIntersectionCC,
	isIntersectionLQ,
	isIntersectionQQ,
	isIntersectionLF,
	isIntersectionFF,
	isIntersectionParametric,
	isIntersectionParametricLine,
	isIntersectionParametricCircle,
	isIntersectionParametricFunction,
	isIntersectionParametricSegment,
	isIntersectionParametricRay,
	isReflectedPoint,
	isRotatedPoint,
	isTranslatedPoint,
	isDilatedPoint,
	isReflectedOverLine,
	isFreeVector,
	isFreeVectorPoint,
	isProjectedPoint,
	isAffinityPoint,
	isInvertedPoint,
	isAngle,
	isSegmentMark,
	isText,
	isMathText,
	isRichText,
	isScalar,
	isSlider,
	isPointOnCurve,
	isPointOnQuadraticCurve,
	isPointOnSegment,
	isPointOnLine,
	isPointOnCircle,
	isPointOnArc,
	isPointOnParametricCurve,
	isComputedPoint
} from '../types/elements';
import type { GeoPoint } from '../types/primitives';
import type { GeoValue, ScalarParam } from '../types/geo-value';
import { isScalarRef, isInfinityParam } from '../types/geo-value';
import { geoAdd, geoSub, geoMul, geoDiv, geoSqrt, geoFromNumber } from '../compute/geo-arithmetic';
import { circumcircle } from '../geometry/circumcircle';
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
import { findParametricIntersections } from './parametric-intersection';
import {
	findParametricLineIntersections,
	findParametricCircleIntersections,
	findParametricFunctionIntersections,
	findParametricSegmentIntersections,
	findParametricRayIntersections
} from './parametric-intersection-1d';

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
	if (isInfinityParam(param)) {
		return param.infinity === '+' ? Infinity : -Infinity;
	}
	return geoToNumber(param);
}

/**
 * Resolve a ScalarParam to a GeoValue (for exact arithmetic).
 * If the param is a ScalarRef, wraps the numeric value from scalarValues.
 * If the param is already a GeoValue, returns it directly.
 * `InfinityParam` is rejected here (returns null) — exact arithmetic on ±∞ is
 * undefined; only the numeric resolveScalarParam supports infinity (V5).
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
	if (isInfinityParam(param)) return null;
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
	if (isComputedPoint(el)) {
		const x = resolveScalarParam(el.xParam, scalarValues);
		const y = resolveScalarParam(el.yParam, scalarValues);
		if (!Number.isFinite(x) || !Number.isFinite(y))
			return { position: null, hasComputablePosition: true };
		return { position: { x: numeric(x), y: numeric(y) }, hasComputablePosition: true };
	}

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

	if (isIntersectionParametric(el)) {
		const c1 = elements.get(el.curve1Id);
		const c2 = elements.get(el.curve2Id);
		if (!c1 || c1.type !== 'parametricCurve' || !c2 || c2.type !== 'parametricCurve') {
			return { position: null, hasComputablePosition: true };
		}

		// Resolve parameter bounds from each curve.
		const t1Min = resolveScalarParam(c1.tMin, scalarValues);
		const t1Max = resolveScalarParam(c1.tMax, scalarValues);
		const t2Min = resolveScalarParam(c2.tMin, scalarValues);
		const t2Max = resolveScalarParam(c2.tMax, scalarValues);

		if (
			!Number.isFinite(t1Min) ||
			!Number.isFinite(t1Max) ||
			!Number.isFinite(t2Min) ||
			!Number.isFinite(t2Max)
		) {
			return { position: null, hasComputablePosition: true };
		}

		// Build scalar bindings for each curve from its dependsOn list (sliders/scalars
		// referenced in xExpression/yExpression/tMin/tMax). See `pointOnParametricCurve`
		// branch for the same pattern.
		const bindings1: Record<string, number> = {};
		for (const depId of c1.dependsOn) {
			const depEl = elements.get(depId);
			if (depEl?.label) {
				const val = scalarValues?.get(depId);
				if (val !== undefined) bindings1[depEl.label] = val;
			}
		}
		const bindings2: Record<string, number> = {};
		for (const depId of c2.dependsOn) {
			const depEl = elements.get(depId);
			if (depEl?.label) {
				const val = scalarValues?.get(depId);
				if (val !== undefined) bindings2[depEl.label] = val;
			}
		}

		const intersections = findParametricIntersections(
			c1,
			c2,
			bindings1,
			bindings2,
			t1Min,
			t1Max,
			t2Min,
			t2Max
		);

		// k is 1-indexed; null silently when out of range (no DslRuntimeError).
		if (el.k < 1 || el.k > intersections.length) {
			return { position: null, hasComputablePosition: true };
		}
		const intr = intersections[el.k - 1];
		return {
			position: { x: numeric(intr.x), y: numeric(intr.y) },
			hasComputablePosition: true
		};
	}

	if (isIntersectionParametricLine(el)) {
		const curveEl = elements.get(el.curveId);
		const lineEl = elements.get(el.lineId);
		if (!curveEl || curveEl.type !== 'parametricCurve' || !lineEl || lineEl.type !== 'line') {
			return { position: null, hasComputablePosition: true };
		}

		const tMin = resolveScalarParam(curveEl.tMin, scalarValues);
		const tMax = resolveScalarParam(curveEl.tMax, scalarValues);
		if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) {
			return { position: null, hasComputablePosition: true };
		}

		const p1 = positions.get(lineEl.point1Id);
		const p2 = positions.get(lineEl.point2Id);
		if (!p1 || !p2) return { position: null, hasComputablePosition: true };

		const px = geoToNumber(p1.x);
		const py = geoToNumber(p1.y);
		const vx = geoToNumber(p2.x) - px;
		const vy = geoToNumber(p2.y) - py;

		const bindings = buildCurveBindings(curveEl, elements, scalarValues);
		const intersections = findParametricLineIntersections(
			curveEl,
			bindings,
			tMin,
			tMax,
			px,
			py,
			vx,
			vy
		);
		if (el.k < 1 || el.k > intersections.length) {
			return { position: null, hasComputablePosition: true };
		}
		const intr = intersections[el.k - 1];
		return {
			position: { x: numeric(intr.x), y: numeric(intr.y) },
			hasComputablePosition: true
		};
	}

	if (isIntersectionParametricCircle(el)) {
		const curveEl = elements.get(el.curveId);
		const circleEl = elements.get(el.circleId);
		if (!curveEl || curveEl.type !== 'parametricCurve' || !circleEl) {
			return { position: null, hasComputablePosition: true };
		}

		const tMin = resolveScalarParam(curveEl.tMin, scalarValues);
		const tMax = resolveScalarParam(curveEl.tMax, scalarValues);
		if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) {
			return { position: null, hasComputablePosition: true };
		}

		const circle = getCircleParams(el.circleId, positions, elements, scalarValues);
		if (!circle) return { position: null, hasComputablePosition: true };
		const cx = geoToNumber(circle.center.x);
		const cy = geoToNumber(circle.center.y);
		const r = geoToNumber(circle.radius);
		if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r) || r <= 0) {
			return { position: null, hasComputablePosition: true };
		}

		const bindings = buildCurveBindings(curveEl, elements, scalarValues);
		const intersections = findParametricCircleIntersections(
			curveEl,
			bindings,
			tMin,
			tMax,
			cx,
			cy,
			r
		);
		if (el.k < 1 || el.k > intersections.length) {
			return { position: null, hasComputablePosition: true };
		}
		const intr = intersections[el.k - 1];
		return {
			position: { x: numeric(intr.x), y: numeric(intr.y) },
			hasComputablePosition: true
		};
	}

	if (isIntersectionParametricFunction(el)) {
		const curveEl = elements.get(el.curveId);
		const fnEl = elements.get(el.functionId);
		if (!curveEl || curveEl.type !== 'parametricCurve' || !fnEl || fnEl.type !== 'function') {
			return { position: null, hasComputablePosition: true };
		}

		const tMin = resolveScalarParam(curveEl.tMin, scalarValues);
		const tMax = resolveScalarParam(curveEl.tMax, scalarValues);
		if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) {
			return { position: null, hasComputablePosition: true };
		}

		// Domain bounds (default ±Infinity = unrestricted).
		let xMin = -Infinity;
		let xMax = Infinity;
		if (fnEl.domain) {
			xMin = resolveScalarParam(fnEl.domain.lower, scalarValues);
			xMax = resolveScalarParam(fnEl.domain.upper, scalarValues);
			if (!Number.isFinite(xMin) && xMin !== -Infinity) xMin = -Infinity;
			if (!Number.isFinite(xMax) && xMax !== Infinity) xMax = Infinity;
		}

		const bindings = buildCurveBindings(curveEl, elements, scalarValues);
		const intersections = findParametricFunctionIntersections(
			curveEl,
			bindings,
			tMin,
			tMax,
			fnEl.compiledFn,
			fnEl.compiledDerivative,
			xMin,
			xMax
		);
		if (el.k < 1 || el.k > intersections.length) {
			return { position: null, hasComputablePosition: true };
		}
		const intr = intersections[el.k - 1];
		return {
			position: { x: numeric(intr.x), y: numeric(intr.y) },
			hasComputablePosition: true
		};
	}

	if (isIntersectionParametricSegment(el)) {
		const curveEl = elements.get(el.curveId);
		const segEl = elements.get(el.segmentId);
		if (!curveEl || curveEl.type !== 'parametricCurve' || !segEl || segEl.type !== 'segment') {
			return { position: null, hasComputablePosition: true };
		}

		const tMin = resolveScalarParam(curveEl.tMin, scalarValues);
		const tMax = resolveScalarParam(curveEl.tMax, scalarValues);
		if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) {
			return { position: null, hasComputablePosition: true };
		}

		const p1 = positions.get(segEl.startId);
		const p2 = positions.get(segEl.endId);
		if (!p1 || !p2) return { position: null, hasComputablePosition: true };

		const p1x = geoToNumber(p1.x);
		const p1y = geoToNumber(p1.y);
		const p2x = geoToNumber(p2.x);
		const p2y = geoToNumber(p2.y);

		const bindings = buildCurveBindings(curveEl, elements, scalarValues);
		const intersections = findParametricSegmentIntersections(
			curveEl,
			bindings,
			tMin,
			tMax,
			p1x,
			p1y,
			p2x,
			p2y
		);
		if (el.k < 1 || el.k > intersections.length) {
			return { position: null, hasComputablePosition: true };
		}
		const intr = intersections[el.k - 1];
		return {
			position: { x: numeric(intr.x), y: numeric(intr.y) },
			hasComputablePosition: true
		};
	}

	if (isIntersectionParametricRay(el)) {
		const curveEl = elements.get(el.curveId);
		const rayEl = elements.get(el.rayId);
		if (!curveEl || curveEl.type !== 'parametricCurve' || !rayEl || rayEl.type !== 'ray') {
			return { position: null, hasComputablePosition: true };
		}

		const tMin = resolveScalarParam(curveEl.tMin, scalarValues);
		const tMax = resolveScalarParam(curveEl.tMax, scalarValues);
		if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) {
			return { position: null, hasComputablePosition: true };
		}

		const origin = positions.get(rayEl.originId);
		const through = positions.get(rayEl.throughId);
		if (!origin || !through) return { position: null, hasComputablePosition: true };

		const ox = geoToNumber(origin.x);
		const oy = geoToNumber(origin.y);
		const vx = geoToNumber(through.x) - ox;
		const vy = geoToNumber(through.y) - oy;

		const bindings = buildCurveBindings(curveEl, elements, scalarValues);
		const intersections = findParametricRayIntersections(
			curveEl,
			bindings,
			tMin,
			tMax,
			ox,
			oy,
			vx,
			vy
		);
		if (el.k < 1 || el.k > intersections.length) {
			return { position: null, hasComputablePosition: true };
		}
		const intr = intersections[el.k - 1];
		return {
			position: { x: numeric(intr.x), y: numeric(intr.y) },
			hasComputablePosition: true
		};
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

	if (isFreeVectorPoint(el)) {
		const vec = elements.get(el.vectorId);
		if (!vec || !isFreeVector(vec)) {
			return { position: null, hasComputablePosition: true };
		}
		const ax = geoToNumber(vec.anchorX);
		const ay = geoToNumber(vec.anchorY);
		if (el.which === 'anchor') {
			return { position: { x: numeric(ax), y: numeric(ay) }, hasComputablePosition: true };
		}
		// 'end' : anchor + (dx, dy)
		const dx = geoToNumber(vec.dx);
		const dy = geoToNumber(vec.dy);
		return {
			position: { x: numeric(ax + dx), y: numeric(ay + dy) },
			hasComputablePosition: true
		};
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

	if (isText(el) || isMathText(el) || isRichText(el)) {
		// Text elements have no position or scalar value — they are display-only
		return { position: null, hasComputablePosition: false };
	}

	if (isOsculatingCircle(el)) {
		const curveEl = elements.get(el.curveId);
		if (!curveEl || curveEl.type !== 'parametricCurve') {
			return { position: null, hasComputablePosition: true };
		}
		const t0 = resolveScalarParam(el.t, scalarValues);
		if (!Number.isFinite(t0)) return { position: null, hasComputablePosition: true };
		const tMin = resolveScalarParam(curveEl.tMin, scalarValues);
		const tMax = resolveScalarParam(curveEl.tMax, scalarValues);
		if (Number.isFinite(tMin) && Number.isFinite(tMax) && (t0 < tMin || t0 > tMax)) {
			return { position: null, hasComputablePosition: true };
		}
		const bindings = buildCurveBindings(curveEl, elements, scalarValues);
		const data = computeOsculatingCircle(curveEl, bindings, t0);
		if (!data) return { position: null, hasComputablePosition: true };
		return {
			position: { x: numeric(data.centerX), y: numeric(data.centerY) },
			hasComputablePosition: true
		};
	}

	if (isScalar(el)) {
		const scalarValue = computeScalarValue(el, positions, elements, scalarValues);
		return { position: null, hasComputablePosition: false, scalarValue };
	}

	if (isSlider(el)) {
		return { position: null, hasComputablePosition: false, scalarValue: el.value };
	}

	if (isAngle(el)) {
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
		if (
			circEl &&
			(circEl.type === 'circleByRadius' ||
				circEl.type === 'circleByPoint' ||
				circEl.type === 'circleBy3Points')
		) {
			let cx: number, cy: number, r: number;
			if (circEl.type === 'circleBy3Points') {
				const p1 = positions.get(circEl.point1Id);
				const p2 = positions.get(circEl.point2Id);
				const p3 = positions.get(circEl.point3Id);
				if (!p1 || !p2 || !p3) return { position: null, hasComputablePosition: true };
				const cc = circumcircle(
					geoToNumber(p1.x),
					geoToNumber(p1.y),
					geoToNumber(p2.x),
					geoToNumber(p2.y),
					geoToNumber(p3.x),
					geoToNumber(p3.y)
				);
				if (!cc) return { position: null, hasComputablePosition: true };
				cx = cc.ux;
				cy = cc.uy;
				r = cc.r;
			} else {
				const centerPos = positions.get(circEl.centerId);
				if (!centerPos) return { position: null, hasComputablePosition: true };
				cx = geoToNumber(centerPos.x);
				cy = geoToNumber(centerPos.y);
				if (circEl.type === 'circleByRadius') {
					r = resolveScalarParam(circEl.radius, scalarValues);
				} else {
					const edgePos = positions.get(circEl.edgePointId);
					if (!edgePos) return { position: null, hasComputablePosition: true };
					const dx = geoToNumber(edgePos.x) - cx;
					const dy = geoToNumber(edgePos.y) - cy;
					r = Math.sqrt(dx * dx + dy * dy);
				}
			}
			if (!Number.isFinite(r)) return { position: null, hasComputablePosition: true };
			const x = cx + r * Math.cos(el.theta);
			const y = cy + r * Math.sin(el.theta);
			return { position: { x: numeric(x), y: numeric(y) }, hasComputablePosition: true };
		}
		return { position: null, hasComputablePosition: true };
	}

	if (isPointOnParametricCurve(el)) {
		const curveEl = elements.get(el.parametricCurveId);
		if (curveEl && curveEl.type === 'parametricCurve') {
			const t0 = resolveScalarParam(el.t, scalarValues);
			if (!Number.isFinite(t0)) return { position: null, hasComputablePosition: true };
			// NOTE: this duplicates the scalar-bindings injection logic from
			// `evalParametricAtT` in `rendering/svg-primitives.ts` (used for
			// tangent rendering). Both paths must stay in sync. They are
			// intentionally separate to keep graph/ and rendering/ decoupled.
			// Inject scalar bindings for any slider/scalar referenced by the curve
			// (e.g. `a*cos(t)` where `a` is a slider). Without these, free variables
			// would resolve to NaN/undefined and γ(t0) would be non-finite.
			const scalarBindings: Record<string, number> = {};
			for (const depId of curveEl.dependsOn) {
				const depEl = elements.get(depId);
				if (depEl?.label) {
					const val = scalarValues?.get(depId);
					if (val !== undefined) scalarBindings[depEl.label] = val;
				}
			}
			const env = { ...scalarBindings, [curveEl.parameter]: t0 };
			const x = curveEl.compiledX(env);
			const y = curveEl.compiledY(env);
			if (!Number.isFinite(x) || !Number.isFinite(y)) {
				return { position: null, hasComputablePosition: true };
			}
			return { position: { x: numeric(x), y: numeric(y) }, hasComputablePosition: true };
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

/**
 * Build the scalar bindings (sliders/scalars referenced in xExpression/yExpression
 * /tMin/tMax) for a parametric curve. Mirrors the inline logic used by both the
 * point-on-parametric branch and the parametric × parametric (V1) intersection.
 */
export function buildCurveBindings(
	curveEl: import('../types/elements').GeoParametricCurve,
	elements: ReadonlyMap<string, GeoElement>,
	scalarValues?: ReadonlyMap<string, number>
): Record<string, number> {
	const bindings: Record<string, number> = {};
	for (const depId of curveEl.dependsOn) {
		const depEl = elements.get(depId);
		if (depEl?.label) {
			const val = scalarValues?.get(depId);
			if (val !== undefined) bindings[depEl.label] = val;
		}
	}
	return bindings;
}

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
	if (el.type === 'circleBy3Points') {
		const p1 = positions.get(el.point1Id);
		const p2 = positions.get(el.point2Id);
		const p3 = positions.get(el.point3Id);
		if (!p1 || !p2 || !p3) return null;
		const cc = circumcircle(
			geoToNumber(p1.x),
			geoToNumber(p1.y),
			geoToNumber(p2.x),
			geoToNumber(p2.y),
			geoToNumber(p3.x),
			geoToNumber(p3.y)
		);
		if (!cc) return null;
		const center: GeoPoint = {
			x: { kind: 'numeric', value: cc.ux },
			y: { kind: 'numeric', value: cc.uy }
		};
		const radius: GeoValue = { kind: 'numeric', value: cc.r };
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
		case 'angle_measure': {
			// Unsigned angle in [0, π] at vertex V between rays V→A and V→B.
			const [p1Id, vertexId, p2Id] = el.targetIds;
			const a = positions.get(p1Id);
			const v = positions.get(vertexId);
			const b = positions.get(p2Id);
			if (!a || !v || !b) return undefined;
			const ux = geoToNumber(a.x) - geoToNumber(v.x);
			const uy = geoToNumber(a.y) - geoToNumber(v.y);
			const wx = geoToNumber(b.x) - geoToNumber(v.x);
			const wy = geoToNumber(b.y) - geoToNumber(v.y);
			const uLen = Math.hypot(ux, uy);
			const wLen = Math.hypot(wx, wy);
			if (uLen < 1e-15 || wLen < 1e-15) return undefined;
			let cos = (ux * wx + uy * wy) / (uLen * wLen);
			if (cos > 1) cos = 1;
			else if (cos < -1) cos = -1;
			const rad = Math.acos(cos);
			return el.unite === 'deg' ? (rad * 180) / Math.PI : rad;
		}
		case 'vectors_angle_measure': {
			// Unsigned angle in [0, π] between two vectors u and v.
			const [vec1Id, vec2Id] = el.targetIds;
			const c1 = resolveVectorComponents(vec1Id, elements, positions);
			const c2 = resolveVectorComponents(vec2Id, elements, positions);
			if (!c1 || !c2) return undefined;
			const ux = geoToNumber(c1.dx);
			const uy = geoToNumber(c1.dy);
			const wx = geoToNumber(c2.dx);
			const wy = geoToNumber(c2.dy);
			const uLen = Math.hypot(ux, uy);
			const wLen = Math.hypot(wx, wy);
			if (uLen < 1e-15 || wLen < 1e-15) return undefined;
			let cos = (ux * wx + uy * wy) / (uLen * wLen);
			if (cos > 1) cos = 1;
			else if (cos < -1) cos = -1;
			const rad = Math.acos(cos);
			return el.unite === 'deg' ? (rad * 180) / Math.PI : rad;
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
		case 'perimeter': {
			const pts = el.targetIds.map((tid) => positions.get(tid));
			if (pts.some((p) => !p)) return undefined;
			let perimeter = 0;
			const n = pts.length;
			for (let i = 0; i < n; i++) {
				const cur = pts[i]!;
				const next = pts[(i + 1) % n]!;
				const pdx = geoToNumber(next.x) - geoToNumber(cur.x);
				const pdy = geoToNumber(next.y) - geoToNumber(cur.y);
				perimeter += Math.sqrt(pdx * pdx + pdy * pdy);
			}
			return perimeter;
		}
		case 'slope': {
			const lineEl = elements.get(el.targetIds[0]);
			if (!lineEl) return undefined;
			let sp1Id: string, sp2Id: string;
			if (lineEl.type === 'line') {
				sp1Id = lineEl.point1Id;
				sp2Id = lineEl.point2Id;
			} else if (lineEl.type === 'segment') {
				sp1Id = lineEl.startId;
				sp2Id = lineEl.endId;
			} else if (lineEl.type === 'ray') {
				sp1Id = lineEl.originId;
				sp2Id = lineEl.throughId;
			} else {
				return undefined;
			}
			const sa = positions.get(sp1Id);
			const sb = positions.get(sp2Id);
			if (!sa || !sb) return undefined;
			const sdx = geoToNumber(sb.x) - geoToNumber(sa.x);
			const sdy = geoToNumber(sb.y) - geoToNumber(sa.y);
			if (Math.abs(sdx) < 1e-15) return undefined; // vertical line, slope undefined
			return sdy / sdx;
		}
		case 'radius': {
			const circParams = getCircleParams(el.targetIds[0], positions, elements, scalarValues);
			if (!circParams) return undefined;
			return geoToNumber(circParams.radius);
		}
		case 'power': {
			const [pointId, circleId] = el.targetIds;
			const point = positions.get(pointId);
			const circParams = getCircleParams(circleId, positions, elements, scalarValues);
			if (!point || !circParams) return undefined;
			const dx = geoToNumber(point.x) - geoToNumber(circParams.center.x);
			const dy = geoToNumber(point.y) - geoToNumber(circParams.center.y);
			const distSq = dx * dx + dy * dy;
			const r = geoToNumber(circParams.radius);
			return distSq - r * r;
		}
		case 'expression': {
			if (!el.compute) return undefined;
			try {
				return el.compute(scalarValues ?? new Map());
			} catch {
				return undefined;
			}
		}
		case 'coordinate': {
			const pos = positions.get(el.targetIds[0]);
			if (!pos) return undefined;
			return geoToNumber(el.coordinateAxis === 'x' ? pos.x : pos.y);
		}
		case 'arcLength': {
			if (!el.curveId) return undefined;
			const curveEl = elements.get(el.curveId);
			if (!curveEl || curveEl.type !== 'parametricCurve') return undefined;
			// Use explicit bounds when provided, otherwise fall back to the
			// curve's own [tMin, tMax].
			const tMinParam = el.tMin ?? curveEl.tMin;
			const tMaxParam = el.tMax ?? curveEl.tMax;
			const tMin = resolveScalarParam(tMinParam, scalarValues);
			const tMax = resolveScalarParam(tMaxParam, scalarValues);
			if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return undefined;
			const bindings = buildCurveBindings(curveEl, elements, scalarValues);
			const L = computeArcLength(curveEl, bindings, tMin, tMax);
			return Number.isFinite(L) ? L : undefined;
		}
		case 'curvature': {
			if (!el.curveId || el.t === undefined) return undefined;
			const curveEl = elements.get(el.curveId);
			if (!curveEl || curveEl.type !== 'parametricCurve') return undefined;
			const t0 = resolveScalarParam(el.t, scalarValues);
			if (!Number.isFinite(t0)) return undefined;
			const tMin = resolveScalarParam(curveEl.tMin, scalarValues);
			const tMax = resolveScalarParam(curveEl.tMax, scalarValues);
			if (Number.isFinite(tMin) && Number.isFinite(tMax) && (t0 < tMin || t0 > tMax)) {
				return undefined;
			}
			const bindings = buildCurveBindings(curveEl, elements, scalarValues);
			const k = computeCurvature(curveEl, bindings, t0);
			return k === null ? undefined : k;
		}
	}
}
