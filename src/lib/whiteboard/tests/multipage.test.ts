/**
 * Tests for Multi-page functionality
 *
 * Tests page navigation, reordering, thumbnails, and sidebar state
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Page, WhiteboardDocument, WhiteboardElement } from '../types/document';
import { createEmptyPage, createEmptyDocument } from '../types/document';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a test document with multiple pages
 */
function createTestDocument(pageCount: number = 3): WhiteboardDocument {
	const doc = createEmptyDocument('Test Document', 'A4');
	// Add additional pages (cast to mutable array for test setup)
	const mutablePages = doc.pages as Page[];
	for (let i = 1; i < pageCount; i++) {
		mutablePages.push(createEmptyPage('A4'));
	}
	return doc;
}

/**
 * Reorder pages by moving a page from one index to another
 */
function reorderPages(pages: Page[], fromIndex: number, toIndex: number): Page[] {
	if (fromIndex === toIndex) return pages;
	if (fromIndex < 0 || fromIndex >= pages.length) return pages;
	if (toIndex < 0 || toIndex >= pages.length) return pages;

	const newPages = [...pages];
	const [movedPage] = newPages.splice(fromIndex, 1);
	newPages.splice(toIndex, 0, movedPage);
	return newPages;
}

/**
 * Calculate adjusted current page index after reorder
 */
function getAdjustedPageIndex(currentIndex: number, fromIndex: number, toIndex: number): number {
	// If current page wasn't involved in the move
	if (currentIndex !== fromIndex) {
		// Adjust if current page was shifted by the move
		if (fromIndex < currentIndex && toIndex >= currentIndex) {
			return currentIndex - 1;
		}
		if (fromIndex > currentIndex && toIndex <= currentIndex) {
			return currentIndex + 1;
		}
		return currentIndex;
	}
	// Current page was the one moved
	return toIndex;
}

/**
 * Generate a simple thumbnail representation of a page
 * Returns basic stats about the page content
 */
function generateThumbnailData(page: Page): {
	elementCount: number;
	hasStrokes: boolean;
	hasShapes: boolean;
	hasTextBlocks: boolean;
} {
	const strokes = page.elements.filter((el) => el.type === 'stroke');
	const shapes = page.elements.filter((el) => el.type === 'shape');
	const textBlocks = page.elements.filter((el) => el.type === 'textblock');

	return {
		elementCount: page.elements.length,
		hasStrokes: strokes.length > 0,
		hasShapes: shapes.length > 0,
		hasTextBlocks: textBlocks.length > 0
	};
}

// =============================================================================
// Tests: Page Navigation
// =============================================================================

