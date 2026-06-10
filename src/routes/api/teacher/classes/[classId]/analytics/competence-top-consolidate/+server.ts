/**
 * GET /api/teacher/classes/[classId]/analytics/competence-top-consolidate
 *
 * Widget G — Top observables famille B où le % minus est le plus élevé.
 * Query : ?topN=10
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { classIdParamSchema, topNQuerySchema } from '$lib/server/validation/teacher-analytics';
import { getClassTopObservablesToConsolidate } from '$lib/server/stats';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = topNQuerySchema.safeParse({
		topN: url.searchParams.get('topN') ?? undefined
	});
	if (!queryCheck.success) {
		return json({ error: queryCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const rows = await getClassTopObservablesToConsolidate(
		locals.supabase,
		classId,
		queryCheck.data.topN
	);

	return json({ rows });
};
