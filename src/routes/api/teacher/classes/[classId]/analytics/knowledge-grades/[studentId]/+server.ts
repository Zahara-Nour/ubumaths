/**
 * GET /api/teacher/classes/[classId]/analytics/knowledge-grades/[studentId]
 *
 * Widget D — Histogramme des grades {1,2,3,4} sur N derniers jours pour un élève.
 * Query : ?days=7
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import {
	classAndStudentParamSchema,
	gradesQuerySchema
} from '$lib/server/validation/teacher-analytics';
import { getStudentGradeHistogram } from '$lib/server/stats';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classAndStudentParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = gradesQuerySchema.safeParse({
		days: url.searchParams.get('days') ?? undefined
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

	const buckets = await getStudentGradeHistogram(locals.supabase, studentId, queryCheck.data.days);

	return json({ buckets });
};
