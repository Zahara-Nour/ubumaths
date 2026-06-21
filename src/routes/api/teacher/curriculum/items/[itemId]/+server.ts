/**
 * API — Curriculum item (level 2) — update & delete.
 *
 * PATCH  /api/teacher/curriculum/items/[itemId]   — rename / reorder
 * DELETE /api/teacher/curriculum/items/[itemId]   — delete (cascade points)
 *
 * Teacher/admin only (RLS also enforces is_teacher_or_admin()).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { updateItemSchema } from '$lib/server/validation/curriculum';
import { curriculumDbError, ITEM_COLS } from '$lib/server/curriculum';
import type { CurriculumItem } from '$lib/types/database-helpers';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = updateItemSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const updates: Record<string, unknown> = {};
	if (parsed.data.name !== undefined) updates.name = parsed.data.name;
	if (parsed.data.display_order !== undefined) updates.display_order = parsed.data.display_order;

	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_items' as never)
		.update(updates as never)
		.eq('id', params.itemId)
		.select(ITEM_COLS)
		.single();

	if (dbErr) {
		if (dbErr.code === 'PGRST116') {
			return json({ error: 'Item introuvable' }, { status: 404 });
		}
		const mapped = curriculumDbError(dbErr, 'Un item de ce nom existe déjà dans ce thème');
		if (mapped) return mapped;
		console.error('[curriculum] item PATCH failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ item: data as CurriculumItem });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const { error: dbErr } = await locals.supabase
		.from('curriculum_items' as never)
		.delete()
		.eq('id', params.itemId);

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] item DELETE failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ success: true });
};
