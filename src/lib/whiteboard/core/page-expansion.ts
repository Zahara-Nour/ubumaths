/**
 * Page Expansion Module
 *
 * Handles automatic page expansion when drawing near edges.
 * Maintains aspect ratio and provides scaling for export.
 *
 * @module whiteboard/core/page-expansion
 */

import type { Page, Point } from '../types/document';
import {
	MAX_EXPANSION_FACTOR,
	EXPANSION_MARGIN,
	EDGE_DETECTION_THRESHOLD
} from '../types/document';

// =============================================================================
// Types
// =============================================================================

export interface ExpansionResult {
	/** Whether expansion is needed */
	needsExpansion: boolean;
	/** New width (same as current if no expansion) */
	newWidth: number;
	/** New height (same as current if no expansion) */
	newHeight: number;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Check if a page has been expanded from its original size
 */
export function isPageExpanded(page: Page): boolean {
	return page.originalWidth !== undefined && page.originalHeight !== undefined;
}

/**
 * Expand page by a given delta amount (for pan-based expansion)
 * Maintains aspect ratio and respects MAX_EXPANSION_FACTOR limit
 *
 * @param page - Current page
 * @param deltaX - Amount to expand horizontally (in page pixels)
 * @param deltaY - Amount to expand vertically (in page pixels)
 * @returns New dimensions or null if at max expansion
 */
export function expandPageByDelta(
	page: Page,
	deltaX: number,
	deltaY: number
): { width: number; height: number } | null {
	const originalWidth = page.originalWidth ?? page.width;
	const originalHeight = page.originalHeight ?? page.height;
	const maxWidth = originalWidth * MAX_EXPANSION_FACTOR;
	const maxHeight = originalHeight * MAX_EXPANSION_FACTOR;

	// Check if already at max
	if (page.width >= maxWidth && page.height >= maxHeight) {
		return null;
	}

	// Calculate target dimensions
	let targetWidth = page.width + Math.max(0, deltaX);
	let targetHeight = page.height + Math.max(0, deltaY);

	// Maintain aspect ratio: use the larger expansion factor
	const widthFactor = targetWidth / originalWidth;
	const heightFactor = targetHeight / originalHeight;
	const expansionFactor = Math.max(widthFactor, heightFactor);

	// Apply factor to both dimensions
	targetWidth = originalWidth * expansionFactor;
	targetHeight = originalHeight * expansionFactor;

	// Cap at max
	if (targetWidth > maxWidth || targetHeight > maxHeight) {
		targetWidth = maxWidth;
		targetHeight = maxHeight;
	}

	// Round
	targetWidth = Math.round(targetWidth);
	targetHeight = Math.round(targetHeight);

	// Check if actually expanded
	if (targetWidth <= page.width && targetHeight <= page.height) {
		return null;
	}

	return { width: targetWidth, height: targetHeight };
}

/**
 * Get the original dimensions of a page (before any expansion)
 */
export function getOriginalDimensions(page: Page): { width: number; height: number } {
	return {
		width: page.originalWidth ?? page.width,
		height: page.originalHeight ?? page.height
	};
}

/**
 * Calculate the expansion factor (current size / original size)
 */
export function getExpansionFactor(page: Page): number {
	if (!isPageExpanded(page)) return 1;
	const original = getOriginalDimensions(page);
	// Use the larger ratio to get the expansion factor
	return Math.max(page.width / original.width, page.height / original.height);
}

/**
 * Get the scale factor needed to fit expanded content back to original size
 * Used for PDF export to scale content down to fit original page format
 */
export function getExportScaleFactor(page: Page): number {
	if (!isPageExpanded(page)) return 1;
	const factor = getExpansionFactor(page);
	return 1 / factor;
}

/**
 * Calculate page expansion based on a point position
 *
 * @param page - Current page
 * @param point - Point being drawn (cursor position)
 * @param margin - Extra margin to add beyond the point (default: EXPANSION_MARGIN)
 * @returns ExpansionResult with whether expansion is needed and new dimensions
 */
export function calculatePageExpansion(
	page: Page,
	point: Point,
	margin: number = EXPANSION_MARGIN
): ExpansionResult {
	const originalWidth = page.originalWidth ?? page.width;
	const originalHeight = page.originalHeight ?? page.height;
	const aspectRatio = originalWidth / originalHeight;
	const maxWidth = originalWidth * MAX_EXPANSION_FACTOR;
	const maxHeight = originalHeight * MAX_EXPANSION_FACTOR;

	let newWidth = page.width;
	let newHeight = page.height;
	let needsExpansion = false;

	// Check if point is near right edge
	const distanceFromRight = page.width - point.x;
	if (distanceFromRight < EDGE_DETECTION_THRESHOLD && point.x > 0) {
		const targetWidth = Math.min(point.x + margin, maxWidth);
		if (targetWidth > newWidth) {
			newWidth = targetWidth;
			needsExpansion = true;
		}
	}

	// Check if point is near bottom edge
	const distanceFromBottom = page.height - point.y;
	if (distanceFromBottom < EDGE_DETECTION_THRESHOLD && point.y > 0) {
		const targetHeight = Math.min(point.y + margin, maxHeight);
		if (targetHeight > newHeight) {
			newHeight = targetHeight;
			needsExpansion = true;
		}
	}

	if (!needsExpansion) {
		return { needsExpansion: false, newWidth: page.width, newHeight: page.height };
	}

	// Maintain aspect ratio: expand both dimensions proportionally
	const widthFactor = newWidth / originalWidth;
	const heightFactor = newHeight / originalHeight;
	const expansionFactor = Math.max(widthFactor, heightFactor);

	// Apply expansion factor to both dimensions (capped at max)
	newWidth = Math.min(originalWidth * expansionFactor, maxWidth);
	newHeight = Math.min(originalHeight * expansionFactor, maxHeight);

	// Ensure aspect ratio is maintained after capping
	if (newWidth / newHeight > aspectRatio) {
		newWidth = newHeight * aspectRatio;
	} else if (newWidth / newHeight < aspectRatio) {
		newHeight = newWidth / aspectRatio;
	}

	// Round to avoid floating point issues
	newWidth = Math.round(newWidth);
	newHeight = Math.round(newHeight);

	return { needsExpansion: true, newWidth, newHeight };
}

/**
 * Check if a point is near the edge of the page (for UI feedback)
 */
export function isNearPageEdge(
	page: Page,
	point: Point
): { nearRight: boolean; nearBottom: boolean } {
	return {
		nearRight: page.width - point.x < EDGE_DETECTION_THRESHOLD && point.x > 0,
		nearBottom: page.height - point.y < EDGE_DETECTION_THRESHOLD && point.y > 0
	};
}

/**
 * Reset page to its original dimensions (for use in undo or manual reset)
 */
export function getResetDimensions(page: Page): { width: number; height: number } | null {
	if (!isPageExpanded(page)) return null;
	return getOriginalDimensions(page);
}

/**
 * Create an expanded version of a page
 */
export function createExpandedPage(page: Page, newWidth: number, newHeight: number): Page {
	return {
		...page,
		width: newWidth,
		height: newHeight,
		originalWidth: page.originalWidth ?? page.width,
		originalHeight: page.originalHeight ?? page.height
	};
}

/**
 * Create a reset (original size) version of a page
 */
export function createResetPage(page: Page): Page {
	if (!isPageExpanded(page)) return page;

	const { width, height } = getOriginalDimensions(page);
	const { originalWidth: _ow, originalHeight: _oh, ...rest } = page;

	return {
		...rest,
		width,
		height
	};
}
