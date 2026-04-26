/**
 * Transform application — applies a transformation object to geometric elements.
 *
 * Used by both `transforme(r, A)` builtin and direct application syntax.
 */

import type { Figure } from '../graph/figure';
import type {
	GeoTransformation,
	GeoSegment,
	GeoLine,
	GeoRay,
	GeoCircleByRadius,
	GeoCircleByPoint,
	GeoArcByPoints,
	GeoArcByAngles,
	GeoPolygon,
	GeoVectorByPoints,
	GeoFunction,
	GeoQuadraticCurve,
	GeoImplicitCurve
} from '../types/elements';
import { isTransformation } from '../types/elements';
import type { SymbolType } from './symbol-table';
import { geoMul, geoAdd } from '../compute/geo-arithmetic';
import type { GeoValue } from '../types/geo-value';
import { numeric } from '../types/geo-value';
import { geoToNumber } from '../compute/to-number';
import type { CompiledFn } from '$lib/mathAST/eval/compile';
import { number as mathNumber } from '$lib/mathAST/factory';

export interface TransformResult {
	figureId: string;
	symbolType: SymbolType;
}

/**
 * Apply a transformation to a single point, creating a new image point.
 * Returns the figureId of the created point.
 */
export function applyTransformationToPoint(
	figure: Figure,
	transform: GeoTransformation,
	sourcePointId: string,
	options?: { label?: string; visible?: boolean }
): string {
	const visible = options?.visible ?? true;
	const label = options?.label;

	switch (transform.type) {
		case 'rotation':
			return figure.createRotatedPoint(sourcePointId, transform.centerId, transform.angle, {
				label,
				visible
			});

		case 'reflection':
			return figure.createReflectedPoint(sourcePointId, transform.centerId, { label, visible });

		case 'reflectionOverLine':
			return figure.createReflectedOverLine(
				sourcePointId,
				transform.linePoint1Id,
				transform.linePoint2Id,
				{ label, visible }
			);

		case 'translation':
			if (transform.vectorId) {
				return figure.createTranslatedPointByVector(sourcePointId, transform.vectorId, {
					label,
					visible
				});
			}
			return figure.createTranslatedPoint(
				sourcePointId,
				transform.vectorStartId,
				transform.vectorEndId,
				{ label, visible }
			);

		case 'homothety':
			return figure.createDilatedPoint(sourcePointId, transform.centerId, transform.factor, {
				label,
				visible
			});

		case 'projection':
			return figure.createProjectedPoint(
				sourcePointId,
				transform.linePoint1Id,
				transform.linePoint2Id,
				{ label, visible }
			);

		case 'affinity':
			return figure.createAffinityPoint(
				sourcePointId,
				transform.linePoint1Id,
				transform.linePoint2Id,
				transform.factor,
				{ label, visible }
			);

		case 'composition': {
			// Apply transformations right-to-left: compose(r, t) applies t then r
			const ids = transform.transformationIds;
			let currentPtId = sourcePointId;
			for (let i = ids.length - 1; i >= 0; i--) {
				const subTransform = figure.getElementById(ids[i]);
				if (!subTransform || !isTransformation(subTransform)) {
					throw new Error(`composition: "${ids[i]}" is not a transformation`);
				}
				const isLast = i === 0;
				currentPtId = applyTransformationToPoint(figure, subTransform, currentPtId, {
					label: isLast ? label : undefined,
					visible: isLast ? visible : false
				});
			}
			return currentPtId;
		}
	}
}

/**
 * Apply the linear part of a transformation to vector components (dx, dy).
 * Translation has no effect on free vectors (they are displacement-invariant).
 */
