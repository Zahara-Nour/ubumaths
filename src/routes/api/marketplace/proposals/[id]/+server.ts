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
		// Create a marketplace trade record
		const { data: trade, error: tradeError } = await supabase
			.from('marketplace_trades')
			.insert({
				initiator_id: listing.creator_id,
				partner_id: proposal.proposer_id,
				type: 'marketplace',
				status: 'completed',
				completed_at: new Date().toISOString(),
				final_trade: {
					initiator_cards: listing.offered_card_ids || [],
					initiator_gidouilles: listing.offered_gidouilles || 0,
					partner_cards: proposal.offered_card_ids || [],
					partner_gidouilles: proposal.offered_gidouilles || 0
				}
			})
			.select()
			.single();

		if (tradeError) {
			console.error('Error creating trade:', tradeError);
			throw error(500, "Erreur lors de la création de l'échange");
		}

		// Execute the trade using RPC
		const { error: executeError } = await supabase.rpc('execute_trade', {
			p_trade_id: trade.id
		});

		if (executeError) {
			console.error('Error executing trade:', executeError);
			// Rollback: delete the trade
			await supabase.from('marketplace_trades').delete().eq('id', trade.id);
			throw error(500, "Erreur lors de l'exécution de l'échange");
		}

		// Update listing status to completed
		await supabase
			.from('marketplace_listings')
			.update({
				status: 'completed',
				updated_at: new Date().toISOString()
			})
			.eq('id', listing.id);

		// Update proposal status
		await supabase
			.from('marketplace_proposals')
			.update({
				status: 'accepted',
				response_message: response_message || null,
				responded_at: new Date().toISOString()
			})
			.eq('id', proposalId);

		// Reject all other pending proposals for this listing
		const { data: otherProposals } = await supabase
			.from('marketplace_proposals')
			.select('id, proposer_id')
			.eq('listing_id', listing.id)
			.eq('status', 'pending')
			.neq('id', proposalId);

		if (otherProposals && otherProposals.length > 0) {
			// Update their status
			await supabase
				.from('marketplace_proposals')
				.update({
					status: 'rejected',
					response_message: "L'annonce a été complétée avec une autre proposition",
					responded_at: new Date().toISOString()
				})
				.in(
					'id',
					otherProposals.map((p) => p.id)
				);

			// Unlock their cards
			for (const otherProposal of otherProposals) {
				await unlockCardsForEntity(supabase, otherProposal.id);

				// Notify them
				await notifyProposalRejected(
					supabase,
					otherProposal.proposer_id,
					listing.title,
					"L'annonce a été complétée avec une autre proposition"
				);
			}
		}

		// Create notification for accepted proposer
		await notifyProposalAccepted(supabase, proposal.proposer_id, listing.title, trade.id);

		// Invalidate caches for both participants
		// TODO: Implement cache invalidation
		// await invalidateMarketplaceCaches(listing.creator_id, proposal.proposer_id);
		// await invalidateTeacherCachesForStudents(supabase, [listing.creator_id, proposal.proposer_id]);

		return json({
			...proposal,
			status: 'accepted',
			response_message,
			responded_at: new Date().toISOString(),
			trade_id: trade.id
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
