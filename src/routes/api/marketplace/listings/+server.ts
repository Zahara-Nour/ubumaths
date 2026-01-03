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
	getStudentSchoolId,
	enrichListingsWithCardData
} from '$lib/server/marketplace/helpers';
// TODO: Add cache invalidation when cache-manager is properly implemented
// import { invalidateListingCaches } from '$lib/server/marketplace/cache-manager';

/**
 * GET /api/marketplace/listings
 * Fetch listings with pagination and filters
 * Supports students (sees their school's listings) and teachers/admins (monitoring)
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

	// Get user profile to check role
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role, school_id')
		.eq('id', userId)
		.single();

	if (profileError || !profile) {
		throw error(404, 'Profil non trouvé');
	}

	let schoolId: string;

	// Teachers and admins can view listings for monitoring purposes
	if (profile.role === 'teacher' || profile.role === 'admin') {
		if (!profile.school_id) {
			throw error(404, 'École non trouvée');
		}
		schoolId = profile.school_id;
	} else {
		// For students, check if marketplace is enabled
		const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
		if (!marketplaceEnabled) {
			throw error(403, "Le marketplace n'est pas activé pour votre classe");
		}

		// Get student's school ID
		const studentSchoolId = await getStudentSchoolId(supabase, userId);
		if (!studentSchoolId) {
			throw error(404, 'École non trouvée');
		}
		schoolId = studentSchoolId;
	}

	// Build query - use column hint instead of FK name for better compatibility
	let query = supabase
		.from('marketplace_listings')
		.select(
			`
      *,
      creator:creator_id(
        id,
        firstname,
        lastname,
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
			// Batch record views for all listings in a single database call
			// This prevents N+1 query problem and significantly improves performance
			void (async () => {
				try {
					const { data: viewResult, error: viewError } = await supabase.rpc(
						'record_listing_views_batch',
						{
							p_listing_ids: otherListingIds,
							p_user_id: userId
						}
					);

					if (viewError) {
						console.error('Error recording batch views:', viewError);
					} else if (viewResult?.new_views > 0) {
						console.log(`Recorded ${viewResult.new_views} new unique views`);
					}
				} catch (err) {
					console.error('Error recording batch views:', err);
				}
			})();
		}
	}

	// Enrich listings with card template data
	const enrichedListings = await enrichListingsWithCardData(supabase, listings || []);

	return json({
		listings: enrichedListings,
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
	if (data.listing_type === 'sell') {
		// Validate cards if offered
		if (data.offered_card_ids.length > 0) {
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
      creator:creator_id(
        id,
        firstname,
        lastname,
        avatar_url
      )
    `
		)
		.single();

	if (listingError) {
		console.error('Error creating listing:', listingError);
		throw error(500, "Erreur lors de la création de l'annonce");
	}

	// Lock cards if this is a 'sell' listing
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

	// Enrich the newly created listing with card template data
	const [enrichedListing] = await enrichListingsWithCardData(supabase, [listing]);

	return json(enrichedListing, { status: 201 });
};
