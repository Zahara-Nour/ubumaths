-- Add missing indexes for migration_tracking table
-- These indexes improve query performance for foreign keys and common queries

-- Add index on foreign key (new_template_id)
CREATE INDEX IF NOT EXISTS idx_migration_tracking_template_id
ON public.migration_tracking(new_template_id)
WHERE new_template_id IS NOT NULL;

-- Add composite index for common queries by status and phase
CREATE INDEX IF NOT EXISTS idx_migration_tracking_status_phase
ON public.migration_tracking(migration_status, phase)
WHERE phase IS NOT NULL;

-- Add index for hash lookups (primary key alternative)
CREATE INDEX IF NOT EXISTS idx_migration_tracking_hash
ON public.migration_tracking(old_question_hash);

-- Add index for phase-specific queries
CREATE INDEX IF NOT EXISTS idx_migration_tracking_phase
ON public.migration_tracking(phase)
WHERE phase IS NOT NULL;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_migration_tracking_status
ON public.migration_tracking(migration_status);

-- Add index for chronological queries
CREATE INDEX IF NOT EXISTS idx_migration_tracking_index
ON public.migration_tracking(old_question_index);

-- Add indexes for timestamp columns used in filtering
CREATE INDEX IF NOT EXISTS idx_migration_tracking_converted_at
ON public.migration_tracking(converted_at)
WHERE converted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_migration_tracking_imported_at
ON public.migration_tracking(imported_at)
WHERE imported_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_migration_tracking_validated_at
ON public.migration_tracking(validated_at)
WHERE validated_at IS NOT NULL;

-- Add composite index for resume queries (phase + status + index)
CREATE INDEX IF NOT EXISTS idx_migration_tracking_resume
ON public.migration_tracking(phase, migration_status, old_question_index)
WHERE phase IS NOT NULL;

-- Add index for failed questions queries
CREATE INDEX IF NOT EXISTS idx_migration_tracking_failed
ON public.migration_tracking(migration_status, phase, old_question_index)
WHERE migration_status = 'failed';

-- Comment on indexes for documentation
COMMENT ON INDEX idx_migration_tracking_template_id IS 'Index for foreign key lookups to question_templates table';
COMMENT ON INDEX idx_migration_tracking_status_phase IS 'Composite index for queries filtering by status and phase';
COMMENT ON INDEX idx_migration_tracking_hash IS 'Index for hash-based lookups (alternative to primary key)';
COMMENT ON INDEX idx_migration_tracking_phase IS 'Index for phase-specific queries';
COMMENT ON INDEX idx_migration_tracking_status IS 'Index for status-based filtering';
COMMENT ON INDEX idx_migration_tracking_index IS 'Index for chronological ordering by original question index';
COMMENT ON INDEX idx_migration_tracking_resume IS 'Composite index optimized for resume point queries';
COMMENT ON INDEX idx_migration_tracking_failed IS 'Specialized index for failed question queries';