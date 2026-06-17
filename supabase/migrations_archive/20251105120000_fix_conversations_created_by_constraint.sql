-- Migration: Fix conversations table created_by constraint conflict
-- Description: Change ON DELETE SET NULL to ON DELETE CASCADE to avoid check constraint violation
-- Created: 2025-11-04
--
-- Problem: The conversations table has a check constraint requiring created_by IS NOT NULL
-- for group chats, but the foreign key has ON DELETE SET NULL which creates a conflict
-- during cascading deletes (e.g., when deleting test profiles).
--
-- Solution: Change to ON DELETE CASCADE so that when a teacher is deleted, their
-- class conversations are also deleted (which is semantically correct - if the teacher
-- who created the class chat is deleted, the chat should also be deleted).

-- Drop the existing foreign key constraint
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_created_by_fkey;

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;  -- Changed from SET NULL to CASCADE

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT conversations_created_by_fkey ON public.conversations IS
'Foreign key to profiles. ON DELETE CASCADE ensures that when a teacher (creator) is deleted, their class conversations are also deleted. This prevents check constraint violations since group chats require created_by IS NOT NULL.';
