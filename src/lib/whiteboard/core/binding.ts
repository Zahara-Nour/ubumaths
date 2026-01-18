/**
 * Binding Logic
 *
 * Handles arrow-to-shape binding detection, creation, and position calculation.
 * Works with the geometry functions from binding-geometry.ts.
 *
 * @module whiteboard/core/binding
 */

import type {
	Point,
	ShapeElement,
	ArrowElement,
	BindingAnchor,
	WhiteboardElement,
	ElbowDirection,
	ArrowType,
	ArrowWaypoint
} from '../types/document';
import {
	getShapeBounds,
	getShapeCenter,
	getClosestPerimeterPoint,
	normalizePoint,
	type BoundingBox
} from './binding-geometry';

// =============================================================================
// Constants
// =============================================================================

/** Distance threshold for binding detection (in pixels) */
export const BINDING_THRESHOLD_PX = 30;

/** Default gap between arrow tip and shape perimeter (in pixels) */
export const DEFAULT_BINDING_GAP = 4;

/** Shape types that support arrow bindings */
const BINDABLE_SHAPE_TYPES = new Set(['rectangle', 'circle', 'pentagon', 'hexagon', 'star']);

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Checks if a shape can be a binding target.
 * Only closed shapes (rectangle, circle, polygons) support bindings.
 * Lines and arrows do not.
 */
export function isBindableShape(shape: ShapeElement): boolean {
	return BINDABLE_SHAPE_TYPES.has(shape.shapeType);
}

/**
 * Type guard to check if an element is an arrow with potential bindings.
 */
export function isArrowElement(element: WhiteboardElement): element is ArrowElement {
	return element.type === 'shape' && element.shapeType === 'arrow';
}

// =============================================================================
// Binding Candidate Detection
// =============================================================================

/** Result of binding candidate search */
export interface BindingCandidate {
	/** The shape element that is a potential binding target */
	element: ShapeElement;
	/** Point on the shape's perimeter closest to the search point */
	perimeterPoint: Point;
	/** Distance from search point to perimeter point */
	distance: number;
}

/**
 * Finds the closest bindable shape near a given point.
 *
 * @param point - Point to search around (typically arrow endpoint)
 * @param elements - All elements to search through
 * @param excludeIds - Element IDs to exclude from search (e.g., the arrow being drawn)
 * @returns Binding candidate if found within threshold, null otherwise
 */
export function findBindingCandidate(
	point: Point,
	elements: readonly WhiteboardElement[],
	excludeIds: Set<string>
): BindingCandidate | null {
	let bestCandidate: BindingCandidate | null = null;
	let bestDistance = BINDING_THRESHOLD_PX;

	for (const element of elements) {
		// Skip non-shape elements
		if (element.type !== 'shape') continue;

		// Skip excluded elements
		if (excludeIds.has(element.id)) continue;

		// Skip non-bindable shapes (lines, arrows)
		if (!isBindableShape(element)) continue;

		const shape = element as ShapeElement;

		// Quick bounding box check first
		const bounds = getShapeBounds(shape);
		const expandedBounds = expandBounds(bounds, BINDING_THRESHOLD_PX);
		if (!isPointInBounds(point, expandedBounds)) continue;

		// Get closest point on perimeter
		const perimeterPoint = getClosestPerimeterPoint(shape, point, 0);
		const distance = getDistance(point, perimeterPoint);

		// Check if point is inside the shape (use non-expanded bounds as approximation)
		const isInsideShape = isPointInBounds(point, bounds);

		// If point is inside this shape, immediately return it as the candidate
		// (clicking inside a shape means you want to bind to THAT shape)
		if (isInsideShape) {
			return {
				element: shape,
				perimeterPoint,
				distance
			};
		}

		// Otherwise, use normal threshold-based selection
		if (distance < bestDistance) {
			bestDistance = distance;
			bestCandidate = {
				element: shape,
				perimeterPoint,
				distance
			};
		}
	}

	return bestCandidate;
}

// =============================================================================
// Binding Creation
// =============================================================================

/**
 * Creates a binding anchor for an arrow endpoint to a shape.
 *
 * @param targetShape - Shape to bind to
 * @param arrowEndpoint - Arrow endpoint position (approximate, will snap to perimeter)
 * @param otherEndpoint - The other end of the arrow (used to determine direction)
 * @param gap - Gap between arrow tip and shape perimeter (default: 4px)
 * @returns BindingAnchor with normalized coordinates
 */
export function createBindingAnchor(
	targetShape: ShapeElement,
	arrowEndpoint: Point,
	otherEndpoint: Point,
	gap: number = DEFAULT_BINDING_GAP
): BindingAnchor {
	const bounds = getShapeBounds(targetShape);

	// Calculate perimeter point in the direction toward the other endpoint
	// This ensures the arrow connects at the "facing" edge of the shape
	const perimeterPoint = getClosestPerimeterPoint(targetShape, otherEndpoint, 0);

	// Normalize positions relative to shape bounds
	const normalizedPosition = normalizePoint(arrowEndpoint, bounds);
	const normalizedPerimeter = normalizePoint(perimeterPoint, bounds);

	return {
		elementId: targetShape.id,
		normalizedPosition,
		perimeterPoint: normalizedPerimeter,
		gap
	};
}

// =============================================================================
// Bound Position Calculation
// =============================================================================

/**
 * Calculates the absolute position of a bound arrow endpoint.
 * Called when updating arrow positions after shape transformations.
 *
 * @param binding - The binding anchor data
 * @param targetShape - Current state of the target shape
 * @param otherEndpoint - Position of the arrow's other endpoint (for direction)
 * @returns Absolute point position for the arrow endpoint
 */
