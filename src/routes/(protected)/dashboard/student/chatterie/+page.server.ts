/**
 * La Chatterie de Faustroll — page élève (Mathoux v1)
 * ===================================================
 *
 * Collection calculée à chaque affichage (`loadMathouCollection`), aux droits
 * de l'élève de la session. Aucune entrée client : ni paramètre, ni corps.
 *
 * Une lecture en échec ne se montre pas comme une Chatterie vide : la page
 * reçoit `unavailable` et le dit.
 *
 * Spec : docs/wip/mathoux-conception.md § 9 · doc : docs/systeme/mathoux.md
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { loadMathouCollection } from '$lib/server/mathoux/collection';
import type { MathouCollection } from '$lib/mathoux/collection-logic';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/student/chatterie/+page.server');

const EMPTY_COLLECTION: MathouCollection = {
	races: [],
	counts: { born: 0, napping: 0, toDiscover: 0 }
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await requireRole(locals, 'student');

	try {
		const collection = await loadMathouCollection(locals.supabase, user.id, profile.grade);
		return { collection, unavailable: false };
	} catch (err) {
		logger.error('Chatterie illisible :', err);
		return { collection: EMPTY_COLLECTION, unavailable: true };
	}
};
