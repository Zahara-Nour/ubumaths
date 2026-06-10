/**
 * GET /api/teacher/classes/[classId]/anti-fraud/count
 *
 * Compteur de flags non-résolus pour la classe (alimente le badge UI).
 *
 * Cf. spec TDD : docs/wip/srs-anti-fraud-spec-tdd.md §B12
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { classIdParamSchema } from '$lib/server/validation/teacher-analytics';

export const GET: RequestHandler = async ({ params, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const { data: memberRows } = await locals.supabase
		.from('class_members')
		.select('student_id')
		.eq('class_id', classId)
		.eq('status', 'active');

	const studentIds = (memberRows ?? []).map((m) => m.student_id);
	if (studentIds.length === 0) {
		return json({ count: 0 });
	}

	const { count, error } = await locals.supabase
		.from('srs_anti_fraud_flags')
		.select('id', { count: 'exact', head: true })
		.in('student_id', studentIds)
		.eq('resolved', false);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ count: count ?? 0 });
};
