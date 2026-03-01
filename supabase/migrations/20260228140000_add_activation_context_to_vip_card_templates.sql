-- Add activation_context column to vip_card_templates
-- Controls whether a card can be self-activated by students without teacher approval.
--
-- NULL (default) = teacher approval required (current behavior)
-- 'any'          = student can self-activate freely
-- 'minesweeper'  = student can self-activate only during an active minesweeper game

ALTER TABLE public.vip_card_templates
ADD COLUMN activation_context TEXT DEFAULT NULL
  CONSTRAINT vip_card_templates_activation_context_check
  CHECK (activation_context IN ('any', 'minesweeper'));

COMMENT ON COLUMN public.vip_card_templates.activation_context IS
'NULL = teacher approval required. Values: any, minesweeper.';