function transformVectorLinear(
	transform: GeoTransformation,
	dx: GeoValue,
	dy: GeoValue,
	figure: Figure
): { dx: GeoValue; dy: GeoValue } {
	switch (transform.type) {
		case 'rotation': {
			const angle = geoToNumber(transform.angle);
			const cos = Math.cos(angle);
			const sin = Math.sin(angle);
			const dxNum = geoToNumber(dx);
			const dyNum = geoToNumber(dy);
			return {
				dx: numeric(dxNum * cos - dyNum * sin),
				dy: numeric(dxNum * sin + dyNum * cos)
			};
		}
		case 'reflection':
			// Central symmetry: negate both components
			return {
				dx: geoMul(numeric(-1), dx),
				dy: geoMul(numeric(-1), dy)
			};
		case 'reflectionOverLine': {
			// Reflect vector (dx, dy) over the line direction
			const lp1 = figure.getPosition(transform.linePoint1Id);
			const lp2 = figure.getPosition(transform.linePoint2Id);
			if (!lp1 || !lp2) return { dx, dy };
			const ldx = geoToNumber(lp2.x) - geoToNumber(lp1.x);
			const ldy = geoToNumber(lp2.y) - geoToNumber(lp1.y);
			const len2 = ldx * ldx + ldy * ldy;
			if (len2 < 1e-15) return { dx, dy };
			// Reflection matrix: R = (1/len2) * [[ldx²-ldy², 2*ldx*ldy], [2*ldx*ldy, ldy²-ldx²]]
			const dxN = geoToNumber(dx);
			const dyN = geoToNumber(dy);
			const newDx = ((ldx * ldx - ldy * ldy) * dxN + 2 * ldx * ldy * dyN) / len2;
			const newDy = (2 * ldx * ldy * dxN + (ldy * ldy - ldx * ldx) * dyN) / len2;
			return { dx: numeric(newDx), dy: numeric(newDy) };
		}
		case 'translation':
			// Translation has no effect on free vectors
			return { dx, dy };
		case 'projection': {
			// Project vector onto line direction
			const lp1 = figure.getPosition(transform.linePoint1Id);
			const lp2 = figure.getPosition(transform.linePoint2Id);
			if (!lp1 || !lp2) return { dx, dy };
			const ldx = geoToNumber(lp2.x) - geoToNumber(lp1.x);
			const ldy = geoToNumber(lp2.y) - geoToNumber(lp1.y);
			const len2 = ldx * ldx + ldy * ldy;
			if (len2 < 1e-15) return { dx, dy };
			const dxN = geoToNumber(dx);
			const dyN = geoToNumber(dy);
			const dot = (dxN * ldx + dyN * ldy) / len2;
			return { dx: numeric(dot * ldx), dy: numeric(dot * ldy) };
		}
		case 'affinity': {
			// Affinity: scale the component perpendicular to the axis by factor
			const alp1 = figure.getPosition(transform.linePoint1Id);
			const alp2 = figure.getPosition(transform.linePoint2Id);
			if (!alp1 || !alp2) return { dx, dy };
			const aldx = geoToNumber(alp2.x) - geoToNumber(alp1.x);
			const aldy = geoToNumber(alp2.y) - geoToNumber(alp1.y);
			const alen2 = aldx * aldx + aldy * aldy;
			if (alen2 < 1e-15) return { dx, dy };
			const dxN = geoToNumber(dx);
			const dyN = geoToNumber(dy);
			const k = geoToNumber(transform.factor);
			// Decompose into parallel + perpendicular, scale perp by k
			const parDot = (dxN * aldx + dyN * aldy) / alen2;
			const parX = parDot * aldx,
				parY = parDot * aldy;
			const perpX = dxN - parX,
				perpY = dyN - parY;
			return { dx: numeric(parX + k * perpX), dy: numeric(parY + k * perpY) };
		}
		case 'homothety':
			return {
				dx: geoMul(transform.factor, dx),
				dy: geoMul(transform.factor, dy)
			};
		case 'composition': {
			let curDx = dx;
			let curDy = dy;
			for (let i = transform.transformationIds.length - 1; i >= 0; i--) {
				const subEl = figure.getElementById(transform.transformationIds[i]);
				if (subEl && isTransformation(subEl)) {
					const result = transformVectorLinear(subEl, curDx, curDy, figure);
					curDx = result.dx;
					curDy = result.dy;
				}
			}
			return { dx: curDx, dy: curDy };
		}
	}
}

