/**
 * POST /api/student/buddy/week-celebrated
 * =======================================
 *
 * Le Palotin a fêté la semaine qui devient active (1re activité de la semaine,
 * ou 3/5/10 semaines actives d'affilée) : la semaine en cours est retenue,
 * il ne la fêtera plus (chantier `regularite`, PR B2 ;
 * docs/systeme/buddy-palotins.md).
 * Appelé par le Palotin APRÈS avoir montré la bulle : un préchargement de page
 * ne consomme donc rien.
 *
 * AUTH : élève seulement. ENTRÉE : aucune (ni paramètre, ni corps) — l'élève
 * vient de la session, la semaine est calculée ici. SORTIE : `{ acknowledged }`.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { markWeekCelebrated } from '$lib/server/buddy-weeks';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/buddy/week-celebrated/+server');

export const POST: RequestHandler = async ({ locals }) => {
	const { user } = await requireRole(locals, 'student');

	try {
		return json({ acknowledged: await markWeekCelebrated(user.id) });
	} catch (err) {
		logger.error('Semaine fêtée non retenue :', err);
		throw error(500, 'Semaine non enregistrée');
	}
};
