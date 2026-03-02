# Unify Minesweeper Hint with Standard VIP Flow - Progress

## Status: COMPLETE

## What was done

Unified the `minesweeper-hint` VIP card consumption to use the standard `use_consumable_card()` RPC instead of dedicated functions (`try_consume_vip_hint_card`, `count_vip_hint_cards`).

## Files modified

| File                                                                     | Change                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `supabase/migrations/20260302055042_unify_minesweeper_hint_vip_flow.sql` | New migration: set activation_context, refactor use_hint(), drop dedicated functions |
| `src/lib/types/vip-card.ts`                                              | Added `UseConsumableAction` to `VipCardAction` union                                 |
| `src/lib/utils/vip-cards.ts`                                             | Added `countAvailableConsumableUses()`, `use_consumable` in `getActionDescription`   |
| `src/lib/utils/vip-cards.test.ts`                                        | 8 tests for `countAvailableConsumableUses`                                           |
| `src/lib/stores/minesweeper.svelte.ts`                                   | `fetchHintItemCount()` uses client-side counting via `countAvailableConsumableUses`  |
| `src/lib/components/StudentVipCardsModal.svelte`                         | Added `use_consumable` case in `handleActivateCard`                                  |
| `src/lib/server/validation/vip-card-admin.ts`                            | Added `useConsumableActionSchema` to action discriminatedUnion                       |
| `src/routes/api/vip-cards/request-activation/+server.ts`                 | Added `use_consumable` case in `getActionDescriptionFromType`                        |

## Decisions

- **Graceful degradation**: If VIP card consumption fails due to race condition, `use_hint()` silently falls through to gidouilles deduction (documented in SQL comment)
- **Client-side counting**: Replaced `count_vip_hint_cards` RPC with a `.select('vip_cards')` query + `countAvailableConsumableUses()` utility
- **Dynamic import**: Minesweeper store is dynamically imported in the VIP modal to avoid loading it on non-game pages

## Migration requires

- `pnpm db:migrate` to apply the SQL migration
