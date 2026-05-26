/**
 * API Route: /api/organisation/kanban/boards
 *
 * GET  — list every board the calling user can access (perso + classes where
 *        they are teacher / member), enriched with column / card counts.
 * POST — create a board. Personal by default; pass `class_id` to create a
 *        class board (requires the caller to be the teacher of that class).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { createBoardSchema, listBoardsQuerySchema } from '$lib/server/validation/kanban';
import { getAccessibleBoards, isClassTeacher, rateLimitResponse } from '$lib/server/kanban';
import { checkKanbanBoardCreateRateLimit } from '$lib/server/rateLimiter';
import type { KanbanBoard, KanbanBoardInsert } from '$lib/types/database-helpers';

export const GET: RequestHandler = async ({ locals, url }) => {
	await requireAuth(locals);

	const queryParsed = listBoardsQuerySchema.safeParse({
		limit: url.searchParams.get('limit') ?? undefined,
		cursor: url.searchParams.get('cursor') ?? undefined
	});
	if (!queryParsed.success) {
		throw error(400, queryParsed.error.issues[0].message);
	}

	const page = await getAccessibleBoards(locals.supabase, {
		limit: queryParsed.data.limit,
		cursor: queryParsed.data.cursor ?? null
	});
	return json({ boards: page.boards, nextCursor: page.nextCursor });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireAuth(locals);

	// Rate limit board creation per user — boards are top-level so this only
	// triggers on pathological / scripted abuse.
	const rl = rateLimitResponse(await checkKanbanBoardCreateRateLimit(user.id));
	if (rl) return rl;

	// Parse + validate body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	const parsed = createBoardSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	const { title, class_id } = parsed.data;

	// If a class board is requested, verify the caller is the teacher of that
	// class BEFORE the insert so we can return a clean 403 (RLS would just
	// reject the INSERT with a vague error).
	if (class_id) {
		const allowed = await isClassTeacher(locals.supabase, class_id, user.id);
		if (!allowed) {
			throw error(403, "Seul l'enseignant de cette classe peut créer un tableau pour la classe");
		}
	}

	const insertPayload: KanbanBoardInsert = {
		owner_id: user.id,
		class_id: class_id ?? null,
		title
	};

	const { data, error: dbError } = await locals.supabase
		.from('kanban_boards')
		.insert(insertPayload)
		.select()
		.single();

	if (dbError || !data) {
		console.error('[kanban] create board failed:', dbError);
		throw error(500, 'Erreur lors de la création du tableau');
	}

	return json({ board: data as KanbanBoard }, { status: 201 });
};
