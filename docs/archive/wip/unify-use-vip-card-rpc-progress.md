# Unify use_vip_card RPC - Progress

## Status: COMPLETE - Awaiting migration push

## What was done

### Phase 1: SQL Migration

- **File**: `supabase/migrations/20260302164820_unify_use_vip_card_rpc.sql`
- Dropped `use_consumable_card(UUID, TEXT, TEXT)`
- Dropped old `use_vip_card(UUID, TEXT, TEXT, JSONB)` (4-param)
- Created unified `use_vip_card(UUID, TEXT, TEXT, JSONB, TEXT)` (5-param with `p_context`)
- Recreated `use_hint()` to call `use_vip_card` instead of `use_consumable_card`
- Recreated `use_minesweeper_undo()` to call `use_vip_card` instead of `use_consumable_card`
- Verification block confirms all functions exist and old one is dropped

### Phase 2: TypeScript Endpoint Unification

- **`src/routes/api/vip-cards/use-card/+server.ts`**: Rewritten to support both student and teacher/admin
- **`src/lib/server/validation/vip-cards.ts`**: `useCardSchema` now has optional `studentId`, `context` with `.max(64)`
- **`src/lib/types/vip-card.ts`**: Added `UseCardResult` type, removed `UseConsumableResult`

### Phase 3: Dead Code Removal

- Deleted `src/routes/api/vip-cards/use-consumable/+server.ts` (endpoint)
- Removed `useConsumableSchema`, `useConsumableBodySchema` from validation
- Fixed comment in `src/routes/api/games/minesweeper/[id]/undo/+server.ts`

### Phase 4: Verification

- ESLint: clean on all modified files
- Tests: 25/25 passing
- TypeScript: standard path-alias issues only (no code errors)

### Phase 5: Review & Security

- Code reviewer: found context error leak, consent category, stale types → fixed
- Security auditor: found admin bypass asymmetry (M-1), context leak (M-2), max length (M-3) → M-2 and M-3 fixed

### Review findings addressed

- Generic context error message (no longer leaks expected value)
- `context` max length 64 in Zod schema
- Simplified error mapping in endpoint
- TODO comment for null casts pending `pnpm db:types`

### Review findings deferred (intentional)

- **M-1 (Admin bypass asymmetry)**: SQL is stricter than TS for admins. Fails secure (admin blocked by SQL if no class link). This matches existing behavior of all other RPC callers. To align, would need either SQL change or TS change — out of scope.
- **L-4 (Consent for teacher-initiated use)**: Teachers may act on students regardless of consent — documented design decision.
- **Stale generated types**: `database.ts` still has old signature — user must run `pnpm db:types` after migration push.

## User action required

1. `pnpm db:start && pnpm db:migrate` to apply the migration
2. `pnpm db:types` to regenerate `database.ts`
3. Remove `null as unknown as string` casts from `use-card/+server.ts` after types are regenerated

## Files modified

- `supabase/migrations/20260302164820_unify_use_vip_card_rpc.sql` (new)
- `src/routes/api/vip-cards/use-card/+server.ts` (rewritten)
- `src/lib/server/validation/vip-cards.ts` (updated schema, removed dead schemas)
- `src/lib/types/vip-card.ts` (added UseCardResult, removed UseConsumableResult)
- `src/routes/api/games/minesweeper/[id]/undo/+server.ts` (comment fix)
- `tests/unit/vip-card-consumable.test.ts` (rewritten for unified RPC)
- `docs/wip/unify-use-vip-card-rpc-progress.md` (this file)

## Files deleted

- `src/routes/api/vip-cards/use-consumable/+server.ts`
