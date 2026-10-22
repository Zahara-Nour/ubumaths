/**
 * POST /api/student/buddy/welcome-back
 * ====================================
 *
 * Le Palotin a dit « tu m'as manqué » : le retour de l'élève après une longue
 * absence est fêté, on l'efface (docs/systeme/buddy-palotins.md).
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
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/buddy/welcome-back/+server');

export const POST: RequestHandler = async ({ locals }) => {
	const { user } = await requireRole(locals, 'student');

	try {
		return json({ acknowledged: await acknowledgeWelcomeBack(user.id) });
	} catch (err) {
		logger.error('Retour à fêter non effacé :', err);
		throw error(500, 'Retour non enregistré');
	}
};
