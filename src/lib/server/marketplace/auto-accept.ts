/**
 * Auto-acceptation d'une offre exacte au marché
 * =============================================
 *
 * La comparaison offre / demande se fait EN BASE, sous verrou de la proposition
 * et de l'annonce (`auto_accept_exact_proposal`, migration 20261003160000).
 * Auparavant la route comparait, puis `accept_proposal_atomic` relisait la
 * proposition : le proposant pouvait la modifier entre les deux.
 *
 * Client service : la fonction est réservée au serveur, et le proposant n'est
 * pas le vendeur au nom duquel l'échange est accepté.
 */
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	autoAcceptExactProposalSchema,
	type AutoAcceptExactProposalResult
} from '$lib/server/validation/marketplace-rpc';

// Absente de database.ts tant que la migration n'a pas été générée depuis la production.
type RpcNonTypee = (
	fn: string,
	args: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Accepte la proposition si, relue sous verrou, son offre couvre la demande.
 * Une panne (RPC en erreur, forme inattendue) rend un refus : la proposition
 * reste alors en attente, ce qui est le repli sûr.
 */
export async function autoAcceptExactProposal(
	proposalId: string
): Promise<AutoAcceptExactProposalResult> {
	const service = createServiceRoleClient();
	const rpc = (service.rpc as unknown as RpcNonTypee).bind(service);

	const { data, error } = await rpc('auto_accept_exact_proposal', {
		p_proposal_id: proposalId
	});

	if (error) {
		console.error('[marketplace] auto_accept_exact_proposal en erreur :', error);
		return { success: false, reason: 'rpc_error', error: error.message };
	}

	const resultat = autoAcceptExactProposalSchema.safeParse(data);
	if (!resultat.success) {
		console.error('[marketplace] Réponse inattendue de auto_accept_exact_proposal :', data);
		return { success: false, reason: 'invalid_response' };
	}

	return resultat.data;
}
