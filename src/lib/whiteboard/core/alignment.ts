/**
 * Alignment Module
 *
 * Provides alignment and distribution functions for multiple selected elements.
 *
 * @module whiteboard/core/alignment
 */

import { getElementBounds, type BoundingBox } from './hit-testing';
import type { WhiteboardElement, ArrowElement } from '../types/document';

// =============================================================================
// Types
// =============================================================================

/** Horizontal alignment options */
export type HorizontalAlignment = 'left' | 'center' | 'right';

/** Vertical alignment options */
export type VerticalAlignment = 'top' | 'center' | 'bottom';

/** Result of an alignment operation */
export interface AlignmentResult {
	/** Elements with updated positions */
	updatedElements: WhiteboardElement[];
	/** IDs of elements that were modified */
	modifiedIds: string[];
}

// =============================================================================
// Alignment Functions
// =============================================================================

/**
 * Align elements horizontally.
 *
 * @param elements - Elements to align
 * @param alignment - Alignment type: 'left', 'center', or 'right'
 * @returns Updated elements with new positions
 */
export function alignHorizontal(
	elements: readonly WhiteboardElement[],
	alignment: HorizontalAlignment
): AlignmentResult {
	if (elements.length < 2) {
		return { updatedElements: [], modifiedIds: [] };
	}

	// Calculate bounds for all elements
	const boundsMap = new Map<string, BoundingBox>();
	let minX = Infinity;
	let maxX = -Infinity;
	let totalCenterX = 0;

	for (const element of elements) {
		const bounds = getElementBounds(element);
		boundsMap.set(element.id, bounds);

		minX = Math.min(minX, bounds.x);
		maxX = Math.max(maxX, bounds.x + bounds.width);
		totalCenterX += bounds.x + bounds.width / 2;
	}

	// Calculate target position based on alignment type
	let targetX: number;
	switch (alignment) {
		case 'left':
			targetX = minX;
			break;
		case 'right':
			targetX = maxX;
			break;
		case 'center':
			targetX = totalCenterX / elements.length;
			break;
	}

	// Apply alignment
	const updatedElements: WhiteboardElement[] = [];
	const modifiedIds: string[] = [];

	for (const element of elements) {
		const bounds = boundsMap.get(element.id)!;
		let newX: number;

		switch (alignment) {
			case 'left':
				newX = targetX;
				break;
			case 'right':
				newX = targetX - bounds.width;
				break;
			case 'center':
				newX = targetX - bounds.width / 2;
				break;
		}

		// Only update if position changed
		const dx = newX - bounds.x;
		if (Math.abs(dx) > 0.01) {
			const updated = moveElement(element, dx, 0);
			updatedElements.push(updated);
			modifiedIds.push(element.id);
		}
	}

	return { updatedElements, modifiedIds };
}

/**
 * Align elements vertically.
 *
 * @param elements - Elements to align
 * @param alignment - Alignment type: 'top', 'center', or 'bottom'
 * @returns Updated elements with new positions
 */
export function alignVertical(
	elements: readonly WhiteboardElement[],
	alignment: VerticalAlignment
): AlignmentResult {
	if (elements.length < 2) {
		return { updatedElements: [], modifiedIds: [] };
	}

	// Calculate bounds for all elements
	const boundsMap = new Map<string, BoundingBox>();
	let minY = Infinity;
	let maxY = -Infinity;
	let totalCenterY = 0;

	for (const element of elements) {
		const bounds = getElementBounds(element);
		boundsMap.set(element.id, bounds);

		minY = Math.min(minY, bounds.y);
		maxY = Math.max(maxY, bounds.y + bounds.height);
		totalCenterY += bounds.y + bounds.height / 2;
	}

	// Calculate target position based on alignment type
	let targetY: number;
	switch (alignment) {
		case 'top':
			targetY = minY;
			break;
		case 'bottom':
			targetY = maxY;
			break;
		case 'center':
			targetY = totalCenterY / elements.length;
			break;
	}

	// Apply alignment
	const updatedElements: WhiteboardElement[] = [];
	const modifiedIds: string[] = [];

	for (const element of elements) {
		const bounds = boundsMap.get(element.id)!;
		let newY: number;

		switch (alignment) {
			case 'top':
				newY = targetY;
				break;
			case 'bottom':
				newY = targetY - bounds.height;
				break;
			case 'center':
				newY = targetY - bounds.height / 2;
				break;
		}

		// Only update if position changed
		const dy = newY - bounds.y;
		if (Math.abs(dy) > 0.01) {
			const updated = moveElement(element, 0, dy);
			updatedElements.push(updated);
			modifiedIds.push(element.id);
		}
	}

	return { updatedElements, modifiedIds };
}

// =============================================================================
// Distribution Functions
// =============================================================================

