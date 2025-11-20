-- =====================================================================
-- Universal Achievements System
-- =====================================================================
-- This migration creates a flexible, context-aware achievement system
-- that can handle achievements across all UbuMaths features (minesweeper,
-- questions, assessments, SRS, riddles, social interactions, etc.)
-- =====================================================================

-- =====================================================================
-- 1. HELPER FUNCTIONS
-- =====================================================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 2. ACHIEVEMENTS TABLE (Universal Achievement Definitions)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,  -- Slug identifier (e.g., 'minesweeper_first_victory', 'questions_perfect_streak')

  -- Context and categorization
  context TEXT NOT NULL CHECK (context IN (
    'minesweeper', 'questions', 'assessments', 'srs', 'riddles', 'social', 'meta', 'system'
  )),
  category TEXT CHECK (category IN (
    'speed', 'accuracy', 'streak', 'mastery', 'exploration', 'social',
    'collection', 'milestone', 'special', 'seasonal'
  )),

  -- Display information (French)
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,  -- Emoji or icon identifier

  -- Unlock configuration
  unlock_type TEXT NOT NULL CHECK (unlock_type IN ('automatic', 'event_based', 'progressive', 'manual')),

  -- Flexible metadata (JSONB) - see comments for structure
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  /*
  Example metadata structures:

  For Minesweeper:
  {
    "difficulty_specific": true,          -- Different achievement per difficulty
    "repeatable": false,                   -- Can only be earned once
    "hidden": false,                       -- Show in locked achievements list
    "show_progress": false,                -- Show progress bar before unlock
    "points": 10,                          -- XP points awarded
    "gidouilles_reward": 5,               -- Gidouilles awarded
    "rarity": "common",                    -- common, uncommon, rare, epic, legendary
    "unlock_conditions": {
      "type": "minesweeper_win",
      "params": {
        "min_score": 100,
        "max_time": 60,
        "perfect": true
      }
    }
  }

  For Questions/Assessments:
  {
    "subject_specific": true,              -- Different achievement per subject
    "tiers": {                            -- Progressive tiers
      "bronze": 10,
      "silver": 25,
      "gold": 50,
      "platinum": 100
    },
    "prerequisites": ["questions_first_answer"],
    "show_progress": true,
    "unlock_conditions": {
      "type": "questions_answered",
      "params": {
        "count": 100,
        "accuracy": 0.95
      }
    }
  }

  For Social:
  {
    "repeatable": true,
    "max_repetitions": 5,                 -- Can earn up to 5 times
    "cooldown_hours": 24,                 -- Must wait 24h between unlocks
    "unlock_conditions": {
      "type": "friend_added",
      "params": {
        "count": 1
      }
    }
  }
  */

  -- Status flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add helpful comments
COMMENT ON TABLE public.achievements IS 'Universal achievement definitions across all UbuMaths features';
COMMENT ON COLUMN public.achievements.id IS 'Slug identifier, e.g., minesweeper_first_victory';
COMMENT ON COLUMN public.achievements.context IS 'Feature context: minesweeper, questions, assessments, etc.';
COMMENT ON COLUMN public.achievements.unlock_type IS 'How achievement is unlocked: automatic (event-driven), progressive (progress-based), manual (teacher-awarded)';
COMMENT ON COLUMN public.achievements.metadata IS 'Flexible JSON configuration for unlock conditions, rewards, tiers, etc.';

-- =====================================================================
-- 3. STUDENT ACHIEVEMENTS TABLE (Unlocked Achievements)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core references
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,

  -- Context-specific data (for achievements that vary by context)
  context_data JSONB DEFAULT '{}'::jsonb,
  /*
  Examples:
  {
    "difficulty": "expert",        -- For difficulty-specific achievements
    "subject": "calculus",         -- For subject-specific achievements
    "tier": "gold",               -- For tiered achievements
    "iteration": 1,               -- For repeatable achievements
    "reference_type": "minesweeper_game",  -- Link to source
    "reference_id": "uuid-here"            -- ID of source record
  }
  */

  -- Unlock information
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlocked_by UUID REFERENCES public.profiles(id),  -- NULL = system, UUID = teacher manual award
  unlock_reason TEXT,  -- Optional description of how it was unlocked

  -- Rewards granted (denormalized for performance)
  points_awarded INTEGER NOT NULL DEFAULT 0,
  gidouilles_awarded INTEGER NOT NULL DEFAULT 0,

  -- Ensure uniqueness considering context variations
  CONSTRAINT unique_student_achievement UNIQUE NULLS NOT DISTINCT (
    student_id,
    achievement_id,
    (context_data->>'difficulty'),
    (context_data->>'subject'),
    (context_data->>'tier'),
    (context_data->>'iteration')
  )
);

