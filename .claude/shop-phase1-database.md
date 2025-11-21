# Shop System - Phase 1: Database Schema

**Status**: COMPLETED
**Date**: 2025-11-21
**Migration**: `supabase/migrations/20251121080310_create_shop_system.sql`

## Tables Created

### 1. `shop_item_templates`
Admin-defined items available for purchase.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| internal_name | TEXT | Unique identifier (e.g., 'minesweeper_hint') |
| display_name | TEXT | French display name |
| description | TEXT | French description |
| category | TEXT | 'consumable' | 'booster' | 'cosmetic' | 'utility' |
| item_type | TEXT | Specific type within category |
| rarity | TEXT | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' |
| base_price | INTEGER | Price in gidouilles (1-100000) |
| discount_percentage | INTEGER | 0-100% |
| is_active | BOOLEAN | Whether available in shop |
| available_from/until | TIMESTAMPTZ | Time-limited availability |
| max_owned_per_student | INTEGER | Ownership limit |
| daily_purchase_limit | INTEGER | Daily limit |
| weekly_purchase_limit | INTEGER | Weekly limit |
| purchase_cooldown_hours | INTEGER | Hours between purchases |
| properties | JSONB | Item-specific config (stackable, uses, game, etc.) |
| is_tradeable | BOOLEAN | Can be traded in marketplace |
| trade_cooldown_hours | INTEGER | Hours after acquisition before tradeable |
| icon_url | TEXT | Path to icon |
| sort_order | INTEGER | Display order |

### 2. `student_item_inventory`
Items owned by students.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| student_id | UUID | FK to profiles |
| template_id | UUID | FK to shop_item_templates |
| quantity | INTEGER | Number owned (>0) |
| uses_remaining | INTEGER | For multi-use consumables |
| is_equipped | BOOLEAN | Whether equipped |
| acquired_at | TIMESTAMPTZ | When acquired |
| acquired_from | TEXT | 'shop' | 'trade' | 'reward' | 'gift' | 'migration' |
| acquisition_data | JSONB | Details (purchase_id, trade_id, etc.) |
| expires_at | TIMESTAMPTZ | For time-limited items |
| is_locked | BOOLEAN | Locked for trade/listing |
| locked_for_listing_id | UUID | FK to marketplace_listings |
| locked_for_trade_id | UUID | FK to marketplace_trades |

### 3. `shop_purchase_history`
Complete purchase audit trail.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| student_id | UUID | FK to profiles |
| template_id | UUID | FK to shop_item_templates |
| inventory_id | UUID | FK to student_item_inventory |
| quantity | INTEGER | Amount purchased |
| unit_price | INTEGER | Price per unit |
| total_price | INTEGER | Total paid |
| discount_applied | INTEGER | Discount amount |
| gidouilles_history_id | UUID | Link to gidouilles transaction |
| purchased_at | TIMESTAMPTZ | When purchased |
| refunded_at | TIMESTAMPTZ | If refunded |

### 4. `item_usage_log`
Usage tracking for analytics and cooldowns.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| student_id | UUID | FK to profiles |
| inventory_id | UUID | FK to student_item_inventory |
| template_id | UUID | FK to shop_item_templates |
| used_at | TIMESTAMPTZ | When used |
| usage_context | TEXT | 'minesweeper', 'assessment', etc. |
| usage_data | JSONB | Context-specific data |
| effect_applied | JSONB | What happened |
| effect_expires_at | TIMESTAMPTZ | For temporary effects |

## Marketplace Extensions

### `marketplace_listings`
Added columns:
- `offered_item_ids UUID[]` - Item inventory IDs being offered
- `wanted_item_template_ids UUID[]` - Item templates wanted

### `marketplace_proposals`
Added columns:
- `offered_item_ids UUID[]` - Items offered in proposal

## RPC Functions

### `purchase_shop_item(p_student_id, p_template_id, p_quantity)`
Atomic purchase transaction with:
- Authorization check (caller must be student)
- Balance check with FOR UPDATE (race condition prevention)
- All purchase limits validation
- Gidouilles deduction + history logging
- Inventory creation (stackable vs non-stackable)
- Purchase history logging

