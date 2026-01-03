import { z } from 'zod';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

/**
 * Shop item categories for organizing items in the store.
 */
export const shopItemCategorySchema = z.enum(['consumable', 'booster', 'cosmetic', 'utility']);

/**
 * Rarity levels affecting item value and availability.
 */
export const shopItemRaritySchema = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

/**
 * How the student acquired the item.
 */
export const itemAcquisitionSourceSchema = z.enum(['shop', 'trade', 'reward', 'gift', 'migration']);

// ============================================================================
// PROPERTIES SCHEMAS (JSONB)
// ============================================================================

/**
 * Flexible properties for different item types.
 * Uses passthrough() to allow additional properties.
 */
export const shopItemPropertiesSchema = z
	.object({
		stackable: z.boolean().optional(),
		uses: z
			.number()
			.int("Le nombre d'utilisations doit etre un entier")
			.positive("Le nombre d'utilisations doit etre positif")
			.max(1000, 'Maximum 1000 utilisations')
			.optional(),
		game: z.string().max(50, 'Nom du jeu trop long').optional(),
		effect: z.string().max(100, "Identifiant d'effet trop long").optional(),
		duration_minutes: z
			.number()
			.int('La duree doit etre un entier')
			.positive('La duree doit etre positive')
			.max(10080, 'Duree maximum: 1 semaine (10080 minutes)')
			.optional(),
		multiplier: z
			.number()
			.positive('Le multiplicateur doit etre positif')
			.max(10, 'Multiplicateur maximum: 10')
			.optional(),
		applicable_to: z.array(z.string().max(50)).max(20, 'Maximum 20 applications').optional(),
		theme: z.string().max(50, 'Theme trop long').optional(),
		color: z.string().max(20, 'Couleur invalide').optional(),
		animation: z.string().max(50, 'Animation trop longue').optional()
	})
	.passthrough();

/**
 * Item acquisition context data.
 */
export const itemAcquisitionDataSchema = z
	.object({
		purchase_id: z.string().uuid("ID d'achat invalide").optional(),
		trade_id: z.string().uuid("ID d'echange invalide").optional(),
		achievement_id: z.string().uuid('ID de succes invalide').optional(),
		gifted_by: z.string().uuid('ID du donneur invalide').optional(),
		migrated_from: z.string().max(100).optional()
	})
	.passthrough();

/**
 * Item instance-specific data.
 */
export const itemInstanceDataSchema = z
	.object({
		custom_name: z.string().max(50, 'Nom personnalise trop long').optional(),
		notes: z.string().max(200, 'Notes trop longues').optional(),
		first_used_at: z.string().datetime().optional()
	})
	.passthrough();

// ============================================================================
// PURCHASE SCHEMAS
// ============================================================================

/**
 * Schema for purchasing an item from the shop.
 */
export const purchaseRequestSchema = z.object({
	template_id: z.string().uuid("ID de l'article invalide"),
	quantity: z
		.number()
		.int('La quantite doit etre un nombre entier')
		.min(1, 'Quantite minimum: 1')
		.max(100, 'Quantite maximum: 100')
		.finite('La valeur doit etre un nombre fini')
		.default(1)
});

/**
 * Schema for purchase query parameters (GET requests).
 */
export const purchaseQuerySchema = z.object({
	template_id: z.string().uuid("ID de l'article invalide"),
	quantity: z.coerce
		.number()
		.int('La quantite doit etre un nombre entier')
		.min(1, 'Quantite minimum: 1')
		.max(100, 'Quantite maximum: 100')
		.finite('La valeur doit etre un nombre fini')
		.default(1)
});

// ============================================================================
// USE ITEM SCHEMAS
// ============================================================================

/**
 * Schema for using an inventory item.
 */
export const useItemRequestSchema = z.object({
	context: z
		.string()
		.min(1, "Le contexte d'utilisation est requis")
		.max(50, 'Contexte trop long (max 50 caracteres)'),
	usage_data: z.record(z.string(), z.unknown()).optional().default({})
});

/**
 * Schema for item usage context validation.
 */
export const usageContextSchema = z.enum([
	'minesweeper',
	'questions',
	'assessment',
	'srs',
	'riddles',
	'profile',
	'chat',
	'general'
]);

// ============================================================================
// EQUIP ITEM SCHEMAS
// ============================================================================

/**
 * Schema for equipping/unequipping an item.
 */
