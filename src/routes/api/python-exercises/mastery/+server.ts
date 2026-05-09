/**
 * API Route: /api/python-exercises/mastery
 *
 * GET — list the caller's mastery rows (or a specific student's, if the caller
 * is allowed by RLS to see them).
 *
 * Authorisation is enforced by RLS on `python_exercise_mastery`:
 *   - students always read their own rows
 *   - teachers read rows of students in their classes (via is_teacher_of_student)
 *   - other callers see nothing
 *
 * Used by the Bloc C dashboard (mastery list across all exercises). For a
 * single-exercise lookup, prefer GET /api/python-exercises/[id]/mastery.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pythonMasteryQuerySchema } from '$lib/server/validation/python-exercises';

type ZodIssue = { path: (string | number)[]; message: string };

export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	const parsed = pythonMasteryQuerySchema.safeParse({
		student_id: url.searchParams.get('student_id') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined
	});
	if (!parsed.success) {
		const msg = parsed.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Paramètres invalides: ${msg}`);
	}

	const { student_id, limit } = parsed.data;
	const targetStudent = student_id ?? user.id;

	const { data, error: dbErr } = await supabase
		.from('python_exercise_mastery')
		.select('exercise_id, status, updated_at')
		.eq('student_id', targetStudent)
		.order('updated_at', { ascending: false })
		.limit(limit);

	if (dbErr) {
		console.error('Failed to read mastery rows:', dbErr);
		throw error(500, 'Erreur lors de la lecture des statuts de maîtrise');
	}

	return json({ mastery: data ?? [] });
};
