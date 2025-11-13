# Breaking Changes Checklist - Phase 1 Migrations

**Date**: 2025-11-13
**Status**: ⚠️ ACTION REQUIRED - Codebase Updates Needed

---

## Breaking Function Signature Changes

### 1. update_student_gidouilles() - Class ID Now Required

**Old Signature**:
```sql
update_student_gidouilles(p_student_id, p_delta, p_reason, p_created_by)
```

**New Signature**:
```sql
update_student_gidouilles(p_student_id, p_class_id, p_delta, p_reason, p_created_by)
                                        ^^^^^^^^^^^^^ NEW REQUIRED PARAMETER
```

**Search Commands**:
```bash
# Search TypeScript/JavaScript files
grep -r "update_student_gidouilles" src/ --include="*.ts" --include="*.js" --include="*.svelte"

# Search with context
grep -r -A 5 -B 5 "update_student_gidouilles" src/
```

**Expected Call Pattern**:
```typescript
// BEFORE (will break)
await supabase.rpc('update_student_gidouilles', {
    p_student_id: studentId,
    p_delta: delta,
    p_reason: reason
});

// AFTER (required)
await supabase.rpc('update_student_gidouilles', {
    p_student_id: studentId,
    p_class_id: classId,  // ⚠️ NEW REQUIRED
    p_delta: delta,
    p_reason: reason
});
```

**Files to Check**:
- [ ] `src/routes/api/students/[studentId]/gidouilles/+server.ts`
- [ ] `src/lib/server/gamification.ts` (if exists)
- [ ] Any homework completion handlers
- [ ] Any teacher dashboard actions
- [ ] Weekly reward processing code

---

### 2. update_student_bonus() - Class ID Now Required

**Old Signature**:
```sql
update_student_bonus(p_student_id, p_delta, p_reason, p_created_by)
```

**New Signature**:
```sql
update_student_bonus(p_student_id, p_class_id, p_delta, p_reason, p_created_by)
                                    ^^^^^^^^^^^^^ NEW REQUIRED PARAMETER
```

**Search Commands**:
```bash
# Search TypeScript/JavaScript files
grep -r "update_student_bonus" src/ --include="*.ts" --include="*.js" --include="*.svelte"

# Search with context
grep -r -A 5 -B 5 "update_student_bonus" src/
```

**Expected Call Pattern**:
```typescript
// BEFORE (will break)
await supabase.rpc('update_student_bonus', {
    p_student_id: studentId,
    p_delta: delta,
    p_reason: reason
});

// AFTER (required)
await supabase.rpc('update_student_bonus', {
    p_student_id: studentId,
    p_class_id: classId,  // ⚠️ NEW REQUIRED
    p_delta: delta,
    p_reason: reason
});
```

**Files to Check**:
- [ ] `src/routes/api/students/[studentId]/bonus/+server.ts`
- [ ] Homework bonus award handlers
- [ ] Teacher dashboard actions
- [ ] Any bonus manipulation code

---

### 3. process_weekly_rewards() - Optional Class Filter (Backward Compatible)

**Old Signature**:
```sql
process_weekly_rewards(p_week_start, p_week_end)
```

**New Signature**:
```sql
process_weekly_rewards(p_week_start, p_week_end, p_class_ids DEFAULT NULL)
                                                  ^^^^^^^^^^^^^^^^^^^^^^^ OPTIONAL
```

**Search Commands**:
```bash
# Search for cron job or weekly reward processing
grep -r "process_weekly_rewards" src/ --include="*.ts" --include="*.js"
```

**No Breaking Changes** - Old calls still work:
```typescript
// BOTH WORK
await supabase.rpc('process_weekly_rewards', {
    p_week_start: weekStart,
    p_week_end: weekEnd
});

// NEW OPTIONAL PARAMETER
await supabase.rpc('process_weekly_rewards', {
    p_week_start: weekStart,
    p_week_end: weekEnd,
    p_class_ids: [classId1, classId2]  // Optional filter
});
```

**Files to Check**:
- [ ] Cron job endpoints (e.g., `/api/cron/weekly-rewards`)
- [ ] Admin tools for manual reward processing

---

## Validation Changes (May Break Existing Calls)

### 1. Delta Bounds Validation

**New Validation** in `update_student_gidouilles()` and `update_student_bonus()`:

```sql
IF p_delta < -10000 OR p_delta > 10000 THEN
    RAISE EXCEPTION 'Invalid delta: must be between -10000 and 10000, got %', p_delta;
END IF;
```

**Impact**:
- Any call trying to award/remove > 10,000 points at once will fail
- Probably not an issue (10k is very large)

**Files to Check**:
- [ ] Teacher bulk operations
- [ ] Admin tools
- [ ] Any large point awards (contests, etc.)

---

### 2. Reason Required for Large Changes

**New Validation** in `update_student_gidouilles()` and `update_student_bonus()`:

```sql
IF (ABS(p_delta) > 100) AND (p_reason IS NULL OR p_reason = '') THEN
    RAISE EXCEPTION 'Reason required for large point changes (|delta| = %)', ABS(p_delta);
END IF;
```

