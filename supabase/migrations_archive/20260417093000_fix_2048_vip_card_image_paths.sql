-- ============================================================================
-- Migration: Fix 2048 VIP card image_path values
-- Created: 2026-04-17
-- ============================================================================
-- The 2048 card migrations inserted placeholder relative paths like
-- '/images/vip-cards/2048-merge.webp'. Images were uploaded to Supabase
-- Storage but the image_path column was never updated to the full URL.
-- This migration updates all 2048 cards to use the correct Storage URLs.
-- ============================================================================

UPDATE public.vip_card_templates
SET image_path = 'https://aqtijumsgfufoztohdua.supabase.co/storage/v1/object/public/vip-card-images/' || id || '@0.5x.webp'
WHERE id IN (
  '2048-undo',
  '2048-bomb',
  '2048-bomb-2',
  '2048-bomb-3',
  '2048-freeze-spawn',
  '2048-merge',
  '2048-joker',
  '2048-vision',
  '2048-multiplier',
  '2048-multiplier-2'
)
AND image_path LIKE '/images/vip-cards/%';
