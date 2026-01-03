import { z } from 'zod';

// ============================================================================
// LISTING SCHEMAS
// ============================================================================

/**
 * Schema for creating a new marketplace listing
 */
export const createListingSchema = z
	.object({
		listing_type: z.enum(['sell', 'buy']),

		// Offered items (for 'sell' listings)
		offered_card_ids: z
			.array(z.string().uuid('ID de carte invalide'))
			.max(10, 'Maximum 10 cartes peuvent être offertes')
			.default([]),
		offered_gidouilles: z
			.number()
			.int('Les gidouilles doivent être un nombre entier')
			.min(0, 'Les gidouilles ne peuvent pas être négatives')
			.max(10000, 'Maximum 10000 gidouilles')
			.finite('La valeur doit être un nombre fini')
			.default(0),

		// Wanted items (for both listing types)
		wanted_card_template_ids: z
			.array(z.string().uuid('ID de modèle de carte invalide'))
			.max(10, 'Maximum 10 modèles de cartes peuvent être demandés')
			.default([]),
		wanted_gidouilles: z
			.number()
			.int('Les gidouilles doivent être un nombre entier')
			.min(0, 'Les gidouilles ne peuvent pas être négatives')
			.max(10000, 'Maximum 10000 gidouilles')
			.finite('La valeur doit être un nombre fini')
			.default(0),

		// Metadata
		title: z
			.string()
			.min(3, 'Le titre doit contenir au moins 3 caractères')
			.max(100, 'Le titre ne peut pas dépasser 100 caractères'),
		description: z
			.string()
			.max(500, 'La description ne peut pas dépasser 500 caractères')
			.optional()
	})
	.refine(
		(data) => {
			// For 'sell' listings, must offer something
			if (data.listing_type === 'sell') {
				return data.offered_card_ids.length > 0 || data.offered_gidouilles > 0;
			}
			// For 'buy' listings, must want something
			return data.wanted_card_template_ids.length > 0 || data.wanted_gidouilles > 0;
		},
		{
			message: 'Une annonce doit proposer ou demander au moins un élément'
		}
	);

/**
 * Schema for updating an existing listing
 */
export const updateListingSchema = z.object({
	title: z
		.string()
		.min(3, 'Le titre doit contenir au moins 3 caractères')
		.max(100, 'Le titre ne peut pas dépasser 100 caractères')
		.optional(),
	description: z.string().max(500, 'La description ne peut pas dépasser 500 caractères').optional(),
	wanted_card_template_ids: z
		.array(z.string().uuid('ID de modèle de carte invalide'))
		.max(10, 'Maximum 10 modèles de cartes peuvent être demandés')
		.optional(),
	wanted_gidouilles: z
		.number()
		.int('Les gidouilles doivent être un nombre entier')
		.min(0, 'Les gidouilles ne peuvent pas être négatives')
		.max(10000, 'Maximum 10000 gidouilles')
		.finite('La valeur doit être un nombre fini')
		.optional()
});

/**
 * Schema for querying listings with pagination and filters
 */
export const listingsQuerySchema = z.object({
	// Use nullish() before default() because url.searchParams.get() returns null, not undefined
	page: z
		.union([z.coerce.number().int().min(1).finite(), z.null()])
		.transform((val) => val ?? 1)
		.default(1),
	limit: z
		.union([z.coerce.number().int().min(1).max(50).finite(), z.null()])
		.transform((val) => val ?? 20)
		.default(20),
	type: z.enum(['sell', 'buy']).nullish(),
	card_template_id: z.string().uuid('ID de modèle de carte invalide').nullish()
});

// ============================================================================
// PROPOSAL SCHEMAS
// ============================================================================

/**
 * Schema for creating a proposal on a listing
 */
export const createProposalSchema = z
	.object({
		listing_id: z.string().uuid("ID d'annonce invalide"),
		offered_card_ids: z
			.array(z.string().uuid('ID de carte invalide'))
			.max(10, 'Maximum 10 cartes peuvent être offertes')
			.default([]),
		offered_gidouilles: z
			.number()
			.int('Les gidouilles doivent être un nombre entier')
			.min(0, 'Les gidouilles ne peuvent pas être négatives')
			.max(10000, 'Maximum 10000 gidouilles')
			.finite('La valeur doit être un nombre fini')
			.default(0),
		message: z.string().max(500, 'Le message ne peut pas dépasser 500 caractères').optional()
	})
	.refine((data) => data.offered_card_ids.length > 0 || data.offered_gidouilles > 0, {
		message: 'Une proposition doit contenir au moins une carte ou des gidouilles'
	});

