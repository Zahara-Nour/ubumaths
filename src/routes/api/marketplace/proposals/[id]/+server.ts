import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { updateProposalSchema } from '$lib/server/marketplace/validation';
import { unlockCardsForEntity } from '$lib/server/marketplace/helpers';
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
				title: string;
				offered_card_ids: string[] | null;
				offered_item_ids: string[] | null;
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
		await notifyProposalAccepted(supabase, proposal.proposer_id, listing.title, proposalId);

		// Notify rejected proposers (already handled by the RPC function but we still send notifications)
		const { data: rejectedProposals } = await supabase
			.from('marketplace_proposals')
			.select('id, proposer_id')
			.eq('listing_id', listing.id)
			.eq('status', 'rejected')
			.neq('id', proposalId);

		if (rejectedProposals && rejectedProposals.length > 0) {
			for (const rejectedProposal of rejectedProposals) {
				// Notify them
				await notifyProposalRejected(
					supabase,
					rejectedProposal.proposer_id,
					listing.title,
					"L'annonce a été complétée avec une autre proposition"
				);
			}
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
		// Rejecting the proposal
		await supabase
			.from('marketplace_proposals')
			.update({
				status: 'rejected',
				response_message: response_message || null,
				responded_at: new Date().toISOString()
			})
			.eq('id', proposalId);

		// Unlock proposer's cards
		await unlockCardsForEntity(supabase, proposalId);

		// Decrement proposal count on listing
		await supabase
			.from('marketplace_listings')
			.update({
				proposal_count: Math.max(0, listing.proposal_count - 1),
				updated_at: new Date().toISOString()
			})
			.eq('id', listing.id);

		// Create notification for proposer
		await notifyProposalRejected(supabase, proposal.proposer_id, listing.title, response_message);

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

	// Update proposal status
	const { error: updateError } = await supabase
		.from('marketplace_proposals')
		.update({
			status: 'withdrawn',
			responded_at: new Date().toISOString()
		})
		.eq('id', proposalId);

	if (updateError) {
		console.error('Error withdrawing proposal:', updateError);
		throw error(500, 'Erreur lors du retrait de la proposition');
	}

	// Unlock cards
	await unlockCardsForEntity(supabase, proposalId);

	// Decrement proposal count on listing
	const listing = proposal.listing as { id: string; proposal_count: number } | null | undefined;
	if (listing) {
		await supabase
			.from('marketplace_listings')
			.update({
				proposal_count: Math.max(0, listing.proposal_count - 1),
				updated_at: new Date().toISOString()
			})
			.eq('id', proposal.listing_id);
	}

	return json({ success: true });
};
