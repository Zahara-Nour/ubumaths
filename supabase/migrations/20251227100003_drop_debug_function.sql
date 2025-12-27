-- Migration: Drop debug function
-- Description: Remove the temporary debug_auth_context function used for RLS investigation
-- Created: 2025-12-27

DROP FUNCTION IF EXISTS debug_auth_context();

-- Note: The insert_tutor_messages and update_tutor_conversation_stats functions
-- from 20251227100001 are kept as they provide a useful SECURITY DEFINER pattern
-- that could be used in the future if needed.
