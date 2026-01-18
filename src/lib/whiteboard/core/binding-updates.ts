/**
 * Binding Update Propagation
 *
 * Updates bound arrow positions when their target shapes are transformed
 * (moved, resized, rotated). This maintains the visual connection between
 * arrows and shapes during editing operations.
 *
 * @module whiteboard/core/binding-updates
 */

import type { ShapeElement, ArrowElement, WhiteboardElement, Heading } from '../types/document';
import { createArrowPoints } from '../types/document';
import { calculateBoundEndpoint, isArrowElement } from './binding';
import { routeElbowArrow } from './elbow-routing';
import { getExitHeading, getEntryHeading } from './heading';

// =============================================================================
// Types
// =============================================================================

/** Information about an arrow bound to a specific shape */
export interface BoundArrowInfo {
	/** The arrow element */
	arrow: ArrowElement;
	/** Which end of the arrow is bound to the shape */
	boundAt: 'start' | 'end';
}

/** Result of updating bound arrows */
export interface UpdateResult {
	/** Updated arrow elements with new positions */
	updatedArrows: ArrowElement[];
	/** IDs of elements that were modified */
	updatedElementIds: string[];
}

// =============================================================================
// Finding Bound Arrows
// =============================================================================

/**
 * Finds all arrows that are bound to a specific shape.
 *
 * @param shapeId - ID of the shape to find bindings for
 * @param elements - All elements to search through
 * @returns Array of bound arrow information
 */
export function getBoundArrows(
	shapeId: string,
	elements: readonly WhiteboardElement[]
): BoundArrowInfo[] {
	const boundArrows: BoundArrowInfo[] = [];

	for (const element of elements) {
		if (!isArrowElement(element)) continue;

		const arrow = element as ArrowElement;

		// Check start binding
		if (arrow.startBinding?.elementId === shapeId) {
			boundArrows.push({
				arrow,
				boundAt: 'start'
			});
		}

		// Check end binding
		if (arrow.endBinding?.elementId === shapeId) {
			boundArrows.push({
				arrow,
				boundAt: 'end'
			});
		}
	}

	return boundArrows;
}

// =============================================================================
// Updating Bound Arrows
// =============================================================================

/**
 * Updates arrow endpoints for all arrows bound to the specified shapes.
 * Called after shapes are transformed (moved, resized, rotated).
 *
 * @param shapeIds - IDs of shapes that were transformed
 * @param elements - Current state of all elements (with updated shapes)
 * @returns Updated arrows and their IDs
 */
