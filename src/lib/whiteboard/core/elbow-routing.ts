/**
 * Elbow Arrow Routing with A* Pathfinding
 *
 * Implements automatic routing for elbow arrows that avoid obstacles.
 * Based on Excalidraw's elbow arrow routing algorithm.
 *
 * The algorithm:
 * 1. Creates a navigation grid around obstacles
 * 2. Uses A* search to find the shortest path with 90-degree turns only
 * 3. Simplifies the path by removing redundant points
 *
 * @module whiteboard/core/elbow-routing
 */

import type { Point, Heading, WhiteboardElement } from '../types/document';
import type { AABB } from './aabb';
import { aabbsFromElements, expandAABB, segmentIntersectsAABB } from './aabb';
import { HEADING_VECTORS, getOppositeHeading, areHeadingsPerpendicular } from './heading';

// =============================================================================
// Types
// =============================================================================

/** A node in the A* search graph */
interface PathNode {
	readonly x: number;
	readonly y: number;
	readonly heading: Heading;
	/** Cost from start to this node */
	g: number;
	/** Estimated cost from this node to goal (heuristic) */
	h: number;
	/** Total cost (g + h) */
	f: number;
	/** Parent node for path reconstruction */
	parent: PathNode | null;
}

/** Configuration for elbow routing */
export interface ElbowRoutingConfig {
	/** Minimum gap between arrow path and obstacles (default: 10) */
	obstacleGap: number;
	/** Grid cell size for A* search (default: 10) */
	gridSize: number;
	/** Maximum number of nodes to explore (default: 5000) */
	maxNodes: number;
	/** Penalty multiplier for direction changes (default: 2) */
	turnPenalty: number;
}

/** Default routing configuration */
const DEFAULT_CONFIG: ElbowRoutingConfig = {
	obstacleGap: 10,
	gridSize: 10,
	maxNodes: 5000,
	turnPenalty: 2
};

/** Result of elbow routing */
export interface ElbowRoutingResult {
	/** The calculated path points */
	points: Point[];
	/** Whether the routing was successful */
	success: boolean;
	/** Debug info (number of nodes explored, etc.) */
	debug?: {
		nodesExplored: number;
		pathLength: number;
	};
}

// =============================================================================
// Main Routing Function
// =============================================================================

/**
 * Calculate an elbow arrow path that avoids obstacles.
 *
 * @param start - Start point of the arrow
 * @param end - End point of the arrow
 * @param startHeading - Direction the arrow exits from start (optional)
 * @param endHeading - Direction the arrow enters at end (optional)
 * @param elements - All elements that are potential obstacles
 * @param excludeIds - Element IDs to exclude from obstacle checking
 * @param config - Routing configuration (optional)
 * @returns Routing result with path points
 */
export function routeElbowArrow(
	start: Point,
	end: Point,
	startHeading: Heading | null,
	endHeading: Heading | null,
	elements: readonly WhiteboardElement[],
	excludeIds?: Set<string>,
	config: Partial<ElbowRoutingConfig> = {}
): ElbowRoutingResult {
	const cfg: ElbowRoutingConfig = { ...DEFAULT_CONFIG, ...config };

	// Get obstacle AABBs
	const rawObstacles = aabbsFromElements(elements, excludeIds);

	// Expand obstacles by the gap amount
	const obstacles = rawObstacles.map((aabb) => expandAABB(aabb, cfg.obstacleGap));

	// If no obstacles or very close points, use simple L-shape
	if (obstacles.length === 0 || distance(start, end) < cfg.gridSize * 2) {
		return {
			points: generateSimplePath(start, end, startHeading, endHeading),
			success: true
		};
	}

	// Try A* pathfinding
	const result = aStarSearch(start, end, startHeading, endHeading, obstacles, cfg);

	if (result.success) {
		return result;
	}

	// Fallback to simple path if A* fails
	return {
		points: generateSimplePath(start, end, startHeading, endHeading),
		success: false
	};
}

// =============================================================================
// A* Search Implementation
// =============================================================================

/**
 * A* search for finding optimal elbow path.
 */
