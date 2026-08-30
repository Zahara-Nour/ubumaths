/**
 * API — Tagging d'une question (template) à un point de programme.
 *
 * GET    /api/teacher/curriculum/template-tags?template_id=<uuid>       — points tagués
 * POST   /api/teacher/curriculum/template-tags                          — taguer
 * DELETE /api/teacher/curriculum/template-tags?template_id=&point_id=   — détaguer
 *
 * `question_template_points` est le pivot de l'acquisition : une tentative n'a
 * pas de clé étrangère vers un point, elle s'y relie par le template tagué.
 * Sans ligne ici, aucun point ne peut jamais se valider.
 *
 * Calquée sur `exercise-tags`, qui fait la même chose pour les exercices.
 * Teacher/admin only (la RLS applique `is_teacher_or_admin()`).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { templateTagSchema, templateTagListQuerySchema } from '$lib/server/validation/curriculum';
import { curriculumDbError } from '$lib/server/curriculum';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = templateTagListQuerySchema.safeParse({
		template_id: url.searchParams.get('template_id')
	});
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('question_template_points')
		.select('template_id, point_id, created_at')
		.eq('template_id', parsed.data.template_id);

	if (dbErr) {
		console.error('[curriculum] template-tags GET failed:', dbErr);
		return json({ error: 'Échec du chargement des tags' }, { status: 500 });
	}

	return json({ tags: data ?? [] });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = templateTagSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { error: dbErr } = await locals.supabase
		.from('question_template_points')
		.insert({ template_id: parsed.data.template_id, point_id: parsed.data.point_id });

	if (dbErr) {
		// 23505 = déjà tagué. Le prof a recoché une case déjà cochée : ce n'est
		// pas une erreur, c'est le résultat qu'il demande.
		if (dbErr.code === '23505') {
			return json({ success: true, alreadyTagged: true });
		}
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] template-tags POST failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ success: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = templateTagSchema.safeParse({
		template_id: url.searchParams.get('template_id'),
		point_id: url.searchParams.get('point_id')
	});
	if (!parsed.success) {
		return json({ error: 'template_id et point_id requis (UUID)' }, { status: 400 });
	}

	const { error: dbErr } = await locals.supabase
		.from('question_template_points')
		.delete()
		.eq('template_id', parsed.data.template_id)
		.eq('point_id', parsed.data.point_id);

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] template-tags DELETE failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ success: true });
};
