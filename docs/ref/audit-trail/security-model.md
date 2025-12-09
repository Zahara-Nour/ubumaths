# Security Model

> Row Level Security (RLS) policies and access control for audit trail tables.

## Table of Contents

- [Overview](#overview)
- [Role Hierarchy](#role-hierarchy)
- [RLS Policies by Table](#rls-policies-by-table)
  - [reward_events](#reward_events)
  - [gidouilles_history](#gidouilles_history)
  - [bonus_history](#bonus_history)
  - [vip_cards_activity](#vip_cards_activity)
  - [template_audit_log](#template_audit_log)
  - [moderation_logs](#moderation_logs)
  - [error_logs](#error_logs)
- [Helper Functions](#helper-functions)
- [Security Considerations](#security-considerations)

---

## Overview

The audit trail system uses Supabase Row Level Security (RLS) to enforce access control at the database level. This ensures that:

1. **Students** can only view their own audit records
2. **Teachers** can view audit records for students in their classes
3. **Admins** have full read access to all audit data
4. **Service role** is required for writing audit records (via triggers)

```
┌─────────────────────────────────────────────────────────┐
│                    Access Matrix                         │
├─────────────┬──────────┬──────────┬──────────┬─────────┤
│ Table       │ Student  │ Teacher  │ Admin    │ Service │
├─────────────┼──────────┼──────────┼──────────┼─────────┤
│ reward_     │ Own      │ Class    │ All      │ Insert  │
│ events      │ records  │ students │ records  │ only    │
├─────────────┼──────────┼──────────┼──────────┼─────────┤
│ gidouilles_ │ Own      │ Class    │ All      │ Insert  │
│ history     │ records  │ students │ records  │ only    │
├─────────────┼──────────┼──────────┼──────────┼─────────┤
│ template_   │ None     │ None     │ All      │ Insert  │
│ audit_log   │          │          │ records  │ only    │
├─────────────┼──────────┼──────────┼──────────┼─────────┤
│ moderation_ │ None     │ Own +    │ All      │ Insert  │
│ logs        │          │ view all │ records  │ only    │
├─────────────┼──────────┼──────────┼──────────┼─────────┤
│ error_logs  │ None     │ None     │ All      │ Insert  │
│             │          │          │ CRUD     │         │
└─────────────┴──────────┴──────────┴──────────┴─────────┘
```

---

## Role Hierarchy

Roles are determined from the `profiles` table:

```sql
-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
$$;

-- Check if current user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'teacher'
    );
$$;

-- Check if current user is teacher of a specific class
CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classes
        WHERE id = p_class_id
          AND teacher_id = auth.uid()
    );
$$;
```

---

## RLS Policies by Table

### reward_events

**Migration**: `20251121115959_create_reward_events_table.sql`

```sql
ALTER TABLE public.reward_events ENABLE ROW LEVEL SECURITY;

-- Students can view their own reward events
CREATE POLICY "Students can view their own reward events"
    ON public.reward_events
    FOR SELECT
    USING (student_id = auth.uid());

-- Teachers can view reward events for students in their classes
CREATE POLICY "Teachers can view reward events for their students"
    ON public.reward_events
    FOR SELECT
    USING (
        class_id IS NOT NULL
        AND public.is_class_teacher(class_id)
    );

-- Admins can view all reward events
CREATE POLICY "Admins can view all reward events"
    ON public.reward_events
    FOR SELECT
    USING (public.is_admin());

-- Only service role can insert (via triggers)
-- No explicit INSERT policy = denied for regular users
```

#### Policy Logic

| User    | Access                                                |
| ------- | ----------------------------------------------------- |
| Student | Only rows where `student_id = auth.uid()`             |
| Teacher | Only rows where `class_id` matches a class they teach |
| Admin   | All rows                                              |

**Note**: Events without `class_id` are only visible to the student and admins. This is intentional for privacy (e.g., marketplace trades).

---

### gidouilles_history

**Migration**: `20251113140344_create_gidouilles_history_table.sql`

```sql
ALTER TABLE public.gidouilles_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all history
CREATE POLICY "Admins can view all gidouilles history"
    ON public.gidouilles_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Students can view their own history
CREATE POLICY "Students can view their own gidouilles history"
    ON public.gidouilles_history
    FOR SELECT
    USING (student_id = auth.uid());

-- Teachers can view history for students in their classes
CREATE POLICY "Teachers can view gidouilles history for their students"
    ON public.gidouilles_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'teacher'
        )
        AND EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.student_id = gidouilles_history.student_id
              AND c.teacher_id = auth.uid()
        )
    );
```

---

### bonus_history

Same policies as `gidouilles_history`.

---

### vip_cards_activity

**Migration**: `20251113140346_create_vip_cards_activity_table.sql`

```sql
ALTER TABLE public.vip_cards_activity ENABLE ROW LEVEL SECURITY;

-- Students can view their own VIP card activity
CREATE POLICY "Students can view their own vip cards activity"
    ON public.vip_cards_activity
    FOR SELECT
    USING (student_id = auth.uid());

-- Teachers can view activity for students in their classes
CREATE POLICY "Teachers can view vip cards activity for their students"
    ON public.vip_cards_activity
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.student_id = vip_cards_activity.student_id
              AND c.teacher_id = auth.uid()
        )
    );

-- Admins can view all activity
CREATE POLICY "Admins can view all vip cards activity"
    ON public.vip_cards_activity
    FOR SELECT
    USING (public.is_admin());
```

---

### template_audit_log

**Migration**: `098_enhance_message_templates.sql`

```sql
ALTER TABLE public.template_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view template audit logs
CREATE POLICY "Admin view audit"
    ON public.template_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

**Rationale**: Template audit logs contain sensitive information about all template operations. Only administrators need access for compliance and debugging.

---

### moderation_logs

**Migration**: `20251110120001_create_moderation_logs_and_update_rls.sql`

```sql
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Teachers and admins can view moderation logs
CREATE POLICY "Teachers can view moderation logs"
    ON public.moderation_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('teacher', 'admin')
        )
    );

-- Teachers and admins can create moderation logs
CREATE POLICY "Teachers can create moderation logs"
    ON public.moderation_logs
    FOR INSERT
    WITH CHECK (
        auth.uid() = moderator_id
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('teacher', 'admin')
        )
    );
```

#### Key Security Features

1. **Actor verification**: `auth.uid() = moderator_id` ensures users can only create logs for actions they performed
2. **Role restriction**: Only teachers and admins can create/view moderation logs
3. **No UPDATE/DELETE**: Moderation logs are immutable for audit integrity

---

### error_logs

**Migration**: `100_create_error_monitoring_system.sql`

```sql
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all error logs
CREATE POLICY "Admins can view error logs"
    ON public.error_logs
    FOR SELECT
    USING (public.is_admin());

-- Admins can update error logs (for resolution)
CREATE POLICY "Admins can update error logs"
    ON public.error_logs
    FOR UPDATE
    USING (public.is_admin());

-- Admins can delete error logs
CREATE POLICY "Admins can delete error logs"
    ON public.error_logs
    FOR DELETE
    USING (public.is_admin());

-- Service role can insert error logs (for API logging)
CREATE POLICY "Service can insert error logs"
    ON public.error_logs
    FOR INSERT
    WITH CHECK (true);  -- Service role bypasses RLS anyway
```

**Note**: The INSERT policy allows any authenticated request to log errors. This is intentional to capture client-side errors from any user. Sensitive data should be sanitized before logging.

---

## Helper Functions

### SECURITY DEFINER Functions

All audit-related functions use `SECURITY DEFINER` to run with elevated privileges:

```sql
CREATE OR REPLACE FUNCTION public.log_gidouilles_history_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as function owner, not caller
SET search_path = public  -- Prevents search_path injection
AS $$
BEGIN
    -- Can insert into reward_events despite RLS
    INSERT INTO public.reward_events (...) VALUES (...);
    RETURN NEW;
END;
$$;
```

### Why SECURITY DEFINER?

1. **Bypass RLS for triggers**: Triggers need to insert audit records regardless of who triggered the original action
2. **Consistent behavior**: Same function behavior regardless of calling user
3. **Security boundary**: Functions define their own security context

### Security Hardening

```sql
-- Always set search_path to prevent injection
SET search_path = public;

-- Revoke execute from public
REVOKE ALL ON FUNCTION log_gidouilles_history_to_events() FROM PUBLIC;

-- Grant only to specific roles if needed
GRANT EXECUTE ON FUNCTION log_gidouilles_history_to_events() TO service_role;
```

---

## Security Considerations

### 1. Audit Record Immutability

Audit tables have no UPDATE or DELETE policies for regular users:

```sql
-- No UPDATE policy = denied
-- No DELETE policy = denied
```

Only admins can modify `error_logs` (for resolution tracking).

### 2. Foreign Key Design

`moderation_logs.target_id` intentionally has **no foreign key constraint**:

```sql
target_id UUID NOT NULL,  -- No FK reference
```

**Rationale**: Audit records must persist even if the target entity (message, user) is deleted. This maintains a complete audit trail.

### 3. Sensitive Data Handling

Error logs sanitize sensitive data before storage:

```typescript
// Sanitize headers - remove auth tokens
const sanitizedHeaders = {
	...headers,
	authorization: '[REDACTED]',
	cookie: '[REDACTED]'
};

// Sanitize request body - remove passwords
const sanitizedBody = {
	...body,
	password: body.password ? '[REDACTED]' : undefined
};
```

### 4. Rate Limiting

API endpoints implement rate limiting to prevent audit log flooding:

```typescript
// Supabase free tier: 500 req/min
// Consider implementing application-level throttling for high-volume events
```

### 5. Data Retention Policy

#### Retention Periods

| Table                   | Active Retention | Archive Retention | Total   | Justification                   |
| ----------------------- | ---------------- | ----------------- | ------- | ------------------------------- |
| `reward_events`         | 1 year           | 2 years           | 3 years | Educational records requirement |
| `gidouilles_history`    | 1 year           | 2 years           | 3 years | Source data for reward_events   |
| `bonus_history`         | 1 year           | 2 years           | 3 years | Source data for reward_events   |
| `vip_cards_activity`    | 1 year           | 2 years           | 3 years | Source data for reward_events   |
| `shop_purchase_history` | 1 year           | 2 years           | 3 years | Transaction records             |
| `item_usage_log`        | 1 year           | 2 years           | 3 years | Usage tracking                  |
| `template_audit_log`    | 2 years          | 1 year            | 3 years | Admin audit trail               |
| `moderation_logs`       | 2 years          | 1 year            | 3 years | Compliance requirement          |
| `error_logs`            | 90 days          | -                 | 90 days | Debugging only                  |

#### GDPR Compliance (Student Data)

As UbuMaths handles data for students in France, GDPR and French education data protection laws apply.

**Key Requirements:**

1. **Lawful Basis**: Educational legitimate interest for student progress tracking
2. **Data Minimization**: Only collect necessary audit data
3. **Purpose Limitation**: Audit data used only for stated purposes
4. **Storage Limitation**: Data deleted after retention period
5. **Right to Access**: Students/parents can request their data
6. **Right to Erasure**: Data deleted when student leaves (with exceptions)
7. **Right to Portability**: Export data in machine-readable format

**Implementation:**

```sql
-- Check data collected for a student (Right to Access)
CREATE OR REPLACE FUNCTION get_student_audit_data(p_student_id UUID)
RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT,
    date_range TSTZRANGE
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 'reward_events', COUNT(*), tstzrange(MIN(created_at), MAX(created_at))
    FROM reward_events WHERE student_id = p_student_id
    UNION ALL
    SELECT 'gidouilles_history', COUNT(*), tstzrange(MIN(created_at), MAX(created_at))
    FROM gidouilles_history WHERE student_id = p_student_id
    UNION ALL
    SELECT 'bonus_history', COUNT(*), tstzrange(MIN(created_at), MAX(created_at))
    FROM bonus_history WHERE student_id = p_student_id
    UNION ALL
    SELECT 'vip_cards_activity', COUNT(*), tstzrange(MIN(created_at), MAX(created_at))
    FROM vip_cards_activity WHERE student_id = p_student_id
    UNION ALL
    SELECT 'shop_purchase_history', COUNT(*), tstzrange(MIN(purchased_at), MAX(purchased_at))
    FROM shop_purchase_history WHERE student_id = p_student_id
    UNION ALL
    SELECT 'item_usage_log', COUNT(*), tstzrange(MIN(used_at), MAX(used_at))
    FROM item_usage_log WHERE student_id = p_student_id;
$$;
```

**Data Export (Right to Portability):**

```sql
-- Export all audit data for a student as JSON
CREATE OR REPLACE FUNCTION export_student_audit_data(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'export_date', NOW(),
        'student_id', p_student_id,
        'reward_events', (
            SELECT COALESCE(jsonb_agg(row_to_json(re)), '[]')
            FROM reward_events re WHERE student_id = p_student_id
        ),
        'gidouilles_history', (
            SELECT COALESCE(jsonb_agg(row_to_json(gh)), '[]')
            FROM gidouilles_history gh WHERE student_id = p_student_id
        ),
        'bonus_history', (
            SELECT COALESCE(jsonb_agg(row_to_json(bh)), '[]')
            FROM bonus_history bh WHERE student_id = p_student_id
        ),
        'vip_cards_activity', (
            SELECT COALESCE(jsonb_agg(row_to_json(va)), '[]')
            FROM vip_cards_activity va WHERE student_id = p_student_id
        ),
        'shop_purchases', (
            SELECT COALESCE(jsonb_agg(row_to_json(sp)), '[]')
            FROM shop_purchase_history sp WHERE student_id = p_student_id
        ),
        'item_usage', (
            SELECT COALESCE(jsonb_agg(row_to_json(iu)), '[]')
            FROM item_usage_log iu WHERE student_id = p_student_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
```

#### Automated Cleanup Procedures

**1. Error Logs Cleanup (90 days)**

```sql
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.error_logs
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND resolved = true;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- Log cleanup action
    INSERT INTO public.error_logs (
        error_type, severity, message, url, context
    ) VALUES (
        'maintenance', 'info',
        format('Cleanup completed: %s resolved error logs deleted', v_deleted),
        '/system/maintenance',
        jsonb_build_object('cleanup_type', 'error_logs', 'deleted_count', v_deleted)
    );

    RETURN v_deleted;
END;
$$;
```

**2. Audit Data Archiving (1 year to archive)**

```sql
CREATE OR REPLACE FUNCTION archive_old_audit_data(
    p_archive_after_days INTEGER DEFAULT 365
)
RETURNS TABLE (
    table_name TEXT,
    archived_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    v_cutoff := NOW() - (p_archive_after_days || ' days')::INTERVAL;

    -- Archive reward_events
    WITH archived AS (
        DELETE FROM reward_events
        WHERE created_at < v_cutoff
        RETURNING *
    )
    INSERT INTO reward_events_archive
    SELECT *, NOW() FROM archived;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'reward_events';
    archived_count := v_count;
    RETURN NEXT;

    -- Archive gidouilles_history
    WITH archived AS (
        DELETE FROM gidouilles_history
        WHERE created_at < v_cutoff
        RETURNING *
    )
    INSERT INTO gidouilles_history_archive
    SELECT *, NOW() FROM archived;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'gidouilles_history';
    archived_count := v_count;
    RETURN NEXT;

    -- Similar for other tables...
END;
$$;
```

**3. Permanent Deletion (3 years total)**

```sql
CREATE OR REPLACE FUNCTION purge_expired_audit_data(
    p_purge_after_days INTEGER DEFAULT 1095  -- 3 years
)
RETURNS TABLE (
    table_name TEXT,
    purged_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    v_cutoff := NOW() - (p_purge_after_days || ' days')::INTERVAL;

    -- Purge from archive tables
    DELETE FROM reward_events_archive WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'reward_events_archive';
    purged_count := v_count;
    RETURN NEXT;

    DELETE FROM gidouilles_history_archive WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'gidouilles_history_archive';
    purged_count := v_count;
    RETURN NEXT;

    -- Similar for other archive tables...
END;
$$;
```

**4. Student Departure Cleanup (Right to Erasure)**

```sql
CREATE OR REPLACE FUNCTION delete_student_audit_data(
    p_student_id UUID,
    p_requested_by UUID,
    p_reason TEXT DEFAULT 'GDPR erasure request'
)
RETURNS TABLE (
    table_name TEXT,
    deleted_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verify requester is admin or the student themselves
    IF NOT (
        p_requested_by = p_student_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = p_requested_by AND role = 'admin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admin or student can request data deletion';
    END IF;

    -- Log the deletion request before deleting
    INSERT INTO moderation_logs (
        moderator_id, action, target_type, target_id, reason, metadata
    ) VALUES (
        p_requested_by, 'data_deletion', 'user', p_student_id, p_reason,
        jsonb_build_object('gdpr_request', true, 'timestamp', NOW())
    );

    -- Delete from all audit tables
    DELETE FROM reward_events WHERE student_id = p_student_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'reward_events'; deleted_count := v_count; RETURN NEXT;

    DELETE FROM gidouilles_history WHERE student_id = p_student_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'gidouilles_history'; deleted_count := v_count; RETURN NEXT;

    DELETE FROM bonus_history WHERE student_id = p_student_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'bonus_history'; deleted_count := v_count; RETURN NEXT;

    DELETE FROM vip_cards_activity WHERE student_id = p_student_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'vip_cards_activity'; deleted_count := v_count; RETURN NEXT;

    DELETE FROM shop_purchase_history WHERE student_id = p_student_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'shop_purchase_history'; deleted_count := v_count; RETURN NEXT;

    DELETE FROM item_usage_log WHERE student_id = p_student_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'item_usage_log'; deleted_count := v_count; RETURN NEXT;

    -- Also delete from archive tables
    DELETE FROM reward_events_archive WHERE student_id = p_student_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'reward_events_archive'; deleted_count := v_count; RETURN NEXT;
END;
$$;
```

#### Scheduling Cleanup Jobs

Using pg_cron (or external scheduler):

```sql
-- Daily: Clean resolved error logs older than 90 days
SELECT cron.schedule('cleanup-error-logs', '0 2 * * *',
    $$SELECT cleanup_old_error_logs()$$);

-- Weekly: Archive audit data older than 1 year
SELECT cron.schedule('archive-audit-data', '0 3 * * 0',
    $$SELECT * FROM archive_old_audit_data(365)$$);

-- Monthly: Purge archived data older than 3 years
SELECT cron.schedule('purge-old-archives', '0 4 1 * *',
    $$SELECT * FROM purge_expired_audit_data(1095)$$);
```

#### Anonymization (Alternative to Deletion)

For analytics purposes, consider anonymizing instead of deleting:

```sql
CREATE OR REPLACE FUNCTION anonymize_student_audit_data(p_student_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_anon_id UUID := gen_random_uuid();
BEGIN
    -- Replace student_id with anonymous ID
    UPDATE reward_events SET
        student_id = v_anon_id,
        metadata = metadata - 'student_name' - 'email'
    WHERE student_id = p_student_id;

    UPDATE gidouilles_history SET student_id = v_anon_id
    WHERE student_id = p_student_id;

    UPDATE bonus_history SET student_id = v_anon_id
    WHERE student_id = p_student_id;

    -- Similar for other tables...

    -- Log anonymization
    INSERT INTO moderation_logs (
        moderator_id, action, target_type, target_id, reason, metadata
    ) VALUES (
        auth.uid(), 'data_anonymization', 'user', p_student_id,
        'GDPR compliance - data anonymized',
        jsonb_build_object('anonymized_to', v_anon_id)
    );
END;
$$;
```

### 6. Index Security

Indexes don't expose data but can reveal existence:

```sql
-- Partial indexes only include relevant rows
CREATE INDEX idx_reward_events_class_time
    ON public.reward_events (class_id, created_at DESC)
    WHERE class_id IS NOT NULL;  -- Excludes private events
```

---

## Testing RLS Policies

### Test as Student

```sql
-- Set role to authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "student-uuid"}';

-- Should only see own records
SELECT COUNT(*) FROM reward_events;  -- Only student's events

-- Should fail
INSERT INTO reward_events (...) VALUES (...);  -- Denied
```

### Test as Teacher

```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "teacher-uuid"}';

-- Should see students in their classes
SELECT COUNT(*) FROM reward_events WHERE class_id IS NOT NULL;

-- Should not see events without class_id
SELECT COUNT(*) FROM reward_events WHERE class_id IS NULL;  -- 0
```

### Test as Admin

```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "admin-uuid"}';

-- Should see all records
SELECT COUNT(*) FROM reward_events;  -- All events
SELECT COUNT(*) FROM template_audit_log;  -- All template logs
```
