/**
 * Tests for Whiteboard Store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { whiteboardStore } from '../stores/whiteboard.svelte';
import { PAGE_FORMATS, createEmptyDocument } from '../types/document';
import { serialize } from '../core/serialization';

describe('Whiteboard Store', () => {
	beforeEach(() => {
		// Reset store state before each test
		whiteboardStore.createNew();
		whiteboardStore.clearAutosave();
	});

	afterEach(() => {
		whiteboardStore.destroy();
	});

	describe('initialization', () => {
		it('creates a new document with default title', () => {
			whiteboardStore.createNew();
			expect(whiteboardStore.document).not.toBeNull();
			expect(whiteboardStore.document?.title).toBe('Sans titre');
		});

		it('creates a new document with custom title', () => {
			whiteboardStore.createNew('Mon cours');
			expect(whiteboardStore.document?.title).toBe('Mon cours');
		});

		it('creates a new document with A4 format by default', () => {
			whiteboardStore.createNew();
			expect(whiteboardStore.currentPage?.width).toBe(PAGE_FORMATS.A4.width);
			expect(whiteboardStore.currentPage?.height).toBe(PAGE_FORMATS.A4.height);
		});

		it('creates a new document with custom format', () => {
			whiteboardStore.createNew('Test', 'WIDESCREEN_16_9');
			expect(whiteboardStore.currentPage?.width).toBe(PAGE_FORMATS.WIDESCREEN_16_9.width);
			expect(whiteboardStore.currentPage?.height).toBe(PAGE_FORMATS.WIDESCREEN_16_9.height);
		});

		it('initializes with pen tool selected', () => {
			expect(whiteboardStore.currentTool).toBe('pen');
		});

		it('initializes with no unsaved changes', () => {
			whiteboardStore.createNew();
			expect(whiteboardStore.hasUnsavedChanges).toBe(false);
		});
	});

	describe('document operations', () => {
		it('updates document title', () => {
			whiteboardStore.createNew();
			whiteboardStore.setTitle('Nouveau titre');
			expect(whiteboardStore.document?.title).toBe('Nouveau titre');
		});

		it('marks document as having unsaved changes after modification', () => {
			whiteboardStore.createNew();
			whiteboardStore.setTitle('Modified');
			expect(whiteboardStore.hasUnsavedChanges).toBe(true);
		});

		it('updates updatedAt timestamp on modification', () => {
			whiteboardStore.createNew();
			const originalUpdatedAt = whiteboardStore.document?.updatedAt;

			// Wait a tiny bit to ensure different timestamp
			vi.useFakeTimers();
			vi.advanceTimersByTime(1000);

			whiteboardStore.setTitle('Modified');

			vi.useRealTimers();

			expect(whiteboardStore.document?.updatedAt).not.toBe(originalUpdatedAt);
		});

		it('marks document as saved', () => {
			whiteboardStore.createNew();
			whiteboardStore.setTitle('Modified');
			expect(whiteboardStore.hasUnsavedChanges).toBe(true);

			whiteboardStore.markAsSaved();
			expect(whiteboardStore.hasUnsavedChanges).toBe(false);
		});
	});

	describe('page operations', () => {
		it('starts with one page', () => {
			whiteboardStore.createNew();
			expect(whiteboardStore.pageCount).toBe(1);
		});

		it('adds a new page', () => {
			whiteboardStore.createNew();
			whiteboardStore.addPage();
			expect(whiteboardStore.pageCount).toBe(2);
		});

		it('navigates to new page after adding', () => {
			whiteboardStore.createNew();
			whiteboardStore.addPage();
			expect(whiteboardStore.document?.currentPageIndex).toBe(1);
		});

		it('deletes a page', () => {
			whiteboardStore.createNew();
			whiteboardStore.addPage();
			whiteboardStore.addPage();
			expect(whiteboardStore.pageCount).toBe(3);

			whiteboardStore.deletePage(1);
			expect(whiteboardStore.pageCount).toBe(2);
		});

		it('cannot delete the last page', () => {
			whiteboardStore.createNew();
			whiteboardStore.deletePage(0);
			expect(whiteboardStore.pageCount).toBe(1);
		});

		it('adjusts currentPageIndex when deleting current page', () => {
			whiteboardStore.createNew();
			whiteboardStore.addPage();
			whiteboardStore.addPage();
			whiteboardStore.goToPage(2);

			whiteboardStore.deletePage(2);
			expect(whiteboardStore.document?.currentPageIndex).toBe(1);
		});

		it('navigates to specific page', () => {
			whiteboardStore.createNew();
			whiteboardStore.addPage();
			whiteboardStore.addPage();

			whiteboardStore.goToPage(1);
			expect(whiteboardStore.document?.currentPageIndex).toBe(1);
		});

		it('ignores invalid page navigation', () => {
			whiteboardStore.createNew();
			whiteboardStore.goToPage(99);
			expect(whiteboardStore.document?.currentPageIndex).toBe(0);

			whiteboardStore.goToPage(-1);
			expect(whiteboardStore.document?.currentPageIndex).toBe(0);
		});

		it('navigates to next page', () => {
			whiteboardStore.createNew();
			whiteboardStore.addPage();

			whiteboardStore.goToPage(0);
			whiteboardStore.nextPage();
			expect(whiteboardStore.document?.currentPageIndex).toBe(1);
		});

		it('navigates to previous page', () => {
			whiteboardStore.createNew();
			whiteboardStore.addPage();

			whiteboardStore.goToPage(1);
			whiteboardStore.previousPage();
			expect(whiteboardStore.document?.currentPageIndex).toBe(0);
		});
	});

	describe('element operations', () => {
		it('adds an element to current page', () => {
			whiteboardStore.createNew();

			const element = {
				id: crypto.randomUUID(),
				type: 'stroke' as const,
				toolType: 'pen' as const,
				points: [{ x: 0, y: 0 }],
				color: '#000000',
				width: 2,
				opacity: 1
			};

			whiteboardStore.addElement(element);
			expect(whiteboardStore.currentPage?.elements).toHaveLength(1);
			expect(whiteboardStore.currentPage?.elements[0].id).toBe(element.id);
		});

		it('removes an element by ID', () => {
			whiteboardStore.createNew();

			const element = {
				id: crypto.randomUUID(),
				type: 'stroke' as const,
				toolType: 'pen' as const,
				points: [{ x: 0, y: 0 }],
				color: '#000000',
				width: 2,
				opacity: 1
			};

			whiteboardStore.addElement(element);
			whiteboardStore.removeElement(element.id);
			expect(whiteboardStore.currentPage?.elements).toHaveLength(0);
		});

		it('clears all elements from current page', () => {
			whiteboardStore.createNew();

			whiteboardStore.addElement({
				id: crypto.randomUUID(),
				type: 'stroke' as const,
				toolType: 'pen' as const,
				points: [{ x: 0, y: 0 }],
				color: '#000000',
				width: 2,
				opacity: 1
			});

			whiteboardStore.addElement({
				id: crypto.randomUUID(),
				type: 'stroke' as const,
				toolType: 'pen' as const,
				points: [{ x: 10, y: 10 }],
				color: '#ff0000',
				width: 2,
				opacity: 1
			});

			expect(whiteboardStore.currentPage?.elements).toHaveLength(2);

			whiteboardStore.clearPage();
			expect(whiteboardStore.currentPage?.elements).toHaveLength(0);
		});
	});

	describe('tool operations', () => {
		it('changes current tool', () => {
			whiteboardStore.setTool('highlighter');
			expect(whiteboardStore.currentTool).toBe('highlighter');
		});

		it('updates tool settings', () => {
			whiteboardStore.setToolSettings('pen', { color: '#ff0000', width: 5 });
			expect(whiteboardStore.toolSettings.pen.color).toBe('#ff0000');
			expect(whiteboardStore.toolSettings.pen.width).toBe(5);
		});

		it('gets current tool settings for drawing tools', () => {
			whiteboardStore.setTool('pen');
			whiteboardStore.setToolSettings('pen', { color: '#00ff00' });

			const settings = whiteboardStore.getCurrentToolSettings();
			expect(settings?.color).toBe('#00ff00');
		});

		it('returns null for non-drawing tools', () => {
			whiteboardStore.setTool('select');
			const settings = whiteboardStore.getCurrentToolSettings();
			expect(settings).toBeNull();
		});
	});

	describe('undo/redo', () => {
		it('starts with canUndo false', () => {
			whiteboardStore.createNew();
			expect(whiteboardStore.canUndo).toBe(false);
		});

		it('starts with canRedo false', () => {
			whiteboardStore.createNew();
			expect(whiteboardStore.canRedo).toBe(false);
		});

		it('enables undo after modification', () => {
			whiteboardStore.createNew();
			whiteboardStore.setTitle('Modified');
			expect(whiteboardStore.canUndo).toBe(true);
		});

		it('undoes title change', () => {
			whiteboardStore.createNew('Original');
			whiteboardStore.setTitle('Modified');

			whiteboardStore.undo();
			expect(whiteboardStore.document?.title).toBe('Original');
		});

		it('enables redo after undo', () => {
			whiteboardStore.createNew();
			whiteboardStore.setTitle('Modified');
			whiteboardStore.undo();

			expect(whiteboardStore.canRedo).toBe(true);
		});

		it('redoes undone change', () => {
			whiteboardStore.createNew();
			whiteboardStore.setTitle('Modified');
			whiteboardStore.undo();
			whiteboardStore.redo();

			expect(whiteboardStore.document?.title).toBe('Modified');
		});

		it('undoes element additions', () => {
			whiteboardStore.createNew();

			whiteboardStore.addElement({
				id: crypto.randomUUID(),
				type: 'stroke' as const,
				toolType: 'pen' as const,
				points: [{ x: 0, y: 0 }],
				color: '#000000',
				width: 2,
				opacity: 1
			});

			expect(whiteboardStore.currentPage?.elements).toHaveLength(1);

			whiteboardStore.undo();
			expect(whiteboardStore.currentPage?.elements).toHaveLength(0);
		});
	});

	describe('load/save', () => {
		it('loads document from JSON', () => {
			const doc = createEmptyDocument('Loaded Document');
			const json = serialize(doc);

			const result = whiteboardStore.loadFromJson(json);
			expect(result.success).toBe(true);
			expect(whiteboardStore.document?.title).toBe('Loaded Document');
		});

		it('returns error for invalid JSON', () => {
			const result = whiteboardStore.loadFromJson('invalid json');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('resets unsaved changes after load', () => {
			whiteboardStore.createNew();
			whiteboardStore.setTitle('Modified');
			expect(whiteboardStore.hasUnsavedChanges).toBe(true);

			const doc = createEmptyDocument();
			whiteboardStore.loadFromJson(serialize(doc));
			expect(whiteboardStore.hasUnsavedChanges).toBe(false);
		});
	});

	describe('z-order operations', () => {
		// Helper to create test elements
		function createTestElement(id: string) {
			return {
				id,
				type: 'stroke' as const,
				toolType: 'pen' as const,
				points: [{ x: 0, y: 0 }],
				color: '#000000',
				width: 2,
				opacity: 1
			};
		}

		function getElementIds() {
			return whiteboardStore.currentPage?.elements.map((e) => e.id) ?? [];
		}

		beforeEach(() => {
			whiteboardStore.createNew();
			// Add 4 elements: A, B, C, D (D is on top)
			whiteboardStore.addElement(createTestElement('A'));
			whiteboardStore.addElement(createTestElement('B'));
			whiteboardStore.addElement(createTestElement('C'));
			whiteboardStore.addElement(createTestElement('D'));
		});

		describe('bringToFront', () => {
			it('moves single element to end of array (top)', () => {
				whiteboardStore.bringToFront(['A']);
				expect(getElementIds()).toEqual(['B', 'C', 'D', 'A']);
			});

			it('moves multiple elements to end, preserving relative order', () => {
				whiteboardStore.bringToFront(['A', 'C']);
				expect(getElementIds()).toEqual(['B', 'D', 'A', 'C']);
			});

			it('does nothing if element already at top', () => {
				whiteboardStore.bringToFront(['D']);
				expect(getElementIds()).toEqual(['A', 'B', 'C', 'D']);
			});

			it('ignores non-existent element IDs', () => {
				whiteboardStore.bringToFront(['nonexistent']);
				expect(getElementIds()).toEqual(['A', 'B', 'C', 'D']);
			});
		});

		describe('sendToBack', () => {
			it('moves single element to beginning of array (bottom)', () => {
				whiteboardStore.sendToBack(['D']);
				expect(getElementIds()).toEqual(['D', 'A', 'B', 'C']);
			});

			it('moves multiple elements to beginning, preserving relative order', () => {
				whiteboardStore.sendToBack(['B', 'D']);
				expect(getElementIds()).toEqual(['B', 'D', 'A', 'C']);
			});

			it('does nothing if element already at bottom', () => {
				whiteboardStore.sendToBack(['A']);
				expect(getElementIds()).toEqual(['A', 'B', 'C', 'D']);
			});

			it('ignores non-existent element IDs', () => {
				whiteboardStore.sendToBack(['nonexistent']);
				expect(getElementIds()).toEqual(['A', 'B', 'C', 'D']);
			});
		});

		describe('bringForward', () => {
			it('moves single element one position up', () => {
				whiteboardStore.bringForward(['B']);
				expect(getElementIds()).toEqual(['A', 'C', 'B', 'D']);
			});

			it('does nothing if element already at top', () => {
				whiteboardStore.bringForward(['D']);
				expect(getElementIds()).toEqual(['A', 'B', 'C', 'D']);
			});

			it('moves adjacent selected elements together as a group', () => {
				// A and B are adjacent, so they move together past C
				whiteboardStore.bringForward(['A', 'B']);
				expect(getElementIds()).toEqual(['C', 'A', 'B', 'D']);
			});

			it('ignores non-existent element IDs', () => {
				whiteboardStore.bringForward(['nonexistent']);
				expect(getElementIds()).toEqual(['A', 'B', 'C', 'D']);
			});
		});

		describe('sendBackward', () => {
			it('moves single element one position down', () => {
				whiteboardStore.sendBackward(['C']);
				expect(getElementIds()).toEqual(['A', 'C', 'B', 'D']);
			});

			it('does nothing if element already at bottom', () => {
				whiteboardStore.sendBackward(['A']);
				expect(getElementIds()).toEqual(['A', 'B', 'C', 'D']);
			});

			it('moves multiple elements one position down each', () => {
				whiteboardStore.sendBackward(['C', 'D']);
				expect(getElementIds()).toEqual(['A', 'C', 'D', 'B']);
			});

			it('ignores non-existent element IDs', () => {
				whiteboardStore.sendBackward(['nonexistent']);
				expect(getElementIds()).toEqual(['A', 'B', 'C', 'D']);
			});
		});
	});
});
