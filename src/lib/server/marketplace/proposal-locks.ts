/**
 * Déverrouillage des cartes d'une proposition
 * ===========================================
 *
 * Les cartes offertes par une proposition sont verrouillées sous l'id de la
 * PROPOSITION (avant : sous l'id de l'annonce, que le refus et le retrait ne
 * déverrouillaient jamais). Un verrou ancien peut donc encore exister sous l'id
 * de l'annonce : on l'accepte aussi, restreint aux cartes de CE proposant pour
 * ne jamais toucher aux verrous du vendeur. Aucune donnée n'est migrée.
 *
 * Client service : le vendeur qui refuse n'a aucun droit sur les verrous du
 * proposant, et une suppression refusée par la RLS ne rend pas d'erreur.
 */
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

export interface ProposalLockScope {
	proposalId: string;
	listingId: string;
	proposerId: string;
	offeredCardIds: string[];
}

/** Rend le nombre de verrous levés, ou lève une erreur si la base refuse. */
export async function unlockProposalCards(scope: ProposalLockScope): Promise<number> {
	const service = createServiceRoleClient();

	const { data: parProposition, error: propositionError } = await service
		.from('marketplace_locked_cards')
		.delete()
		.eq('locked_entity_id', scope.proposalId)
		.select('id');

	if (propositionError) {
		throw new Error(`Déverrouillage impossible : ${propositionError.message}`);
	}

	let anciens = 0;
	if (scope.offeredCardIds.length > 0) {
		const { data: parAnnonce, error: annonceError } = await service
			.from('marketplace_locked_cards')
			.delete()
			.eq('locked_entity_id', scope.listingId)
			.eq('student_id', scope.proposerId)
			.in('card_instance_id', scope.offeredCardIds)
			.select('id');

		if (annonceError) {
			throw new Error(`Déverrouillage impossible : ${annonceError.message}`);
		}
		anciens = parAnnonce?.length ?? 0;
	}

	return (parProposition?.length ?? 0) + anciens;
}
