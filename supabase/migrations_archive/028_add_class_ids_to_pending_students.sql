-- Migration: Add class_ids to pending_students
-- Created: 2025-10-12
-- Purpose: Allow admins to pre-assign students to classes during import

-- Add class_ids column to pending_students
ALTER TABLE public.pending_students
ADD COLUMN class_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Add index for class_ids array searches
CREATE INDEX idx_pending_students_class_ids ON public.pending_students USING GIN(class_ids);

-- Update comment
COMMENT ON COLUMN public.pending_students.class_ids IS
  'Array of class IDs the student should be enrolled in upon first login. Classes are resolved by join_code during import.';
