-- Remove 'consumable' from vip_card_templates category
-- Cards with category='consumable' (minesweeper-hint, minesweeper-undo) → 'power'

UPDATE public.vip_card_templates
SET category = 'power'
WHERE category = 'consumable';

ALTER TABLE public.vip_card_templates
  DROP CONSTRAINT IF EXISTS vip_card_templates_category_check;

ALTER TABLE public.vip_card_templates
  ADD CONSTRAINT vip_card_templates_category_check
  CHECK (category IS NULL OR category IN ('bonus', 'privilege', 'social', 'power'));
