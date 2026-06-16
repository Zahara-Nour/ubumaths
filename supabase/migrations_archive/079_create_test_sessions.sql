-- Migration: Create test sessions tables
-- Description: Add tables to track test sessions (display, interactive, course) and answers

-- ===========================================================================
-- TABLE: test_sessions
-- ===========================================================================
-- Stores test sessions with mode, configuration, and results

CREATE TABLE IF NOT EXISTS public.test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('display', 'interactive', 'course')),
  categories jsonb NOT NULL,
  score numeric,
  total_questions integer NOT NULL,
  time_spent integer, -- Total time in seconds
  time_limit integer, -- Time limit for 'course' mode (in seconds)
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ===========================================================================
-- TABLE: test_answers
-- ===========================================================================
-- Stores individual answers for each question in a test session

CREATE TABLE IF NOT EXISTS public.test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id uuid NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  template_id uuid, -- Reference to question template (optional)
  question_instance jsonb NOT NULL, -- Full question instance for display
  user_answer jsonb, -- User's answer data
  is_correct boolean,
  time_spent integer, -- Time spent on this question (in seconds)
  attempts integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
-- Optimize queries by user and session

CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id
  ON public.test_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_test_sessions_created_at
  ON public.test_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_answers_session_id
  ON public.test_answers(test_session_id);

-- ===========================================================================
-- RLS (Row Level Security)
-- ===========================================================================
-- Enable RLS for both tables

ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;

-- Test sessions policies
-- Users can view their own test sessions
CREATE POLICY "Users can view own test sessions"
  ON public.test_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own test sessions
CREATE POLICY "Users can insert own test sessions"
  ON public.test_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own test sessions (for completing tests)
CREATE POLICY "Users can update own test sessions"
  ON public.test_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Test answers policies
-- Users can view answers from their own test sessions
CREATE POLICY "Users can view own test answers"
  ON public.test_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_sessions
      WHERE test_sessions.id = test_answers.test_session_id
      AND test_sessions.user_id = auth.uid()
    )
  );

-- Users can insert answers to their own test sessions
CREATE POLICY "Users can insert own test answers"
  ON public.test_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_sessions
      WHERE test_sessions.id = test_answers.test_session_id
      AND test_sessions.user_id = auth.uid()
    )
  );

-- ===========================================================================
-- COMMENTS
-- ===========================================================================

COMMENT ON TABLE public.test_sessions IS
  'Stores test/assessment sessions with mode (display, interactive, course) and results';

COMMENT ON TABLE public.test_answers IS
  'Stores individual question answers for each test session';

COMMENT ON COLUMN public.test_sessions.mode IS
  'Test mode: display (slideshow), interactive (quiz), course (all questions at once)';

COMMENT ON COLUMN public.test_sessions.categories IS
  'JSON array of CartItem objects (category, quantity, delay)';

COMMENT ON COLUMN public.test_sessions.score IS
  'Final score (0-10 scale)';

COMMENT ON COLUMN public.test_sessions.time_limit IS
  'Time limit in seconds (only for course mode)';

COMMENT ON COLUMN public.test_answers.question_instance IS
  'Full QuestionInstance object for displaying question and correction';
