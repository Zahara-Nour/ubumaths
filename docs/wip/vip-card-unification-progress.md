# VIP Card Unification Progress

## Status: Implementation Complete + Security Fixes Applied, Pending Migration

## Changes Made

### Phase 2+8: Migration SQL

- **File**: `supabase/migrations/20260225100000_unify_vip_card_approve_use.sql`
- New unified RPC: `approve_or_use_vip_card(p_student_id, p_instance_id, p_card_id, p_mode)`
  - Mode 'approve': teacher approves card, auto-consumes bonus cards
  - Mode 'consume': marks card as used, clears activation fields
- Added 'approved' to `vip_cards_activity` CHECK constraint
- Updated `log_vip_cards_to_events` trigger to skip 'approved' action
- Dropped old `use_vip_card(UUID, TEXT)` RPC

### Phase 3: use-card/+server.ts refactored

- **File**: `src/routes/api/vip-cards/use-card/+server.ts`
- Now a thin proxy: Zod validation + auth check + RPC call
- Removed manual JSONB manipulation and activity logging (handled by RPC)

### Phase 4: use-vip-card/+server.ts refactored

- **File**: `src/routes/api/teacher/rewards/use-vip-card/+server.ts`
- Changed from `use_vip_card` to `approve_or_use_vip_card(mode='consume')`

### Phase 5: Audit trail fixes

- **exchange/+server.ts**: Added `vip_cards_activity` INSERT after action card marked as used
- **choose/+server.ts**: Added `vip_cards_activity` INSERT after action card marked as used
- **draw-vip-cards/+server.ts**: Added `vip_cards_activity` INSERT when VIP card used as payment
- **remove-multiple/+server.ts**: Added `vip_cards_activity` INSERT after action card marked as used

### Phase 6: add_gidouilles fix

- **New file**: `src/routes/api/vip-cards/activate-add-gidouilles/+server.ts`
  - Validates card ownership, approval status, and action type
  - Adds gidouilles via `update_student_gidouilles` RPC
  - Marks card as used via `approve_or_use_vip_card` RPC
- **StudentVipCardsModal.svelte**: Fixed `add_gidouilles` case to call new endpoint
- **VipCardsModal.svelte**: Fixed `handleAddGidouilles` to call new endpoint + optimistic cache update

## Files Modified

| File                                                                | Action   |
| ------------------------------------------------------------------- | -------- |
| `supabase/migrations/20260225100000_unify_vip_card_approve_use.sql` | NEW      |
| `src/routes/api/vip-cards/use-card/+server.ts`                      | MODIFIED |
| `src/routes/api/teacher/rewards/use-vip-card/+server.ts`            | MODIFIED |
| `src/routes/api/vip-cards/exchange/+server.ts`                      | MODIFIED |
| `src/routes/api/vip-cards/choose/+server.ts`                        | MODIFIED |
| `src/routes/api/rewards/draw-vip-cards/+server.ts`                  | MODIFIED |
| `src/routes/api/warnings/remove-multiple/+server.ts`                | MODIFIED |
| `src/routes/api/vip-cards/activate-add-gidouilles/+server.ts`       | NEW      |
| `src/lib/components/StudentVipCardsModal.svelte`                    | MODIFIED |
| `src/lib/components/VipCardsModal.svelte`                           | MODIFIED |

### Security Fixes (from code review + security audit)

- **CRIT-1**: `use-vip-card/+server.ts` — Added `requireAuth`, role check (teacher/admin only), and `verifyTeacherStudentWithRole`. Added regex on cardId.
- **HIGH-1**: RPC consume mode — Added ownership check (`auth.uid() != p_student_id AND NOT is_teacher_or_admin()`)
- **MED-2**: `exchange/+server.ts` and `choose/+server.ts` — Fixed approval bypass: now requires `activationApprovedAt` for students (was only checking pending state)
- **Issue 10**: `activate-add-gidouilles/+server.ts` — Reversed operation order: consume card FIRST, then add gidouilles (prevents double-spend)
- **LOW-2**: Removed internal error message leaking from 500 responses in `use-card`, `use-vip-card`, and `activate-add-gidouilles`

### Deferred Issues (pre-existing, out of scope)

- exchange/choose/remove-multiple race conditions (no FOR UPDATE on JSONB read-modify-write) — pre-existing
- Exchange endpoint missing per-discarded-card audit log — pre-existing
- Route naming (`use-card` → should be `approve-card`) — cosmetic, defer
- Inconsistent consumption patterns (3/4 endpoints still use manual JSONB) — incremental migration by design

## Next Steps

- [ ] Run `pnpm db:migrate` to apply the migration
- [ ] Run `pnpm db:types` to regenerate TypeScript types
- [ ] Commit
