/**
 * Snapping Module
 *
 * Provides snap-to-object functionality for the whiteboard.
 * Algorithm based on tldraw's BoundsSnaps implementation.
 *
 * @module whiteboard/core/snapping
 */

import { getElementBounds, type BoundingBox } from './hit-testing';
import type { WhiteboardElement, Point } from '../types/document';

// =============================================================================
// Types
// =============================================================================

/** A point that can be snapped to */
export interface SnapPoint {
	id: string;
	x: number;
	y: number;
}

/** A pair of points that are snapping together */
interface SnapPair {
	thisPoint: SnapPoint;
	otherPoint: SnapPoint;
}

/** A snap that was found on one axis */
interface NearestPointsSnap {
	type: 'points';
	points: SnapPair;
	nudge: number;
}

/** Visual indicator for a snap line */
export interface PointsSnapIndicator {
	id: string;
	type: 'points';
	points: Point[];
}

/** A gap between two elements */
export interface Gap {
	startBounds: BoundingBox;
	endBounds: BoundingBox;
	length: number;
	breadthIntersection: [number, number]; // Overlapping range on perpendicular axis
}

/** Visual indicator for a gap snap */
export interface GapSnapIndicator {
	id: string;
	type: 'gap';
	direction: 'horizontal' | 'vertical';
	gaps: Array<{
		startEdge: number; // X for horizontal, Y for vertical
		endEdge: number;
		breadthStart: number; // Y range for horizontal, X range for vertical
		breadthEnd: number;
	}>;
}

/** Union type for all snap indicators */
export type SnapIndicator = PointsSnapIndicator | GapSnapIndicator;

/** Result of snap calculation */
export interface SnapResult {
	nudge: Point;
	indicators: SnapIndicator[];
}

// =============================================================================
// Constants
// =============================================================================

/** Default snap threshold in pixels (before zoom adjustment) */
export const DEFAULT_SNAP_THRESHOLD = 10;

/** Decimal places for rounding (avoids floating point issues) */
const DECIMAL_TOLERANCE = 8;

// =============================================================================
// Utilities
// =============================================================================

/**
 * Round numbers to avoid floating point rounding errors.
 * Same approach as tldraw.
 */
function round(x: number): number {
	return Math.round(x * 10 ** DECIMAL_TOLERANCE) / 10 ** DECIMAL_TOLERANCE;
}

/**
 * Generate a simple unique ID for snap indicators.
 */
function uniqueId(): string {
	return Math.random().toString(36).substring(2, 9);
}

/**
 * Deduplicate points by comparing coordinates.
 */
