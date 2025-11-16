-- Migration tracking table for TinyMath to UbuMaths v2 question migration
-- Purpose: Track the migration status of each question throughout the process
-- Author: Claude
-- Date: 2025-11-16

-- Migration tracking table
CREATE TABLE public.migration_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_question_hash TEXT UNIQUE NOT NULL,  -- SHA-256 hash of old question JSON
  old_question_index INTEGER NOT NULL,      -- Position in old questions.ts array
  old_description TEXT NOT NULL,            -- Old question description field
  migration_status TEXT NOT NULL CHECK (migration_status IN ('pending', 'converted', 'imported', 'validated', 'failed')),
  phase INTEGER CHECK (phase IN (1, 2, 3, 4)),
  new_template_id UUID REFERENCES public.question_templates(id) ON DELETE SET NULL,
  conversion_errors JSONB DEFAULT '[]'::jsonb,
  conversion_notes TEXT,
  converted_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image migration tracking table
CREATE TABLE public.migration_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_path TEXT UNIQUE NOT NULL,
  new_path TEXT UNIQUE NOT NULL,
  migrated_at TIMESTAMPTZ,
  file_size INTEGER,
  migration_status TEXT NOT NULL CHECK (migration_status IN ('pending', 'migrated', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_migration_tracking_status ON public.migration_tracking(migration_status);
CREATE INDEX idx_migration_tracking_phase ON public.migration_tracking(phase);
CREATE INDEX idx_migration_tracking_old_index ON public.migration_tracking(old_question_index);
CREATE INDEX idx_migration_images_status ON public.migration_images(migration_status);

-- RLS Policies (Admin only)
ALTER TABLE public.migration_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_images ENABLE ROW LEVEL SECURITY;

-- Only admins can access migration_tracking table
CREATE POLICY "Admin full access to migration_tracking"
  ON public.migration_tracking
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can access migration_images table
CREATE POLICY "Admin full access to migration_images"
  ON public.migration_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_migration_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for migration_tracking
CREATE TRIGGER migration_tracking_updated_at
  BEFORE UPDATE ON public.migration_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_migration_tracking_updated_at();