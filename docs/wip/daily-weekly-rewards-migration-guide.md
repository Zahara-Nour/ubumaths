# Daily & Weekly Reward Limits - Migration Guide

**Created:** 2026-01-01
**Migration file:** `supabase/migrations/20260101200000_daily_weekly_reward_limits.sql`
**Status:** Ready to deploy

---

## Overview

This migration implements a comprehensive reward system with daily and weekly limits:

- **Daily limit:** Students can earn MAX 1 gidouille/day (across all games)
- **Weekly bonus:** At week end, students receive their best theoretical reward of the week
- **Theoretical reward:** `base × time_mult × (1 - hint_penalty)` (WITHOUT daily multiplier)

---

## Tables Created

### 1. `daily_game_rewards`

Tracks each game victory with theoretical and actual rewards.

**Key columns:**

- `student_id` - Student reference
- `game_date` - Date in school timezone
- `game_type` - 'minesweeper' or 'riddle'
- `game_id` - Reference to game (match or attempt)
- `theoretical_reward` - Calculated without daily multiplier
- `actual_reward` - 1 if first win of day, 0 otherwise
- `is_first_win_of_day` - Boolean flag
- `week_start` - For weekly aggregation

**Constraints:**

- UNIQUE (student_id, game_type, game_id) - One row per game
- CHECK actual_reward <= 1
- CHECK theoretical_reward >= 0

### 2. `weekly_best_rewards`

Stores weekly best theoretical scores for bonus calculation.

**Key columns:**

- `student_id` - Student reference
- `week_start`, `week_end` - Week boundaries
- `best_theoretical_reward` - MAX score this week
- `best_reward_game_type`, `best_reward_game_id` - Which game achieved best
- `bonus_awarded` - Amount awarded (NULL = pending)
- `bonus_awarded_at` - When bonus was awarded

**Constraints:**

- UNIQUE (student_id, week_start)
- CHECK week_end > week_start

---

## Functions Created

### 1. `record_game_reward()` - ATOMIC

**Called after:** Each Minesweeper or Riddle victory

**Signature:**

```sql
record_game_reward(
  p_student_id UUID,
  p_game_type TEXT,           -- 'minesweeper' or 'riddle'
  p_game_id UUID,
  p_theoretical_reward NUMERIC,
  p_school_id UUID
)
RETURNS TABLE(
  actual_reward NUMERIC,      -- 1 or 0
  is_first_win BOOLEAN,
  week_best_reward NUMERIC
)
```

**Logic:**

1. Gets school timezone and week_config
2. Calculates game_date and week boundaries
3. **LOCKS** student's rewards for this date (FOR UPDATE)
4. Checks if first win of day (atomically)
5. Awards 1 gidouille if first win, 0 otherwise
6. Inserts into `daily_game_rewards`
7. UPSERTs into `weekly_best_rewards` (keeps MAX)
8. If first win:
   - Updates `profiles.gidouilles`
   - Inserts into `gidouilles_history` with reason `'daily_game_reward:minesweeper'`

**Security:**

- Only callable by student for their own games
- Validates game_type and reward bounds

### 2. `award_weekly_best_bonuses()` - CRON JOB

**Called by:** Cron job at end of week

**Signature:**

```sql
award_weekly_best_bonuses(
  p_week_start DATE,
  p_week_end DATE
)
RETURNS INTEGER  -- Number of bonuses awarded
```

**Logic:**

1. Finds all unaward bonuses for this week
2. For each student:
   - Updates `profiles.gidouilles += best_theoretical_reward`
   - Inserts into `gidouilles_history` with reason `'weekly_best_game_bonus'`
   - Marks bonus as awarded
3. Returns count

**Security:**

- Only callable by admins or service role

### 3. `get_student_week_best()` - UTILITY

**Called by:** Frontend to display current week progress

**Signature:**

```sql
get_student_week_best(
  p_student_id UUID,
  p_school_id UUID
)
RETURNS TABLE(
  best_theoretical_reward NUMERIC,
  week_start DATE,
  week_end DATE
)
```

**Security:**

- Students can only query themselves
- Teachers/admins can query their students

### 4. `calculate_week_boundaries()` - HELPER

Calculates week_start and week_end based on school's `week_config.first_day`.

---

## Integration Points

### Minesweeper (`complete_minesweeper_game`)

**Current flow:**

```typescript
// In /api/games/minesweeper/[id]/complete/+server.ts
const result = await supabase.rpc('complete_minesweeper_game', {
	p_match_id: matchId,
	p_student_id: user.id,
	p_completion_time: elapsedSeconds,
	p_used_hints: usedHints
});
```

**NEW: After successful completion**

