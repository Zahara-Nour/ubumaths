-- Migration: Account Deletion Audit Table
--
-- Creates an audit table to track all account deletion attempts.
-- This is required for:
-- 1. Security monitoring (detecting abuse patterns)
-- 2. GDPR compliance (proof of deletion requests)
-- 3. Support investigations (helping users who regret deletion)

-- ============================================================================
-- AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_deletion_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User information (anonymized after successful deletion)
    user_id UUID,  -- NULL after successful deletion (user no longer exists)
    email_hash TEXT NOT NULL,  -- SHA256 hash of email for correlation without PII

    -- Request metadata
    ip_address INET,  -- For abuse detection
    user_agent TEXT,  -- For debugging

    -- Outcome
    status TEXT NOT NULL CHECK (status IN ('requested', 'completed', 'failed', 'rate_limited')),
    error_message TEXT,  -- Only for failed attempts

    -- Deletion statistics (from delete_user_account function)
    cleanup_result JSONB,  -- Stores the result from delete_user_account RPC

    -- Timestamps
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ  -- NULL if not yet completed or failed
);

-- Index for security monitoring (find patterns by IP)
CREATE INDEX idx_account_deletion_audit_ip ON account_deletion_audit(ip_address, requested_at DESC);

-- Index for rate limiting queries
CREATE INDEX idx_account_deletion_audit_user_rate ON account_deletion_audit(user_id, requested_at DESC)
    WHERE user_id IS NOT NULL;

-- Index for email hash correlation (support investigations)
CREATE INDEX idx_account_deletion_audit_email_hash ON account_deletion_audit(email_hash);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE account_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit data (no user access)
-- This is intentional: audit logs are for admins and compliance only

COMMENT ON TABLE account_deletion_audit IS
    'Audit trail for account deletion requests (GDPR Art. 17). Service role access only.';

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Automatically clean old audit entries (keep 1 year for compliance)
CREATE OR REPLACE FUNCTION cleanup_account_deletion_audit()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM account_deletion_audit
    WHERE requested_at < NOW() - INTERVAL '1 year';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_account_deletion_audit IS
    'Removes audit entries older than 1 year. Call from cron job.';
