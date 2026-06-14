-- Bug report screenshots: make the bucket private + signed URLs
-- ==============================================================
--
-- Rationale (security advisor 0025 "Public Bucket Allows Listing" + RGPD):
-- the `bug-report-screenshots` bucket was public with a broad public SELECT
-- policy, allowing anyone to (1) enumerate every file via .list() and
-- (2) download any screenshot via its public CDN URL. Bug report screenshots
-- can contain student data (minors), so neither is acceptable.
--
-- After this migration:
--   * the bucket is private (no anonymous CDN download);
--   * the public SELECT policy is removed (no anonymous listing);
--   * authenticated owners can read their own screenshots (own folder), and
--     admins keep full access via the existing ALL policy.
-- Screenshots are served through short-lived signed URLs generated on the
-- server (see src/lib/server/bug-report-screenshots.ts).

-- 1. Private bucket
update storage.buckets
set public = false
where id = 'bug-report-screenshots';

-- 2. Remove the broad public SELECT policy (enumeration + anonymous download)
drop policy if exists "Public can view bug report screenshots" on storage.objects;

-- 3. Owner can read their own screenshots (path layout: {auth.uid}/{report}/file)
--    Required so the report author can generate a signed URL for their own report.
--    Admins are already covered by "Admins can manage bug report screenshots" (FOR ALL).
drop policy if exists "Users can view own bug report screenshots" on storage.objects;
create policy "Users can view own bug report screenshots"
on storage.objects
for select
to authenticated
using (
	bucket_id = 'bug-report-screenshots'
	and (storage.foldername(name))[1] = (auth.uid())::text
);
