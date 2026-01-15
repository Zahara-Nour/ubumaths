-- Migration: Add parent_email to pending_students
-- Allows teachers to provide parent email during student import

ALTER TABLE pending_students
ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_pending_students_parent_email
ON pending_students(parent_email)
WHERE parent_email IS NOT NULL;

-- Email format constraint
ALTER TABLE pending_students
ADD CONSTRAINT valid_parent_email_format
CHECK (
    parent_email IS NULL OR
    parent_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

COMMENT ON COLUMN pending_students.parent_email IS
'Parent/guardian email for consent requests. Required for grades 6-2 (minors under 15 per RGPD Art. 8).';
