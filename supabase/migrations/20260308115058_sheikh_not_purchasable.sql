-- Sheikh gives +50 gidouilles — allowing direct purchase makes no economic sense.
-- Only obtainable via draw, teacher award, or trade.
UPDATE public.vip_card_templates
SET is_purchasable = false, updated_at = NOW()
WHERE id = 'Sheikh';
