# Marketplace Database Schema

> Complete database schema documentation for marketplace and shop systems.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    profiles     │       │     schools     │       │     classes     │
│    (users)      │       │                 │       │                 │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ gidouilles      │       │ name            │       │ school_id (FK)  │
│ role            │       │ ...             │       │ ...             │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │    ┌────────────────────┴─────────────────────────┘
         │    │
         │    ▼
         │  ┌─────────────────────────────────────────────────────────┐
         │  │                 marketplace_config                      │
         │  ├─────────────────────────────────────────────────────────┤
         │  │ id (PK)                                                 │
         │  │ school_id (FK, nullable) ─── mutually exclusive         │
         │  │ class_id (FK, nullable)  ───────────────────┘           │
         │  │ enabled_globally, enabled_for_class                     │
         │  │ max_listings_per_student, max_trades_per_day            │
         │  │ listing_duration_days                                   │
         │  └─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      marketplace_listings                           │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK), creator_id (FK), school_id (FK)                            │
│ listing_type ('sell' | 'buy'), status                               │
│ offered_card_ids[], offered_gidouilles, offered_item_ids[]          │
│ wanted_card_template_ids[], wanted_gidouilles, wanted_item_ids[]    │
│ title, description, expires_at, view_count, proposal_count          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
          ┌────────────────────┴────────────────────┐
          ▼                                         ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│  marketplace_proposals  │             │   marketplace_trades    │
├─────────────────────────┤             ├─────────────────────────┤
│ id, listing_id, status  │             │ id, trade_type, status  │
│ proposer_id             │             │ initiator_id, partner_id│
│ offered_card_ids[]      │             │ current_offer (JSONB)   │
│ offered_gidouilles      │             │ final_trade (JSONB)     │
└─────────────────────────┘             └────────────┬────────────┘
                                                     │
                          ┌──────────────────────────┴──────────────┐
                          ▼                                         ▼
              ┌───────────────────────┐             ┌───────────────────────┐
              │ marketplace_trade_    │             │ marketplace_chat_     │
              │ offers                │             │ messages              │
              ├───────────────────────┤             ├───────────────────────┤
              │ id, trade_id          │             │ id, trade_id          │
              │ offered_by, offer_num │             │ sender_id, message    │
              │ initiator/partner data│             │ is_flagged            │
              └───────────────────────┘             └───────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                      marketplace_locked_cards                       │
├─────────────────────────────────────────────────────────────────────┤
│ id, student_id, card_instance_id, locked_for, locked_entity_id      │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                      shop_item_templates                            │
├─────────────────────────────────────────────────────────────────────┤
│ id, internal_name, display_name, description                        │
│ category, item_type, rarity, base_price, discount_percentage        │
│ is_active, available_from/until, max_owned, purchase_limits         │
│ properties (JSONB), is_tradeable, icon_url, sort_order              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
          ┌────────────────────┴────────────────────┐
          ▼                                         ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│ student_item_inventory  │             │ shop_purchase_history   │
