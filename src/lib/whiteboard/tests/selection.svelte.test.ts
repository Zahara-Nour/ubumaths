/**
 * Tests for Selection State
 *
 * Tests selection management: selecting elements, clearing selection,
 * deleting selected elements, and auto-clear on page change
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { whiteboardStore } from '../stores/whiteboard.svelte';
import type { WhiteboardElement } from '../types/document';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a test stroke element
 */
function createTestStroke(id: string): WhiteboardElement {
	return {
		id,
		type: 'stroke',
		toolType: 'pen',
		points: [
			{ x: 0, y: 0 },
			{ x: 100, y: 100 }
		],
		color: '#000000',
		width: 2,
		opacity: 1
	};
}

/**
 * Create a test text block element
 */
function createTestTextBlock(id: string): WhiteboardElement {
	return {
		id,
		type: 'textblock',
		position: { x: 50, y: 50 },
		width: 300,
		height: 100,
		markdownContent: 'Test content'
	};
}

// =============================================================================
// Tests: Selection State
// =============================================================================

describe('Selection State', () => {
	beforeEach(() => {
		whiteboardStore.createNew();
		whiteboardStore.clearAutosave();
	});

	afterEach(() => {
		whiteboardStore.destroy();
	});

	describe('initial state', () => {
		it('starts with empty selection', () => {
			expect(whiteboardStore.selectedIds.size).toBe(0);
		});

		it('hasSelection is false when nothing selected', () => {
			expect(whiteboardStore.hasSelection).toBe(false);
		});

		it('selectedElements returns empty array when nothing selected', () => {
			expect(whiteboardStore.selectedElements).toEqual([]);
		});
	});

	describe('selectElement', () => {
		it('selects a single element', () => {
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);

			whiteboardStore.selectElement('stroke-1');

			expect(whiteboardStore.selectedIds.size).toBe(1);
			expect(whiteboardStore.selectedIds.has('stroke-1')).toBe(true);
		});

		it('hasSelection is true after selecting', () => {
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);

			whiteboardStore.selectElement('stroke-1');

			expect(whiteboardStore.hasSelection).toBe(true);
		});

		it('clears previous selection when selecting without addToSelection', () => {
			const element1 = createTestStroke('stroke-1');
			const element2 = createTestStroke('stroke-2');
			whiteboardStore.addElement(element1);
			whiteboardStore.addElement(element2);

			whiteboardStore.selectElement('stroke-1');
			whiteboardStore.selectElement('stroke-2');

			expect(whiteboardStore.selectedIds.size).toBe(1);
			expect(whiteboardStore.selectedIds.has('stroke-2')).toBe(true);
			expect(whiteboardStore.selectedIds.has('stroke-1')).toBe(false);
		});

		it('adds to selection when addToSelection is true', () => {
			const element1 = createTestStroke('stroke-1');
			const element2 = createTestStroke('stroke-2');
			whiteboardStore.addElement(element1);
			whiteboardStore.addElement(element2);

			whiteboardStore.selectElement('stroke-1');
			whiteboardStore.selectElement('stroke-2', true);

			expect(whiteboardStore.selectedIds.size).toBe(2);
			expect(whiteboardStore.selectedIds.has('stroke-1')).toBe(true);
			expect(whiteboardStore.selectedIds.has('stroke-2')).toBe(true);
		});

		it('can select multiple elements with addToSelection', () => {
			const element1 = createTestStroke('stroke-1');
			const element2 = createTestTextBlock('textblock-1');
			const element3 = createTestStroke('stroke-2');
			whiteboardStore.addElement(element1);
			whiteboardStore.addElement(element2);
			whiteboardStore.addElement(element3);

			whiteboardStore.selectElement('stroke-1');
			whiteboardStore.selectElement('textblock-1', true);
			whiteboardStore.selectElement('stroke-2', true);

			expect(whiteboardStore.selectedIds.size).toBe(3);
		});
	});

	describe('selectedElements', () => {
		it('returns the full element objects for selected IDs', () => {
			const element1 = createTestStroke('stroke-1');
			const element2 = createTestTextBlock('textblock-1');
			whiteboardStore.addElement(element1);
			whiteboardStore.addElement(element2);

			whiteboardStore.selectElement('stroke-1');
			whiteboardStore.selectElement('textblock-1', true);

			const selected = whiteboardStore.selectedElements;
			expect(selected).toHaveLength(2);
			expect(selected.find((e) => e.id === 'stroke-1')).toBeDefined();
			expect(selected.find((e) => e.id === 'textblock-1')).toBeDefined();
		});

		it('filters out IDs that no longer exist on the page', () => {
			const element1 = createTestStroke('stroke-1');
			const element2 = createTestStroke('stroke-2');
			whiteboardStore.addElement(element1);
			whiteboardStore.addElement(element2);

			whiteboardStore.selectElement('stroke-1');
			whiteboardStore.selectElement('stroke-2', true);

			// Remove one element
			whiteboardStore.removeElement('stroke-1');

			const selected = whiteboardStore.selectedElements;
			expect(selected).toHaveLength(1);
			expect(selected[0].id).toBe('stroke-2');
		});
	});

	describe('clearSelection', () => {
		it('clears all selected elements', () => {
			const element1 = createTestStroke('stroke-1');
			const element2 = createTestStroke('stroke-2');
			whiteboardStore.addElement(element1);
			whiteboardStore.addElement(element2);

			whiteboardStore.selectElement('stroke-1');
			whiteboardStore.selectElement('stroke-2', true);

			whiteboardStore.clearSelection();

			expect(whiteboardStore.selectedIds.size).toBe(0);
			expect(whiteboardStore.hasSelection).toBe(false);
		});

		it('works when nothing is selected', () => {
			whiteboardStore.clearSelection();
			expect(whiteboardStore.selectedIds.size).toBe(0);
		});
	});

	describe('deleteSelected', () => {
		it('deletes all selected elements from the page', () => {
			const element1 = createTestStroke('stroke-1');
			const element2 = createTestStroke('stroke-2');
			const element3 = createTestTextBlock('textblock-1');
			whiteboardStore.addElement(element1);
			whiteboardStore.addElement(element2);
			whiteboardStore.addElement(element3);

			whiteboardStore.selectElement('stroke-1');
			whiteboardStore.selectElement('stroke-2', true);

			whiteboardStore.deleteSelected();

			expect(whiteboardStore.currentPage?.elements).toHaveLength(1);
			expect(whiteboardStore.currentPage?.elements[0].id).toBe('textblock-1');
		});

		it('clears selection after deleting', () => {
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);

			whiteboardStore.selectElement('stroke-1');
			whiteboardStore.deleteSelected();

			expect(whiteboardStore.selectedIds.size).toBe(0);
			expect(whiteboardStore.hasSelection).toBe(false);
		});

		it('does nothing when nothing is selected', () => {
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);

			whiteboardStore.deleteSelected();

			expect(whiteboardStore.currentPage?.elements).toHaveLength(1);
		});

		it('supports undo after deleting selected', () => {
			const element1 = createTestStroke('stroke-1');
			const element2 = createTestStroke('stroke-2');
			whiteboardStore.addElement(element1);
			whiteboardStore.addElement(element2);

			whiteboardStore.selectElement('stroke-1');
			whiteboardStore.selectElement('stroke-2', true);
			whiteboardStore.deleteSelected();

			expect(whiteboardStore.currentPage?.elements).toHaveLength(0);

			whiteboardStore.undo();

			expect(whiteboardStore.currentPage?.elements).toHaveLength(2);
		});
	});

	describe('auto-clear on page change', () => {
		beforeEach(() => {
			// Create a document with 3 pages
			whiteboardStore.createNew();
			whiteboardStore.addPage();
			whiteboardStore.addPage();
			whiteboardStore.goToPage(0);
		});

		it('clears selection when using goToPage', () => {
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);
			whiteboardStore.selectElement('stroke-1');

			expect(whiteboardStore.hasSelection).toBe(true);

			whiteboardStore.goToPage(1);

			expect(whiteboardStore.hasSelection).toBe(false);
			expect(whiteboardStore.selectedIds.size).toBe(0);
		});

		it('clears selection when using nextPage', () => {
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);
			whiteboardStore.selectElement('stroke-1');

			expect(whiteboardStore.hasSelection).toBe(true);

			whiteboardStore.nextPage();

			expect(whiteboardStore.hasSelection).toBe(false);
		});

		it('clears selection when using previousPage', () => {
			whiteboardStore.goToPage(1);
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);
			whiteboardStore.selectElement('stroke-1');

			expect(whiteboardStore.hasSelection).toBe(true);

			whiteboardStore.previousPage();

			expect(whiteboardStore.hasSelection).toBe(false);
		});

		it('does not clear selection when staying on same page', () => {
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);
			whiteboardStore.selectElement('stroke-1');

			// Try to go to invalid page
			whiteboardStore.goToPage(99);

			expect(whiteboardStore.hasSelection).toBe(true);
		});

		it('does not clear selection when nextPage has no effect', () => {
			whiteboardStore.goToPage(2); // Last page
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);
			whiteboardStore.selectElement('stroke-1');

			whiteboardStore.nextPage(); // Should have no effect

			expect(whiteboardStore.hasSelection).toBe(true);
		});

		it('does not clear selection when previousPage has no effect', () => {
			whiteboardStore.goToPage(0); // First page
			const element = createTestStroke('stroke-1');
			whiteboardStore.addElement(element);
			whiteboardStore.selectElement('stroke-1');

			whiteboardStore.previousPage(); // Should have no effect

			expect(whiteboardStore.hasSelection).toBe(true);
		});
	});
});
