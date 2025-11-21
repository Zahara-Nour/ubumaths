// Shop System Types
// ==================
// Complete TypeScript types for the student shop and inventory feature

import type { Database } from './database';

// Base database types
type DbShopItemTemplate = Database['public']['Tables']['shop_item_templates']['Row'];
type DbStudentItemInventory = Database['public']['Tables']['student_item_inventory']['Row'];
type DbShopPurchaseHistory = Database['public']['Tables']['shop_purchase_history']['Row'];
type DbItemUsageLog = Database['public']['Tables']['item_usage_log']['Row'];

// ============================================================================
// ENUMS AND LITERAL TYPES
// ============================================================================

/** Shop item categories for organizing items in the store */
export type ShopItemCategory = 'consumable' | 'booster' | 'cosmetic' | 'utility';

/** Rarity levels affecting item value and availability */
export type ShopItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** How the student acquired the item */
export type ItemAcquisitionSource = 'shop' | 'trade' | 'reward' | 'gift' | 'migration';

// ============================================================================
// ITEM PROPERTIES (JSONB)
// ============================================================================

/**
 * Flexible properties for different item types.
 * Structure varies based on category and item_type.
 */
export interface ShopItemProperties {
	/** Whether multiple items stack in inventory */
	stackable?: boolean;
	/** Number of uses before item is consumed */
	uses?: number;
	/** Game this item applies to (e.g., 'minesweeper', 'questions') */
	game?: string;
	/** Effect identifier for the item */
	effect?: string;
	/** Duration of effect in minutes */
	duration_minutes?: number;
	/** Multiplier for boosters (e.g., 1.5 for 50% bonus) */
	multiplier?: number;
	/** What this item can be applied to */
	applicable_to?: string[];
	/** Cosmetic theme or style identifier */
	theme?: string;
	/** Color value for cosmetic items */
	color?: string;
	/** Animation identifier for cosmetic items */
	animation?: string;
	/** Allow additional properties for extensibility */
	[key: string]: unknown;
}

/**
 * Context data for item acquisition (stored in acquisition_data)
 */
export interface ItemAcquisitionData {
	/** Original purchase ID if from shop */
	purchase_id?: string;
	/** Trade ID if acquired via trade */
	trade_id?: string;
	/** Achievement ID if earned as reward */
	achievement_id?: string;
	/** Gift sender ID if received as gift */
	gifted_by?: string;
	/** Legacy item ID if migrated from old system */
	migrated_from?: string;
	/** Additional context information */
	[key: string]: unknown;
}

/**
 * Instance-specific data for inventory items
 */
export interface ItemInstanceData {
	/** Custom name given by student */
	custom_name?: string;
	/** Notes or description added by student */
	notes?: string;
	/** When the item was first used */
	first_used_at?: string;
	/** Additional instance properties */
	[key: string]: unknown;
}

// ============================================================================
// SHOP ITEM TEMPLATE
// ============================================================================

/**
 * Shop item template with typed JSONB properties.
 * Represents an admin-defined item available for purchase.
 */
export interface ShopItemTemplate extends Omit<DbShopItemTemplate, 'properties'> {
	properties: ShopItemProperties | null;
}

/**
 * Shop item template for display with computed fields.
 * Used in the shop listing to show availability and pricing.
 */
export interface ShopItemWithStatus extends ShopItemTemplate {
	/** Final price after discount */
	final_price: number;
	/** How many the student currently owns */
	owned_quantity: number;
	/** Whether the student can purchase this item */
	can_purchase: boolean;
	/** Reason why purchase is not allowed (if applicable) */
	purchase_limit_reason: string | null;
}

// ============================================================================
// STUDENT INVENTORY
// ============================================================================

/**
 * Student inventory item with typed JSONB fields.
 * Represents an item owned by a student.
 */
export interface StudentItemInventory
	extends Omit<DbStudentItemInventory, 'acquisition_data' | 'instance_data'> {
	acquisition_data: ItemAcquisitionData | null;
	instance_data: ItemInstanceData | null;
}

/**
 * Inventory item with joined template data for display.
 */
