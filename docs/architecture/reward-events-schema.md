# Reward Events Schema

**Status:** Complete
**Date:** 2025-11-21
**Migration:** `supabase/migrations/20251121115959_create_reward_events_table.sql`

---

## Table of Contents

1. [Overview](#overview)
2. [Table Schema](#table-schema)
3. [Enum Types](#enum-types)
4. [Indexes](#indexes)
5. [Row Level Security](#row-level-security)
6. [Triggers](#triggers)
7. [Helper Function](#helper-function)
8. [Usage Examples](#usage-examples)
9. [Integration Notes](#integration-notes)

---

## Overview

The `reward_events` table provides a **unified audit trail** for all reward-related movements across the UbuMaths platform. It aggregates events from multiple source tables into a single, queryable location for:

- **Student Journal Display**: Complete history of all rewards earned, spent, and traded
- **Teacher Monitoring**: View student activity across all reward types
- **Audit & Debugging**: Full traceability back to source records
- **Analytics**: Comprehensive reward flow analysis

### Key Features

- **Unified View**: All reward types (gidouilles, bonus, VIP cards, achievements, items) in one table
- **Automatic Population**: Triggers automatically log events from 7 source tables
- **Deduplication**: Built-in checks prevent duplicate entries
- **French Descriptions**: Human-readable descriptions generated automatically
- **Full Traceability**: Links back to original source records

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Source Tables                                │
├──────────────────┬──────────────────┬──────────────────────────────┤
│ gidouilles_      │ bonus_history    │ vip_cards_activity          │
│ history          │                  │                              │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ student_         │ shop_purchase_   │ item_usage_log              │
│ achievements     │ history          │                              │
├──────────────────┴──────────────────┴──────────────────────────────┤
│                       marketplace_trades                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (AFTER INSERT triggers)
                    ┌─────────────────────┐
                    │   reward_events     │
                    │   (unified table)   │
                    └─────────────────────┘
```

---

## Table Schema

### reward_events

Unified audit trail for all reward-related events across the platform.

| Column       | Type                     | Nullable     | Description                                                          |
| ------------ | ------------------------ | ------------ | -------------------------------------------------------------------- |
| id           | UUID (PK)                | NOT NULL     | Unique event identifier (auto-generated)                             |
| student_id   | UUID (FK -> profiles)    | NOT NULL     | Student this event belongs to                                        |
| reward_type  | reward_type (ENUM)       | NOT NULL     | Type of reward (gidouilles, bonus, vip_card, achievement, item)      |
| event_type   | reward_event_type (ENUM) | NOT NULL     | Action type (earned, spent, traded, used, etc.)                      |
| amount       | INTEGER                  | NULL         | Amount for currency rewards (positive or negative), NULL for items   |
| item_name    | TEXT                     | NULL         | Display name for VIP cards/items/achievements                        |
| description  | TEXT                     | NOT NULL     | Human-readable description in French                                 |
| metadata     | JSONB                    | DEFAULT '{}' | Additional context data specific to event type                       |
| source_table | TEXT                     | NOT NULL     | Origin table name for debugging/audit                                |
| source_id    | UUID                     | NULL         | ID in source table for traceability                                  |
| class_id     | UUID (FK -> classes)     | NULL         | Class context for teacher filtering (SET NULL on delete)             |
| created_by   | UUID (FK -> profiles)    | NULL         | Who triggered the event (NULL for system events, SET NULL on delete) |
| created_at   | TIMESTAMPTZ              | NOT NULL     | Event timestamp (defaults to NOW())                                  |

### Constraints

```sql
CONSTRAINT valid_amount CHECK (
    (reward_type IN ('gidouilles', 'bonus') AND amount IS NOT NULL) OR
    (reward_type NOT IN ('gidouilles', 'bonus'))
)
```

This ensures:

- Currency-based rewards (`gidouilles`, `bonus`) always have an amount
- Non-currency rewards (`vip_card`, `achievement`, `item`) may have NULL amounts

---

## Enum Types

### reward_type

Identifies the category of reward.

| Value         | Description                                   |
| ------------- | --------------------------------------------- |
| `gidouilles`  | Primary in-game currency                      |
| `bonus`       | Secondary currency for special actions        |
| `vip_card`    | Special privilege cards (homework pass, etc.) |
| `achievement` | Unlocked achievements/badges                  |
| `item`        | Shop-purchased items                          |

### reward_event_type

Describes what action occurred with the reward.

| Value       | Description                                |
| ----------- | ------------------------------------------ |
| `earned`    | Gained through activity (quiz, game, etc.) |
| `spent`     | Used for a purchase                        |
| `traded`    | Exchanged with another student             |
| `used`      | Consumed/activated (e.g., bonus used)      |
| `expired`   | Time-limited item expired                  |
| `unlocked`  | Achievement unlocked                       |
| `purchased` | Bought from shop                           |
| `awarded`   | Given by teacher/system as reward          |
| `removed`   | Removed by teacher/system                  |

---

## Indexes

Five indexes optimize common query patterns:

### idx_reward_events_student_time

```sql
CREATE INDEX idx_reward_events_student_time
ON public.reward_events(student_id, created_at DESC);
```

**Purpose**: Main journal query - fetches a student's complete event history sorted by time.

**Optimizes**:

```sql
SELECT * FROM reward_events
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT 50;
```

### idx_reward_events_student_type_time

```sql
CREATE INDEX idx_reward_events_student_type_time
ON public.reward_events(student_id, reward_type, created_at DESC);
```

**Purpose**: Filtered journal queries by reward type.

**Optimizes**:

```sql
SELECT * FROM reward_events
WHERE student_id = $1 AND reward_type = 'gidouilles'
ORDER BY created_at DESC;
```

### idx_reward_events_class_time

```sql
CREATE INDEX idx_reward_events_class_time
ON public.reward_events(class_id, created_at DESC)
WHERE class_id IS NOT NULL;
```

**Purpose**: Teacher view - browse all events for students in a class.

**Optimizes**:

```sql
SELECT * FROM reward_events
WHERE class_id = $1
ORDER BY created_at DESC
LIMIT 100;
```

### idx_reward_events_source_lookup

```sql
CREATE INDEX idx_reward_events_source_lookup
ON public.reward_events(source_table, source_id, student_id)
WHERE source_id IS NOT NULL;
```

**Purpose**: Deduplication checks in triggers and audit trail lookups.

**Note**: This is NOT a unique constraint because some events (e.g., marketplace trades) generate multiple events per source record (sent/received for both parties). Deduplication is handled by EXISTS checks in triggers.

**Optimizes**:

```sql
-- Trigger deduplication check
SELECT 1 FROM reward_events
WHERE source_table = 'gidouilles_history'
AND source_id = $1;
```

### idx_reward_events_event_type

```sql
CREATE INDEX idx_reward_events_event_type
ON public.reward_events(event_type, created_at DESC);
```

**Purpose**: Analytics queries filtering by action type.

**Optimizes**:

```sql
SELECT COUNT(*) FROM reward_events
WHERE event_type = 'purchased'
AND created_at > NOW() - INTERVAL '30 days';
```

---

## Row Level Security

RLS is enabled on the `reward_events` table with four policies:

### Student Policy

```sql
CREATE POLICY "Students can view their own reward events"
ON public.reward_events
FOR SELECT
TO authenticated
USING (student_id = auth.uid());
```

Students can only view events where they are the subject.

### Teacher Policy

```sql
CREATE POLICY "Teachers can view reward events for their students"
ON public.reward_events
FOR SELECT
TO authenticated
USING (
    class_id IS NOT NULL AND is_class_teacher(class_id)
);
```

Teachers can view events for students in classes they teach. Uses the `is_class_teacher()` helper function to avoid RLS recursion issues.

**Note**: Events without a `class_id` are not visible to teachers through this policy. Teachers must query through the student's current class membership.

### Admin Policy

```sql
CREATE POLICY "Admins can view all reward events"
ON public.reward_events
FOR SELECT
TO authenticated
USING (is_admin());
```

Administrators have full read access to all events. Uses the `is_admin()` helper function.

### Insert Policy

```sql
CREATE POLICY "Service role can insert reward events"
ON public.reward_events
FOR INSERT
TO service_role
WITH CHECK (true);
```

Only the `service_role` can insert records. This ensures all events are created through SECURITY DEFINER triggers, preventing direct manipulation.

**Security Note**: No UPDATE or DELETE policies exist. Events are immutable once created.

---

## Triggers

Seven AFTER INSERT triggers automatically populate `reward_events` from source tables:

### 1. trigger_log_gidouilles_to_events

**Source Table**: `gidouilles_history`
**Function**: `log_gidouilles_history_to_events()`

Logs all gidouilles transactions (earned, spent).

**Event Types Generated**:

- `earned` - When delta > 0
- `spent` - When delta < 0

**Metadata**:

```json
{
	"reason": "String from source",
	"original_delta": 100
}
```

### 2. trigger_log_bonus_to_events

**Source Table**: `bonus_history`
**Function**: `log_bonus_history_to_events()`

Logs all bonus point transactions.

**Event Types Generated**:

- `earned` - When delta > 0
- `used` - When delta < 0

**Metadata**:

```json
{
	"reason": "String from source",
	"original_delta": 5
}
```

### 3. trigger_log_vip_cards_to_events

**Source Table**: `vip_cards_activity`
**Function**: `log_vip_cards_to_events()`

Logs VIP card acquisition, usage, and removal.

**Event Types Generated**:

- `earned` - When action = 'gained'
- `used` - When action = 'used'
- `removed` - When action = 'removed'

**Metadata**:

```json
{
	"card_instance_id": "uuid",
	"card_template_id": "homework-pass",
	"action": "gained"
}
```

### 4. trigger_log_achievements_to_events

**Source Table**: `student_achievements`
**Function**: `log_achievements_to_events()`

Logs achievement unlocks.

**Event Types Generated**:

- `unlocked` - Always

**Metadata**:

```json
{
	"achievement_id": "minesweeper_first_victory",
	"context_data": {},
	"points_awarded": 10,
	"gidouilles_awarded": 5,
	"unlock_reason": "Completed first minesweeper game"
}
```

### 5. trigger_log_shop_purchases_to_events

**Source Table**: `shop_purchase_history`
**Function**: `log_shop_purchases_to_events()`

Logs shop item purchases (skips refunded purchases).

**Event Types Generated**:

- `purchased` - Always (unless refunded)

**Metadata**:

```json
{
	"template_id": "uuid",
	"inventory_id": "uuid",
	"quantity": 1,
	"unit_price": 50,
	"total_price": 50,
	"discount_applied": 0,
	"purchase_context": {}
}
```

### 6. trigger_log_item_usage_to_events

**Source Table**: `item_usage_log`
**Function**: `log_item_usage_to_events()`

Logs when purchased items are used (skips reversed usage).

**Event Types Generated**:

- `used` - Always (unless reversed)

**Metadata**:

```json
{
	"template_id": "uuid",
	"inventory_id": "uuid",
	"usage_context": "assessment",
	"usage_data": {},
	"effect_applied": true
}
```

### 7. trigger_log_marketplace_trades_to_events

**Source Table**: `marketplace_trades`
**Trigger Condition**: `AFTER UPDATE OF status ... WHEN (NEW.status = 'completed')`
**Function**: `log_marketplace_trades_to_events()`

Logs completed marketplace trades for both participants.

**Special Behavior**: This trigger only fires when a trade transitions to 'completed' status. It generates up to 4 events:

- Gidouilles sent by initiator (negative amount)
- Gidouilles received by initiator (positive amount)
- Gidouilles sent by partner (negative amount)
- Gidouilles received by partner (positive amount)

**Event Types Generated**:

- `traded` - For all gidouilles movements

**Metadata**:

```json
{
	"trade_id": "uuid",
	"partner_id": "uuid",
	"trade_type": "friend",
	"direction": "sent"
}
```

**Note**: VIP cards traded are not yet logged (marked TODO in migration).

---

## Helper Function

### generate_reward_event_description()

Generates human-readable French descriptions for events.

```sql
CREATE OR REPLACE FUNCTION public.generate_reward_event_description(
    p_reward_type public.reward_type,
    p_event_type public.reward_event_type,
    p_amount INTEGER,
    p_item_name TEXT,
    p_metadata JSONB
) RETURNS TEXT
```

**Examples of generated descriptions**:

| Reward Type | Event Type | Generated Description                                 |
| ----------- | ---------- | ----------------------------------------------------- |
| gidouilles  | earned     | "Gagne 50 gidouilles : Quiz reussi"                   |
| gidouilles  | spent      | "Depense 30 gidouilles pour Gomme magique"            |
| gidouilles  | traded     | "Echange 10 gidouilles"                               |
| bonus       | earned     | "Gagne 5 bonus : Streak de 7 jours"                   |
| bonus       | used       | "Utilise 3 bonus"                                     |
| vip_card    | earned     | "Carte VIP obtenue : Passe devoirs"                   |
| vip_card    | used       | "Carte VIP utilisee : Passe devoirs"                  |
| achievement | unlocked   | "Succes debloque : Premiere Victoire (+5 gidouilles)" |
| item        | purchased  | "Article achete : Gomme magique x2"                   |
| item        | used       | "Article utilise : Indice"                            |

---

## Usage Examples

### Query: Student's Complete Journal

Fetch a student's reward history for journal display:

```sql
SELECT
    id,
    reward_type,
    event_type,
    amount,
    item_name,
    description,
    created_at
FROM reward_events
WHERE student_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
```

### Query: Filter by Reward Type

Get only gidouilles transactions:

```sql
SELECT
    event_type,
    amount,
    description,
    created_at
FROM reward_events
WHERE student_id = '123e4567-e89b-12d3-a456-426614174000'
  AND reward_type = 'gidouilles'
ORDER BY created_at DESC;
```

### Query: Teacher View for a Class

Teachers can view all events for their students:

```sql
SELECT
    re.student_id,
    p.first_name,
    p.last_name,
    re.reward_type,
    re.event_type,
    re.amount,
    re.description,
    re.created_at
FROM reward_events re
JOIN profiles p ON p.id = re.student_id
WHERE re.class_id = '456e7890-e89b-12d3-a456-426614174000'
ORDER BY re.created_at DESC
LIMIT 100;
```

### Query: Daily Summary Statistics

Get aggregated stats for a student:

```sql
SELECT
    reward_type,
    event_type,
    COUNT(*) as event_count,
    SUM(COALESCE(amount, 0)) as total_amount
FROM reward_events
WHERE student_id = '123e4567-e89b-12d3-a456-426614174000'
  AND created_at >= CURRENT_DATE
GROUP BY reward_type, event_type
ORDER BY reward_type, event_type;
```

### Query: Recent Achievements

Get recently unlocked achievements:

```sql
SELECT
    item_name as achievement_name,
    description,
    metadata->>'gidouilles_awarded' as gidouilles_bonus,
    created_at as unlocked_at
FROM reward_events
WHERE student_id = '123e4567-e89b-12d3-a456-426614174000'
  AND reward_type = 'achievement'
  AND event_type = 'unlocked'
ORDER BY created_at DESC
LIMIT 10;
```

### Query: Trace Back to Source

Find the original source record for an event:

```sql
SELECT
    re.*,
    -- Join based on source_table type
    CASE re.source_table
        WHEN 'gidouilles_history' THEN (
            SELECT gh.reason
            FROM gidouilles_history gh
            WHERE gh.id = re.source_id
        )
        WHEN 'shop_purchase_history' THEN (
            SELECT sph.purchase_context::text
            FROM shop_purchase_history sph
            WHERE sph.id = re.source_id
        )
    END as source_details
FROM reward_events re
WHERE re.id = '789e0123-e89b-12d3-a456-426614174000';
```

---

## Integration Notes

### Adding New Reward Types

To add a new reward type (e.g., `badge`):

1. **Add to enum** (new migration):

   ```sql
   ALTER TYPE public.reward_type ADD VALUE 'badge';
   ```

2. **Update description generator**:

   ```sql
   -- Add ELSIF block in generate_reward_event_description()
   ELSIF p_reward_type = 'badge' THEN
       CASE p_event_type
           WHEN 'earned' THEN
               RETURN format('Badge obtenu : %s', COALESCE(p_item_name, 'Badge inconnu'));
           -- ... other event types
       END CASE;
   ```

3. **Create trigger** on the source table:
   ```sql
   CREATE TRIGGER trigger_log_badges_to_events
       AFTER INSERT ON public.badges_history
       FOR EACH ROW
       EXECUTE FUNCTION public.log_badges_to_events();
   ```

### Relationship with Existing Audit Tables

The `reward_events` table does NOT replace existing audit tables. It provides a unified view while original tables remain:

| Source Table          | Purpose                  | Retained? |
| --------------------- | ------------------------ | --------- |
| gidouilles_history    | Currency transaction log | Yes       |
| bonus_history         | Bonus transaction log    | Yes       |
| vip_cards_activity    | VIP card lifecycle       | Yes       |
| student_achievements  | Achievement unlocks      | Yes       |
| shop_purchase_history | Purchase records         | Yes       |
| item_usage_log        | Item usage tracking      | Yes       |
| marketplace_trades    | Trade negotiations       | Yes       |

**Rationale**:

- Original tables contain complete data (reward_events is optimized for display)
- Triggers may fail; original data preserved
- Different RLS requirements per table
- Specific queries may need original table structure

### Performance Considerations

- **Index usage**: All common queries hit indexes defined above
- **Trigger overhead**: ~1-5ms per source insert (negligible)
- **Deduplication**: EXISTS checks use `idx_reward_events_source_lookup`
- **Pagination**: Always use `LIMIT/OFFSET` or cursor-based pagination

### TypeScript Integration

When querying from the frontend:

```typescript
import type { Database } from '$lib/types/database';

type RewardEvent = Database['public']['Tables']['reward_events']['Row'];
type RewardType = Database['public']['Enums']['reward_type'];
type RewardEventType = Database['public']['Enums']['reward_event_type'];

// Example: Fetch student journal
const { data: events } = await supabase
	.from('reward_events')
	.select('*')
	.eq('student_id', studentId)
	.order('created_at', { ascending: false })
	.limit(50);
```

---

## Related Documentation

- **Migration File**: `supabase/migrations/20251121115959_create_reward_events_table.sql`
- **Database Schema**: `docs/architecture/database-schema.md`
- **Achievements System**: `docs/architecture/achievements-system.md`
- **Marketplace**: `docs/architecture/marketplace.md`

---

**Last Updated:** 2025-11-21
**Version:** 1.0
**Status:** Complete
