/**
 * Animator — pure functions for progressive rendering of geometric elements.
 *
 * These functions compute partial geometry for animation:
 * a segment being drawn, a circle sweeping, an arc progressing.
 * They do NOT modify the Figure — they provide data for the canvas
 * to render partial elements during animation.
 */

export interface Point2D {
	x: number;
	y: number;
}

/**
 * Compute the endpoint of a segment at a given progress.
 * progress=0 → p1, progress=1 → p2, progress=0.5 → midpoint.
 */
export function partialSegment(p1: Point2D, p2: Point2D, progress: number): Point2D {
	const t = Math.max(0, Math.min(1, progress));
	return {
		x: p1.x + (p2.x - p1.x) * t,
		y: p1.y + (p2.y - p1.y) * t
	};
}

/**
 * Compute the sweep angle of a full circle at a given progress.
 * Returns the sweep in degrees: progress=0 → 0, progress=1 → 360.
 */
export function partialCircle(progress: number): number {
	return Math.max(0, Math.min(1, progress)) * 360;
}

/**
 * Compute the partial sweep of an arc at a given progress.
 * Returns the actual sweep angle in degrees.
 * progress=0 → 0, progress=1 → sweepAngle.
 */
export function partialArc(sweepAngle: number, progress: number): number {
	return sweepAngle * Math.max(0, Math.min(1, progress));
}

/**
 * Interpolate a numeric value between start and end.
 */
export function interpolate(start: number, end: number, progress: number): number {
	const t = Math.max(0, Math.min(1, progress));
	return start + (end - start) * t;
}
