# Troubleshooting Guide

> Common issues and solutions for the audit trail system.

## Table of Contents

- [Diagnostic Queries](#diagnostic-queries)
- [Common Issues](#common-issues)
  - [Missing Events](#missing-events)
  - [Duplicate Events](#duplicate-events)
  - [RLS Access Denied](#rls-access-denied)
  - [Trigger Failures](#trigger-failures)
  - [Description Generation Issues](#description-generation-issues)
- [Performance Issues](#performance-issues)
- [Debug Checklist](#debug-checklist)

---

## Diagnostic Queries

### Check Recent Events for a Student

```sql
-- Last 10 events for a specific student
SELECT
    id,
    reward_type,
    event_type,
    amount,
    item_name,
    description,
    source_table,
    created_at
FROM reward_events
WHERE student_id = '<student-uuid>'
ORDER BY created_at DESC
LIMIT 10;
```

### Verify Trigger Execution

```sql
-- Check if source record exists but event is missing
SELECT
    gh.id AS source_id,
    gh.student_id,
    gh.delta,
    gh.created_at AS source_created,
    re.id AS event_id,
    re.created_at AS event_created
FROM gidouilles_history gh
LEFT JOIN reward_events re
    ON re.source_table = 'gidouilles_history'
    AND re.source_id = gh.id
WHERE gh.student_id = '<student-uuid>'
ORDER BY gh.created_at DESC
LIMIT 20;
```

### Check for Orphaned Events

```sql
-- Events without corresponding source records (should be rare)
SELECT re.*
FROM reward_events re
LEFT JOIN gidouilles_history gh
    ON re.source_table = 'gidouilles_history'
    AND re.source_id = gh.id
WHERE re.source_table = 'gidouilles_history'
  AND gh.id IS NULL
LIMIT 10;
```

### Audit Event Counts by Type

```sql
-- Daily event counts for monitoring
SELECT
    DATE(created_at) AS date,
    reward_type,
    event_type,
    COUNT(*) AS count
FROM reward_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), reward_type, event_type
ORDER BY date DESC, count DESC;
```

### Check Trigger Status

```sql
-- Verify triggers are enabled
SELECT
    tgname AS trigger_name,
    tgenabled AS enabled,
    tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname LIKE '%reward%'
   OR tgname LIKE '%gidouilles%'
   OR tgname LIKE '%bonus%'
   OR tgname LIKE '%vip_card%';
```

---

## Common Issues

### Missing Events

#### Symptom

Source record exists (e.g., in `gidouilles_history`) but no corresponding `reward_events` entry.

#### Possible Causes

1. **Trigger disabled**

   ```sql
   -- Check if trigger is enabled
   SELECT tgenabled FROM pg_trigger
   WHERE tgname = 'trigger_log_gidouilles_to_events';
   -- 'O' = enabled, 'D' = disabled
   ```

2. **Transaction rolled back**

   - If the original INSERT failed, the trigger never committed
   - Check application logs for transaction errors

3. **Trigger function error**

   ```sql
   -- Check PostgreSQL logs for trigger errors
   -- In Supabase Dashboard: Logs > Postgres
   -- Look for: "ERROR" + trigger function name
   ```

4. **Deduplication check matched incorrectly**
   ```sql
   -- Check for potential duplicates that blocked insertion
   SELECT * FROM reward_events
   WHERE source_table = 'gidouilles_history'
     AND source_id = '<source-uuid>'
     AND student_id = '<student-uuid>';
   ```

#### Solutions

```sql
-- 1. Re-enable trigger if disabled
ALTER TABLE gidouilles_history ENABLE TRIGGER trigger_log_gidouilles_to_events;

-- 2. Manually backfill missing event (use with caution)
INSERT INTO reward_events (
    student_id, reward_type, event_type, amount,
    description, metadata, source_table, source_id,
    class_id, created_by, created_at
)
SELECT
    student_id,
    'gidouilles',
    CASE WHEN delta > 0 THEN 'earned' ELSE 'spent' END,
    ABS(delta),
    generate_reward_event_description(
        'gidouilles',
        CASE WHEN delta > 0 THEN 'earned'::reward_event_type ELSE 'spent'::reward_event_type END,
        ABS(delta),
        NULL,
        jsonb_build_object('reason', reason)
    ),
    jsonb_build_object('reason', reason, 'delta', delta, 'backfilled', true),
    'gidouilles_history',
    id,
    class_id,
    created_by,
    created_at
FROM gidouilles_history
WHERE id = '<missing-source-uuid>'
  AND NOT EXISTS (
      SELECT 1 FROM reward_events
      WHERE source_table = 'gidouilles_history'
        AND source_id = '<missing-source-uuid>'
  );
```

---

### Duplicate Events

#### Symptom

Multiple `reward_events` entries for the same source record.

#### Diagnostic Query

```sql
-- Find duplicate events
SELECT
    source_table,
    source_id,
    student_id,
    COUNT(*) AS duplicate_count
FROM reward_events
WHERE source_id IS NOT NULL
GROUP BY source_table, source_id, student_id
HAVING COUNT(*) > 1;
```

#### Possible Causes

1. **Race condition** - Concurrent inserts before dedup check
2. **Missing unique index** on source lookup
3. **Trigger fired multiple times** (misconfiguration)

#### Solutions

```sql
-- 1. Add unique index if missing
CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_events_source_unique
ON reward_events (source_table, source_id, student_id)
WHERE source_id IS NOT NULL;

-- 2. Remove duplicates (keep oldest)
DELETE FROM reward_events a
USING reward_events b
WHERE a.source_table = b.source_table
  AND a.source_id = b.source_id
  AND a.student_id = b.student_id
  AND a.created_at > b.created_at;

-- 3. For vip_cards_activity, check unique constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'vip_cards_activity'::regclass;
```

---

### RLS Access Denied

#### Symptom

API returns empty results or 403 errors when querying audit data.

#### Diagnostic Steps

```sql
-- 1. Check user's role
SELECT id, role FROM profiles WHERE id = '<user-uuid>';

-- 2. Test RLS as specific user (in Supabase SQL Editor)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<user-uuid>"}';

-- Try to select
SELECT COUNT(*) FROM reward_events;

-- Reset
RESET ROLE;
```

#### Common Scenarios

| User Role | Expected Access                         | Check                        |
| --------- | --------------------------------------- | ---------------------------- |
| Student   | Own events only                         | `student_id = auth.uid()`    |
| Teacher   | Events with `class_id` in their classes | `is_class_teacher(class_id)` |
| Admin     | All events                              | `is_admin()` returns true    |

#### Solutions

```sql
-- 1. Verify student is querying own data
-- (Nothing to fix - this is correct behavior)

-- 2. For teachers: verify class membership
SELECT
    cm.student_id,
    cm.class_id,
    c.teacher_id
FROM class_members cm
JOIN classes c ON c.id = cm.class_id
WHERE cm.student_id = '<student-uuid>'
  AND c.teacher_id = '<teacher-uuid>';

-- 3. For events without class_id (privacy)
-- Teachers cannot see these - by design
-- Solution: Ensure class_id is set when logging events

-- 4. Check if is_admin() function works
SELECT is_admin(); -- Should return true for admins
```

---

### Trigger Failures

#### Symptom

Errors in PostgreSQL logs mentioning trigger functions.

#### Check Logs

In Supabase Dashboard:

1. Go to **Logs** > **Postgres**
2. Filter by severity: `ERROR`
3. Search for trigger function names

#### Common Errors

**1. Type mismatch**

```
ERROR: invalid input value for enum reward_event_type: "unknown"
```

**Fix**: Update trigger to handle new action types

**2. NULL constraint violation**

```
ERROR: null value in column "description" violates not-null constraint
```

**Fix**: Ensure `generate_reward_event_description` handles all cases

**3. Foreign key violation**

```
ERROR: insert or update on table "reward_events" violates foreign key constraint
```

**Fix**: Verify student_id exists in profiles

#### Debug Trigger Function

```sql
-- Test trigger function manually
DO $$
DECLARE
    v_result TEXT;
BEGIN
    -- Simulate what trigger does
    v_result := generate_reward_event_description(
        'gidouilles'::reward_type,
        'earned'::reward_event_type,
        10,
        NULL,
        '{"reason": "Test"}'::jsonb
    );
    RAISE NOTICE 'Description: %', v_result;
END;
$$;
```

---

### Description Generation Issues

#### Symptom

Event descriptions are incorrect, missing, or malformed.

#### Test Description Function

```sql
-- Test all reward_type + event_type combinations
SELECT
    rt.reward_type,
    et.event_type,
    generate_reward_event_description(
        rt.reward_type,
        et.event_type,
        10,
        'Test Item',
        '{"reason": "Test reason"}'::jsonb
    ) AS description
FROM
    (VALUES ('gidouilles'), ('bonus'), ('vip_card'), ('achievement'), ('item')) AS rt(reward_type),
    (VALUES ('earned'), ('spent'), ('traded'), ('used'), ('unlocked'), ('purchased'), ('awarded'), ('removed')) AS et(event_type)
WHERE
    (rt.reward_type = 'gidouilles' AND et.event_type IN ('earned', 'spent', 'traded', 'awarded', 'removed'))
    OR (rt.reward_type = 'bonus' AND et.event_type IN ('earned', 'used'))
    OR (rt.reward_type = 'vip_card' AND et.event_type IN ('unlocked', 'used', 'removed', 'traded'))
    OR (rt.reward_type = 'achievement' AND et.event_type = 'unlocked')
    OR (rt.reward_type = 'item' AND et.event_type IN ('purchased', 'used'));
```

#### Common Issues

1. **Plural handling**: "1 gidouilles" instead of "1 gidouille"
2. **Missing item_name**: "Tu as acheté "null""
3. **Encoding issues**: Special characters in reason text

---

## Performance Issues

### Slow Journal Queries

#### Diagnostic

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM reward_events
WHERE student_id = '<uuid>'
ORDER BY created_at DESC
LIMIT 20;
```

#### Expected: Index Scan on `idx_reward_events_student_time`

If seeing **Seq Scan**, indexes may be missing:

```sql
-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'reward_events';
```

### High Write Latency

If INSERT triggers are slow:

```sql
-- Check trigger execution time
SELECT
    calls,
    total_time,
    mean_time,
    query
FROM pg_stat_statements
WHERE query LIKE '%reward_events%'
ORDER BY total_time DESC
LIMIT 10;
```

---

## Debug Checklist

### Before Reporting a Bug

- [ ] **Check recent events**: Query `reward_events` directly
- [ ] **Verify source record**: Confirm insert in source table
- [ ] **Check RLS**: Test with correct user role
- [ ] **Review logs**: Check Supabase Postgres logs
- [ ] **Test trigger**: Run trigger function manually
- [ ] **Check indexes**: Verify index exists and is used

### Information to Include in Bug Report

````markdown
## Issue Description

[What you expected vs what happened]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]

## Diagnostic Results

### Source Record

```sql
SELECT * FROM [source_table] WHERE id = '[uuid]';
```
````

[Result]

### Event Record

```sql
SELECT * FROM reward_events WHERE source_id = '[uuid]';
```

[Result or "No rows"]

### User Context

- User ID: [uuid]
- Role: [student/teacher/admin]
- Class ID (if applicable): [uuid]

### Error Messages

[Any error from logs or API response]

```

---

## Related Documentation

- [Database Schema](./database-schema.md) - Table definitions and indexes
- [Triggers & Functions](./triggers-functions.md) - Trigger implementation details
- [Security Model](./security-model.md) - RLS policies and access control
- [API Reference](./api-reference.md) - API endpoints and error codes
```
