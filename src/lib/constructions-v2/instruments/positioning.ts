/**
 * Instrument auto-positioning — calculates where to place virtual
 * instruments based on the geometric element being constructed.
 */

import type { InstrumentState } from '../types';
import { createDefaultInstrumentState } from '../types';

export interface Point2D {
	x: number;
	y: number;
}

/**
 * Position a ruler to align with a segment from p1 to p2.
 * The ruler is placed at p1 and rotated to point toward p2.
 */
export function rulerPosition(p1: Point2D, p2: Point2D): Partial<InstrumentState> {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const angle = Math.atan2(dy, dx) * (180 / Math.PI);
	return {
		x: p1.x,
		y: p1.y,
		rotation: angle,
		visible: true
	};
}

/**
 * Position a compass at a circle's center with the correct radius.
 */
export function compassPosition(center: Point2D, radius: number): Partial<InstrumentState> {
	return {
		x: center.x,
		y: center.y,
		compassRadius: radius,
		visible: true
	};
}

/**
 * Apply partial instrument state to a full InstrumentState.
 */
export function applyPosition(
	current: InstrumentState | undefined,
	partial: Partial<InstrumentState>
): InstrumentState {
	const base = current ?? createDefaultInstrumentState(partial.type ?? 'ruler');
	return { ...base, ...partial, type: base.type };
}
