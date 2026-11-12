/**
 * GET /api/student/buddy/presence
 * ================================
 *
 * Lu par le composant de présence du Palotin, après l'affichage (et relu après
 * une activité) : le Palotin (Constance perdue remise à zéro par cette lecture,
 * en silence) et le retour après une pause à fêter.
 * Aucun paramètre. Voir `$lib/server/buddy-presence`.
 *
 * AUTH: élève seulement
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { loadBuddyPresence } from '$lib/server/buddy-presence';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/buddy/presence/+server');

export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireRole(locals, 'student');

	try {
		return json(await loadBuddyPresence(locals.supabase, user.id));
	} catch (err) {
		logger.error('❌ [API] GET /api/student/buddy/presence:', err);
		throw error(500, 'Palotin illisible');
	}
};
