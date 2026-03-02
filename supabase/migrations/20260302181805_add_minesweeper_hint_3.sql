-- Duplicate minesweeper-hint as minesweeper-hint-3

INSERT INTO public.vip_card_templates (
  id,
  name,
  description,
  category,
  rarity,
  image_path,
  action,
  is_enabled,
  base_price,
  is_purchasable,
  max_owned_per_student,
  uses_total,
  activation_context
) VALUES (
  'minesweeper-hint-3',
  'Indice Demineur',
  'Revele une case sure dans le Demineur sans penalite. Utilisable une fois par carte.',
  'power',
  'common',
  '/images/vip-cards/minesweeper-hint.webp',
  '{"type": "use_consumable", "context": "minesweeper", "effect": "reveal_safe_cell"}'::JSONB,
  true,
  1,
  true,
  99,
  1,
  'minesweeper'
);