export function calculateBoundEndpoint(
	binding: BindingAnchor,
	targetShape: ShapeElement,
	otherEndpoint: Point
): Point {
	const center = getShapeCenter(targetShape);

	// Get perimeter point in the direction of the other endpoint
	// This ensures the connection point updates correctly when shape moves
	const perimeterPoint = getClosestPerimeterPoint(targetShape, otherEndpoint, 0);

	// Apply gap offset in the direction away from center
	const direction = normalizeVector({
		x: otherEndpoint.x - center.x,
		y: otherEndpoint.y - center.y
	});

	return {
		x: perimeterPoint.x + direction.x * binding.gap,
		y: perimeterPoint.y + direction.y * binding.gap
	};
}

// =============================================================================
// Binding Extraction
// =============================================================================

/**
 * Extracts bindings from an arrow element with null-safety.
 *
 * @param arrow - Arrow element to extract bindings from
 * @returns Object with startBinding and endBinding (null if not set)
 */
export function getArrowBindings(arrow: ArrowElement): {
	startBinding: BindingAnchor | null;
	endBinding: BindingAnchor | null;
} {
	return {
		startBinding: arrow.startBinding ?? null,
		endBinding: arrow.endBinding ?? null
	};
}

// =============================================================================
// Arrow Creation with Binding Detection
// =============================================================================

/** Options for creating an arrow element */
export interface ArrowOptions {
	color: string;
	strokeWidth: number;
	opacity: number;
	strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'dashdot';
	/** Type of arrow: sharp (straight), curved (bezier), or elbow (90° angles) */
	arrowType?: ArrowType;
	/** Initial waypoints for curved arrows */
	waypoints?: readonly ArrowWaypoint[];
	/**
	 * @deprecated Use arrowType: 'elbow' instead
	 * If true, arrow bends at 90 degree angles (elbow arrow)
	 */
	elbowed?: boolean;
	/** Direction of first segment for elbow arrows */
	elbowDirection?: ElbowDirection;
}

/** Result of arrow creation with potential bindings */
export interface ArrowCreationResult {
	/** The created arrow element */
	arrow: ArrowElement;
	/** Adjusted start point (snapped to perimeter if bound) */
	adjustedStart: Point;
	/** Adjusted end point (snapped to perimeter if bound) */
	adjustedEnd: Point;
}

/**
 * Creates an arrow element with automatic binding detection.
 * If either endpoint is near a bindable shape, it will snap to that shape's
 * perimeter and create a binding.
 *
 * @param start - Start point of the arrow
 * @param end - End point of the arrow
 * @param elements - All elements to check for binding candidates
 * @param options - Arrow styling options
 * @returns Arrow element with bindings and adjusted endpoints
 */
export function createArrowWithBindings(
	start: Point,
	end: Point,
	elements: readonly WhiteboardElement[],
	options: ArrowOptions
): ArrowCreationResult {
	const arrowId = crypto.randomUUID();
	const excludeIds = new Set([arrowId]);

	let adjustedStart = start;
	let adjustedEnd = end;
	let startBinding: BindingAnchor | null = null;
	let endBinding: BindingAnchor | null = null;

	// Check for binding at start point
	const startCandidate = findBindingCandidate(start, elements, excludeIds);
	if (startCandidate) {
		startBinding = createBindingAnchor(startCandidate.element, start, end);
		// Snap start point to perimeter + gap
		adjustedStart = calculateBoundEndpoint(startBinding, startCandidate.element, end);
	}

	// Check for binding at end point
	const endCandidate = findBindingCandidate(end, elements, excludeIds);
	if (endCandidate) {
		endBinding = createBindingAnchor(endCandidate.element, end, start);
		// Snap end point to perimeter + gap
		adjustedEnd = calculateBoundEndpoint(endBinding, endCandidate.element, start);
	}

	// Determine effective arrow type (handle legacy elbowed flag)
	const effectiveArrowType: ArrowType = options.arrowType ?? (options.elbowed ? 'elbow' : 'sharp');

	const arrow: ArrowElement = {
		id: arrowId,
		type: 'shape',
		shapeType: 'arrow',
		start: adjustedStart,
		end: adjustedEnd,
		color: options.color,
		strokeWidth: options.strokeWidth,
		opacity: options.opacity,
		strokeStyle: options.strokeStyle,
		startBinding,
		endBinding,
		arrowType: effectiveArrowType,
		waypoints: effectiveArrowType === 'curved' ? (options.waypoints ?? []) : undefined,
		// Keep elbowed for backwards compatibility during migration
		elbowed: effectiveArrowType === 'elbow' ? true : undefined,
		elbowDirection: effectiveArrowType === 'elbow' ? options.elbowDirection : undefined
	};

	return {
		arrow,
		adjustedStart,
		adjustedEnd
	};
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Expands a bounding box by a given amount in all directions.
 */
function expandBounds(bounds: BoundingBox, amount: number): BoundingBox {
	return {
		x: bounds.x - amount,
		y: bounds.y - amount,
		width: bounds.width + amount * 2,
		height: bounds.height + amount * 2
	};
}

/**
 * Checks if a point is inside a bounding box.
 */
function isPointInBounds(point: Point, bounds: BoundingBox): boolean {
	return (
		point.x >= bounds.x &&
		point.x <= bounds.x + bounds.width &&
		point.y >= bounds.y &&
		point.y <= bounds.y + bounds.height
	);
}

/**
 * Calculates Euclidean distance between two points.
 */
function getDistance(p1: Point, p2: Point): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizes a vector to unit length.
 */
function normalizeVector(v: { x: number; y: number }): { x: number; y: number } {
	const length = Math.sqrt(v.x * v.x + v.y * v.y);
	if (length === 0) {
		return { x: 1, y: 0 }; // Default direction
	}
	return {
		x: v.x / length,
		y: v.y / length
	};
}
