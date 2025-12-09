# Rewards Database Schema

> Complete database table definitions for the UbuMaths rewards system.

## Schema Overview

```
+-------------------+     +-------------------+     +-------------------+
|     profiles      |     | vip_card_templates|     | shop_item_templates|
|-------------------|     |-------------------|     |-------------------|
| gidouilles        |<--->| id (PK)           |     | id (PK)           |
| bonus             |     | name              |     | display_name      |
| vip_cards (JSONB) |     | rarity            |     | base_price        |
+-------------------+     | action (JSONB)    |     | category          |
        |                 +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+     +-------------------+     +-------------------+
| gidouilles_history|     | vip_cards_activity|     | student_item_     |
|-------------------|     |-------------------|     | inventory         |
| delta             |     | card_instance_id  |     |-------------------|
| reason            |     | action            |     | quantity          |
+-------------------+     +-------------------+     | uses_remaining    |
                                                    +-------------------+
```

## Core Tables

### `profiles` (Extended)

The profiles table stores user data including reward balances.

| Column     | Type    | Default | Constraint | Description                          |
| ---------- | ------- | ------- | ---------- | ------------------------------------ |
| gidouilles | INTEGER | 0       | CHECK >= 0 | Primary virtual currency balance     |
| bonus      | INTEGER | 0       | CHECK >= 0 | Secondary currency for bonus points  |
| vip_cards  | JSONB   | '{}'    |            | VIP card instances (key-value pairs) |

**VIP Cards JSONB Structure:**

```typescript
// Key: UUID string, Value: VipCardInstance
{
  "550e8400-e29b-41d4-a716-446655440000": {
    "cardId": "bonus",
    "earnedAt": "2025-11-15T10:30:00Z",
    "usedAt": null,
    "activationRequestedAt": null,
    "activationApprovedAt": null
  }
}
```

---

## VIP Card Tables

### `vip_card_templates`

Defines all available VIP cards in the system.

| Column      | Type    | Nullable | Default | Description                             |
| ----------- | ------- | -------- | ------- | --------------------------------------- |
| id          | TEXT    | NO       |         | Unique identifier (PK)                  |
| name        | TEXT    | NO       |         | Display name in French                  |
| description | TEXT    | YES      |         | Card description in French              |
| image_path  | TEXT    | YES      |         | Path to card image                      |
| category    | TEXT    | YES      |         | 'bonus', 'privilege', 'social', 'power' |
| rarity      | TEXT    | NO       |         | 'common', 'rare', 'epic', 'legendary'   |
| is_enabled  | BOOLEAN | NO       | TRUE    | Whether card can be drawn               |
| action      | JSONB   | YES      |         | Card abilities (see Action Types)       |
| sort_order  | INTEGER | NO       | 0       | Display order in lists                  |

**Rarity Distribution:**

- Common: 60% (default probability)
- Rare: 25%
- Epic: 12%
- Legendary: 3%

**Action JSONB Examples:**

```jsonc
// Draw cards action
{ "type": "draw_cards", "count": 2 }

// Remove warnings
{ "type": "remove_warnings", "count": 1, "warningType": "C" }

// Add gidouilles
{ "type": "add_gidouilles", "amount": 5 }

// Choose specific card
{ "type": "choose_card", "count": 1, "maxRarity": "epic" }

// Exchange cards
{ "type": "exchange_cards", "exchange": { "mode": "replace_random", "count": 3 } }
```

### `vip_card_config`

Controls rarity probability distribution for card draws.

| Column                | Type    | Nullable | Default | Description                     |
| --------------------- | ------- | -------- | ------- | ------------------------------- |
| id                    | UUID    | NO       |         | Primary key                     |
| config_name           | TEXT    | NO       |         | 'default', 'halloween', etc.    |
| common_probability    | INTEGER | NO       |         | 0-100 probability for common    |
| rare_probability      | INTEGER | NO       |         | 0-100 probability for rare      |
| epic_probability      | INTEGER | NO       |         | 0-100 probability for epic      |
| legendary_probability | INTEGER | NO       |         | 0-100 probability for legendary |
| is_active             | BOOLEAN | NO       | FALSE   | Only one can be active          |

**Constraint:** `CONSTRAINT probabilities_sum_100 CHECK (common + rare + epic + legendary = 100)`

### `vip_cards_activity`

Audit trail for VIP card transactions.

