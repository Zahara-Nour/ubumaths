-- ============================================================================
-- Migration: Create bug_reports table and storage bucket
-- Description: User-facing bug/feedback reporting system with screenshots
-- Date: 2025-12-29
-- ============================================================================
--
-- This migration creates a bug reporting system that allows:
-- - Users to report bugs, content errors, UX issues, and feature requests
-- - Optional screenshot uploads for better context
-- - Admin review and resolution workflow
-- - Auto-generated reports from error monitoring integration
--
-- Security:
-- - Users can only view/edit their own reports
-- - Admins have full access to all reports
-- - Screenshots stored in user-specific folders
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE: bug_reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Author
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Classification
  category TEXT NOT NULL CHECK (category IN ('bug', 'content', 'ux', 'feature', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Content
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 5000),

  -- Screenshot (optional)
  screenshot_url TEXT,
  screenshot_path TEXT,

  -- Technical context (auto-captured)
  page_url TEXT,
  user_agent TEXT,
  viewport_size TEXT,
  session_context JSONB DEFAULT '{}',

  -- Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',       -- New report, awaiting review
    'acknowledged',  -- Admin has seen it
    'in_progress',   -- Being worked on
    'resolved',      -- Fixed/addressed
    'wont_fix',      -- Will not be addressed
    'duplicate'      -- Duplicate of another report
  )),

  -- Admin handling
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Auto-generated reports (from error monitoring)
  auto_generated BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES: Performance optimization
-- ============================================================================

-- Index for user's own reports
CREATE INDEX idx_bug_reports_user
  ON public.bug_reports(user_id);

-- Partial index for pending reports (admin dashboard)
CREATE INDEX idx_bug_reports_status_pending
  ON public.bug_reports(created_at DESC)
  WHERE status = 'pending';

-- Index for listing reports by date (most common query)
CREATE INDEX idx_bug_reports_created
  ON public.bug_reports(created_at DESC);

-- Index for filtering by category
CREATE INDEX idx_bug_reports_category
  ON public.bug_reports(category);

-- Partial index for high/critical severity reports (priority queue)
CREATE INDEX idx_bug_reports_severity_high
  ON public.bug_reports(created_at DESC)
  WHERE severity IN ('high', 'critical');

-- Composite index for admin filtering
CREATE INDEX idx_bug_reports_status_category
  ON public.bug_reports(status, category);

-- ============================================================================
-- 3. TRIGGER: Auto-update updated_at on UPDATE
-- ============================================================================

-- Create trigger for bug_reports (reusing existing function)
DROP TRIGGER IF EXISTS update_bug_reports_updated_at
  ON public.bug_reports;

CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. ENABLE RLS
-- ============================================================================

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- 5.1 Users can view their own reports
CREATE POLICY "Users can view own bug reports"
  ON public.bug_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5.2 Users can create reports (must be their own)
CREATE POLICY "Users can create bug reports"
  ON public.bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5.3 Users can update their own PENDING reports only
-- Note: Application layer restricts updatable fields
CREATE POLICY "Users can update own pending bug reports"
  ON public.bug_reports
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- 5.4 Admins can view all reports
CREATE POLICY "Admins can view all bug reports"
  ON public.bug_reports
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 5.5 Admins can update all reports
CREATE POLICY "Admins can update all bug reports"
  ON public.bug_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.6 Admins can delete reports (for spam/duplicates)
CREATE POLICY "Admins can delete bug reports"
  ON public.bug_reports
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.bug_reports TO authenticated;
-- DELETE only via admin RLS policy

-- ============================================================================
-- 7. STORAGE BUCKET: bug-report-screenshots
-- ============================================================================

-- Create the storage bucket for bug report screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bug-report-screenshots',
  'bug-report-screenshots',
  true,  -- Public bucket (screenshots are viewable by admins)
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. STORAGE RLS POLICIES
-- ============================================================================

-- 8.1 Anyone can view screenshots (needed for public URLs)
DROP POLICY IF EXISTS "Public can view bug report screenshots"
  ON storage.objects;

CREATE POLICY "Public can view bug report screenshots"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'bug-report-screenshots');

-- 8.2 Authenticated users can upload to their own folder
DROP POLICY IF EXISTS "Users can upload bug report screenshots"
  ON storage.objects;

CREATE POLICY "Users can upload bug report screenshots"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bug-report-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- 8.3 Users can update their own screenshots
DROP POLICY IF EXISTS "Users can update own bug report screenshots"
  ON storage.objects;

CREATE POLICY "Users can update own bug report screenshots"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bug-report-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'bug-report-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- 8.4 Users can delete their own screenshots
DROP POLICY IF EXISTS "Users can delete own bug report screenshots"
  ON storage.objects;

CREATE POLICY "Users can delete own bug report screenshots"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bug-report-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- 8.5 Admins can manage all screenshots
DROP POLICY IF EXISTS "Admins can manage bug report screenshots"
  ON storage.objects;

