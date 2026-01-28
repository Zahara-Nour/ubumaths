-- Migration edits table for storing manual question modifications during review
-- Purpose: Allow admins to edit transformed questions before approval
-- Author: Claude
-- Date: 2026-01-26

-- Migration edits table
CREATE TABLE public.migration_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_tracking_id UUID NOT NULL REFERENCES public.migration_tracking(id) ON DELETE CASCADE,
  old_question_hash TEXT NOT NULL,
  edited_json JSONB NOT NULL,  -- QuestionTemplate complet edite
  editor_id UUID NOT NULL REFERENCES public.profiles(id),
  edit_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by hash (one edit per question)
CREATE UNIQUE INDEX idx_migration_edits_hash ON public.migration_edits(old_question_hash);

-- Index for editor lookups
CREATE INDEX idx_migration_edits_editor ON public.migration_edits(editor_id);

-- RLS Policies (Admin only)
ALTER TABLE public.migration_edits ENABLE ROW LEVEL SECURITY;

-- Only admins can access migration_edits table
CREATE POLICY "Admin full access to migration_edits"
  ON public.migration_edits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Updated_at trigger
CREATE TRIGGER migration_edits_updated_at
  BEFORE UPDATE ON public.migration_edits
  FOR EACH ROW
  EXECUTE FUNCTION update_migration_tracking_updated_at();

-- Comment for documentation
COMMENT ON TABLE public.migration_edits IS 'Stores manual edits to transformed questions during migration review process';
COMMENT ON COLUMN public.migration_edits.edited_json IS 'Complete edited QuestionTemplate in JSON format';
COMMENT ON COLUMN public.migration_edits.old_question_hash IS 'SHA-256 hash of the original question for lookup';
