import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { createTradeSchema } from '$lib/server/marketplace/validation';
import {
	validateCardOwnership,
	checkCardsUnused,
	lockCardsForEntity,
	isMarketplaceEnabled,
	verifyFriendship,
	createMarketplaceNotification,
	getStudentGidouilles
} from '$lib/server/marketplace/helpers';
import { z } from 'zod';

// Query schema
const tradesQuerySchema = z.object({
	status: z.enum(['negotiating', 'completed', 'cancelled']).optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(50).default(20)
});

/**
 * GET /api/marketplace/trades
 * Get user's active trades
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate query parameters
	const queryValidation = tradesQuerySchema.safeParse({
		status: url.searchParams.get('status'),
		page: url.searchParams.get('page'),
		limit: url.searchParams.get('limit')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { status, page, limit } = queryValidation.data;

	// Check if marketplace is enabled
	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour votre classe");
	}

	// Build query
	let query = supabase
		.from('marketplace_trades')
		.select(
			`
      *,
      initiator:profiles!marketplace_trades_initiator_id_fkey(
        id,
        username,
        avatar_url
      ),
      partner:profiles!marketplace_trades_partner_id_fkey(
        id,
        username,
        avatar_url
      ),
      latest_offer:marketplace_trade_offers(
        *
      )
    `,
			{ count: 'exact' }
		)
		.or(`initiator_id.eq.${userId},partner_id.eq.${userId}`)
		.order('created_at', { ascending: false });

	// Apply status filter
	if (status) {
		query = query.eq('status', status);
	}

	// Apply pagination
	const offset = (page - 1) * limit;
	query = query.range(offset, offset + limit - 1);

	// Add ordering for nested offers
	query = query.order('created_at', {
		foreignTable: 'latest_offer',
		ascending: false
	});

	const { data: trades, error: tradesError, count } = await query;

	if (tradesError) {
		console.error('Error fetching trades:', tradesError);
		throw error(500, 'Erreur lors de la récupération des échanges');
	}

	// Process trades to include only the latest offer
	const processedTrades = (trades || []).map((trade) => ({
		...trade,
		latest_offer: trade.latest_offer?.[0] || null
	}));

	return json({
		trades: processedTrades,
		pagination: {
			page,
			limit,
			total: count || 0,
			totalPages: Math.ceil((count || 0) / limit)
		}
	});
};

/**
 * POST /api/marketplace/trades
 * Initiate a friend trade
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate request body
	const body = await request.json().catch(() => ({}));
	const validation = createTradeSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { partner_id, initial_offer } = validation.data;

	// Check if marketplace is enabled for initiator
	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour votre classe");
	}

	// Check if marketplace is enabled for partner
	const partnerMarketplaceEnabled = await isMarketplaceEnabled(supabase, partner_id);
	if (!partnerMarketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour le partenaire");
	}

	// Verify friendship exists
	const areFriends = await verifyFriendship(supabase, userId, partner_id);
	if (!areFriends) {
		throw error(403, 'Vous devez être amis pour échanger');
	}

	// Check for existing active trade between these users
	const { data: existingTrade } = await supabase
		.from('marketplace_trades')
		.select('id')
		.or(
			`and(initiator_id.eq.${userId},partner_id.eq.${partner_id}),and(initiator_id.eq.${partner_id},partner_id.eq.${userId})`
		)
		.eq('status', 'negotiating')
		.limit(1)
		.single();

	if (existingTrade) {
		throw error(403, 'Vous avez déjà un échange en cours avec cet ami');
	}

	// Validate card ownership if offering cards
	if (initial_offer.cards.length > 0) {
		const ownsCards = await validateCardOwnership(supabase, userId, initial_offer.cards);
		if (!ownsCards) {
			throw error(403, 'Vous ne possédez pas toutes les cartes spécifiées');
		}

		const cardsUnused = await checkCardsUnused(supabase, initial_offer.cards);
		if (!cardsUnused) {
			throw error(403, 'Certaines cartes ont déjà été utilisées');
		}
	}

	// Validate user has enough gidouilles if offering them
	if (initial_offer.gidouilles > 0) {
		const userGidouilles = await getStudentGidouilles(supabase, userId);
		if (userGidouilles < initial_offer.gidouilles) {
			throw error(403, "Vous n'avez pas assez de gidouilles");
		}
	}

	// Create the trade
	const { data: trade, error: tradeError } = await supabase
		.from('marketplace_trades')
		.insert({
			initiator_id: userId,
			partner_id: partner_id,
			type: 'friend',
			status: 'negotiating',
			current_offer: {
				initiator_cards: initial_offer.cards,
				initiator_gidouilles: initial_offer.gidouilles,
				partner_cards: [],
				partner_gidouilles: 0
			}
		})
		.select(
			`
      *,
      initiator:profiles!marketplace_trades_initiator_id_fkey(
        id,
        username,
        avatar_url
      ),
      partner:profiles!marketplace_trades_partner_id_fkey(
        id,
        username,
        avatar_url
      )
    `
		)
		.single();

	if (tradeError) {
		console.error('Error creating trade:', tradeError);
		throw error(500, "Erreur lors de la création de l'échange");
	}

	// Create the first offer record
	const { error: offerError } = await supabase.from('marketplace_trade_offers').insert({
		trade_id: trade.id,
		offer_by: userId,
		initiator_cards: initial_offer.cards,
		initiator_gidouilles: initial_offer.gidouilles,
		partner_cards: [],
		partner_gidouilles: 0,
		message: null
	});

	if (offerError) {
		console.error('Error creating initial offer:', offerError);
		// Rollback: delete the trade
		await supabase.from('marketplace_trades').delete().eq('id', trade.id);
		throw error(500, "Erreur lors de la création de l'offre initiale");
	}

	// Lock cards if offering any
	if (initial_offer.cards.length > 0) {
		const lockResult = await lockCardsForEntity(
			supabase,
			userId,
			initial_offer.cards,
			trade.id,
			'trade'
		);

		if (!lockResult.success) {
			// Rollback: delete the trade and offer
			await supabase.from('marketplace_trades').delete().eq('id', trade.id);

			throw error(500, lockResult.error || 'Erreur lors du verrouillage des cartes');
		}
	}

	// Create notification for partner
	await createMarketplaceNotification(supabase, partner_id, 'trade_offer', {
		trade_id: trade.id,
		initiator_id: userId
	});

	return json(trade, { status: 201 });
};
