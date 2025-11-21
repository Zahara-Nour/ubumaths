# Reward Journal Implementation Tracking

**Started**: 2025-11-21
**Status**: In Progress
**Branch**: feature/audit-trail

## Overview

Implementation of a unified reward events tracking system (journal) for students and teachers.

## Implementation Progress

### Phase 1: Database Schema - Table `reward_events`
**Status**: COMPLETED (pending push)
**Agent**: supabase-expert (opus)

#### Files Created/Modified:
- `supabase/migrations/20251121115959_create_reward_events_table.sql`

#### What was implemented:
1. **Table `reward_events`** with columns:
   - `id` UUID primary key
   - `student_id` UUID (references profiles)
   - `reward_type` ENUM (gidouilles, bonus, vip_card, achievement, item)
   - `event_type` ENUM (earned, spent, traded, used, expired, unlocked, purchased, awarded, removed)
   - `amount` INTEGER (for currency rewards)
   - `item_name` TEXT (display name)
   - `description` TEXT (French, human-readable)
   - `metadata` JSONB
   - `source_table` TEXT (traceability)
   - `source_id` UUID
   - `class_id` UUID (for teacher filtering)
   - `created_by` UUID
   - `created_at` TIMESTAMPTZ

2. **Indexes**:
   - `idx_reward_events_student_time` (student_id, created_at DESC)
   - `idx_reward_events_student_type_time` (student_id, reward_type, created_at DESC)
   - `idx_reward_events_class_time` (class_id, created_at DESC)
   - `idx_reward_events_source_lookup` (source_table, source_id, student_id)
   - `idx_reward_events_event_type` (event_type, created_at DESC)

3. **RLS Policies**:
   - Students can view their own events
   - Teachers can view events for students in their classes (uses `is_class_teacher()`)
   - Admins can view all events (uses `is_admin()`)
   - Only service_role can INSERT (via triggers)

4. **Triggers** for 7 source tables:
   - `gidouilles_history` -> log_gidouilles_history_to_events()
   - `bonus_history` -> log_bonus_history_to_events()
   - `vip_cards_activity` -> log_vip_cards_to_events()
   - `student_achievements` -> log_achievements_to_events()
   - `shop_purchase_history` -> log_shop_purchases_to_events()
   - `item_usage_log` -> log_item_usage_to_events()
   - `marketplace_trades` -> log_marketplace_trades_to_events()

5. **Helper function**: `generate_reward_event_description()` for French descriptions

#### Design Decisions:
- Used existing helper functions (`is_admin()`, `is_class_teacher()`) for consistency
- Marketplace trades log both SENT and RECEIVED events for each participant
- Removed PII (partner names) from metadata - use JOINs at query time
- Source lookup index is NOT unique to allow multiple events per source (e.g., marketplace)
- All triggers use SECURITY DEFINER with proper search_path

#### Review Status:
- [x] Code Review completed - Issues fixed
- [x] Security Audit completed - Using helper functions
- [ ] Tests - Not yet created (database triggers)
- [ ] Documentation update pending

---

### Phase 2: Migration des donnees existantes
**Status**: PENDING
**Agent**: supabase-expert (opus)

---

### Phase 3: API Endpoints
**Status**: PENDING
**Agent**: backend-developer (sonnet)

Planned endpoints:
- `GET /api/rewards/journal` (student)
- `GET /api/rewards/journal/[studentId]` (teacher)

---

### Phase 4: Store Svelte
**Status**: PENDING
**Agent**: svelte-expert (sonnet)

Planned:
- `src/lib/stores/rewardJournal.svelte.ts`

---

### Phase 5: UI Student Journal
**Status**: PENDING
**Agent**: frontend-developer (sonnet)

Planned:
- `/dashboard/student/journal/+page.svelte`
- Components: RewardEventCard, RewardJournalFilters, RewardJournalTimeline

---

### Phase 6: UI Teacher Journal
**Status**: PENDING
**Agent**: frontend-developer (sonnet)

Planned:
- `/dashboard/teacher/students/[studentId]/journal/+page.svelte`

---

### Phase 7: Performance & Polish
**Status**: PENDING
**Agent**: performance-optimizer (sonnet)

---

### Phase 8: Documentation finale
**Status**: PENDING
**Agent**: documentation-writer (sonnet)

---

## Recovery Instructions

If implementation crashes, to resume:

1. Check this file for current phase status
2. Check git status: `git status`
3. Check if migration exists: `ls supabase/migrations/*reward_events*`
4. Resume from the next pending phase

### To verify Phase 1 completion:
```bash
# Check migration file exists
ls -la supabase/migrations/20251121115959_create_reward_events_table.sql

# Check it hasn't been pushed yet
pnpm db:migrate --dry-run
```

### To re-run Phase 1:
Delete the migration file and regenerate using supabase-expert agent with the same spec.

---

## Architecture Notes

### Why unified `reward_events` table?
- Single table for efficient pagination
- Triggers ensure automatic population
- RLS policies centralized
- Future real-time updates simpler

### Trigger flow:
```
[Source Table INSERT]
  -> [Trigger Function]
  -> [EXISTS check for dedup]
  -> [Generate French description]
  -> [INSERT into reward_events]
```

### Data flow for journal:
```
Student Dashboard -> GET /api/rewards/journal
  -> Query reward_events WHERE student_id = auth.uid()
  -> Return paginated events with filters
```
