import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { updateProposalSchema } from '$lib/server/marketplace/validation';
import { unlockProposalCards } from '$lib/server/marketplace/proposal-locks';
import { proposersRejectedByAcceptance } from '$lib/server/marketplace/acceptance';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	notifyProposalAccepted,
	notifyProposalRejected
} from '$lib/server/marketplace/notifications';
// TODO: Implement cache invalidation
// import {
//   invalidateMarketplaceCaches,
//   invalidateTeacherCachesForStudents
// } from '$lib/server/marketplace/cache-manager';
import { z } from 'zod';

// ID validation schema
const idSchema = z.string().uuid('ID de proposition invalide');

// RPC response validation schema
const acceptProposalResponseSchema = z.object({
	success: z.boolean(),
	error: z.string().optional(),
	message: z.string().optional()
});

/**
 * PATCH /api/marketplace/proposals/[id]
 * Accept or reject a proposal
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate proposal ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const proposalId = idValidation.data;

	// Validate request body
	const body = await request.json().catch(() => ({}));
	const validation = updateProposalSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { status, response_message } = validation.data;

	// Get proposal with listing details
	const { data: proposal, error: proposalError } = await supabase
		.from('marketplace_proposals')
		.select(
			`
      *,
      listing:marketplace_listings!marketplace_proposals_listing_id_fkey(
        *
      )
    `
		)
		.eq('id', proposalId)
		.single();

	if (proposalError || !proposal) {
		throw error(404, 'Proposition non trouvée');
	}

	// Type the listing from the relation
	const listing = proposal.listing as
		| {
				id: string;
				creator_id: string;
				status: string;
				offered_card_ids: string[] | null;
				offered_gidouilles: number | null;
				proposal_count: number;
		  }
		| null
		| undefined;

	// Verify user owns the listing
	if (!listing || listing.creator_id !== userId) {
		throw error(403, 'Vous ne pouvez pas répondre à cette proposition');
	}

	// Verify proposal is pending
	if (proposal.status !== 'pending') {
		throw error(403, 'Cette proposition a déjà été traitée');
	}

	// Verify listing is still active
	if (listing.status !== 'active') {
		throw error(403, "L'annonce n'est plus active");
	}

	if (status === 'accepted') {
		// Use the atomic RPC function to accept the proposal
		// This handles all the locking, validation, and transaction logic atomically
		const { data: result, error: rpcError } = await supabase.rpc('accept_proposal_atomic', {
			p_proposal_id: proposalId,
			p_user_id: userId
		});

		if (rpcError) {
			console.error('Error in accept_proposal_atomic:', rpcError);
			throw error(500, "Erreur lors de l'acceptation de la proposition");
		}

		// Validate response structure
		const validation = acceptProposalResponseSchema.safeParse(result);
		if (!validation.success) {
			console.error('Invalid RPC response:', validation.error);
			throw error(500, 'Réponse invalide de la base de données');
		}

		const { success, error: rpcResultError } = validation.data;

		// Check the result from the RPC function
		if (!success) {
			// Handle specific error cases
			const errorMsg = rpcResultError || 'Erreur inconnue';
			if (errorMsg === 'Une autre transaction est en cours sur cette annonce') {
				throw error(409, errorMsg); // 409 Conflict
			} else if (errorMsg === 'Cette proposition a déjà été traitée') {
				throw error(403, errorMsg);
			} else if (errorMsg === "Cette annonce n'est plus disponible") {
				throw error(410, errorMsg); // 410 Gone
			} else if (errorMsg.includes('suffisamment de gidouilles')) {
				throw error(402, errorMsg); // 402 Payment Required
			} else {
				throw error(400, errorMsg);
			}
		}

		// Get updated proposal data
		const { data: updatedProposal, error: fetchError } = await supabase
			.from('marketplace_proposals')
			.select('*')
			.eq('id', proposalId)
			.single();

		if (fetchError || !updatedProposal) {
			console.error('Error fetching updated proposal:', fetchError);
			// Still return success since the operation completed
			return json({
				...proposal,
				status: 'accepted',
				response_message,
				responded_at: new Date().toISOString()
			});
		}

		// Create notification for accepted proposer
		await notifyProposalAccepted(proposal.proposer_id, 'Annonce', proposalId);

		// Proposants refusés PAR cette acceptation seulement (pas ceux refusés plus tôt).
		let refuses: string[];
		try {
			refuses = await proposersRejectedByAcceptance(proposalId);
		} catch (e) {
			console.error('Lecture impossible :', e);
			throw error(500, 'Impossible de charger les données');
		}

		for (const proposerId of refuses) {
			await notifyProposalRejected(
				proposerId,
				'Annonce',
				"L'annonce a été complétée avec une autre proposition"
			);
		}

		// Invalidate caches for both participants
		// TODO: Implement cache invalidation
		// await invalidateMarketplaceCaches(listing.creator_id, proposal.proposer_id);
		// await invalidateTeacherCachesForStudents(supabase, [listing.creator_id, proposal.proposer_id]);

		return json({
			...updatedProposal,
			response_message,
			trade_completed: true
		});
	} else {
		// Refus : seule écriture directe laissée au vendeur (Q149) — status,
		// response_message, responded_at et rien d'autre. `.select()` : un refus
		// de la RLS rend zéro ligne, pas une erreur.
		const { data: refusee, error: refusError } = await supabase
			.from('marketplace_proposals')
			.update({
				status: 'rejected',
				response_message: response_message || null,
				responded_at: new Date().toISOString()
			})
			.eq('id', proposalId)
			.select('id');

		if (refusError || !refusee || refusee.length === 0) {
			console.error('Error rejecting proposal:', refusError ?? 'aucune ligne modifiée');
			throw error(500, 'Erreur lors du refus de la proposition');
		}

		// Cartes du proposant, verrouillées sous l'id de la proposition (ou, pour
		// un verrou ancien, sous celui de l'annonce).
		await unlockProposalCards({
			proposalId,
			listingId: listing.id,
			proposerId: proposal.proposer_id,
			offeredCardIds: proposal.offered_card_ids ?? []
		});

		// Decrement proposal count on listing
		await supabase
			.from('marketplace_listings')
			.update({
				proposal_count: Math.max(0, listing.proposal_count - 1)
			})
			.eq('id', listing.id);

		// Create notification for proposer
		await notifyProposalRejected(proposal.proposer_id, 'Annonce', response_message);

		return json({
			...proposal,
			status: 'rejected',
			response_message,
			responded_at: new Date().toISOString()
		});
	}
};

/**
 * DELETE /api/marketplace/proposals/[id]
 * Withdraw a proposal
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate proposal ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const proposalId = idValidation.data;

	// Get proposal
	const { data: proposal, error: proposalError } = await supabase
		.from('marketplace_proposals')
		.select('*, listing:marketplace_listings!marketplace_proposals_listing_id_fkey(proposal_count)')
		.eq('id', proposalId)
		.single();

	if (proposalError || !proposal) {
		throw error(404, 'Proposition non trouvée');
	}

	// Verify user is the proposer
	if (proposal.proposer_id !== userId) {
		throw error(403, 'Vous ne pouvez pas retirer cette proposition');
	}

	// Verify proposal is pending
	if (proposal.status !== 'pending') {
		throw error(403, 'Cette proposition ne peut plus être retirée');
	}

	// Retrait : seule écriture directe laissée au proposant (Q147). `withdrawn_at`
	// est exigé par la contrainte `valid_response_timestamp` : sans lui, le retrait
	// échouait toujours (aucune proposition « withdrawn » en production).
	// `.select()` : un refus de la RLS rend zéro ligne, pas une erreur.
	const maintenant = new Date().toISOString();
	const { data: retiree, error: updateError } = await supabase
		.from('marketplace_proposals')
		.update({
			status: 'withdrawn',
			withdrawn_at: maintenant,
			responded_at: maintenant
		})
		.eq('id', proposalId)
		.select('id');

	if (updateError || !retiree || retiree.length === 0) {
		console.error('Error withdrawing proposal:', updateError ?? 'aucune ligne modifiée');
		throw error(500, 'Erreur lors du retrait de la proposition');
	}

	// Cartes verrouillées sous l'id de la proposition (ou, verrou ancien, de l'annonce).
	await unlockProposalCards({
		proposalId,
		listingId: proposal.listing_id,
		proposerId: userId,
		offeredCardIds: proposal.offered_card_ids ?? []
	});

	// Compteur de l'annonce. Client service : le proposant n'a aucun droit
	// d'écriture sur l'annonce, la mise à jour ne touchait aucune ligne.
	const listing = proposal.listing as { proposal_count: number | null } | null | undefined;
	if (listing) {
		const { data: compteur, error: compteurError } = await createServiceRoleClient()
			.from('marketplace_listings')
			.update({
				proposal_count: Math.max(0, (listing.proposal_count ?? 0) - 1)
			})
			.eq('id', proposal.listing_id)
			.select('id');

		if (compteurError || !compteur || compteur.length === 0) {
			console.error(
				'[marketplace] proposal_count non mis à jour :',
				compteurError ?? 'aucune ligne modifiée'
			);
		}
	}

	return json({ success: true });
};
