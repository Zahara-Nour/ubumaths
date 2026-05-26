/**
 * Kanban Board Detail - Server Load
 * =================================
 *
 * Loads a single board with its columns + cards (sorted by position) for the
 * detail page. Visibility is enforced by RLS; we 404 when the row is invisible
 * or missing. Authorization for mutations is enforced server-side by the API
 * layer — here we only compute `isOwner` so the UI can hide owner-only actions.
 *
 * Defensive note: like the boards list page, if the `kanban_*` tables don't yet
 * exist in the DB (migration not pushed), `getBoardWithContent` will throw 500.
 * We intentionally let that error propagate — there's no usable fallback for a
 * detail view, unlike the list view which can degrade to "no boards".
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { getBoardWithContent } from '$lib/server/kanban';
import { parseKanbanId } from '$lib/server/validation/kanban';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await requireAuth(locals);

	const boardId = parseKanbanId(params.boardId, 'tableau');

	const board = await getBoardWithContent(locals.supabase, boardId);
	if (!board) {
		throw error(404, 'Tableau introuvable');
	}

	return {
		board,
		userId: user.id,
		isOwner: board.owner_id === user.id
	};
};
