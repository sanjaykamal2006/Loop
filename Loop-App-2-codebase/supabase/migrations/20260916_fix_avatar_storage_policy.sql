-- ==============================================================================
-- Migration: 20260916_fix_avatar_storage_policy.sql
-- Description:
--   1. Add public SELECT policy on storage.objects for avatars bucket
--      (Fixes "new row violates row-level security policy" on INSERT RETURNING and public downloads).
--   2. Broaden allowed MIME types on avatars bucket to include mobile image formats
--      (image/jpg, image/heic, image/heif, image/avif).
--   3. Extend storage RLS policy to support mobile image extensions (heic, heif, avif, jfif).
-- ==============================================================================

-- 1. Add SELECT policy on storage.objects for avatars bucket
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- 2. Broaden allowed MIME types on avatars bucket to prevent rejecting mobile phone uploads
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif'
]
WHERE id = 'avatars';

-- 3. Extend storage RLS policies to support all valid mobile image extensions
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif', 'jfif')
  );

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif', 'jfif')
  );
