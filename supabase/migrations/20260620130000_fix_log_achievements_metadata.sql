-- Fix: log_achievements_to_events read metadata from the achievements catalog
-- =============================================================================
-- Bug prod : le trigger `log_achievements_to_events` (sur student_achievements)
-- référençait `NEW.metadata`, mais student_achievements n'a pas de colonne
-- `metadata`. Tout INSERT échouait (42703) → décerner un succès (manuel OU
-- automatique) était cassé en prod (table student_achievements vide).
-- Fix : lire la metadata depuis la table `achievements` (sa vraie source).

CREATE OR REPLACE FUNCTION "public"."log_achievements_to_events"()
  RETURNS "trigger"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
AS $function$
    DECLARE
        v_achievement_name TEXT;
        v_achievement_metadata JSONB;
        v_description TEXT;
        v_class_id UUID;
    BEGIN
        IF EXISTS (
            SELECT 1 FROM public.reward_events
            WHERE source_table = 'student_achievements'
            AND source_id = NEW.id
        ) THEN
            RETURN NEW;
        END IF;

        -- student_achievements has no `metadata` column: read it from the
        -- achievements catalog (the source of the achievement's metadata).
        SELECT name, metadata
        INTO v_achievement_name, v_achievement_metadata
        FROM public.achievements
        WHERE id = NEW.achievement_id;

        -- Get student's ACTIVE class
        SELECT class_id INTO v_class_id
        FROM public.class_members
        WHERE student_id = NEW.student_id
          AND status = 'active'
        ORDER BY joined_at DESC
        LIMIT 1;

        v_description := generate_reward_event_description(
            'achievement'::public.reward_type,
            'earned'::public.reward_event_type,
            NULL,
            v_achievement_name,
            v_achievement_metadata
        );

        INSERT INTO public.reward_events (
            student_id,
            reward_type,
            event_type,
            item_name,
            description,
            metadata,
            source_table,
            source_id,
            class_id,
            created_at
        ) VALUES (
            NEW.student_id,
            'achievement',
            'earned',
            v_achievement_name,
            v_description,
            COALESCE(v_achievement_metadata, '{}'::jsonb) || jsonb_build_object(
                'achievement_id', NEW.achievement_id
            ),
            'student_achievements',
            NEW.id,
            v_class_id,
            NEW.unlocked_at
        );

        RETURN NEW;
    END;
    $function$;