├─────────────────────────┤             ├─────────────────────────┤
│ id, student_id          │             │ id, student_id          │
│ template_id, quantity   │             │ template_id, inventory_id│
│ uses_remaining          │             │ quantity, prices        │
│ is_equipped, acquired_at│             │ purchased_at, refund    │
│ is_locked, lock refs    │             └─────────────────────────┘
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│    item_usage_log       │
├─────────────────────────┤
│ id, student_id          │
│ inventory_id, template_id│
│ usage_context, used_at  │
│ effect_applied (JSONB)  │
└─────────────────────────┘
```

## Table Specifications

### marketplace_config

| Column                     | Type    | Default | Description                        |
| -------------------------- | ------- | ------- | ---------------------------------- |
| `id`                       | UUID    | auto    | Primary key                        |
| `school_id`                | UUID    | NULL    | FK to schools (mutually exclusive) |
| `class_id`                 | UUID    | NULL    | FK to classes (mutually exclusive) |
| `enabled_globally`         | BOOLEAN | true    | School enable flag                 |
| `enabled_for_class`        | BOOLEAN | true    | Class enable flag                  |
| `max_listings_per_student` | INTEGER | 5       | Max concurrent listings (1-20)     |
| `max_trades_per_day`       | INTEGER | 10      | Daily trade limit (1-100)          |
| `listing_duration_days`    | INTEGER | 7       | Days until expiry (1-30)           |

### marketplace_listings

| Column                     | Type        | Description                                   |
| -------------------------- | ----------- | --------------------------------------------- |
| `id`                       | UUID        | Primary key                                   |
| `creator_id`               | UUID        | FK to profiles                                |
| `school_id`                | UUID        | FK to schools                                 |
| `listing_type`             | TEXT        | 'sell' or 'buy'                               |
| `status`                   | TEXT        | 'active', 'expired', 'completed', 'cancelled' |
| `offered_card_ids`         | TEXT[]      | VIP card instance IDs                         |
| `offered_gidouilles`       | INTEGER     | Gidouilles offered (0-10000)                  |
| `wanted_card_template_ids` | TEXT[]      | Card templates wanted                         |
| `wanted_gidouilles`        | INTEGER     | Gidouilles wanted                             |
| `title`                    | TEXT        | 3-100 characters                              |
| `description`              | TEXT        | Max 500 characters                            |
| `expires_at`               | TIMESTAMPTZ | Auto-calculated expiry                        |
| `view_count`               | INTEGER     | Number of views                               |
| `proposal_count`           | INTEGER     | Number of proposals                           |

### marketplace_trades

| Column                    | Type        | Description                                      |
| ------------------------- | ----------- | ------------------------------------------------ |
| `id`                      | UUID        | Primary key                                      |
| `trade_type`              | TEXT        | 'friend' or 'marketplace'                        |
| `status`                  | TEXT        | 'negotiating', 'completed', 'cancelled'          |
| `initiator_id`            | UUID        | Trade initiator                                  |
| `partner_id`              | UUID        | Trade partner                                    |
| `listing_id`              | UUID        | Source listing (if marketplace)                  |
| `proposal_id`             | UUID        | Source proposal (if marketplace)                 |
| `current_offer`           | JSONB       | Current negotiation state                        |
| `final_trade`             | JSONB       | Final executed trade                             |
| `last_offer_by`           | UUID        | Who made last offer                              |
| `validated_by_initiator`  | BOOLEAN     | TRUE when initiator validated current offer      |
| `validated_by_partner`    | BOOLEAN     | TRUE when partner validated current offer        |
| `validated_at`            | TIMESTAMPTZ | Timestamp when both parties validated (auto-set) |
| `confirmation_started_at` | TIMESTAMPTZ | Timestamp when confirmation modal opened         |

### shop_item_templates

| Column                  | Type    | Description                                    |
| ----------------------- | ------- | ---------------------------------------------- |
| `id`                    | UUID    | Primary key                                    |
| `internal_name`         | TEXT    | Unique snake_case identifier                   |
| `display_name`          | TEXT    | French display name                            |
| `description`           | TEXT    | French description                             |
| `category`              | TEXT    | 'consumable', 'booster', 'cosmetic', 'utility' |
| `rarity`                | TEXT    | 'common' to 'legendary'                        |
| `base_price`            | INTEGER | Price in gidouilles (1-100000)                 |
| `discount_percentage`   | INTEGER | 0-100%                                         |
| `is_active`             | BOOLEAN | Availability flag                              |
| `max_owned_per_student` | INTEGER | Ownership limit                                |
| `daily_purchase_limit`  | INTEGER | Daily cap                                      |
| `properties`            | JSONB   | Item-specific properties                       |

### student_item_inventory

| Column           | Type    | Description                     |
| ---------------- | ------- | ------------------------------- |
| `id`             | UUID    | Primary key                     |
| `student_id`     | UUID    | Item owner                      |
| `template_id`    | UUID    | Item template                   |
| `quantity`       | INTEGER | Number owned                    |
| `uses_remaining` | INTEGER | For multi-use items             |
| `is_equipped`    | BOOLEAN | Equipment state                 |
| `acquired_from`  | TEXT    | 'shop', 'trade', 'reward', etc. |
| `is_locked`      | BOOLEAN | Locked for trade                |

## RLS Policies Summary

| Table                    | Policy        | Access                          |
| ------------------------ | ------------- | ------------------------------- |
| `marketplace_listings`   | SELECT        | Students: school listings + own |
|                          | INSERT        | Students only, respects limits  |
|                          | UPDATE/DELETE | Creator only                    |
| `marketplace_trades`     | SELECT        | Participants only               |
|                          | INSERT/UPDATE | Participants only               |
| `shop_item_templates`    | SELECT        | All auth users (active items)   |
|                          | ALL           | Admins only                     |
| `student_item_inventory` | SELECT        | Own + teachers for class        |
|                          | INSERT        | Via RPC only                    |

## Database Functions

### purchase_shop_item(student_id, template_id, quantity)

Atomic purchase with balance check, limit validation, inventory creation.

### execute_trade(trade_id, accepting_user_id)

Atomic trade execution with card/gidouilles transfer and unlock.
