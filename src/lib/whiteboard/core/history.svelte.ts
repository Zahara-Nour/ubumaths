/**
 * History Manager for Whiteboard
 *
 * Manages undo/redo state with configurable depth.
 * Uses Svelte 5 runes for reactive state.
 *
 * **Memory Considerations:**
 * - Stores full document snapshots (not deltas)
 * - With default max size (50), memory usage = 50 × document size
 * - Large documents with images/PDFs may require reduced max size
 * - Future: Consider structural sharing for memory-intensive documents
 *
 * @module whiteboard/core/history
 */

import type { WhiteboardDocument } from '../types/document';

/** Maximum number of states to keep in history */
const MAX_HISTORY_SIZE = 50;

/**
 * History manager interface
 */
export interface HistoryManager {
	/** Push a new state to history */
	push(state: WhiteboardDocument): void;
	/** Undo to previous state */
	undo(): WhiteboardDocument | null;
	/** Redo to next state */
	redo(): WhiteboardDocument | null;
	/** Check if undo is available */
	readonly canUndo: boolean;
	/** Check if redo is available */
	readonly canRedo: boolean;
	/** Clear all history */
	clear(): void;
	/** Get current history size */
	readonly size: number;
}

/**
 * Create a new history manager
 *
 * @param initialState - Initial document state
 * @param maxSize - Maximum history size (default: 50)
 */
export function createHistoryManager(
	initialState: WhiteboardDocument,
	maxSize: number = MAX_HISTORY_SIZE
): HistoryManager {
	// Past states (for undo)
	let past = $state<WhiteboardDocument[]>([]);

	// Future states (for redo)
	let future = $state<WhiteboardDocument[]>([]);

	// Current state
	let current = $state<WhiteboardDocument>(initialState);

	const canUndo = $derived(past.length > 0);
	const canRedo = $derived(future.length > 0);
	const size = $derived(past.length + 1 + future.length);

	return {
		push(state: WhiteboardDocument): void {
			// Add current to past
			past = [...past, current].slice(-maxSize);
			// Set new current
			current = state;
			// Clear future (new action invalidates redo)
			future = [];
		},

		undo(): WhiteboardDocument | null {
			if (past.length === 0) return null;

			// Move current to future
			future = [current, ...future];
			// Pop from past
			const previous = past[past.length - 1];
			past = past.slice(0, -1);
			// Set as current
			current = previous;

			return current;
		},

		redo(): WhiteboardDocument | null {
			if (future.length === 0) return null;

			// Move current to past
			past = [...past, current];
			// Pop from future
			const next = future[0];
			future = future.slice(1);
			// Set as current
			current = next;

			return current;
		},

		get canUndo() {
			return canUndo;
		},

		get canRedo() {
			return canRedo;
		},

		get size() {
			return size;
		},

		clear(): void {
			past = [];
			future = [];
		}
	};
}
