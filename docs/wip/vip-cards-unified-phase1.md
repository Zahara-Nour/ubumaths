# VIP Cards Unified - Phase 1: Purchase and Consumable Support

**Date**: 2026-01-03
**Status**: Complete (with security fixes applied)

## Security Audit Results

### Issues Fixed

1. **CRITICAL: Missing auth.uid() verification** (H-2)

   - Added `auth.uid()` check at start of `purchase_vip_card()` and `use_consumable_card()`
   - Prevents privilege escalation attacks

2. **HIGH: Integer overflow protection** (H-3)

   - Added balance range validation (0 to 10,000,000) after calculation
   - Prevents balance manipulation via overflow

3. **HIGH: Race condition in count_student_active_cards** (H-1)
   - Added optional `p_lock_row` parameter for FOR UPDATE locking
   - Note: Already mitigated by FOR UPDATE in purchase_vip_card before count call

## Summary

This phase extends the VIP card system to support:

1. **Card purchasing with gidouilles** - Students can buy cards directly
2. **Multi-use consumable cards** - Cards that can be used multiple times before being exhausted

## Files Modified/Created

### New Files

1. **Migration**: `/supabase/migrations/20260103100302_extend_vip_cards_purchase_consumable.sql`

   - Adds columns to `vip_card_templates`: `base_price`, `is_purchasable`, `max_owned_per_student`, `uses_total`
   - Creates RPC functions: `purchase_vip_card()`, `use_consumable_card()`, `count_student_active_cards()`
   - Updates `award_vip_card_no_cost()` to include `acquiredFrom` and `usesRemaining`
   - Sets rarity-based pricing: common=20, rare=50, epic=150, legendary=500

2. **Tests**: `/tests/unit/vip-card-purchase.test.ts`

   - 25 tests covering purchase eligibility, transactions, pricing, max ownership

3. **Tests**: `/tests/unit/vip-card-consumable.test.ts`
   - 21 tests covering template config, instance initialization, usage, activity logging

### Modified Files

1. **Types**: `/src/lib/types/vip-card.ts`

   - Added `VipCardAcquisitionSource` type: `'draw' | 'purchase' | 'gift' | 'exchange'`
   - Extended `VipCardInstance` with: `purchasedAt`, `acquiredFrom`, `usesRemaining`
   - Extended `VipCard` with: `basePrice`, `isPurchasable`, `maxOwnedPerStudent`, `usesTotal`
   - Added `VipCardCategory`: `'consumable'`
   - Added `RARITY_PRICES` constant and `getRarityPrice()` function
   - Added `PurchaseVipCardResult` and `UseConsumableResult` interfaces

2. **Validation**: `/src/lib/server/validation/vip-cards.ts`
   - Added `purchaseVipCardSchema` for purchase API requests
   - Added `useConsumableSchema` for consumable usage API requests
   - Added `getPurchasableCardsSchema` for querying purchasable cards

## Database Schema Changes

### vip_card_templates (modified)

| Column                | Type    | Default | Description                              |
| --------------------- | ------- | ------- | ---------------------------------------- |
| base_price            | INTEGER | 0       | Price in gidouilles                      |
| is_purchasable        | BOOLEAN | TRUE    | Can be purchased                         |
| max_owned_per_student | INTEGER | 5       | Max active copies per student            |
| uses_total            | INTEGER | NULL    | Uses for consumables (NULL = single-use) |

### New RPC Functions

1. **purchase_vip_card(p_student_id UUID, p_card_id TEXT) RETURNS JSONB**

   - Validates card exists and is purchasable
   - Checks student balance >= base_price
   - Enforces max_owned_per_student limit
   - Deducts gidouilles and creates instance
   - Logs to vip_cards_activity

2. **use_consumable_card(p_student_id UUID, p_instance_id TEXT) RETURNS JSONB**

   - Decrements usesRemaining for consumables
   - Marks usedAt when usesRemaining = 0
   - Works for both single-use and multi-use cards
   - Logs each use to vip_cards_activity

3. **count_student_active_cards(p_student_id UUID, p_card_id TEXT) RETURNS INTEGER**
   - Helper function for ownership limit enforcement

## Instance JSONB Structure

```jsonb
{
  "cardId": "bonus",
  "earnedAt": "2026-01-03T10:00:00.000Z",
  "usedAt": null,
  "acquiredFrom": "purchase",
  "purchasedAt": "2026-01-03T10:00:00.000Z",
  "usesRemaining": 3
}
```

## Rarity Pricing

| Rarity    | Price (gidouilles) |
| --------- | ------------------ |
| common    | 20                 |
| rare      | 50                 |
| epic      | 150                |
| legendary | 500                |

## Next Steps (Phase 2)

1. Create API endpoints:

   - `POST /api/vip-cards/purchase`
   - `POST /api/vip-cards/use-consumable`
   - `GET /api/vip-cards/purchasable`

2. Create UI components:

   - VIP card shop/marketplace
   - Consumable usage indicator on cards
   - Purchase confirmation modal

3. Update existing card display to show:
   - Purchase button for purchasable cards
   - Uses remaining badge for consumables

## Manual Steps Required

1. **Apply migration**: Run `pnpm db:migrate` to apply database changes
2. **Regenerate types**: Run Supabase type generation to update `database.ts`
3. **Test RPC functions**: Verify with test data in development

## Test Results

```
tests/unit/vip-card-purchase.test.ts: 25 passed
tests/unit/vip-card-consumable.test.ts: 21 passed
Total: 46 passed
```

## Decisions Made

1. **All 27 existing cards are purchasable by default** - Can be disabled per-card if needed
2. **Default max ownership: 5** - Prevents hoarding, can be adjusted per-card
3. **uses_total = NULL means single-use** - Backwards compatible with existing cards
4. **acquiredFrom field tracks source** - Enables analytics on card acquisition methods
5. **Row-level locking in purchase RPC** - Prevents race conditions on balance deduction