/**
 * Schema for updating a proposal (accept/reject)
 */
export const updateProposalSchema = z.object({
	status: z.enum(['accepted', 'rejected']),
	response_message: z.string().max(500, 'Le message ne peut pas dépasser 500 caractères').optional()
});

// ============================================================================
// TRADE SCHEMAS
// ============================================================================

/**
 * Schema for creating a new friend trade
 */
export const createTradeSchema = z.object({
	partner_id: z.string().uuid('ID du partenaire invalide'),
	initial_offer: z.object({
		cards: z
			.array(z.string().uuid('ID de carte invalide'))
			.max(10, 'Maximum 10 cartes peuvent être offertes')
			.default([]),
		gidouilles: z
			.number()
			.int('Les gidouilles doivent être un nombre entier')
			.min(0, 'Les gidouilles ne peuvent pas être négatives')
			.max(10000, 'Maximum 10000 gidouilles')
			.finite('La valeur doit être un nombre fini')
			.default(0)
	})
});

/**
 * Schema for creating a counter-offer in a trade
 */
export const createOfferSchema = z.object({
	trade_id: z.string().uuid("ID d'échange invalide"),
	initiator_cards: z
		.array(z.string().uuid('ID de carte invalide'))
		.max(10, 'Maximum 10 cartes')
		.default([]),
	initiator_gidouilles: z
		.number()
		.int('Les gidouilles doivent être un nombre entier')
		.min(0, 'Les gidouilles ne peuvent pas être négatives')
		.max(10000, 'Maximum 10000 gidouilles')
		.finite('La valeur doit être un nombre fini')
		.default(0),
	partner_cards: z
		.array(z.string().uuid('ID de carte invalide'))
		.max(10, 'Maximum 10 cartes')
		.default([]),
	partner_gidouilles: z
		.number()
		.int('Les gidouilles doivent être un nombre entier')
		.min(0, 'Les gidouilles ne peuvent pas être négatives')
		.max(10000, 'Maximum 10000 gidouilles')
		.finite('La valeur doit être un nombre fini')
		.default(0),
	message: z.string().max(500, 'Le message ne peut pas dépasser 500 caractères').optional()
});

/**
 * Schema for accepting a trade
 */
export const acceptTradeSchema = z.object({
	trade_id: z.string().uuid("ID d'échange invalide")
});

// ============================================================================
// CONFIG SCHEMAS
// ============================================================================

/**
 * Schema for updating marketplace configuration
 */
export const updateConfigSchema = z.object({
	enabled_for_class: z.boolean().optional(),
	max_listings_per_student: z
		.number()
		.int('Le maximum doit être un nombre entier')
		.min(1, 'Le maximum doit être au moins 1')
		.max(10, 'Le maximum ne peut pas dépasser 10')
		.finite('La valeur doit être un nombre fini')
		.optional(),
	max_trades_per_day: z
		.number()
		.int('Le maximum doit être un nombre entier')
		.min(1, 'Le maximum doit être au moins 1')
		.max(20, 'Le maximum ne peut pas dépasser 20')
		.finite('La valeur doit être un nombre fini')
		.optional()
});

// ============================================================================
// CHAT SCHEMAS
// ============================================================================

/**
 * Schema for sending a chat message in a trade
 */
export const chatMessageSchema = z.object({
	trade_id: z.string().uuid("ID d'échange invalide"),
	message: z
		.string()
		.min(1, 'Le message ne peut pas être vide')
		.max(500, 'Le message ne peut pas dépasser 500 caractères')
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

/**
 * Schema for admin trade history query
 */
export const adminTradesQuerySchema = z.object({
	class_id: z.string().uuid('ID de classe invalide').nullish(),
	student_id: z.string().uuid("ID d'élève invalide").nullish(),
	status: z.enum(['negotiating', 'completed', 'cancelled']).nullish(),
	date_from: z.string().datetime('Format de date invalide').nullish(),
	date_to: z.string().datetime('Format de date invalide').nullish(),
	// Use union with null because url.searchParams.get() returns null, not undefined
	page: z
		.union([z.coerce.number().int().min(1).finite(), z.null()])
		.transform((val) => val ?? 1)
		.default(1),
	limit: z
		.union([z.coerce.number().int().min(1).max(100).finite(), z.null()])
		.transform((val) => val ?? 50)
		.default(50)
});

/**
 * Schema for admin statistics query
 */
export const adminStatsQuerySchema = z.object({
	class_id: z.string().uuid('ID de classe invalide').nullish(),
	period: z.enum(['day', 'week', 'month']).nullish().default('week')
});
