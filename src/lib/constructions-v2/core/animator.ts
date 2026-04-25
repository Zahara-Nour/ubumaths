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

/**
 * Ease-in-out function for smooth acceleration/deceleration.
 * Same as v1: quadratic ease-in-out.
 */
export function easeInOut(t: number): number {
	return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Ease-in-out with fixed-duration acceleration/deceleration phases.
 * The caller converts a fixed ramp duration (e.g. 300ms) to a ratio:
 *   rampRatio = RAMP_MS / moveDurationMs
 * This ensures acceleration/deceleration always last the same absolute time,
 * regardless of total movement distance. Between the ramps, speed is constant.
 *
 * @param t - normalized progress 0→1
 * @param rampRatio - RAMP_MS / moveDurationMs. Clamped to 0.5 by caller;
 *   at 0.5 or above there is no cruise phase and it falls back to easeInOut.
 */
export function easeWithFixedRamp(t: number, rampRatio: number): number {
	if (rampRatio >= 0.5) return easeInOut(t);
	// Quadratic ease-in: 0 → rampRatio
	// Cruise (linear): rampRatio → (1 - rampRatio)
	// Quadratic ease-out: (1 - rampRatio) → 1
	// Cruise speed = 1 / (1 - rampRatio) to ensure total distance = 1
	const cruiseSpeed = 1 / (1 - rampRatio);
	const rampDist = (rampRatio * cruiseSpeed) / 2; // distance covered during one ramp

	if (t < rampRatio) {
		const u = t / rampRatio;
		return rampDist * u * u;
	}
	if (t < 1 - rampRatio) {
		return rampDist + (t - rampRatio) * cruiseSpeed;
	}
	const u = (1 - t) / rampRatio;
	return 1 - rampDist * u * u;
}
