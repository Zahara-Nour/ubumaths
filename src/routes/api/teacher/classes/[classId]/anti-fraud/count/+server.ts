/**
 * GET /api/teacher/classes/[classId]/anti-fraud/count
 *
 * Compteur de flags non-résolus pour la classe (alimente le badge UI).
 *
 * Cf. spec TDD : docs/archive/wip/srs-anti-fraud-spec-tdd.md §B12
 */

import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '#lib/server/stats/teacher-class-auth.ts';
import { classIdParamSchema } from '#lib/server/validation/teacher-analytics.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/teacher/classes/[classId]/anti-fraud/count/+server');

export const GET: RequestHandler = async ({ params, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return Response.json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const { data: memberRows, error: memberRowsError } = await locals.supabase
		.from('class_members')
		.select('student_id')
		.eq('class_id', classId)
		.eq('status', 'active');

	// Cette liste borne la portée du classement. Vidée par une panne, elle
	// affiche un classement amputé sans le dire.
	if (memberRowsError) {
		logger.error('Périmètre illisible :', memberRowsError);
		return Response.json({ error: 'Impossible de déterminer le périmètre' }, { status: 500 });
	}

	const studentIds = (memberRows ?? []).map((m) => m.student_id);
	if (studentIds.length === 0) {
		return Response.json({ count: 0 });
	}

	const { count, error } = await locals.supabase
		.from('srs_anti_fraud_flags')
		.select('id', { count: 'exact', head: true })
		.in('student_id', studentIds)
		.eq('resolved', false);

	if (error) {
		// Le message de la base reste dans le journal du serveur.
		logger.error('Comptage des signalements impossible :', error);
		return Response.json({ error: 'Impossible de compter les signalements' }, { status: 500 });
	}

	return Response.json({ count: count ?? 0 });
};