### `use_item(p_inventory_id, p_context, p_usage_data)`
Use a consumable item:
- Ownership verification via auth.uid()
- Context validation (game-specific items)
- Quantity/uses decrement
- Usage logging

### `lock_items_for_listing(p_student_id, p_item_ids[], p_listing_id)`
Lock items for marketplace listing:
- Authorization check
- Null array validation
- Atomic locking with rollback on partial failure

### `lock_items_for_trade(p_student_id, p_item_ids[], p_trade_id)`
Lock items for friend-to-friend trade (same pattern as listing).

### `unlock_items(p_entity_id, p_entity_type)`
Unlock items when listing/trade cancelled:
- Authorization check (caller owns items)
- Supports both 'listing' and 'trade' types

### `transfer_items(p_from_student, p_to_student, p_item_ids[], p_trade_id)`
Transfer items between students:
- Authorization check (caller is participant)
- Single UPDATE for correct count
- Updates acquisition data for trade history

### `get_shop_items(p_student_id, p_category)`
Get available items with student-specific info:
- Purchase limits status
- Owned quantities
- Availability filtering

## RLS Policies

### shop_item_templates
- SELECT: Active items visible to all authenticated
- SELECT: Admins can see inactive items
- INSERT/UPDATE/DELETE: Admins only

### student_item_inventory
- SELECT: Own inventory only
- SELECT: Teachers can view their students
- SELECT: Admins can view all
- INSERT: Via RPC only (false check)
- UPDATE: Own items only
- DELETE: Not allowed

### shop_purchase_history
- SELECT: Own purchases
- SELECT: Teachers can view students
- SELECT: Admins can view all
- INSERT: Via RPC only

### item_usage_log
- SELECT: Own usage
- SELECT: Teachers can view students
- SELECT: Admins can view all
- INSERT: Via RPC only

## Indexes

```sql
-- shop_item_templates
idx_shop_templates_active (is_active, sort_order)
idx_shop_templates_category (category) WHERE is_active
idx_shop_templates_rarity (rarity) WHERE is_active
idx_shop_templates_availability (available_from, available_until) WHERE is_active

-- student_item_inventory
idx_inventory_student (student_id)
idx_inventory_template (template_id)
idx_inventory_locked (is_locked) WHERE is_locked
idx_inventory_equipped (student_id, is_equipped) WHERE is_equipped
idx_inventory_expires (expires_at) WHERE expires_at IS NOT NULL
idx_inventory_stackable UNIQUE (student_id, template_id) WHERE uses_remaining IS NULL AND instance_data = '{}'

-- shop_purchase_history
idx_purchases_student (student_id, purchased_at DESC)
idx_purchases_template (template_id)
idx_purchases_date (purchased_at DESC)

-- item_usage_log
idx_usage_student (student_id, used_at DESC)
idx_usage_inventory (inventory_id)
idx_usage_context (usage_context)
idx_usage_date (used_at DESC)
```

## Security Fixes Applied

1. **Authorization bypass fixed** in `purchase_shop_item` - Added `auth.uid() = p_student_id` check
2. **Race condition fixed** - Added `FOR UPDATE` on balance check
3. **Variable reference fixed** - Pre-generate `v_purchase_id` before use
4. **Authorization added** to all lock/unlock/transfer functions
5. **Null array handling** - Validate `p_item_ids` before use
6. **Count bug fixed** in `transfer_items` - Single UPDATE instead of loop
7. **Error message sanitized** - Removed SQLERRM from client responses

## To Resume

If crash after this phase:
1. Migration file is ready at `supabase/migrations/20251121080310_create_shop_system.sql`
2. Run `pnpm db:migrate` to apply
3. Continue to **Phase 2: TypeScript Types & Validation**

## Next Steps

- Create `src/lib/types/shop.ts`
- Create `src/lib/validation/shop.ts`
- Update `src/lib/types/database.ts` with generated types
