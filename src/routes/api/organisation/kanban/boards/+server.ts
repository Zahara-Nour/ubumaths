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
import { createBoardSchema } from '$lib/server/validation/kanban';
import { getAccessibleBoards, isClassTeacher } from '$lib/server/kanban';
import type { KanbanBoard, KanbanBoardInsert } from '$lib/types/database-helpers';

export const GET: RequestHandler = async ({ locals }) => {
	await requireAuth(locals);

	const boards = await getAccessibleBoards(locals.supabase);
	return json({ boards });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireAuth(locals);

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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.from('kanban_boards' as any)
		.insert(insertPayload)
		.select()
		.single();

	if (dbError || !data) {
		console.error('[kanban] create board failed:', dbError);
		throw error(500, 'Erreur lors de la création du tableau');
	}

	return json({ board: data as KanbanBoard }, { status: 201 });
};
