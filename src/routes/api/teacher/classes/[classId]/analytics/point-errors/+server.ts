/**
 * GET /api/teacher/classes/[classId]/analytics/point-errors?point=<uuid>
 *
 * Erreurs de la classe sur les modèles d'un point du programme (chantier
 * `erreurs-frequentes`, PR 2) : onglet « Erreurs » de la fenêtre du widget
 * « Top points à remédier ». Lecture seule, sous la RLS du professeur.
 */

import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { classIdParamSchema } from '$lib/server/validation/teacher-analytics';
import { getClassPointErrors } from '$lib/server/stats/point-errors';

const querySchema = z.object({ point: z.string().uuid('Point invalide') });

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = querySchema.safeParse({ point: url.searchParams.get('point') });
	if (!queryCheck.success) {
		return json({ error: queryCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	return json(await getClassPointErrors(locals.supabase, classId, queryCheck.data.point));
};
