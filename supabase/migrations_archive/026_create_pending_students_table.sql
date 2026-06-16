-- Migration: Create Pending Students Table
-- Created: 2025-10-12
-- Purpose: Allow admin to pre-populate students before they authenticate with Google

-- Create pending_students table
CREATE TABLE IF NOT EXISTS public.pending_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  grade TEXT, -- e.g., "6ème", "5ème", "4ème", "3ème", "2nde"
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  gender TEXT CHECK (gender IN ('boy', 'girl')), -- For avatar fallback
  is_activated BOOLEAN DEFAULT FALSE, -- True when student has logged in
  activated_at TIMESTAMPTZ, -- When the student first authenticated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast email lookups during authentication
CREATE INDEX idx_pending_students_email ON public.pending_students(email) WHERE is_activated = FALSE;

-- Add index for school-based filtering
CREATE INDEX idx_pending_students_school ON public.pending_students(school_id);

-- Enable RLS
ALTER TABLE public.pending_students ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view pending students
CREATE POLICY "Admins can view all pending students"
  ON public.pending_students
  FOR SELECT
  USING (is_admin());

-- Policy: Only admins can insert pending students
CREATE POLICY "Admins can insert pending students"
  ON public.pending_students
  FOR INSERT
  WITH CHECK (is_admin());

-- Policy: Only admins can update pending students
CREATE POLICY "Admins can update pending students"
  ON public.pending_students
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy: Only admins can delete pending students
CREATE POLICY "Admins can delete pending students"
  ON public.pending_students
  FOR DELETE
  USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_pending_students_updated_at
  BEFORE UPDATE ON public.pending_students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE public.pending_students IS
  'Stores student data before first authentication. When a student signs in with Google, their profile is created with this pre-populated data.';
