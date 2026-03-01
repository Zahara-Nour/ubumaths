# Cartes VIP auto-activables - Progress

## Status: COMPLETE

## Summary

Added `activation_context` field to VIP card templates allowing students to self-activate cards without teacher approval when a context condition is met.

## Files Modified

### New Files

- `supabase/migrations/20260228140000_add_activation_context_to_vip_card_templates.sql` - ALTER TABLE + CHECK constraint
- `src/lib/server/vip-card-context.ts` - Context validator registry (any, minesweeper)
- `src/lib/server/vip-card-context.test.ts` - 8 unit tests

### Modified Files

- `src/lib/types/vip-card.ts` - Added `activationContext` to `VipCard` interface
- `src/lib/types/database-helpers.ts` - Added `ActivationContext` type
- `src/lib/stores/vipCardTemplates.svelte.ts` - Added `activation_context` to `VipCardTemplate`, mapped in `templateToVipCard`
- `src/lib/utils/vip-cards.ts` - Propagated `activationContext` in `getStudentCardsWithCounts`
- `src/routes/api/vip-cards/activate-add-gidouilles/+server.ts` - Context-aware approval check
- `src/routes/api/vip-cards/exchange/+server.ts` - Context-aware approval check
- `src/routes/api/vip-cards/choose/+server.ts` - Context-aware approval check (optimized: single template fetch)
- `src/lib/components/StudentVipCardsModal.svelte` - Self-activation UI branch + `findAnyUnusedInstance`
- `src/lib/components/VipCardActivationButton.svelte` - Self-activation support with `onActivate` callback

## Key Decisions

- DB column has CHECK constraint limiting values to `('any', 'minesweeper')` - adding new contexts requires a migration
- Unknown context values are denied by default (secure posture)
- Minesweeper validator logs DB errors but returns false (deny-on-error)
- draw_cards endpoint works without changes: the `draw_multiple_vip_cards` RPC only blocks cards with pending-but-unapproved requests, not cards without any request
- `minesweeper-hint` card keeps its existing dedicated flow via `use_hint()` RPC

## Next Steps

- Run `pnpm db:migrate` to apply migration
- Run `pnpm db:types` to regenerate database.ts (will make `activation_context?` redundant in VipCardTemplate)
- Set `activation_context` on desired templates via SQL or admin UI
