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
 * Décorations (lots B et C des accessoires) : les décorations de panse et les
 * colliers achetés, et le solde, pour la fenêtre « Décorer ». Une lecture des décorations en échec
 * n'empêche pas la Chatterie : `ownedDecorations` vaut `null` et « Décorer »
 * ne s'affiche pas (sinon tout paraîtrait « à acheter »).
 *
 * Spec : docs/wip/mathoux-conception.md § 9 · doc : docs/systeme/mathoux.md
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { loadMathouCollection } from '$lib/server/mathoux/collection';
import { readOwnedDecorations } from '$lib/server/mathoux/decorations';
import type { MathouCatalogId } from '$lib/mathoux/decorations';
import type { MathouCollection } from '$lib/mathoux/collection-logic';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/student/chatterie/+page.server');

const EMPTY_COLLECTION: MathouCollection = {
	races: [],
	counts: { born: 0, napping: 0, toDiscover: 0 }
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await requireRole(locals, 'student');

	const balance = Number(profile.gidouilles ?? 0);
	const [collectionResult, ownedResult] = await Promise.allSettled([
		loadMathouCollection(locals.supabase, user.id, profile.grade),
		readOwnedDecorations(locals.supabase, user.id)
	]);

	let ownedDecorations: MathouCatalogId[] | null = null;
	if (ownedResult.status === 'fulfilled') ownedDecorations = ownedResult.value;
	else logger.error('Décorations illisibles :', ownedResult.reason);

	if (collectionResult.status === 'rejected') {
		logger.error('Chatterie illisible :', collectionResult.reason);
		return { collection: EMPTY_COLLECTION, unavailable: true, ownedDecorations, balance };
	}
	return { collection: collectionResult.value, unavailable: false, ownedDecorations, balance };
};