function dedupePoints(points: Point[]): Point[] {
	const seen = new Set<string>();
	return points.filter((p) => {
		const key = `${round(p.x)},${round(p.y)}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Check if two ranges overlap and return the overlapping range.
 * Returns null if no overlap.
 */
function rangesOverlap(
	aMin: number,
	aMax: number,
	bMin: number,
	bMax: number
): [number, number] | null {
	const overlapMin = Math.max(aMin, bMin);
	const overlapMax = Math.min(aMax, bMax);
	if (overlapMin < overlapMax) {
		return [overlapMin, overlapMax];
	}
	return null;
}

// =============================================================================
// Snap Point Extraction
// =============================================================================

/**
 * Get the snap points for an element's bounding box.
 * Returns corners and center (5 points total for MVP).
 */
export function getElementSnapPoints(element: WhiteboardElement): SnapPoint[] {
	const bounds = getElementBounds(element);
	const { x, y, width, height } = bounds;

	// Skip elements with invalid bounds
	if (width <= 0 || height <= 0) return [];

	return [
		// 4 corners
		{ id: `${element.id}:nw`, x, y },
		{ id: `${element.id}:ne`, x: x + width, y },
		{ id: `${element.id}:sw`, x, y: y + height },
		{ id: `${element.id}:se`, x: x + width, y: y + height },
		// Center
		{ id: `${element.id}:center`, x: x + width / 2, y: y + height / 2 }
	];
}

/**
 * Get snap points for a bounding box (used for selection bounds).
 */
export function getBoundsSnapPoints(bounds: BoundingBox, prefix: string): SnapPoint[] {
	const { x, y, width, height } = bounds;

	if (width <= 0 || height <= 0) return [];

	return [
		{ id: `${prefix}:nw`, x, y },
		{ id: `${prefix}:ne`, x: x + width, y },
		{ id: `${prefix}:sw`, x, y: y + height },
		{ id: `${prefix}:se`, x: x + width, y: y + height },
		{ id: `${prefix}:center`, x: x + width / 2, y: y + height / 2 }
	];
}

// =============================================================================
// Gap Detection (based on tldraw's GapSnaps)
// =============================================================================

/**
 * Collect gaps between non-selected elements.
 * A gap exists when two elements don't overlap on one axis
 * but do overlap on the perpendicular axis.
 */
function collectVisibleGaps(
	elements: readonly WhiteboardElement[],
	selectedIds: Set<string>
): { horizontal: Gap[]; vertical: Gap[] } {
	const horizontal: Gap[] = [];
	const vertical: Gap[] = [];

	// Get non-selected elements with their bounds
	const otherElements = elements
		.filter((e) => !selectedIds.has(e.id))
		.map((e) => ({ element: e, bounds: getElementBounds(e) }))
		.filter((e) => e.bounds.width > 0 && e.bounds.height > 0);

	// Collect horizontal gaps (sorted by X)
	const sortedByX = [...otherElements].sort((a, b) => a.bounds.x - b.bounds.x);

	for (let i = 0; i < sortedByX.length; i++) {
		const startBounds = sortedByX[i].bounds;
		const startRight = startBounds.x + startBounds.width;

		for (let j = i + 1; j < sortedByX.length; j++) {
			const endBounds = sortedByX[j].bounds;
			const endLeft = endBounds.x;

			// Is there a horizontal gap? (no X overlap)
			if (startRight < endLeft) {
				// Check vertical overlap (breadth intersection)
				const startTop = startBounds.y;
				const startBottom = startBounds.y + startBounds.height;
				const endTop = endBounds.y;
				const endBottom = endBounds.y + endBounds.height;

				const overlap = rangesOverlap(startTop, startBottom, endTop, endBottom);

				if (overlap) {
					horizontal.push({
						startBounds,
						endBounds,
						length: endLeft - startRight,
						breadthIntersection: overlap
					});
				}
			}
		}
	}

	// Collect vertical gaps (sorted by Y)
	const sortedByY = [...otherElements].sort((a, b) => a.bounds.y - b.bounds.y);

	for (let i = 0; i < sortedByY.length; i++) {
		const startBounds = sortedByY[i].bounds;
		const startBottom = startBounds.y + startBounds.height;

		for (let j = i + 1; j < sortedByY.length; j++) {
			const endBounds = sortedByY[j].bounds;
			const endTop = endBounds.y;

			// Is there a vertical gap? (no Y overlap)
			if (startBottom < endTop) {
				// Check horizontal overlap (breadth intersection)
				const startLeft = startBounds.x;
				const startRight = startBounds.x + startBounds.width;
				const endLeft = endBounds.x;
				const endRight = endBounds.x + endBounds.width;

				const overlap = rangesOverlap(startLeft, startRight, endLeft, endRight);

				if (overlap) {
					vertical.push({
						startBounds,
						endBounds,
						length: endTop - startBottom,
						breadthIntersection: overlap
					});
				}
			}
		}
	}

	return { horizontal, vertical };
}

/** Result of a gap snap calculation */
interface GapSnapResult {
	nudge: number;
	indicator: GapSnapIndicator;
}

/**
 * Find gap snaps for the selection.
 * Returns a nudge if the selection can create a gap equal to an existing gap.
 */
function findGapSnaps(
	selectionBounds: BoundingBox,
	gaps: { horizontal: Gap[]; vertical: Gap[] },
	threshold: number
): { x: GapSnapResult | null; y: GapSnapResult | null } {
	let xResult: GapSnapResult | null = null;
	let yResult: GapSnapResult | null = null;

	const selLeft = selectionBounds.x;
	const selRight = selectionBounds.x + selectionBounds.width;
	const selTop = selectionBounds.y;
	const selBottom = selectionBounds.y + selectionBounds.height;

	// Check horizontal gaps (affects X position)
	for (const gap of gaps.horizontal) {
		const gapStartRight = gap.startBounds.x + gap.startBounds.width;
		const gapEndLeft = gap.endBounds.x;

		// Check if selection overlaps vertically with this gap
		const vertOverlap = rangesOverlap(
			selTop,
			selBottom,
			gap.breadthIntersection[0],
			gap.breadthIntersection[1]
		);
		if (!vertOverlap) continue;

		// Case 1: Selection to the LEFT of the gap's start element
		// Check if placing selection would create equal gap on the left
		{
			const currentGap = gap.startBounds.x - selRight;
			// Only consider if selection is actually to the left (positive gap)
			if (currentGap > 0) {
				const diff = Math.abs(currentGap - gap.length);

				if (diff < threshold && (xResult === null || diff < Math.abs(xResult.nudge))) {
					// nudge = how much to move right to make currentGap equal gap.length
					// If currentGap > gap.length, move right (positive), else move left (negative)
					const nudge = currentGap - gap.length;
					xResult = {
						nudge,
						indicator: {
							id: uniqueId(),
							type: 'gap',
							direction: 'horizontal',
							gaps: [
								// The new gap we're creating
								{
									startEdge: selRight + nudge,
									endEdge: gap.startBounds.x,
									breadthStart: vertOverlap[0],
									breadthEnd: vertOverlap[1]
								},
								// The existing gap we're matching
								{
									startEdge: gapStartRight,
									endEdge: gapEndLeft,
									breadthStart: gap.breadthIntersection[0],
									breadthEnd: gap.breadthIntersection[1]
								}
							]
						}
					};
				}
			}
		}

		// Case 2: Selection to the RIGHT of the gap's end element
		// Check if placing selection would create equal gap on the right
		{
			const gapEndRight = gap.endBounds.x + gap.endBounds.width;
			const currentGap = selLeft - gapEndRight;
			// Only consider if selection is actually to the right (positive gap)
			if (currentGap > 0) {
				const diff = Math.abs(currentGap - gap.length);

				if (diff < threshold && (xResult === null || diff < Math.abs(xResult.nudge))) {
					// nudge = how much to move to make currentGap equal gap.length
					// If currentGap > gap.length, move left (negative), else move right (positive)
					const nudge = gap.length - currentGap;
					xResult = {
						nudge,
						indicator: {
							id: uniqueId(),
							type: 'gap',
							direction: 'horizontal',
							gaps: [
								// The existing gap
								{
									startEdge: gapStartRight,
									endEdge: gapEndLeft,
									breadthStart: gap.breadthIntersection[0],
									breadthEnd: gap.breadthIntersection[1]
								},
								// The new gap we're creating
								{
									startEdge: gapEndRight,
									endEdge: selLeft + nudge,
									breadthStart: vertOverlap[0],
									breadthEnd: vertOverlap[1]
								}
							]
						}
					};
				}
			}
		}

		// Case 3: Selection BETWEEN the two elements (center of gap)
		// Check if we can place selection in the center
		{
			const gapCenterX = gapStartRight + gap.length / 2;
			const selCenterX = selLeft + selectionBounds.width / 2;
			const diff = Math.abs(gapCenterX - selCenterX);

			if (diff < threshold && (xResult === null || diff < Math.abs(xResult.nudge))) {
				const nudge = gapCenterX - selCenterX;
				const newSelLeft = selLeft + nudge;
				const newSelRight = selRight + nudge;
				const gapLeft = newSelLeft - gapStartRight;
				const gapRight = gapEndLeft - newSelRight;

				// Only snap if it creates two equal gaps
				if (Math.abs(gapLeft - gapRight) < 1) {
					xResult = {
						nudge,
						indicator: {
							id: uniqueId(),
							type: 'gap',
							direction: 'horizontal',
							gaps: [
								// Left gap
								{
									startEdge: gapStartRight,
									endEdge: newSelLeft,
									breadthStart: vertOverlap[0],
									breadthEnd: vertOverlap[1]
								},
								// Right gap
								{
									startEdge: newSelRight,
									endEdge: gapEndLeft,
									breadthStart: vertOverlap[0],
									breadthEnd: vertOverlap[1]
								}
							]
						}
					};
				}
			}
		}
	}

	// Check vertical gaps (affects Y position)
	for (const gap of gaps.vertical) {
		const gapStartBottom = gap.startBounds.y + gap.startBounds.height;
		const gapEndTop = gap.endBounds.y;

		// Check if selection overlaps horizontally with this gap
		const horizOverlap = rangesOverlap(
			selLeft,
			selRight,
			gap.breadthIntersection[0],
			gap.breadthIntersection[1]
		);
		if (!horizOverlap) continue;

		// Case 1: Selection ABOVE the gap's start element
		{
			const currentGap = gap.startBounds.y - selBottom;
			// Only consider if selection is actually above (positive gap)
			if (currentGap > 0) {
				const diff = Math.abs(currentGap - gap.length);

				if (diff < threshold && (yResult === null || diff < Math.abs(yResult.nudge))) {
					// nudge = how much to move down to make currentGap equal gap.length
					const nudge = currentGap - gap.length;
					yResult = {
						nudge,
						indicator: {
							id: uniqueId(),
							type: 'gap',
							direction: 'vertical',
							gaps: [
								{
									startEdge: selBottom + nudge,
									endEdge: gap.startBounds.y,
									breadthStart: horizOverlap[0],
									breadthEnd: horizOverlap[1]
								},
								{
									startEdge: gapStartBottom,
									endEdge: gapEndTop,
									breadthStart: gap.breadthIntersection[0],
									breadthEnd: gap.breadthIntersection[1]
								}
							]
						}
					};
				}
			}
		}

		// Case 2: Selection BELOW the gap's end element
		{
			const gapEndBottom = gap.endBounds.y + gap.endBounds.height;
			const currentGap = selTop - gapEndBottom;
			// Only consider if selection is actually below (positive gap)
			if (currentGap > 0) {
				const diff = Math.abs(currentGap - gap.length);

				if (diff < threshold && (yResult === null || diff < Math.abs(yResult.nudge))) {
					// nudge = how much to move to make currentGap equal gap.length
					const nudge = gap.length - currentGap;
					yResult = {
						nudge,
						indicator: {
							id: uniqueId(),
							type: 'gap',
							direction: 'vertical',
							gaps: [
								{
									startEdge: gapStartBottom,
									endEdge: gapEndTop,
									breadthStart: gap.breadthIntersection[0],
									breadthEnd: gap.breadthIntersection[1]
								},
								{
									startEdge: gapEndBottom,
									endEdge: selTop + nudge,
									breadthStart: horizOverlap[0],
									breadthEnd: horizOverlap[1]
								}
							]
						}
					};
				}
			}
		}

		// Case 3: Selection BETWEEN (center of gap)
		{
			const gapCenterY = gapStartBottom + gap.length / 2;
			const selCenterY = selTop + selectionBounds.height / 2;
			const diff = Math.abs(gapCenterY - selCenterY);

			if (diff < threshold && (yResult === null || diff < Math.abs(yResult.nudge))) {
				const nudge = gapCenterY - selCenterY;
				const newSelTop = selTop + nudge;
				const newSelBottom = selBottom + nudge;
				const gapTop = newSelTop - gapStartBottom;
				const gapBottom = gapEndTop - newSelBottom;

				if (Math.abs(gapTop - gapBottom) < 1) {
					yResult = {
						nudge,
						indicator: {
							id: uniqueId(),
							type: 'gap',
							direction: 'vertical',
							gaps: [
								{
									startEdge: gapStartBottom,
									endEdge: newSelTop,
									breadthStart: horizOverlap[0],
									breadthEnd: horizOverlap[1]
								},
								{
									startEdge: newSelBottom,
									endEdge: gapEndTop,
									breadthStart: horizOverlap[0],
									breadthEnd: horizOverlap[1]
								}
							]
						}
					};
				}
			}
		}
	}

	return { x: xResult, y: yResult };
}

// =============================================================================
// Core Snap Algorithm (based on tldraw)
// =============================================================================

/**
 * Collect point snaps by comparing selection points to other points.
 * This is the core algorithm from tldraw's BoundsSnaps.collectPointSnaps.
 */
function collectPointSnaps({
	selectionSnapPoints,
	otherSnapPoints,
	minOffset,
	nearestSnapsX,
	nearestSnapsY
}: {
	selectionSnapPoints: SnapPoint[];
	otherSnapPoints: SnapPoint[];
	minOffset: { x: number; y: number };
	nearestSnapsX: NearestPointsSnap[];
	nearestSnapsY: NearestPointsSnap[];
}): void {
	// For each snap point on the selection, find the closest points on each axis
	for (const thisSnapPoint of selectionSnapPoints) {
		for (const otherSnapPoint of otherSnapPoints) {
			const offsetX = Math.abs(thisSnapPoint.x - otherSnapPoint.x);
			const offsetY = Math.abs(thisSnapPoint.y - otherSnapPoint.y);

			// Check X axis
			if (round(offsetX) <= round(minOffset.x)) {
				if (round(offsetX) < round(minOffset.x)) {
					// Found a point significantly closer - reset the list
					nearestSnapsX.length = 0;
				}

				nearestSnapsX.push({
					type: 'points',
					points: { thisPoint: thisSnapPoint, otherPoint: otherSnapPoint },
					nudge: otherSnapPoint.x - thisSnapPoint.x
				});
				minOffset.x = offsetX;
			}

			// Check Y axis
			if (round(offsetY) <= round(minOffset.y)) {
				if (round(offsetY) < round(minOffset.y)) {
					// Found a point significantly closer - reset the list
					nearestSnapsY.length = 0;
				}

				nearestSnapsY.push({
					type: 'points',
					points: { thisPoint: thisSnapPoint, otherPoint: otherSnapPoint },
					nudge: otherSnapPoint.y - thisSnapPoint.y
				});
				minOffset.y = offsetY;
			}
		}
	}
}

/**
 * Generate snap line indicators from the collected snaps.
 * Groups snaps by their snap position to create visual lines.
 */
function getPointSnapLines({
	nearestSnapsX,
	nearestSnapsY
}: {
	nearestSnapsX: NearestPointsSnap[];
	nearestSnapsY: NearestPointsSnap[];
}): PointsSnapIndicator[] {
	// Group snaps by their position on the snap axis
	const snapGroupsX: Record<string, SnapPair[]> = {};
	const snapGroupsY: Record<string, SnapPair[]> = {};

	for (const snap of nearestSnapsX) {
		const key = String(round(snap.points.otherPoint.x));
		if (!snapGroupsX[key]) {
			snapGroupsX[key] = [];
		}
		snapGroupsX[key].push(snap.points);
	}

	for (const snap of nearestSnapsY) {
		const key = String(round(snap.points.otherPoint.y));
		if (!snapGroupsY[key]) {
			snapGroupsY[key] = [];
		}
		snapGroupsY[key].push(snap.points);
	}

	// Create snap indicators from the groups
	const allGroups = [...Object.values(snapGroupsX), ...Object.values(snapGroupsY)];

	return allGroups.map((snapGroup) => ({
		id: uniqueId(),
		type: 'points' as const,
		points: dedupePoints(
			snapGroup.flatMap((snap) => [
				{ x: snap.otherPoint.x, y: snap.otherPoint.y },
				{ x: snap.thisPoint.x, y: snap.thisPoint.y }
			])
		)
	}));
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Calculate snapping for a translate (move) operation.
 *
 * @param selectedIds - IDs of elements being moved
 * @param elements - All elements on the page
 * @param dragDelta - Current drag offset from original position
 * @param zoom - Current zoom level (threshold is adjusted by zoom)
 * @param threshold - Snap threshold in pixels (default: 10)
 * @returns Snap result with nudge offset and visual indicators
 */
export function calculateSnapForTranslate(
	selectedIds: Set<string>,
	elements: readonly WhiteboardElement[],
	dragDelta: Point,
	zoom: number,
	threshold: number = DEFAULT_SNAP_THRESHOLD
): SnapResult {
	// Adjust threshold based on zoom (snap is harder to achieve when zoomed out)
	const adjustedThreshold = threshold / zoom;

	// Collect snap points from selection (with drag delta applied)
	const selectionSnapPoints: SnapPoint[] = [];
	// Collect snap points from other (non-selected) elements
	const otherSnapPoints: SnapPoint[] = [];

	for (const element of elements) {
		const points = getElementSnapPoints(element);

		if (selectedIds.has(element.id)) {
			// Apply drag delta to selection points
			selectionSnapPoints.push(
				...points.map((p) => ({
					...p,
					x: p.x + dragDelta.x,
					y: p.y + dragDelta.y
				}))
			);
		} else {
			otherSnapPoints.push(...points);
		}
	}

	// If no snap targets, return no snapping
	if (otherSnapPoints.length === 0) {
		return { nudge: { x: 0, y: 0 }, indicators: [] };
	}

	// Find nearest point snaps
	const nearestSnapsX: NearestPointsSnap[] = [];
	const nearestSnapsY: NearestPointsSnap[] = [];
	const minOffset = { x: adjustedThreshold, y: adjustedThreshold };

	collectPointSnaps({
		selectionSnapPoints,
		otherSnapPoints,
		minOffset,
		nearestSnapsX,
		nearestSnapsY
	});

	// Calculate nudge from point snaps (use mutable object, not Point which may be readonly)
	const nudge = {
		x: nearestSnapsX[0]?.nudge ?? 0,
		y: nearestSnapsY[0]?.nudge ?? 0
	};

	// Track gap snap indicators
	const gapIndicators: GapSnapIndicator[] = [];

	// If no point snap on an axis, try gap snapping
	if (nudge.x === 0 || nudge.y === 0) {
		// Calculate selection bounds with drag delta applied
		const selectionBounds = getSelectionBounds(selectedIds, elements);

		if (selectionBounds) {
			const movedSelectionBounds: BoundingBox = {
				x: selectionBounds.x + dragDelta.x,
				y: selectionBounds.y + dragDelta.y,
				width: selectionBounds.width,
				height: selectionBounds.height
			};

			// Collect gaps between non-selected elements
			const gaps = collectVisibleGaps(elements, selectedIds);

			// Find gap snaps
			const gapSnaps = findGapSnaps(movedSelectionBounds, gaps, adjustedThreshold);

			// Apply gap snap nudge if no point snap on that axis
			if (nudge.x === 0 && gapSnaps.x) {
				nudge.x = gapSnaps.x.nudge;
				gapIndicators.push(gapSnaps.x.indicator);
			}
			if (nudge.y === 0 && gapSnaps.y) {
				nudge.y = gapSnaps.y.nudge;
				gapIndicators.push(gapSnaps.y.indicator);
			}
		}
	}

	// Now recalculate point snaps with the nudge applied to get all matching snap points
	// (for accurate indicator rendering)
	if (nearestSnapsX.length > 0 || nearestSnapsY.length > 0) {
		if (nudge.x !== 0 || nudge.y !== 0) {
			// Reset and recalculate with nudged positions
			nearestSnapsX.length = 0;
			nearestSnapsY.length = 0;
			minOffset.x = 0;
			minOffset.y = 0;

			// Apply nudge to selection points
			const nudgedSelectionPoints = selectionSnapPoints.map((p) => ({
				...p,
				x: p.x + nudge.x,
				y: p.y + nudge.y
			}));

			collectPointSnaps({
				selectionSnapPoints: nudgedSelectionPoints,
				otherSnapPoints,
				minOffset,
				nearestSnapsX,
				nearestSnapsY
			});
		}
	}

	// Generate visual indicators
	const pointIndicators = getPointSnapLines({ nearestSnapsX, nearestSnapsY });
	const indicators: SnapIndicator[] = [...pointIndicators, ...gapIndicators];

	return { nudge, indicators };
}

/**
 * Calculate the combined bounding box for multiple elements.
 */
export function getSelectionBounds(
	selectedIds: Set<string>,
	elements: readonly WhiteboardElement[]
): BoundingBox | null {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let hasElements = false;

	for (const element of elements) {
		if (!selectedIds.has(element.id)) continue;

		const bounds = getElementBounds(element);
		minX = Math.min(minX, bounds.x);
		minY = Math.min(minY, bounds.y);
		maxX = Math.max(maxX, bounds.x + bounds.width);
		maxY = Math.max(maxY, bounds.y + bounds.height);
		hasElements = true;
	}

	if (!hasElements) return null;

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}
