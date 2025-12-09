# Database Schema Reference

> Complete schema documentation for all audit trail tables.

## Table of Contents

- [Unified Audit Table](#unified-audit-table)
  - [reward_events](#reward_events)
- [Source Audit Tables](#source-audit-tables)
  - [gidouilles_history](#gidouilles_history)
  - [bonus_history](#bonus_history)
  - [vip_cards_activity](#vip_cards_activity)
  - [shop_purchase_history](#shop_purchase_history)
  - [item_usage_log](#item_usage_log)
- [Specialized Audit Tables](#specialized-audit-tables)
  - [template_audit_log](#template_audit_log)
  - [moderation_logs](#moderation_logs)
  - [error_logs](#error_logs)
- [Enum Types](#enum-types)

---

## Unified Audit Table

### reward_events

**Migration**: `supabase/migrations/20251121115959_create_reward_events_table.sql`

The central audit table that aggregates all reward-related events from source tables via database triggers.

#### Columns

| Column         | Type                | Nullable | Default             | Description                              |
| -------------- | ------------------- | -------- | ------------------- | ---------------------------------------- |
| `id`           | `UUID`              | NOT NULL | `gen_random_uuid()` | Primary key                              |
| `student_id`   | `UUID`              | NOT NULL | -                   | FK → `profiles(id)`                      |
| `reward_type`  | `reward_type`       | NOT NULL | -                   | Type of reward (enum)                    |
| `event_type`   | `reward_event_type` | NOT NULL | -                   | Action type (enum)                       |
| `amount`       | `INTEGER`           | NULL     | -                   | Amount for currency rewards              |
| `item_name`    | `TEXT`              | NULL     | -                   | Display name for items/cards             |
| `description`  | `TEXT`              | NOT NULL | -                   | Human-readable French description        |
| `metadata`     | `JSONB`             | NOT NULL | `'{}'`              | Additional context data                  |
| `source_table` | `TEXT`              | NOT NULL | -                   | Origin table name                        |
| `source_id`    | `UUID`              | NULL     | -                   | ID in source table                       |
| `class_id`     | `UUID`              | NULL     | -                   | FK → `classes(id)` for teacher filtering |
| `created_by`   | `UUID`              | NULL     | -                   | FK → `profiles(id)` who triggered event  |
| `created_at`   | `TIMESTAMPTZ`       | NOT NULL | `now()`             | Event timestamp                          |

#### Indexes

| Name                                  | Columns                                                    | Purpose            |
| ------------------------------------- | ---------------------------------------------------------- | ------------------ |
| `idx_reward_events_student_time`      | `(student_id, created_at DESC)`                            | Main journal query |
| `idx_reward_events_student_type_time` | `(student_id, reward_type, created_at DESC)`               | Filtered by type   |
| `idx_reward_events_class_time`        | `(class_id, created_at DESC)` WHERE `class_id IS NOT NULL` | Teacher view       |
| `idx_reward_events_source_lookup`     | `(source_table, source_id, student_id)`                    | Deduplication      |
| `idx_reward_events_event_type`        | `(event_type, created_at DESC)`                            | Analytics          |

#### Example Query

```sql
-- Student journal with filtering
SELECT * FROM reward_events
WHERE student_id = $1
  AND ($2::reward_type IS NULL OR reward_type = $2)
ORDER BY created_at DESC
LIMIT 20;
```

---

## Source Audit Tables

### gidouilles_history

**Migration**: `supabase/migrations/20251113140344_create_gidouilles_history_table.sql`

Tracks all changes to student gidouilles (virtual currency).

#### Columns

| Column       | Type          | Nullable | Default             | Description                         |
| ------------ | ------------- | -------- | ------------------- | ----------------------------------- |
| `id`         | `UUID`        | NOT NULL | `gen_random_uuid()` | Primary key                         |
| `student_id` | `UUID`        | NOT NULL | -                   | FK → `profiles(id)`                 |
| `class_id`   | `UUID`        | NULL     | -                   | FK → `classes(id)`                  |
| `delta`      | `INTEGER`     | NOT NULL | -                   | Change amount (+/-)                 |
| `reason`     | `TEXT`        | NULL     | -                   | Reason for change                   |
| `created_by` | `UUID`        | NULL     | -                   | FK → `profiles(id)` (NULL = system) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()`             | Timestamp                           |

#### Indexes

| Name                                  | Columns                         |
| ------------------------------------- | ------------------------------- |
| `idx_gidouilles_history_student_time` | `(student_id, created_at DESC)` |
| `idx_gidouilles_history_class_time`   | `(class_id, created_at DESC)`   |
| `idx_gidouilles_history_created_at`   | `(created_at DESC)`             |

#### Event Mapping to reward_events

| delta                                            | event_type |
| ------------------------------------------------ | ---------- |
| `> 0` with `created_by IS NULL`                  | `earned`   |
| `> 0` with `created_by IS NOT NULL`              | `awarded`  |
| `< 0` with reason LIKE '%achat%' or '%boutique%' | `spent`    |
| `< 0` with reason LIKE '%échange%' or '%trade%'  | `traded`   |
| `< 0` with `created_by IS NOT NULL`              | `removed`  |
| `< 0` (other)                                    | `spent`    |

---

### bonus_history

**Migration**: `supabase/migrations/20251113140345_create_bonus_history_table.sql`

Tracks all changes to student bonus points. Structure identical to `gidouilles_history`.

#### Columns

Same as `gidouilles_history`.

#### Event Mapping to reward_events

| delta | event_type |
| ----- | ---------- |
| `> 0` | `earned`   |
| `< 0` | `used`     |

---

### vip_cards_activity

**Migration**: `supabase/migrations/20251113140346_create_vip_cards_activity_table.sql`

Tracks VIP card lifecycle events (gained, used, removed).

#### Columns

| Column             | Type          | Nullable | Default             | Description                                  |
| ------------------ | ------------- | -------- | ------------------- | -------------------------------------------- |
| `id`               | `UUID`        | NOT NULL | `gen_random_uuid()` | Primary key                                  |
| `student_id`       | `UUID`        | NOT NULL | -                   | FK → `profiles(id)`                          |
| `card_instance_id` | `TEXT`        | NOT NULL | -                   | Unique instance ID                           |
| `card_template_id` | `TEXT`        | NOT NULL | -                   | Template ID (e.g., `time-master`)            |
| `action`           | `TEXT`        | NOT NULL | -                   | CHECK IN (`'gained'`, `'used'`, `'removed'`) |
| `metadata`         | `JSONB`       | NULL     | `'{}'`              | Additional context                           |
| `created_at`       | `TIMESTAMPTZ` | NOT NULL | `now()`             | Timestamp                                    |

#### Indexes

| Name                                   | Columns                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `idx_vip_cards_activity_student_time`  | `(student_id, created_at DESC)`                             |
| `idx_vip_cards_activity_action_time`   | `(action, created_at DESC)`                                 |
| `idx_vip_cards_activity_card_instance` | `(card_instance_id)`                                        |
| `idx_vip_cards_activity_dedup`         | `(student_id, card_instance_id, action, created_at)` UNIQUE |

#### Constraints

- `UNIQUE(student_id, card_instance_id, action, created_at)` - Prevents race condition duplicates

---

### shop_purchase_history

**Migration**: `supabase/migrations/20251121080310_create_shop_system.sql` (lines 159-186)

Complete purchase audit trail with refund support.

#### Columns

| Column                  | Type          | Nullable | Default             | Description                       |
| ----------------------- | ------------- | -------- | ------------------- | --------------------------------- |
| `id`                    | `UUID`        | NOT NULL | `gen_random_uuid()` | Primary key                       |
| `student_id`            | `UUID`        | NOT NULL | -                   | FK → `profiles(id)`               |
| `template_id`           | `UUID`        | NOT NULL | -                   | FK → `shop_item_templates(id)`    |
| `inventory_id`          | `UUID`        | NULL     | -                   | FK → `student_item_inventory(id)` |
| `quantity`              | `INTEGER`     | NOT NULL | -                   | Purchase quantity                 |
| `unit_price`            | `INTEGER`     | NOT NULL | -                   | Price per unit at purchase time   |
| `total_price`           | `INTEGER`     | NOT NULL | -                   | Total cost                        |
| `discount_applied`      | `INTEGER`     | NOT NULL | `0`                 | Discount amount                   |
| `purchase_context`      | `JSONB`       | NOT NULL | `'{}'`              | Context (promo codes, events)     |
| `gidouilles_history_id` | `UUID`        | NULL     | -                   | Link to currency transaction      |
| `purchased_at`          | `TIMESTAMPTZ` | NOT NULL | `now()`             | Purchase timestamp                |
| `refunded_at`           | `TIMESTAMPTZ` | NULL     | -                   | Refund timestamp (soft delete)    |
| `refund_reason`         | `TEXT`        | NULL     | -                   | Refund reason                     |
| `refunded_by`           | `UUID`        | NULL     | -                   | FK → `auth.users(id)`             |

---

### item_usage_log

**Migration**: `supabase/migrations/20251121080310_create_shop_system.sql` (lines 195-216)

Tracks when students use purchased items and their effects.

#### Columns

| Column              | Type          | Nullable | Default             | Description                                 |
| ------------------- | ------------- | -------- | ------------------- | ------------------------------------------- |
| `id`                | `UUID`        | NOT NULL | `gen_random_uuid()` | Primary key                                 |
| `student_id`        | `UUID`        | NOT NULL | -                   | FK → `profiles(id)`                         |
| `inventory_id`      | `UUID`        | NOT NULL | -                   | FK → `student_item_inventory(id)`           |
| `template_id`       | `UUID`        | NOT NULL | -                   | FK → `shop_item_templates(id)`              |
| `used_at`           | `TIMESTAMPTZ` | NOT NULL | `now()`             | Usage timestamp                             |
| `usage_context`     | `TEXT`        | NOT NULL | -                   | Context (e.g., `minesweeper`, `assessment`) |
| `usage_data`        | `JSONB`       | NOT NULL | `'{}'`              | Context-specific data                       |
| `effect_applied`    | `JSONB`       | NOT NULL | `'{}'`              | Applied effect details                      |
| `effect_expires_at` | `TIMESTAMPTZ` | NULL     | -                   | Effect expiration                           |
| `reversed_at`       | `TIMESTAMPTZ` | NULL     | -                   | Reversal timestamp                          |
| `reversal_reason`   | `TEXT`        | NULL     | -                   | Reversal reason                             |
| `reversed_by`       | `UUID`        | NULL     | -                   | FK → `auth.users(id)`                       |

---

## Specialized Audit Tables

### template_audit_log

**Migration**: `supabase/migrations/098_enhance_message_templates.sql` (lines 167-194)

Comprehensive audit trail for message template lifecycle.

#### Columns

| Column         | Type          | Nullable | Default             | Description                   |
| -------------- | ------------- | -------- | ------------------- | ----------------------------- |
| `id`           | `UUID`        | NOT NULL | `gen_random_uuid()` | Primary key                   |
| `template_id`  | `UUID`        | NOT NULL | -                   | FK → `message_templates(id)`  |
| `action`       | `TEXT`        | NOT NULL | -                   | Action type (see below)       |
| `performed_by` | `UUID`        | NOT NULL | -                   | FK → `profiles(id)`           |
| `performed_at` | `TIMESTAMPTZ` | NOT NULL | `now()`             | Timestamp                     |
| `changes`      | `JSONB`       | NULL     | -                   | Old vs new values for updates |
| `metadata`     | `JSONB`       | NULL     | `'{}'`              | Additional context            |
| `ip_address`   | `INET`        | NULL     | -                   | Request IP address            |
| `user_agent`   | `TEXT`        | NULL     | -                   | Browser user agent            |

#### Action Types

```sql
CHECK (action IN (
  'created', 'updated', 'deleted', 'duplicated',
  'used', 'favorited', 'unfavorited',
  'approved', 'rejected', 'submitted_for_approval'
))
```

#### Indexes

| Name                     | Columns                             |
| ------------------------ | ----------------------------------- |
| `idx_audit_log_template` | `(template_id, performed_at DESC)`  |
| `idx_audit_log_user`     | `(performed_by, performed_at DESC)` |
| `idx_audit_log_action`   | `(action, performed_at DESC)`       |
| `idx_audit_log_date`     | `(performed_at DESC)`               |

---

### moderation_logs

**Migration**: `supabase/migrations/20251110120001_create_moderation_logs_and_update_rls.sql` (lines 17-45)

Audit trail for chat moderation actions.

#### Columns

| Column         | Type          | Nullable | Default             | Description                |
| -------------- | ------------- | -------- | ------------------- | -------------------------- |
| `id`           | `UUID`        | NOT NULL | `gen_random_uuid()` | Primary key                |
| `moderator_id` | `UUID`        | NOT NULL | -                   | FK → `profiles(id)`        |
| `action`       | `TEXT`        | NOT NULL | -                   | Action type (see below)    |
| `target_type`  | `TEXT`        | NOT NULL | -                   | Target entity type         |
| `target_id`    | `UUID`        | NOT NULL | -                   | Affected entity ID (no FK) |
| `reason`       | `TEXT`        | NULL     | -                   | Action reason              |
| `metadata`     | `JSONB`       | NOT NULL | `'{}'`              | Additional context         |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL | `now()`             | Timestamp                  |

#### Action Types

```sql
CHECK (action IN (
  'delete_message', 'mute_user', 'unmute_user',
  'timeout_user', 'ban_user', 'unban_user',
  'review_report', 'export_conversation'
))
```

#### Target Types

```sql
CHECK (target_type IN ('message', 'user', 'conversation', 'report'))
```

#### Design Note

`target_id` has no foreign key constraint intentionally - audit records must persist even if the target entity is deleted.

#### Indexes

| Name                            | Columns                           |
| ------------------------------- | --------------------------------- |
| `idx_moderation_logs_moderator` | `(moderator_id, created_at DESC)` |
| `idx_moderation_logs_target`    | `(target_type, target_id)`        |
| `idx_moderation_logs_action`    | `(action, created_at DESC)`       |

---

### error_logs

**Migration**: `supabase/migrations/100_create_error_monitoring_system.sql` (lines 24-97)

Comprehensive error monitoring and tracking system.

#### Columns

| Column             | Type          | Nullable | Default             | Description                |
| ------------------ | ------------- | -------- | ------------------- | -------------------------- |
| `id`               | `UUID`        | NOT NULL | `gen_random_uuid()` | Primary key                |
| `error_type`       | `TEXT`        | NOT NULL | -                   | Error category             |
| `severity`         | `TEXT`        | NOT NULL | -                   | Severity level             |
| `message`          | `TEXT`        | NOT NULL | -                   | Error message              |
| `stack_trace`      | `TEXT`        | NULL     | -                   | Sanitized stack trace      |
| `error_name`       | `TEXT`        | NULL     | -                   | Error constructor name     |
| `url`              | `TEXT`        | NOT NULL | -                   | Page URL or endpoint       |
| `file_path`        | `TEXT`        | NULL     | -                   | Source file location       |
| `line_number`      | `INTEGER`     | NULL     | -                   | Line number                |
| `column_number`    | `INTEGER`     | NULL     | -                   | Column number              |
| `user_id`          | `UUID`        | NULL     | -                   | FK → `profiles(id)`        |
| `user_role`        | `TEXT`        | NULL     | -                   | User role at time of error |
| `session_id`       | `TEXT`        | NULL     | -                   | Session identifier         |
| `request_method`   | `TEXT`        | NULL     | -                   | HTTP method                |
| `status_code`      | `INTEGER`     | NULL     | -                   | HTTP status code           |
| `request_headers`  | `JSONB`       | NULL     | -                   | Sanitized request headers  |
| `request_body`     | `JSONB`       | NULL     | -                   | Sanitized request body     |
| `response_time`    | `INTEGER`     | NULL     | -                   | Response time (ms)         |
| `user_agent`       | `TEXT`        | NULL     | -                   | Browser user agent         |
| `browser_name`     | `TEXT`        | NULL     | -                   | Parsed browser name        |
| `browser_version`  | `TEXT`        | NULL     | -                   | Parsed browser version     |
| `os_name`          | `TEXT`        | NULL     | -                   | Operating system           |
| `device_type`      | `TEXT`        | NULL     | -                   | Device type                |
| `viewport_width`   | `INTEGER`     | NULL     | -                   | Viewport width             |
| `viewport_height`  | `INTEGER`     | NULL     | -                   | Viewport height            |
| `context`          | `JSONB`       | NULL     | `'{}'`              | Additional context         |
| `tags`             | `TEXT[]`      | NULL     | `'{}'`              | Categorization tags        |
| `resolved`         | `BOOLEAN`     | NOT NULL | `false`             | Resolution status          |
| `resolved_by`      | `UUID`        | NULL     | -                   | FK → `profiles(id)`        |
| `resolved_at`      | `TIMESTAMPTZ` | NULL     | -                   | Resolution timestamp       |
| `resolution_notes` | `TEXT`        | NULL     | -                   | Resolution notes           |
| `error_signature`  | `TEXT`        | NULL     | -                   | Hash for deduplication     |
| `created_at`       | `TIMESTAMPTZ` | NOT NULL | `now()`             | Timestamp                  |

#### Error Types

```sql
CHECK (error_type IN (
  'client_js', 'server_api', 'server_load',
  'server_action', 'validation', 'performance', 'database'
))
```

#### Severity Levels

```sql
CHECK (severity IN ('info', 'warning', 'error', 'critical'))
```

---

## Enum Types

### reward_type

```sql
CREATE TYPE public.reward_type AS ENUM (
  'gidouilles',
  'bonus',
  'vip_card',
  'achievement',
  'item'
);
```

### reward_event_type

```sql
CREATE TYPE public.reward_event_type AS ENUM (
  'earned',
  'spent',
  'traded',
  'used',
  'expired',
  'unlocked',
  'purchased',
  'awarded',
  'removed'
);
```

---

## Schema Relationships Diagram

```
profiles (id)
    │
    ├──< gidouilles_history (student_id, created_by)
    │         │
    │         └──> reward_events (via trigger)
    │
    ├──< bonus_history (student_id, created_by)
    │         │
    │         └──> reward_events (via trigger)
    │
    ├──< vip_cards_activity (student_id)
    │         │
    │         └──> reward_events (via trigger)
    │
    ├──< shop_purchase_history (student_id)
    │         │
    │         └──> reward_events (via trigger)
    │
    ├──< item_usage_log (student_id)
    │         │
    │         └──> reward_events (via trigger)
    │
    ├──< student_achievements (student_id)
    │         │
    │         └──> reward_events (via trigger)
    │
    ├──< marketplace_trades (sender_id, receiver_id)
    │         │
    │         └──> reward_events (via trigger, 2 events per trade)
    │
    ├──< template_audit_log (performed_by)
    │
    ├──< moderation_logs (moderator_id)
    │
    └──< error_logs (user_id, resolved_by)
```
