-- ============================================================================
-- RPC: Reorder worksheet sections atomically
-- ============================================================================
-- This function updates section positions in a single transaction,
-- avoiding unique constraint conflicts on (worksheet_id, position)

CREATE OR REPLACE FUNCTION reorder_worksheet_sections(
  p_worksheet_id UUID,
  p_sections JSONB  -- Array of {id: uuid, new_position: int}
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
    RAISE EXCEPTION 'Can only reorder sections in draft worksheets';
  END IF;

  -- Use a temporary high offset to avoid unique constraint conflicts
  -- First pass: move all to temporary positions
  UPDATE worksheet_sections ws
  SET position = ws.position + 10000
  FROM jsonb_to_recordset(p_sections) AS x(id UUID, new_position INTEGER)
  WHERE ws.id = x.id
  AND ws.worksheet_id = p_worksheet_id;

  -- Second pass: set final positions
  UPDATE worksheet_sections ws
  SET position = x.new_position
  FROM jsonb_to_recordset(p_sections) AS x(id UUID, new_position INTEGER)
  WHERE ws.id = x.id
  AND ws.worksheet_id = p_worksheet_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reorder_worksheet_sections(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION reorder_worksheet_sections IS 'Atomically reorder worksheet sections, avoiding unique constraint conflicts';
