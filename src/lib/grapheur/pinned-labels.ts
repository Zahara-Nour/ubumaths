/**
 * Grapheur Pinned Labels — the labels a click leaves on the graph
 *
 * Hovering shows the exact value and takes it back; clicking keeps a label on
 * the graph. The cycle starts with the decimal value: the exact one is already
 * under the cursor, so a first click that changed nothing visible would look
 * like a click that did nothing.
 *
 * A label stores what was clicked, never the value itself: the term is
 * recomputed at render time, so moving a parameter slider updates the label
 * instead of leaving a stale number on screen.
 *
 * Labels are deliberately absent from the serialised graph state: they are
 * what you point at during a lesson, not what you save.
 *
 * @module grapheur/pinned-labels
 */

import type { SnappedPointType } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * What a click identifies.
 *
 * A term is named by its rank, which is stable. A special point is named by
 * the abscissa the solver found, which is recomputed on every viewport change
 * and can move by a hair: matching it uses a tolerance rather than equality.
 */
export type PinnedLabelTarget =
	| { readonly kind: 'term'; readonly functionId: string; readonly rank: number }
	| {
			readonly kind: 'point';
			readonly functionId: string;
			readonly pointType: SnappedPointType;
			readonly x: number;
	  };

/** A label currently kept on the graph. */
export type PinnedLabel = PinnedLabelTarget & {
	/** Decimal value first; the next click brings the exact one back. */
	readonly showsExact: boolean;
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Largest gap, in maths units, between two abscissas still taken as the same
 * special point.
 *
 * The solvers re-run whenever the viewport moves and land a hair apart; an
 * equality test would drop the label on the first pan.
 */
const SAME_POINT_TOLERANCE = 1e-6;

/** Whether a label points at the same thing as the given target. */
export function isSameTarget(label: PinnedLabelTarget, target: PinnedLabelTarget): boolean {
	if (label.kind !== target.kind || label.functionId !== target.functionId) return false;

	if (label.kind === 'term' && target.kind === 'term') {
		return label.rank === target.rank;
	}

	if (label.kind === 'point' && target.kind === 'point') {
		return (
			label.pointType === target.pointType && Math.abs(label.x - target.x) <= SAME_POINT_TOLERANCE
		);
	}

	return false;
}

/**
 * Find the label pinned on a term, if there is one.
 *
 * @param labels - Labels currently on the graph
 * @param target - Sequence and rank to look for
 */
export function findPinnedLabel(
	labels: readonly PinnedLabel[],
	target: PinnedLabelTarget
): PinnedLabel | undefined {
	return labels.find((label) => isSameTarget(label, target));
}

/**
 * Apply a click on a term: pin its decimal value, flip back to the exact one,
 * then remove the label.
 *
 * @param labels - Labels currently on the graph
 * @param target - Sequence and rank that was clicked
 * @returns The new list; the argument is left untouched
 *
 * @example
 * ```typescript
 * let labels = cyclePinnedLabels([], { functionId: 'u', rank: 3 }); // -0.375
 * labels = cyclePinnedLabels(labels, { functionId: 'u', rank: 3 }); // -3/8
 * labels = cyclePinnedLabels(labels, { functionId: 'u', rank: 3 }); // gone
 * ```
 */
export function cyclePinnedLabels(
	labels: readonly PinnedLabel[],
	target: PinnedLabelTarget
): PinnedLabel[] {
	const existing = findPinnedLabel(labels, target);

	if (!existing) {
		return [...labels, { ...target, showsExact: false }];
	}

	if (!existing.showsExact) {
		return labels.map((label) =>
			isSameTarget(label, target) ? { ...label, showsExact: true } : label
		);
	}

	return labels.filter((label) => !isSameTarget(label, target));
}

/**
 * Drop the labels of a function or sequence that no longer exists.
 *
 * @param labels - Labels currently on the graph
 * @param functionId - Plottable being removed
 */
export function clearLabelsOf(labels: readonly PinnedLabel[], functionId: string): PinnedLabel[] {
	return labels.filter((label) => label.functionId !== functionId);
}
