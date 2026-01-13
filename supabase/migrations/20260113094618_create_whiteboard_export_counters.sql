-- Migration: Create whiteboard_export_counters table
-- Purpose: Track export document numbers per class and date
-- for generating filenames like "6AWB - 2026-01-12 - 01.pdf"

-- Track export counters per class and date
CREATE TABLE public.whiteboard_export_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  export_date date NOT NULL,
  counter integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_class_date UNIQUE(class_id, export_date)
);

-- Enable RLS
ALTER TABLE public.whiteboard_export_counters ENABLE ROW LEVEL SECURITY;

-- Teacher can read/write their own class counters
CREATE POLICY "Teachers can manage their class counters"
ON public.whiteboard_export_counters
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.teacher_id = auth.uid()
  )
);

-- Function to get and increment counter atomically
-- Uses INSERT ... ON CONFLICT to handle concurrent requests safely
CREATE OR REPLACE FUNCTION public.get_next_export_counter(
  p_class_id uuid,
  p_export_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_counter integer;
BEGIN
  -- Upsert: insert new row with counter=1, or increment existing
  INSERT INTO public.whiteboard_export_counters (class_id, export_date, counter)
  VALUES (p_class_id, p_export_date, 1)
  ON CONFLICT (class_id, export_date)
  DO UPDATE SET
    counter = whiteboard_export_counters.counter + 1,
    updated_at = now()
  RETURNING counter INTO v_counter;

  RETURN v_counter;
END;
$$;

-- Comment for documentation
COMMENT ON TABLE public.whiteboard_export_counters IS 'Tracks export document numbers per class and date for whiteboard PDF exports';
COMMENT ON FUNCTION public.get_next_export_counter IS 'Atomically gets the next export counter for a class/date combination';
