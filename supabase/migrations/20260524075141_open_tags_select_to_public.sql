-- Allow anonymous visitors to SELECT from public.tags so public pages
-- (e.g. /presques-evaluations) can use the existing TagBadgeSelector
-- modal — which fetches /api/tags — without an auth gate.
--
-- Tag names are generic math themes (algèbre, géométrie, etc.) and carry
-- no PII; opening read access to anon is safe.
--
-- INSERT/UPDATE/DELETE policies are unchanged — only authenticated users
-- can create or modify tags.

DROP POLICY IF EXISTS tags_select_authenticated ON public.tags;

CREATE POLICY tags_select_public
    ON public.tags
    FOR SELECT
    TO public
    USING (true);
