/**
 * Elbow Arrow Routing with A* Pathfinding (Excalidraw-style)
 *
 * This module implements the elbow arrow routing algorithm from Excalidraw.
 * Key features:
 * - Non-uniform grid based on obstacle boundaries
 * - Dynamic AABBs with direction-dependent padding
 * - Dongle system for proper heading enforcement
 * - A* search with cubic turn penalties
 *
 * @module whiteboard/core/elbow-routing
 */

import type { Point, Heading, ShapeElement } from '../types/document';
import { HEADING_UP, HEADING_DOWN, HEADING_LEFT, HEADING_RIGHT } from '../types/document';
import {
	type Bounds,
	compareHeading,
	flipHeading,
	headingIsHorizontal,
	vectorToHeading,
	boundsFromShape,
	pointInsideBounds,
	neighborIndexToHeading
} from './heading';

// =============================================================================
// Constants
// =============================================================================

/** Base padding around elements for routing */
export const BASE_PADDING = 40;

/** Threshold for removing duplicate/short segments */
const DEDUP_THRESHOLD = 1;

// =============================================================================
// Types
// =============================================================================

/** Grid address as [col, row] */
type GridAddress = readonly [number, number];

/** A* search node */
interface Node {
	f: number;
	g: number;
	h: number;
	closed: boolean;
	visited: boolean;
	parent: Node | null;
	pos: Point;
	addr: GridAddress;
}

/** Navigation grid for A* */
interface Grid {
	row: number;
	col: number;
	data: (Node | null)[];
}

/** Input data for routing calculation */
interface ElbowArrowData {
	dynamicAABBs: [Bounds, Bounds];
	startDonglePosition: Point | null;
	startGlobalPoint: Point;
	startHeading: Heading;
	endDonglePosition: Point | null;
	endGlobalPoint: Point;
	endHeading: Heading;
	commonBounds: Bounds;
}

/** Result of elbow routing */
export interface ElbowRoutingResult {
	points: Point[];
	success: boolean;
}

// =============================================================================
// Main Routing Function
// =============================================================================

/**
 * Calculate an elbow arrow path between two points.
 *
 * @param startPoint - Start point of the arrow
 * @param endPoint - End point of the arrow
 * @param startHeading - Direction the arrow exits from start
 * @param endHeading - Direction the arrow enters at end
 * @param startElement - Optional shape element at start (for dynamic AABB)
 * @param endElement - Optional shape element at end (for dynamic AABB)
 * @returns Routing result with path points
 */
