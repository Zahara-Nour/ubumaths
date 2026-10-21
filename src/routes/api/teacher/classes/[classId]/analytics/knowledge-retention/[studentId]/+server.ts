/**
 * GET /api/teacher/classes/[classId]/analytics/knowledge-retention/[studentId]
 *
 * Widget B — Courbe rétention (retrievability moyenne par semaine, 8 dernières semaines)
 * pour un élève × une branche de l'arbre, dans le programme du niveau de la classe.
 * Query : ?branch=<uuid> (obligatoire)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import {
	classAndStudentParamSchema,
	retentionQuerySchema
} from '$lib/server/validation/teacher-analytics';
import { getStudentRetentionCurve } from '$lib/server/stats';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'api/teacher/classes/[classId]/analytics/knowledge-retention/[studentId]/+server'
);

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classAndStudentParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = retentionQuerySchema.safeParse({
		branch: url.searchParams.get('branch') ?? undefined,
		weeks: url.searchParams.get('weeks') ?? undefined
	});
	if (!queryCheck.success) {
		return json({ error: queryCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId, studentId } = paramCheck.data;
	const { classRow } = await requireTeacherOfClass(locals, classId);

	const { data: membership, error: membershipError } = await locals.supabase
		.from('class_members')
		.select('student_id')
		.eq('class_id', classId)
		.eq('student_id', studentId)
		.eq('status', 'active')
		.maybeSingle();

	// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
	// panne doit se distinguer d'un refus mérité.
	if (membershipError) {
		logger.error('Contrôle d’accès impossible :', membershipError);
		return json({ error: 'Impossible de vérifier l’accès' }, { status: 500 });
	}

	if (!membership) {
		return json({ error: 'Élève non rattaché à cette classe' }, { status: 404 });
	}

	// Classe sans niveau : pas de programme, donc pas de branche à lire.
	if (!classRow.grade) {
		return json({ points: [] });
	}

	const points = await getStudentRetentionCurve(
		locals.supabase,
		studentId,
		{ branchId: queryCheck.data.branch, grade: classRow.grade },
		queryCheck.data.weeks
	);

	return json({ points });
};
