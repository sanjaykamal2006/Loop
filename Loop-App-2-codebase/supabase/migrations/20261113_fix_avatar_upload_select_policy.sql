-- ==============================================================================
-- Migration: 20261113_fix_avatar_upload_select_policy.sql
-- Description:
--   1. Restore SELECT policy on storage.objects for avatars bucket.
--      Without a SELECT policy on storage.objects, Supabase Storage API's
--      INSERT ... RETURNING * and upsert queries fail with:
--      "new row violates row-level security policy for table objects".
--   2. Scope SELECT to authenticated users for their own avatars (and public
--      folder prefixes) to keep storage secure without broad listing warnings.
--   3. Update INSERT, UPDATE, and DELETE policies to support both hyphen (-)
--      and slash (/) path separators for full compatibility with account deletion.
-- ==============================================================================

-- 1. Ensure avatars bucket exists and has correct MIME types and size limit
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = ARRAY[
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

-- 2. Drop existing policies to cleanly recreate them
DROP POLICY IF EXISTS "Users can view own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- 3. SELECT policy: authenticated users can read their own avatars (satisfies INSERT ... RETURNING and upsert)
CREATE POLICY "Users can view own avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
      OR name LIKE (auth.uid()::text || '/%')
      OR name LIKE ('avatars/' || auth.uid()::text || '/%')
    )
  );

-- 4. INSERT policy: authenticated users can insert into avatars bucket with their uid prefix
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
      OR name LIKE (auth.uid()::text || '/%')
      OR name LIKE ('avatars/' || auth.uid()::text || '/%')
    )
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif', 'jfif')
  );

-- 5. UPDATE policy: authenticated users can update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
      OR name LIKE (auth.uid()::text || '/%')
      OR name LIKE ('avatars/' || auth.uid()::text || '/%')
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
      OR name LIKE (auth.uid()::text || '/%')
      OR name LIKE ('avatars/' || auth.uid()::text || '/%')
    )
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif', 'jfif')
  );

-- 6. DELETE policy: authenticated users can delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
      OR name LIKE (auth.uid()::text || '/%')
      OR name LIKE ('avatars/' || auth.uid()::text || '/%')
    )
  );
