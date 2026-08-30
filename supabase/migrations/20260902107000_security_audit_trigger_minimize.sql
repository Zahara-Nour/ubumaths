-- Security / RGPD follow-up (finding M13, docs/wip/security-audit-2026-08.md)
--
-- Problem: audit_trigger_func() (baseline 20260616220000) wrote to_jsonb(OLD) /
-- to_jsonb(NEW) -- the WHOLE row, including profiles email / names / school /
-- grade / consent flags -- into audit_logs.old_values / new_values on every
-- INSERT / UPDATE / DELETE, despite an inline comment claiming it only stored
-- changed fields. In particular, deleting an account wrote one final full-PII
-- snapshot to audit_logs, defeating the erasure.
--
-- Fix (this migration): minimize the PII persisted by the audit trigger, WITHOUT
-- changing anything else about it (same signature, SECURITY DEFINER, search_path,
-- same audit_logs insert columns, same record_id / action / user_id logic):
--   * INSERT : unchanged  -> new_values = to_jsonb(NEW), old_values = NULL
--   * UPDATE : store ONLY the keys whose value actually changed (a JSONB diff),
--              instead of the full OLD/NEW rows.
--   * DELETE : store NO row snapshot -> old_values = NULL, new_values = NULL.
--              The deleted row's id is still traceable via audit_logs.record_id
--              (captured below from OLD.id), so no audit traceability is lost.
--
-- CREATE OR REPLACE preserves the existing owner, GRANTs and the AFTER triggers
-- (audit_profiles, audit_exercise_completions, audit_student_exercise_mastery).

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_old_values JSONB;
    v_new_values JSONB;
    v_record_id UUID;
    v_old_changed JSONB;
    v_new_changed JSONB;
BEGIN
    -- Get record ID (handle both NEW and OLD)
    v_record_id := COALESCE(
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.id END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.id END
    );

    -- Prepare old/new values based on operation
    IF TG_OP = 'DELETE' THEN
        -- RGPD: do NOT snapshot the full PII row on deletion.
        -- record_id (OLD.id) above keeps the deletion auditable.
        v_old_values := NULL;
        v_new_values := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        -- RGPD: store ONLY the changed keys, not the full OLD/NEW rows.
        SELECT jsonb_object_agg(n.key, n.value) INTO v_new_changed
        FROM jsonb_each(to_jsonb(NEW)) AS n(key, value)
        WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);

        SELECT jsonb_object_agg(o.key, o.value) INTO v_old_changed
        FROM jsonb_each(to_jsonb(OLD)) AS o(key, value)
        WHERE o.value IS DISTINCT FROM (to_jsonb(NEW) -> o.key);

        v_old_values := COALESCE(v_old_changed, '{}'::jsonb);
        v_new_values := COALESCE(v_new_changed, '{}'::jsonb);
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
$$;

COMMENT ON FUNCTION public.audit_trigger_func() IS
    'Generic audit trigger for RGPD compliance. Logs changes to sensitive tables while minimizing persisted PII: INSERT stores the new row, UPDATE stores only the changed keys (JSONB diff), DELETE stores no row snapshot (only record_id).';
