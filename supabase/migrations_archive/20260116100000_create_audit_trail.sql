-- Migration: Create Audit Trail for RGPD Compliance
-- Purpose: Track access and modifications to sensitive data (profiles, student_attempts, student_progress)
-- RGPD Reference: Best practice for accountability (Art. 5(2)) and responding to data access requests

-- ============================================================================
-- 1. CREATE AUDIT_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment for documentation
COMMENT ON TABLE public.audit_logs IS 'RGPD audit trail - tracks modifications to sensitive data for compliance and accountability';
COMMENT ON COLUMN public.audit_logs.user_id IS 'User who performed the action (from auth.uid())';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of operation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Previous values (for UPDATE/DELETE)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'New values (for INSERT/UPDATE)';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'Client IP (populated by application layer when available)';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'Client user agent (populated by application layer when available)';

-- ============================================================================
-- 2. CREATE INDEXES FOR EFFICIENT QUERYING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);

-- Composite index for common queries (who accessed this user's data?)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);

-- ============================================================================
-- 3. CREATE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_old_values JSONB;
    v_new_values JSONB;
    v_record_id UUID;
BEGIN
    -- Get record ID (handle both NEW and OLD)
    v_record_id := COALESCE(
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.id END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.id END
    );

    -- Prepare old/new values based on operation
    IF TG_OP = 'DELETE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only store changed fields for UPDATE to reduce storage
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
    END IF;

    -- Insert audit log entry
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        v_record_id,
        v_old_values,
        v_new_values
    );

    -- Return appropriate value
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.audit_trigger_func() IS 'Generic audit trigger function for RGPD compliance - logs all changes to sensitive tables';

-- ============================================================================
-- 4. CREATE TRIGGERS ON SENSITIVE TABLES
-- ============================================================================

-- Profiles table - contains PII (names, emails, etc.)
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Exercise completions - contains learning behavior data (answers, time spent)
DROP TRIGGER IF EXISTS audit_exercise_completions ON public.exercise_completions;
CREATE TRIGGER audit_exercise_completions
    AFTER INSERT OR UPDATE OR DELETE ON public.exercise_completions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Student exercise mastery - contains aggregated performance data
DROP TRIGGER IF EXISTS audit_student_exercise_mastery ON public.student_exercise_mastery;
CREATE TRIGGER audit_student_exercise_mastery
    AFTER INSERT OR UPDATE OR DELETE ON public.student_exercise_mastery
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Users can view audit logs about their own data
CREATE POLICY "Users can view audit logs for their own data"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        -- User is the one who performed the action
        user_id = auth.uid()
        OR
        -- Or the record is about the user (for profiles table)
        (table_name = 'profiles' AND record_id = auth.uid())
        OR
        -- Or the record references the user in old/new values
        (old_values->>'student_id')::UUID = auth.uid()
        OR
        (new_values->>'student_id')::UUID = auth.uid()
    );

-- Policy: Teachers can view audit logs for their students
CREATE POLICY "Teachers can view audit logs for their students"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'teacher'
        )
        AND (
            -- Student profile is in one of their classes
            EXISTS (
                SELECT 1 FROM public.classes c
                JOIN public.class_members cm ON cm.class_id = c.id
                WHERE c.teacher_id = auth.uid()
                AND cm.student_id = audit_logs.record_id
            )
            OR
            -- Or check student_id in the values (for exercise_completions, etc.)
            EXISTS (
                SELECT 1 FROM public.classes c
                JOIN public.class_members cm ON cm.class_id = c.id
                WHERE c.teacher_id = auth.uid()
                AND (
                    cm.student_id = (audit_logs.old_values->>'student_id')::UUID
                    OR cm.student_id = (audit_logs.new_values->>'student_id')::UUID
                )
            )
        )
    );

-- No INSERT/UPDATE/DELETE policies - audit logs are write-only via trigger
-- and cannot be modified by users

-- ============================================================================
-- 6. RETENTION HELPER (optional cleanup of old audit logs)
-- ============================================================================

-- Function to cleanup old audit logs (call from pg_cron if needed)
-- Default retention: 2 years for audit logs
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retention_days INTEGER DEFAULT 730)
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.cleanup_old_audit_logs(INTEGER) IS 'Cleanup audit logs older than specified days (default 2 years). Call from pg_cron for automatic retention.';

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Service role needs full access for system operations
GRANT ALL ON public.audit_logs TO service_role;

-- Authenticated users can only SELECT (via RLS policies)
GRANT SELECT ON public.audit_logs TO authenticated;
