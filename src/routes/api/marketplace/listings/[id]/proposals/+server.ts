import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { createProposalSchema } from '$lib/server/marketplace/validation';
import {
	validateCardOwnership,
	checkCardsUnused,
	lockCardsForEntity,
	isMarketplaceEnabled,
	createMarketplaceNotification,
	getStudentGidouilles
} from '$lib/server/marketplace/helpers';
import { z } from 'zod';

// ID validation schema
const idSchema = z.string().uuid("ID d'annonce invalide");

/**
 * GET /api/marketplace/listings/[id]/proposals
 * Get proposals for a listing (owner only)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate listing ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const listingId = idValidation.data;

	// Verify user owns the listing
	const { data: listing, error: listingError } = await supabase
		.from('marketplace_listings')
		.select('creator_id')
		.eq('id', listingId)
		.single();

	if (listingError || !listing) {
		throw error(404, 'Annonce non trouvée');
	}

	if (listing.creator_id !== userId) {
		throw error(403, 'Vous ne pouvez pas voir les propositions de cette annonce');
	}

	// Fetch proposals with proposer info
	const { data: proposals, error: proposalsError } = await supabase
		.from('marketplace_proposals')
		.select(
			`
      *,
      proposer:profiles!marketplace_proposals_proposer_id_fkey(
        id,
        username,
        avatar_url
      )
    `
		)
		.eq('listing_id', listingId)
		.order('created_at', { ascending: false });

	if (proposalsError) {
		console.error('Error fetching proposals:', proposalsError);
		throw error(500, 'Erreur lors de la récupération des propositions');
	}

	return json(proposals || []);
};

/**
 * POST /api/marketplace/listings/[id]/proposals
 * Submit a proposal for a listing
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate listing ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const listingId = idValidation.data;

	// Validate request body
	const body = await request.json().catch(() => ({}));

	// Override listing_id from params to ensure consistency
	const proposalData = { ...body, listing_id: listingId };
	const validation = createProposalSchema.safeParse(proposalData);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	// Check if marketplace is enabled
	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour votre classe");
	}

	// Verify listing exists and is active
	const { data: listing, error: listingError } = await supabase
		.from('marketplace_listings')
		.select('*')
		.eq('id', listingId)
		.single();

	if (listingError || !listing) {
		throw error(404, 'Annonce non trouvée');
	}

	if (listing.status !== 'active') {
		throw error(403, "Cette annonce n'est plus active");
	}

	if (listing.creator_id === userId) {
		throw error(403, 'Vous ne pouvez pas faire une proposition sur votre propre annonce');
	}

	// Check if user already has a proposal for this listing
	const { data: existingProposal } = await supabase
		.from('marketplace_proposals')
		.select('id')
		.eq('listing_id', listingId)
		.eq('proposer_id', userId)
		.eq('status', 'pending')
		.single();

	if (existingProposal) {
		throw error(403, 'Vous avez déjà une proposition en cours pour cette annonce');
	}

	// Validate card ownership if offering cards
	if (data.offered_card_ids.length > 0) {
		const ownsCards = await validateCardOwnership(supabase, userId, data.offered_card_ids);
		if (!ownsCards) {
			throw error(403, 'Vous ne possédez pas toutes les cartes spécifiées');
		}

		const cardsUnused = await checkCardsUnused(supabase, data.offered_card_ids);
		if (!cardsUnused) {
			throw error(403, 'Certaines cartes ont déjà été utilisées');
		}
	}

	// Validate user has enough gidouilles if offering them
	if (data.offered_gidouilles > 0) {
		const userGidouilles = await getStudentGidouilles(supabase, userId);
		if (userGidouilles < data.offered_gidouilles) {
			throw error(403, "Vous n'avez pas assez de gidouilles");
		}
	}

	// Create the proposal
	const { data: proposal, error: proposalError } = await supabase
		.from('marketplace_proposals')
		.insert({
			listing_id: listingId,
			proposer_id: userId,
			offered_card_ids: data.offered_card_ids,
			offered_gidouilles: data.offered_gidouilles,
			message: data.message || null,
			status: 'pending'
		})
		.select(
			`
      *,
      proposer:profiles!marketplace_proposals_proposer_id_fkey(
        id,
        username,
        avatar_url
      )
    `
		)
		.single();

	if (proposalError) {
		console.error('Error creating proposal:', proposalError);
		throw error(500, 'Erreur lors de la création de la proposition');
	}

	// Lock cards if offering any
	if (data.offered_card_ids.length > 0) {
		const lockResult = await lockCardsForEntity(
			supabase,
			userId,
			data.offered_card_ids,
			proposal.id,
			'listing'
		);

		if (!lockResult.success) {
			// Rollback: delete the proposal
			await supabase.from('marketplace_proposals').delete().eq('id', proposal.id);

			throw error(500, lockResult.error || 'Erreur lors du verrouillage des cartes');
		}
	}

	// Increment listing proposal count
	await supabase
		.from('marketplace_listings')
		.update({
			proposal_count: listing.proposal_count + 1,
			updated_at: new Date().toISOString()
		})
		.eq('id', listingId);

	// Create notification for listing creator
	await createMarketplaceNotification(supabase, listing.creator_id, 'proposal_received', {
		listing_id: listingId,
		proposal_id: proposal.id,
		listing_title: listing.title
	});

	return json(proposal, { status: 201 });
};