| Column           | Type        | Nullable | Description                   |
| ---------------- | ----------- | -------- | ----------------------------- |
| id               | UUID        | NO       | Primary key                   |
| student_id       | UUID        | NO       | FK to profiles                |
| card_instance_id | TEXT        | NO       | UUID key from vip_cards JSONB |
| card_template_id | TEXT        | NO       | FK to vip_card_templates      |
| action           | TEXT        | NO       | 'gained', 'used', 'removed'   |
| metadata         | JSONB       | YES      | Additional context            |
| created_at       | TIMESTAMPTZ | NO       | Timestamp of action           |

---

## Currency History Tables

### `gidouilles_history`

Tracks all gidouilles transactions.

| Column     | Type        | Nullable | Description                      |
| ---------- | ----------- | -------- | -------------------------------- |
| id         | UUID        | NO       | Primary key                      |
| student_id | UUID        | NO       | FK to profiles                   |
| class_id   | UUID        | YES      | FK to classes (context)          |
| delta      | INTEGER     | NO       | Change amount (+/-)              |
| reason     | TEXT        | YES      | Human-readable reason            |
| created_by | UUID        | YES      | FK to profiles (NULL for system) |
| created_at | TIMESTAMPTZ | NO       | Timestamp                        |

### `bonus_history`

Tracks all bonus point transactions. Same structure as `gidouilles_history`.

### `weekly_rewards`

Tracks weekly no-warning rewards.

| Column             | Type        | Nullable | Description                 |
| ------------------ | ----------- | -------- | --------------------------- |
| id                 | UUID        | NO       | Primary key                 |
| student_id         | UUID        | NO       | FK to profiles              |
| class_id           | UUID        | NO       | FK to classes               |
| week_start         | DATE        | NO       | Start of reward week        |
| week_end           | DATE        | NO       | End of reward week          |
| gidouilles_awarded | INTEGER     | NO       | Amount awarded (default: 1) |
| reason             | TEXT        | NO       | 'no_warnings' (default)     |
| created_at         | TIMESTAMPTZ | NO       | When awarded                |

---

## Shop System Tables

### `shop_item_templates`

Defines purchasable items in the shop.

| Column                  | Type        | Nullable | Default  | Description                                    |
| ----------------------- | ----------- | -------- | -------- | ---------------------------------------------- |
| id                      | UUID        | NO       |          | Primary key                                    |
| internal_name           | TEXT        | NO       |          | Unique identifier                              |
| display_name            | TEXT        | NO       |          | French display name                            |
| description             | TEXT        | YES      |          | Item description                               |
| category                | TEXT        | NO       |          | 'consumable', 'booster', 'cosmetic', 'utility' |
| item_type               | TEXT        | NO       |          | Specific type within category                  |
| rarity                  | TEXT        | NO       | 'common' | Item rarity                                    |
| base_price              | INTEGER     | NO       |          | Price in gidouilles (1-100000)                 |
| discount_percentage     | INTEGER     | YES      | 0        | Current discount (0-100)                       |
| is_active               | BOOLEAN     | NO       | TRUE     | Whether item is available                      |
| available_from          | TIMESTAMPTZ | YES      |          | Sale start date                                |
| available_until         | TIMESTAMPTZ | YES      |          | Sale end date                                  |
| max_owned_per_student   | INTEGER     | YES      |          | Inventory limit per student                    |
| daily_purchase_limit    | INTEGER     | YES      |          | Daily purchase cap                             |
| weekly_purchase_limit   | INTEGER     | YES      |          | Weekly purchase cap                            |
| purchase_cooldown_hours | INTEGER     | YES      |          | Hours between purchases                        |
| properties              | JSONB       | YES      |          | Item-specific properties                       |
| is_tradeable            | BOOLEAN     | NO       | TRUE     | Can be traded in marketplace                   |
| trade_cooldown_hours    | INTEGER     | YES      |          | Hours after purchase before trade              |
| icon_url                | TEXT        | YES      |          | Item icon URL                                  |
| sort_order              | INTEGER     | NO       | 0        | Display order                                  |

**Properties JSONB Example:**

```jsonc
{
	"stackable": true,
	"uses": 3,
	"game": "minesweeper",
	"effect": "reveal_cell"
}
```

### `student_item_inventory`

Student-owned items.