export interface StudentItemWithTemplate extends StudentItemInventory {
	template: ShopItemTemplate;
}

/**
 * Inventory item with lock status information.
 */
export interface InventoryItemWithLockStatus extends StudentItemWithTemplate {
	/** Current lock state explanation */
	lock_reason?: 'in_listing' | 'in_trade' | 'in_proposal';
}

// ============================================================================
// PURCHASE HISTORY
// ============================================================================

/**
 * Purchase context data (stored in purchase_context JSONB)
 */
export interface PurchaseContextData {
	/** IP address at time of purchase (for audit) */
	ip_address?: string;
	/** User agent string (for audit) */
	user_agent?: string;
	/** Promotion code if used */
	promo_code?: string;
	/** Any special conditions that applied */
	special_conditions?: string[];
	/** Additional context */
	[key: string]: unknown;
}

/**
 * Purchase history entry with typed JSONB fields.
 */
export interface ShopPurchaseHistory extends Omit<DbShopPurchaseHistory, 'purchase_context'> {
	purchase_context: PurchaseContextData | null;
}

/**
 * Purchase history with joined item data for display.
 */
export interface PurchaseHistoryWithItem extends ShopPurchaseHistory {
	template: ShopItemTemplate;
}

// ============================================================================
// ITEM USAGE
// ============================================================================

/**
 * Usage context data (stored in usage_data JSONB)
 */
export interface ItemUsageData {
	/** Game session ID if used in a game */
	game_session_id?: string;
	/** Assessment ID if used during assessment */
	assessment_id?: string;
	/** Target entity the item was used on */
	target_id?: string;
	/** Additional usage parameters */
	[key: string]: unknown;
}

/**
 * Effect data applied from item usage (stored in effect_applied JSONB)
 */
export interface ItemEffectData {
	/** Type of effect applied */
	effect_type: string;
	/** Effect parameters */
	params?: Record<string, unknown>;
	/** Original value before effect */
	original_value?: unknown;
	/** Modified value after effect */
	modified_value?: unknown;
	/** Whether the effect was successfully applied */
	success: boolean;
	/** Error message if effect failed */
	error?: string;
}

/**
 * Item usage log entry with typed JSONB fields.
 */
