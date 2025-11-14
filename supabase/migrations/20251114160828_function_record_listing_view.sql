-- =====================================================================
-- MARKETPLACE SECURITY PHASE 6 - FUNCTION 3/5: record_listing_view
-- =====================================================================
-- Record unique view per user per listing to prevent DoS via view count inflation
-- Deduplicates views to ensure accurate view statistics
-- Generated: 2025-11-14
-- =====================================================================

CREATE OR REPLACE FUNCTION public.record_listing_view(
  p_listing_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_new_view BOOLEAN;
  v_view_count INTEGER;
BEGIN
  -- Check if this is a new view by attempting to insert
  -- Use INSERT ... ON CONFLICT DO NOTHING and check if row was inserted
  INSERT INTO marketplace_listing_views (listing_id, user_id, viewed_at)
  VALUES (p_listing_id, p_user_id, NOW())
  ON CONFLICT (listing_id, user_id) DO UPDATE
    SET viewed_at = NOW(); -- Update timestamp for repeat views

  -- Check if this was a first-time view (not in the table before)
  -- by checking if INSERT happened or was a conflict
  GET DIAGNOSTICS v_is_new_view = (ROW_COUNT > 0);

  -- If it's a new view (first time), increment the view count
  IF v_is_new_view AND NOT EXISTS (
    SELECT 1 FROM marketplace_listing_views
    WHERE listing_id = p_listing_id AND user_id = p_user_id
    AND viewed_at < NOW() - INTERVAL '1 second'
  ) THEN
    UPDATE marketplace_listings
    SET view_count = view_count + 1
    WHERE id = p_listing_id
    RETURNING view_count INTO v_view_count;
  ELSE
    -- Get current view count without incrementing
    SELECT view_count INTO v_view_count
    FROM marketplace_listings
    WHERE id = p_listing_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'is_new_view', v_is_new_view,
    'view_count', v_view_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.record_listing_view IS 'Record unique view per user per listing to prevent DoS via view count inflation';

GRANT EXECUTE ON FUNCTION public.record_listing_view(UUID, UUID) TO authenticated;
