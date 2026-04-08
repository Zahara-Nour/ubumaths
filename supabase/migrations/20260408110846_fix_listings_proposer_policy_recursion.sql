-- Fix infinite recursion: the previous policy on marketplace_listings
-- queried marketplace_proposals, which has its own RLS policy that
-- queries marketplace_listings, causing a cycle.
--
-- Solution: use a security definer function to bypass RLS on the
-- proposals table lookup.

-- Drop the recursive policy
DROP POLICY IF EXISTS marketplace_listings_select_proposer ON marketplace_listings;

-- Create a security definer function that checks proposals without RLS
CREATE OR REPLACE FUNCTION has_proposal_on_listing(p_listing_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM marketplace_proposals
    WHERE listing_id = p_listing_id
    AND proposer_id = p_user_id
  );
$$;

-- Recreate the policy using the function (no recursion)
CREATE POLICY marketplace_listings_select_proposer
ON marketplace_listings
FOR SELECT
TO authenticated
USING (
  has_proposal_on_listing(id, auth.uid())
);
