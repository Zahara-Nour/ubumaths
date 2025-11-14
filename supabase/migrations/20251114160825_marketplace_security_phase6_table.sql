-- =====================================================================
-- MARKETPLACE SECURITY PHASE 6 - TABLE CREATION
-- =====================================================================
-- Creates marketplace_listing_views table for unique view tracking
-- This prevents DoS attacks via view count inflation
-- Generated: 2025-11-14
-- =====================================================================

-- Create marketplace_listing_views table
CREATE TABLE IF NOT EXISTS public.marketplace_listing_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure one view record per user per listing
    CONSTRAINT unique_view_per_user_listing UNIQUE(listing_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_listing_views_listing_id
    ON public.marketplace_listing_views(listing_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_listing_views_viewed_at
    ON public.marketplace_listing_views(viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_listing_views_user
    ON public.marketplace_listing_views(user_id);

-- Enable RLS
ALTER TABLE public.marketplace_listing_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can record their own views" ON public.marketplace_listing_views
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view all listing views" ON public.marketplace_listing_views
    FOR SELECT TO authenticated
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.marketplace_listing_views TO authenticated;

-- Add comment
COMMENT ON TABLE public.marketplace_listing_views IS 'Tracks unique views per user per listing to prevent view count inflation attacks';