export function routeElbowArrow(
	startPoint: Point,
	endPoint: Point,
	startHeading: Heading,
	endHeading: Heading,
	startElement: ShapeElement | null = null,
	endElement: ShapeElement | null = null
): ElbowRoutingResult {
	// Handle same point edge case - return a minimal path
	if (startPoint.x === endPoint.x && startPoint.y === endPoint.y) {
		// Generate a small path in the start heading direction and back
		const offset = 20;
		const midPoint: Point = headingIsHorizontal(startHeading)
			? { x: startPoint.x + startHeading[0] * offset, y: startPoint.y }
			: { x: startPoint.x, y: startPoint.y + startHeading[1] * offset };
		return {
			points: [startPoint, midPoint, endPoint],
			success: true
		};
	}

	// Prepare routing data
	const data = getElbowArrowData(
		startPoint,
		endPoint,
		startHeading,
		endHeading,
		startElement,
		endElement
	);

	// Calculate the grid
	const grid = calculateGrid(
		data.dynamicAABBs,
		data.startDonglePosition ?? data.startGlobalPoint,
		data.startHeading,
		data.endDonglePosition ?? data.endGlobalPoint,
		data.endHeading,
		data.commonBounds
	);

	// Find dongle nodes in the grid
	const startDongle = data.startDonglePosition
		? pointToGridNode(data.startDonglePosition, grid)
		: null;
	const endDongle = data.endDonglePosition ? pointToGridNode(data.endDonglePosition, grid) : null;

	// Get start and end nodes
	const startNode = startDongle ?? pointToGridNode(data.startGlobalPoint, grid);
	const endNode = endDongle ?? pointToGridNode(data.endGlobalPoint, grid);

	if (!startNode || !endNode) {
		// Fallback to simple path
		return {
			points: generateSimplePath(startPoint, endPoint, startHeading, endHeading),
			success: false
		};
	}

	// Determine which AABBs to use for obstacle avoidance
	// Only use AABBs when there are actual shapes to avoid
	const hasShapes = startElement !== null || endElement !== null;

	// Check if dongles overlap (both points inside the other's AABB)
	const dongleOverlap =
		startDongle &&
		endDongle &&
		(pointInsideBounds(startDongle.pos, data.dynamicAABBs[1]) ||
			pointInsideBounds(endDongle.pos, data.dynamicAABBs[0]));

	// Run A* search - don't use AABBs if no shapes or if dongles overlap
	const aabbsToAvoid = !hasShapes || dongleOverlap ? [] : data.dynamicAABBs;
	const path = astar(startNode, endNode, grid, data.startHeading, data.endHeading, aabbsToAvoid);

	if (path) {
		// Convert path nodes to points
		const points = path.map((node) => node.pos);

		// Add start/end global points if using dongles
		if (startDongle) {
			points.unshift(data.startGlobalPoint);
		}
		if (endDongle) {
			points.push(data.endGlobalPoint);
		}

		// Post-process: remove short segments and keep only corners
		const cleanedPoints = getElbowArrowCornerPoints(removeElbowArrowShortSegments(points));

		return {
			points: cleanedPoints,
			success: true
		};
	}

	// Fallback to simple path
	return {
		points: generateSimplePath(startPoint, endPoint, startHeading, endHeading),
		success: false
	};
}

// =============================================================================
// Data Preparation
// =============================================================================

/**
 * Prepare all data needed for elbow arrow routing.
 */
function getElbowArrowData(
	startPoint: Point,
	endPoint: Point,
	startHeading: Heading,
	endHeading: Heading,
	startElement: ShapeElement | null,
	endElement: ShapeElement | null
): ElbowArrowData {
	// Get element bounds or create point bounds
	const startBounds = startElement
		? expandBounds(boundsFromShape(startElement), BASE_PADDING)
		: pointToBounds(startPoint);
	const endBounds = endElement
		? expandBounds(boundsFromShape(endElement), BASE_PADDING)
		: pointToBounds(endPoint);

	// Calculate common bounds
	const commonBounds = combineBounds([startBounds, endBounds]);

	// Generate dynamic AABBs with direction-dependent offsets
	const dynamicAABBs = generateDynamicAABBs(
		startBounds,
		endBounds,
		commonBounds,
		offsetFromHeading(startHeading, BASE_PADDING, BASE_PADDING),
		offsetFromHeading(endHeading, BASE_PADDING, BASE_PADDING)
	);

	// Calculate dongle positions
	const startDonglePosition = startElement
		? getDonglePosition(dynamicAABBs[0], startHeading, startPoint)
		: null;
	const endDonglePosition = endElement
		? getDonglePosition(dynamicAABBs[1], endHeading, endPoint)
		: null;

	return {
		dynamicAABBs,
		startDonglePosition,
		startGlobalPoint: startPoint,
		startHeading,
		endDonglePosition,
		endGlobalPoint: endPoint,
		endHeading,
		commonBounds
	};
}

// =============================================================================
// Dynamic AABB Generation
// =============================================================================

/**
 * Calculate offset values based on heading direction.
 * Returns [top, right, bottom, left] offsets.
 */
function offsetFromHeading(
	heading: Heading,
	head: number,
	side: number
): [number, number, number, number] {
	if (compareHeading(heading, HEADING_UP)) {
		return [head, side, side, side];
	}
	if (compareHeading(heading, HEADING_RIGHT)) {
		return [side, head, side, side];
	}
	if (compareHeading(heading, HEADING_DOWN)) {
		return [side, side, head, side];
	}
	// HEADING_LEFT
	return [side, side, side, head];
}