export const equipItemRequestSchema = z.object({
	equip: z.boolean({ message: "Le parametre 'equip' est requis" })
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

/**
 * Schema for creating a new shop item template.
 */
export const createShopItemSchema = z
	.object({
		internal_name: z
			.string()
			.min(1, 'Nom interne requis')
			.max(100, 'Nom interne trop long (max 100 caracteres)')
			.regex(
				/^[a-z][a-z0-9_]*$/,
				'Format invalide: snake_case requis, doit commencer par une lettre minuscule'
			),
		display_name: z
			.string()
			.min(1, "Nom d'affichage requis")
			.max(100, "Nom d'affichage trop long (max 100 caracteres)"),
		description: z.string().max(500, 'Description trop longue (max 500 caracteres)').optional(),
		category: shopItemCategorySchema,
		item_type: z
			.string()
			.min(1, "Type d'article requis")
			.max(50, "Type d'article trop long (max 50 caracteres)"),
		rarity: shopItemRaritySchema.default('common'),
		base_price: z
			.number()
			.int('Le prix doit etre un nombre entier')
			.min(1, 'Prix minimum: 1 gidouille')
			.max(100000, 'Prix maximum: 100000 gidouilles')
			.finite('La valeur doit etre un nombre fini'),
		discount_percentage: z
			.number()
			.int('La remise doit etre un nombre entier')
			.min(0, 'La remise ne peut pas etre negative')
			.max(99, 'Remise maximum: 99%')
			.finite('La valeur doit etre un nombre fini')
			.default(0),
		is_active: z.boolean().default(true),
		available_from: z.string().datetime('Format de date invalide (ISO 8601 requis)').optional(),
		available_until: z.string().datetime('Format de date invalide (ISO 8601 requis)').optional(),
		max_owned_per_student: z
			.number()
			.int('La limite doit etre un nombre entier')
			.min(1, 'Minimum: 1')
			.max(1000, 'Maximum: 1000')
			.finite('La valeur doit etre un nombre fini')
			.optional(),
		daily_purchase_limit: z
			.number()
			.int('La limite doit etre un nombre entier')
			.min(1, 'Minimum: 1')
			.max(100, 'Maximum: 100 par jour')
			.finite('La valeur doit etre un nombre fini')
			.optional(),
		weekly_purchase_limit: z
			.number()
			.int('La limite doit etre un nombre entier')
			.min(1, 'Minimum: 1')
			.max(500, 'Maximum: 500 par semaine')
			.finite('La valeur doit etre un nombre fini')
			.optional(),
		purchase_cooldown_hours: z
			.number()
			.int('Le delai doit etre un nombre entier')
			.min(1, 'Minimum: 1 heure')
			.max(168, 'Maximum: 168 heures (1 semaine)')
			.finite('La valeur doit etre un nombre fini')
			.optional(),
		properties: shopItemPropertiesSchema.default({}),
		is_tradeable: z.boolean().default(true),
		trade_cooldown_hours: z
			.number()
			.int('Le delai doit etre un nombre entier')
			.min(0, 'Minimum: 0 heure')
			.max(168, 'Maximum: 168 heures (1 semaine)')
			.finite('La valeur doit etre un nombre fini')
			.default(24),
		icon_url: z.string().url("URL de l'icone invalide").optional(),
		sort_order: z
			.number()
			.int("L'ordre doit etre un nombre entier")
			.min(0, 'Minimum: 0')
			.finite('La valeur doit etre un nombre fini')
			.default(0)
	})
	.refine(
		(data) => {
			if (data.available_from && data.available_until) {
				return new Date(data.available_from) < new Date(data.available_until);
			}
			return true;
		},
		{
			message: 'La date de debut doit preceder la date de fin',
			path: ['available_until']
		}
	)
	.refine(
		(data) => {
			// Weekly limit should be >= daily limit if both are set
			if (data.daily_purchase_limit && data.weekly_purchase_limit) {
				return data.weekly_purchase_limit >= data.daily_purchase_limit;
			}
			return true;
		},
		{
			message: 'La limite hebdomadaire doit etre superieure ou egale a la limite journaliere',
			path: ['weekly_purchase_limit']
		}
	);

/**
 * Schema for updating an existing shop item template.
 */
export const updateShopItemSchema = createShopItemSchema.partial().extend({
	id: z.string().uuid("ID de l'article invalide")
});

/**
 * Schema for refunding a purchase.
 */
export const refundPurchaseSchema = z.object({
	purchase_id: z.string().uuid("ID de l'achat invalide"),
	reason: z
		.string()
		.min(10, 'La raison du remboursement doit contenir au moins 10 caracteres')
		.max(500, 'Raison trop longue (max 500 caracteres)')
});

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Helper to preprocess nullable URL params to undefined for proper default handling
 */
const nullToUndefined = <T>(val: T | null | undefined): T | undefined =>
	val === null ? undefined : val;

/**
 * Schema for shop items listing query parameters.
 * Note: URL params return null when not present, so we preprocess to undefined
 */
export const shopItemsQuerySchema = z.object({
	category: z.preprocess(nullToUndefined, shopItemCategorySchema.optional()),
	rarity: z.preprocess(nullToUndefined, shopItemRaritySchema.optional()),
	search: z.preprocess(
		nullToUndefined,
		z.string().max(100, 'Recherche trop longue (max 100 caracteres)').optional()
	),
	page: z.preprocess(
		nullToUndefined,
		z.coerce
			.number()
			.int('Le numero de page doit etre un entier')
			.min(1, 'Le numero de page doit etre au moins 1')
			.finite('La valeur doit etre un nombre fini')
			.default(1)
	),
	limit: z.preprocess(
		nullToUndefined,
		z.coerce
			.number()
			.int('La limite doit etre un entier')
			.min(1, 'La limite doit etre au moins 1')
			.max(100, 'La limite ne peut pas depasser 100')
			.finite('La valeur doit etre un nombre fini')
			.default(20)
	),
	active_only: z.preprocess(nullToUndefined, z.coerce.boolean().default(true)),
	sort_by: z.preprocess(
		nullToUndefined,
		z.enum(['price', 'name', 'rarity', 'sort_order']).default('sort_order')
	),
	sort_order: z.preprocess(nullToUndefined, z.enum(['asc', 'desc']).default('asc'))
});

/**
 * Schema for student inventory query parameters.
 */
export const inventoryQuerySchema = z.object({
	template_id: z.string().uuid("ID de l'article invalide").optional(),
	category: shopItemCategorySchema.optional(),
	equipped_only: z.coerce.boolean().optional(),
	include_expired: z.coerce.boolean().default(false)
});

/**
 * Schema for purchase history query parameters.
 */
export const purchaseHistoryQuerySchema = z.object({
	student_id: z.string().uuid("ID de l'eleve invalide").optional(),
	template_id: z.string().uuid("ID de l'article invalide").optional(),
	date_from: z.string().datetime('Format de date invalide').optional(),
	date_to: z.string().datetime('Format de date invalide').optional(),
	include_refunded: z.coerce.boolean().default(false),
	page: z.coerce
		.number()
		.int('Le numero de page doit etre un entier')
		.min(1, 'Le numero de page doit etre au moins 1')
		.finite('La valeur doit etre un nombre fini')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit etre un entier')
		.min(1, 'La limite doit etre au moins 1')
		.max(100, 'La limite ne peut pas depasser 100')
		.finite('La valeur doit etre un nombre fini')
		.default(50)
});

/**
 * Schema for item usage log query parameters.
 */
export const usageLogQuerySchema = z.object({
	student_id: z.string().uuid("ID de l'eleve invalide").optional(),
	template_id: z.string().uuid("ID de l'article invalide").optional(),
	context: z.string().max(50).optional(),
	date_from: z.string().datetime('Format de date invalide').optional(),
	date_to: z.string().datetime('Format de date invalide').optional(),
	page: z.coerce
		.number()
		.int('Le numero de page doit etre un entier')
		.min(1, 'Le numero de page doit etre au moins 1')
		.finite('La valeur doit etre un nombre fini')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit etre un entier')
		.min(1, 'La limite doit etre au moins 1')
		.max(100, 'La limite ne peut pas depasser 100')
		.finite('La valeur doit etre un nombre fini')
		.default(50)
});

// ============================================================================
// LOCK MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Schema for locking items for listing or trade.
 */
export const lockItemsRequestSchema = z
	.object({
		item_ids: z
			.array(z.string().uuid("ID d'article invalide"))
			.min(1, 'Au moins un article requis')
			.max(50, 'Maximum 50 articles a la fois'),
		listing_id: z.string().uuid("ID d'annonce invalide").optional(),
		trade_id: z.string().uuid("ID d'echange invalide").optional()
	})
	.refine((data) => (data.listing_id && !data.trade_id) || (!data.listing_id && data.trade_id), {
		message: 'Specifier listing_id OU trade_id, pas les deux (ni aucun)'
	});

/**
 * Schema for unlocking items.
 */
export const unlockItemsRequestSchema = z.object({
	item_ids: z
		.array(z.string().uuid("ID d'article invalide"))
		.min(1, 'Au moins un article requis')
		.max(50, 'Maximum 50 articles a la fois')
});

// ============================================================================
// ADMIN QUERY SCHEMAS
// ============================================================================

/**
 * Schema for admin shop statistics query.
 */
export const adminShopStatsQuerySchema = z.object({
	date_from: z.string().datetime('Format de date invalide').optional(),
	date_to: z.string().datetime('Format de date invalide').optional(),
	category: shopItemCategorySchema.optional()
});

/**
 * Schema for admin inventory search.
 */
export const adminInventorySearchSchema = z.object({
	student_id: z.string().uuid("ID de l'eleve invalide").optional(),
	class_id: z.string().uuid('ID de classe invalide').optional(),
	template_id: z.string().uuid("ID de l'article invalide").optional(),
	acquired_from: itemAcquisitionSourceSchema.optional(),
	is_locked: z.coerce.boolean().optional(),
	page: z.coerce
		.number()
		.int('Le numero de page doit etre un entier')
		.min(1, 'Le numero de page doit etre au moins 1')
		.finite('La valeur doit etre un nombre fini')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit etre un entier')
		.min(1, 'La limite doit etre au moins 1')
		.max(100, 'La limite ne peut pas depasser 100')
		.finite('La valeur doit etre un nombre fini')
		.default(50)
});

/**
 * Schema for admin granting items to students.
 */
export const adminGrantItemSchema = z.object({
	student_id: z.string().uuid("ID de l'eleve invalide"),
	template_id: z.string().uuid("ID de l'article invalide"),
	quantity: z
		.number()
		.int('La quantite doit etre un nombre entier')
		.min(1, 'Quantite minimum: 1')
		.max(100, 'Quantite maximum: 100')
		.finite('La valeur doit etre un nombre fini')
		.default(1),
	acquisition_source: itemAcquisitionSourceSchema.default('gift'),
	reason: z
		.string()
		.min(5, 'La raison doit contenir au moins 5 caracteres')
		.max(200, 'Raison trop longue (max 200 caracteres)')
});

/**
 * Schema for admin removing items from students.
 */
export const adminRemoveItemSchema = z.object({
	inventory_id: z.string().uuid("ID d'inventaire invalide"),
	reason: z
		.string()
		.min(5, 'La raison doit contenir au moins 5 caracteres')
		.max(200, 'Raison trop longue (max 200 caracteres)')
});

// ============================================================================
// TYPE EXPORTS (inferred from schemas)
// ============================================================================

export type ShopItemCategory = z.infer<typeof shopItemCategorySchema>;
export type ShopItemRarity = z.infer<typeof shopItemRaritySchema>;
export type ItemAcquisitionSource = z.infer<typeof itemAcquisitionSourceSchema>;
export type PurchaseRequestData = z.infer<typeof purchaseRequestSchema>;
export type UseItemRequestData = z.infer<typeof useItemRequestSchema>;
export type EquipItemRequestData = z.infer<typeof equipItemRequestSchema>;
export type CreateShopItemData = z.infer<typeof createShopItemSchema>;
export type UpdateShopItemData = z.infer<typeof updateShopItemSchema>;
export type RefundPurchaseData = z.infer<typeof refundPurchaseSchema>;
export type ShopItemsQueryData = z.infer<typeof shopItemsQuerySchema>;
export type InventoryQueryData = z.infer<typeof inventoryQuerySchema>;
export type PurchaseHistoryQueryData = z.infer<typeof purchaseHistoryQuerySchema>;
export type UsageLogQueryData = z.infer<typeof usageLogQuerySchema>;
export type LockItemsRequestData = z.infer<typeof lockItemsRequestSchema>;
export type UnlockItemsRequestData = z.infer<typeof unlockItemsRequestSchema>;
export type AdminGrantItemData = z.infer<typeof adminGrantItemSchema>;
export type AdminRemoveItemData = z.infer<typeof adminRemoveItemSchema>;
