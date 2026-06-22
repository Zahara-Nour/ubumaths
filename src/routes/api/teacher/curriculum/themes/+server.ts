/**
 * API — Curriculum thèmes (level 1).
 *
 * GET  /api/teacher/curriculum/themes?grade=6   — list themes for a grade
 * POST /api/teacher/curriculum/themes           — create a theme
 *
 * Teacher/admin only (RLS also enforces is_teacher_or_admin()).
 * Spec: docs/wip/suivi-programme-progress.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { createThemeSchema, themeListQuerySchema } from '$lib/server/validation/curriculum';
import { curriculumDbError, THEME_COLS } from '$lib/server/curriculum';
import type { CurriculumTheme } from '$lib/types/database-helpers';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = themeListQuerySchema.safeParse({ grade: url.searchParams.get('grade') });
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_themes')
		.select(THEME_COLS)
		.eq('grade', parsed.data.grade)
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });

	if (dbErr) {
		console.error('[curriculum] themes GET failed:', dbErr);
		return json({ error: 'Échec du chargement des thèmes' }, { status: 500 });
	}

	return json({ themes: (data ?? []) as CurriculumTheme[] });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = createThemeSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_themes')
		.insert({
			grade: parsed.data.grade,
			name: parsed.data.name,
			display_order: parsed.data.display_order ?? 0
		})
		.select(THEME_COLS)
		.single();

	if (dbErr) {
		const mapped = curriculumDbError(dbErr, 'Un thème de ce nom existe déjà pour ce niveau');
		if (mapped) return mapped;
		console.error('[curriculum] themes POST failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ theme: data as CurriculumTheme }, { status: 201 });
};
