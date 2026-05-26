/**
 * API Route: /api/organisation/kanban/boards/[boardId]/columns
 *
 * POST — create a new column inside a board. Only the board owner can manage
 *        columns (RLS enforces this, we also check ahead of time for clean
 *        403 responses).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { parseKanbanId, createColumnSchema } from '$lib/server/validation/kanban';
import { assertBoardOwner } from '$lib/server/kanban';
import type { KanbanColumn, KanbanColumnInsert } from '$lib/types/database-helpers';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireAuth(locals);
	const boardId = parseKanbanId(params.boardId, 'tableau');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	const parsed = createColumnSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	// Only the board owner can add columns. Doing this check at the API level
	// gives us a deterministic 403 rather than relying on RLS to mask the row.
	await assertBoardOwner(locals.supabase, boardId, user.id);

	const insertPayload: KanbanColumnInsert = {
		board_id: boardId,
		title: parsed.data.title,
		position: parsed.data.position
	};

	const { data, error: dbError } = await locals.supabase
		.from('kanban_columns')
		.insert(insertPayload)
		.select()
		.single();

	if (dbError || !data) {
		console.error('[kanban] create column failed:', dbError);
		throw error(500, 'Erreur lors de la création de la colonne');
	}

	return json({ column: data as KanbanColumn }, { status: 201 });
};