/**
 * Generate dynamic AABBs for start and end elements.
 * These AABBs are expanded differently based on the heading direction
 * to create a "corridor" for the arrow to exit/enter.
 */
function generateDynamicAABBs(
	startBounds: Bounds,
	endBounds: Bounds,
	commonBounds: Bounds,
	startOffset: [number, number, number, number],
	endOffset: [number, number, number, number]
): [Bounds, Bounds] {
	const [startUp, startRight, startDown, startLeft] = startOffset;
	const [endUp, endRight, endDown, endLeft] = endOffset;

	const a = startBounds;
	const b = endBounds;

	// First AABB (start element)
	const first: Bounds = [
		a[0] > b[2]
			? Math.min((a[0] + b[2]) / 2, a[0] - startLeft)
			: a[0] > b[0]
				? a[0] - startLeft
				: commonBounds[0] - startLeft,
		a[1] > b[3]
			? Math.min((a[1] + b[3]) / 2, a[1] - startUp)
			: a[1] > b[1]
				? a[1] - startUp
				: commonBounds[1] - startUp,
		a[2] < b[0]
			? Math.max((a[2] + b[0]) / 2, a[2] + startRight)
			: a[2] < b[2]
				? a[2] + startRight
				: commonBounds[2] + startRight,
		a[3] < b[1]
			? Math.max((a[3] + b[1]) / 2, a[3] + startDown)
			: a[3] < b[3]
				? a[3] + startDown
				: commonBounds[3] + startDown
	];

	// Second AABB (end element)
	const second: Bounds = [
		b[0] > a[2]
			? Math.min((b[0] + a[2]) / 2, b[0] - endLeft)
			: b[0] > a[0]
				? b[0] - endLeft
				: commonBounds[0] - endLeft,
		b[1] > a[3]
			? Math.min((b[1] + a[3]) / 2, b[1] - endUp)
			: b[1] > a[1]
				? b[1] - endUp
				: commonBounds[1] - endUp,
		b[2] < a[0]
			? Math.max((b[2] + a[0]) / 2, b[2] + endRight)
			: b[2] < a[2]
				? b[2] + endRight
				: commonBounds[2] + endRight,
		b[3] < a[1]
			? Math.max((b[3] + a[1]) / 2, b[3] + endDown)
			: b[3] < a[3]
				? b[3] + endDown
				: commonBounds[3] + endDown
	];

	return [first, second];
}

/**
 * Get the dongle position - the point where the arrow should exit/enter
 * the dynamic AABB in the given heading direction.
 */
function getDonglePosition(bounds: Bounds, heading: Heading, point: Point): Point {
	if (compareHeading(heading, HEADING_UP)) {
		return { x: point.x, y: bounds[1] };
	}
	if (compareHeading(heading, HEADING_RIGHT)) {
		return { x: bounds[2], y: point.y };
	}
	if (compareHeading(heading, HEADING_DOWN)) {
		return { x: point.x, y: bounds[3] };
	}
	// HEADING_LEFT
	return { x: bounds[0], y: point.y };
}

// =============================================================================
// Grid Calculation
// =============================================================================

/**
 * Calculate the navigation grid for A* pathfinding.
 * Creates a non-uniform grid with lines at AABB boundaries.
 */
