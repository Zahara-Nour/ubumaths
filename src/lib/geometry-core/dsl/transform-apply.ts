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
	GeoImplicitCurve,
	GeoImage
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

		case 'inversion':
			return figure.createInvertedPoint(sourcePointId, transform.centerId, transform.radius, {
				label,
				visible
			});

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
		case 'inversion':
			throw new Error('Inversion is not a linear transformation — cannot transform vectors');
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
 * Compute the visual rotation and flip state of an image after a transformation.
 * Pure function — no side effects, no figure mutation.
 */
function computeImageVisualTransform(
	currentRotation: number,
	currentFlipped: boolean,
	transform: GeoTransformation,
	figure: Figure
): { rotation: number; flipped: boolean } {
	switch (transform.type) {
		case 'rotation': {
			const angle = geoToNumber(transform.angle);
			return { rotation: currentRotation + angle, flipped: currentFlipped };
		}
		case 'reflection':
			// Central symmetry = rotation by PI
			return { rotation: currentRotation + Math.PI, flipped: currentFlipped };
		case 'reflectionOverLine': {
			const lp1 = figure.getPosition(transform.linePoint1Id);
			const lp2 = figure.getPosition(transform.linePoint2Id);
			if (!lp1 || !lp2) return { rotation: currentRotation, flipped: currentFlipped };
			const axisAngle = Math.atan2(
				geoToNumber(lp2.y) - geoToNumber(lp1.y),
				geoToNumber(lp2.x) - geoToNumber(lp1.x)
			);
			return {
				rotation: 2 * axisAngle - currentRotation,
				flipped: !currentFlipped
			};
		}
		case 'homothety': {
			const factor = geoToNumber(transform.factor);
			if (factor < 0) {
				return { rotation: currentRotation + Math.PI, flipped: currentFlipped };
			}
			return { rotation: currentRotation, flipped: currentFlipped };
		}
		case 'translation':
			return { rotation: currentRotation, flipped: currentFlipped };
		case 'composition': {
			// Apply sub-transformations right-to-left (same order as points)
			let rot = currentRotation;
			let flip = currentFlipped;
			const ids = transform.transformationIds;
			for (let i = ids.length - 1; i >= 0; i--) {
				const subEl = figure.getElementById(ids[i]);
				if (subEl && isTransformation(subEl)) {
					const result = computeImageVisualTransform(rot, flip, subEl, figure);
					rot = result.rotation;
					flip = result.flipped;
				}
			}
			return { rotation: rot, flipped: flip };
		}
		default:
			// projection, affinity, inversion — no visual transform on images
			return { rotation: currentRotation, flipped: currentFlipped };
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

	// Inversion: only supports point, droite, cercle, courbe — not segment/polygone/arc/vecteur
	if (containsNonAffineTransform(transformEl, figure, 'inversion')) {
		const unsupported: SymbolType[] = ['segment', 'polygone', 'arc', 'demidroite', 'vecteur'];
		if (unsupported.includes(sourceType)) {
			throw new Error(`L'inversion ne supporte pas la transformation de type "${sourceType}"`);
		}
		// For cercle and droite under inversion, use analytical conic output
		if (sourceType === 'cercle' || sourceType === 'droite') {
			return invertCircleOrLine(figure, transformEl, sourceEl, sourceType, options);
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

		case 'image': {
			const img = sourceEl as GeoImage;

			// Scale dimensions for homothety
			let newWidth = img.width;
			let newHeight = img.height;
			if (transformEl.type === 'homothety') {
				const absFactor = Math.abs(geoToNumber(transformEl.factor));
				newWidth = img.width * absFactor;
				if (newHeight !== undefined) newHeight = newHeight * absFactor;
			}

			// Compute visual transform (rotation/flip)
			const visual = computeImageVisualTransform(
				img.rotation ?? 0,
				img.flipped ?? false,
				transformEl,
				figure
			);
			// Normalize accumulated rotation to (-PI, PI] to avoid floating-point drift
			const normalizedRot =
				(((visual.rotation % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
			const visualOpts =
				Math.abs(normalizedRot) > 1e-10 || visual.flipped
					? { rotation: normalizedRot, flipped: visual.flipped }
					: {};

			// 2-point mode: transform both corner points
			if (img.point1Id && img.point2Id) {
				const newP1 = applyTransformationToPoint(figure, transformEl, img.point1Id, {
					visible: false
				});
				const newP2 = applyTransformationToPoint(figure, transformEl, img.point2Id, {
					visible: false
				});
				const id = figure.createImage(
					img.url,
					0,
					undefined,
					{
						point1Id: newP1,
						point2Id: newP2
					},
					{ label: options?.label, layer: img.layer, ...visualOpts }
				);
				return { figureId: id, symbolType: 'image' };
			}

			// Anchored to 1 point: transform the image center, reposition with offset
			if (img.anchorId) {
				const anchorPos = figure.getPosition(img.anchorId);
				if (!anchorPos) throw new Error('transforme(): image anchor position not found');
				const ax = geoToNumber(anchorPos.x) + (img.anchorOffset?.dx ?? 0);
				const ay = geoToNumber(anchorPos.y) + (img.anchorOffset?.dy ?? 0);
				const imgH = img.height ?? img.width;
				const centerPt = figure.createFreePoint(
					{ x: numeric(ax + img.width / 2), y: numeric(ay + imgH / 2) },
					{ visible: false }
				);
				const newCenter = applyTransformationToPoint(figure, transformEl, centerPt, {
					visible: false
				});
				const newH = newHeight ?? newWidth;
				const id = figure.createImage(
					img.url,
					newWidth,
					newHeight,
					{
						anchorId: newCenter,
						anchorOffset: { dx: -newWidth / 2, dy: -newH / 2 }
					},
					{ label: options?.label, layer: img.layer, ...visualOpts }
				);
				return { figureId: id, symbolType: 'image' };
			}

			// Free position: transform the image center, reposition with offset
			if (img.position) {
				const imgH = img.height ?? img.width;
				const centerPt = figure.createFreePoint(
					{
						x: numeric(img.position.x + img.width / 2),
						y: numeric(img.position.y + imgH / 2)
					},
					{ visible: false }
				);
				const newCenter = applyTransformationToPoint(figure, transformEl, centerPt, {
					visible: false
				});
				const newH = newHeight ?? newWidth;
				const id = figure.createImage(
					img.url,
					newWidth,
					newHeight,
					{
						anchorId: newCenter,
						anchorOffset: { dx: -newWidth / 2, dy: -newH / 2 }
					},
					{ label: options?.label, layer: img.layer, ...visualOpts }
				);
				return { figureId: id, symbolType: 'image' };
			}

			throw new Error('transforme(): image has no position or anchor');
		}

		default:
			throw new Error(`transforme() ne supporte pas encore le type "${sourceType}"`);
	}
}

// =============================================================================
// Inversion of circles and lines → conic coefficients
// =============================================================================

/**
 * Invert a circle or line under circular inversion, producing a quadratic curve.
 * Circle → circle or line; Line → circle or line (all represented as conics).
 */
function invertCircleOrLine(
	figure: Figure,
	transform: GeoTransformation,
	sourceEl: { type: string; id: string } & Record<string, unknown>,
	sourceType: SymbolType,
	options?: { label?: string }
): TransformResult {
	// Find the inversion in the transformation chain
	const inv = findInversion(transform, figure);
	if (!inv) {
		throw new Error('invertCircleOrLine: no inversion found in transformation');
	}

	// Reactive closure: recomputes conic coefficients on each evaluation
	// so the curve updates when inversion center or source points are dragged.
	const centerId = inv.centerId;
	const srcType = sourceType;
	const srcEl = sourceEl;
	const wrappedFn = (vars: Record<string, number>) => {
		const curO = figure.getPosition(centerId);
		if (!curO) return NaN;
		const curOx = geoToNumber(curO.x),
			curOy = geoToNumber(curO.y);
		const curR = geoToNumber(inv.radius);
		const curR2 = curR * curR;
		const coeffs =
			srcType === 'cercle'
				? invertCircleCoeffs(figure, srcEl, curOx, curOy, curR2)
				: invertLineCoeffs(figure, srcEl, curOx, curOy, curR2);
		const [A, B, C, D, E, F] = coeffs;
		const vx = vars.x ?? 0,
			vy = vars.y ?? 0;
		return A * vx * vx + B * vx * vy + C * vy * vy + D * vx + E * vy + F;
	};
	const id = figure.createImplicitCurve(mathNumber(0), wrappedFn, `inversion(${sourceType})`, {
		label: options?.label
	});
	return { figureId: id, symbolType: 'courbe' };
}

/** Find the first GeoInversion in a (possibly composed) transformation. */
function findInversion(
	transform: GeoTransformation,
	figure: Figure
): (GeoTransformation & { type: 'inversion' }) | null {
	if (transform.type === 'inversion') return transform;
	if (transform.type === 'composition') {
		for (const tId of transform.transformationIds) {
			const sub = figure.getElementById(tId);
			if (sub && isTransformation(sub)) {
				const result = findInversion(sub, figure);
				if (result) return result;
			}
		}
	}
	return null;
}

/**
 * Compute conic coefficients for the image of a circle under inversion.
 * Circle: center (cx, cy), radius cr. Inversion center O=(ox, oy), r²=r2.
 */
function invertCircleCoeffs(
	figure: Figure,
	sourceEl: Record<string, unknown>,
	ox: number,
	oy: number,
	r2: number
): [number, number, number, number, number, number] {
	// Get circle center and radius
	let cx: number, cy: number, cr: number;
	if (sourceEl.type === 'circleByPoint') {
		const cPos = figure.getPosition(sourceEl.centerId as string);
		const ePos = figure.getPosition(sourceEl.edgePointId as string);
		if (!cPos || !ePos) return [0, 0, 0, 0, 0, 0];
		cx = geoToNumber(cPos.x);
		cy = geoToNumber(cPos.y);
		const edx = geoToNumber(ePos.x) - cx,
			edy = geoToNumber(ePos.y) - cy;
		cr = Math.sqrt(edx * edx + edy * edy);
	} else {
		const cPos = figure.getPosition(sourceEl.centerId as string);
		if (!cPos) return [0, 0, 0, 0, 0, 0];
		cx = geoToNumber(cPos.x);
		cy = geoToNumber(cPos.y);
		cr = figure.resolveParam(sourceEl.radius);
	}

	// Distance from O to circle center
	const dx = cx - ox,
		dy = cy - oy;
	const d2 = dx * dx + dy * dy;
	const cr2 = cr * cr;

	// Check if circle passes through O: |d| = cr (within tolerance)
	if (Math.abs(d2 - cr2) < 1e-10 * Math.max(1, d2, cr2)) {
		// Circle passes through O → image is a line
		// The line passes through inv(diametrically opposite point to O)
		// Line equation: dx*(x - ox) + dy*(y - oy) = r²/2
		// As conic: 0*x² + 0*xy + 0*y² + dx*x + dy*y + (- dx*ox - dy*oy - r²/2) = 0
		const scale = r2 / (2 * d2); // normalization
		return [
			0,
			0,
			0,
			dx * scale,
			dy * scale,
			-(dx * ox + dy * oy) * scale - (r2 / 2) * (r2 / (2 * d2))
		];
	}

	// Circle does not pass through O → image is a circle
	// Use the formula: image circle center = O + r²*d/(d²-cr²), image radius = r²*cr/|d²-cr²|
	const denom = d2 - cr2;
	const s = r2 / denom;
	const newCx = ox + s * dx;
	const newCy = oy + s * dy;
	const newCr = Math.abs((r2 * cr) / denom);

	// Circle (x-newCx)² + (y-newCy)² = newCr² → x² + y² - 2*newCx*x - 2*newCy*y + (newCx²+newCy²-newCr²) = 0
	return [1, 0, 1, -2 * newCx, -2 * newCy, newCx * newCx + newCy * newCy - newCr * newCr];
}

/**
 * Compute conic coefficients for the image of a line under inversion.
 * Line through (p1x,p1y)-(p2x,p2y). Inversion center O=(ox,oy), r²=r2.
 */
function invertLineCoeffs(
	figure: Figure,
	sourceEl: Record<string, unknown>,
	ox: number,
	oy: number,
	r2: number
): [number, number, number, number, number, number] {
	// Get line points
	let p1Id: string, p2Id: string;
	if (sourceEl.type === 'line') {
		p1Id = sourceEl.point1Id as string;
		p2Id = sourceEl.point2Id as string;
	} else if (sourceEl.type === 'segment') {
		p1Id = sourceEl.startId as string;
		p2Id = sourceEl.endId as string;
	} else if (sourceEl.type === 'ray') {
		p1Id = sourceEl.originId as string;
		p2Id = sourceEl.throughId as string;
	} else {
		return [0, 0, 0, 0, 0, 0];
	}

	const p1 = figure.getPosition(p1Id),
		p2 = figure.getPosition(p2Id);
	if (!p1 || !p2) return [0, 0, 0, 0, 0, 0];

	const p1x = geoToNumber(p1.x),
		p1y = geoToNumber(p1.y);
	const p2x = geoToNumber(p2.x),
		p2y = geoToNumber(p2.y);

	// Line direction and normal
	const ldx = p2x - p1x,
		ldy = p2y - p1y;
	// Normal: (ldy, -ldx) or (-ldy, ldx)
	// Signed distance from O to line: ((p1-O) × d) / |d|
	const cross = (p1x - ox) * ldy - (p1y - oy) * ldx;
	const lineLen = Math.sqrt(ldx * ldx + ldy * ldy);
	const dist = cross / lineLen; // signed distance

	if (Math.abs(dist) < 1e-10) {
		// Line passes through O → image is the line itself
		// Line: ldy*(x-p1x) - ldx*(y-p1y) = 0 → ldy*x - ldx*y + (-ldy*p1x + ldx*p1y) = 0
		return [0, 0, 0, ldy, -ldx, -ldy * p1x + ldx * p1y];
	}

	// Line does not pass through O → image is a circle through O
	// Foot of perpendicular from O to line
	const t = ((ox - p1x) * ldx + (oy - p1y) * ldy) / (ldx * ldx + ldy * ldy);
	const hx = p1x + t * ldx,
		hy = p1y + t * ldy;
	// d = distance from O to line = |OH|
	const dAbs = Math.abs(dist);
	// Image of H under inversion: H' = O + r²/|OH|² * (H-O)
	const ohx = hx - ox,
		ohy = hy - oy;
	const oh2 = ohx * ohx + ohy * ohy;
	const invHx = ox + (r2 / oh2) * ohx;
	const invHy = oy + (r2 / oh2) * ohy;
	// Image circle: passes through O, with center at midpoint of O and H'
	const newCx = (ox + invHx) / 2;
	const newCy = (oy + invHy) / 2;
	const newCr = r2 / (2 * dAbs);

	return [1, 0, 1, -2 * newCx, -2 * newCy, newCx * newCx + newCy * newCy - newCr * newCr];
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
		case 'inversion': {
			// Inversion is its own inverse: T⁻¹ = T
			const invCenterId = transform.centerId;
			const invR = geoToNumber(transform.radius);
			const invR2 = invR * invR;
			return (x, y) => {
				const cPos = figure.getPosition(invCenterId);
				if (!cPos) return { x, y };
				const cx = geoToNumber(cPos.x),
					cy = geoToNumber(cPos.y);
				const dx = x - cx,
					dy = y - cy;
				const om2 = dx * dx + dy * dy;
				if (om2 < 1e-30) return { x, y };
				const scale = invR2 / om2;
				return { x: cx + scale * dx, y: cy + scale * dy };
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
