/**
 * GET /api/student/mathoux
 * ========================
 *
 * Compteurs de la Chatterie de l'élève de la session (nés, en sieste, à
 * découvrir), pour le Palotin gardien.
 *
 * Pourquoi un endpoint et pas le layout élève : le calcul coûte ~6 requêtes
 * (cf. `loadMathouCollection`), et `dashboard/student/+layout.server.ts` tourne
 * à chaque page de l'espace élève. Le widget le demande donc une fois, après
 * l'affichage.
 *
 * AUTH : élève seulement. ENTRÉE : aucune (ni paramètre, ni corps) — l'élève et
 * son niveau viennent de la session.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { loadMathouCollection } from '$lib/server/mathoux/collection';
import type { MathouxSummary } from '$lib/mathoux/summary';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/mathoux/+server');

export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile } = await requireRole(locals, 'student');

	let summary: MathouxSummary;
	try {
		const collection = await loadMathouCollection(locals.supabase, user.id, profile.grade);
		summary = collection.counts;
	} catch (err) {
		logger.error('Chatterie illisible :', err);
		throw error(500, 'Chatterie indisponible');
	}

	return json(summary);
};
