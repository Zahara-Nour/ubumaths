-- ========================================================================
-- Retroactive Parental Consent Grace Period
-- ========================================================================
-- RGPD Article 8 compliance for minors under 15
--
-- This migration grants a 30-day grace period to existing students
-- in grades requiring parental consent (6eme to 2nde).
--
-- After this grace period:
-- - Students without consent will have read-only access
-- - Teachers will have had time to collect parent emails and send consents
--
-- IMPORTANT: This is a ONE-TIME migration for existing students.
-- New students will be handled by the application logic.
-- ========================================================================

-- Set consent_required and grace period for existing students in grades 6-2
UPDATE profiles
SET
    consent_required = TRUE,
    consent_grace_period_ends = NOW() + INTERVAL '30 days'
WHERE
    role = 'student'
    AND grade IN ('6', '5', '4', '3', '2')
    AND consent_granted_at IS NULL
    AND consent_required IS NOT TRUE;  -- Only update if not already set

-- Log the migration results
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM profiles
    WHERE role = 'student'
      AND grade IN ('6', '5', '4', '3', '2')
      AND consent_required = TRUE
      AND consent_grace_period_ends IS NOT NULL
      AND consent_granted_at IS NULL;

    RAISE NOTICE 'Retroactive consent migration: % students now in 30-day grace period', affected_count;
END $$;

-- Add a comment to document this migration
COMMENT ON COLUMN profiles.consent_grace_period_ends IS
    'End date of grace period for existing students. After this date, students without consent have read-only access. Migration 20260115144849 set initial 30-day grace periods.';
