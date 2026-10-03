/**
 * Proposants refusés PAR une acceptation
 * ======================================
 *
 * Accepter une proposition refuse les autres propositions en attente de
 * l'annonce (execute_trade / accept_proposal_atomic), toutes dans la même
 * transaction : leur `responded_at` vaut exactement celui de la proposition
 * acceptée (NOW() est constant dans une transaction). On filtre sur cette
 * valeur pour ne pas prévenir une seconde fois les propositions refusées plus tôt.
 *
 * Client service : la RLS ne montre au proposant que SES propositions — la
 * lecture rendait zéro ligne, sans erreur, et personne n'était prévenu.
 */
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

export async function proposersRejectedByAcceptance(acceptedProposalId: string): Promise<string[]> {
	const service = createServiceRoleClient();

	const { data: acceptee, error: accepteeError } = await service
		.from('marketplace_proposals')
		.select('listing_id, responded_at')
		.eq('id', acceptedProposalId)
		.eq('status', 'accepted')
		.single();

	if (accepteeError || !acceptee?.responded_at) {
		throw new Error(
			`Proposition acceptée illisible : ${accepteeError?.message ?? 'responded_at absent'}`
		);
	}

	const { data: refusees, error: refuseesError } = await service
		.from('marketplace_proposals')
		.select('proposer_id')
		.eq('listing_id', acceptee.listing_id)
		.eq('status', 'rejected')
		.eq('responded_at', acceptee.responded_at)
		.neq('id', acceptedProposalId);

	if (refuseesError) {
		throw new Error(`Propositions refusées illisibles : ${refuseesError.message}`);
	}

	return (refusees ?? []).map((r) => r.proposer_id);
}
