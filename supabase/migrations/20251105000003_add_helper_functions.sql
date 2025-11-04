-- Migration: Add helper functions for VIP card teacher overrides
-- Description: Utility functions for retrieving student-teacher relationships
-- Created: 2025-11-04

-- ============================================================================
-- HELPER FUNCTION: get_student_teachers
-- ============================================================================
-- Returns all teachers of a student with class context
-- Used for displaying which teachers have override permissions affecting a student

DROP FUNCTION IF EXISTS public.get_student_teachers(UUID);

CREATE OR REPLACE FUNCTION public.get_student_teachers(p_student_id UUID)
RETURNS TABLE (
  teacher_id UUID,
  teacher_name TEXT,
  class_id UUID,
  class_name TEXT
)
SECURITY DEFINER -- Run with elevated permissions to bypass RLS on classes
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    c.teacher_id,
    p.full_name as teacher_name,
    c.id as class_id,
    c.name as class_name
  FROM class_members cm
  INNER JOIN classes c ON c.id = cm.class_id
  INNER JOIN profiles p ON p.id = c.teacher_id
  WHERE cm.student_id = p_student_id
  ORDER BY p.full_name, c.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_student_teachers(UUID) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.get_student_teachers(UUID) IS
'Returns all teachers of a student with class context. Used for displaying which teachers have override permissions affecting a student. Security definer to bypass RLS on classes table.';

-- ============================================================================
-- HELPER FUNCTION: get_teacher_override_impact
-- ============================================================================
-- Returns the number of students affected by a teacher's override for a specific card
-- Useful for showing teachers the impact of their override decisions

DROP FUNCTION IF EXISTS public.get_teacher_override_impact(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_teacher_override_impact(
  p_teacher_id UUID,
  p_card_id TEXT
)
RETURNS TABLE (
  student_count BIGINT,
  class_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cm.student_id) as student_count,
    COUNT(DISTINCT c.id) as class_count
  FROM classes c
  INNER JOIN class_members cm ON cm.class_id = c.id
  WHERE c.teacher_id = p_teacher_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_teacher_override_impact(UUID, TEXT) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.get_teacher_override_impact(UUID, TEXT) IS
'Returns the number of students and classes affected by a teacher''s override for a specific VIP card. Helps teachers understand the impact of enabling/disabling cards.';

-- ============================================================================
-- HELPER FUNCTION: get_available_cards_for_student
-- ============================================================================
-- Returns all VIP cards available to a student after applying teacher overrides
-- Useful for debugging and showing students which cards they can potentially draw

DROP FUNCTION IF EXISTS public.get_available_cards_for_student(UUID);

CREATE OR REPLACE FUNCTION public.get_available_cards_for_student(p_student_id UUID)
RETURNS TABLE (
  card_id TEXT,
  card_name TEXT,
  rarity TEXT,
  is_globally_enabled BOOLEAN,
  blocked_by_teachers TEXT[] -- Array of teacher names who disabled this card
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vct.id as card_id,
    vct.name as card_name,
    vct.rarity,
    vct.is_enabled as is_globally_enabled,
    ARRAY_AGG(DISTINCT p.full_name) FILTER (WHERE tvo.is_enabled = FALSE) as blocked_by_teachers
  FROM vip_card_templates vct
  LEFT JOIN teacher_vip_card_overrides tvo ON tvo.card_id = vct.id
    AND tvo.teacher_id IN (
      SELECT DISTINCT c.teacher_id
      FROM class_members cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = p_student_id
    )
  LEFT JOIN profiles p ON p.id = tvo.teacher_id
  GROUP BY vct.id, vct.name, vct.rarity, vct.is_enabled
  ORDER BY
    CASE vct.rarity
      WHEN 'common' THEN 1
      WHEN 'rare' THEN 2
      WHEN 'epic' THEN 3
      WHEN 'legendary' THEN 4
    END,
    vct.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_available_cards_for_student(UUID) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.get_available_cards_for_student(UUID) IS
'Returns all VIP cards with their availability status for a specific student. Shows which cards are globally enabled and which teachers have disabled each card. Useful for debugging and transparency.';

-- ============================================================================
-- HELPER FUNCTION: get_teacher_overrides_summary
-- ============================================================================
-- Returns a summary of a teacher's overrides grouped by rarity
-- Useful for teacher dashboard showing override statistics

DROP FUNCTION IF EXISTS public.get_teacher_overrides_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_teacher_overrides_summary(p_teacher_id UUID)
RETURNS TABLE (
  rarity TEXT,
  total_cards BIGINT,
  enabled_count BIGINT,
  disabled_count BIGINT,
  no_override_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vct.rarity,
    COUNT(*) as total_cards,
    COUNT(*) FILTER (WHERE tvo.is_enabled = TRUE) as enabled_count,
    COUNT(*) FILTER (WHERE tvo.is_enabled = FALSE) as disabled_count,
    COUNT(*) FILTER (WHERE tvo.id IS NULL) as no_override_count
  FROM vip_card_templates vct
  LEFT JOIN teacher_vip_card_overrides tvo ON tvo.card_id = vct.id
    AND tvo.teacher_id = p_teacher_id
  GROUP BY vct.rarity
  ORDER BY
    CASE vct.rarity
      WHEN 'common' THEN 1
      WHEN 'rare' THEN 2
      WHEN 'epic' THEN 3
      WHEN 'legendary' THEN 4
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_teacher_overrides_summary(UUID) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.get_teacher_overrides_summary(UUID) IS
'Returns a summary of a teacher''s VIP card overrides grouped by rarity. Shows total cards, enabled overrides, disabled overrides, and cards with no override. Useful for teacher dashboard statistics.';
