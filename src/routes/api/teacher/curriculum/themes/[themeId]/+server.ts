/**
 * API — Curriculum thème (level 1) — update & delete.
 *
 * PATCH  /api/teacher/curriculum/themes/[themeId]   — rename / reorder
 * DELETE /api/teacher/curriculum/themes/[themeId]   — delete (cascade items/points)
 *
 * Teacher/admin only (RLS also enforces is_teacher_or_admin()).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { updateThemeSchema } from '$lib/server/validation/curriculum';
import { curriculumDbError, THEME_COLS } from '$lib/server/curriculum';
import type { CurriculumTheme } from '$lib/types/database-helpers';
import type { TablesUpdate } from '$lib/types/database';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = updateThemeSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const updates: TablesUpdate<'curriculum_themes'> = {};
	if (parsed.data.name !== undefined) updates.name = parsed.data.name;
	if (parsed.data.display_order !== undefined) updates.display_order = parsed.data.display_order;

	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_themes')
		.update(updates)
		.eq('id', params.themeId)
		.select(THEME_COLS)
		.single();

	if (dbErr) {
		if (dbErr.code === 'PGRST116') {
			return json({ error: 'Thème introuvable' }, { status: 404 });
		}
		const mapped = curriculumDbError(dbErr, 'Un thème de ce nom existe déjà pour ce niveau');
		if (mapped) return mapped;
		console.error('[curriculum] theme PATCH failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ theme: data as CurriculumTheme });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const { error: dbErr } = await locals.supabase
		.from('curriculum_themes')
		.delete()
		.eq('id', params.themeId);

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] theme DELETE failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ success: true });
};
