# Shop System

> Complete documentation for the student shop and inventory system.

## Overview

The Shop system allows students to purchase items using gidouilles (virtual currency). Key features:

- **Admin-defined item templates** with categories and properties
- **Student inventory management** with quantity tracking
- **Purchase history and usage logging** for analytics
- **Integration with marketplace** for item trading
- **Atomic purchase transactions** with gidouilles deduction
- **Item locking** to prevent double-spending during trades
- **Usage cooldowns and purchase limits**

## Item Categories

| Category     | Description               | Examples                   |
| ------------ | ------------------------- | -------------------------- |
| `consumable` | Single or multi-use items | Hints, skip tokens         |
| `booster`    | Temporary effect items    | XP boost, point multiplier |
| `cosmetic`   | Visual customization      | Avatar frames, themes      |
| `utility`    | Special actions           | Skip exercise, extra time  |

## Item Rarities

| Rarity      | Description                 | Typical Price Range |
| ----------- | --------------------------- | ------------------- |
| `common`    | Standard items              | 1-10 gidouilles     |
| `uncommon`  | Slightly better than common | 11-25 gidouilles    |
| `rare`      | Valuable items              | 26-50 gidouilles    |
| `epic`      | Premium items               | 51-100 gidouilles   |
| `legendary` | Exclusive items             | 100+ gidouilles     |

---

## Item Templates

### Structure

```typescript
interface ShopItemTemplate {
	id: string; // UUID
	internal_name: string; // e.g., 'minesweeper_hint'
	display_name: string; // French name: 'Indice Demineur'
	description: string; // French description

	// Categorization
	category: 'consumable' | 'booster' | 'cosmetic' | 'utility';
	item_type: string; // Specific type within category
	rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

	// Pricing
	base_price: number; // 1-100000 gidouilles
	discount_percentage: number; // 0-100
	final_price: number; // Computed: base_price * (1 - discount/100)

	// Availability
	is_active: boolean;
	available_from: string | null; // ISO date
	available_until: string | null;

	// Purchase limits
	max_owned_per_student: number | null;
	daily_purchase_limit: number | null;
	weekly_purchase_limit: number | null;
	purchase_cooldown_hours: number | null;

	// Item properties
	properties: ShopItemProperties;

	// Trading
	is_tradeable: boolean;
	trade_cooldown_hours: number; // Default: 24

	// UI
	icon_url: string | null;
	sort_order: number;
}
```

### Properties Examples

**Consumable (Minesweeper Hint):**

```json
{
	"stackable": true,
	"uses": 3,
	"game": "minesweeper",
	"effect": "reveal_cell"
}
```

**Booster (XP Multiplier):**

```json
{
	"duration_minutes": 30,
	"multiplier": 1.5,
	"effect_type": "xp"
}
```

**Cosmetic (Avatar Frame):**

```json
{
	"type": "avatar_frame",
	"theme": "gold",
	"animation": "sparkle"
}
```

**Utility (Skip Exercise):**

```json
{
	"effect": "skip_exercise",
	"applicable_to": ["homework", "assessment"],
	"max_uses": 1
}
```

---

## Student Inventory

### Structure

```typescript
interface StudentItemInventory {
	id: string; // UUID
	student_id: string; // Owner
	template_id: string; // Item template

	// Quantity
	quantity: number; // Stack count (> 0)
	uses_remaining: number | null; // For multi-use items

	// Equipment state
	is_equipped: boolean;
	equipped_at: string | null;

	// Acquisition
	acquired_at: string; // ISO timestamp
	acquired_from: 'shop' | 'trade' | 'reward' | 'gift' | 'migration';
	acquisition_data: object; // Context

	// Expiration
	expires_at: string | null;

	// Usage tracking
	last_used_at: string | null;
	total_uses_count: number;

	// Locking (for trades)
	is_locked: boolean;
	locked_for_listing_id: string | null;
	locked_for_trade_id: string | null;
	locked_at: string | null;

	// Instance data
	instance_data: object; // Custom properties
}
```

### Stackable Items

Items with `stackable: true` in properties are combined:

- Same template, same student = increased quantity
- Individual uses tracked per stack

**Unique Index for Stacking:**

```sql
CREATE UNIQUE INDEX idx_inventory_stackable
ON student_item_inventory(student_id, template_id)
WHERE uses_remaining IS NULL AND instance_data = '{}';
```

---

## Purchase Flow

### Flow Diagram

```
Student selects item
        │
        ▼
POST /api/shop/purchase
        │
        ├─► Validate: is_active, available dates
        │
        ├─► Check: purchase limits (daily, weekly, max owned)
        │
        ├─► Verify: sufficient gidouilles
        │
        ▼
BEGIN TRANSACTION
        │
        ├─► Deduct gidouilles from profiles
        │
        ├─► Create/update inventory entry
        │   (stack if existing, else create new)
        │
        ├─► Log to shop_purchase_history
        │
        ├─► Log to gidouilles_history
        │
        └─► TRIGGER: reward_events
        │
COMMIT
        │
        ▼
Return: inventory_id, purchase_id, new_balance
```

### Purchase Validation