export interface ItemUsageLog extends Omit<DbItemUsageLog, 'usage_data' | 'effect_applied'> {
	usage_data: ItemUsageData | null;
	effect_applied: ItemEffectData | null;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to purchase an item from the shop.
 */
export interface PurchaseRequest {
	template_id: string;
	quantity: number;
}

/**
 * Response from a purchase attempt.
 */
export interface PurchaseResponse {
	success: boolean;
	/** ID of the inventory item created/updated */
	inventory_id?: string;
	/** ID of the purchase history record */
	purchase_id?: string;
	/** Amount of gidouilles spent */
	gidouilles_spent?: number;
	/** New gidouilles balance after purchase */
	new_balance?: number;
	/** Display name of purchased item */
	item_name?: string;
	/** Quantity purchased */
	quantity?: number;
	/** Error message if purchase failed */
	error?: string;
}

/**
 * Request to use an inventory item.
 */
export interface UseItemRequest {
	/** Context where the item is being used */
	context: string;
	/** Additional usage parameters */
	usage_data?: Record<string, unknown>;
}

/**
 * Response from using an item.
 */
export interface UseItemResponse {
	success: boolean;
	/** Effect that was applied */
	effect?: ItemEffectData;
	/** Remaining uses on the item (null if unlimited) */
	remaining_uses?: number | null;
	/** Display name of used item */
	item_name?: string;
	/** Whether the item was consumed (removed from inventory) */
	item_consumed?: boolean;
	/** Error message if use failed */
	error?: string;
}

/**
 * Request to equip/unequip an item.
 */
export interface EquipItemRequest {
	equip: boolean;
}

/**
 * Response from equip/unequip action.
 */
export interface EquipItemResponse {
	success: boolean;
	is_equipped: boolean;
	item_name?: string;
	error?: string;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

/**
 * Request to create a new shop item template.
 */
export interface CreateShopItemRequest {
	internal_name: string;
	display_name: string;
	description?: string;
	category: ShopItemCategory;
	item_type: string;
	rarity?: ShopItemRarity;
	base_price: number;
	discount_percentage?: number;
	is_active?: boolean;
	available_from?: string;
	available_until?: string;
	max_owned_per_student?: number;
	daily_purchase_limit?: number;
	weekly_purchase_limit?: number;
	purchase_cooldown_hours?: number;
	properties?: ShopItemProperties;
	is_tradeable?: boolean;
	trade_cooldown_hours?: number;
	icon_url?: string;
	sort_order?: number;
}

/**
 * Request to update an existing shop item template.
 */
export interface UpdateShopItemRequest extends Partial<CreateShopItemRequest> {
	id: string;
}

/**
 * Request to refund a purchase.
 */
export interface RefundPurchaseRequest {
	purchase_id: string;
	reason: string;
}

/**
 * Response from a refund attempt.
 */
export interface RefundResponse {
	success: boolean;
	gidouilles_refunded?: number;
	new_balance?: number;
	error?: string;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Query parameters for shop items listing.
 */
export interface ShopItemsQuery {
	category?: ShopItemCategory;
	rarity?: ShopItemRarity;
	search?: string;
	page?: number;
	limit?: number;
	/** Show only active items (default: true) */
	active_only?: boolean;
	/** Sort field */
	sort_by?: 'price' | 'name' | 'rarity' | 'sort_order';
	/** Sort direction */
	sort_order?: 'asc' | 'desc';
}

/**
 * Query parameters for student inventory.
 */
export interface InventoryQuery {
	template_id?: string;
	category?: ShopItemCategory;
	equipped_only?: boolean;
	include_expired?: boolean;
}

/**
 * Query parameters for purchase history.
 */
export interface PurchaseHistoryQuery {
	student_id?: string;
	template_id?: string;
	date_from?: string;
	date_to?: string;
	include_refunded?: boolean;
	page?: number;
	limit?: number;
}

/**
 * Query parameters for item usage log.
 */
export interface UsageLogQuery {
	student_id?: string;
	template_id?: string;
	context?: string;
	date_from?: string;
	date_to?: string;
	page?: number;
	limit?: number;
}

// ============================================================================
// LOCK MANAGEMENT
// ============================================================================

/**
 * Request to lock items for listing or trade.
 */
export interface LockItemsRequest {
	item_ids: string[];
	listing_id?: string;
	trade_id?: string;
}

/**
 * Response from lock items request.
 */
export interface LockItemsResponse {
	success: boolean;
	locked_count?: number;
	already_locked?: string[];
	error?: string;
}

/**
 * Request to unlock items.
 */
export interface UnlockItemsRequest {
	item_ids: string[];
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Shop statistics for admin dashboard.
 */
export interface ShopStats {
	total_items: number;
	active_items: number;
	items_by_category: Record<ShopItemCategory, number>;
	items_by_rarity: Record<ShopItemRarity, number>;
	total_purchases_today: number;
	total_revenue_today: number;
	most_popular_items: Array<{
		template_id: string;
		display_name: string;
		purchase_count: number;
	}>;
}

/**
 * Student inventory statistics.
 */
export interface InventoryStats {
	total_items: number;
	items_by_category: Record<ShopItemCategory, number>;
	equipped_count: number;
	locked_count: number;
	expiring_soon: number;
	total_value: number;
}

// ============================================================================
// REALTIME EVENT TYPES
// ============================================================================

/**
 * Realtime events for shop system.
 */
export type ShopRealtimeEvent =
	| { type: 'item_purchased'; inventory_id: string; template: ShopItemTemplate }
	| { type: 'item_used'; inventory_id: string; remaining_uses: number | null }
	| { type: 'item_equipped'; inventory_id: string; is_equipped: boolean }
	| { type: 'item_expired'; inventory_id: string }
	| { type: 'balance_updated'; new_balance: number }
	| { type: 'new_item_available'; template: ShopItemTemplate };
