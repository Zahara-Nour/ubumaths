/**
 * Affine transformation utilities for conic coefficient transformation.
 *
 * Shared between transform-apply.ts (creation) and figure.ts (recomputation).
 * Uses accessor functions instead of Figure to avoid circular dependencies.
 */

import type { GeoTransformation } from '../types/elements';
import { isTransformation } from '../types/elements';
import type { GeoValue } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import { geoToNumber } from '../compute/to-number';

/** Affine matrix [a, b, tx, c, d, ty]: T(x,y) = (a*x + b*y + tx, c*x + d*y + ty) */
export type AffineMatrix = [number, number, number, number, number, number];

export interface TransformAccessors {
	getPosition(id: string): GeoPoint | null;
	getElementById(id: string): { type: string; dependsOn: readonly string[] } | undefined;
	getVectorComponents(id: string): { dx: GeoValue; dy: GeoValue } | null;
}

/**
 * Build the inverse affine matrix for a transformation.
 * Reads current positions via accessors so it stays up-to-date.
 */
export function buildInverseAffineMatrix(
	transform: GeoTransformation,
	access: TransformAccessors
): AffineMatrix {
	switch (transform.type) {
		case 'rotation': {
			const cPos = access.getPosition(transform.centerId);
			const cx = cPos ? geoToNumber(cPos.x) : 0;
			const cy = cPos ? geoToNumber(cPos.y) : 0;
			const angle = -geoToNumber(transform.angle);
			const cos = Math.cos(angle);
			const sin = Math.sin(angle);
			return [cos, -sin, cx - cx * cos + cy * sin, sin, cos, cy - cx * sin - cy * cos];
		}
		case 'reflection': {
			const cPos = access.getPosition(transform.centerId);
			const cx = cPos ? geoToNumber(cPos.x) : 0;
			const cy = cPos ? geoToNumber(cPos.y) : 0;
			return [-1, 0, 2 * cx, 0, -1, 2 * cy];
		}
		case 'reflectionOverLine': {
			const lp1 = access.getPosition(transform.linePoint1Id);
			const lp2 = access.getPosition(transform.linePoint2Id);
			if (!lp1 || !lp2) return [1, 0, 0, 0, 1, 0];
			const x1 = geoToNumber(lp1.x),
				y1 = geoToNumber(lp1.y);
			const dx = geoToNumber(lp2.x) - x1,
				dy = geoToNumber(lp2.y) - y1;
			const len2 = dx * dx + dy * dy;
			if (len2 < 1e-15) return [1, 0, 0, 0, 1, 0];
			const a = (dx * dx - dy * dy) / len2;
			const b = (2 * dx * dy) / len2;
			const tx = x1 - a * x1 - b * y1;
			const ty = y1 - b * x1 + a * y1;
			return [a, b, tx, b, -a, ty];
		}
		case 'translation': {
			let tdx = 0,
				tdy = 0;
			if (transform.vectorId) {
				const comp = access.getVectorComponents(transform.vectorId);
				if (comp) {
					tdx = geoToNumber(comp.dx);
					tdy = geoToNumber(comp.dy);
				}
			} else {
				const vs = access.getPosition(transform.vectorStartId);
				const ve = access.getPosition(transform.vectorEndId);
				if (vs && ve) {
					tdx = geoToNumber(ve.x) - geoToNumber(vs.x);
					tdy = geoToNumber(ve.y) - geoToNumber(vs.y);
				}
			}
			return [1, 0, -tdx, 0, 1, -tdy];
		}
		case 'projection': {
			const lp1 = access.getPosition(transform.linePoint1Id);
			const lp2 = access.getPosition(transform.linePoint2Id);
			if (!lp1 || !lp2) return [1, 0, 0, 0, 1, 0];
			const x1 = geoToNumber(lp1.x),
				y1 = geoToNumber(lp1.y);
			const dx = geoToNumber(lp2.x) - x1,
				dy = geoToNumber(lp2.y) - y1;
			const len2 = dx * dx + dy * dy;
			if (len2 < 1e-15) return [1, 0, 0, 0, 1, 0];
			// Projection matrix onto line direction (dx, dy):
			// P = (1/len2) * [[dx², dx*dy], [dx*dy, dy²]] + translation offset
			const a = (dx * dx) / len2;
			const b = (dx * dy) / len2;
			const d = (dy * dy) / len2;
			const tx = x1 - a * x1 - b * y1;
			const ty = y1 - b * x1 - d * y1;
			return [a, b, tx, b, d, ty];
		}
		case 'affinity': {
			const alp1 = access.getPosition(transform.linePoint1Id);
			const alp2 = access.getPosition(transform.linePoint2Id);
			if (!alp1 || !alp2) return [1, 0, 0, 0, 1, 0];
			const x1 = geoToNumber(alp1.x),
				y1 = geoToNumber(alp1.y);
			const adx = geoToNumber(alp2.x) - x1,
				ady = geoToNumber(alp2.y) - y1;
			const alen2 = adx * adx + ady * ady;
			if (alen2 < 1e-15) return [1, 0, 0, 0, 1, 0];
			const ak = geoToNumber(transform.factor);
			const invK = Math.abs(ak) < 1e-15 ? 1 : 1 / ak;
			// Inverse affinity matrix: I + (1/k - 1) * n⊗n where n is the unit perpendicular
			// Perpendicular to axis: (-ady, adx) / sqrt(alen2)
			const nx = -ady / Math.sqrt(alen2),
				ny = adx / Math.sqrt(alen2);
			const s = invK - 1; // scale factor for the outer product
			const a = 1 + s * nx * nx;
			const b = s * nx * ny;
			const d = 1 + s * ny * ny;
			// Translation: M_inv applied to origin offset
			const tx = x1 - a * x1 - b * y1;
			const ty = y1 - b * x1 - d * y1;
			return [a, b, tx, b, d, ty];
		}
		case 'homothety': {
			const cPos = access.getPosition(transform.centerId);
			const cx = cPos ? geoToNumber(cPos.x) : 0;
			const cy = cPos ? geoToNumber(cPos.y) : 0;
			const k = geoToNumber(transform.factor);
			const invK = Math.abs(k) < 1e-15 ? 1 : 1 / k;
			return [invK, 0, cx * (1 - invK), 0, invK, cy * (1 - invK)];
		}
		case 'composition': {
			let result: AffineMatrix = [1, 0, 0, 0, 1, 0];
			for (const tId of transform.transformationIds) {
				const subEl = access.getElementById(tId);
				if (!subEl || !isTransformation(subEl as GeoTransformation)) continue;
				const m = buildInverseAffineMatrix(subEl as GeoTransformation, access);
				result = multiplyAffine(result, m);
			}
			return result;
		}
	}
}

