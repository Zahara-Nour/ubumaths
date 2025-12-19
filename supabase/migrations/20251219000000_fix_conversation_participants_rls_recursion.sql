-- =============================================
-- Fix RLS Infinite Recursion in conversation_participants
-- =============================================
-- Migration: Fix for infinite recursion error
-- Problem: The policy "Users can view other participants in their conversations"
--          references conversation_participants within itself, causing infinite recursion.
--
-- Solution: Use a SECURITY DEFINER function to check participation without triggering RLS.

-- Step 1: Create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
$$;

-- Step 2: Drop both SELECT policies to consolidate into one
DROP POLICY IF EXISTS "Users can view their own participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view other participants in their conversations" ON conversation_participants;

-- Step 3: Create a single, clean SELECT policy
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants
  FOR SELECT
  USING (
    -- User is viewing their own record
    user_id = auth.uid()
    OR
    -- User is a participant in the same conversation (checked via function to avoid recursion)
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_conversation_participant TO authenticated;

-- Comment
COMMENT ON FUNCTION public.is_conversation_participant IS
  'Check if a user is a participant in a conversation. Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion.';
