/**
 * Tests for Whiteboard History Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEmptyDocument, type WhiteboardDocument } from '../types/document';
import { createHistoryManager, type HistoryManager } from '../core/history.svelte';

describe('History Manager', () => {
	let initialDoc: WhiteboardDocument;
	let history: HistoryManager;

	beforeEach(() => {
		initialDoc = createEmptyDocument('Test');
		history = createHistoryManager(initialDoc);
	});

	describe('initialization', () => {
		it('initializes with canUndo false', () => {
			expect(history.canUndo).toBe(false);
		});

		it('initializes with canRedo false', () => {
			expect(history.canRedo).toBe(false);
		});

		it('initializes with size 1', () => {
			expect(history.size).toBe(1);
		});
	});

	describe('push', () => {
		it('enables undo after push', () => {
			const newDoc = { ...initialDoc, title: 'Modified' };
			history.push(newDoc);

			expect(history.canUndo).toBe(true);
		});

		it('increases size after push', () => {
			const newDoc = { ...initialDoc, title: 'Modified' };
			history.push(newDoc);

			expect(history.size).toBe(2);
		});

		it('clears redo history after push', () => {
			// Push and undo to create redo history
			history.push({ ...initialDoc, title: 'First' });
			history.undo();
			expect(history.canRedo).toBe(true);

			// Push new state
			history.push({ ...initialDoc, title: 'Second' });
			expect(history.canRedo).toBe(false);
		});
	});

	describe('undo', () => {
		it('returns null when nothing to undo', () => {
			const result = history.undo();
			expect(result).toBeNull();
		});

		it('returns previous state after undo', () => {
			const newDoc = { ...initialDoc, title: 'Modified' };
			history.push(newDoc);
			const result = history.undo();

			expect(result).not.toBeNull();
			expect(result?.title).toBe('Test');
		});

		it('enables redo after undo', () => {
			history.push({ ...initialDoc, title: 'Modified' });
			history.undo();

			expect(history.canRedo).toBe(true);
		});

		it('disables undo when back to initial state', () => {
			history.push({ ...initialDoc, title: 'Modified' });
			history.undo();

			expect(history.canUndo).toBe(false);
		});

		it('can undo multiple times', () => {
			history.push({ ...initialDoc, title: 'First' });
			history.push({ ...initialDoc, title: 'Second' });
			history.push({ ...initialDoc, title: 'Third' });

			expect(history.undo()?.title).toBe('Second');
			expect(history.undo()?.title).toBe('First');
			expect(history.undo()?.title).toBe('Test');
			expect(history.undo()).toBeNull();
		});
	});

	describe('redo', () => {
		it('returns null when nothing to redo', () => {
			const result = history.redo();
			expect(result).toBeNull();
		});

		it('returns next state after redo', () => {
			history.push({ ...initialDoc, title: 'Modified' });
			history.undo();
			const result = history.redo();

			expect(result).not.toBeNull();
			expect(result?.title).toBe('Modified');
		});

		it('disables redo after redo to latest', () => {
			history.push({ ...initialDoc, title: 'Modified' });
			history.undo();
			history.redo();

			expect(history.canRedo).toBe(false);
		});

		it('enables undo after redo', () => {
			history.push({ ...initialDoc, title: 'Modified' });
			history.undo();
			history.redo();

			expect(history.canUndo).toBe(true);
		});

		it('can redo multiple times', () => {
			history.push({ ...initialDoc, title: 'First' });
			history.push({ ...initialDoc, title: 'Second' });
			history.push({ ...initialDoc, title: 'Third' });

			history.undo();
			history.undo();
			history.undo();

			expect(history.redo()?.title).toBe('First');
			expect(history.redo()?.title).toBe('Second');
			expect(history.redo()?.title).toBe('Third');
			expect(history.redo()).toBeNull();
		});
	});

	describe('clear', () => {
		it('clears all history', () => {
			history.push({ ...initialDoc, title: 'First' });
			history.push({ ...initialDoc, title: 'Second' });
			history.undo();

			history.clear();

			expect(history.canUndo).toBe(false);
			expect(history.canRedo).toBe(false);
			expect(history.size).toBe(1);
		});
	});

	describe('max size limit', () => {
		it('respects maximum history size', () => {
			const maxSize = 5;
			const history = createHistoryManager(initialDoc, maxSize);

			// Push more states than max
			for (let i = 0; i < 10; i++) {
				history.push({ ...initialDoc, title: `State ${i}` });
			}

			// Size should be limited (current + max past)
			expect(history.size).toBeLessThanOrEqual(maxSize + 1);
		});

		it('keeps most recent states when exceeding max size', () => {
			const maxSize = 3;
			const history = createHistoryManager(initialDoc, maxSize);

			history.push({ ...initialDoc, title: 'State 1' });
			history.push({ ...initialDoc, title: 'State 2' });
			history.push({ ...initialDoc, title: 'State 3' });
			history.push({ ...initialDoc, title: 'State 4' });
			history.push({ ...initialDoc, title: 'State 5' });

			// Should be able to undo maxSize times
			let undoCount = 0;
			while (history.canUndo) {
				history.undo();
				undoCount++;
			}

			expect(undoCount).toBe(maxSize);
		});

		it('uses default max size of 50', () => {
			const history = createHistoryManager(initialDoc);

			// Push 60 states
			for (let i = 0; i < 60; i++) {
				history.push({ ...initialDoc, title: `State ${i}` });
			}

			// Count undos
			let undoCount = 0;
			while (history.canUndo) {
				history.undo();
				undoCount++;
			}

			expect(undoCount).toBe(50);
		});
	});

	describe('undo/redo sequence', () => {
		it('handles complex undo/redo sequences correctly', () => {
			history.push({ ...initialDoc, title: 'A' });
			history.push({ ...initialDoc, title: 'B' });
			history.push({ ...initialDoc, title: 'C' });

			// Undo twice
			expect(history.undo()?.title).toBe('B');
			expect(history.undo()?.title).toBe('A');

			// Redo once
			expect(history.redo()?.title).toBe('B');

			// Push new state (should clear redo)
			history.push({ ...initialDoc, title: 'D' });

			// Redo should be empty
			expect(history.canRedo).toBe(false);

			// Undo should go back through new history
			expect(history.undo()?.title).toBe('B');
		});
	});
});