function aStarSearch(
	start: Point,
	end: Point,
	startHeading: Heading | null,
	endHeading: Heading | null,
	obstacles: readonly AABB[],
	config: ElbowRoutingConfig
): ElbowRoutingResult {
	const { gridSize, maxNodes, turnPenalty } = config;

	// Snap start and end to grid
	const gridStart = snapToGrid(start, gridSize);
	const gridEnd = snapToGrid(end, gridSize);

	// Determine initial headings if not provided
	const effectiveStartHeading = startHeading ?? guessHeading(start, end);
	const effectiveEndHeading = endHeading ?? getOppositeHeading(guessHeading(end, start));

	// Create start nodes (one for each possible initial heading)
	const startNodes = createStartNodes(gridStart, effectiveStartHeading);

	// Open set (nodes to explore) - using array as simple priority queue
	const openSet: PathNode[] = startNodes;

	// Closed set (explored nodes) - key is "x,y,heading"
	const closedSet = new Set<string>();

	let nodesExplored = 0;

	while (openSet.length > 0 && nodesExplored < maxNodes) {
		// Get node with lowest f score
		openSet.sort((a, b) => a.f - b.f);
		const current = openSet.shift()!;

		const currentKey = nodeKey(current);
		if (closedSet.has(currentKey)) continue;
		closedSet.add(currentKey);
		nodesExplored++;

		// Check if we reached the goal
		if (isAtGoal(current, gridEnd, effectiveEndHeading, gridSize)) {
			const path = reconstructPath(current);
			const simplifiedPath = simplifyPath(path);

			// Ensure path starts at exact start and ends at exact end
			simplifiedPath[0] = start;
			simplifiedPath[simplifiedPath.length - 1] = end;

			return {
				points: simplifiedPath,
				success: true,
				debug: { nodesExplored, pathLength: simplifiedPath.length }
			};
		}

		// Explore neighbors (forward, and perpendicular directions)
		const neighbors = getNeighbors(current, gridSize, turnPenalty);

		for (const neighbor of neighbors) {
			const neighborKey = nodeKey(neighbor);
			if (closedSet.has(neighborKey)) continue;

			// Check if path to neighbor intersects any obstacle
			const segment = { p1: { x: current.x, y: current.y }, p2: { x: neighbor.x, y: neighbor.y } };
			const intersectsObstacle = obstacles.some((o) => segmentIntersectsAABB(segment, o));
			if (intersectsObstacle) continue;

			// Calculate heuristic
			neighbor.h = heuristic(neighbor, gridEnd, effectiveEndHeading, turnPenalty);
			neighbor.f = neighbor.g + neighbor.h;
			neighbor.parent = current;

			// Check if already in open set with better score
			const existingIdx = openSet.findIndex(
				(n) => n.x === neighbor.x && n.y === neighbor.y && n.heading === neighbor.heading
			);

			if (existingIdx === -1) {
				openSet.push(neighbor);
			} else if (neighbor.g < openSet[existingIdx].g) {
				openSet[existingIdx] = neighbor;
			}
		}
	}

	// No path found
	return {
		points: generateSimplePath(start, end, startHeading, endHeading),
		success: false,
		debug: { nodesExplored, pathLength: 0 }
	};
}

/**
 * Create start nodes for A* search.
 */
function createStartNodes(start: Point, heading: Heading): PathNode[] {
	return [
		{
			x: start.x,
			y: start.y,
			heading,
			g: 0,
			h: 0,
			f: 0,
			parent: null
		}
	];
}

/**
 * Get neighboring nodes for A* expansion.
 */
function getNeighbors(node: PathNode, gridSize: number, turnPenalty: number): PathNode[] {
	const neighbors: PathNode[] = [];
	const allHeadings: Heading[] = ['up', 'down', 'left', 'right'];

	for (const heading of allHeadings) {
		const vec = HEADING_VECTORS[heading];
		const newX = node.x + vec.x * gridSize;
		const newY = node.y + vec.y * gridSize;

		// Calculate movement cost
		let cost = gridSize;

		// Add turn penalty if changing direction
		if (heading !== node.heading) {
			if (areHeadingsPerpendicular(heading, node.heading)) {
				cost += gridSize * turnPenalty;
			} else {
				// Going backwards - very expensive
				cost += gridSize * turnPenalty * 10;
			}
		}

		neighbors.push({
			x: newX,
			y: newY,
			heading,
			g: node.g + cost,
			h: 0,
			f: 0,
			parent: null
		});
	}

	return neighbors;
}

/**
 * Heuristic function for A* (Manhattan distance with turn estimate).
 */
function heuristic(node: PathNode, goal: Point, goalHeading: Heading, turnPenalty: number): number {
	const dx = Math.abs(node.x - goal.x);
	const dy = Math.abs(node.y - goal.y);
	const manhattan = dx + dy;

	// Estimate turns needed
	let turnEstimate = 0;

	// If not aligned with goal, we need at least one turn
	if (dx > 0 && dy > 0) {
		turnEstimate = 1;
	}

	// If current heading doesn't match goal heading, might need another turn
	if (node.heading !== goalHeading && !areHeadingsPerpendicular(node.heading, goalHeading)) {
		turnEstimate++;
	}

	return manhattan + turnEstimate * turnPenalty * 10;
}

/**
 * Check if a node is at the goal position.
 */
function isAtGoal(node: PathNode, goal: Point, goalHeading: Heading, gridSize: number): boolean {
	const dx = Math.abs(node.x - goal.x);
	const dy = Math.abs(node.y - goal.y);

	// Within one grid cell of goal
	if (dx <= gridSize && dy <= gridSize) {
		// Check if heading is compatible
		return node.heading === goalHeading || areHeadingsPerpendicular(node.heading, goalHeading);
	}

	return false;
}