COMMENT ON TABLE public.student_achievements IS 'Records of achievements unlocked by students';
COMMENT ON COLUMN public.student_achievements.context_data IS 'Context-specific data for achievements that vary by difficulty, subject, tier, etc.';
COMMENT ON COLUMN public.student_achievements.unlocked_by IS 'NULL for system-unlocked, UUID for teacher-awarded';

-- =====================================================================
-- 4. ACHIEVEMENT PROGRESS TABLE (For Progressive Achievements)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,

  -- Progress tracking
  current_value NUMERIC NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  target_value NUMERIC NOT NULL CHECK (target_value > 0),
  progress_percentage INTEGER GENERATED ALWAYS AS (
    LEAST(100, GREATEST(0, ROUND((current_value / NULLIF(target_value, 0)) * 100)))
  ) STORED,

  -- Context for multi-instance progress (e.g., per subject, per difficulty)
  context_key TEXT,  -- e.g., 'calculus', 'beginner', null for global

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,  -- Set when progress reaches 100%

  CONSTRAINT unique_achievement_progress UNIQUE (student_id, achievement_id, context_key)
);

COMMENT ON TABLE public.achievement_progress IS 'Tracks progress towards progressive achievements';
COMMENT ON COLUMN public.achievement_progress.context_key IS 'Optional context for subject/difficulty-specific progress';
COMMENT ON COLUMN public.achievement_progress.progress_percentage IS 'Auto-calculated percentage (0-100)';

-- =====================================================================
-- 5. ACHIEVEMENT EVENTS TABLE (Event Log for Processing)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.achievement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event information
  event_type TEXT NOT NULL,  -- e.g., 'minesweeper_game_completed', 'question_answered', 'friend_added'
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  /*
  Example event_data:
  {
    "game_id": "uuid",
    "difficulty": "expert",
    "score": 150,
    "time_seconds": 45,
    "perfect": true
  }
  */

  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Processing status
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,  -- Store error if processing failed

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.achievement_events IS 'Event log for achievement processing';
COMMENT ON COLUMN public.achievement_events.processed IS 'Whether this event has been processed for achievements';

-- =====================================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================================

-- Achievements table indexes
CREATE INDEX idx_achievements_context ON public.achievements(context) WHERE is_active = true;
CREATE INDEX idx_achievements_category ON public.achievements(category) WHERE is_active = true;
CREATE INDEX idx_achievements_display_order ON public.achievements(display_order) WHERE is_active = true;
CREATE INDEX idx_achievements_metadata_gin ON public.achievements USING GIN (metadata);

-- Student achievements indexes
CREATE INDEX idx_student_achievements_student ON public.student_achievements(student_id);
CREATE INDEX idx_student_achievements_achievement ON public.student_achievements(achievement_id);
CREATE INDEX idx_student_achievements_unlocked ON public.student_achievements(student_id, unlocked_at DESC);
CREATE INDEX idx_student_achievements_context_gin ON public.student_achievements USING GIN (context_data);

-- Achievement progress indexes
CREATE INDEX idx_achievement_progress_student ON public.achievement_progress(student_id) WHERE is_active = true;
CREATE INDEX idx_achievement_progress_achievement ON public.achievement_progress(achievement_id) WHERE is_active = true;
CREATE INDEX idx_achievement_progress_updated ON public.achievement_progress(updated_at DESC) WHERE is_active = true;
CREATE INDEX idx_achievement_progress_incomplete ON public.achievement_progress(student_id, achievement_id)
  WHERE is_active = true AND progress_percentage < 100;

-- Achievement events indexes
CREATE INDEX idx_achievement_events_unprocessed ON public.achievement_events(created_at)
  WHERE processed = false;
CREATE INDEX idx_achievement_events_student ON public.achievement_events(student_id, event_type);
CREATE INDEX idx_achievement_events_type ON public.achievement_events(event_type, created_at DESC);

-- =====================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_events ENABLE ROW LEVEL SECURITY;

-- Achievements table policies (all users can view)
CREATE POLICY "Anyone can view active achievements"
  ON public.achievements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage achievements"
  ON public.achievements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Student achievements policies
