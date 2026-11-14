/**
 * GET /api/teacher/classes/[classId]/analytics/success-rate
 *
 * Taux de réussite de la classe par notion et par point, depuis la rentrée
 * (réponses prouvées seulement). Des taux et des effectifs : ni nom d'élève,
 * ni date. Sans paramètre de requête.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { classIdParamSchema } from '$lib/server/validation/teacher-analytics';
import { getClassSuccessRates } from '$lib/server/stats';

export const GET: RequestHandler = async ({ params, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const rates = await getClassSuccessRates(locals.supabase, classId);
	return json(rates);
};