/**
 * Distribute elements horizontally with equal spacing.
 *
 * @param elements - Elements to distribute (minimum 3 for meaningful distribution)
 * @returns Updated elements with new positions
 */
export function distributeHorizontal(elements: readonly WhiteboardElement[]): AlignmentResult {
	if (elements.length < 3) {
		return { updatedElements: [], modifiedIds: [] };
	}

	// Calculate bounds and sort by X position
	const elementsWithBounds = elements.map((el) => ({
		element: el,
		bounds: getElementBounds(el)
	}));

	elementsWithBounds.sort((a, b) => a.bounds.x - b.bounds.x);

	// Calculate total space and element widths
	const first = elementsWithBounds[0];
	const last = elementsWithBounds[elementsWithBounds.length - 1];

	const totalSpan = last.bounds.x + last.bounds.width - first.bounds.x;
	const totalElementWidth = elementsWithBounds.reduce((sum, e) => sum + e.bounds.width, 0);
	const totalGap = totalSpan - totalElementWidth;
	const gapBetween = totalGap / (elements.length - 1);

	// Apply distribution
	const updatedElements: WhiteboardElement[] = [];
	const modifiedIds: string[] = [];

	let currentX = first.bounds.x;

	for (const { element, bounds } of elementsWithBounds) {
		const dx = currentX - bounds.x;

		if (Math.abs(dx) > 0.01) {
			const updated = moveElement(element, dx, 0);
			updatedElements.push(updated);
			modifiedIds.push(element.id);
		}

		currentX += bounds.width + gapBetween;
	}

	return { updatedElements, modifiedIds };
}

/**
 * Distribute elements vertically with equal spacing.
 *
 * @param elements - Elements to distribute (minimum 3 for meaningful distribution)
 * @returns Updated elements with new positions
 */
export function distributeVertical(elements: readonly WhiteboardElement[]): AlignmentResult {
	if (elements.length < 3) {
		return { updatedElements: [], modifiedIds: [] };
	}

	// Calculate bounds and sort by Y position
	const elementsWithBounds = elements.map((el) => ({
		element: el,
		bounds: getElementBounds(el)
	}));

	elementsWithBounds.sort((a, b) => a.bounds.y - b.bounds.y);

	// Calculate total space and element heights
	const first = elementsWithBounds[0];
	const last = elementsWithBounds[elementsWithBounds.length - 1];

	const totalSpan = last.bounds.y + last.bounds.height - first.bounds.y;
	const totalElementHeight = elementsWithBounds.reduce((sum, e) => sum + e.bounds.height, 0);
	const totalGap = totalSpan - totalElementHeight;
	const gapBetween = totalGap / (elements.length - 1);

	// Apply distribution
	const updatedElements: WhiteboardElement[] = [];
	const modifiedIds: string[] = [];

	let currentY = first.bounds.y;

	for (const { element, bounds } of elementsWithBounds) {
		const dy = currentY - bounds.y;

		if (Math.abs(dy) > 0.01) {
			const updated = moveElement(element, 0, dy);
			updatedElements.push(updated);
			modifiedIds.push(element.id);
		}

		currentY += bounds.height + gapBetween;
	}

	return { updatedElements, modifiedIds };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Move an element by dx, dy.
 * Handles different element types appropriately.
 */
function moveElement(element: WhiteboardElement, dx: number, dy: number): WhiteboardElement {
	switch (element.type) {
		case 'shape': {
			const shape = element;
			// Handle arrow shapes with points array
			if (shape.shapeType === 'arrow') {
				const arrow = shape as ArrowElement;
				if (arrow.points) {
					return {
						...arrow,
						start: { x: arrow.start.x + dx, y: arrow.start.y + dy },
						end: { x: arrow.end.x + dx, y: arrow.end.y + dy },
						points: arrow.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
					} as ArrowElement;
				}
			}
			// Handle shapes with start/end (line, rectangle, circle, triangle, etc.)
			if ('start' in shape && 'end' in shape && shape.start && shape.end) {
				return {
					...shape,
					start: { x: shape.start.x + dx, y: shape.start.y + dy },
					end: { x: shape.end.x + dx, y: shape.end.y + dy }
				};
			}
			// All shapes should have start/end, return unchanged if not
			return element;
		}

		case 'stroke': {
			return {
				...element,
				points: element.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }))
			};
		}

		case 'textblock': {
			return {
				...element,
				position: { x: element.position.x + dx, y: element.position.y + dy }
			};
		}

		case 'image': {
			return {
				...element,
				position: { x: element.position.x + dx, y: element.position.y + dy }
			};
		}

		case 'group': {
			return {
				...element,
				children: element.children.map((child) => moveElement(child, dx, dy))
			};
		}

		default:
			return element;
	}
}
