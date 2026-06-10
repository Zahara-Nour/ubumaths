/**
 * GET /api/teacher/classes/[classId]/analytics/knowledge-grid
 *
 * Widget A — Grille élève × capacité famille A.
 * Query : ?includeAllCycle=true pour étendre aux capacités non touchées.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import {
	classIdParamSchema,
	knowledgeGridQuerySchema
} from '$lib/server/validation/teacher-analytics';
import { getClassCapacityGrid } from '$lib/server/stats';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = knowledgeGridQuerySchema.safeParse({
		includeAllCycle: url.searchParams.get('includeAllCycle') ?? undefined
	});
	if (!queryCheck.success) {
		return json({ error: queryCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const grid = await getClassCapacityGrid(locals.supabase, classId, {
		includeAllCycle: queryCheck.data.includeAllCycle
	});

	return json(grid);
};
