/**
 * Kanban Board Detail - Client API helpers
 * ========================================
 *
 * Thin wrappers around the REST endpoints used by the board detail page.
 *
 * Conventions:
 * - Each function returns the freshly created / updated row, or `null` on
 *   failure. The caller does NOT need to handle errors — a toast is already
 *   surfaced. Returning `null` lets the caller decide whether to rollback
 *   optimistic state.
 * - All bodies are strictly typed via local Patch types to mirror the API's
 *   Zod schemas. Keep these in sync with `src/lib/server/validation/kanban.ts`.
 */

import { toaster } from '$lib/stores/toaster.svelte';
import type {
	KanbanBoard,
	KanbanColumn,
	KanbanCard,
	KanbanTag,
	KanbanTagColor
} from '$lib/types/database-helpers';

// ----------------------------------------------------------------------------
// Patch payload types (mirror Zod schemas)
// ----------------------------------------------------------------------------

export interface ColumnPatch {
	title?: string;
	position?: number;
}

export interface CardPatch {
	title?: string;
	description?: string | null;
	column_id?: string;
	position?: number;
	/** ISO 8601 datetime, null to clear, omitted to leave unchanged. */
	due_date?: string | null;
	/** Full replacement of the card's tag set. Omit to leave unchanged. */
	tag_ids?: string[];
	/** Full replacement of the card's assignee set. Omit to leave unchanged. */
	assignee_ids?: string[];
}

export interface BoardPatch {
	title: string;
}

export interface TagPatch {
	name?: string;
	color?: KanbanTagColor;
}

// ----------------------------------------------------------------------------
// Generic helpers
// ----------------------------------------------------------------------------

/**
 * Extract a French-friendly error message from a non-OK response, falling back
 * to a sensible default. SvelteKit error envelopes carry `message`; some
 * endpoints use `error`. We tolerate both.
 */
async function extractError(res: Response, fallback: string): Promise<string> {
	try {
		const json = (await res.json()) as { message?: unknown; error?: unknown };
		if (typeof json.message === 'string') return json.message;
		if (typeof json.error === 'string') return json.error;
	} catch {
		/* ignore */
	}
	return fallback;
}

// ----------------------------------------------------------------------------
// Board
// ----------------------------------------------------------------------------

export async function updateBoard(boardId: string, patch: BoardPatch): Promise<KanbanBoard | null> {
	try {
		const res = await fetch(`/api/organisation/kanban/boards/${boardId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch)
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la mise à jour du tableau'));
			return null;
		}
		const data = (await res.json()) as { board: KanbanBoard };
		return data.board;
	} catch (err) {
		console.error('[kanban/api] updateBoard failed:', err);
		toaster.error('Erreur réseau lors de la mise à jour du tableau');
		return null;
	}
}

// ----------------------------------------------------------------------------
// Columns
// ----------------------------------------------------------------------------

export async function createColumn(
	boardId: string,
	title: string,
	position: number
): Promise<KanbanColumn | null> {
	try {
		const res = await fetch(`/api/organisation/kanban/boards/${boardId}/columns`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title, position })
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la création de la colonne'));
			return null;
		}
		const data = (await res.json()) as { column: KanbanColumn };
		return data.column;
	} catch (err) {
		console.error('[kanban/api] createColumn failed:', err);
		toaster.error('Erreur réseau lors de la création de la colonne');
		return null;
	}
}

export async function updateColumn(
	columnId: string,
	patch: ColumnPatch
): Promise<KanbanColumn | null> {
	try {
		const res = await fetch(`/api/organisation/kanban/columns/${columnId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch)
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la mise à jour de la colonne'));
			return null;
		}
		const data = (await res.json()) as { column: KanbanColumn };
		return data.column;
	} catch (err) {
		console.error('[kanban/api] updateColumn failed:', err);
		toaster.error('Erreur réseau lors de la mise à jour de la colonne');
		return null;
	}
}

export async function deleteColumn(columnId: string): Promise<boolean> {
	try {
		const res = await fetch(`/api/organisation/kanban/columns/${columnId}`, {
			method: 'DELETE'
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la suppression de la colonne'));
			return false;
		}
		return true;
	} catch (err) {
		console.error('[kanban/api] deleteColumn failed:', err);
		toaster.error('Erreur réseau lors de la suppression de la colonne');
		return false;
	}
}

// ----------------------------------------------------------------------------
// Cards
// ----------------------------------------------------------------------------

export async function createCard(
	columnId: string,
	title: string,
	position: number
): Promise<KanbanCard | null> {
	try {
		const res = await fetch(`/api/organisation/kanban/columns/${columnId}/cards`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title, position })
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la création de la carte'));
			return null;
		}
		const data = (await res.json()) as { card: KanbanCard };
		return data.card;
	} catch (err) {
		console.error('[kanban/api] createCard failed:', err);
		toaster.error('Erreur réseau lors de la création de la carte');
		return null;
	}
}

export async function updateCard(cardId: string, patch: CardPatch): Promise<KanbanCard | null> {
	try {
		const res = await fetch(`/api/organisation/kanban/cards/${cardId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch)
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la mise à jour de la carte'));
			return null;
		}
		const data = (await res.json()) as { card: KanbanCard };
		return data.card;
	} catch (err) {
		console.error('[kanban/api] updateCard failed:', err);
		toaster.error('Erreur réseau lors de la mise à jour de la carte');
		return null;
	}
}

export async function deleteCard(cardId: string): Promise<boolean> {
	try {
		const res = await fetch(`/api/organisation/kanban/cards/${cardId}`, {
			method: 'DELETE'
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la suppression de la carte'));
			return false;
		}
		return true;
	} catch (err) {
		console.error('[kanban/api] deleteCard failed:', err);
		toaster.error('Erreur réseau lors de la suppression de la carte');
		return false;
	}
}

// ----------------------------------------------------------------------------
// Tags (board palette mgmt)
// ----------------------------------------------------------------------------

export async function createTag(
	boardId: string,
	name: string,
	color: KanbanTagColor
): Promise<KanbanTag | null> {
	try {
		const res = await fetch(`/api/organisation/kanban/boards/${boardId}/tags`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, color })
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la création du tag'));
			return null;
		}
		const data = (await res.json()) as { tag: KanbanTag };
		return data.tag;
	} catch (err) {
		console.error('[kanban/api] createTag failed:', err);
		toaster.error('Erreur réseau lors de la création du tag');
		return null;
	}
}

export async function updateTag(tagId: string, patch: TagPatch): Promise<KanbanTag | null> {
	try {
		const res = await fetch(`/api/organisation/kanban/tags/${tagId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch)
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la mise à jour du tag'));
			return null;
		}
		const data = (await res.json()) as { tag: KanbanTag };
		return data.tag;
	} catch (err) {
		console.error('[kanban/api] updateTag failed:', err);
		toaster.error('Erreur réseau lors de la mise à jour du tag');
		return null;
	}
}

export async function deleteTag(tagId: string): Promise<boolean> {
	try {
		const res = await fetch(`/api/organisation/kanban/tags/${tagId}`, {
			method: 'DELETE'
		});
		if (!res.ok) {
			toaster.error(await extractError(res, 'Erreur lors de la suppression du tag'));
			return false;
		}
		return true;
	} catch (err) {
		console.error('[kanban/api] deleteTag failed:', err);
		toaster.error('Erreur réseau lors de la suppression du tag');
		return false;
	}
}
