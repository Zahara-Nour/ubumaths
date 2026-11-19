/**
 * GET /api/teacher/classes/[classId]/analytics/knowledge-top-remediate
 *
 * Widget E — Top points du programme à remédier dans la classe.
 * Query : ?topN=10
 */

import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '#lib/server/stats/teacher-class-auth.ts';
import { classIdParamSchema, topNQuerySchema } from '#lib/server/validation/teacher-analytics.ts';
import { getClassTopCurriculumPointsToRemediate } from '#lib/server/stats/index.ts';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return Response.json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = topNQuerySchema.safeParse({
		topN: url.searchParams.get('topN') ?? undefined
	});
	if (!queryCheck.success) {
		return Response.json({ error: queryCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const rows = await getClassTopCurriculumPointsToRemediate(
		locals.supabase,
		classId,
		queryCheck.data.topN
	);

	return Response.json({ rows });
};
