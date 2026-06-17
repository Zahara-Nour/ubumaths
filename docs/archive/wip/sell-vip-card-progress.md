# Sell VIP Card - Progress

## Status: Implementation complete, ready for commit

## What was done

### Migration: `20260404200000_add_sell_vip_card.sql`

- Added `sell_price INTEGER` column to `vip_card_templates`
- Populated sell prices by rarity: common=1, rare=3, epic=8, legendary=15
- Extended `vip_cards_activity` CHECK constraint to include 'sold'
- Created `sell_vip_card` RPC (SECURITY DEFINER):
  - Auth check (auth.uid() = p_student_id)
  - FOR UPDATE lock on profiles
  - Validates: card exists, not used, no pending activation, not marketplace-locked
  - Cooldown 5min (GREATEST of purchasedAt/earnedAt, null-safe)
  - Prorated pricing for consumables (floor, min 1g)
  - Atomic: remove card from JSONB + credit gidouilles
  - Logs to vip_cards_activity (action='sold') + gidouilles_activity

### API: `POST /api/vip-cards/sell`

- Requires student role + parental consent (purchase_items)
- Zod validation: `{ cardInstanceId: uuid }`
- Delegates to RPC, maps errors to HTTP status codes
- Cooldown returns structured JSON (not thrown error) with secondsRemaining

### Types

- Added 'sold' to VipCardsActivityRow.action and VipCardsActivityInsert.action in database-types.ts

### Tests: 12/12 passing

- Input validation (3), Authentication (2), Success (1), RPC errors (6)

## Code review fixes applied

1. CHECK constraint for 'sold' added (was missing - critical)
2. GREATEST instead of COALESCE for cooldown timestamp
3. Null-safe cooldown guard (blocks if no timestamp)
4. requireConsent added (was missing)
5. Cooldown error returns structured JSON (not stringified)

## Files modified

- `supabase/migrations/20260404200000_add_sell_vip_card.sql` (new)
- `src/routes/api/vip-cards/sell/+server.ts` (new)
- `src/routes/api/vip-cards/sell/sell.test.ts` (new)
- `src/lib/server/validation/vip-cards.ts` (added sellVipCardBodySchema)
- `src/lib/server/summaries/database-types.ts` (added 'sold' to action unions)

## Next steps

- UI integration (shop/inventory sell button) - separate task
- Fix exchange endpoint marketplace lock check (noted bug, separate scope)
