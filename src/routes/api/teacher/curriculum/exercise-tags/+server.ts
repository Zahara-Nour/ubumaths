/**
 * API — Exercise ↔ curriculum point tagging.
 *
 * GET    /api/teacher/curriculum/exercise-tags?exercise_id=<uuid>  — points tagged on an exercise
 * POST   /api/teacher/curriculum/exercise-tags                     — tag (exercise_id, point_id)
 * DELETE /api/teacher/curriculum/exercise-tags?exercise_id=&point_id=  — untag
 *
 * Tagging an exercise drives auto coverage when the exercise is referenced
 * in a cahier de texte entry. Teacher/admin only.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { exerciseTagSchema, exerciseTagListQuerySchema } from '$lib/server/validation/curriculum';
import { curriculumDbError } from '$lib/server/curriculum';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = exerciseTagListQuerySchema.safeParse({
		exercise_id: url.searchParams.get('exercise_id')
	});
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('exercise_curriculum_points')
		.select('exercise_id, point_id, created_at')
		.eq('exercise_id', parsed.data.exercise_id);

	if (dbErr) {
		console.error('[curriculum] exercise-tags GET failed:', dbErr);
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

	const parsed = exerciseTagSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { error: dbErr } = await locals.supabase
		.from('exercise_curriculum_points')
		.insert({ exercise_id: parsed.data.exercise_id, point_id: parsed.data.point_id });

	if (dbErr) {
		// 23505 = already tagged → idempotent success
		if (dbErr.code === '23505') {
			return json({ success: true, alreadyTagged: true });
		}
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] exercise-tags POST failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ success: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = exerciseTagSchema.safeParse({
		exercise_id: url.searchParams.get('exercise_id'),
		point_id: url.searchParams.get('point_id')
	});
	if (!parsed.success) {
		return json({ error: 'exercise_id et point_id requis (UUID)' }, { status: 400 });
	}

	const { error: dbErr } = await locals.supabase
		.from('exercise_curriculum_points')
		.delete()
		.eq('exercise_id', parsed.data.exercise_id)
		.eq('point_id', parsed.data.point_id);

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] exercise-tags DELETE failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ success: true });
};