```typescript
// Call record_game_reward
const rewardResult = await supabase.rpc('record_game_reward', {
	p_student_id: user.id,
	p_game_type: 'minesweeper',
	p_game_id: matchId,
	p_theoretical_reward:
		result.data.reward_breakdown.base_reward *
		result.data.reward_breakdown.time_multiplier *
		(1 - result.data.reward_breakdown.hint_penalty),
	p_school_id: user.school_id
});

// rewardResult.data contains:
// - actual_reward: 1 or 0
// - is_first_win: boolean
// - week_best_reward: current week's best
```

**IMPORTANT:**

- `complete_minesweeper_game` should NO LONGER update `profiles.gidouilles` directly
- All gidouille updates go through `record_game_reward()`

### Riddles (`submit_riddle_attempt`)

**Current flow:**

```typescript
// In riddle submission handler
const attemptId = await supabase.rpc('submit_riddle_attempt', {
	p_riddle_id: riddleId,
	p_student_id: user.id,
	p_submitted_answer: answer,
	p_is_correct: isCorrect
});
```

**NEW: After correct answer**

```typescript
if (isCorrect) {
	// Calculate theoretical reward (no daily multiplier)
	const theoreticalReward = calculateRiddleGidouilles(difficulty, attemptNumber);

	// Record reward
	const rewardResult = await supabase.rpc('record_game_reward', {
		p_student_id: user.id,
		p_game_type: 'riddle',
		p_game_id: attemptId,
		p_theoretical_reward: theoreticalReward,
		p_school_id: user.school_id
	});
}
```

**IMPORTANT:**

- `submit_riddle_attempt` should NO LONGER update `profiles.gidouilles` directly
- All gidouille updates go through `record_game_reward()`

### Cron Job (Weekly Bonuses)

**File:** `src/routes/api/cron/daily-summaries-and-rewards/+server.ts`

**NEW: Add weekly bonus logic**

```typescript
// At end of week (e.g., Saturday night for Sunday-Thursday schools)
const currentDate = new Date();
const isWeekEnd = /* Check if it's the last day of school week */;

if (isWeekEnd) {
  // Calculate week boundaries
  const weekStart = /* Calculate from school week_config */;
  const weekEnd = /* Calculate from school week_config */;

  // Award bonuses
  const { data: bonusCount } = await supabase.rpc('award_weekly_best_bonuses', {
    p_week_start: weekStart,
    p_week_end: weekEnd
  });

  console.log(`Awarded ${bonusCount} weekly bonuses`);
}
```

---

## Migration Checklist

### 1. Database

- [x] Migration file created: `20260101200000_daily_weekly_reward_limits.sql`
- [ ] Run: `pnpm db:migrate`
- [ ] Verify in Supabase Dashboard:
  - Tables exist: `daily_game_rewards`, `weekly_best_rewards`
  - Functions exist: `record_game_reward`, `award_weekly_best_bonuses`, `get_student_week_best`
  - RLS policies enabled

### 2. TypeScript Types

- [ ] Update `src/lib/types/database.ts`:

  ```typescript
  export interface DailyGameReward {
  	id: string;
  	student_id: string;
  	game_date: string;
  	game_type: 'minesweeper' | 'riddle';
  	game_id: string;
  	theoretical_reward: number;
  	actual_reward: number;
  	is_first_win_of_day: boolean;
  	week_start: string;
  	created_at: string;
  }

  export interface WeeklyBestReward {
  	id: string;
  	student_id: string;
  	week_start: string;
  	week_end: string;
  	best_theoretical_reward: number;
  	best_reward_game_type: 'minesweeper' | 'riddle' | null;
  	best_reward_game_id: string | null;
  	bonus_awarded: number | null;
  	bonus_awarded_at: string | null;
  	created_at: string;
  	updated_at: string;
  }
  ```

### 3. Minesweeper Integration

- [ ] Update `complete_minesweeper_game` function to remove direct gidouille updates
- [ ] Add `record_game_reward()` call after successful completion
- [ ] Update tests to verify new flow
- [ ] Test race conditions (multiple victories in same second)

### 4. Riddles Integration

- [ ] Update `submit_riddle_attempt` function to remove direct gidouille updates
- [ ] Add `record_game_reward()` call after correct answer
- [ ] Update tests to verify new flow

### 5. Cron Job

- [ ] Add weekly bonus logic to `daily-summaries-and-rewards`
- [ ] Test week boundary calculation
- [ ] Verify bonus awards at correct time

### 6. Frontend

- [ ] Add "Today's reward earned" indicator (0 or 1 gidouille)
- [ ] Add "This week's best" display using `get_student_week_best()`
- [ ] Show "Weekly bonus pending" or "Bonus awarded" status
- [ ] Update reward explanation tooltips

### 7. Documentation

- [ ] Update `docs/architecture/database-schema.md`
- [ ] Update `docs/features/minesweeper-rewards-strategy-d.md`
- [ ] Create `docs/features/daily-weekly-reward-limits.md`

