import { z } from 'zod';

// ============================================================================
// LISTING SCHEMAS
// ============================================================================

/**
 * Schema for creating a new marketplace listing
 */
export const createListingSchema = z
	.object({
		listing_type: z.enum(['sell', 'buy'], { error: 'Type d’annonce inconnu' }),

		// Offered items (for 'sell' listings)
		offered_card_ids: z
			.array(z.string().uuid('ID de carte invalide'), { error: 'Liste de cartes invalide' })
			.default([]),
		offered_gidouilles: z
			.number({ error: 'Les gidouilles doivent être un nombre' })
			.int('Les gidouilles doivent être un nombre entier')
			.min(0, 'Les gidouilles ne peuvent pas être négatives')
			.max(10000, 'Maximum 10000 gidouilles')
			.finite('La valeur doit être un nombre fini')
			.default(0),

		// Wanted items (for both listing types)
		wanted_card_template_ids: z
			.array(z.string().min(1, 'ID de modèle de carte invalide'), {
				error: 'Liste de cartes demandées invalide'
			})
			.default([]),
		wanted_gidouilles: z
			.number({ error: 'Les gidouilles doivent être un nombre' })
			.int('Les gidouilles doivent être un nombre entier')
			.min(0, 'Les gidouilles ne peuvent pas être négatives')
			.max(10000, 'Maximum 10000 gidouilles')
			.finite('La valeur doit être un nombre fini')
			.default(0),

		// Metadata
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
	wanted_card_template_ids: z
		.array(z.string().min(1, 'ID de modèle de carte invalide'))
		.max(10, 'Maximum 10 modèles de cartes peuvent être demandés')
		.optional(),
	wanted_gidouilles: z
		.number({ error: 'Les gidouilles doivent être un nombre' })
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
	page: z.coerce
		.number()
		.int('Le numéro de page doit être un entier')
		.min(1, 'Le numéro de page doit être au moins 1')
		.finite('La valeur doit être un nombre fini')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit être un entier')
		.min(1, 'La limite doit être au moins 1')
		.max(50, 'La limite ne peut pas dépasser 50')
		.finite('La valeur doit être un nombre fini')
		.default(20),
	type: z.enum(['sell', 'buy']).optional(),
	card_template_id: z.string().min(1, 'ID de modèle de carte invalide').optional()
});

// ============================================================================
// PROPOSAL SCHEMAS
// ============================================================================

/**
 * Schema for creating a proposal on a listing
 */
export const createProposalSchema = z
	.object({
		listing_id: z.string({ error: 'Annonce manquante' }).uuid("ID d'annonce invalide"),
		offered_card_ids: z
			.array(z.string().uuid('ID de carte invalide'), { error: 'Liste de cartes invalide' })
			.default([]),
		offered_gidouilles: z
			.number({ error: 'Les gidouilles doivent être un nombre' })
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
	status: z.enum(['accepted', 'rejected'], { error: 'Réponse inconnue : accepter ou refuser' }),
	response_message: z.string().max(500, 'Le message ne peut pas dépasser 500 caractères').optional()
});

// ============================================================================
// TRADE SCHEMAS
// ============================================================================

/**
 * Schema for creating a new friend trade
 */
export const createTradeSchema = z.object({
	partner_id: z
		.string({ error: 'Partenaire d’échange manquant' })
		.uuid('ID du partenaire invalide'),
	initial_offer: z.object(
		{
			cards: z
				.array(z.string().uuid('ID de carte invalide'), { error: 'Liste de cartes invalide' })
				.default([]),
			gidouilles: z
				.number({ error: 'Les gidouilles doivent être un nombre' })
				.int('Les gidouilles doivent être un nombre entier')
				.min(0, 'Les gidouilles ne peuvent pas être négatives')
				.max(10000, 'Maximum 10000 gidouilles')
				.finite('La valeur doit être un nombre fini')
				.default(0)
		},
		{ error: 'Offre d’échange manquante' }
	)
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
		.number({ error: 'Le maximum doit être un nombre' })
		.int('Le maximum doit être un nombre entier')
		.min(1, 'Le maximum doit être au moins 1')
		.max(10, 'Le maximum ne peut pas dépasser 10')
		.finite('La valeur doit être un nombre fini')
		.optional(),
	max_trades_per_day: z
		.number({ error: 'Le maximum doit être un nombre' })
		.int('Le maximum doit être un nombre entier')
		.min(1, 'Le maximum doit être au moins 1')
		.max(20, 'Le maximum ne peut pas dépasser 20')
		.finite('La valeur doit être un nombre fini')
		.optional()
});

/**
 * Réglages du marché saisis par le professeur (`MarketplaceSettings.svelte`).
 * Validé dans le navigateur, où Zod parle anglais : chaque refus, y compris un
 * champ vidé (NaN), porte son message.
 */
export const marketplaceSettingsSchema = z.object({
	enabled_for_class: z.boolean({ error: 'Activer ou désactiver le marché' }),
	max_listings_per_student: z
		.number({ error: 'Le nombre d’annonces doit être un nombre' })
		.int('Doit être un nombre entier')
		.min(1, 'Minimum 1 annonce')
		.max(10, 'Maximum 10 annonces')
		.finite('La valeur doit être un nombre fini'),
	max_trades_per_day: z
		.number({ error: 'Le nombre d’échanges doit être un nombre' })
		.int('Doit être un nombre entier')
		.min(1, 'Minimum 1 échange')
		.max(20, 'Maximum 20 échanges')
		.finite('La valeur doit être un nombre fini')
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
	class_id: z.string().uuid('ID de classe invalide').optional(),
	student_id: z.string().uuid("ID d'élève invalide").optional(),
	status: z.enum(['negotiating', 'completed', 'cancelled']).optional(),
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional(),
	page: z.coerce
		.number()
		.int('Le numéro de page doit être un entier')
		.min(1, 'Le numéro de page doit être au moins 1')
		.finite('La valeur doit être un nombre fini')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit être un entier')
		.min(1, 'La limite doit être au moins 1')
		.max(100, 'La limite ne peut pas dépasser 100')
		.finite('La valeur doit être un nombre fini')
		.default(50)
});

/**
 * Schema for admin statistics query
 */
export const adminStatsQuerySchema = z.object({
	class_id: z.string().uuid('ID de classe invalide').optional(),
	period: z.enum(['day', 'week', 'month']).default('week')
});
