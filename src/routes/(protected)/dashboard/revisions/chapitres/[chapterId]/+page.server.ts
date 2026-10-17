/**
 * Séance de révision du paquet CALCULÉ d'un chapitre (questions de cours, étape 3)
 * ==============================================================================
 *
 * La page ne lit que le titre du chapitre, aux droits de l'élève : masqué, d'une
 * autre classe ou inexistant → 404. Les questions viennent de
 * `GET /api/srs/chapters/[chapterId]/due`, chargées par l'écran de séance.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { chapterDeckParamsSchema } from '$lib/server/validation/srs';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'(protected)/dashboard/revisions/chapitres/[chapterId]/+page.server'
);

export const load: PageServerLoad = async ({ locals, params }) => {
	await requireRole(locals, 'student');

	const validation = chapterDeckParamsSchema.safeParse(params);
	if (!validation.success) throw error(404, 'Chapitre introuvable');
	const { chapterId } = validation.data;

	const { data: chapter, error: chapterError } = await locals.supabase
		.from('class_chapters')
		.select('id, title')
		.eq('id', chapterId)
		.eq('is_visible', true)
		.maybeSingle();

	if (chapterError) {
		logger.error('[revisions/chapitres] Chapitre illisible :', chapterError);
		throw error(500, 'Impossible de charger le chapitre');
	}
	if (!chapter) throw error(404, 'Chapitre introuvable');

	return { chapter };
};
