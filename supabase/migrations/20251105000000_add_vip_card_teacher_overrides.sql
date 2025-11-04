-- Migration: Add teacher VIP card overrides table
-- Description: Teacher-specific overrides for VIP card availability
-- Created: 2025-11-04

-- Create the teacher_vip_card_overrides table
CREATE TABLE IF NOT EXISTS public.teacher_vip_card_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES public.vip_card_templates(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_teacher_card_override UNIQUE (teacher_id, card_id)
);

-- Add table comment
COMMENT ON TABLE public.teacher_vip_card_overrides IS
  'Teacher-specific overrides for VIP card availability. When a student draws a card, the system checks ALL their teachers'' overrides. Intersection logic: if ANY teacher has disabled a card, it is blocked for the student. Overrides apply to ALL classes taught by the teacher.';

-- Add column comments
COMMENT ON COLUMN public.teacher_vip_card_overrides.teacher_id IS
  'Reference to the teacher who created this override';
COMMENT ON COLUMN public.teacher_vip_card_overrides.card_id IS
  'Reference to the VIP card template being overridden';
COMMENT ON COLUMN public.teacher_vip_card_overrides.is_enabled IS
  'Whether this teacher has enabled (TRUE) or disabled (FALSE) this card for their students';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_overrides_teacher
  ON public.teacher_vip_card_overrides(teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_overrides_card
  ON public.teacher_vip_card_overrides(card_id);

CREATE INDEX IF NOT EXISTS idx_teacher_overrides_enabled
  ON public.teacher_vip_card_overrides(is_enabled);

-- Create composite index for common query pattern (checking specific teacher's override for a card)
CREATE INDEX IF NOT EXISTS idx_teacher_overrides_teacher_card_enabled
  ON public.teacher_vip_card_overrides(teacher_id, card_id, is_enabled);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_teacher_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_teacher_overrides_updated_at
  ON public.teacher_vip_card_overrides;

CREATE TRIGGER trigger_teacher_overrides_updated_at
  BEFORE UPDATE ON public.teacher_vip_card_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_teacher_overrides_updated_at();

-- Enable RLS
ALTER TABLE public.teacher_vip_card_overrides ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is teacher or admin
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policy: Teachers can SELECT their own overrides
DROP POLICY IF EXISTS "Teachers can view their own overrides"
  ON public.teacher_vip_card_overrides;

CREATE POLICY "Teachers can view their own overrides"
  ON public.teacher_vip_card_overrides
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid() AND is_teacher_or_admin()
  );

-- RLS Policy: Teachers can INSERT their own overrides
DROP POLICY IF EXISTS "Teachers can create their own overrides"
  ON public.teacher_vip_card_overrides;

CREATE POLICY "Teachers can create their own overrides"
  ON public.teacher_vip_card_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND is_teacher_or_admin()
  );

-- RLS Policy: Teachers can UPDATE their own overrides
DROP POLICY IF EXISTS "Teachers can update their own overrides"
  ON public.teacher_vip_card_overrides;

CREATE POLICY "Teachers can update their own overrides"
  ON public.teacher_vip_card_overrides
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid() AND is_teacher_or_admin()
  )
  WITH CHECK (
    teacher_id = auth.uid() AND is_teacher_or_admin()
  );

-- RLS Policy: Teachers can DELETE their own overrides
DROP POLICY IF EXISTS "Teachers can delete their own overrides"
  ON public.teacher_vip_card_overrides;

CREATE POLICY "Teachers can delete their own overrides"
  ON public.teacher_vip_card_overrides
  FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid() AND is_teacher_or_admin()
  );

-- RLS Policy: Admins can SELECT all overrides
DROP POLICY IF EXISTS "Admins can view all overrides"
  ON public.teacher_vip_card_overrides;

CREATE POLICY "Admins can view all overrides"
  ON public.teacher_vip_card_overrides
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_vip_card_overrides TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
