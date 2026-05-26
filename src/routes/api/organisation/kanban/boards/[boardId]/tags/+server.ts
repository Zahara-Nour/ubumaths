/**
 * API Route: /api/organisation/kanban/boards/[boardId]/tags
 *
 * POST — create a new tag in the board's palette. Board owner only (RLS
 *        enforces; we double-check via assertBoardOwner to surface a clean
 *        403 instead of a silent 0-rows insert).
 *
 * Tag count cap (20 / board) is enforced by a BEFORE INSERT trigger on the
 * DB side; we surface its check_violation error as a 400 with a friendly
 * French message.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { parseKanbanId, createTagSchema } from '$lib/server/validation/kanban';
import { assertBoardOwner, rateLimitResponse } from '$lib/server/kanban';
import { checkKanbanColumnMutationRateLimit } from '$lib/server/rateLimiter';
import type { KanbanTag, KanbanTagInsert } from '$lib/types/database-helpers';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireAuth(locals);

	// Tag mgmt is structural (like columns), so we reuse the column mutation
	// limit. It's well above realistic palette usage.
	const rl = rateLimitResponse(await checkKanbanColumnMutationRateLimit(user.id));
	if (rl) return rl;

	const boardId = parseKanbanId(params.boardId, 'tableau');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	const parsed = createTagSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	await assertBoardOwner(locals.supabase, boardId, user.id);

	const insertPayload: KanbanTagInsert = {
		board_id: boardId,
		name: parsed.data.name,
		color: parsed.data.color
	};

	const { data, error: dbError } = await locals.supabase
		.from('kanban_tags')
		.insert(insertPayload)
		.select()
		.single();

	if (dbError) {
		// 23505 = unique_violation (duplicate name in the board palette)
		if (dbError.code === '23505') {
			throw error(409, 'Un tag avec ce nom existe déjà sur ce tableau');
		}
		// 23514 = check_violation (raised by our 20-tags-per-board trigger)
		if (dbError.code === '23514') {
			throw error(400, 'Limite de 20 tags par tableau atteinte');
		}
		console.error('[kanban] create tag failed:', dbError);
		throw error(500, 'Erreur lors de la création du tag');
	}

	return json({ tag: data as KanbanTag }, { status: 201 });
};
