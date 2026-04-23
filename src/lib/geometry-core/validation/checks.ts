/**
 * Geometric checks for exercise validation.
 *
 * Each check returns { valid, message } with a french message.
 * Checks use exact arithmetic when possible (via GeoValue).
 */

import type { Figure } from '../graph/figure';
import type { GeoPoint } from '../types/primitives';
import { isLineLike, isCircle, isCircleByRadius, isCircleByPoint } from '../types/elements';
import { geoToNumber } from '../compute/to-number';
import { geoEqual, geoIsZero } from '../compute/compare';
import { geoAdd, geoSub, geoMul } from '../compute/geo-arithmetic';

export interface CheckResult {
	readonly valid: boolean;
	readonly message: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getPointPositions(
	figure: Figure,
	...ids: string[]
): { positions: GeoPoint[]; error: CheckResult | null } {
	const positions: GeoPoint[] = [];
	for (const id of ids) {
		const pos = figure.getPosition(id);
		if (!pos) {
			return {
				positions: [],
				error: { valid: false, message: `Le point "${id}" n'existe pas ou n'a pas de position.` }
			};
		}
		positions.push(pos);
	}
	return { positions, error: null };
}

function getLinePoints(figure: Figure, lineId: string): { p1: GeoPoint; p2: GeoPoint } | null {
	const el = figure.getElementById(lineId);
	if (!el || !isLineLike(el)) return null;

	let id1: string;
	let id2: string;

	if (el.type === 'segment') {
		id1 = el.startId;
		id2 = el.endId;
	} else if (el.type === 'line') {
		id1 = el.point1Id;
		id2 = el.point2Id;
	} else {
		id1 = el.originId;
		id2 = el.throughId;
	}

	const p1 = figure.getPosition(id1);
	const p2 = figure.getPosition(id2);
	if (!p1 || !p2) return null;
	return { p1, p2 };
}

// =============================================================================
// checkPointAt
// =============================================================================

export function checkPointAt(
	figure: Figure,
	pointId: string,
	expectedX: number,
	expectedY: number
): CheckResult {
	const pos = figure.getPosition(pointId);
	if (!pos) {
		return { valid: false, message: `Le point n'existe pas ou n'a pas de position.` };
	}

	const dx = geoToNumber(pos.x) - expectedX;
	const dy = geoToNumber(pos.y) - expectedY;
	const distSq = dx * dx + dy * dy;

	if (distSq < 1e-16) {
		return { valid: true, message: `Le point est à la bonne position.` };
	}
	return {
		valid: false,
		message: `Le point n'est pas à la position attendue (${expectedX}, ${expectedY}).`
	};
}

// =============================================================================
// checkCollinear
// =============================================================================

export function checkCollinear(
	figure: Figure,
	p1Id: string,
	p2Id: string,
	p3Id: string
): CheckResult {
	const { positions, error } = getPointPositions(figure, p1Id, p2Id, p3Id);
	if (error) return error;
	const [a, b, c] = positions;

	const abx = geoSub(b.x, a.x);
	const aby = geoSub(b.y, a.y);
	const acx = geoSub(c.x, a.x);
	const acy = geoSub(c.y, a.y);
	const cross = geoSub(geoMul(abx, acy), geoMul(aby, acx));

	if (geoIsZero(cross)) {
		return { valid: true, message: `Les trois points sont alignés.` };
	}
	return { valid: false, message: `Les trois points ne sont pas alignés.` };
}

// =============================================================================
// checkDistance
// =============================================================================

export function checkDistance(
	figure: Figure,
	p1Id: string,
	p2Id: string,
	expected: number
): CheckResult {
	const { positions, error } = getPointPositions(figure, p1Id, p2Id);
	if (error) return error;
	const [a, b] = positions;

	const dx = geoSub(a.x, b.x);
	const dy = geoSub(a.y, b.y);
	const dist2 = geoAdd(geoMul(dx, dx), geoMul(dy, dy));
	const actual = Math.sqrt(geoToNumber(dist2));

	if (Math.abs(actual - expected) < 1e-8) {
		return { valid: true, message: `La distance est correcte (${expected}).` };
	}
	return {
		valid: false,
		message: `La distance est ${actual.toFixed(2)}, attendu ${expected}.`
	};
}

// =============================================================================
// checkSameDistance
// =============================================================================

export function checkSameDistance(
	figure: Figure,
	p1Id: string,
	p2Id: string,
	p3Id: string,
	p4Id: string
): CheckResult {
	const { positions, error } = getPointPositions(figure, p1Id, p2Id, p3Id, p4Id);
	if (error) return error;
	const [a, b, c, d] = positions;

	const dx1 = geoSub(b.x, a.x);
	const dy1 = geoSub(b.y, a.y);
	const dist1sq = geoAdd(geoMul(dx1, dx1), geoMul(dy1, dy1));

	const dx2 = geoSub(d.x, c.x);
	const dy2 = geoSub(d.y, c.y);
	const dist2sq = geoAdd(geoMul(dx2, dx2), geoMul(dy2, dy2));

	if (geoEqual(dist1sq, dist2sq)) {
		return { valid: true, message: `Les deux distances sont égales.` };
	}
	return { valid: false, message: `Les deux distances ne sont pas égales.` };
}

// =============================================================================
// checkParallel
// =============================================================================

export function checkParallel(figure: Figure, line1Id: string, line2Id: string): CheckResult {
	if (line1Id === line2Id) {
		return { valid: false, message: `Les deux droites sont identiques.` };
	}

	const l1 = getLinePoints(figure, line1Id);
	const l2 = getLinePoints(figure, line2Id);
	if (!l1 || !l2) {
		return {
			valid: false,
			message: `Un des éléments n'est pas une droite, un segment ou une demi-droite.`
		};
	}

	const d1x = geoSub(l1.p2.x, l1.p1.x);
	const d1y = geoSub(l1.p2.y, l1.p1.y);
	const d2x = geoSub(l2.p2.x, l2.p1.x);
	const d2y = geoSub(l2.p2.y, l2.p1.y);
	const cross = geoSub(geoMul(d1x, d2y), geoMul(d1y, d2x));

	if (geoIsZero(cross)) {
		return { valid: true, message: `Les droites sont parallèles.` };
	}
	return { valid: false, message: `Les droites ne sont pas parallèles.` };
}

// =============================================================================
// checkPerpendicular
// =============================================================================

export function checkPerpendicular(figure: Figure, line1Id: string, line2Id: string): CheckResult {
	const l1 = getLinePoints(figure, line1Id);
	const l2 = getLinePoints(figure, line2Id);
	if (!l1 || !l2) {
		return {
			valid: false,
			message: `Un des éléments n'est pas une droite, un segment ou une demi-droite.`
		};
	}

	const d1x = geoSub(l1.p2.x, l1.p1.x);
	const d1y = geoSub(l1.p2.y, l1.p1.y);
	const d2x = geoSub(l2.p2.x, l2.p1.x);
	const d2y = geoSub(l2.p2.y, l2.p1.y);
	const dot = geoAdd(geoMul(d1x, d2x), geoMul(d1y, d2y));

	if (geoIsZero(dot)) {
		return { valid: true, message: `Les droites sont perpendiculaires.` };
	}
	return { valid: false, message: `Les droites ne sont pas perpendiculaires.` };
}

// =============================================================================
// checkAngle
// =============================================================================

export function checkAngle(
	figure: Figure,
	p1Id: string,
	vertexId: string,
	p2Id: string,
	expectedDegrees: number
): CheckResult {
	const { positions, error } = getPointPositions(figure, p1Id, vertexId, p2Id);
	if (error) return error;
	const [a, v, b] = positions;

	const vax = geoToNumber(geoSub(a.x, v.x));
	const vay = geoToNumber(geoSub(a.y, v.y));
	const vbx = geoToNumber(geoSub(b.x, v.x));
	const vby = geoToNumber(geoSub(b.y, v.y));

	const dot = vax * vbx + vay * vby;
	const lenA = Math.sqrt(vax * vax + vay * vay);
	const lenB = Math.sqrt(vbx * vbx + vby * vby);

	if (lenA < 1e-15 || lenB < 1e-15) {
		return { valid: false, message: `L'angle n'est pas défini (points confondus).` };
	}

	const cosAngle = Math.max(-1, Math.min(1, dot / (lenA * lenB)));
	const actualDegrees = (Math.acos(cosAngle) * 180) / Math.PI;

	if (Math.abs(actualDegrees - expectedDegrees) < 0.5) {
		return { valid: true, message: `L'angle mesure bien ${expectedDegrees}°.` };
	}
	return {
		valid: false,
		message: `L'angle mesure ${actualDegrees.toFixed(1)}°, attendu ${expectedDegrees}°.`
	};
}

// =============================================================================
// checkPointOnCircle
// =============================================================================

export function checkPointOnCircle(figure: Figure, pointId: string, circleId: string): CheckResult {
	const pos = figure.getPosition(pointId);
	if (!pos) {
		return { valid: false, message: `Le point n'existe pas ou n'a pas de position.` };
	}

	const el = figure.getElementById(circleId);
	if (!el || !isCircle(el)) {
		return { valid: false, message: `L'élément n'est pas un cercle.` };
	}

	const centerPos = figure.getPosition(el.centerId);
	if (!centerPos) {
		return { valid: false, message: `Le centre du cercle n'a pas de position.` };
	}

	const dx = geoSub(pos.x, centerPos.x);
	const dy = geoSub(pos.y, centerPos.y);
	const dist2 = geoAdd(geoMul(dx, dx), geoMul(dy, dy));

	let radius2;
	if (isCircleByRadius(el)) {
		radius2 = geoMul(el.radius, el.radius);
	} else if (isCircleByPoint(el)) {
		const edgePos = figure.getPosition(el.edgePointId);
		if (!edgePos) {
			return { valid: false, message: `Le point de référence du cercle n'a pas de position.` };
		}
		const rx = geoSub(edgePos.x, centerPos.x);
		const ry = geoSub(edgePos.y, centerPos.y);
		radius2 = geoAdd(geoMul(rx, rx), geoMul(ry, ry));
	} else {
		return { valid: false, message: `Type de cercle inconnu.` };
	}

	if (geoEqual(dist2, radius2)) {
		return { valid: true, message: `Le point est sur le cercle.` };
	}
	return { valid: false, message: `Le point n'est pas sur le cercle.` };
}
