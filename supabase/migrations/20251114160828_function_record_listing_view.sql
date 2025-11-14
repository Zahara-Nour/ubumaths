-- Record unique view per user per listing to prevent DoS via view count inflation

CREATE OR REPLACE FUNCTION public.record_listing_view(
  p_listing_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row_count INTEGER;
  v_is_new_view BOOLEAN;
  v_view_count INTEGER;
BEGIN
  -- Try to insert a new view record
  -- ON CONFLICT DO NOTHING means if the view already exists, nothing happens
  INSERT INTO marketplace_listing_views (listing_id, user_id, viewed_at)
  VALUES (p_listing_id, p_user_id, NOW())
  ON CONFLICT (listing_id, user_id)
  DO UPDATE SET viewed_at = NOW(); -- Update timestamp for repeat views

  -- Check if a row was inserted (new view) or updated (repeat view)
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  -- Note: With ON CONFLICT DO UPDATE, ROW_COUNT is always > 0
  -- We need a different approach to detect first-time views
  -- Check if this user has viewed this listing before (older than 1 second ago)
  v_is_new_view := NOT EXISTS (
    SELECT 1 FROM marketplace_listing_views
    WHERE listing_id = p_listing_id
      AND user_id = p_user_id
      AND viewed_at < NOW() - INTERVAL '1 second'
  );

  -- If it's a new view, increment the view count
  IF v_is_new_view THEN
    UPDATE marketplace_listings
    SET view_count = COALESCE(view_count, 0) + 1
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
    'view_count', COALESCE(v_view_count, 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
