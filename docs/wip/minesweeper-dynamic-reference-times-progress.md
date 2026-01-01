# Minesweeper Dynamic Reference Times - Progress Document

## Overview

Implementation of dynamic reference times for Minesweeper reward calculation, segmented by French pedagogical cycles.

**Plan file**: `/Users/david/.claude/plans/agile-twirling-donut.md`

---

## Phase 1: Types TypeScript - COMPLETED

**Status**: Done
**Commit**: Previous session

### Files modified/created:

- `src/lib/types/grades.ts` - Added cycles system
- `src/lib/types/grades.test.ts` - 34 tests, all passing

### Key additions:

- `CycleInfo` interface
- `CYCLES` constant with 5 cycles (cycle_2 through cycle_terminal)
- `CycleCode` type
- `CYCLE_CODES` array
- `getCycleForGrade()` function

---

## Phase 2: Migration SQL - IN PROGRESS

**Status**: In progress (awaiting migration application)

### Files created:

- `supabase/migrations/20260101112639_create_minesweeper_reference_times.sql`
- `tests/database/test_minesweeper_reference_times.sql`

### Tables created:

1. `minesweeper_reference_times` (main table with RLS)

   - Primary key: (cycle, difficulty)
   - Columns: reference_time, fallback_time, min_bound, max_bound, min_samples, sample_count, calculated_at
   - RLS: Anyone can SELECT, only service_role can write

2. `minesweeper_reference_times_history` (for rollback/analysis)
   - RLS: Only admins can SELECT

### Functions created:

1. `get_cycle_for_grade(TEXT)` - IMMUTABLE, maps grade to cycle
2. `get_minesweeper_reference_time(TEXT, TEXT)` - STABLE, returns appropriate time
3. `recalculate_minesweeper_reference_times()` - SECURITY DEFINER, weekly recalculation

### Seed data:

15 rows (5 cycles × 3 difficulties) with initial values:

| Cycle          | Beginner       | Intermediate    | Expert           |
| -------------- | -------------- | --------------- | ---------------- |
| cycle_2        | 240s [120-480] | 900s [450-1800] | 1800s [900-3600] |
| cycle_3        | 180s [90-360]  | 600s [300-1200] | 1200s [600-2400] |
| cycle_4        | 150s [75-300]  | 500s [250-1000] | 1000s [500-2000] |
| seconde        | 120s [60-240]  | 420s [210-840]  | 900s [450-1800]  |
| cycle_terminal | 100s [50-200]  | 360s [180-720]  | 780s [390-1560]  |

### Code review improvements applied:

1. **Fix 1 (Must fix)**: `get_minesweeper_reference_time()` now raises explicit exception for invalid cycle/difficulty
2. **Fix 2 (Should fix)**: Optimized nested loops → single query loop (15 rows)
3. **Fix 3 (Should fix)**: Added partial index `idx_minesweeper_games_recalc` for query optimization

### Next steps:

1. **User applies migration**: `pnpm db:migrate`
2. Run SQL tests manually or via `pnpm test:triggers`
3. Commit Phase 2 changes

---

## Remaining Phases

| Phase | Description                                      | Status  |
| ----- | ------------------------------------------------ | ------- |
| 3     | Modify `calculate_minesweeper_gidouilles()`      | Pending |
| 4     | Modify `complete_minesweeper_game()` (breakdown) | Pending |
| 5     | Modify `calculate_daily_challenge_gidouilles()`  | Pending |
| 6     | Integrate CRON (Sundays)                         | Pending |
| 7     | Regenerate TypeScript types                      | Pending |
| 8     | Final tests and quality checks                   | Pending |

---

## Key Decisions

1. **No gidouilles for players without grade** - Incentive to set their level
2. **Weekly recalculation** (Sundays) using 4-week median
3. **Bounds** prevent manipulation (min/max per cycle/difficulty)
4. **History table** for analysis and potential rollback
5. **SECURITY DEFINER** only for CRON-called functions, RLS for table access

---

## Recovery Information

If session crashes, resume from:

- Check Phase 2 completion status (migration applied?)
- Continue with Phase 3 if Phase 2 complete

Last updated: 2026-01-01
