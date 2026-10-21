/**
 * Page d'une notion du programme, vue par l'élève
 * ===============================================
 *
 * Les points de la notion pour le niveau de l'élève (ordre du BO, sous-notion
 * nommée), son état sur chacun et ce qui peut s'entraîner dans l'appli.
 * Remplace la page d'un objectif (C5, étape 3, PR D) : l'ancienne adresse
 * `/dashboard/student/objectifs/[id]` redirige vers « Ma progression ».
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { getNotionDetail } from '$lib/server/progression/student-progression';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/student/notions/[id]/+page.server');

const paramsSchema = z.object({ id: z.string().uuid() });

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user, profile } = await requireRole(locals, 'student');

	const parsed = paramsSchema.safeParse(params);
	if (!parsed.success) throw error(404, 'Notion introuvable');

	let detail;
	try {
		detail = await getNotionDetail(locals.supabase, user.id, profile.grade, parsed.data.id);
	} catch (err) {
		logger.error('Notion illisible :', err);
		throw error(500, 'Impossible de charger les données');
	}
	if (!detail) throw error(404, 'Notion introuvable');

	return detail;
};
