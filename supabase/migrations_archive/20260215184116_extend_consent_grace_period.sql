-- ========================================================================
-- Extend Parental Consent Grace Period to End of School Year
-- ========================================================================
-- The initial 30-day grace period (from 2026-01-15) has expired.
-- Extending to 2026-06-30 (end of school year) for all students
-- who still require consent and haven't received it yet.
-- ========================================================================

UPDATE profiles
SET consent_grace_period_ends = '2026-06-30T23:59:59+02:00'::timestamptz
WHERE
    role = 'student'
    AND consent_required = TRUE
    AND consent_granted_at IS NULL;

-- Log results
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM profiles
    WHERE role = 'student'
      AND consent_required = TRUE
      AND consent_granted_at IS NULL
      AND consent_grace_period_ends = '2026-06-30T23:59:59+02:00'::timestamptz;

    RAISE NOTICE 'Grace period extended to 2026-06-30 for % students', affected_count;
END $$;
