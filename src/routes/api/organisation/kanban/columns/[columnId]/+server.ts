/**
 * API Route: /api/organisation/kanban/columns/[columnId]
 *
 * PATCH  — rename a column and/or change its position. (board owner only)
 * DELETE — remove a column (cascade cards). (board owner only)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { parseKanbanId, updateColumnSchema } from '$lib/server/validation/kanban';
import { assertBoardOwner, getColumnBoardId } from '$lib/server/kanban';
import type { KanbanColumn, KanbanColumnUpdate } from '$lib/types/database-helpers';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireAuth(locals);
	const columnId = parseKanbanId(params.columnId, 'colonne');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	const parsed = updateColumnSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	// Resolve parent board to verify ownership.
	const boardId = await getColumnBoardId(locals.supabase, columnId);
	if (!boardId) {
		throw error(404, 'Colonne introuvable');
	}
	await assertBoardOwner(locals.supabase, boardId, user.id);

	const updatePayload: KanbanColumnUpdate = {};
	if (parsed.data.title !== undefined) updatePayload.title = parsed.data.title;
	if (parsed.data.position !== undefined) updatePayload.position = parsed.data.position;

	const { data, error: dbError } = await locals.supabase
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.from('kanban_columns' as any)
		.update(updatePayload)
		.eq('id', columnId)
		.select()
		.single();

	if (dbError || !data) {
		console.error('[kanban] update column failed:', dbError);
		throw error(500, 'Erreur lors de la mise à jour de la colonne');
	}

	return json({ column: data as KanbanColumn });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireAuth(locals);
	const columnId = parseKanbanId(params.columnId, 'colonne');

	const boardId = await getColumnBoardId(locals.supabase, columnId);
	if (!boardId) {
		throw error(404, 'Colonne introuvable');
	}
	await assertBoardOwner(locals.supabase, boardId, user.id);

	const { error: dbError } = await locals.supabase
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.from('kanban_columns' as any)
		.delete()
		.eq('id', columnId);

	if (dbError) {
		console.error('[kanban] delete column failed:', dbError);
		throw error(500, 'Erreur lors de la suppression de la colonne');
	}

	return json({ success: true });
};
