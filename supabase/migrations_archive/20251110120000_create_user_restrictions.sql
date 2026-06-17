-- =============================================
-- Moderation System Phase 1: User Restrictions
-- =============================================
-- Migration: Create user_restrictions table
-- Description: Track mute/timeout/ban restrictions at database level
--
-- Features:
-- - Conversation-scoped or global restrictions
-- - Expiring restrictions (timeouts)
-- - Permanent restrictions (bans)
-- - Audit trail via restricted_by field
-- - RLS policies for teacher-only access

-- =============================================
-- Create user_restrictions table
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User being restricted
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Restriction scope
  scope_type TEXT NOT NULL CHECK (scope_type IN ('conversation', 'global')),
  scope_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE, -- conversation_id or NULL for global

  -- Restriction details
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('mute', 'timeout', 'ban')),
  reason TEXT NOT NULL CHECK (length(reason) >= 5),

  -- Audit trail
  restricted_by UUID NOT NULL REFERENCES public.profiles(id),

  -- Timing
  expires_at TIMESTAMPTZ, -- NULL = permanent
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Business logic constraints
  CONSTRAINT valid_scope CHECK (
    (scope_type = 'global' AND scope_id IS NULL) OR
    (scope_type = 'conversation' AND scope_id IS NOT NULL)
  ),

  -- Prevent duplicate active restrictions
  CONSTRAINT unique_active_restriction UNIQUE (user_id, scope_type, scope_id, restriction_type)
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Lookup restrictions by user
CREATE INDEX idx_user_restrictions_user_id
  ON public.user_restrictions(user_id);

-- Lookup restrictions by scope (conversation or global)
CREATE INDEX idx_user_restrictions_scope
  ON public.user_restrictions(scope_type, scope_id);

-- Fast query for active (non-expired) restrictions
-- Composite index supports: WHERE user_id = ? AND (expires_at IS NULL OR expires_at > now())
-- Note: Cannot use partial index with now() as it's STABLE, not IMMUTABLE
CREATE INDEX idx_user_restrictions_active
  ON public.user_restrictions(user_id, expires_at);

-- Lookup by moderator (for audit trail)
CREATE INDEX idx_user_restrictions_moderator
  ON public.user_restrictions(restricted_by, created_at DESC);

-- =============================================
-- Enable Row Level Security
-- =============================================

ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Teachers and admins can view all restrictions
CREATE POLICY "Teachers can view restrictions"
  ON public.user_restrictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Only teachers/admins can create restrictions
-- Ensures restricted_by matches the current user
CREATE POLICY "Teachers can create restrictions"
  ON public.user_restrictions FOR INSERT
  WITH CHECK (
    auth.uid() = restricted_by
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Only teachers/admins can delete restrictions (unrestrict users)
CREATE POLICY "Teachers can delete restrictions"
  ON public.user_restrictions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Teachers/admins can update restrictions (e.g., extend timeout, update reason)
-- Prevents changing user_id or restricted_by (immutable audit fields)
CREATE POLICY "Teachers can update restrictions"
  ON public.user_restrictions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    user_id = (SELECT user_id FROM public.user_restrictions WHERE id = user_restrictions.id)
    AND restricted_by = (SELECT restricted_by FROM public.user_restrictions WHERE id = user_restrictions.id)
  );

-- =============================================
-- Trigger: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_user_restrictions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_user_restrictions_updated_at
  BEFORE UPDATE ON public.user_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_restrictions_updated_at();

-- =============================================
-- Helper Function: Check if user is restricted
-- =============================================

CREATE OR REPLACE FUNCTION is_user_restricted(
  p_user_id UUID,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_restriction BOOLEAN;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be NULL';
  END IF;

  -- Check for active restrictions (global or conversation-specific)
  SELECT EXISTS (
    SELECT 1
    FROM user_restrictions ur
    WHERE ur.user_id = p_user_id
    AND (
      -- Global restriction
      (ur.scope_type = 'global' AND ur.scope_id IS NULL)
      OR
      -- Conversation-specific restriction
      (ur.scope_type = 'conversation' AND ur.scope_id = p_conversation_id)
    )
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ) INTO v_has_restriction;

  RETURN v_has_restriction;
END;
$$;

GRANT EXECUTE ON FUNCTION is_user_restricted TO authenticated;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE public.user_restrictions IS 'Track mute/timeout/ban restrictions at database level';
COMMENT ON COLUMN public.user_restrictions.scope_type IS 'Either ''conversation'' (scoped to specific chat) or ''global'' (all conversations)';
COMMENT ON COLUMN public.user_restrictions.scope_id IS 'conversation_id if scope_type=conversation, NULL if scope_type=global';
COMMENT ON COLUMN public.user_restrictions.restriction_type IS 'Type of restriction: mute (no messages), timeout (temporary), ban (permanent)';
COMMENT ON COLUMN public.user_restrictions.expires_at IS 'NULL for permanent restrictions, timestamp for temporary restrictions';
COMMENT ON FUNCTION is_user_restricted IS 'Check if user has active restriction (global or conversation-specific)';

-- =============================================
-- Success Message
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ User restrictions table created successfully!';
  RAISE NOTICE 'Features: conversation/global scope, expiring restrictions, teacher-only access';
  RAISE NOTICE 'Next: Create moderation_logs table and update RLS policies';
END $$;