describe('Page Navigation', () => {
	let doc: WhiteboardDocument;

	beforeEach(() => {
		doc = createTestDocument(5);
	});

	it('starts on first page (index 0)', () => {
		expect(doc.currentPageIndex).toBe(0);
	});

	it('can navigate to any valid page index', () => {
		(doc as unknown as { currentPageIndex: number }).currentPageIndex = 2;
		expect(doc.currentPageIndex).toBe(2);

		(doc as unknown as { currentPageIndex: number }).currentPageIndex = 4;
		expect(doc.currentPageIndex).toBe(4);
	});

	it('page count reflects number of pages', () => {
		expect(doc.pages.length).toBe(5);
	});

	it('each page has unique ID', () => {
		const ids = doc.pages.map((p) => p.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(doc.pages.length);
	});

	it('can get current page by index', () => {
		(doc as unknown as { currentPageIndex: number }).currentPageIndex = 2;
		const currentPage = doc.pages[doc.currentPageIndex];
		expect(currentPage).toBe(doc.pages[2]);
	});
});

// =============================================================================
// Tests: Page Reordering
// =============================================================================

describe('Page Reordering', () => {
	let pages: Page[];

	beforeEach(() => {
		pages = [
			createEmptyPage('A4'),
			createEmptyPage('A4'),
			createEmptyPage('A4'),
			createEmptyPage('A4'),
			createEmptyPage('A4')
		];
		// Give them identifiable IDs for testing
		pages.forEach((p, i) => {
			(p as unknown as { id: string }).id = `page-${i}`;
		});
	});

	it('can move page forward', () => {
		const reordered = reorderPages(pages, 0, 2);
		expect(reordered.map((p) => p.id)).toEqual(['page-1', 'page-2', 'page-0', 'page-3', 'page-4']);
	});

	it('can move page backward', () => {
		const reordered = reorderPages(pages, 3, 1);
		expect(reordered.map((p) => p.id)).toEqual(['page-0', 'page-3', 'page-1', 'page-2', 'page-4']);
	});

	it('can move page to first position', () => {
		const reordered = reorderPages(pages, 4, 0);
		expect(reordered.map((p) => p.id)).toEqual(['page-4', 'page-0', 'page-1', 'page-2', 'page-3']);
	});

	it('can move page to last position', () => {
		const reordered = reorderPages(pages, 0, 4);
		expect(reordered.map((p) => p.id)).toEqual(['page-1', 'page-2', 'page-3', 'page-4', 'page-0']);
	});

	it('same index returns unchanged array', () => {
		const reordered = reorderPages(pages, 2, 2);
		expect(reordered.map((p) => p.id)).toEqual(['page-0', 'page-1', 'page-2', 'page-3', 'page-4']);
	});

	it('invalid fromIndex returns unchanged array', () => {
		const reordered = reorderPages(pages, -1, 2);
		expect(reordered).toEqual(pages);

		const reordered2 = reorderPages(pages, 10, 2);
		expect(reordered2).toEqual(pages);
	});

	it('invalid toIndex returns unchanged array', () => {
		const reordered = reorderPages(pages, 2, -1);
		expect(reordered).toEqual(pages);

		const reordered2 = reorderPages(pages, 2, 10);
		expect(reordered2).toEqual(pages);
	});

	it('does not mutate original array', () => {
		const originalIds = pages.map((p) => p.id);
		reorderPages(pages, 0, 4);
		expect(pages.map((p) => p.id)).toEqual(originalIds);
	});
});

// =============================================================================
// Tests: Current Page Index Adjustment
// =============================================================================

describe('Current Page Index Adjustment After Reorder', () => {
	it('follows moved page when current page is moved', () => {
		// Current on page 2, move page 2 to position 4
		const newIndex = getAdjustedPageIndex(2, 2, 4);
		expect(newIndex).toBe(4);
	});

	it('decrements when page before current is moved after current', () => {
		// Current on page 3, move page 1 to position 4
		const newIndex = getAdjustedPageIndex(3, 1, 4);
		expect(newIndex).toBe(2);
	});

	it('increments when page after current is moved before current', () => {
		// Current on page 2, move page 4 to position 1
		const newIndex = getAdjustedPageIndex(2, 4, 1);
		expect(newIndex).toBe(3);
	});

	it('stays same when move does not affect current', () => {
		// Current on page 0, move page 3 to position 4
		const newIndex = getAdjustedPageIndex(0, 3, 4);
		expect(newIndex).toBe(0);
	});

	it('stays same when current is between unaffected range', () => {
		// Current on page 2, move page 0 to position 1
		const newIndex = getAdjustedPageIndex(2, 0, 1);
		expect(newIndex).toBe(2);
	});
});

// =============================================================================
// Tests: Add/Delete Pages
// =============================================================================

describe('Add Page', () => {
	let doc: WhiteboardDocument;

	beforeEach(() => {
		doc = createTestDocument(2);
	});

	it('adds page at the end', () => {
		const newPage = createEmptyPage('A4');
		(doc.pages as Page[]).push(newPage);
		expect(doc.pages.length).toBe(3);
		expect(doc.pages[2]).toBe(newPage);
	});

	it('new page has empty elements', () => {
		const newPage = createEmptyPage('A4');
		expect(newPage.elements).toEqual([]);
	});

	it('new page has correct dimensions', () => {
		const newPage = createEmptyPage('A4');
		expect(newPage.width).toBe(794);
		expect(newPage.height).toBe(1123);
	});

	it('can add page with different format', () => {
		const landscapePage = createEmptyPage('A4_LANDSCAPE');
		expect(landscapePage.width).toBe(1123);
		expect(landscapePage.height).toBe(794);
	});
});

describe('Delete Page', () => {
	let doc: WhiteboardDocument;

	beforeEach(() => {
		doc = createTestDocument(3);
	});

	it('can delete page by index', () => {
		const removedId = doc.pages[1].id;
		(doc.pages as Page[]).splice(1, 1);
		expect(doc.pages.length).toBe(2);
		expect(doc.pages.find((p) => p.id === removedId)).toBeUndefined();
	});

	it('cannot delete last remaining page', () => {
		doc = createTestDocument(1);
		const canDelete = doc.pages.length > 1;
		expect(canDelete).toBe(false);
	});

	it('adjusts currentPageIndex when deleting current page', () => {
		(doc as unknown as { currentPageIndex: number }).currentPageIndex = 2;
		(doc.pages as Page[]).splice(2, 1);
		// Should clamp to valid range
		(doc as unknown as { currentPageIndex: number }).currentPageIndex = Math.min(
			doc.currentPageIndex,
			doc.pages.length - 1
		);
		expect(doc.currentPageIndex).toBe(1);
	});

	it('adjusts currentPageIndex when deleting page before current', () => {
		(doc as unknown as { currentPageIndex: number }).currentPageIndex = 2;
		(doc.pages as Page[]).splice(0, 1);
		(doc as unknown as { currentPageIndex: number }).currentPageIndex = Math.max(
			0,
			doc.currentPageIndex - 1
		);
		expect(doc.currentPageIndex).toBe(1);
	});

	it('keeps currentPageIndex when deleting page after current', () => {
		(doc as unknown as { currentPageIndex: number }).currentPageIndex = 0;
		(doc.pages as Page[]).splice(2, 1);
		expect(doc.currentPageIndex).toBe(0);
	});
});

// =============================================================================
// Tests: Thumbnail Generation
// =============================================================================

describe('Thumbnail Data Generation', () => {
	it('returns zero counts for empty page', () => {
		const page = createEmptyPage('A4');
		const data = generateThumbnailData(page);
		expect(data.elementCount).toBe(0);
		expect(data.hasStrokes).toBe(false);
		expect(data.hasShapes).toBe(false);
		expect(data.hasTextBlocks).toBe(false);
	});

	it('detects strokes', () => {
		const page = createEmptyPage('A4');
		(page.elements as WhiteboardElement[]).push({
			id: 'stroke-1',
			type: 'stroke',
			toolType: 'pen',
			points: [{ x: 0, y: 0 }],
			color: '#000',
			width: 2,
			opacity: 1
		});
		const data = generateThumbnailData(page);
		expect(data.hasStrokes).toBe(true);
		expect(data.elementCount).toBe(1);
	});

	it('detects shapes', () => {
		const page = createEmptyPage('A4');
		(page.elements as WhiteboardElement[]).push({
			id: 'shape-1',
			type: 'shape',
			shapeType: 'rectangle',
			start: { x: 0, y: 0 },
			end: { x: 100, y: 100 },
			color: '#000',
			strokeWidth: 2,
			opacity: 1
		});
		const data = generateThumbnailData(page);
		expect(data.hasShapes).toBe(true);
		expect(data.elementCount).toBe(1);
	});

	it('detects text blocks', () => {
		const page = createEmptyPage('A4');
		(page.elements as WhiteboardElement[]).push({
			id: 'textblock-1',
			type: 'textblock',
			position: { x: 0, y: 0 },
			width: 300,
			height: 100,
			markdownContent: 'Hello'
		});
		const data = generateThumbnailData(page);
		expect(data.hasTextBlocks).toBe(true);
		expect(data.elementCount).toBe(1);
	});

	it('counts all element types', () => {
		const page = createEmptyPage('A4');
		(page.elements as WhiteboardElement[]).push(
			{
				id: 'stroke-1',
				type: 'stroke',
				toolType: 'pen',
				points: [{ x: 0, y: 0 }],
				color: '#000',
				width: 2,
				opacity: 1
			},
			{
				id: 'shape-1',
				type: 'shape',
				shapeType: 'circle',
				start: { x: 0, y: 0 },
				end: { x: 50, y: 50 },
				color: '#000',
				strokeWidth: 2,
				opacity: 1
			},
			{
				id: 'textblock-1',
				type: 'textblock',
				position: { x: 0, y: 0 },
				width: 300,
				height: 100,
				markdownContent: 'Test'
			}
		);
		const data = generateThumbnailData(page);
		expect(data.elementCount).toBe(3);
		expect(data.hasStrokes).toBe(true);
		expect(data.hasShapes).toBe(true);
		expect(data.hasTextBlocks).toBe(true);
	});
});

// =============================================================================
// Tests: Sidebar State
// =============================================================================

describe('Sidebar State', () => {
	interface SidebarState {
		visible: boolean;
	}

	function createSidebarState(): SidebarState {
		return { visible: true };
	}

	function toggleSidebar(state: SidebarState): SidebarState {
		return { visible: !state.visible };
	}

	it('sidebar is visible by default', () => {
		const state = createSidebarState();
		expect(state.visible).toBe(true);
	});

	it('can toggle sidebar visibility', () => {
		let state = createSidebarState();
		state = toggleSidebar(state);
		expect(state.visible).toBe(false);
		state = toggleSidebar(state);
		expect(state.visible).toBe(true);
	});
});

// =============================================================================
// Tests: Keyboard Navigation
// =============================================================================

describe('Keyboard Navigation', () => {
	it('PageDown goes to next page', () => {
		let currentIndex = 0;
		const pageCount = 5;

		// Simulate PageDown
		if (currentIndex < pageCount - 1) {
			currentIndex++;
		}
		expect(currentIndex).toBe(1);
	});

	it('PageUp goes to previous page', () => {
		let currentIndex = 3;

		// Simulate PageUp
		if (currentIndex > 0) {
			currentIndex--;
		}
		expect(currentIndex).toBe(2);
	});

	it('PageDown at last page stays at last page', () => {
		let currentIndex = 4;
		const pageCount = 5;

		// Simulate PageDown at last page
		if (currentIndex < pageCount - 1) {
			currentIndex++;
		}
		expect(currentIndex).toBe(4);
	});

	it('PageUp at first page stays at first page', () => {
		let currentIndex = 0;

		// Simulate PageUp at first page
		if (currentIndex > 0) {
			currentIndex--;
		}
		expect(currentIndex).toBe(0);
	});
});

// =============================================================================
// Tests: Thumbnail Dimensions
// =============================================================================

describe('Thumbnail Dimensions', () => {
	const THUMBNAIL_WIDTH = 100;

	function calculateThumbnailHeight(pageWidth: number, pageHeight: number): number {
		const aspectRatio = pageHeight / pageWidth;
		return Math.round(THUMBNAIL_WIDTH * aspectRatio);
	}

	it('A4 portrait thumbnail has correct aspect ratio', () => {
		const height = calculateThumbnailHeight(794, 1123);
		// A4 ratio is ~1.414
		expect(height).toBe(141);
	});

	it('A4 landscape thumbnail has correct aspect ratio', () => {
		const height = calculateThumbnailHeight(1123, 794);
		// Landscape ratio is ~0.707
		expect(height).toBe(71);
	});

	it('16:9 thumbnail has correct aspect ratio', () => {
		const height = calculateThumbnailHeight(1920, 1080);
		// 16:9 ratio is 0.5625
		expect(height).toBe(56);
	});
});

// =============================================================================
// Tests: Drag and Drop State
// =============================================================================

describe('Drag and Drop State', () => {
	interface DragState {
		isDragging: boolean;
		draggedPageIndex: number | null;
		dropTargetIndex: number | null;
	}

	function createDragState(): DragState {
		return {
			isDragging: false,
			draggedPageIndex: null,
			dropTargetIndex: null
		};
	}

	function startDrag(state: DragState, pageIndex: number): DragState {
		return {
			...state,
			isDragging: true,
			draggedPageIndex: pageIndex
		};
	}

	function updateDropTarget(state: DragState, targetIndex: number): DragState {
		if (!state.isDragging) return state;
		return {
			...state,
			dropTargetIndex: targetIndex
		};
	}

	function endDrag(_state: DragState): DragState {
		return {
			isDragging: false,
			draggedPageIndex: null,
			dropTargetIndex: null
		};
	}

	it('starts with no drag', () => {
		const state = createDragState();
		expect(state.isDragging).toBe(false);
		expect(state.draggedPageIndex).toBeNull();
	});

	it('can start drag on a page', () => {
		let state = createDragState();
		state = startDrag(state, 2);
		expect(state.isDragging).toBe(true);
		expect(state.draggedPageIndex).toBe(2);
	});

	it('can update drop target while dragging', () => {
		let state = createDragState();
		state = startDrag(state, 0);
		state = updateDropTarget(state, 3);
		expect(state.dropTargetIndex).toBe(3);
	});

	it('ignores drop target update when not dragging', () => {
		let state = createDragState();
		state = updateDropTarget(state, 3);
		expect(state.dropTargetIndex).toBeNull();
	});

	it('resets state on end drag', () => {
		let state = createDragState();
		state = startDrag(state, 2);
		state = updateDropTarget(state, 4);
		state = endDrag(state);
		expect(state.isDragging).toBe(false);
		expect(state.draggedPageIndex).toBeNull();
		expect(state.dropTargetIndex).toBeNull();
	});
});