---

## Testing Strategy

### Unit Tests

1. **calculate_week_boundaries()**

   - Test with different first_day values (0=Sunday, 1=Monday)
   - Verify boundary calculation for all days of week

2. **record_game_reward()**

   - Test first win of day → actual_reward = 1
   - Test second win of day → actual_reward = 0
   - Test concurrent victories (race condition)
   - Test weekly best update (should keep MAX)
   - Verify gidouilles_history insertion

3. **award_weekly_best_bonuses()**
   - Test with multiple students
   - Test with students having different best rewards
   - Test idempotency (calling twice should not double award)

### Integration Tests

1. **Minesweeper Flow**

   - Complete game → verify daily_game_rewards insertion
   - Complete second game same day → verify actual_reward = 0
   - Complete better game → verify weekly_best_rewards update

2. **Riddles Flow**

   - Solve riddle → verify daily_game_rewards insertion
   - Solve after Minesweeper → verify actual_reward = 0 (daily limit shared)

3. **Weekly Bonus Flow**
   - Play games throughout week
   - Run cron at week end
   - Verify bonus awarded = best theoretical reward

---

## Rollback Plan

If issues occur:

```sql
-- Rollback commands
DROP TABLE IF EXISTS public.daily_game_rewards CASCADE;
DROP TABLE IF EXISTS public.weekly_best_rewards CASCADE;
DROP FUNCTION IF EXISTS public.record_game_reward CASCADE;
DROP FUNCTION IF EXISTS public.award_weekly_best_bonuses CASCADE;
DROP FUNCTION IF EXISTS public.get_student_week_best CASCADE;
DROP FUNCTION IF EXISTS public.calculate_week_boundaries CASCADE;
```

Then restore direct gidouille updates in `complete_minesweeper_game` and `submit_riddle_attempt`.

---

## Performance Considerations

### Indexes Created

- `idx_daily_game_rewards_student_date` - Fast lookup for "first win of day" check
- `idx_daily_game_rewards_week` - Weekly aggregations
- `idx_daily_game_rewards_first_win_check` - Optimized with WHERE clause
- `idx_weekly_best_rewards_pending` - Fast cron job queries

### FOR UPDATE Lock

`record_game_reward()` uses `FOR UPDATE` to prevent race conditions. This means:

- Concurrent calls for same student + same date will be serialized
- Performance impact: minimal (lock held for ~10ms)
- Alternative considered: unique constraint with ON CONFLICT (rejected due to business logic complexity)

### Expected Load

- Daily game rewards: ~1000 students × 2 games/day = 2000 inserts/day
- Weekly best rewards: ~1000 students × 1 upsert/day = 1000 upserts/day
- Bonus awards: ~1000 students × 1 update/week = ~150 updates/day

**Verdict:** Well within Supabase free tier limits.

---

## Security Model

### RLS Policies

- **Students:** Can only view/insert their own rewards
- **Teachers:** Can view their students' rewards
- **Admins:** Full access

### Function Security

- `record_game_reward()`: SECURITY DEFINER, checks `auth.uid() = p_student_id`
- `award_weekly_best_bonuses()`: SECURITY DEFINER, checks admin role
- `get_student_week_best()`: SECURITY DEFINER, checks permission

### Audit Trail

All gidouille changes logged in `gidouilles_history`:

- `reason = 'daily_game_reward:minesweeper'` - Daily game reward
- `reason = 'weekly_best_game_bonus'` - Weekly bonus

---

## Known Limitations

1. **Timezone changes:** If school changes timezone mid-week, week boundaries may shift

   - **Mitigation:** Document that timezone changes require manual bonus adjustment

2. **Game_id references:** No foreign key constraint (games may be from different tables)

   - **Mitigation:** Application-level validation ensures valid game_id

3. **Decimal gidouilles:** Uses NUMERIC(10,2) for future-proofing
   - **Current:** All rewards are integers
   - **Future:** May introduce fractional rewards

---

## Next Steps

1. **Deploy migration:** `pnpm db:migrate`
2. **Update types:** `src/lib/types/database.ts`
3. **Integrate Minesweeper:** Update `complete_minesweeper_game` calls
4. **Integrate Riddles:** Update `submit_riddle_attempt` calls
5. **Test thoroughly:** Unit + integration tests
6. **Deploy cron job:** Add weekly bonus logic
7. **Update frontend:** Display daily/weekly progress
8. **Document:** Update all relevant docs

---

## Questions?

If you encounter issues:

1. Check `gidouilles_history` for audit trail
2. Query `daily_game_rewards` for daily limit status
3. Query `weekly_best_rewards` for weekly progress
4. Verify RLS policies with `EXPLAIN` queries
5. Check function permissions in Supabase Dashboard