/** Multiply two 2D affine matrices [a,b,tx,c,d,ty]. */
export function multiplyAffine(m1: AffineMatrix, m2: AffineMatrix): AffineMatrix {
	const [a1, b1, tx1, c1, d1, ty1] = m1;
	const [a2, b2, tx2, c2, d2, ty2] = m2;
	return [
		a1 * a2 + b1 * c2,
		a1 * b2 + b1 * d2,
		a1 * tx2 + b1 * ty2 + tx1,
		c1 * a2 + d1 * c2,
		c1 * b2 + d1 * d2,
		c1 * tx2 + d1 * ty2 + ty1
	];
}

/**
 * Transform the 6 coefficients of a conic Ax²+Bxy+Cy²+Dx+Ey+F=0
 * under affine transformation, using the inverse matrix.
 */
export function transformConicCoefficients(
	coeffs: readonly [number, number, number, number, number, number],
	invMatrix: AffineMatrix
): [number, number, number, number, number, number] {
	const [A, B, C, D, E, F] = coeffs;
	const [a, b, tx, c, d, ty] = invMatrix;
	return [
		A * a * a + B * a * c + C * c * c,
		2 * A * a * b + B * (a * d + b * c) + 2 * C * c * d,
		A * b * b + B * b * d + C * d * d,
		2 * A * a * tx + B * (a * ty + tx * c) + 2 * C * c * ty + D * a + E * c,
		2 * A * b * tx + B * (b * ty + tx * d) + 2 * C * d * ty + D * b + E * d,
		A * tx * tx + B * tx * ty + C * ty * ty + D * tx + E * ty + F
	];
}
