# Performance Considerations

> Optimization strategies for the audit trail system at scale.

## Table of Contents

- [Index Strategy](#index-strategy)
  - [Current Indexes](#current-indexes)
  - [Index Usage Analysis](#index-usage-analysis)
  - [Adding Custom Indexes](#adding-custom-indexes)
- [Query Optimization](#query-optimization)
  - [Efficient Query Patterns](#efficient-query-patterns)
  - [Pagination Strategies](#pagination-strategies)
  - [Avoiding Common Pitfalls](#avoiding-common-pitfalls)
- [Data Archiving](#data-archiving)
  - [Archiving Strategy](#archiving-strategy)
  - [Implementation](#implementation)
  - [Restore Process](#restore-process)
- [Partitioning](#partitioning)
  - [When to Partition](#when-to-partition)
  - [Partitioning by Time](#partitioning-by-time)
  - [Migration Path](#migration-path)
- [Monitoring](#monitoring)
  - [Key Metrics](#key-metrics)
  - [Alerting Thresholds](#alerting-thresholds)
- [Capacity Planning](#capacity-planning)

---

## Index Strategy

### Current Indexes

The `reward_events` table has the following indexes optimized for common access patterns:

| Index                                 | Columns                                      | Purpose          | Query Pattern                                   |
| ------------------------------------- | -------------------------------------------- | ---------------- | ----------------------------------------------- |
| `idx_reward_events_student_time`      | `(student_id, created_at DESC)`              | Student journal  | `WHERE student_id = ? ORDER BY created_at DESC` |
| `idx_reward_events_student_type_time` | `(student_id, reward_type, created_at DESC)` | Filtered journal | `WHERE student_id = ? AND reward_type = ?`      |
| `idx_reward_events_class_time`        | `(class_id, created_at DESC)`                | Teacher view     | `WHERE class_id = ? ORDER BY created_at DESC`   |
| `idx_reward_events_source_lookup`     | `(source_table, source_id, student_id)`      | Deduplication    | Trigger EXISTS check                            |
| `idx_reward_events_event_type`        | `(event_type, created_at DESC)`              | Analytics        | `WHERE event_type = ?`                          |

### Index Usage Analysis

Check which indexes are being used:

```sql
-- Index usage statistics
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS times_used,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE relname = 'reward_events'
ORDER BY idx_scan DESC;
```

```sql
-- Find unused indexes (candidates for removal)
SELECT
    indexrelname AS index_name,
    idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE relname = 'reward_events'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%pkey%';
```

```sql
-- Check if queries are using indexes
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM reward_events
WHERE student_id = '<uuid>'
ORDER BY created_at DESC
LIMIT 20;

-- Look for: "Index Scan" or "Index Only Scan"
-- Bad: "Seq Scan" on large tables
```

### Adding Custom Indexes

For specific query patterns not covered by existing indexes:

```sql
-- Example: Frequently query by date range + reward_type
CREATE INDEX CONCURRENTLY idx_reward_events_type_date
ON reward_events (reward_type, created_at DESC);

-- Example: Full-text search on descriptions (if needed)
CREATE INDEX CONCURRENTLY idx_reward_events_description_gin
ON reward_events USING gin(to_tsvector('french', description));

-- Example: JSONB metadata queries
CREATE INDEX CONCURRENTLY idx_reward_events_metadata_gin
ON reward_events USING gin(metadata jsonb_path_ops);
```

**Guidelines:**

- Use `CONCURRENTLY` to avoid locking the table
- Each index has storage and write overhead
- Monitor index usage after creation
- Remove unused indexes

---

## Query Optimization

### Efficient Query Patterns

**Good: Uses index efficiently**

```sql
-- Student journal with cursor pagination
SELECT * FROM reward_events
WHERE student_id = $1
  AND created_at < $2  -- Cursor from previous page
ORDER BY created_at DESC
LIMIT 20;
```

**Good: Selective filtering first**

```sql
-- Filter by reward_type (more selective) before date range
SELECT * FROM reward_events
WHERE student_id = $1
  AND reward_type = 'gidouilles'
  AND created_at BETWEEN $2 AND $3
ORDER BY created_at DESC
LIMIT 50;
```

**Bad: Non-selective leading column**

```sql
-- Avoid: event_type is not selective enough
SELECT * FROM reward_events
WHERE event_type = 'earned'  -- Many rows match
  AND student_id = $1
ORDER BY created_at DESC;

-- Better: Put student_id first
SELECT * FROM reward_events
WHERE student_id = $1
  AND event_type = 'earned'
ORDER BY created_at DESC;
```

### Pagination Strategies

**Offset Pagination (Simple but slow for large offsets)**

```sql
-- Page 100 with 20 items = OFFSET 1980
-- PostgreSQL must scan and discard 1980 rows
SELECT * FROM reward_events
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT 20 OFFSET 1980;  -- Slow!
```

**Cursor Pagination (Recommended)**

```sql
-- First page
SELECT * FROM reward_events
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT 20;

-- Next page: use last item's created_at as cursor
SELECT * FROM reward_events
WHERE student_id = $1
  AND created_at < '2024-01-15T10:30:00Z'  -- Cursor
ORDER BY created_at DESC
LIMIT 20;
```

**Keyset Pagination (For ties in sort column)**

```sql
-- Handle multiple events at same timestamp
SELECT * FROM reward_events
WHERE student_id = $1
  AND (created_at, id) < ($2, $3)  -- Compound cursor
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### Avoiding Common Pitfalls

**1. Don't SELECT \* in production**

```sql
-- Bad: Fetches all columns including large JSONB
SELECT * FROM reward_events WHERE ...;

-- Good: Select only needed columns
SELECT id, reward_type, event_type, amount, description, created_at
FROM reward_events WHERE ...;
```

**2. Avoid OR conditions on different columns**

```sql
-- Bad: Can't use single index
SELECT * FROM reward_events
WHERE student_id = $1 OR class_id = $2;

-- Better: Use UNION
SELECT * FROM reward_events WHERE student_id = $1
UNION ALL
SELECT * FROM reward_events WHERE class_id = $2 AND student_id != $1;
```

**3. Use EXISTS instead of COUNT for existence checks**

```sql
-- Bad: Counts all matching rows
SELECT COUNT(*) > 0 FROM reward_events WHERE student_id = $1;

-- Good: Stops at first match
SELECT EXISTS (SELECT 1 FROM reward_events WHERE student_id = $1);
```

**4. Batch inserts in triggers**

```sql
-- If inserting multiple events, batch them
INSERT INTO reward_events (student_id, reward_type, ...)
SELECT student_id, reward_type, ...
FROM unnest($1::uuid[], $2::reward_type[], ...) AS t(student_id, reward_type, ...);
```

---

## Data Archiving

### Archiving Strategy

As the `reward_events` table grows, consider archiving old data:

| Data Age    | Location                | Access Pattern    |
| ----------- | ----------------------- | ----------------- |
| 0-90 days   | `reward_events`         | Real-time queries |
| 90-365 days | `reward_events_archive` | On-demand queries |
| >365 days   | External storage (S3)   | Compliance only   |

### Implementation

**Step 1: Create Archive Table**

```sql
-- Mirror structure of reward_events
CREATE TABLE IF NOT EXISTS public.reward_events_archive (
    LIKE public.reward_events INCLUDING ALL
);

-- Add archive metadata
ALTER TABLE public.reward_events_archive
ADD COLUMN archived_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Separate indexes optimized for archive queries
CREATE INDEX idx_archive_student_time
ON reward_events_archive (student_id, created_at DESC);

CREATE INDEX idx_archive_date
ON reward_events_archive (created_at DESC);
```

**Step 2: Create Archive Function**

```sql
CREATE OR REPLACE FUNCTION archive_old_reward_events(
    p_days_to_keep INTEGER DEFAULT 90,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff_date TIMESTAMPTZ;
    v_archived_count INTEGER := 0;
    v_batch_count INTEGER;
BEGIN
    v_cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;

    LOOP
        -- Move batch to archive
        WITH moved AS (
            DELETE FROM reward_events
            WHERE id IN (
                SELECT id FROM reward_events
                WHERE created_at < v_cutoff_date
                LIMIT p_batch_size
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *
        )
        INSERT INTO reward_events_archive
        SELECT *, NOW() as archived_at
        FROM moved;

        GET DIAGNOSTICS v_batch_count = ROW_COUNT;
        v_archived_count := v_archived_count + v_batch_count;

        -- Exit if no more rows to archive
        EXIT WHEN v_batch_count = 0;

        -- Brief pause to reduce lock contention
        PERFORM pg_sleep(0.1);
    END LOOP;

    RETURN v_archived_count;
END;
$$;
```

**Step 3: Schedule Archiving**

```sql
-- Using pg_cron (if available) or external scheduler
SELECT cron.schedule(
    'archive-reward-events',
    '0 3 * * 0',  -- Every Sunday at 3 AM
    $$SELECT archive_old_reward_events(90, 10000)$$
);
```

**Step 4: Create Unified View (Optional)**

```sql
-- View that queries both tables transparently
CREATE OR REPLACE VIEW reward_events_all AS
SELECT
    id, student_id, reward_type, event_type, amount,
    item_name, description, metadata, source_table,
    source_id, class_id, created_by, created_at,
    FALSE as is_archived
FROM reward_events
UNION ALL
SELECT
    id, student_id, reward_type, event_type, amount,
    item_name, description, metadata, source_table,
    source_id, class_id, created_by, created_at,
    TRUE as is_archived
FROM reward_events_archive;
```

### Restore Process

```sql
-- Restore specific student's archived events
INSERT INTO reward_events
SELECT
    id, student_id, reward_type, event_type, amount,
    item_name, description, metadata, source_table,
    source_id, class_id, created_by, created_at
FROM reward_events_archive
WHERE student_id = $1
  AND created_at BETWEEN $2 AND $3;

-- Delete from archive after restore
DELETE FROM reward_events_archive
WHERE student_id = $1
  AND created_at BETWEEN $2 AND $3;
```

---

## Partitioning

### When to Partition

Consider partitioning when:

- Table exceeds 10M+ rows
- Queries frequently filter by time range
- Archive/deletion of old data is common
- Single-partition queries are the norm

**Current Recommendation**: For most UbuMaths deployments, archiving is sufficient. Partitioning adds complexity and is only needed at significant scale.

### Partitioning by Time

If partitioning is needed:

```sql
-- Create partitioned table
CREATE TABLE public.reward_events_partitioned (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    reward_type reward_type NOT NULL,
    event_type reward_event_type NOT NULL,
    amount INTEGER,
    item_name TEXT,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    source_table TEXT NOT NULL,
    source_id UUID,
    class_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE reward_events_2024_01
    PARTITION OF reward_events_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE reward_events_2024_02
    PARTITION OF reward_events_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ... create partitions for each month
```

**Auto-create partitions:**

```sql
CREATE OR REPLACE FUNCTION create_reward_events_partition()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_partition_date DATE;
    v_partition_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Create partition for next month
    v_partition_date := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
    v_partition_name := 'reward_events_' || TO_CHAR(v_partition_date, 'YYYY_MM');
    v_start_date := v_partition_date;
    v_end_date := v_partition_date + INTERVAL '1 month';

    -- Check if partition exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = v_partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF reward_events_partitioned
             FOR VALUES FROM (%L) TO (%L)',
            v_partition_name, v_start_date, v_end_date
        );

        -- Create indexes on new partition
        EXECUTE format(
            'CREATE INDEX %I ON %I (student_id, created_at DESC)',
            v_partition_name || '_student_time_idx',
            v_partition_name
        );
    END IF;
END;
$$;
```

### Migration Path

To migrate from non-partitioned to partitioned table:

1. Create new partitioned table structure
2. Migrate data in batches during low-traffic periods
3. Update application to use new table
4. Update triggers to insert into partitioned table
5. Drop old table after verification

---

## Monitoring

### Key Metrics

**Table Size**

```sql
SELECT
    pg_size_pretty(pg_total_relation_size('reward_events')) AS total_size,
    pg_size_pretty(pg_relation_size('reward_events')) AS table_size,
    pg_size_pretty(pg_indexes_size('reward_events')) AS indexes_size,
    (SELECT COUNT(*) FROM reward_events) AS row_count;
```

**Growth Rate**

```sql
-- Daily event counts
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS events_created
FROM reward_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Query Performance**

```sql
-- Slowest queries on reward_events
SELECT
    query,
    calls,
    mean_time,
    total_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%reward_events%'
ORDER BY mean_time DESC
LIMIT 10;
```

**Trigger Performance**

```sql
-- Check trigger execution stats
SELECT
    tgname,
    pg_get_functiondef(tgfoid) AS function_def
FROM pg_trigger
WHERE tgrelid = 'reward_events'::regclass;
```

### Alerting Thresholds

| Metric         | Warning | Critical | Action                   |
| -------------- | ------- | -------- | ------------------------ |
| Table size     | >5GB    | >10GB    | Consider archiving       |
| Row count      | >5M     | >10M     | Consider partitioning    |
| Avg query time | >100ms  | >500ms   | Optimize queries/indexes |
| Dead tuples    | >10%    | >20%     | Run VACUUM ANALYZE       |
| Index bloat    | >30%    | >50%     | REINDEX                  |

---

## Capacity Planning

### Estimating Growth

```sql
-- Average event size
SELECT
    pg_size_pretty(
        pg_total_relation_size('reward_events') /
        NULLIF((SELECT COUNT(*) FROM reward_events), 0)
    ) AS avg_row_size;

-- Typical: ~500 bytes per event
```

### Projections

| Students | Events/Student/Day | Daily Growth | Monthly Growth | Yearly Size |
| -------- | ------------------ | ------------ | -------------- | ----------- |
| 1,000    | 5                  | 5,000        | 150,000        | ~900MB      |
| 10,000   | 5                  | 50,000       | 1.5M           | ~9GB        |
| 100,000  | 5                  | 500,000      | 15M            | ~90GB       |

### Recommendations by Scale

| Scale      | Rows    | Strategy                          |
| ---------- | ------- | --------------------------------- |
| Small      | <1M     | No action needed                  |
| Medium     | 1-10M   | Implement archiving               |
| Large      | 10-100M | Archiving + consider partitioning |
| Very Large | >100M   | Partitioning + tiered storage     |

---

## Related Documentation

- [Database Schema](./database-schema.md) - Index definitions
- [Troubleshooting](./troubleshooting.md) - Performance debugging
- [Extending](./extending-audit-trail.md) - Index considerations for new sources