function calculateGrid(
	aabbs: Bounds[],
	start: Point,
	startHeading: Heading,
	end: Point,
	endHeading: Heading,
	commonBounds: Bounds
): Grid {
	const horizontal = new Set<number>();
	const vertical = new Set<number>();

	// ALWAYS add start and end positions to ensure they're in the grid
	horizontal.add(start.x);
	vertical.add(start.y);
	horizontal.add(end.x);
	vertical.add(end.y);

	// Add start position line based on heading
	if (headingIsHorizontal(startHeading)) {
		vertical.add(start.y);
	} else {
		horizontal.add(start.x);
	}

	// Add end position line based on heading
	if (headingIsHorizontal(endHeading)) {
		vertical.add(end.y);
	} else {
		horizontal.add(end.x);
	}

	// Add AABB boundaries
	for (const aabb of aabbs) {
		horizontal.add(aabb[0]); // minX
		horizontal.add(aabb[2]); // maxX
		vertical.add(aabb[1]); // minY
		vertical.add(aabb[3]); // maxY
	}

	// Add common bounds
	horizontal.add(commonBounds[0]);
	horizontal.add(commonBounds[2]);
	vertical.add(commonBounds[1]);
	vertical.add(commonBounds[3]);

	// Sort and create grid
	const sortedHorizontal = Array.from(horizontal).sort((a, b) => a - b);
	const sortedVertical = Array.from(vertical).sort((a, b) => a - b);

	const rows = sortedVertical.length;
	const cols = sortedHorizontal.length;

	const data: (Node | null)[] = sortedVertical.flatMap((y, row) =>
		sortedHorizontal.map(
			(x, col): Node => ({
				f: 0,
				g: 0,
				h: 0,
				closed: false,
				visited: false,
				parent: null,
				addr: [col, row],
				pos: { x, y }
			})
		)
	);

	return { row: rows, col: cols, data };
}

/**
 * Find a grid node at the given position.
 */
function pointToGridNode(point: Point, grid: Grid): Node | null {
	for (let col = 0; col < grid.col; col++) {
		for (let row = 0; row < grid.row; row++) {
			const candidate = gridNodeFromAddr([col, row], grid);
			if (candidate && point.x === candidate.pos.x && point.y === candidate.pos.y) {
				return candidate;
			}
		}
	}
	return null;
}

/**
 * Get a grid node by address.
 */
function gridNodeFromAddr(addr: GridAddress, grid: Grid): Node | null {
	const [col, row] = addr;
	if (col < 0 || col >= grid.col || row < 0 || row >= grid.row) {
		return null;
	}
	return grid.data[row * grid.col + col] ?? null;
}

/**
 * Get neighboring nodes for A* expansion.
 * Returns [up, right, down, left] neighbors.
 */
function getNeighbors(
	addr: GridAddress,
	grid: Grid
): [Node | null, Node | null, Node | null, Node | null] {
	const [col, row] = addr;
	return [
		gridNodeFromAddr([col, row - 1], grid), // up
		gridNodeFromAddr([col + 1, row], grid), // right
		gridNodeFromAddr([col, row + 1], grid), // down
		gridNodeFromAddr([col - 1, row], grid) // left
	];
}

// =============================================================================
// A* Pathfinding
// =============================================================================

/**
 * A* pathfinding algorithm with cubic turn penalties.
 */
function astar(
	start: Node,
	end: Node,
	grid: Grid,
	startHeading: Heading,
	endHeading: Heading,
	aabbs: Bounds[]
): Node[] | null {
	// Bend multiplier based on total distance
	const bendMultiplier = manhattanDistance(start.pos, end.pos);

	// Binary heap for efficient node selection
	const open: Node[] = [start];

	while (open.length > 0) {
		// Sort by f score and get lowest
		open.sort((a, b) => a.f - b.f);
		const current = open.shift()!;

		if (!current || current.closed) {
			continue;
		}

		// Goal reached
		if (current === end) {
			return pathTo(start, current);
		}

		// Mark as closed
		current.closed = true;

		// Get neighbors
		const neighbors = getNeighbors(current.addr, grid);

		for (let i = 0; i < 4; i++) {
			const neighbor = neighbors[i];

			if (!neighbor || neighbor.closed) {
				continue;
			}

			// Check if midpoint intersects any AABB
			const midpoint: Point = {
				x: (current.pos.x + neighbor.pos.x) / 2,
				y: (current.pos.y + neighbor.pos.y) / 2
			};

			let intersectsObstacle = false;
			for (const aabb of aabbs) {
				if (pointInsideBounds(midpoint, aabb)) {
					intersectsObstacle = true;
					break;
				}
			}
			if (intersectsObstacle) {
				continue;
			}

			// Calculate heading for this move
			const neighborHeading = neighborIndexToHeading(i as 0 | 1 | 2 | 3);

			// Get previous direction
			const previousDirection = current.parent
				? vectorToHeading([
						current.pos.x - current.parent.pos.x,
						current.pos.y - current.parent.pos.y
					])
				: startHeading;

			// Don't allow going backwards
			const reverseHeading = flipHeading(previousDirection);
			if (
				compareHeading(reverseHeading, neighborHeading) ||
				(gridAddressesEqual(start.addr, neighbor.addr) &&
					compareHeading(neighborHeading, startHeading)) ||
				(gridAddressesEqual(end.addr, neighbor.addr) && compareHeading(neighborHeading, endHeading))
			) {
				continue;
			}

			// Calculate g score with cubic turn penalty
			const directionChange = !compareHeading(previousDirection, neighborHeading);
			const gScore =
				current.g +
				manhattanDistance(neighbor.pos, current.pos) +
				(directionChange ? Math.pow(bendMultiplier, 3) : 0);

			const beenVisited = neighbor.visited;

			if (!beenVisited || gScore < neighbor.g) {
				// Estimate remaining bends
				const estBendCount = estimateSegmentCount(neighbor, end, neighborHeading, endHeading);

				// Update node
				neighbor.visited = true;
				neighbor.parent = current;
				neighbor.h =
					manhattanDistance(end.pos, neighbor.pos) + estBendCount * Math.pow(bendMultiplier, 2);
				neighbor.g = gScore;
				neighbor.f = neighbor.g + neighbor.h;

				if (!beenVisited) {
					open.push(neighbor);
				}
			}
		}
	}

	return null;
}