```typescript
// Checks performed before purchase
interface PurchaseValidation {
	// Item availability
	is_active: boolean;
	within_dates: boolean; // available_from <= now <= available_until

	// Ownership limits
	current_owned: number;
	max_allowed: number | null; // max_owned_per_student

	// Purchase frequency
	daily_purchases: number;
	daily_limit: number | null;
	weekly_purchases: number;
	weekly_limit: number | null;
	last_purchase_time: Date | null;
	cooldown_hours: number | null;

	// Balance
	required_gidouilles: number;
	available_gidouilles: number;
}
```

### Limit Error Messages

```typescript
type PurchaseLimitReason =
	| 'max_owned_reached' // "Vous possedez deja le maximum"
	| 'daily_limit_reached' // "Limite quotidienne atteinte"
	| 'weekly_limit_reached' // "Limite hebdomadaire atteinte"
	| 'cooldown_active' // "Attendre X heures"
	| 'insufficient_gidouilles' // "Gidouilles insuffisantes"
	| 'item_not_available'; // "Article non disponible"
```

---

## Item Usage

### Usage Flow

```
Student uses item
        │
        ▼
POST /api/shop/items/[id]/use
        │
        ├─► Validate: item owned, uses remaining
        │
        ├─► Check: usage context valid
        │
        ▼
BEGIN TRANSACTION
        │
        ├─► Decrement uses_remaining (or quantity)
        │
        ├─► Apply effect (game-specific)
        │
        ├─► Log to item_usage_log
        │
        └─► TRIGGER: reward_events
        │
COMMIT
        │
        ▼
Return: effect_applied, remaining_uses
```

### Usage Log Entry

```typescript
interface ItemUsageLog {
	id: string;
	student_id: string;
	inventory_id: string;
	template_id: string;

	used_at: string; // ISO timestamp
	usage_context: string; // 'minesweeper', 'assessment', etc.
	usage_data: object; // Context details
	effect_applied: {
		effect_type: string;
		params: object;
		original_value?: unknown;
		modified_value?: unknown;
		success: boolean;
		error?: string;
	};

	reversed_at: string | null; // If usage was undone
}
```

---

## Trading Integration

Items can be traded in the marketplace alongside VIP cards.

### Trade Eligibility

```typescript
function canTradeItem(item: StudentItemInventory): boolean {
	const template = getTemplate(item.template_id);

	return (
		template.is_tradeable &&
		!item.is_locked &&
		!item.is_equipped &&
		!isExpired(item) &&
		hasPassedCooldown(item, template.trade_cooldown_hours)
	);
}
```

### Item Locking

Before listing or trading:

1. Lock item: `is_locked = true`, `locked_for_listing_id = listing.id`
2. Item cannot be used, traded elsewhere, or expired
3. After trade completion: transfer ownership, unlock
4. If cancelled: unlock item

```sql
-- Only one lock type at a time
CONSTRAINT only_one_lock CHECK (
    locked_for_listing_id IS NULL OR locked_for_trade_id IS NULL
)
```

---

## Admin Operations

### Create Item Template

```typescript
POST /api/admin/shop/items
{
  internal_name: "minesweeper_hint",
  display_name: "Indice Demineur",
  description: "Revele une case aleatoire sans mine",
  category: "consumable",
  item_type: "hint",
  rarity: "common",
  base_price: 5,
  properties: {
    stackable: true,
    uses: 1,
    game: "minesweeper",
    effect: "reveal_cell"
  },
  is_tradeable: true,
  max_owned_per_student: 10
}
```

### Update Item Template

```typescript
PATCH /api/admin/shop/items/[id]
{
  discount_percentage: 20,  // 20% off
  is_active: true
}
```

### Refund Purchase

```typescript
POST / api / admin / shop / purchases / [id] / refund;
{
	reason: 'Item was defective';
}
```

Refund process:

1. Add gidouilles back to student
2. Mark purchase as refunded
3. Remove/reduce inventory item

---

## Database RLS Policies

```sql
-- Students can view active items
CREATE POLICY "Students can view active shop items"
ON shop_item_templates
FOR SELECT TO authenticated
USING (is_active = TRUE);

-- Students can only view own inventory
CREATE POLICY "Students can view own inventory"
ON student_item_inventory
FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Students can view own purchase history
CREATE POLICY "Students can view own purchases"
ON shop_purchase_history
FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins can manage shop"
ON shop_item_templates
FOR ALL TO authenticated
USING (is_admin());
```

---

## Frontend Components

| Component                  | Path                       | Purpose               |
| -------------------------- | -------------------------- | --------------------- |
| `ShopBrowse.svelte`        | `src/lib/components/shop/` | Browse shop items     |
| `ShopPurchaseModal.svelte` | `src/lib/components/shop/` | Purchase confirmation |
| `ShopItemCard.svelte`      | `src/lib/components/shop/` | Single item display   |
| `InventoryView.svelte`     | `src/lib/components/shop/` | Student inventory     |

---

## API Quick Reference

| Endpoint                     | Method | Description           |
| ---------------------------- | ------ | --------------------- |
| `/api/shop/items`            | GET    | List available items  |
| `/api/shop/items/[id]`       | GET    | Get item details      |
| `/api/shop/purchase`         | POST   | Purchase item         |
| `/api/shop/purchase-history` | GET    | Get purchase history  |
| `/api/shop/inventory`        | GET    | Get student inventory |
| `/api/shop/items/[id]/use`   | POST   | Use inventory item    |

---

## Metrics & Analytics

Tracked via purchase history and usage logs:

- Total purchases per item
- Revenue per category
- Most popular items
- Usage patterns by game/context
- Refund rates
- Trading volume
