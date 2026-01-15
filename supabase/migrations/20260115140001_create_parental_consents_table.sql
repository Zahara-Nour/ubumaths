-- Migration: Create parental_consents table
-- Tracks parental consent requests and responses for RGPD Article 8 compliance

-- Create consent status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_status') THEN
        CREATE TYPE consent_status AS ENUM ('pending', 'granted', 'expired');
    END IF;
END$$;

-- Create parental consents table
CREATE TABLE IF NOT EXISTS parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Student reference
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Parent information
    parent_email TEXT NOT NULL,
    parent_name TEXT,

    -- Consent status
    status consent_status NOT NULL DEFAULT 'pending',

    -- Verification token (unique, secure, used in consent link)
    consent_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

    -- Consent metadata (filled when parent grants consent)
    consent_given_at TIMESTAMPTZ,
    consent_ip INET,
    consent_user_agent TEXT,

    -- Email tracking (rate limiting)
    last_email_sent_at TIMESTAMPTZ,
    email_count INTEGER NOT NULL DEFAULT 0,

    -- Constraints
    CONSTRAINT valid_consent_state CHECK (
        (status = 'granted' AND consent_given_at IS NOT NULL) OR
        (status != 'granted')
    ),
    CONSTRAINT max_email_count CHECK (email_count <= 5),
    CONSTRAINT valid_email_format CHECK (parent_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parental_consents_student
ON parental_consents(student_id);

CREATE INDEX IF NOT EXISTS idx_parental_consents_token
ON parental_consents(consent_token)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_parental_consents_status
ON parental_consents(status);

CREATE INDEX IF NOT EXISTS idx_parental_consents_expires
ON parental_consents(expires_at)
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Teachers can view consents for students in their classes
CREATE POLICY "Teachers can view consents for their students"
ON parental_consents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        JOIN classes c ON cm.class_id = c.id
        WHERE cm.student_id = parental_consents.student_id
        AND c.teacher_id = auth.uid()
    )
);

-- Teachers can insert consents for students in their classes
CREATE POLICY "Teachers can insert consents for their students"
ON parental_consents FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM class_members cm
        JOIN classes c ON cm.class_id = c.id
        WHERE cm.student_id = parental_consents.student_id
        AND c.teacher_id = auth.uid()
    )
);

-- Teachers can update consents for their students (resend email)
CREATE POLICY "Teachers can update consents for their students"
ON parental_consents FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        JOIN classes c ON cm.class_id = c.id
        WHERE cm.student_id = parental_consents.student_id
        AND c.teacher_id = auth.uid()
    )
);

-- Admins have full access
CREATE POLICY "Admins can manage all consents"
ON parental_consents FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_parental_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_parental_consents_updated_at ON parental_consents;
CREATE TRIGGER update_parental_consents_updated_at
BEFORE UPDATE ON parental_consents
FOR EACH ROW EXECUTE FUNCTION update_parental_consents_updated_at();

-- Comments
COMMENT ON TABLE parental_consents IS
'Tracks parental consent requests for RGPD Article 8 compliance. Students under 15 (grades 6-2) require consent.';

COMMENT ON COLUMN parental_consents.consent_token IS
'Unique token used in consent verification link. Parent clicks link with this token to grant consent.';

COMMENT ON COLUMN parental_consents.email_count IS
'Number of consent emails sent. Limited to 5 to prevent spam.';