export function updateBoundArrowsForShapes(
	shapeIds: string[],
	elements: readonly WhiteboardElement[]
): UpdateResult {
	if (shapeIds.length === 0) {
		return { updatedArrows: [], updatedElementIds: [] };
	}

	// Build a map of shape ID to shape element for quick lookup
	const shapeMap = new Map<string, ShapeElement>();
	for (const element of elements) {
		if (element.type === 'shape' && shapeIds.includes(element.id)) {
			shapeMap.set(element.id, element as ShapeElement);
		}
	}

	// Track which arrows need to be updated
	const arrowUpdates = new Map<string, ArrowElement>();

	// Process each shape
	for (const shapeId of shapeIds) {
		const targetShape = shapeMap.get(shapeId);
		if (!targetShape) continue; // Shape was deleted

		// Find all arrows bound to this shape
		const boundArrows = getBoundArrows(shapeId, elements);

		for (const { arrow, boundAt } of boundArrows) {
			// Get the current arrow state (may have been partially updated already)
			const currentArrow = arrowUpdates.get(arrow.id) ?? arrow;

			// Calculate the new endpoint position
			const otherEndpoint = boundAt === 'start' ? currentArrow.end : currentArrow.start;
			const binding = boundAt === 'start' ? arrow.startBinding! : arrow.endBinding!;
			const newPosition = calculateBoundEndpoint(binding, targetShape, otherEndpoint);

			// Create updated arrow with new endpoint
			let updatedArrow: ArrowElement = {
				...currentArrow,
				[boundAt === 'start' ? 'start' : 'end']: newPosition
			};

			// For elbow arrows, recalculate the entire path
			const effectiveArrowType =
				currentArrow.arrowType ?? (currentArrow.elbowed ? 'elbow' : 'sharp');
			if (effectiveArrowType === 'elbow') {
				const newStart = boundAt === 'start' ? newPosition : updatedArrow.start;
				const newEnd = boundAt === 'end' ? newPosition : updatedArrow.end;

				// Calculate headings from shapes
				let startHeading: Heading | null = currentArrow.startHeading ?? null;
				let endHeading: Heading | null = currentArrow.endHeading ?? null;

				// Update heading if bound at that end
				if (boundAt === 'start') {
					startHeading = getExitHeading(targetShape, newEnd);
				}
				if (boundAt === 'end') {
					endHeading = getEntryHeading(targetShape, newStart);
				}

				// Get IDs to exclude from obstacle checking
				const routeExcludeIds = new Set<string>([arrow.id]);
				if (currentArrow.startBinding) routeExcludeIds.add(currentArrow.startBinding.elementId);
				if (currentArrow.endBinding) routeExcludeIds.add(currentArrow.endBinding.elementId);

				// Route the elbow arrow
				const routeResult = routeElbowArrow(
					newStart,
					newEnd,
					startHeading,
					endHeading,
					elements,
					routeExcludeIds
				);

				updatedArrow = {
					...updatedArrow,
					start: newStart,
					end: newEnd,
					points: routeResult.points,
					startHeading,
					endHeading
				};
			} else {
				// For non-elbow arrows, update points array to match new endpoints
				const newStart = boundAt === 'start' ? newPosition : updatedArrow.start;
				const newEnd = boundAt === 'end' ? newPosition : updatedArrow.end;

				// Preserve intermediate points for curved arrows
				const intermediatePoints =
					currentArrow.points && currentArrow.points.length > 2
						? currentArrow.points.slice(1, -1)
						: [];

				updatedArrow = {
					...updatedArrow,
					start: newStart,
					end: newEnd,
					points: createArrowPoints(newStart, newEnd, intermediatePoints)
				};
			}

			arrowUpdates.set(arrow.id, updatedArrow);
		}
	}

	const updatedArrows = Array.from(arrowUpdates.values());
	const updatedElementIds = updatedArrows.map((a) => a.id);

	return { updatedArrows, updatedElementIds };
}

// =============================================================================
// Clearing Bindings for Deleted Shapes
// =============================================================================

/**
 * Clears bindings from arrows that point to deleted shapes.
 * Called when shapes are being removed to maintain data integrity.
 *
 * @param deletedShapeIds - IDs of shapes being deleted
 * @param elements - Current state of all elements (before deletion)
 * @returns Updated arrows with bindings cleared and their IDs
 */
export function clearBindingsForDeletedShapes(
	deletedShapeIds: string[],
	elements: readonly WhiteboardElement[]
): UpdateResult {
	if (deletedShapeIds.length === 0) {
		return { updatedArrows: [], updatedElementIds: [] };
	}

	const deletedIdSet = new Set(deletedShapeIds);
	const arrowUpdates = new Map<string, ArrowElement>();

	for (const element of elements) {
		if (!isArrowElement(element)) continue;

		const arrow = element as ArrowElement;
		let needsUpdate = false;
		let updatedArrow = arrow;

		// Check if start binding points to a deleted shape
		if (arrow.startBinding && deletedIdSet.has(arrow.startBinding.elementId)) {
			updatedArrow = {
				...updatedArrow,
				startBinding: null
			};
			needsUpdate = true;
		}

		// Check if end binding points to a deleted shape
		if (arrow.endBinding && deletedIdSet.has(arrow.endBinding.elementId)) {
			updatedArrow = {
				...updatedArrow,
				endBinding: null
			};
			needsUpdate = true;
		}

		if (needsUpdate) {
			arrowUpdates.set(arrow.id, updatedArrow);
		}
	}

	const updatedArrows = Array.from(arrowUpdates.values());
	const updatedElementIds = updatedArrows.map((a) => a.id);

	return { updatedArrows, updatedElementIds };
}
