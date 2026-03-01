-- Re-sync avatar URLs from auth.users metadata into profiles
-- Fixes expired/invalid Google avatar URLs stored in profiles.avatar_url
-- Pattern matches handle_new_user() trigger logic

UPDATE public.profiles p
SET avatar_url = COALESCE(
  u.raw_user_meta_data->>'picture',
  u.raw_user_meta_data->>'avatar_url'
),
    updated_at = NOW()
FROM auth.users u
WHERE u.id = p.id
  AND COALESCE(
    u.raw_user_meta_data->>'picture',
    u.raw_user_meta_data->>'avatar_url'
  ) IS NOT NULL;