| Column                | Type        | Nullable | Default | Description                                    |
| --------------------- | ----------- | -------- | ------- | ---------------------------------------------- |
| id                    | UUID        | NO       |         | Primary key                                    |
| student_id            | UUID        | NO       |         | FK to profiles                                 |
| template_id           | UUID        | NO       |         | FK to shop_item_templates                      |
| quantity              | INTEGER     | NO       | 1       | Stack count (>0)                               |
| uses_remaining        | INTEGER     | YES      |         | Uses left (NULL = unlimited)                   |
| is_equipped           | BOOLEAN     | NO       | FALSE   | Currently equipped                             |
| acquired_from         | TEXT        | NO       |         | 'shop', 'trade', 'reward', 'gift', 'migration' |
| acquired_at           | TIMESTAMPTZ | NO       |         | When acquired                                  |
| expires_at            | TIMESTAMPTZ | YES      |         | Expiration date                                |
| is_locked             | BOOLEAN     | NO       | FALSE   | Locked for trade                               |
| locked_for_listing_id | UUID        | YES      |         | FK to marketplace_listings                     |
| locked_for_trade_id   | UUID        | YES      |         | FK to marketplace_trades                       |
| acquisition_data      | JSONB       | YES      |         | Acquisition context                            |
| instance_data         | JSONB       | YES      |         | Instance-specific data                         |

### `shop_purchase_history`

Purchase audit trail.

| Column           | Type        | Nullable | Description                    |
| ---------------- | ----------- | -------- | ------------------------------ |
| id               | UUID        | NO       | Primary key                    |
| student_id       | UUID        | NO       | FK to profiles                 |
| template_id      | UUID        | NO       | FK to shop_item_templates      |
| inventory_id     | UUID        | YES      | FK to student_item_inventory   |
| quantity         | INTEGER     | NO       | Items purchased                |
| unit_price       | INTEGER     | NO       | Price per item                 |
| total_price      | INTEGER     | NO       | Total spent                    |
| discount_applied | INTEGER     | YES      | Discount percentage applied    |
| purchase_context | JSONB       | YES      | Additional context             |
| purchased_at     | TIMESTAMPTZ | NO       | Purchase timestamp             |
| refunded_at      | TIMESTAMPTZ | YES      | Refund timestamp (if refunded) |

### `item_usage_log`

Item usage audit trail.

| Column         | Type        | Nullable | Description                       |
| -------------- | ----------- | -------- | --------------------------------- |
| id             | UUID        | NO       | Primary key                       |
| student_id     | UUID        | NO       | FK to profiles                    |
| inventory_id   | UUID        | NO       | FK to student_item_inventory      |
| template_id    | UUID        | NO       | FK to shop_item_templates         |
| used_at        | TIMESTAMPTZ | NO       | Usage timestamp                   |
| usage_context  | TEXT        | NO       | 'minesweeper', 'assessment', etc. |
| usage_data     | JSONB       | YES      | Context data                      |
| effect_applied | JSONB       | YES      | Effect details                    |
| reversed_at    | TIMESTAMPTZ | YES      | If usage was reversed             |

---

## Marketplace Tables

### `marketplace_config`

School/class level marketplace settings.

| Column                     | Type    | Nullable | Default | Description                 |
| -------------------------- | ------- | -------- | ------- | --------------------------- |
| id                         | UUID    | NO       |         | Primary key                 |
| school_id                  | UUID    | YES      |         | FK to schools               |
| class_id                   | UUID    | YES      |         | FK to classes               |
| marketplace_enabled        | BOOLEAN | NO       | TRUE    | Enable marketplace          |
| cross_class_trading        | BOOLEAN | NO       | FALSE   | Allow inter-class trades    |
| max_active_listings        | INTEGER | NO       | 5       | Max listings per student    |
| max_listing_duration_days  | INTEGER | NO       | 7       | Listing expiration          |
| min_trade_interval_hours   | INTEGER | NO       | 0       | Cooldown between trades     |
| teacher_approval_required  | BOOLEAN | NO       | FALSE   | Require teacher approval    |
| gidouilles_trading_enabled | BOOLEAN | NO       | TRUE    | Allow gidouilles in trades  |
| max_gidouilles_per_trade   | INTEGER | YES      |         | Cap on gidouilles per trade |

### `marketplace_listings`

Public sell/buy listings.

| Column          | Type        | Nullable | Description                                   |
| --------------- | ----------- | -------- | --------------------------------------------- |
| id              | UUID        | NO       | Primary key                                   |
| student_id      | UUID        | NO       | Listing creator                               |
| class_id        | UUID        | NO       | Creator's class                               |
| listing_type    | TEXT        | NO       | 'sell' or 'buy'                               |
| item_type       | TEXT        | NO       | 'vip_card' or 'shop_item'                     |
| item_details    | JSONB       | NO       | Item specification                            |
| asking_price    | INTEGER     | YES      | Gidouilles requested/offered                  |
| accepting_items | JSONB       | YES      | Items accepted in trade                       |
| status          | TEXT        | NO       | 'active', 'completed', 'cancelled', 'expired' |
| created_at      | TIMESTAMPTZ | NO       | Listing creation                              |
| expires_at      | TIMESTAMPTZ | YES      | Listing expiration                            |
| completed_at    | TIMESTAMPTZ | YES      | When trade completed                          |

