/**
 * GET /api/teacher/classes/[classId]/analytics/knowledge-grid
 *
 * Widget A — Grille élève × point du programme.
 * Query : ?includeAllCycle=true pour étendre aux points non touchés.
 */

import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '#lib/server/stats/teacher-class-auth.ts';
import {
	classIdParamSchema,
	knowledgeGridQuerySchema
} from '#lib/server/validation/teacher-analytics.ts';
import { getClassCurriculumPointGrid } from '#lib/server/stats/index.ts';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return Response.json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = knowledgeGridQuerySchema.safeParse({
		includeAllCycle: url.searchParams.get('includeAllCycle') ?? undefined
	});
	if (!queryCheck.success) {
		return Response.json({ error: queryCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const grid = await getClassCurriculumPointGrid(locals.supabase, classId, {
		includeAllCycle: queryCheck.data.includeAllCycle
	});

	return Response.json(grid);
};