/**
 * Apply a transformation to any geometric element.
 * For points, creates a single image point.
 * For compound elements (segments, circles, etc.), creates intermediate invisible
 * points and then the image element. Returns the main result element.
 *
 * Currently supports: point.
 * Extended in later phases for segment, line, ray, circle, arc, polygon, vector.
 */
export function applyTransformationToElement(
	figure: Figure,
	transformId: string,
	sourceId: string,
	sourceType: SymbolType,
	options?: { label?: string }
): TransformResult {
	const transformEl = figure.getElementById(transformId);
	if (!transformEl || !isTransformation(transformEl)) {
		throw new Error(`applyTransformationToElement: "${transformId}" is not a transformation`);
	}

	const sourceEl = figure.getElementById(sourceId);
	if (!sourceEl) {
		throw new Error(`applyTransformationToElement: element "${sourceId}" introuvable`);
	}

	// Projection only supports point-based objects (not circles, curves, conics)
	if (containsNonAffineTransform(transformEl, figure, 'projection')) {
		const unsupported: SymbolType[] = ['cercle', 'courbe', 'arc'];
		if (unsupported.includes(sourceType)) {
			throw new Error(`La projection ne supporte pas la transformation de type "${sourceType}"`);
		}
	}

	switch (sourceType) {
		case 'point': {
			const ptId = applyTransformationToPoint(figure, transformEl, sourceId, {
				label: options?.label
			});
			return { figureId: ptId, symbolType: 'point' };
		}

		case 'segment': {
			const seg = sourceEl as GeoSegment;
			const newStart = applyTransformationToPoint(figure, transformEl, seg.startId, {
				visible: false
			});
			const newEnd = applyTransformationToPoint(figure, transformEl, seg.endId, { visible: false });
			const id = figure.createSegment(newStart, newEnd, { label: options?.label });
			return { figureId: id, symbolType: 'segment' };
		}

		case 'droite': {
			const ln = sourceEl as GeoLine;
			const newP1 = applyTransformationToPoint(figure, transformEl, ln.point1Id, {
				visible: false
			});
			const newP2 = applyTransformationToPoint(figure, transformEl, ln.point2Id, {
				visible: false
			});
			const id = figure.createLine(newP1, newP2, { label: options?.label });
			return { figureId: id, symbolType: 'droite' };
		}

		case 'demidroite': {
			const ray = sourceEl as GeoRay;
			const newOrigin = applyTransformationToPoint(figure, transformEl, ray.originId, {
				visible: false
			});
			const newThrough = applyTransformationToPoint(figure, transformEl, ray.throughId, {
				visible: false
			});
			const id = figure.createRay(newOrigin, newThrough, { label: options?.label });
			return { figureId: id, symbolType: 'demidroite' };
		}

		case 'cercle': {
			if (sourceEl.type === 'circleByPoint') {
				const circ = sourceEl as GeoCircleByPoint;
				const newCenter = applyTransformationToPoint(figure, transformEl, circ.centerId, {
					visible: false
				});
				const newEdge = applyTransformationToPoint(figure, transformEl, circ.edgePointId, {
					visible: false
				});
				const id = figure.createCircleByPoint(newCenter, newEdge, { label: options?.label });
				return { figureId: id, symbolType: 'cercle' };
			}
			// circleByRadius
			const circ = sourceEl as GeoCircleByRadius;
			const newCenter = applyTransformationToPoint(figure, transformEl, circ.centerId, {
				visible: false
			});
			// For homothety, scale the radius by |factor|
			let newRadius = circ.radius;
			if (transformEl.type === 'homothety') {
				const absFactor = Math.abs(geoToNumber(transformEl.factor));
				newRadius = geoMul(numeric(absFactor), circ.radius);
			}
			const id = figure.createCircleByRadius(newCenter, newRadius, { label: options?.label });
			return { figureId: id, symbolType: 'cercle' };
		}

		case 'arc': {
			if (sourceEl.type === 'arcByPoints') {
				const arc = sourceEl as GeoArcByPoints;
				const newStart = applyTransformationToPoint(figure, transformEl, arc.startId, {
					visible: false
				});
				const newCenter = applyTransformationToPoint(figure, transformEl, arc.centerId, {
					visible: false
				});
				const newEnd = applyTransformationToPoint(figure, transformEl, arc.endId, {
					visible: false
				});
				const id = figure.createArcByPoints(newStart, newCenter, newEnd, { label: options?.label });
				return { figureId: id, symbolType: 'arc' };
			}
			// arcByAngles — transform center, adjust radius/angles based on transformation type
			const arc = sourceEl as GeoArcByAngles;
			const newCenter = applyTransformationToPoint(figure, transformEl, arc.centerId, {
				visible: false
			});
			let newRadius = arc.radius;
			let newStartAngle = arc.startAngle;
			let newEndAngle = arc.endAngle;

			if (transformEl.type === 'rotation') {
				// Offset angles by rotation angle
				newStartAngle = geoAdd(arc.startAngle, transformEl.angle);
				newEndAngle = geoAdd(arc.endAngle, transformEl.angle);
			} else if (transformEl.type === 'homothety') {
				const absFactor = Math.abs(geoToNumber(transformEl.factor));
				newRadius = geoMul(numeric(absFactor), arc.radius);
				// Negative factor reverses direction (swap angles)
				if (geoToNumber(transformEl.factor) < 0) {
					const piVal = numeric(Math.PI);
					newStartAngle = geoAdd(arc.startAngle, piVal);
					newEndAngle = geoAdd(arc.endAngle, piVal);
				}
			} else if (transformEl.type === 'reflection' || transformEl.type === 'reflectionOverLine') {
				// Reflection reverses sweep direction: swap start/end and negate angles
				// For central symmetry: add pi to both angles
				if (transformEl.type === 'reflection') {
					const piVal = numeric(Math.PI);
					newStartAngle = geoAdd(arc.endAngle, piVal);
					newEndAngle = geoAdd(arc.startAngle, piVal);
				} else {
					// Axial symmetry: negate and swap
					const negStart: GeoValue = numeric(-geoToNumber(arc.startAngle));
					const negEnd: GeoValue = numeric(-geoToNumber(arc.endAngle));
					newStartAngle = negEnd;
					newEndAngle = negStart;
				}
			}
			// translation: angles and radius unchanged

			const id = figure.createArcByAngles(newCenter, newRadius, newStartAngle, newEndAngle, {
				label: options?.label
			});
			return { figureId: id, symbolType: 'arc' };
		}

		case 'polygone': {
			const poly = sourceEl as GeoPolygon;
			const newVertices = poly.dependsOn.map((vtxId) =>
				applyTransformationToPoint(figure, transformEl, vtxId, { visible: false })
			);
			if (newVertices.length < 3) {
				throw new Error('transforme(): polygon needs at least 3 vertices');
			}
			const id = figure.createPolygon(newVertices as [string, string, string, ...string[]], {
				label: options?.label
			});
			return { figureId: id, symbolType: 'polygone' };
		}

		case 'vecteur': {
			// Bound vector (by points): transform both points
			if (sourceEl.type === 'vectorByPoints') {
				const vec = sourceEl as GeoVectorByPoints;
				const newStart = applyTransformationToPoint(figure, transformEl, vec.startId, {
					visible: false
				});
				const newEnd = applyTransformationToPoint(figure, transformEl, vec.endId, {
					visible: false
				});
				const id = figure.createVectorByPoints(newStart, newEnd, { label: options?.label });
				return { figureId: id, symbolType: 'vecteur' };
			}

			// Free or derived vector: resolve to components, apply linear part
			const components = figure.getVectorComponents(sourceId);
			if (!components) {
				throw new Error('transforme(): cannot resolve vector components');
			}
			const { dx, dy } = transformVectorLinear(transformEl, components.dx, components.dy, figure);
			const id = figure.createFreeVector(dx, dy, undefined, { label: options?.label });
			return { figureId: id, symbolType: 'vecteur' };
		}

		case 'courbe': {
			return transformCurve(figure, transformEl, sourceEl, options);
		}

		default:
			throw new Error(`transforme() ne supporte pas encore le type "${sourceType}"`);
	}
}

