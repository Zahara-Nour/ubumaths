/**
 * Annonces d'un auteur en lecture seule (consentement parental) : masquées du marché.
 *
 * Décision de David (2026-10-10, constat A2) : personne ne pourrait les conclure — la base
 * refuse toute proposition sur elles (`guard_proposal_listing_open`). La liste vient de
 * `marketplace_hidden_creators(p_school_id)`, réservée à `service_role` : appelable par
 * un élève, elle nommerait ses camarades sans consentement.
 */

import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

/** Auteurs d'annonces actives de l'école, en lecture seule. */
export async function getHiddenMarketplaceCreators(schoolId: string): Promise<string[]> {
	const { data, error } = await createServiceRoleClient().rpc('marketplace_hidden_creators', {
		p_school_id: schoolId
	});
	if (error) throw new Error(`marketplace_hidden_creators : ${error.message}`);
	return data ?? [];
}