/**
 * Generate a unique key for a node.
 */
function nodeKey(node: PathNode): string {
	return `${node.x},${node.y},${node.heading}`;
}

/**
 * Reconstruct path from A* result.
 */
function reconstructPath(endNode: PathNode): Point[] {
	const path: Point[] = [];
	let current: PathNode | null = endNode;

	while (current) {
		path.unshift({ x: current.x, y: current.y });
		current = current.parent;
	}

	return path;
}

/**
 * Simplify path by removing collinear points.
 */
function simplifyPath(path: Point[]): Point[] {
	if (path.length <= 2) return path;

	const simplified: Point[] = [path[0]];

	for (let i = 1; i < path.length - 1; i++) {
		const prev = simplified[simplified.length - 1];
		const curr = path[i];
		const next = path[i + 1];

		// Check if current point is on the same line as prev and next
		if (!areCollinear(prev, curr, next)) {
			simplified.push(curr);
		}
	}

	simplified.push(path[path.length - 1]);

	return simplified;
}

/**
 * Check if three points are collinear.
 */
function areCollinear(p1: Point, p2: Point, p3: Point): boolean {
	// Use cross product - if zero (or very small), points are collinear
	const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
	return Math.abs(cross) < 0.001;
}

// =============================================================================
// Simple Path Generation (Fallback)
// =============================================================================

/**
 * Generate a simple L-shape or Z-shape path.
 */
function generateSimplePath(
	start: Point,
	end: Point,
	startHeading: Heading | null,
	endHeading: Heading | null
): Point[] {
	const dx = end.x - start.x;
	const dy = end.y - start.y;

	// If headings are specified and perpendicular, use simple L-shape
	if (startHeading && endHeading && areHeadingsPerpendicular(startHeading, endHeading)) {
		const startVec = HEADING_VECTORS[startHeading];

		if (startVec.x !== 0) {
			// Start horizontal
			return [start, { x: end.x, y: start.y }, end];
		} else {
			// Start vertical
			return [start, { x: start.x, y: end.y }, end];
		}
	}

	// If headings are same or opposite, need Z-shape (two turns)
	if (startHeading && endHeading) {
		const startVec = HEADING_VECTORS[startHeading];

		if (startVec.x !== 0) {
			// Start and end horizontal - need vertical middle segment
			const midX = (start.x + end.x) / 2;
			return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
		} else {
			// Start and end vertical - need horizontal middle segment
			const midY = (start.y + end.y) / 2;
			return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
		}
	}

	// No headings - use simple L based on distance
	if (Math.abs(dx) >= Math.abs(dy)) {
		// Horizontal first
		return [start, { x: end.x, y: start.y }, end];
	} else {
		// Vertical first
		return [start, { x: start.x, y: end.y }, end];
	}
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate Euclidean distance between two points.
 */
function distance(p1: Point, p2: Point): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Snap a point to the nearest grid position.
 */
function snapToGrid(point: Point, gridSize: number): Point {
	return {
		x: Math.round(point.x / gridSize) * gridSize,
		y: Math.round(point.y / gridSize) * gridSize
	};
}

/**
 * Guess the best heading from one point toward another.
 */
function guessHeading(from: Point, to: Point): Heading {
	const dx = to.x - from.x;
	const dy = to.y - from.y;

	if (Math.abs(dx) > Math.abs(dy)) {
		return dx > 0 ? 'right' : 'left';
	} else {
		return dy > 0 ? 'down' : 'up';
	}
}

// =============================================================================
// Path Validation
// =============================================================================

/**
 * Check if a path is valid (no intersections with obstacles).
 */
export function isPathValid(path: readonly Point[], obstacles: readonly AABB[]): boolean {
	if (path.length < 2) return true;

	for (let i = 0; i < path.length - 1; i++) {
		const segment = { p1: path[i], p2: path[i + 1] };

		for (const obstacle of obstacles) {
			if (segmentIntersectsAABB(segment, obstacle)) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Calculate the total length of a path.
 */
export function calculatePathLength(path: readonly Point[]): number {
	let length = 0;

	for (let i = 0; i < path.length - 1; i++) {
		length += distance(path[i], path[i + 1]);
	}

	return length;
}

/**
 * Count the number of turns (direction changes) in a path.
 */
export function countPathTurns(path: readonly Point[]): number {
	if (path.length < 3) return 0;

	let turns = 0;

	for (let i = 1; i < path.length - 1; i++) {
		const prev = path[i - 1];
		const curr = path[i];
		const next = path[i + 1];

		// Check if direction changes at this point
		const dx1 = curr.x - prev.x;
		const dy1 = curr.y - prev.y;
		const dx2 = next.x - curr.x;
		const dy2 = next.y - curr.y;

		// If cross product is non-zero, there's a turn
		const cross = dx1 * dy2 - dy1 * dx2;
		if (Math.abs(cross) > 0.001) {
			turns++;
		}
	}

	return turns;
}
