-- =====================================================================
-- Fix: gidouilles_activity trigger missing class_id in reward_events
-- =====================================================================
-- The trigger log_gidouilles_activity_to_events was not forwarding
-- class_id and created_by from gidouilles_activity to reward_events.
-- This caused events to be invisible to teachers via RLS, because
-- the teacher policy requires: class_id IS NOT NULL AND is_class_teacher(class_id)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_gidouilles_activity_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_type public.reward_event_type;
    v_description TEXT;
BEGIN
    -- Skip if already logged
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'gidouilles_activity'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Determine event type
    IF NEW.delta > 0 THEN
        v_event_type := 'earned';
    ELSE
        v_event_type := 'spent';
    END IF;

    -- Generate description
    v_description := public.generate_reward_event_description(
        'gidouilles_activity',
        NEW.reason,
        NEW.delta
    );

    -- Insert into reward_events (now includes class_id and created_by)
    INSERT INTO public.reward_events (
        student_id,
        event_type,
        reward_type,
        amount,
        description,
        source_table,
        source_id,
        class_id,
        created_by,
        created_at
    ) VALUES (
        NEW.student_id,
        v_event_type,
        'gidouilles',
        ABS(NEW.delta),
        v_description,
        'gidouilles_activity',
        NEW.id,
        NEW.class_id,
        NEW.created_by,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

-- Backfill class_id for existing reward_events that are missing it
UPDATE public.reward_events re
SET class_id = ga.class_id,
    created_by = ga.created_by
FROM public.gidouilles_activity ga
WHERE re.source_table = 'gidouilles_activity'
  AND re.source_id = ga.id
  AND re.class_id IS NULL
  AND ga.class_id IS NOT NULL;
