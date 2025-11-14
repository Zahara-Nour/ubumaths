import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { createListingSchema, listingsQuerySchema } from '$lib/server/marketplace/validation';
import {
	validateCardOwnership,
	checkCardsUnused,
	lockCardsForEntity,
	checkActiveListingsLimit,
	isMarketplaceEnabled,
	getStudentSchoolId
} from '$lib/server/marketplace/helpers';
// TODO: Add cache invalidation when cache-manager is properly implemented
// import { invalidateListingCaches } from '$lib/server/marketplace/cache-manager';

/**
 * GET /api/marketplace/listings
 * Fetch listings with pagination and filters
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate query parameters
	const queryValidation = listingsQuerySchema.safeParse({
		page: url.searchParams.get('page'),
		limit: url.searchParams.get('limit'),
		type: url.searchParams.get('type'),
		card_template_id: url.searchParams.get('card_template_id')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { page, limit, type, card_template_id } = queryValidation.data;

	// Check if marketplace is enabled for this user
	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour votre classe");
	}

	// Get user's school ID for filtering
	const schoolId = await getStudentSchoolId(supabase, userId);
	if (!schoolId) {
		throw error(404, 'École non trouvée');
	}

	// Build query
	let query = supabase
		.from('marketplace_listings')
		.select(
			`
      *,
      creator:profiles!marketplace_listings_creator_id_fkey(
        id,
        username,
        avatar_url
      )
    `,
			{ count: 'exact' }
		)
		.eq('school_id', schoolId)
		.eq('status', 'active')
		.order('created_at', { ascending: false });

	// Apply filters
	if (type) {
		query = query.eq('listing_type', type);
	}

	if (card_template_id) {
		// Filter by wanted card template
		query = query.contains('wanted_card_template_ids', [card_template_id]);
	}

	// Apply pagination
	const offset = (page - 1) * limit;
	query = query.range(offset, offset + limit - 1);

	const { data: listings, error: listingsError, count } = await query;

	if (listingsError) {
		console.error('Error fetching listings:', listingsError);
		throw error(500, 'Erreur lors de la récupération des annonces');
	}

	// Record unique views for listings not created by the current user
	// This prevents view count manipulation and tracks unique viewers
	if (listings && listings.length > 0) {
		const otherListingIds = listings
			.filter((listing) => listing.creator_id !== userId)
			.map((listing) => listing.id);

		if (otherListingIds.length > 0) {
			// Record views using the new RPC function (fire and forget)
			// The function handles deduplication and only increments for new unique views
			for (const listingId of otherListingIds) {
				void (async () => {
					try {
						const { data: viewResult, error: viewError } = await supabase.rpc(
							'record_listing_view',
							{
								p_listing_id: listingId,
								p_user_id: userId
								// Note: IP address tracking could be added here if needed for additional security
							}
						);

						if (viewError) {
							console.error(`Error recording view for listing ${listingId}:`, viewError);
						} else if (viewResult?.is_new_view) {
							console.log(`Recorded new unique view for listing ${listingId}`);
						}
					} catch (err) {
						console.error(`Error recording view for listing ${listingId}:`, err);
					}
				})();
			}
		}
	}

	return json({
		listings: listings || [],
		pagination: {
			page,
			limit,
			total: count || 0,
			totalPages: Math.ceil((count || 0) / limit)
		}
	});
};

/**
 * POST /api/marketplace/listings
 * Create a new marketplace listing
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate request body
	const body = await request.json().catch(() => ({}));
	const validation = createListingSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	// Check if marketplace is enabled
	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour votre classe");
	}

	// Check active listings limit
	const withinLimit = await checkActiveListingsLimit(supabase, userId);
	if (!withinLimit) {
		throw error(403, "Vous avez atteint le nombre maximum d'annonces actives");
	}

	// For 'sell' listings, validate card ownership and availability
	if (data.listing_type === 'sell' && data.offered_card_ids.length > 0) {
		// Verify ownership
		const ownsCards = await validateCardOwnership(supabase, userId, data.offered_card_ids);
		if (!ownsCards) {
			throw error(403, 'Vous ne possédez pas toutes les cartes spécifiées');
		}

		// Verify cards are unused
		const cardsUnused = await checkCardsUnused(supabase, data.offered_card_ids);
		if (!cardsUnused) {
			throw error(403, 'Certaines cartes ont déjà été utilisées');
		}
	}

	// Get school ID
	const schoolId = await getStudentSchoolId(supabase, userId);
	if (!schoolId) {
		throw error(404, 'École non trouvée');
	}

	// Calculate expiration date (7 days from now)
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7);

	// Create the listing
	const { data: listing, error: listingError } = await supabase
		.from('marketplace_listings')
		.insert({
			creator_id: userId,
			school_id: schoolId,
			listing_type: data.listing_type,
			title: data.title,
			description: data.description || null,
			offered_card_ids: data.offered_card_ids,
			offered_gidouilles: data.offered_gidouilles,
			wanted_card_template_ids: data.wanted_card_template_ids,
			wanted_gidouilles: data.wanted_gidouilles,
			status: 'active',
			expires_at: expiresAt.toISOString()
		})
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

	if (listingError) {
		console.error('Error creating listing:', listingError);
		throw error(500, "Erreur lors de la création de l'annonce");
	}

	// Lock cards if this is a 'sell' listing with cards
	if (data.listing_type === 'sell' && data.offered_card_ids.length > 0) {
		const lockResult = await lockCardsForEntity(
			supabase,
			userId,
			data.offered_card_ids,
			listing.id,
			'listing'
		);

		if (!lockResult.success) {
			// Rollback: delete the listing
			await supabase.from('marketplace_listings').delete().eq('id', listing.id);

			throw error(500, lockResult.error || 'Erreur lors du verrouillage des cartes');
		}
	}

	// TODO: Invalidate caches when cache-manager is implemented
	// await invalidateListingCaches(supabase, userId);

	return json(listing, { status: 201 });
};
