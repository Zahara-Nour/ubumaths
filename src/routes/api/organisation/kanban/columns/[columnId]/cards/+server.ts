/**
 * API Route: /api/organisation/kanban/columns/[columnId]/cards
 *
 * POST — create a card inside a column. Anyone with access to the parent
 *        board can create cards (RLS enforces; we double-check existence so
 *        we return 404 instead of letting the INSERT fail silently).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { parseKanbanId, createCardSchema } from '$lib/server/validation/kanban';
import { getColumnBoardId } from '$lib/server/kanban';
import type { KanbanCard, KanbanCardInsert } from '$lib/types/database-helpers';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	await requireAuth(locals);
	const columnId = parseKanbanId(params.columnId, 'colonne');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	const parsed = createCardSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	// Verify the column exists AND its board is accessible to the user.
	// `getColumnBoardId` honours RLS via `can_access_kanban_column`, which
	// transitively requires board access — so a non-null boardId is proof
	// enough that the user can write to this column (no second SELECT needed).
	const boardId = await getColumnBoardId(locals.supabase, columnId);
	if (!boardId) {
		throw error(404, 'Colonne introuvable');
	}

	const insertPayload: KanbanCardInsert = {
		column_id: columnId,
		title: parsed.data.title,
		description: parsed.data.description ?? null,
		position: parsed.data.position
	};

	const { data, error: dbError } = await locals.supabase
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.from('kanban_cards' as any)
		.insert(insertPayload)
		.select()
		.single();

	if (dbError || !data) {
		console.error('[kanban] create card failed:', dbError);
		throw error(500, 'Erreur lors de la création de la carte');
	}

	return json({ card: data as KanbanCard }, { status: 201 });
};
