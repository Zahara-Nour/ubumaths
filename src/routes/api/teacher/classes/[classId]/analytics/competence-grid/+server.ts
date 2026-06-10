/**
 * GET /api/teacher/classes/[classId]/analytics/competence-grid
 *
 * Widget F — Grille élève × 6 compétences math (famille B).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { classIdParamSchema } from '$lib/server/validation/teacher-analytics';
import { getClassCompetenceGrid } from '$lib/server/stats';

export const GET: RequestHandler = async ({ params, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const grid = await getClassCompetenceGrid(locals.supabase, classId);

	return json(grid);
};
