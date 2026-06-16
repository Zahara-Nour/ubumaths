-- Add hint action to all minesweeper-hint card templates

UPDATE public.vip_card_templates
SET action = '{"type": "hint", "context": "minesweeper"}'::JSONB
WHERE id IN ('minesweeper-hint', 'minesweeper-hint-2', 'minesweeper-hint-3');
