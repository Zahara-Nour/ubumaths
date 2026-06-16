-- =============================================
-- Moderation System: Allow Users to View Own Restrictions
-- =============================================
-- Migration: Add RLS policy for users to view their own restrictions
-- Description: Students need to see their own restrictions to display the RestrictedUserBanner
--
-- This policy allows users to view only their own restrictions,
-- while teachers/admins can view all restrictions via existing policy.

-- =============================================
-- Add Self-View Policy
-- =============================================

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Users can view own restrictions" ON public.user_restrictions;

-- Users can view their own restrictions
CREATE POLICY "Users can view own restrictions"
  ON public.user_restrictions FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- Comments
-- =============================================

COMMENT ON POLICY "Users can view own restrictions" ON public.user_restrictions IS
  'Allows users to view their own restrictions to display appropriate UI feedback';

-- =============================================
-- Success Message
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ User self-view restriction policy added successfully!';
  RAISE NOTICE 'Users can now query their own restrictions for UI display';
END $$;
