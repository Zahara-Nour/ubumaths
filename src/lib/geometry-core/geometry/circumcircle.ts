/**
 * Compute the circumcircle of three points.
 * Returns the center (ux, uy) and radius, or null if the points are collinear.
 */
export function circumcircle(
	ax: number,
	ay: number,
	bx: number,
	by: number,
	cx: number,
	cy: number
): { ux: number; uy: number; r: number } | null {
	const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
	if (Math.abs(D) < 1e-12) return null;
	const a2 = ax * ax + ay * ay;
	const b2 = bx * bx + by * by;
	const c2 = cx * cx + cy * cy;
	const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D;
	const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
	const r = Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2);
	return { ux, uy, r };
}
