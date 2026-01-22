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

/** Result of snap calculation */
export interface SnapResult {
	nudge: Point;
	indicators: PointsSnapIndicator[];
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

	// Find nearest snaps
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

	// Calculate nudge from the first snap on each axis
	const nudge: Point = {
		x: nearestSnapsX[0]?.nudge ?? 0,
		y: nearestSnapsY[0]?.nudge ?? 0
	};

	// Now recalculate with the nudge applied to get all matching snap points
	// (for accurate indicator rendering)
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

	// Generate visual indicators
	const indicators = getPointSnapLines({ nearestSnapsX, nearestSnapsY });

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
