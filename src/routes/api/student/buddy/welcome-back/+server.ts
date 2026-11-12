/**
 * POST /api/student/buddy/welcome-back
 * ====================================
 *
 * Le Palotin a fêté le retour de l'élève après une pause : on l'efface
 * (docs/systeme/buddy-palotins.md). La semaine en cours compte aussi comme
 * fêtée : un seul moment à la fois (T4, chantier `regularite`).
 * Appelé par le widget APRÈS avoir montré la bulle : un préchargement de page
 * ne consomme donc rien.
 *
 * AUTH : élève seulement. ENTRÉE : aucune (ni paramètre, ni corps) — l'élève
 * vient de la session. SORTIE : `{ acknowledged }`, faux s'il n'y avait rien à
 * fêter (deuxième appel, autre onglet).
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { acknowledgeWelcomeBack } from '$lib/server/buddy-queries';
import { markWeekCelebrated } from '$lib/server/buddy-weeks';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/buddy/welcome-back/+server');

export const POST: RequestHandler = async ({ locals }) => {
	const { user } = await requireRole(locals, 'student');

	let acknowledged: boolean;
	try {
		acknowledged = await acknowledgeWelcomeBack(user.id);
	} catch (err) {
		logger.error('Retour à fêter non effacé :', err);
		throw error(500, 'Retour non enregistré');
	}

	// Non bloquant : au pire, la semaine sera fêtée en plus à la prochaine activité
	try {
		await markWeekCelebrated(user.id);
	} catch (err) {
		logger.error('Semaine non marquée fêtée après le retour :', err);
	}
	return json({ acknowledged });
};
