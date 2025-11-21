import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { updateListingSchema } from '$lib/server/marketplace/validation';
import { unlockCardsForEntity, isMarketplaceEnabled } from '$lib/server/marketplace/helpers';
import {
	unlockItems,
	getItemDetails,
	getItemTemplateDetails
} from '$lib/server/marketplace/item-helpers';
// TODO: Implement cache invalidation
// import { invalidateListingCaches } from '$lib/server/marketplace/cache-manager';
import { z } from 'zod';

// ID validation schema
const idSchema = z.string().uuid("ID d'annonce invalide");

/**
 * GET /api/marketplace/listings/[id]
 * Get listing details
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

	// Check if marketplace is enabled
	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour votre classe");
	}

	// Fetch listing with creator info
	const { data: listing, error: listingError } = await supabase
		.from('marketplace_listings')
		.select(
			`
      *,
      creator:profiles!marketplace_listings_creator_id_fkey(
        id,
        username,
        avatar_url
      )
    `
		)
		.eq('id', listingId)
		.single();

	if (listingError || !listing) {
		throw error(404, 'Annonce non trouvée');
	}

	// Enrich listing with item details
	const offeredItems =
		listing.offered_item_ids?.length > 0
			? await getItemDetails(supabase, listing.offered_item_ids)
			: [];

	const wantedItemTemplates =
		listing.wanted_item_template_ids?.length > 0
			? await getItemTemplateDetails(supabase, listing.wanted_item_template_ids)
			: [];

	// If user is the owner, include proposals with item details
	let proposals = null;
	if (listing.creator_id === userId) {
		const { data: proposalData } = await supabase
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
			.eq('status', 'pending')
			.order('created_at', { ascending: false });

		// Enrich proposals with item details
		if (proposalData && proposalData.length > 0) {
			proposals = await Promise.all(
				proposalData.map(async (proposal) => {
					const proposalOfferedItems =
						proposal.offered_item_ids?.length > 0
							? await getItemDetails(supabase, proposal.offered_item_ids)
							: [];

					return {
						...proposal,
						offered_items: proposalOfferedItems
					};
				})
			);
		} else {
			proposals = [];
		}
	}

	// Increment view count if not the owner
	if (listing.creator_id !== userId) {
		// Fire and forget
		// Fire and forget the view count update
		void (async () => {
			try {
				await supabase
					.from('marketplace_listings')
					.update({ view_count: listing.view_count + 1 })
					.eq('id', listingId);
			} catch (err) {
				console.error('Error incrementing view count:', err);
			}
		})();
	}

	return json({
		...listing,
		offered_items: offeredItems,
		wanted_item_templates: wantedItemTemplates,
		proposals: proposals || undefined
	});
};

/**
 * PATCH /api/marketplace/listings/[id]
 * Update a listing
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
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
	const validation = updateListingSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const updates = validation.data;

	// Verify user owns the listing
	const { data: listing, error: listingError } = await supabase
		.from('marketplace_listings')
		.select('creator_id, status')
		.eq('id', listingId)
		.single();

	if (listingError || !listing) {
		throw error(404, 'Annonce non trouvée');
	}

	if (listing.creator_id !== userId) {
		throw error(403, 'Vous ne pouvez pas modifier cette annonce');
	}

	if (listing.status !== 'active') {
		throw error(403, "Cette annonce n'est plus active");
	}

	// Update the listing
	const { data: updatedListing, error: updateError } = await supabase
		.from('marketplace_listings')
		.update({
			...updates,
			updated_at: new Date().toISOString()
		})
		.eq('id', listingId)
		.select(
			`
      *,
      creator:profiles!marketplace_listings_creator_id_fkey(
        id,
        username,
        avatar_url
      )
    `
		)
		.single();

	if (updateError) {
		console.error('Error updating listing:', updateError);
		throw error(500, "Erreur lors de la mise à jour de l'annonce");
	}

	// Invalidate caches
	// TODO: await invalidateListingCaches(supabase, userId);

	return json(updatedListing);
};

/**
 * DELETE /api/marketplace/listings/[id]
 * Cancel a listing
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
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
		.select('creator_id, status')
		.eq('id', listingId)
		.single();

	if (listingError || !listing) {
		throw error(404, 'Annonce non trouvée');
	}

	if (listing.creator_id !== userId) {
		throw error(403, 'Vous ne pouvez pas annuler cette annonce');
	}

	if (listing.status !== 'active') {
		throw error(403, "Cette annonce n'est plus active");
	}

	// Update listing status to cancelled
	const { error: updateError } = await supabase
		.from('marketplace_listings')
		.update({
			status: 'cancelled',
			updated_at: new Date().toISOString()
		})
		.eq('id', listingId);

	if (updateError) {
		console.error('Error cancelling listing:', updateError);
		throw error(500, "Erreur lors de l'annulation de l'annonce");
	}

	// Unlock any locked cards and items
	await unlockCardsForEntity(supabase, listingId);
	await unlockItems(supabase, listingId, 'listing');

	// Also unlock cards and items from any pending proposals (proposals are also considered listings for items)
	const { data: proposals } = await supabase
		.from('marketplace_proposals')
		.select('id')
		.eq('listing_id', listingId)
		.eq('status', 'pending');

	if (proposals && proposals.length > 0) {
		for (const proposal of proposals) {
			await unlockCardsForEntity(supabase, proposal.id);
			await unlockItems(supabase, proposal.id, 'listing');
		}
	}

	// Invalidate caches
	// TODO: await invalidateListingCaches(supabase, userId);

	return json({ success: true });
};
