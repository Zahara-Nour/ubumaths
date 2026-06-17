-- Fix infinite recursion in marketplace_listings INSERT policy
-- The old policy queried marketplace_listings within its own WITH CHECK,
-- which triggered SELECT policies on the same table, causing infinite recursion.
-- The active listings limit is already enforced by the API layer (checkActiveListingsLimit).

DROP POLICY IF EXISTS "marketplace_listings_insert_student" ON public.marketplace_listings;

CREATE POLICY "marketplace_listings_insert_student" ON public.marketplace_listings
    FOR INSERT TO authenticated
    WITH CHECK (
        creator_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'student'
        )
    );