### `marketplace_trades`

Friend-to-friend direct trades.

| Column        | Type        | Nullable | Description                                                    |
| ------------- | ----------- | -------- | -------------------------------------------------------------- |
| id            | UUID        | NO       | Primary key                                                    |
| initiator_id  | UUID        | NO       | Trade initiator                                                |
| partner_id    | UUID        | NO       | Trade partner                                                  |
| trade_type    | TEXT        | NO       | 'direct', 'listing_response'                                   |
| status        | TEXT        | NO       | 'pending', 'negotiating', 'accepted', 'completed', 'cancelled' |
| initial_offer | JSONB       | YES      | First offer details                                            |
| final_trade   | JSONB       | YES      | Completed trade details                                        |
| created_at    | TIMESTAMPTZ | NO       | Trade initiation                                               |
| completed_at  | TIMESTAMPTZ | YES      | Trade completion                                               |

**Trade JSONB Structure:**

```jsonc
{
	"from_initiator": {
		"gidouilles": 10,
		"vip_cards": ["card-instance-uuid"],
		"shop_items": ["inventory-id"]
	},
	"from_partner": {
		"gidouilles": 0,
		"vip_cards": ["card-instance-uuid-2"],
		"shop_items": []
	}
}
```

---

## Unified Audit Trail

### `reward_events`

Aggregates all reward movements for comprehensive tracking.

| Column       | Type              | Nullable | Description                                                                       |
| ------------ | ----------------- | -------- | --------------------------------------------------------------------------------- |
| id           | UUID              | NO       | Primary key                                                                       |
| student_id   | UUID              | NO       | FK to profiles                                                                    |
| reward_type  | reward_type       | NO       | ENUM: gidouilles, bonus, vip_card, achievement, item                              |
| event_type   | reward_event_type | NO       | ENUM: earned, spent, traded, used, expired, unlocked, purchased, awarded, removed |
| amount       | INTEGER           | YES      | For currency rewards (+/-)                                                        |
| item_name    | TEXT              | YES      | Display name for items/cards                                                      |
| description  | TEXT              | NO       | French description for journal                                                    |
| metadata     | JSONB             | YES      | Additional context                                                                |
| source_table | TEXT              | NO       | Origin table name                                                                 |
| source_id    | UUID              | YES      | ID in source table                                                                |
| class_id     | UUID              | YES      | FK to classes                                                                     |
| created_by   | UUID              | YES      | Who triggered (NULL = system)                                                     |
| created_at   | TIMESTAMPTZ       | NO       | Event timestamp                                                                   |

**Source Tables:**

- `gidouilles_history`
- `bonus_history`
- `vip_cards_activity`
- `student_achievements`
- `shop_purchase_history`
- `item_usage_log`
- `marketplace_trades`

---

## Indexes

### Primary Indexes

```sql
-- Student journal queries
CREATE INDEX idx_reward_events_student_time
ON reward_events(student_id, created_at DESC);

-- Filtered by reward type
CREATE INDEX idx_reward_events_student_type_time
ON reward_events(student_id, reward_type, created_at DESC);

-- Teacher class view
CREATE INDEX idx_reward_events_class_time
ON reward_events(class_id, created_at DESC)
WHERE class_id IS NOT NULL;

-- Deduplication checks
CREATE INDEX idx_reward_events_source_lookup
ON reward_events(source_table, source_id, student_id)
WHERE source_id IS NOT NULL;
```

### Shop Indexes

```sql
-- Active items listing
CREATE INDEX idx_shop_items_active
ON shop_item_templates(is_active, sort_order)
WHERE is_active = TRUE;

-- Student inventory lookup
CREATE INDEX idx_inventory_student
ON student_item_inventory(student_id, template_id);
```

---

## Migrations Reference

| Migration File                                       | Description                   |
| ---------------------------------------------------- | ----------------------------- |
| `20251104115149_add_vip_card_templates_tables.sql`   | VIP card templates and config |
| `20251113140344_create_gidouilles_history_table.sql` | Gidouilles history table      |
| `20251113140345_create_bonus_history_table.sql`      | Bonus history table           |
| `20251113140346_create_vip_cards_activity_table.sql` | VIP cards activity log        |
| `20251113140349_create_weekly_rewards_table.sql`     | Weekly rewards tracking       |
| `20251114082611_marketplace_foundation.sql`          | Marketplace tables            |
| `20251121080310_create_shop_system.sql`              | Shop system tables            |
| `20251121115959_create_reward_events_table.sql`      | Unified audit trail           |