/**
 * Reconstruct path from A* result.
 */
function pathTo(start: Node, node: Node): Node[] {
	let curr: Node | null = node;
	const path: Node[] = [];

	while (curr?.parent) {
		path.unshift(curr);
		curr = curr.parent;
	}
	path.unshift(start);

	return path;
}

/**
 * Estimate the number of turns needed to reach the goal.
 */
function estimateSegmentCount(
	start: Node,
	end: Node,
	startHeading: Heading,
	endHeading: Heading
): number {
	const sx = start.pos.x;
	const sy = start.pos.y;
	const ex = end.pos.x;
	const ey = end.pos.y;

	// This is a simplified version - Excalidraw has a more complex estimation
	if (compareHeading(endHeading, HEADING_RIGHT)) {
		if (compareHeading(startHeading, HEADING_RIGHT)) {
			if (sx >= ex) return 4;
			if (sy === ey) return 0;
			return 2;
		}
		if (compareHeading(startHeading, HEADING_UP)) {
			if (sy > ey && sx < ex) return 1;
			return 3;
		}
		if (compareHeading(startHeading, HEADING_DOWN)) {
			if (sy < ey && sx < ex) return 1;
			return 3;
		}
		// HEADING_LEFT
		if (sy === ey) return 4;
		return 2;
	}

	if (compareHeading(endHeading, HEADING_LEFT)) {
		if (compareHeading(startHeading, HEADING_RIGHT)) {
			if (sy === ey) return 4;
			return 2;
		}
		if (compareHeading(startHeading, HEADING_UP)) {
			if (sy > ey && sx > ex) return 1;
			return 3;
		}
		if (compareHeading(startHeading, HEADING_DOWN)) {
			if (sy < ey && sx > ex) return 1;
			return 3;
		}
		// HEADING_LEFT
		if (sx <= ex) return 4;
		if (sy === ey) return 0;
		return 2;
	}

	if (compareHeading(endHeading, HEADING_UP)) {
		if (compareHeading(startHeading, HEADING_RIGHT)) {
			if (sy > ey && sx < ex) return 1;
			return 3;
		}
		if (compareHeading(startHeading, HEADING_UP)) {
			if (sy >= ey) return 4;
			if (sx === ex) return 0;
			return 2;
		}
		if (compareHeading(startHeading, HEADING_DOWN)) {
			if (sx === ex) return 4;
			return 2;
		}
		// HEADING_LEFT
		if (sy > ey && sx > ex) return 1;
		return 3;
	}

	// HEADING_DOWN
	if (compareHeading(startHeading, HEADING_RIGHT)) {
		if (sy < ey && sx < ex) return 1;
		return 3;
	}
	if (compareHeading(startHeading, HEADING_UP)) {
		if (sx === ex) return 4;
		return 2;
	}
	if (compareHeading(startHeading, HEADING_DOWN)) {
		if (sy <= ey) return 4;
		if (sx === ex) return 0;
		return 2;
	}
	// HEADING_LEFT
	if (sy < ey && sx > ex) return 1;
	return 3;
}

