/**
 * API Route: /api/organisation/kanban/tags/[tagId]
 *
 * PATCH  — rename / re-colour a tag. Board owner only.
 * DELETE — remove a tag; the kanban_card_tags FK cascades so every card
 *          carrying this tag silently loses it. Board owner only.
 *
 * Authorisation: we look up the tag's board_id then assertBoardOwner. RLS
 * would block the mutation anyway, but the explicit check returns 403 / 404
 * cleanly instead of a silent 0-rows-affected.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { parseKanbanId, updateTagSchema } from '$lib/server/validation/kanban';
import { assertBoardOwner, rateLimitResponse } from '$lib/server/kanban';
import { checkKanbanColumnMutationRateLimit } from '$lib/server/rateLimiter';
import type { KanbanTag } from '$lib/types/database-helpers';

/**
 * Resolve the board_id of a tag, or null if invisible / missing. Used to
 * locate the owning board before the assertBoardOwner check.
 */
async function getTagBoardId(
	supabase: App.Locals['supabase'],
	tagId: string
): Promise<string | null> {
	const { data, error: dbError } = await supabase
		.from('kanban_tags')
		.select('board_id')
		.eq('id', tagId)
		.maybeSingle();
	if (dbError) {
		console.error('[kanban] getTagBoardId failed:', dbError);
		throw error(500, 'Erreur lors de la lecture du tag');
	}
	return data?.board_id ?? null;
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireAuth(locals);

	const rl = rateLimitResponse(await checkKanbanColumnMutationRateLimit(user.id));
	if (rl) return rl;

	const tagId = parseKanbanId(params.tagId, 'tag');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	const parsed = updateTagSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	const boardId = await getTagBoardId(locals.supabase, tagId);
	if (!boardId) throw error(404, 'Tag introuvable');
	await assertBoardOwner(locals.supabase, boardId, user.id);

	const { data, error: dbError } = await locals.supabase
		.from('kanban_tags')
		.update(parsed.data)
		.eq('id', tagId)
		.select()
		.single();

	if (dbError) {
		if (dbError.code === '23505') {
			throw error(409, 'Un tag avec ce nom existe déjà sur ce tableau');
		}
		console.error('[kanban] update tag failed:', dbError);
		throw error(500, 'Erreur lors de la mise à jour du tag');
	}

	return json({ tag: data as KanbanTag });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireAuth(locals);

	const rl = rateLimitResponse(await checkKanbanColumnMutationRateLimit(user.id));
	if (rl) return rl;

	const tagId = parseKanbanId(params.tagId, 'tag');

	const boardId = await getTagBoardId(locals.supabase, tagId);
	if (!boardId) throw error(404, 'Tag introuvable');
	await assertBoardOwner(locals.supabase, boardId, user.id);

	const { error: dbError } = await locals.supabase.from('kanban_tags').delete().eq('id', tagId);

	if (dbError) {
		console.error('[kanban] delete tag failed:', dbError);
		throw error(500, 'Erreur lors de la suppression du tag');
	}

	return json({ success: true });
};