/**
 * Check if a transformation (or any sub-transform in a composition) contains a specific type.
 */
function containsNonAffineTransform(
	transform: GeoTransformation,
	figure: Figure,
	type: string
): boolean {
	if (transform.type === type) return true;
	if (transform.type === 'composition') {
		return transform.transformationIds.some((tId) => {
			const sub = figure.getElementById(tId);
			return sub && isTransformation(sub) && containsNonAffineTransform(sub, figure, type);
		});
	}
	return false;
}

// =============================================================================
// Curve transformation helpers
// =============================================================================

/**
 * Build the inverse transformation function: (x, y) → T⁻¹(x, y).
 * Returns a function that maps output coordinates back to input coordinates.
 */
function buildInverseTransformCoords(
	transform: GeoTransformation,
	figure: Figure
): (x: number, y: number) => { x: number; y: number } {
	// Closures read positions at each call (not at creation time) so transformed
	// curves stay reactive when transformation-defining points move.
	switch (transform.type) {
		case 'rotation': {
			const centerId = transform.centerId;
			const negAngle = -geoToNumber(transform.angle);
			return (x, y) => {
				const cPos = figure.getPosition(centerId);
				if (!cPos) return { x, y };
				const cx = geoToNumber(cPos.x),
					cy = geoToNumber(cPos.y);
				const cos = Math.cos(negAngle),
					sin = Math.sin(negAngle);
				return {
					x: cx + (x - cx) * cos - (y - cy) * sin,
					y: cy + (x - cx) * sin + (y - cy) * cos
				};
			};
		}
		case 'reflection': {
			const centerId = transform.centerId;
			return (x, y) => {
				const cPos = figure.getPosition(centerId);
				if (!cPos) return { x, y };
				return {
					x: 2 * geoToNumber(cPos.x) - x,
					y: 2 * geoToNumber(cPos.y) - y
				};
			};
		}
		case 'reflectionOverLine': {
			const lp1Id = transform.linePoint1Id,
				lp2Id = transform.linePoint2Id;
			return (x, y) => {
				const lp1 = figure.getPosition(lp1Id),
					lp2 = figure.getPosition(lp2Id);
				if (!lp1 || !lp2) return { x, y };
				const x1 = geoToNumber(lp1.x),
					y1 = geoToNumber(lp1.y);
				const dx = geoToNumber(lp2.x) - x1,
					dy = geoToNumber(lp2.y) - y1;
				const len2 = dx * dx + dy * dy;
				if (len2 < 1e-15) return { x, y };
				const t = ((x - x1) * dx + (y - y1) * dy) / len2;
				return { x: 2 * (x1 + t * dx) - x, y: 2 * (y1 + t * dy) - y };
			};
		}
		case 'translation': {
			const vecId = transform.vectorId;
			const vsId = transform.vectorStartId,
				veId = transform.vectorEndId;
			return (x, y) => {
				if (vecId) {
					const comp = figure.getVectorComponents(vecId);
					if (!comp) return { x, y };
					return { x: x - geoToNumber(comp.dx), y: y - geoToNumber(comp.dy) };
				}
				const vs = figure.getPosition(vsId),
					ve = figure.getPosition(veId);
				if (!vs || !ve) return { x, y };
				return {
					x: x - (geoToNumber(ve.x) - geoToNumber(vs.x)),
					y: y - (geoToNumber(ve.y) - geoToNumber(vs.y))
				};
			};
		}
		case 'projection': {
			const lp1Id = transform.linePoint1Id,
				lp2Id = transform.linePoint2Id;
			return (x, y) => {
				const lp1 = figure.getPosition(lp1Id),
					lp2 = figure.getPosition(lp2Id);
				if (!lp1 || !lp2) return { x, y };
				const x1 = geoToNumber(lp1.x),
					y1 = geoToNumber(lp1.y);
				const dx = geoToNumber(lp2.x) - x1,
					dy = geoToNumber(lp2.y) - y1;
				const len2 = dx * dx + dy * dy;
				if (len2 < 1e-15) return { x, y };
				const t = ((x - x1) * dx + (y - y1) * dy) / len2;
				return { x: x1 + t * dx, y: y1 + t * dy };
			};
		}
		case 'affinity': {
			const alp1Id = transform.linePoint1Id,
				alp2Id = transform.linePoint2Id;
			const ak = geoToNumber(transform.factor);
			const invK = Math.abs(ak) < 1e-15 ? 1 : 1 / ak;
			return (x, y) => {
				const alp1 = figure.getPosition(alp1Id),
					alp2 = figure.getPosition(alp2Id);
				if (!alp1 || !alp2) return { x, y };
				const x1 = geoToNumber(alp1.x),
					y1 = geoToNumber(alp1.y);
				const adx = geoToNumber(alp2.x) - x1,
					ady = geoToNumber(alp2.y) - y1;
				const alen2 = adx * adx + ady * ady;
				if (alen2 < 1e-15) return { x, y };
				// Project onto line, then apply inverse affinity
				const t = ((x - x1) * adx + (y - y1) * ady) / alen2;
				const hx = x1 + t * adx,
					hy = y1 + t * ady;
				return { x: hx + invK * (x - hx), y: hy + invK * (y - hy) };
			};
		}
		case 'homothety': {
			const centerId = transform.centerId;
			const k = geoToNumber(transform.factor);
			const invK = Math.abs(k) < 1e-15 ? 1 : 1 / k;
			return (x, y) => {
				const cPos = figure.getPosition(centerId);
				if (!cPos) return { x, y };
				const cx = geoToNumber(cPos.x),
					cy = geoToNumber(cPos.y);
				return {
					x: cx + (x - cx) * invK,
					y: cy + (y - cy) * invK
				};
			};
		}
		case 'composition': {
			const inverseFns = transform.transformationIds.map((tId) => {
				const subEl = figure.getElementById(tId);
				if (!subEl || !isTransformation(subEl)) return (x: number, y: number) => ({ x, y });
				return buildInverseTransformCoords(subEl, figure);
			});
			return (x, y) => {
				let cur = { x, y };
				for (const fn of inverseFns) {
					cur = fn(cur.x, cur.y);
				}
				return cur;
			};
		}
	}
}

