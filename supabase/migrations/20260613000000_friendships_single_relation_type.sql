-- Friendships: collapse the relation type to a single value 'friend' (RGPD).
--
-- Context: the UI used to offer 'classmate' / 'mentor'. 'mentor' was dropped for RGPD
-- reasons, and the product decision is that a friendship is simply "friend" — a peer in
-- the SAME school and SAME grade level (see src/lib/components/AddFriend.svelte and the
-- school+grade scoping in src/lib/stores/friends.svelte.ts:searchUsers).
--
-- The original CHECK (migration 034) only allowed ('classmate', 'mentor'), so the app's
-- new inserts of 'friend' would fail until this migration is applied.

-- 1. Drop the old CHECK constraint that only allowed ('classmate', 'mentor').
ALTER TABLE public.friendships
	DROP CONSTRAINT IF EXISTS friendships_friendship_type_check;

-- 2. Migrate every existing row to 'friend' (covers classmate / mentor / study_buddy / any).
UPDATE public.friendships
SET friendship_type = 'friend'
WHERE friendship_type IS DISTINCT FROM 'friend';

-- 3. Default new rows to 'friend' and constrain the column to that single value.
ALTER TABLE public.friendships
	ALTER COLUMN friendship_type SET DEFAULT 'friend';

ALTER TABLE public.friendships
	ADD CONSTRAINT friendships_friendship_type_check CHECK (friendship_type = 'friend');