CREATE POLICY "Students can view their own achievements"
  ON public.student_achievements FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view their students achievements"
  ON public.student_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON cm.class_id = c.id
      WHERE cm.student_id = student_achievements.student_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "System can insert student achievements"
  ON public.student_achievements FOR INSERT
  WITH CHECK (false);  -- Only via SECURITY DEFINER functions

-- Achievement progress policies
CREATE POLICY "Students can view their own progress"
  ON public.achievement_progress FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view their students progress"
  ON public.achievement_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON cm.class_id = c.id
      WHERE cm.student_id = achievement_progress.student_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "System can manage achievement progress"
  ON public.achievement_progress FOR INSERT
  WITH CHECK (false);  -- Only via SECURITY DEFINER functions

-- Achievement events policies (restricted to system functions)
CREATE POLICY "System can manage achievement events"
  ON public.achievement_events FOR ALL
  WITH CHECK (false);  -- Only via SECURITY DEFINER functions

-- =====================================================================
-- 8. SQL FUNCTIONS
-- =====================================================================

-- Function to check if student has prerequisites for an achievement
CREATE OR REPLACE FUNCTION public.check_achievement_prerequisites(
  p_student_id UUID,
  p_achievement_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prerequisites TEXT[];
  v_prerequisite TEXT;
BEGIN
  -- Get prerequisites from achievement metadata
  SELECT (metadata->>'prerequisites')::TEXT[]
  INTO v_prerequisites
  FROM achievements
  WHERE id = p_achievement_id;

  -- If no prerequisites, return true
  IF v_prerequisites IS NULL OR array_length(v_prerequisites, 1) IS NULL THEN
    RETURN true;
  END IF;

  -- Check each prerequisite
  FOREACH v_prerequisite IN ARRAY v_prerequisites
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM student_achievements
      WHERE student_id = p_student_id
      AND achievement_id = v_prerequisite
    ) THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- Function to update achievement progress
