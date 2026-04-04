-- Set maxCount to 20 for the fortune card (Roue de la Fortune)
-- Previously no maxCount was set, defaulting to 10 in the client
UPDATE public.vip_card_templates
SET action = jsonb_set(
  action,
  '{exchange,maxCount}',
  '20'
),
updated_at = NOW()
WHERE id = 'fortune';
