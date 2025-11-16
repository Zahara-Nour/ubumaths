-- Add topic support to shared_coursework table
-- This migration adds topic_id column to align shared_coursework with shared_materials architecture

-- Add topic_id column to shared_coursework table
ALTER TABLE public.shared_coursework
ADD COLUMN topic_id UUID REFERENCES public.google_classroom_topics(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_shared_coursework_topic_id ON public.shared_coursework(topic_id);

-- Add comment
COMMENT ON COLUMN public.shared_coursework.topic_id IS 'Optional Google Classroom topic for organization';

-- Note: RLS policies do not need modification as topic authorization is handled in application layer
-- Topics are verified to belong to teacher's courses during API operations