// =============================================================================
// Post-processing
// =============================================================================

/**
 * Remove segments that are too short.
 */
function removeElbowArrowShortSegments(points: Point[]): Point[] {
	if (points.length < 4) {
		return points;
	}

	return points.filter((p, idx) => {
		if (idx === 0 || idx === points.length - 1) {
			return true;
		}

		const prev = points[idx - 1];
		const dist = manhattanDistance(prev, p);
		return dist > DEDUP_THRESHOLD;
	});
}

/**
 * Keep only corner points (where direction changes).
 */
function getElbowArrowCornerPoints(points: Point[]): Point[] {
	if (points.length <= 2) {
		return points;
	}

	let previousHorizontal =
		Math.abs(points[0].y - points[1].y) < Math.abs(points[0].x - points[1].x);

	return points.filter((p, idx) => {
		// Always keep first and last
		if (idx === 0 || idx === points.length - 1) {
			return true;
		}

		const next = points[idx + 1];
		const nextHorizontal = Math.abs(p.y - next.y) < Math.abs(p.x - next.x);

		if (previousHorizontal === nextHorizontal) {
			previousHorizontal = nextHorizontal;
			return false;
		}

		previousHorizontal = nextHorizontal;
		return true;
	});
}

// =============================================================================
// Fallback Simple Path
// =============================================================================

/**
 * Generate a simple L-shape or Z-shape path as fallback.
 */
function generateSimplePath(
	start: Point,
	end: Point,
	startHeading: Heading,
	endHeading: Heading
): Point[] {
	// If headings are perpendicular, use simple L-shape
	const startIsHorizontal = headingIsHorizontal(startHeading);
	const endIsHorizontal = headingIsHorizontal(endHeading);

	if (startIsHorizontal !== endIsHorizontal) {
		// L-shape
		if (startIsHorizontal) {
			return [start, { x: end.x, y: start.y }, end];
		} else {
			return [start, { x: start.x, y: end.y }, end];
		}
	}

	// Same orientation - need Z-shape (two turns)
	if (startIsHorizontal) {
		const midX = (start.x + end.x) / 2;
		return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
	} else {
		const midY = (start.y + end.y) / 2;
		return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
	}
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Manhattan distance between two points.
 */
function manhattanDistance(a: Point, b: Point): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Create bounds from a single point (zero-size bounds).
 */
function pointToBounds(p: Point): Bounds {
	return [p.x - 2, p.y - 2, p.x + 2, p.y + 2];
}

/**
 * Expand bounds by a margin.
 */
function expandBounds(bounds: Bounds, margin: number): Bounds {
	return [bounds[0] - margin, bounds[1] - margin, bounds[2] + margin, bounds[3] + margin];
}

/**
 * Combine multiple bounds into one that contains all.
 */
function combineBounds(boundsList: Bounds[]): Bounds {
	return [
		Math.min(...boundsList.map((b) => b[0])),
		Math.min(...boundsList.map((b) => b[1])),
		Math.max(...boundsList.map((b) => b[2])),
		Math.max(...boundsList.map((b) => b[3]))
	];
}

/**
 * Check if two grid addresses are equal.
 */
function gridAddressesEqual(a: GridAddress, b: GridAddress): boolean {
	return a[0] === b[0] && a[1] === b[1];
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate that elbow points are properly orthogonal.
 */
export function validateElbowPoints(points: Point[], tolerance: number = DEDUP_THRESHOLD): boolean {
	return points.slice(1).every((p, i) => {
		const prev = points[i];
		return Math.abs(p.x - prev.x) < tolerance || Math.abs(p.y - prev.y) < tolerance;
	});
}
