-- Migration: Add review workflow columns to migration_tracking
-- Purpose: Enable question review system with approval/rejection before import
-- Author: Claude (supabase-expert agent)
-- Date: 2025-11-27

-- =============================================================================
-- PART 1: Add new columns to migration_tracking table
-- =============================================================================

-- Add theme column (e.g., "Entiers")
ALTER TABLE public.migration_tracking
ADD COLUMN IF NOT EXISTS theme TEXT;

-- Add domain column (e.g., "Apprivoiser")
ALTER TABLE public.migration_tracking
ADD COLUMN IF NOT EXISTS domain TEXT;

-- Add subdomain column (e.g., "Ecriture")
ALTER TABLE public.migration_tracking
ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- Add level column (0-indexed position within subdomain)
ALTER TABLE public.migration_tracking
ADD COLUMN IF NOT EXISTS level INTEGER;

-- Add old_question_json column (original question data from old system)
ALTER TABLE public.migration_tracking
ADD COLUMN IF NOT EXISTS old_question_json JSONB;

-- Add transformed_json column (transformed question template)
ALTER TABLE public.migration_tracking
ADD COLUMN IF NOT EXISTS transformed_json JSONB;

-- Add review_status column with CHECK constraint
ALTER TABLE public.migration_tracking
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending';

-- Add CHECK constraint for review_status (separate statement for IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'migration_tracking_review_status_check'
  ) THEN
    ALTER TABLE public.migration_tracking
    ADD CONSTRAINT migration_tracking_review_status_check
    CHECK (review_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Add reviewed_by column with foreign key to profiles
ALTER TABLE public.migration_tracking
ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- Add FOREIGN KEY constraint for reviewed_by (separate for IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'migration_tracking_reviewed_by_fkey'
  ) THEN
    ALTER TABLE public.migration_tracking
    ADD CONSTRAINT migration_tracking_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add reviewed_at column (when review occurred)
ALTER TABLE public.migration_tracking
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- =============================================================================
-- PART 2: Add indexes for new columns
-- =============================================================================

-- Composite index on (theme, domain, subdomain, level) for category queries
CREATE INDEX IF NOT EXISTS idx_migration_tracking_category
ON public.migration_tracking(theme, domain, subdomain, level)
WHERE theme IS NOT NULL;

-- Index on review_status for filtering by review state
CREATE INDEX IF NOT EXISTS idx_migration_tracking_review_status
ON public.migration_tracking(review_status)
WHERE review_status IS NOT NULL;

-- Index on reviewed_by for reviewer queries
CREATE INDEX IF NOT EXISTS idx_migration_tracking_reviewed_by
ON public.migration_tracking(reviewed_by)
WHERE reviewed_by IS NOT NULL;

-- Index on reviewed_at for chronological review queries
CREATE INDEX IF NOT EXISTS idx_migration_tracking_reviewed_at
ON public.migration_tracking(reviewed_at)
WHERE reviewed_at IS NOT NULL;

-- =============================================================================
-- PART 3: Create migration_review_tree view
-- =============================================================================

-- Drop view if exists to allow recreation
DROP VIEW IF EXISTS public.migration_review_tree;

-- Create view for hierarchical review status summary
CREATE VIEW public.migration_review_tree AS
SELECT
  theme,
  domain,
  subdomain,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE review_status = 'approved') as approved,
  COUNT(*) FILTER (WHERE review_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE review_status = 'rejected') as rejected
FROM public.migration_tracking
WHERE theme IS NOT NULL
GROUP BY theme, domain, subdomain
ORDER BY theme, domain, subdomain;

-- Add comment to document the view
COMMENT ON VIEW public.migration_review_tree IS
  'Aggregated view of migration review status grouped by theme/domain/subdomain hierarchy';

-- =============================================================================
-- PART 4: Add column comments for documentation
-- =============================================================================

COMMENT ON COLUMN public.migration_tracking.theme IS 'Question theme category (e.g., "Entiers")';
COMMENT ON COLUMN public.migration_tracking.domain IS 'Question domain within theme (e.g., "Apprivoiser")';
COMMENT ON COLUMN public.migration_tracking.subdomain IS 'Question subdomain within domain (e.g., "Ecriture")';
COMMENT ON COLUMN public.migration_tracking.level IS 'Question level/position within subdomain (0-indexed)';
COMMENT ON COLUMN public.migration_tracking.old_question_json IS 'Original question data from TinyMath system (JSONB)';
COMMENT ON COLUMN public.migration_tracking.transformed_json IS 'Transformed question template ready for import (JSONB)';
COMMENT ON COLUMN public.migration_tracking.review_status IS 'Review workflow status: pending, approved, or rejected';
COMMENT ON COLUMN public.migration_tracking.reviewed_by IS 'UUID of admin who reviewed the question';
COMMENT ON COLUMN public.migration_tracking.reviewed_at IS 'Timestamp when review occurred';

-- Add index comments
COMMENT ON INDEX idx_migration_tracking_category IS 'Composite index for category hierarchy queries (theme/domain/subdomain/level)';
COMMENT ON INDEX idx_migration_tracking_review_status IS 'Index for filtering questions by review status';
COMMENT ON INDEX idx_migration_tracking_reviewed_by IS 'Index for finding questions reviewed by specific admin';
COMMENT ON INDEX idx_migration_tracking_reviewed_at IS 'Index for chronological review queries';

-- =============================================================================
-- Note: RLS policies already exist for migration_tracking table (admin-only access)
-- The existing policy "Admin full access to migration_tracking" covers all operations
-- No additional RLS policies needed for the new columns
--
-- The view inherits RLS from the underlying table, so only admins can access it
-- =============================================================================