CREATE OR REPLACE FUNCTION public.update_achievement_progress(
  p_student_id UUID,
  p_achievement_id TEXT,
  p_delta NUMERIC,
  p_context_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress_record RECORD;
  v_achievement RECORD;
  v_newly_unlocked BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- Get achievement details
  SELECT * INTO v_achievement
  FROM achievements
  WHERE id = p_achievement_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Achievement not found');
  END IF;

  -- Check if this is a progressive achievement
  IF v_achievement.unlock_type != 'progressive' THEN
    RETURN jsonb_build_object('error', 'Not a progressive achievement');
  END IF;

  -- Get or create progress record
  INSERT INTO achievement_progress (
    student_id,
    achievement_id,
    context_key,
    current_value,
    target_value
  )
  VALUES (
    p_student_id,
    p_achievement_id,
    p_context_key,
    p_delta,
    COALESCE(
      (v_achievement.metadata->'unlock_conditions'->'params'->>'target')::NUMERIC,
      100  -- Default target
    )
  )
  ON CONFLICT (student_id, achievement_id, context_key)
  DO UPDATE SET
    current_value = achievement_progress.current_value + p_delta,
    updated_at = NOW()
  RETURNING * INTO v_progress_record;

  -- Check if achievement is now complete
  IF v_progress_record.progress_percentage >= 100 AND v_progress_record.completed_at IS NULL THEN
    -- Mark as completed
    UPDATE achievement_progress
    SET completed_at = NOW(), is_active = false
    WHERE id = v_progress_record.id;

    -- Check prerequisites
    IF check_achievement_prerequisites(p_student_id, p_achievement_id) THEN
      -- Award the achievement
      INSERT INTO student_achievements (
        student_id,
        achievement_id,
        context_data,
        points_awarded,
        gidouilles_awarded,
        unlock_reason
      )
      VALUES (
        p_student_id,
        p_achievement_id,
        CASE
          WHEN p_context_key IS NOT NULL
          THEN jsonb_build_object('context_key', p_context_key)
          ELSE '{}'::jsonb
        END,
        COALESCE((v_achievement.metadata->>'points')::INTEGER, 0),
        COALESCE((v_achievement.metadata->>'gidouilles_reward')::INTEGER, 0),
        'Progressive completion'
      )
      ON CONFLICT DO NOTHING;

      v_newly_unlocked := true;
    END IF;
  END IF;

  -- Return result
  v_result := jsonb_build_object(
    'current_value', v_progress_record.current_value,
    'target_value', v_progress_record.target_value,
    'progress_percentage', v_progress_record.progress_percentage,
    'completed', v_progress_record.progress_percentage >= 100,
    'newly_unlocked', v_newly_unlocked
  );

  RETURN v_result;
END;
$$;

-- Main function to process achievement events
CREATE OR REPLACE FUNCTION public.process_achievement_event(
  p_event_type TEXT,
  p_student_id UUID,
  p_event_data JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_achievement RECORD;
  v_unlocked_achievements JSONB[] := ARRAY[]::JSONB[];
  v_unlock_conditions JSONB;
  v_context_data JSONB;
  v_should_unlock BOOLEAN;
  v_points INTEGER;
  v_gidouilles INTEGER;
BEGIN
  -- Insert event into log
  INSERT INTO achievement_events (event_type, event_data, student_id)
  VALUES (p_event_type, p_event_data, p_student_id)
  RETURNING id INTO v_event_id;

  -- Find achievements that might be triggered by this event
  FOR v_achievement IN
    SELECT *
    FROM achievements
    WHERE is_active = true
    AND unlock_type IN ('automatic', 'event_based')
    AND (
      -- Match by event type in unlock conditions
      metadata->'unlock_conditions'->>'type' = p_event_type
      OR
      -- Match by context
      context = split_part(p_event_type, '_', 1)
    )
    ORDER BY display_order
  LOOP
    v_unlock_conditions := v_achievement.metadata->'unlock_conditions';
    v_should_unlock := false;
    v_context_data := '{}'::jsonb;

    -- Check if prerequisites are met
    IF NOT check_achievement_prerequisites(p_student_id, v_achievement.id) THEN
      CONTINUE;
    END IF;

    -- Evaluate unlock conditions based on event type
    CASE
      -- Minesweeper achievements
      WHEN p_event_type = 'minesweeper_game_completed' THEN
        -- Check difficulty-specific achievements
        IF v_achievement.metadata->>'difficulty_specific' = 'true' THEN
          v_context_data := jsonb_build_object('difficulty', p_event_data->>'difficulty');
        END IF;

        -- Check unlock parameters
        v_should_unlock := true;

        -- Check min_score requirement
        IF v_unlock_conditions->'params'->>'min_score' IS NOT NULL THEN
          v_should_unlock := v_should_unlock AND
            (p_event_data->>'score')::INTEGER >= (v_unlock_conditions->'params'->>'min_score')::INTEGER;
        END IF;

        -- Check max_time requirement
        IF v_unlock_conditions->'params'->>'max_time' IS NOT NULL THEN
          v_should_unlock := v_should_unlock AND
            (p_event_data->>'time_seconds')::INTEGER <= (v_unlock_conditions->'params'->>'max_time')::INTEGER;
        END IF;

        -- Check perfect requirement
        IF v_unlock_conditions->'params'->>'perfect' = 'true' THEN
          v_should_unlock := v_should_unlock AND
            p_event_data->>'perfect' = 'true';
        END IF;

      -- Questions/Assessments achievements
      WHEN p_event_type IN ('question_answered', 'assessment_completed') THEN
        -- Check subject-specific achievements
        IF v_achievement.metadata->>'subject_specific' = 'true' THEN
          v_context_data := jsonb_build_object('subject', p_event_data->>'subject');
        END IF;

        -- For progressive achievements, update progress instead
        IF v_achievement.unlock_type = 'progressive' THEN
          PERFORM update_achievement_progress(
            p_student_id,
            v_achievement.id,
            1,  -- Increment by 1
            p_event_data->>'subject'
          );
          CONTINUE;  -- Skip direct unlock
        END IF;

        -- Check accuracy requirement
        IF v_unlock_conditions->'params'->>'min_accuracy' IS NOT NULL THEN
          v_should_unlock :=
            (p_event_data->>'accuracy')::NUMERIC >= (v_unlock_conditions->'params'->>'min_accuracy')::NUMERIC;
        END IF;

      -- Social achievements
      WHEN p_event_type = 'friend_added' THEN
        v_should_unlock := true;

        -- Check if repeatable
        IF v_achievement.metadata->>'repeatable' = 'true' THEN
          -- Count current iterations
          DECLARE
            v_current_iterations INTEGER;
            v_max_repetitions INTEGER;
          BEGIN
            SELECT COUNT(*) INTO v_current_iterations
            FROM student_achievements
            WHERE student_id = p_student_id
            AND achievement_id = v_achievement.id;

            v_max_repetitions := COALESCE((v_achievement.metadata->>'max_repetitions')::INTEGER, 999);

            IF v_current_iterations >= v_max_repetitions THEN
              v_should_unlock := false;
            ELSE
              v_context_data := jsonb_build_object('iteration', v_current_iterations + 1);
            END IF;
          END;
        END IF;

      ELSE
        -- Generic event processing
        v_should_unlock := v_unlock_conditions->>'type' = p_event_type;
    END CASE;

    -- If should unlock, award the achievement
    IF v_should_unlock THEN
      -- Check if already unlocked (considering context)
      IF NOT EXISTS (
        SELECT 1 FROM student_achievements
        WHERE student_id = p_student_id
        AND achievement_id = v_achievement.id
        AND (
          context_data = v_context_data
          OR (context_data IS NULL AND v_context_data = '{}'::jsonb)
        )
      ) THEN
        -- Calculate rewards
        v_points := COALESCE((v_achievement.metadata->>'points')::INTEGER, 0);
        v_gidouilles := COALESCE((v_achievement.metadata->>'gidouilles_reward')::INTEGER, 0);

        -- Award achievement
        INSERT INTO student_achievements (
          student_id,
          achievement_id,
          context_data,
          points_awarded,
          gidouilles_awarded,
          unlock_reason
        )
        VALUES (
          p_student_id,
          v_achievement.id,
          v_context_data || jsonb_build_object(
            'reference_type', p_event_type,
            'reference_id', p_event_data->>'reference_id'
          ),
          v_points,
          v_gidouilles,
          format('Event: %s', p_event_type)
        );

        -- Add to unlocked list
        v_unlocked_achievements := array_append(
          v_unlocked_achievements,
          jsonb_build_object(
            'achievement_id', v_achievement.id,
            'name', v_achievement.name,
            'description', v_achievement.description,
            'icon', v_achievement.icon,
            'points', v_points,
            'gidouilles', v_gidouilles,
            'context_data', v_context_data
          )
        );
      END IF;
    END IF;
  END LOOP;

  -- Mark event as processed
  UPDATE achievement_events
  SET
    processed = true,
    processed_at = NOW()
  WHERE id = v_event_id;

  -- Return newly unlocked achievements
  RETURN jsonb_build_object(
    'event_id', v_event_id,
    'unlocked_achievements', to_jsonb(v_unlocked_achievements),
    'count', array_length(v_unlocked_achievements, 1)
  );
END;
$$;

-- Function for teachers to manually award achievements
CREATE OR REPLACE FUNCTION public.award_achievement_manual(
  p_teacher_id UUID,
  p_student_id UUID,
  p_achievement_id TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_is_teacher BOOLEAN;
BEGIN
  -- Verify teacher has access to this student
  SELECT EXISTS (
    SELECT 1 FROM class_members cm
    JOIN classes c ON cm.class_id = c.id
    WHERE cm.student_id = p_student_id
    AND c.teacher_id = p_teacher_id
  ) INTO v_is_teacher;

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Teacher does not have access to this student';
  END IF;

  -- Get achievement
  SELECT * INTO v_achievement
  FROM achievements
  WHERE id = p_achievement_id
  AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not found';
  END IF;

  -- Check if achievement allows manual awarding
  IF v_achievement.unlock_type NOT IN ('manual', 'event_based') THEN
    RAISE EXCEPTION 'This achievement cannot be manually awarded';
  END IF;

  -- Award the achievement
  INSERT INTO student_achievements (
    student_id,
    achievement_id,
    unlocked_by,
    unlock_reason,
    points_awarded,
    gidouilles_awarded
  )
  VALUES (
    p_student_id,
    p_achievement_id,
    p_teacher_id,
    COALESCE(p_reason, 'Manually awarded by teacher'),
    COALESCE((v_achievement.metadata->>'points')::INTEGER, 0),
    COALESCE((v_achievement.metadata->>'gidouilles_reward')::INTEGER, 0)
  )
  ON CONFLICT DO NOTHING;

  RETURN FOUND;
END;
$$;

-- =====================================================================
-- 9. TRIGGERS
-- =====================================================================

-- Update updated_at timestamp on achievements table
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on achievement_progress table
CREATE TRIGGER update_achievement_progress_updated_at
  BEFORE UPDATE ON public.achievement_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 10. SAMPLE ACHIEVEMENT DEFINITIONS
-- =====================================================================

-- Insert some initial achievements as examples
INSERT INTO public.achievements (id, context, category, name, description, icon, unlock_type, metadata, display_order)
VALUES
  -- Minesweeper achievements
  ('minesweeper_first_win', 'minesweeper', 'milestone', 'Première Victoire', 'Gagnez votre première partie de démineur', '🏆', 'automatic',
   '{"points": 10, "gidouilles_reward": 5, "rarity": "common", "unlock_conditions": {"type": "minesweeper_game_completed", "params": {"won": true}}}'::jsonb, 1),

  ('minesweeper_speed_demon', 'minesweeper', 'speed', 'Rapide comme l''éclair', 'Terminez une partie expert en moins de 90 secondes', '⚡', 'automatic',
   '{"points": 50, "gidouilles_reward": 20, "rarity": "epic", "difficulty_specific": true, "unlock_conditions": {"type": "minesweeper_game_completed", "params": {"max_time": 90, "difficulty": "expert"}}}'::jsonb, 2),

  ('minesweeper_perfect_beginner', 'minesweeper', 'accuracy', 'Débutant Parfait', 'Terminez une partie débutant sans erreur', '✨', 'automatic',
   '{"points": 15, "gidouilles_reward": 8, "rarity": "uncommon", "difficulty_specific": true, "unlock_conditions": {"type": "minesweeper_game_completed", "params": {"perfect": true, "difficulty": "beginner"}}}'::jsonb, 3),

  -- Questions achievements
  ('questions_first_answer', 'questions', 'milestone', 'Première Réponse', 'Répondez à votre première question', '📝', 'automatic',
   '{"points": 5, "gidouilles_reward": 2, "rarity": "common", "unlock_conditions": {"type": "question_answered", "params": {}}}'::jsonb, 10),

  ('questions_streak_10', 'questions', 'streak', 'En Série!', 'Répondez correctement à 10 questions d''affilée', '🔥', 'progressive',
   '{"points": 25, "gidouilles_reward": 10, "rarity": "uncommon", "show_progress": true, "unlock_conditions": {"type": "questions_streak", "params": {"target": 10}}}'::jsonb, 11),

  ('questions_master_calculus', 'questions', 'mastery', 'Maître du Calcul', 'Atteignez 95% de bonnes réponses en calcul (min 50 questions)', '🎓', 'progressive',
   '{"points": 100, "gidouilles_reward": 50, "rarity": "legendary", "subject_specific": true, "show_progress": true, "unlock_conditions": {"type": "questions_answered", "params": {"target": 50, "min_accuracy": 0.95, "subject": "calculus"}}}'::jsonb, 12),

  -- Social achievements
  ('social_first_friend', 'social', 'social', 'Premier Ami', 'Ajoutez votre premier ami', '👥', 'automatic',
   '{"points": 10, "gidouilles_reward": 5, "rarity": "common", "unlock_conditions": {"type": "friend_added", "params": {}}}'::jsonb, 20),

  ('social_popular', 'social', 'social', 'Populaire', 'Ayez 10 amis', '🌟', 'progressive',
   '{"points": 30, "gidouilles_reward": 15, "rarity": "rare", "show_progress": true, "unlock_conditions": {"type": "friends_count", "params": {"target": 10}}}'::jsonb, 21),

  -- Meta achievements
  ('meta_achievement_hunter', 'meta', 'collection', 'Chasseur de Succès', 'Débloquez 25 succès', '🏅', 'progressive',
   '{"points": 50, "gidouilles_reward": 25, "rarity": "epic", "show_progress": true, "unlock_conditions": {"type": "achievements_unlocked", "params": {"target": 25}}}'::jsonb, 30)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 11. GRANTS (Ensure proper permissions)
-- =====================================================================

-- Grant usage on all tables to authenticated users (RLS will control access)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT ON public.student_achievements TO authenticated;
GRANT SELECT ON public.achievement_progress TO authenticated;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.process_achievement_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_achievement_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_achievement_prerequisites TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_achievement_manual TO authenticated;

-- =====================================================================
-- 12. COMMENTS AND DOCUMENTATION
-- =====================================================================

COMMENT ON SCHEMA public IS 'UbuMaths Universal Achievement System - Flexible, context-aware achievement tracking';

COMMENT ON FUNCTION public.process_achievement_event IS 'Main entry point for achievement processing. Call this when any achievement-worthy event occurs.';
COMMENT ON FUNCTION public.update_achievement_progress IS 'Update progress for progressive achievements. Automatically unlocks when target is reached.';
COMMENT ON FUNCTION public.check_achievement_prerequisites IS 'Verify if a student has met all prerequisites for an achievement.';
COMMENT ON FUNCTION public.award_achievement_manual IS 'Allow teachers to manually award achievements to their students.';

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================