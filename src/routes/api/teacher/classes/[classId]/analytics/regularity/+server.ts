/**
 * GET /api/teacher/classes/[classId]/analytics/regularity
 *
 * Grille de régularité : élève × semaine depuis la rentrée, palier de jours
 * actifs seulement (jamais le nombre ni les dates). Sans paramètre de requête.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { classIdParamSchema } from '$lib/server/validation/teacher-analytics';
import { getClassRegularityGrid } from '$lib/server/stats';

export const GET: RequestHandler = async ({ params, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const grid = await getClassRegularityGrid(locals.supabase, classId);
	return json(grid);
};
