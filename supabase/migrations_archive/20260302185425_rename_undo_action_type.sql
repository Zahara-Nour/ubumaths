-- Replace use_consumable action with undo action on minesweeper-undo card

UPDATE public.vip_card_templates
SET action = '{"type": "undo", "context": "minesweeper"}'::JSONB
WHERE id = 'minesweeper-undo';
