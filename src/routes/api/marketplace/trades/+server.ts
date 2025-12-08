import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { createTradeSchema } from '$lib/server/marketplace/validation';
import {
	validateCardOwnership,
	checkCardsUnused,
	lockCardsForEntity,
	unlockCardsForEntity,
	isMarketplaceEnabled,
	verifyFriendship,
	createMarketplaceNotification,
	getStudentGidouilles
} from '$lib/server/marketplace/helpers';
import {
	validateItemOwnership,
	checkItemsTradeable,
	checkItemsUnlocked,
	lockItemsForTrade
} from '$lib/server/marketplace/item-helpers';
import { z } from 'zod';

// Query schema
const tradesQuerySchema = z.object({
	status: z.enum(['negotiating', 'completed', 'cancelled']).nullish(),
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

	// Build query - use column hints instead of FK names for compatibility
	let query = supabase
		.from('marketplace_trades')
		.select(
			`
      *,
      initiator:initiator_id(
        id,
        firstname,
        lastname,
        avatar_url
      ),
      partner:partner_id(
        id,
        firstname,
        lastname,
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

	// Check daily trade limit for initiator
	const { data: limitCheck, error: limitError } = await supabase.rpc('check_daily_trade_limit', {
		p_user_id: userId
	});

	if (limitError) {
		console.error('Error checking trade limit:', limitError);
		throw error(500, 'Erreur lors de la vérification de la limite quotidienne');
	}

	if (!limitCheck.can_create_trade) {
		throw error(
			429, // 429 Too Many Requests
			`Vous avez atteint la limite quotidienne de ${limitCheck.max_trades} échanges. Revenez demain pour créer de nouveaux échanges.`
		);
	}

	// Check daily trade limit for partner (to prevent circumventing limits)
	const { data: partnerLimitCheck, error: partnerLimitError } = await supabase.rpc(
		'check_daily_trade_limit',
		{
			p_user_id: partner_id
		}
	);

	if (partnerLimitError) {
		console.error('Error checking partner trade limit:', partnerLimitError);
		throw error(500, 'Erreur lors de la vérification de la limite quotidienne du partenaire');
	}

	if (!partnerLimitCheck.can_create_trade) {
		throw error(
			429,
			`Votre ami a atteint sa limite quotidienne de ${partnerLimitCheck.max_trades} échanges. Réessayez demain.`
		);
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

	// Validate item ownership if offering items
	if (initial_offer.items.length > 0) {
		const ownsItems = await validateItemOwnership(supabase, userId, initial_offer.items);
		if (!ownsItems) {
			throw error(403, 'Vous ne possédez pas tous les objets spécifiés');
		}

		const itemsTradeable = await checkItemsTradeable(supabase, initial_offer.items);
		if (!itemsTradeable) {
			throw error(
				403,
				'Certains objets ne sont pas échangeables ou sont en période de restriction'
			);
		}

		const itemsUnlocked = await checkItemsUnlocked(supabase, initial_offer.items);
		if (!itemsUnlocked) {
			throw error(403, 'Certains objets sont déjà verrouillés pour une autre transaction');
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
				initiator_items: initial_offer.items,
				initiator_gidouilles: initial_offer.gidouilles,
				partner_cards: [],
				partner_items: [],
				partner_gidouilles: 0
			}
		})
		.select(
			`
      *,
      initiator:initiator_id(
        id,
        firstname,
        lastname,
        avatar_url
      ),
      partner:partner_id(
        id,
        firstname,
        lastname,
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
		initiator_items: initial_offer.items,
		initiator_gidouilles: initial_offer.gidouilles,
		partner_cards: [],
		partner_items: [],
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

	// Lock items if offering any
	if (initial_offer.items.length > 0) {
		const lockResult = await lockItemsForTrade(supabase, userId, initial_offer.items, trade.id);

		if (!lockResult.success) {
			// Rollback: delete the trade and unlock cards if they were locked
			await supabase.from('marketplace_trades').delete().eq('id', trade.id);
			if (initial_offer.cards.length > 0) {
				await unlockCardsForEntity(supabase, trade.id);
			}

			throw error(500, lockResult.error || 'Erreur lors du verrouillage des objets');
		}
	}

	// Create notification for partner
	await createMarketplaceNotification(supabase, partner_id, 'trade_offer', {
		trade_id: trade.id,
		initiator_id: userId
	});

	return json(trade, { status: 201 });
};
