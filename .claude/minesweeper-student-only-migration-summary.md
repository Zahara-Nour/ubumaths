# Minesweeper Student-Only Database Migration

## Migration Details

**File**: `supabase/migrations/20251120182756_restrict_minesweeper_to_students_only.sql`
**Date**: 2025-11-20
**Purpose**: Enforce student-only access to minesweeper at the database level as defense-in-depth

## Context

We've already implemented client-side and API-level checks to treat teachers/admins as anonymous (localStorage only). This migration adds **database-level enforcement** as a final security layer.

## Changes Made

### 1. RLS Policies Updated (8 tables)

All RLS policies now include a role check: `(SELECT role FROM profiles WHERE id = auth.uid()) = 'student'`

#### Tables Updated:
1. **minesweeper_games**
   - SELECT: Only students can view own games
   - INSERT: Only students can create games (max 10 concurrent)
   - UPDATE: Only students can update in-progress games
   - DELETE: Only students can delete own games
   - **Removed**: Anonymous INSERT policy (public games no longer supported)

2. **minesweeper_student_achievements**
   - SELECT: Only students can view achievements

3. **minesweeper_multiplayer_matches**
   - SELECT: Only students can view own or completed matches

4. **minesweeper_multiplayer_queue**
   - SELECT: Only students can view own queue entry
   - INSERT: Only students can join queue

5. **minesweeper_multiplayer_game_state**
   - SELECT: Only students can view game state for their matches

6. **minesweeper_player_stats**
   - SELECT: Only students can view player stats

7. **minesweeper_daily_challenges**
   - SELECT: Only students can view daily challenges

8. **minesweeper_daily_attempts**
   - SELECT: Only students can view daily attempts
   - INSERT: Only students can submit attempts

### 2. RPC Functions Updated (4 functions)

All critical RPC functions now validate `role = 'student'` at function start:

1. **use_hint(p_game_id UUID)**
   - Added role check before processing hint request
   - Error: "Only students can use minesweeper hints"

2. **complete_minesweeper_game(p_game_id UUID, p_grid_state JSONB)**
   - Added role check before game completion
   - Error: "Only students can complete minesweeper games"

3. **record_minesweeper_loss(p_game_id UUID, p_grid_state JSONB)**
   - Added role check before recording loss
   - Error: "Only students can record minesweeper losses"

4. **record_daily_challenge_attempt(p_challenge_id UUID, ...)**
   - Added role check before recording attempt
   - Error: "Only students can attempt daily challenges"

### 3. Documentation Updated

- All policy comments explain student-only restriction
- All function comments indicate "STUDENTS ONLY"
- All table comments clarify student-only access
- All view comments updated

### 4. Pattern Used for Role Checks

```sql
-- In RLS policies
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  AND [other conditions...]
)

-- In RPC functions
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only students can [action]';
  END IF;
  -- ... rest of function
END;
```

## Security Model

### Defense-in-Depth Layers

1. **Client Store** (`minesweeperStore.svelte`)
   - Detects teacher/admin role
   - Uses localStorage instead of API calls
   - No database interaction

2. **API Endpoints** (all `/api/minesweeper/*` routes)
   - Validate role = 'student' before database operations
   - Return appropriate errors for non-students

3. **Database (THIS MIGRATION)**
   - RLS policies block non-students at table level
   - RPC functions validate role before execution
   - Fail-closed with clear error messages

### Error Handling

Teachers/admins attempting database operations will receive:
- RLS policy violation (silent - no rows returned/affected)
- RPC function exception (explicit - "Only students can...")

## Backward Compatibility

✅ **Fully backward compatible:**
- Existing student games unaffected
- RPC function signatures unchanged
- Views inherit RLS automatically (security_invoker)
- No data migration needed
- No breaking changes to client code

## Testing Checklist

After running `pnpm db:migrate`:

### Teacher/Admin Account Tests
- [ ] Cannot create minesweeper game in database
- [ ] Cannot view minesweeper games in database
- [ ] Cannot call use_hint() RPC
- [ ] Cannot call complete_minesweeper_game() RPC
- [ ] Cannot call record_minesweeper_loss() RPC
- [ ] Cannot join multiplayer queue
- [ ] Cannot attempt daily challenges
- [ ] Can still play anonymously via localStorage

### Student Account Tests
- [ ] Can create games normally
- [ ] Can view own games
- [ ] Can use hints (RPC works)
- [ ] Can complete games (RPC works)
- [ ] Can record losses (RPC works)
- [ ] Can join multiplayer queue
- [ ] Can attempt daily challenges
- [ ] All existing features work normally

### Edge Case Tests
- [ ] Teacher tries to call RPC directly via SQL (should fail)
- [ ] Teacher tries to INSERT via SQL (should fail)
- [ ] Student with no classes can still play (gidouilles_history insert skipped, acceptable)

## Impact Summary

### What's Blocked
- Teachers/admins: **All database operations** for minesweeper
- Anonymous users: Game creation (was previously allowed for public games)

### What Still Works
- Students: **Full access** to all minesweeper features
- Teachers/admins: **localStorage play** (client-side only)
- API layer: **Still validates role** (redundant but good defense-in-depth)

### Performance Impact
- Minimal: Role check is a single indexed lookup on `profiles.id`
- RLS policies already existed, just added role condition
- No new indexes needed
- No new tables or columns

## Files Modified

1. `/supabase/migrations/20251120182756_restrict_minesweeper_to_students_only.sql` (NEW)

## Next Steps

1. Run migration:
   ```bash
   pnpm db:migrate
   ```

2. Test with both teacher and student accounts

3. Update documentation if needed:
   - `DATABASE_SCHEMA.md` - document student-only restriction
   - No need to update `database.ts` (no schema changes)

4. Deploy to production after successful testing

## Rollback Plan

If issues arise, rollback by:
1. Reverting the migration file
2. Re-running previous policies (stored in git history)
3. Or manually remove role checks from policies/functions

**Note**: Rollback is safe - no data loss, only policy changes.

## Related Files

- Client store: `src/lib/stores/minesweeper.svelte.ts`
- API endpoints: `src/routes/api/minesweeper/**/*.ts`
- Previous migrations: `supabase/migrations/*minesweeper*.sql`
- Database schema docs: `docs/architecture/database-schema.md`

## Conclusion

This migration completes the defense-in-depth security model for minesweeper student-only access. Teachers and admins are now blocked at three levels: client, API, and database. Students retain full functionality with no changes to their experience.
