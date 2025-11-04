-- Migration: Create VIP card images storage bucket
-- Description: Public storage bucket for VIP card images with admin-only upload permissions
-- Created: 2025-11-04

-- Create the storage bucket for VIP card images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vip-card-images',
  'vip-card-images',
  true, -- Public bucket (images are publicly accessible)
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Public can SELECT (view) images
DROP POLICY IF EXISTS "Public can view VIP card images"
  ON storage.objects;

CREATE POLICY "Public can view VIP card images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'vip-card-images'
  );

-- RLS Policy: Admins can INSERT (upload) images
DROP POLICY IF EXISTS "Admins can upload VIP card images"
  ON storage.objects;

CREATE POLICY "Admins can upload VIP card images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vip-card-images'
    AND public.is_admin()
  );

-- RLS Policy: Admins can DELETE images
DROP POLICY IF EXISTS "Admins can delete VIP card images"
  ON storage.objects;

CREATE POLICY "Admins can delete VIP card images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vip-card-images'
    AND public.is_admin()
  );

-- RLS Policy: Admins can UPDATE image metadata
DROP POLICY IF EXISTS "Admins can update VIP card images"
  ON storage.objects;

CREATE POLICY "Admins can update VIP card images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vip-card-images'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'vip-card-images'
    AND public.is_admin()
  );

-- Note: Cannot add comment to storage.buckets table (system table, not owned by user)
-- Bucket purpose: vip-card-images stores VIP card template images (WebP, max 5MB)
