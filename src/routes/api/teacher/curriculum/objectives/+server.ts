/**
 * API — Curriculum items (level 2).
 *
 * GET  /api/teacher/curriculum/items?theme_id=<uuid>   — list items of a theme
 * POST /api/teacher/curriculum/items                   — create an item
 *
 * Teacher/admin only (RLS also enforces is_teacher_or_admin()).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { createItemSchema, objectiveListQuerySchema } from '$lib/server/validation/curriculum';
import { curriculumDbError, OBJECTIVE_COLS } from '$lib/server/curriculum';
import type { CurriculumObjective } from '$lib/types/database-helpers';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = objectiveListQuerySchema.safeParse({ theme_id: url.searchParams.get('theme_id') });
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_objectives')
		.select(OBJECTIVE_COLS)
		.eq('theme_id', parsed.data.theme_id)
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });

	if (dbErr) {
		console.error('[curriculum] items GET failed:', dbErr);
		return json({ error: 'Échec du chargement des items' }, { status: 500 });
	}

	return json({ items: (data ?? []) as CurriculumObjective[] });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = createItemSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_objectives')
		.insert({
			theme_id: parsed.data.theme_id,
			name: parsed.data.name,
			display_order: parsed.data.display_order ?? 0
		})
		.select(OBJECTIVE_COLS)
		.single();

	if (dbErr) {
		const mapped = curriculumDbError(dbErr, 'Un item de ce nom existe déjà dans ce thème');
		if (mapped) return mapped;
		console.error('[curriculum] items POST failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ item: data as CurriculumObjective }, { status: 201 });
};
