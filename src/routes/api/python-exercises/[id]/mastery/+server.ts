/**
 * API Route: /api/python-exercises/[id]/mastery
 *
 * GET — return the mastery status of the caller (or a specific student via
 * `?student_id=X`) on this exercise. `null` when no row exists (= the implicit
 * 'not_worked' state).
 *
 * Used by the consultation page to display a single mastery badge without
 * downloading the whole student's mastery list. RLS enforces visibility.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';
import { pythonMasterySingleQuerySchema } from '$lib/server/validation/python-exercises';

type ZodIssue = { path: (string | number)[]; message: string };

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const exerciseId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	const parsed = pythonMasterySingleQuerySchema.safeParse({
		student_id: url.searchParams.get('student_id') ?? undefined
	});
	if (!parsed.success) {
		const msg = parsed.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Paramètres invalides: ${msg}`);
	}

	const targetStudent = parsed.data.student_id ?? user.id;

	const { data, error: dbErr } = await supabase
		.from('python_exercise_mastery')
		.select('status')
		.eq('exercise_id', exerciseId)
		.eq('student_id', targetStudent)
		.maybeSingle();

	if (dbErr) {
		console.error('Failed to read mastery row:', dbErr);
		throw error(500, 'Erreur lors de la lecture du statut de maîtrise');
	}

	return json({ status: data?.status ?? null });
};
