/**
 * GET /api/teacher/classes/[classId]/analytics/knowledge-retention/[studentId]
 *
 * Widget B — Courbe rétention (retrievability moyenne par semaine, 8 dernières semaines)
 * pour un élève × un thème BO.
 * Query : ?theme=NOM_BO_OBLIGATOIRE
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import {
	classAndStudentParamSchema,
	retentionQuerySchema
} from '$lib/server/validation/teacher-analytics';
import { getStudentRetentionCurve } from '$lib/server/stats';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classAndStudentParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = retentionQuerySchema.safeParse({
		theme: url.searchParams.get('theme'),
		weeks: url.searchParams.get('weeks') ?? undefined
	});
	if (!queryCheck.success) {
		return json({ error: queryCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId, studentId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const { data: membership } = await locals.supabase
		.from('class_members')
		.select('student_id')
		.eq('class_id', classId)
		.eq('student_id', studentId)
		.eq('status', 'active')
		.maybeSingle();

	if (!membership) {
		return json({ error: 'Élève non rattaché à cette classe' }, { status: 404 });
	}

	const points = await getStudentRetentionCurve(
		locals.supabase,
		studentId,
		queryCheck.data.theme,
		queryCheck.data.weeks
	);

	return json({ points });
};
