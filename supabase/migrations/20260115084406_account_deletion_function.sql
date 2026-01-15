-- Migration: Account Deletion Function (GDPR Art. 17)
--
-- Creates a function to handle GDPR-compliant account deletion.
-- This function:
-- 1. Anonymizes audit logs (preserves records, removes PII)
-- 2. Hard-deletes soft-deleted records
-- 3. Prepares data for CASCADE deletion from profiles/auth.users

CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB := '{}';
    v_count INTEGER;
BEGIN
    -- Validate input parameter
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be NULL';
    END IF;

    -- ========================================
    -- Phase 1: Anonymize Audit Tables
    -- These records must be kept for compliance but PII must be removed
    -- ========================================

    -- Anonymize error_logs
    UPDATE error_logs
    SET user_id = NULL
    WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('error_logs_anonymized', v_count);

    -- Anonymize resolved_by in error_logs
    UPDATE error_logs
    SET resolved_by = NULL
    WHERE resolved_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('error_logs_resolved_by_anonymized', v_count);

    -- Anonymize gidouilles_history (keep transaction records, remove user link)
    UPDATE gidouilles_history
    SET student_id = NULL
    WHERE student_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('gidouilles_history_anonymized', v_count);

    -- Anonymize bonus_history
    UPDATE bonus_history
    SET student_id = NULL
    WHERE student_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('bonus_history_anonymized', v_count);

    -- Anonymize shop_purchase_history
    UPDATE shop_purchase_history
    SET student_id = NULL
    WHERE student_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('shop_purchase_history_anonymized', v_count);

    UPDATE shop_purchase_history
    SET refunded_by = NULL
    WHERE refunded_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('shop_purchase_history_refunded_by_anonymized', v_count);

    -- Anonymize item_usage_log
    UPDATE item_usage_log
    SET student_id = NULL
    WHERE student_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('item_usage_log_anonymized', v_count);

    UPDATE item_usage_log
    SET reversed_by = NULL
    WHERE reversed_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('item_usage_log_reversed_by_anonymized', v_count);

    -- Anonymize vip_cards_activity
    UPDATE vip_cards_activity
    SET student_id = NULL
    WHERE student_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('vip_cards_activity_anonymized', v_count);

    -- ========================================
    -- Phase 2: Hard Delete Soft-Deleted Records
    -- Records with deleted_at should be permanently removed
    -- ========================================

    -- Hard delete user's private messages
    DELETE FROM private_messages
    WHERE sender_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('private_messages_deleted', v_count);

    -- Hard delete user's message inbox entries
    DELETE FROM message_inbox
    WHERE recipient_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('message_inbox_deleted', v_count);

    -- Hard delete user's notifications
    DELETE FROM notifications
    WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('notifications_deleted', v_count);

    -- ========================================
    -- Phase 3: Handle SET NULL References
    -- These columns will become NULL when user is deleted,
    -- but we set them explicitly for clarity and logging
    -- ========================================

    -- Messages sender (ON DELETE SET NULL)
    UPDATE messages
    SET sender_id = NULL
    WHERE sender_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('messages_sender_nullified', v_count);

    -- Exercises created_by (ON DELETE SET NULL)
    UPDATE exercises
    SET created_by = NULL
    WHERE created_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('exercises_created_by_nullified', v_count);

    -- RAG documents teacher_id (ON DELETE SET NULL)
    UPDATE rag_documents
    SET teacher_id = NULL
    WHERE teacher_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('rag_documents_nullified', v_count);

    -- ========================================
    -- Phase 3b: Handle FK constraints WITHOUT ON DELETE clause
    -- These must be nullified BEFORE profile deletion to avoid constraint errors
    -- ========================================

    -- Game monsters references (no ON DELETE clause in schema)
    UPDATE game_monsters
    SET spawned_by = NULL
    WHERE spawned_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('game_monsters_spawned_by_nullified', v_count);

    UPDATE game_monsters
    SET defeated_by = NULL
    WHERE defeated_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('game_monsters_defeated_by_nullified', v_count);

    -- Game challenges created_by (no ON DELETE clause)
    UPDATE game_challenges
    SET created_by = NULL
    WHERE created_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('game_challenges_created_by_nullified', v_count);

    -- Message template audit tables (no ON DELETE clause)
    UPDATE message_template_versions
    SET modified_by = NULL
    WHERE modified_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('message_template_versions_nullified', v_count);

    UPDATE message_template_drafts
    SET reviewed_by = NULL
    WHERE reviewed_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('message_template_drafts_reviewed_by_nullified', v_count);

    UPDATE message_template_audit
    SET performed_by = NULL
    WHERE performed_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('message_template_audit_nullified', v_count);

    -- Exercise assignments (no ON DELETE clause)
    UPDATE exercise_assignments
    SET assigned_by = NULL
    WHERE assigned_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('exercise_assignments_nullified', v_count);

    -- ========================================
    -- Phase 4: Unlock marketplace items
    -- Prevent orphaned locked items
    -- ========================================

    UPDATE student_item_inventory
    SET locked_for_trade_id = NULL
    WHERE student_id = p_user_id AND locked_for_trade_id IS NOT NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('marketplace_items_unlocked', v_count);

    -- Return summary
    RETURN v_result;
END;
$$;

-- Grant execution to service role (will be called from API with service role)
-- Note: RLS doesn't apply to SECURITY DEFINER functions
COMMENT ON FUNCTION delete_user_account IS
    'GDPR Art. 17 compliant account deletion. Anonymizes audit trails and removes personal data. Called before auth.admin.deleteUser() to prepare cascading deletion.';
