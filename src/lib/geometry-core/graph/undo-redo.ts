/**
 * Undo/redo system based on delta recording.
 *
 * Tracks element additions, removals, and updates within transactions.
 * Deltas are invertible, enabling undo/redo by replaying or inverting them.
 */

import type { GeoElement } from '../types/elements';
import type { GeoPoint } from '../types/primitives';

export interface Delta {
	added: Map<string, GeoElement>;
	removed: Map<string, GeoElement>;
	updated: Map<string, { before: GeoElement; after: GeoElement }>;
	/** Positions of elements at the time they were removed (for undo of remove). */
	removedPositions: Map<string, GeoPoint>;
}

export function createEmptyDelta(): Delta {
	return {
		added: new Map(),
		removed: new Map(),
		updated: new Map(),
		removedPositions: new Map()
	};
}

export function invertDelta(delta: Delta): Delta {
	return {
		added: delta.removed,
		removed: delta.added,
		updated: new Map(
			[...delta.updated].map(([id, { before, after }]) => [id, { before: after, after: before }])
		),
		removedPositions: new Map(delta.removedPositions)
	};
}

export class UndoManager {
	private undoStack: Delta[] = [];
	private redoStack: Delta[] = [];
	private currentTransaction: Delta | null = null;

	get canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	beginTransaction(): void {
		if (this.currentTransaction) {
			throw new Error('beginTransaction: a transaction is already in progress');
		}
		this.currentTransaction = createEmptyDelta();
	}

	commit(): void {
		if (!this.currentTransaction) {
			throw new Error('commit: no transaction in progress');
		}
		const delta = this.currentTransaction;
		this.currentTransaction = null;
		if (delta.added.size > 0 || delta.removed.size > 0 || delta.updated.size > 0) {
			this.undoStack.push(delta);
			this.redoStack.length = 0;
		}
	}

	discard(): void {
		this.currentTransaction = null;
	}

	/** Undo the last transaction. Calls applyFn with the inverted delta. */
	undo(applyFn: (delta: Delta) => void): void {
		const delta = this.undoStack.pop();
		if (!delta) return;
		applyFn(invertDelta(delta));
		this.redoStack.push(delta);
	}

	/** Redo the last undone transaction. Calls applyFn with the delta. */
	redo(applyFn: (delta: Delta) => void): void {
		const delta = this.redoStack.pop();
		if (!delta) return;
		applyFn(delta);
		this.undoStack.push(delta);
	}

	// ─── Recording ──────────────────────────────────────────────────

	recordAdd(id: string, element: GeoElement): void {
		if (!this.currentTransaction) return;
		this.currentTransaction.added.set(id, element);
	}

	recordRemove(id: string, element: GeoElement, position: GeoPoint | undefined): void {
		if (!this.currentTransaction) return;
		if (this.currentTransaction.added.has(id)) {
			this.currentTransaction.added.delete(id);
			return;
		}
		this.currentTransaction.removed.set(id, element);
		if (position) {
			this.currentTransaction.removedPositions.set(id, position);
		}
	}

	recordUpdate(id: string, before: GeoElement, after: GeoElement): void {
		if (!this.currentTransaction) return;
		const existing = this.currentTransaction.updated.get(id);
		this.currentTransaction.updated.set(id, {
			before: existing?.before ?? before,
			after
		});
	}
}