CREATE POLICY "Admins can manage bug report screenshots"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'bug-report-screenshots'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'bug-report-screenshots'
    AND public.is_admin()
  );

-- ============================================================================
-- 9. COMMENTS: Documentation
-- ============================================================================

COMMENT ON TABLE public.bug_reports IS
  'User-submitted bug reports, feedback, and feature requests. Includes optional screenshots and auto-captured technical context.';

COMMENT ON COLUMN public.bug_reports.user_id IS
  'The user who submitted this report';

COMMENT ON COLUMN public.bug_reports.category IS
  'Report type: bug (application error), content (math content error), ux (usability issue), feature (feature request), other';

COMMENT ON COLUMN public.bug_reports.severity IS
  'Impact level: low (minor inconvenience), medium (affects workflow), high (blocks functionality), critical (data loss/security)';

COMMENT ON COLUMN public.bug_reports.title IS
  'Brief summary of the issue (5-200 characters)';

COMMENT ON COLUMN public.bug_reports.description IS
  'Detailed description with steps to reproduce (20-5000 characters)';

COMMENT ON COLUMN public.bug_reports.screenshot_url IS
  'Public URL of the uploaded screenshot';

COMMENT ON COLUMN public.bug_reports.screenshot_path IS
  'Storage path of the screenshot (user_id/filename)';

COMMENT ON COLUMN public.bug_reports.page_url IS
  'URL where the issue occurred (auto-captured)';

COMMENT ON COLUMN public.bug_reports.user_agent IS
  'Browser user agent string (auto-captured)';

COMMENT ON COLUMN public.bug_reports.viewport_size IS
  'Screen dimensions (auto-captured, format: WxH)';

COMMENT ON COLUMN public.bug_reports.session_context IS
  'Additional context like current class, exercise ID, etc. (JSONB)';

COMMENT ON COLUMN public.bug_reports.status IS
  'Workflow status: pending, acknowledged, in_progress, resolved, wont_fix, duplicate';

COMMENT ON COLUMN public.bug_reports.resolution_notes IS
  'Admin notes explaining the resolution or reason for closing';

COMMENT ON COLUMN public.bug_reports.resolved_by IS
  'Admin who resolved this report';

COMMENT ON COLUMN public.bug_reports.resolved_at IS
  'Timestamp when the report was resolved';

COMMENT ON COLUMN public.bug_reports.auto_generated IS
  'True if created automatically from error monitoring system';

-- Index comments
COMMENT ON INDEX idx_bug_reports_user IS
  'Fast lookup of reports by user for "my reports" view';

COMMENT ON INDEX idx_bug_reports_status_pending IS
  'Partial index for admin pending queue (most common admin query)';

COMMENT ON INDEX idx_bug_reports_created IS
  'Chronological listing of all reports';

COMMENT ON INDEX idx_bug_reports_category IS
  'Filter reports by category';

COMMENT ON INDEX idx_bug_reports_severity_high IS
  'Priority queue for high/critical severity reports';

COMMENT ON INDEX idx_bug_reports_status_category IS
  'Composite index for admin filtering by status and category';

-- ============================================================================
-- 10. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
  v_index_count INTEGER;
  v_bucket_exists BOOLEAN;
  v_storage_policy_count INTEGER;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'bug_reports'
  ) INTO v_table_exists;

  -- Check RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'bug_reports'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  -- Count table policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'bug_reports';

  -- Count indexes (excluding primary key)
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'bug_reports'
    AND indexname != 'bug_reports_pkey';

  -- Check bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'bug-report-screenshots'
  ) INTO v_bucket_exists;

  -- Count storage policies for this bucket
  SELECT COUNT(*) INTO v_storage_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%bug report%';

  -- Output verification results
  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Migration: bug_reports';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Table created: %', v_table_exists;
  RAISE NOTICE 'RLS enabled: %', v_rls_enabled;
  RAISE NOTICE 'Table policies created: % (expected: 6)', v_policy_count;
  RAISE NOTICE 'Indexes created: % (expected: 6)', v_index_count;
  RAISE NOTICE 'Storage bucket created: %', v_bucket_exists;
  RAISE NOTICE 'Storage policies created: % (expected: 5)', v_storage_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run: pnpm db:migrate';
  RAISE NOTICE '  2. Update: src/lib/types/database.ts';
  RAISE NOTICE '  3. Update: docs/architecture/database-schema.md';
  RAISE NOTICE '===============================================';

  -- Validate critical items
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Table bug_reports was not created!';
  END IF;

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'RLS is not enabled on bug_reports!';
  END IF;

  IF v_policy_count < 6 THEN
    RAISE EXCEPTION 'Not all table policies were created! Expected 6, got %', v_policy_count;
  END IF;

  IF NOT v_bucket_exists THEN
    RAISE EXCEPTION 'Storage bucket bug-report-screenshots was not created!';
  END IF;
END $$;