/** Transform a curve element (function, quadratic, implicit). */
function transformCurve(
	figure: Figure,
	transform: GeoTransformation,
	sourceEl: { type: string; id: string } & Record<string, unknown>,
	options?: { label?: string }
): TransformResult {
	if (sourceEl.type === 'quadraticCurve') {
		// Conic → Conic (preserves capabilities + reactive via transformRecipe)
		const qc = sourceEl as unknown as GeoQuadraticCurve;
		const id = figure.createTransformedQuadraticCurve(qc.coefficients, transform.id, {
			label: options?.label
		});
		return { figureId: id, symbolType: 'courbe' };
	}

	// GeoFunction or GeoImplicitCurve → GeoImplicitCurve
	const inverseFn = buildInverseTransformCoords(transform, figure);
	let wrappedFn: CompiledFn;

	if (sourceEl.type === 'function') {
		const fn = sourceEl as unknown as GeoFunction;
		// y = f(x) becomes F(x,y) = y - f(x) = 0, then compose with T⁻¹
		wrappedFn = (vars: Record<string, number>) => {
			const inv = inverseFn(vars.x ?? 0, vars.y ?? 0);
			return inv.y - fn.compiledFn({ x: inv.x });
		};
	} else {
		// implicitCurve: F(x,y) = 0, compose with T⁻¹
		const ic = sourceEl as unknown as GeoImplicitCurve;
		wrappedFn = (vars: Record<string, number>) => {
			const inv = inverseFn(vars.x ?? 0, vars.y ?? 0);
			return ic.compiledFn({ x: inv.x, y: inv.y });
		};
	}

	const origEq = (sourceEl as { equation?: string }).equation ?? '';
	const expr = mathNumber(0); // placeholder
	const id = figure.createImplicitCurve(expr, wrappedFn, `transformed(${origEq})`, {
		label: options?.label
	});
	return { figureId: id, symbolType: 'courbe' };
}
