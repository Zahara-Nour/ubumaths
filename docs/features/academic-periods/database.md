# Academic Periods Database Schema

> 🆕 2025-10-28

Technical documentation for the database tables, relationships, indexes, and triggers supporting the Academic Periods feature.

---

## Table of Contents

- [Overview](#overview)
- [Tables](#tables)
- [Relationships](#relationships)
- [Indexes](#indexes)
- [Constraints](#constraints)
- [RLS Policies](#rls-policies)
- [Triggers](#triggers)
- [Functions](#functions)
- [Migration Files](#migration-files)

---

## Overview

The Academic Periods feature introduces three new tables and extends one existing table:

- **school_years** - School year definitions (e.g., "2024-2025")
- **academic_periods** - Teaching periods within years (trimesters, semesters)
- **school_holidays** - Vacation periods within years
- **assessments** - Extended with `academic_period_id` column

All tables use UUID primary keys, TIMESTAMPTZ timestamps, and Row Level Security (RLS) policies.

---

## Tables

### school_years

Manages academic year definitions with one active year per school.

**Table Name**: `school_years`

**Columns**:

| Column       | Type        | Nullable | Default             | Description                                 |
| ------------ | ----------- | -------- | ------------------- | ------------------------------------------- |
| `id`         | UUID        | NOT NULL | `gen_random_uuid()` | Primary key                                 |
| `school_id`  | UUID        | NOT NULL | -                   | Foreign key → `schools(id)`                 |
| `name`       | TEXT        | NOT NULL | -                   | Year name (format: "YYYY-YYYY")             |
| `start_date` | DATE        | NOT NULL | -                   | Academic year start date                    |
| `end_date`   | DATE        | NOT NULL | -                   | Academic year end date                      |
| `is_active`  | BOOLEAN     | NOT NULL | `false`             | Active year flag (only one per school)      |
| `metadata`   | JSONB       | NOT NULL | `'{}'::jsonb`       | Extensible metadata (region, custom fields) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()`             | Creation timestamp                          |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()`             | Last update timestamp                       |

**Constraints**:

- `PRIMARY KEY (id)`
- `FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE`
- `UNIQUE (school_id, name)` - Unique year name per school
- `CHECK (end_date > start_date)` - Valid date range
- `UNIQUE NULLS NOT DISTINCT (school_id, CASE WHEN is_active THEN TRUE END)` - Only one active year per school

**Comments**:

```sql
COMMENT ON TABLE school_years IS 'Academic years (e.g., "2024-2025") with one active year per school';
COMMENT ON COLUMN school_years.name IS 'Year name in format "YYYY-YYYY" (e.g., "2024-2025")';
COMMENT ON COLUMN school_years.is_active IS 'Only one active year allowed per school (enforced by partial unique constraint)';
COMMENT ON COLUMN school_years.metadata IS 'Extensible JSONB for region, custom fields, etc.';
```

**Indexes**:

- `idx_school_years_school` ON `(school_id)`
- `idx_school_years_active` ON `(school_id, is_active)` WHERE `is_active = true`

**Triggers**:

- `update_school_years_updated_at` - Updates `updated_at` on modification

**RLS**: Enabled (see [RLS Policies](#rls-policies))

**Migration**: `20251028120000_create_school_years.sql`

---

### academic_periods

Manages teaching periods (trimesters, semesters, quarters) within school years.

**Table Name**: `academic_periods`

**Columns**:

| Column           | Type        | Nullable | Default             | Description                                               |
| ---------------- | ----------- | -------- | ------------------- | --------------------------------------------------------- |
| `id`             | UUID        | NOT NULL | `gen_random_uuid()` | Primary key                                               |
| `school_year_id` | UUID        | NOT NULL | -                   | Foreign key → `school_years(id)`                          |
| `type`           | TEXT        | NOT NULL | -                   | Period type: 'trimester', 'semester', 'quarter', 'custom' |
| `name`           | TEXT        | NOT NULL | -                   | Period name (e.g., "Trimestre 1")                         |
| `start_date`     | DATE        | NOT NULL | -                   | Period start date                                         |
| `end_date`       | DATE        | NOT NULL | -                   | Period end date                                           |
| `period_order`   | INTEGER     | NOT NULL | -                   | Sequential order (1, 2, 3...)                             |
| `color`          | TEXT        | NOT NULL | `'#3b82f6'`         | Hex color for UI (#RRGGBB)                                |
| `metadata`       | JSONB       | NOT NULL | `'{}'::jsonb`       | Extensible metadata                                       |
| `created_at`     | TIMESTAMPTZ | NOT NULL | `NOW()`             | Creation timestamp                                        |
| `updated_at`     | TIMESTAMPTZ | NOT NULL | `NOW()`             | Last update timestamp                                     |

**Constraints**:

- `PRIMARY KEY (id)`
- `FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE CASCADE`
- `CHECK (end_date > start_date)` - Valid date range
- `UNIQUE (school_year_id, period_order)` - Unique order per year
- `CHECK (type IN ('trimester', 'semester', 'quarter', 'custom'))` - Valid period type
- `CHECK (period_order > 0)` - Positive order

**Comments**:

```sql
COMMENT ON TABLE academic_periods IS 'Academic periods (trimesters, semesters) within school years';
COMMENT ON COLUMN academic_periods.type IS 'Period type: trimester (3), semester (2), quarter (4), or custom';
COMMENT ON COLUMN academic_periods.period_order IS 'Sequential order within the school year (1, 2, 3...)';
COMMENT ON COLUMN academic_periods.color IS 'Hex color code for UI display (default: #3b82f6 blue)';
```

**Indexes**:

- `idx_academic_periods_year` ON `(school_year_id)`
- `idx_academic_periods_order` ON `(school_year_id, period_order)`

**Triggers**:

- `update_academic_periods_updated_at` - Updates `updated_at` on modification

**RLS**: Enabled (see [RLS Policies](#rls-policies))

**Migration**: `20251028120100_create_academic_periods.sql`

---

### school_holidays

Manages vacation periods within school years.

**Table Name**: `school_holidays`

**Columns**:

| Column           | Type        | Nullable | Default             | Description                             |
| ---------------- | ----------- | -------- | ------------------- | --------------------------------------- |
| `id`             | UUID        | NOT NULL | `gen_random_uuid()` | Primary key                             |
| `school_year_id` | UUID        | NOT NULL | -                   | Foreign key → `school_years(id)`        |
| `name`           | TEXT        | NOT NULL | -                   | Holiday name (e.g., "Vacances de Noël") |
| `start_date`     | DATE        | NOT NULL | -                   | Holiday start date                      |
| `end_date`       | DATE        | NOT NULL | -                   | Holiday end date                        |
| `created_at`     | TIMESTAMPTZ | NOT NULL | `NOW()`             | Creation timestamp                      |
| `updated_at`     | TIMESTAMPTZ | NOT NULL | `NOW()`             | Last update timestamp                   |

**Constraints**:

- `PRIMARY KEY (id)`
- `FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE CASCADE`
- `CHECK (end_date > start_date)` - Valid date range

**Comments**:

```sql
COMMENT ON TABLE school_holidays IS 'School vacation periods (e.g., Christmas, Spring break)';
COMMENT ON COLUMN school_holidays.name IS 'Holiday name in French (e.g., "Vacances de Noël")';
```

**Indexes**:

- `idx_school_holidays_year` ON `(school_year_id)`
- `idx_school_holidays_dates` ON `(start_date, end_date)`

**Triggers**:

- `update_school_holidays_updated_at` - Updates `updated_at` on modification

**RLS**: Enabled (see [RLS Policies](#rls-policies))

**Migration**: `20251028120200_create_school_holidays.sql`

---

### assessments (Extended)

The existing `assessments` table was extended with a new column.

**Added Column**:

| Column               | Type | Nullable | Default | Description                          |
| -------------------- | ---- | -------- | ------- | ------------------------------------ |
| `academic_period_id` | UUID | NULL     | -       | Foreign key → `academic_periods(id)` |

**Constraint**:

- `FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE SET NULL`

**Comment**:

```sql
COMMENT ON COLUMN assessments.academic_period_id IS 'Academic period this assessment belongs to (auto-assigned based on created_at date)';
```

**Index**:

- `idx_assessments_period` ON `(academic_period_id)`

**Trigger**:

- `auto_assign_assessment_period` - Automatically links new assessments to matching period

**Migration**: `20251028120300_link_assessments_to_periods.sql`

---

## Relationships

### Entity Relationship Diagram

```
schools (1) ──────┐
                  │
                  ▼
         school_years (many)
                  │
                  ├──► (1:many) academic_periods
                  │
                  └──► (1:many) school_holidays

classes (many) ──► (1) schools

assessments (many) ──┬──► (1) classes
                     │
                     └──► (1) academic_periods [nullable]
```

### Foreign Key Relationships

1. **school_years.school_id → schools.id**
   - ON DELETE CASCADE
   - Deleting a school removes all its years

2. **academic_periods.school_year_id → school_years.id**
   - ON DELETE CASCADE
   - Deleting a year removes all its periods

3. **school_holidays.school_year_id → school_years.id**
   - ON DELETE CASCADE
   - Deleting a year removes all its holidays

4. **assessments.academic_period_id → academic_periods.id**
   - ON DELETE SET NULL
   - Deleting a period sets assessments' `academic_period_id` to NULL

### Cascading Behavior

**Deleting a school_years row**:

- Cascades to delete all `academic_periods` (ON DELETE CASCADE)
- Cascades to delete all `school_holidays` (ON DELETE CASCADE)
- Sets `academic_period_id` to NULL on all linked `assessments` (via periods)

**Deleting an academic_periods row**:

- Sets `academic_period_id` to NULL on linked `assessments` (ON DELETE SET NULL)

**Deleting a schools row**:

- Cascades to delete all `school_years` (and their periods/holidays)
- Cascades to delete all `classes` (and their assessments)

---

## Indexes

### Performance Indexes

**school_years**:

- `idx_school_years_school` (school_id) - Fast lookup by school
- `idx_school_years_active` (school_id, is_active) WHERE is_active = true - Fast active year lookup

**academic_periods**:

- `idx_academic_periods_year` (school_year_id) - Fast lookup by year
- `idx_academic_periods_order` (school_year_id, period_order) - Ordered period retrieval

**school_holidays**:

- `idx_school_holidays_year` (school_year_id) - Fast lookup by year
- `idx_school_holidays_dates` (start_date, end_date) - Date range queries

**assessments**:

- `idx_assessments_period` (academic_period_id) - Fast assessment filtering by period

### Index Usage Patterns

```sql
-- Fast: Get active year for a school (uses idx_school_years_active)
SELECT * FROM school_years WHERE school_id = ? AND is_active = true;

-- Fast: Get periods for a year (uses idx_academic_periods_year)
SELECT * FROM academic_periods WHERE school_year_id = ? ORDER BY period_order;

-- Fast: Get assessments for a period (uses idx_assessments_period)
SELECT * FROM assessments WHERE academic_period_id = ?;

-- Fast: Get holidays overlapping date range (uses idx_school_holidays_dates)
SELECT * FROM school_holidays WHERE start_date <= ? AND end_date >= ?;
```

---

## Constraints

### Unique Constraints

1. **school_years**: `UNIQUE (school_id, name)`
   - Prevents duplicate year names within a school
   - Example: Cannot create two "2024-2025" years for the same school

2. **school_years**: `UNIQUE NULLS NOT DISTINCT (school_id, CASE WHEN is_active THEN TRUE END)`
   - Ensures only one active year per school
   - Allows multiple non-active years (is_active = false)

3. **academic_periods**: `UNIQUE (school_year_id, period_order)`
   - Prevents duplicate order numbers within a year
   - Example: Cannot have two "Trimestre 1" (order 1) in same year

### Check Constraints

1. **Date Range Validation**:

   ```sql
   CHECK (end_date > start_date)
   ```

   - Applies to: `school_years`, `academic_periods`, `school_holidays`
   - Ensures end date is always after start date

2. **Period Type Validation**:

   ```sql
   CHECK (type IN ('trimester', 'semester', 'quarter', 'custom'))
   ```

   - Applies to: `academic_periods`
   - Enforces valid period types

3. **Period Order Validation**:

   ```sql
   CHECK (period_order > 0)
   ```

   - Applies to: `academic_periods`
   - Ensures positive order numbers (1-10)

### Foreign Key Constraints

All foreign keys use UUID columns to ensure referential integrity. Invalid UUIDs or missing references are rejected at insert time.

---

## RLS Policies

Row Level Security (RLS) is enabled on all three new tables.

### school_years

**Policy**: `"Admins can manage school years"`

- **Roles**: Admin
- **Operations**: ALL (SELECT, INSERT, UPDATE, DELETE)
- **Condition**: User has admin role

```sql
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
)
```

**Policy**: `"Teachers can read their school years"`

- **Roles**: Teacher, Admin
- **Operations**: SELECT
- **Condition**: User belongs to the same school

```sql
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.school_id = school_years.school_id
  AND profiles.role IN ('teacher', 'admin')
)
```

---

### academic_periods

**Policy**: `"Admins can manage academic periods"`

- **Roles**: Admin
- **Operations**: ALL (SELECT, INSERT, UPDATE, DELETE)
- **Condition**: User is admin for the period's school

```sql
EXISTS (
  SELECT 1 FROM profiles p
  JOIN school_years sy ON sy.school_id = p.school_id
  WHERE p.id = auth.uid()
  AND p.role = 'admin'
  AND sy.id = academic_periods.school_year_id
)
```

**Policy**: `"Teachers can read academic periods"`

- **Roles**: Teacher, Admin
- **Operations**: SELECT
- **Condition**: User belongs to the period's school

```sql
EXISTS (
  SELECT 1 FROM profiles p
  JOIN school_years sy ON sy.school_id = p.school_id
  WHERE p.id = auth.uid()
  AND p.role IN ('teacher', 'admin')
  AND sy.id = academic_periods.school_year_id
)
```

---

### school_holidays

**Policy**: `"Admins can manage school holidays"`

- **Roles**: Admin
- **Operations**: ALL (SELECT, INSERT, UPDATE, DELETE)
- **Condition**: User is admin for the holiday's school

```sql
EXISTS (
  SELECT 1 FROM profiles p
  JOIN school_years sy ON sy.school_id = p.school_id
  WHERE p.id = auth.uid()
  AND p.role = 'admin'
  AND sy.id = school_holidays.school_year_id
)
```

**Policy**: `"Teachers can read school holidays"`

- **Roles**: Teacher, Admin
- **Operations**: SELECT
- **Condition**: User belongs to the holiday's school

```sql
EXISTS (
  SELECT 1 FROM profiles p
  JOIN school_years sy ON sy.school_id = p.school_id
  WHERE p.id = auth.uid()
  AND p.role IN ('teacher', 'admin')
  AND sy.id = school_holidays.school_year_id
)
```

---

## Triggers

### auto_assign_assessment_period

**Trigger**: `auto_assign_assessment_period`
**Table**: `assessments`
**Timing**: BEFORE INSERT
**Event**: FOR EACH ROW

**Purpose**: Automatically assigns new assessments to the matching academic period based on creation date and active school year.

**Logic**:

1. Finds the class's school
2. Finds the active school year for that school
3. Finds the academic period whose date range contains the assessment's `created_at` date
4. Sets `NEW.academic_period_id` to the matching period's ID
5. Only assigns if `NEW.academic_period_id` is NULL (respects manual assignments)

**Function**: `auto_assign_assessment_to_period()`

**Example**:

```sql
-- Assessment created on 2024-10-15
-- Active year: 2024-2025
-- Trimestre 1: 2024-09-02 to 2024-12-20

INSERT INTO assessments (class_id, title, created_at)
VALUES ('class-uuid', 'Test Math', '2024-10-15T10:00:00Z');

-- Trigger automatically sets:
-- academic_period_id = 'trimestre-1-uuid'
```

**Source**: `20251028120300_link_assessments_to_periods.sql` (lines 16-48)

---

### updated_at Triggers

**Trigger**: `update_<table>_updated_at`
**Tables**: `school_years`, `academic_periods`, `school_holidays`
**Timing**: BEFORE UPDATE
**Event**: FOR EACH ROW

**Purpose**: Automatically updates the `updated_at` timestamp on row modification.

**Function**: `update_updated_at_column()` (pre-existing utility function)

**Example**:

```sql
UPDATE school_years SET name = '2024-2025' WHERE id = ?;
-- Trigger automatically sets: updated_at = NOW()
```

---

## Functions

### auto_assign_assessment_to_period()

**Type**: Trigger function
**Returns**: TRIGGER
**Language**: PL/pgSQL

**Purpose**: Implements the logic for auto-assigning assessments to periods.

**Source Code**:

```sql
CREATE OR REPLACE FUNCTION auto_assign_assessment_to_period()
RETURNS TRIGGER AS $$
DECLARE
  matching_period_id UUID;
BEGIN
  -- Find the academic period that contains this assessment's created_at date
  SELECT ap.id INTO matching_period_id
  FROM academic_periods ap
  JOIN school_years sy ON sy.id = ap.school_year_id
  JOIN classes c ON c.school_id = sy.school_id
  WHERE c.id = NEW.class_id
    AND sy.is_active = true
    AND NEW.created_at::date BETWEEN ap.start_date AND ap.end_date
  LIMIT 1;

  -- Assign if found (only if not already set)
  IF matching_period_id IS NOT NULL AND NEW.academic_period_id IS NULL THEN
    NEW.academic_period_id := matching_period_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Comment**:

```sql
COMMENT ON FUNCTION auto_assign_assessment_to_period IS 'Auto-assigns new assessments to academic periods based on created_at date and active school year';
```

---

### link_existing_assessments_to_periods(p_school_year_id UUID)

**Type**: Utility function
**Returns**: INTEGER (count of updated assessments)
**Language**: PL/pgSQL

**Purpose**: Manually backfills `academic_period_id` for existing assessments in a given school year.

**Parameters**:

- `p_school_year_id` (UUID) - The school year to process

**Returns**: Number of assessments updated

**Source Code**:

```sql
CREATE OR REPLACE FUNCTION link_existing_assessments_to_periods(p_school_year_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE assessments a
  SET academic_period_id = ap.id
  FROM academic_periods ap
  JOIN school_years sy ON sy.id = ap.school_year_id
  JOIN classes c ON c.school_id = sy.school_id
  WHERE c.id = a.class_id
    AND sy.id = p_school_year_id
    AND a.created_at::date BETWEEN ap.start_date AND ap.end_date
    AND a.academic_period_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
```

**Comment**:

```sql
COMMENT ON FUNCTION link_existing_assessments_to_periods IS 'Backfills academic_period_id for existing assessments in a given school year. Returns count of updated assessments.';
```

**Usage Example**:

```sql
-- Backfill assessments for year 2024-2025
SELECT link_existing_assessments_to_periods('550e8400-e29b-41d4-a716-446655440000');
-- Returns: 42 (42 assessments linked)
```

---

## Migration Files

### 20251028120000_create_school_years.sql

**Date**: 2025-10-28
**Purpose**: Create `school_years` table with RLS policies and indexes
**Size**: 67 lines

**Contents**:

- Table creation with 9 columns
- 4 constraints (UNIQUE, CHECK, partial UNIQUE for active year)
- 2 indexes (school, active)
- 2 RLS policies (admin full access, teachers read-only)
- 1 trigger (updated_at)
- Table and column comments

---

### 20251028120100_create_academic_periods.sql

**Date**: 2025-10-28
**Purpose**: Create `academic_periods` table with RLS policies and indexes
**Size**: 73 lines

**Contents**:

- Table creation with 11 columns
- 4 constraints (CHECK dates, UNIQUE order, CHECK type, CHECK positive order)
- 2 indexes (year, order)
- 2 RLS policies (admin full access, teachers read-only)
- 1 trigger (updated_at)
- Table and column comments

---

### 20251028120200_create_school_holidays.sql

**Date**: 2025-10-28
**Purpose**: Create `school_holidays` table with RLS policies and indexes
**Size**: 64 lines

**Contents**:

- Table creation with 7 columns
- 1 constraint (CHECK dates)
- 2 indexes (year, dates)
- 2 RLS policies (admin full access, teachers read-only)
- 1 trigger (updated_at)
- Table and column comments

---

### 20251028120300_link_assessments_to_periods.sql

**Date**: 2025-10-28
**Purpose**: Add `academic_period_id` column to assessments and create auto-assignment logic
**Size**: 73 lines

**Contents**:

- ALTER TABLE to add `academic_period_id` column
- 1 index (academic_period_id)
- 1 function: `auto_assign_assessment_to_period()`
- 1 trigger: `auto_assign_assessment_period` (BEFORE INSERT)
- 1 utility function: `link_existing_assessments_to_periods(p_school_year_id)`
- Function and column comments

---

## Query Examples

### Get Active Year with Periods

```sql
SELECT
  sy.*,
  json_agg(
    json_build_object(
      'id', ap.id,
      'name', ap.name,
      'type', ap.type,
      'start_date', ap.start_date,
      'end_date', ap.end_date,
      'period_order', ap.period_order,
      'color', ap.color
    ) ORDER BY ap.period_order
  ) AS periods
FROM school_years sy
LEFT JOIN academic_periods ap ON ap.school_year_id = sy.id
WHERE sy.school_id = '550e8400-e29b-41d4-a716-446655440000'
  AND sy.is_active = true
GROUP BY sy.id;
```

---

### Count Assessments Per Period

```sql
SELECT
  ap.name AS period_name,
  COUNT(a.id) AS assessment_count,
  COUNT(DISTINCT a.teacher_id) AS teacher_count
FROM academic_periods ap
LEFT JOIN assessments a ON a.academic_period_id = ap.id
WHERE ap.school_year_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY ap.id, ap.name, ap.period_order
ORDER BY ap.period_order;
```

---

### Find Unlinked Assessments

```sql
SELECT
  a.id,
  a.title,
  a.created_at,
  c.name AS class_name
FROM assessments a
JOIN classes c ON c.id = a.class_id
WHERE a.academic_period_id IS NULL
  AND c.school_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY a.created_at DESC;
```

---

### Get Holidays Overlapping Date Range

```sql
SELECT *
FROM school_holidays
WHERE school_year_id = '550e8400-e29b-41d4-a716-446655440000'
  AND start_date <= '2024-12-25'
  AND end_date >= '2024-12-20'
ORDER BY start_date;
```

---

## Related Documentation

- **[Feature Overview](./README.md)** - High-level feature description
- **[API Reference](./api-reference.md)** - Form actions and endpoints
- **[User Guide](./user-guide.md)** - Admin workflows
- **[Master Database Schema](../../architecture/database-schema.md)** - Full schema reference

---

Last Updated: 2025-10-28
