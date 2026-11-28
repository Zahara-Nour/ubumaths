/**
 * API Route: /api/organisation/kanban/boards/[boardId]
 *
 * GET    — full board content (columns + cards, sorted by position).
 * PATCH  — rename the board (owner only).
 * DELETE — remove the board (owner only). Cascades to columns + cards.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { parseKanbanId, updateBoardSchema } from '#lib/server/validation/kanban.ts';
import { assertBoardOwner, getBoardWithContent } from '#lib/server/kanban.ts';
import type { KanbanBoard } from '#lib/types/database-helpers.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/organisation/kanban/boards/[boardId]/+server');

export const GET: RequestHandler = async ({ locals, params }) => {
	await requireAuth(locals);
	const boardId = parseKanbanId(params.boardId, 'tableau');

	const board = await getBoardWithContent(locals.supabase, boardId);
	if (!board) {
		throw error(404, 'Tableau introuvable');
	}

	return Response.json({ board });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireAuth(locals);
	const boardId = parseKanbanId(params.boardId, 'tableau');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	const parsed = updateBoardSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	// Defensive ownership check (RLS would also enforce this).
	await assertBoardOwner(locals.supabase, boardId, user.id);

	const { data, error: dbError } = await locals.supabase
		.from('kanban_boards')
		.update({ title: parsed.data.title })
		.eq('id', boardId)
		.select()
		.single();

	if (dbError || !data) {
		logger.error('[kanban] update board failed:', dbError);
		throw error(500, 'Erreur lors de la mise à jour du tableau');
	}

	return Response.json({ board: data as KanbanBoard });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireAuth(locals);
	const boardId = parseKanbanId(params.boardId, 'tableau');

	const board = await assertBoardOwner(locals.supabase, boardId, user.id);

	logger.info('[kanban] board deleted', {
		boardId,
		userId: user.id,
		classId: board.class_id,
		title: board.title
	});

	const { error: dbError } = await locals.supabase.from('kanban_boards').delete().eq('id', boardId);

	if (dbError) {
		logger.error('[kanban] delete board failed:', dbError);
		throw error(500, 'Erreur lors de la suppression du tableau');
	}

	return Response.json({ success: true });
};
