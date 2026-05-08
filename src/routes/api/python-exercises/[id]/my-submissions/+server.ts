/**
 * API Route: /api/python-exercises/[id]/my-submissions
 *
 * GET — list submissions on this exercise that the caller is allowed to see.
 *
 * Authorisation is enforced entirely by RLS on `python_exercise_submissions`:
 *   - students see their own submissions
 *   - teachers see submissions on exercises they authored, or from students
 *     in their classes, or for assignments they created
 *
 * The handler itself only filters by `exercise_id` and applies pagination.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const exerciseId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	const rawLimit = parseInt(url.searchParams.get('limit') ?? '', 10);
	const limit = Number.isFinite(rawLimit)
		? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
		: DEFAULT_LIMIT;

	const { data, error: dbErr } = await supabase
		.from('python_exercise_submissions')
		.select(
			'id, code, validation_result, is_correct, attempt_number, execution_time_ms, created_at, assignment_id, student_id'
		)
		.eq('exercise_id', exerciseId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (dbErr) {
		console.error('Failed to read submissions:', dbErr);
		throw error(500, 'Erreur lors de la lecture des soumissions');
	}

	return json({ submissions: data ?? [] });
};