**Impact**:
- Any call with |delta| > 100 MUST provide a reason
- Empty string '' is not valid
- NULL is not valid

**Files to Check**:
- [ ] Large point award handlers
- [ ] Weekly rewards (should already have reason)
- [ ] Teacher manual adjustments > 100 points

**Example Fix**:
```typescript
// BEFORE (may break if delta > 100)
await supabase.rpc('update_student_gidouilles', {
    p_student_id: studentId,
    p_class_id: classId,
    p_delta: 200  // > 100
    // p_reason missing or empty
});

// AFTER (required)
await supabase.rpc('update_student_gidouilles', {
    p_student_id: studentId,
    p_class_id: classId,
    p_delta: 200,
    p_reason: 'Contest winner'  // ✅ Required for delta > 100
});
```

---

## Authorization Changes (May Reveal Hidden Bugs)

### 1. Student Cannot Delete Own Warnings

**New Behavior**:
- `soft_delete_warning()` now rejects if caller is student
- Only teachers and admins can delete warnings

**Impact**:
- If any UI allowed students to delete warnings, it will now fail
- This is correct security behavior
- UI should already prevent this

**Files to Check**:
- [ ] Student warning list UI
- [ ] Student dashboard actions
- [ ] Any "remove warning" buttons (should be teacher-only)

---

### 2. Teacher Authorization Checks

**New Behavior**:
- All functions now verify teacher owns the class
- More strict than before (previously might have bypassed some checks)

**Impact**:
- May reveal existing authorization bugs
- Teachers trying to access other teachers' students will fail
- This is correct security behavior

**Files to Check**:
- [ ] All teacher dashboard actions
- [ ] Class switching logic
- [ ] Student context fetching

---

## Search Script

Save this as `search-breaking-changes.sh`:

```bash
#!/bin/bash

echo "=== Searching for breaking changes ==="
echo ""

echo "1. update_student_gidouilles calls:"
grep -r "update_student_gidouilles" src/ --include="*.ts" --include="*.js" --include="*.svelte" -n
echo ""

echo "2. update_student_bonus calls:"
grep -r "update_student_bonus" src/ --include="*.ts" --include="*.js" --include="*.svelte" -n
echo ""

echo "3. process_weekly_rewards calls:"
grep -r "process_weekly_rewards" src/ --include="*.ts" --include="*.js" --include="*.svelte" -n
echo ""

echo "4. soft_delete_warning calls:"
grep -r "soft_delete_warning" src/ --include="*.ts" --include="*.js" --include="*.svelte" -n
echo ""

echo "5. award_weekly_reward calls:"
grep -r "award_weekly_reward" src/ --include="*.ts" --include="*.js" --include="*.svelte" -n
echo ""

echo "=== Search complete ==="
```

Run with:
```bash
chmod +x search-breaking-changes.sh
./search-breaking-changes.sh
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run search script to find all function calls
- [ ] Update all `update_student_gidouilles()` calls to include `class_id`
- [ ] Update all `update_student_bonus()` calls to include `class_id`
- [ ] Verify reason is provided for large deltas (> 100)
- [ ] Test locally with `pnpm db:start` + `pnpm db:migrate`
- [ ] Run unit tests (`pnpm test:unit`)
- [ ] Manual test gamification flows

### Deployment

- [ ] Deploy migrations with `pnpm db:migrate`
- [ ] Monitor error logs for 1 hour
- [ ] Test one gamification action manually
- [ ] Verify cron jobs run successfully

### Post-Deployment

- [ ] Monitor for 24 hours
- [ ] Check error rates in monitoring
- [ ] Verify weekly rewards processed correctly
- [ ] Test teacher/student workflows

---

## Rollback Plan

If critical issues arise:

1. **Revert function signatures** (temporary fix):

```sql
-- Quick rollback for update_student_gidouilles
CREATE OR REPLACE FUNCTION public.update_student_gidouilles(
    p_student_id UUID,
    p_delta INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_class_id UUID;
BEGIN
    -- Fallback to old behavior
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = p_student_id
    LIMIT 1;

    -- Call new function with class_id
    RETURN public.update_student_gidouilles(
        p_student_id,
        v_class_id,  -- Use fallback
        p_delta,
        p_reason,
        p_created_by
    );
END;
$$;
```

2. **Deploy codebase fix**
3. **Remove rollback function** after fix deployed

---

## Estimated Impact

**Low Risk**:
- ✅ VIP card trigger optimization (no breaking changes)
- ✅ Weekly rewards optimization (backward compatible)
- ✅ Confusing logic fixes (no breaking changes)

**Medium Risk**:
- ⚠️ Function signature changes (requires codebase updates)
- ⚠️ Validation changes (may reject previously allowed calls)

**High Risk**:
- 🔴 Authorization checks (may reveal existing bugs)

**Overall**: Medium risk with clear mitigation path

---

## Support

If issues arise during deployment:

1. Check error logs first
2. Search for function name in error message
3. Verify `class_id` parameter is provided
4. Check validation rules (delta bounds, reason required)
5. Use rollback plan if needed

**Contact**: Supabase expert agent for database issues

---

**Last Updated**: 2025-11-13
**Status**: Ready for codebase search and updates
