-- Migration: Add parental consent fields to profiles
-- RGPD Article 8: Minors under 15 require parental consent in France
-- Grades requiring consent: 6, 5, 4, 3, 2 (ages 11-15)

-- Add consent tracking fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS consent_required BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consent_granted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consent_grace_period_ends TIMESTAMPTZ;

-- Index for filtering students awaiting consent
CREATE INDEX IF NOT EXISTS idx_profiles_consent_required
ON profiles(consent_required)
WHERE consent_required = TRUE;

-- Index for grace period checks (only for students requiring consent)
CREATE INDEX IF NOT EXISTS idx_profiles_consent_grace_period
ON profiles(consent_grace_period_ends)
WHERE consent_required = TRUE AND consent_grace_period_ends IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN profiles.consent_required IS
'True if student requires parental consent (grades 6-2, under 15 years old per RGPD Art. 8)';

COMMENT ON COLUMN profiles.consent_granted_at IS
'Timestamp when parental consent was granted. NULL means consent not yet received.';

COMMENT ON COLUMN profiles.consent_grace_period_ends IS
'For existing students: deadline to obtain consent. Full access until this date, then read-only.';
