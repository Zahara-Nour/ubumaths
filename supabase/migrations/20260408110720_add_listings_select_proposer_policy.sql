-- Allow students to see listings on which they made a proposal
-- (even if the listing is no longer active/completed/cancelled)
CREATE POLICY marketplace_listings_select_proposer
ON marketplace_listings
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT listing_id
    FROM marketplace_proposals
    WHERE proposer_id = auth.uid()
  )
);
