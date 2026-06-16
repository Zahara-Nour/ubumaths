-- ============================================================================
-- Fix: Disambiguate column references in reorder_worksheet_exercises
-- ============================================================================

CREATE OR REPLACE FUNCTION reorder_worksheet_exercises(
  p_worksheet_id UUID,
  p_exercises JSONB  -- Array of {id: uuid, new_position: int, new_section_id: uuid|null}
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_user_id UUID;
  v_is_authorized BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Check authorization: user must be worksheet owner or admin
  SELECT EXISTS (
    SELECT 1 FROM worksheets w
    LEFT JOIN profiles p ON p.id = v_user_id
    WHERE w.id = p_worksheet_id
    AND (w.created_by = v_user_id OR p.role = 'admin')
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to modify this worksheet';
  END IF;

  -- Check worksheet is in draft status
  IF NOT EXISTS (
    SELECT 1 FROM worksheets
    WHERE id = p_worksheet_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Can only reorder exercises in draft worksheets';
  END IF;

  -- Use a temporary high offset to avoid unique constraint conflicts
  -- First pass: move all to temporary positions
  UPDATE worksheet_exercises we
  SET position = we.position + 10000
  FROM jsonb_to_recordset(p_exercises) AS x(id UUID, new_position INTEGER, new_section_id UUID)
  WHERE we.id = x.id
  AND we.worksheet_id = p_worksheet_id;

  -- Second pass: set final positions and section_ids
  UPDATE worksheet_exercises we
  SET
    position = x.new_position,
    section_id = x.new_section_id
  FROM jsonb_to_recordset(p_exercises) AS x(id UUID, new_position INTEGER, new_section_id UUID)
  WHERE we.id = x.id
  AND we.worksheet_id = p_worksheet_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$;
