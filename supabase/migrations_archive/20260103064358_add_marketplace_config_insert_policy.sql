-- Add INSERT policy for teachers to create marketplace_config for their classes
-- Previously only UPDATE was allowed, blocking initial config creation

CREATE POLICY "marketplace_config_insert_teacher_class" ON public.marketplace_config
    FOR INSERT TO authenticated
    WITH CHECK (
        class_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = class_id
            AND c.teacher_id = auth.uid()
        )
    );

COMMENT ON POLICY "marketplace_config_insert_teacher_class" ON public.marketplace_config IS
    'Teachers can create marketplace config for their own classes';
