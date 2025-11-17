# Phase 2 Execution Guide: Template Syntax Migration

**Document Version**: 1.0.0
**Last Updated**: 2025-11-17
**Status**: READY FOR EXECUTION
**Migration File**: `supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql`

> **CRITICAL**: This migration modifies the database. Follow all steps carefully.

---

## Executive Summary

**What**: Convert all 70+ question templates from Questions syntax to Markdown syntax
**Why**: Eliminate 5ms runtime conversion overhead, remove 600+ lines of adapter code
**Risk**: Low (automatic backup, quick rollback, tested logic)
**Duration**: ~2-5 seconds execution, 24h monitoring period
**Rollback**: One SQL command if needed

---

## Pre-Execution Checklist

Before starting, verify all these conditions:

### System Requirements
- [ ] **Docker Desktop**: Running and accessible
- [ ] **Supabase Local**: Can start successfully (`pnpm db:start`)
- [ ] **Database Access**: Can connect to local Supabase (port 54321)
- [ ] **Disk Space**: At least 100MB free (for backup table)

### Code State
- [ ] **Git Status**: Working directory clean (no uncommitted changes)
- [ ] **Branch**: On `main` branch or feature branch
- [ ] **Migration File**: `20251117120527_unify_template_syntax_to_markdown.sql` exists
- [ ] **Test Script**: `scripts/test-question-generation.ts` exists

### Documentation Ready
- [ ] **Read**: `.claude/migration-progress-phase2.md` (detailed guide)
- [ ] **Read**: This file (execution checklist)
- [ ] **Understand**: Rollback procedure (see below)

### Time Considerations
- [ ] **Time Available**: At least 1 hour for execution + testing
- [ ] **Low Traffic Period**: Ideally run when fewer users are active
- [ ] **Monitoring Window**: Can monitor for 24 hours after execution

---

## Step-by-Step Execution

### Step 1: Start Supabase Local

**Purpose**: Initialize local database for testing

```bash
# Start Supabase containers
pnpm db:start

# Wait for startup (usually 30-60 seconds)
# You should see: "Started supabase local development setup."
```

**Verification**:
```bash
# Check containers are running
docker ps | grep supabase

# Expected:
# - supabase-db (PostgreSQL)
# - supabase-studio
# - supabase-kong
# - supabase-auth
```

**If this fails**:
- Check Docker Desktop is running
- Run `docker system prune` if disk space issues
- Check ports 54321-54324 are not in use
- See troubleshooting section below

---

### Step 2: Run Pre-Migration Tests

**Purpose**: Validate that question generation currently works

```bash
# Run test script
node --import tsx scripts/test-question-generation.ts
```

**Expected Output**:
```
============================================================
Question Generation Test Suite
Testing Markdown syntax after migration
============================================================

Fetching question templates...
✅ Found 70 templates

============================================================
Testing Question Type: numerical_exact
============================================================
...
✅ Template [id] - ALL TESTS PASSED
...

============================================================
Test Summary
============================================================
Total Templates Tested: 6
Passed: 6
Failed: 0
Success Rate: 100.0%

✅ ALL TESTS PASSED - Question generation works correctly!
```

**If tests fail**:
- **DO NOT PROCEED** with migration
- Review error messages
- Check if templates already migrated
- Verify Supabase connection
- See troubleshooting section

**If tests pass**:
- ✅ Proceed to Step 3

---

### Step 3: Execute the Migration

**Purpose**: Convert all templates to Markdown syntax

**CRITICAL**: This step modifies the database

```bash
# Option A: Via Supabase CLI (RECOMMENDED)
pnpm db:migrate

# Option B: Direct SQL execution (if CLI fails)
psql -h localhost -p 54322 -U postgres -d postgres \
  -f supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql
```

**Expected Output (Option A)**:
```
Applying migration 20251117120527_unify_template_syntax_to_markdown...
✅ Migration applied successfully
```

**Expected Output (Option B)**:
```
BEGIN
CREATE TABLE
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
...
UPDATE [row count]
INSERT 1
COMMIT
```

**What Happens During Migration**:
1. Creates backup table: `question_templates_backup_20251117`
2. Creates conversion functions (3 PL/pgSQL functions)
3. Converts all templates (statement, variables, answer, choices, correction)
4. Records migration in `migration_metadata` table
5. Creates performance indexes
6. Total duration: ~2-5 seconds

**If migration fails**:
- Don't panic - backup was created automatically
- Note the error message
- See rollback section below
- Contact team with error details

**If migration succeeds**:
- ✅ Proceed to Step 4

---

### Step 4: Validate Migration Success

**Purpose**: Verify conversion completed successfully

#### A. Check Migration Status

```sql
-- Connect to database
psql -h localhost -p 54322 -U postgres -d postgres

-- Query migration status
SELECT
  migration_name,
  status,
  rows_affected,
  started_at,
  completed_at,
  error_message
FROM migration_metadata
WHERE migration_name = 'unify_template_syntax_to_markdown'
ORDER BY started_at DESC LIMIT 1;
```

**Expected Result**:
```
 migration_name              | status    | rows_affected | started_at | completed_at | error_message
-----------------------------+-----------+---------------+------------+--------------+--------------
 unify_template_syntax_to... | completed | {"updated":70}| [time]     | [time]       | NULL
```

**Required**:
- `status` = `'completed'`
- `error_message` = `NULL`
- `rows_affected` shows updated count

**If status is 'failed'**:
- Check `error_message` field
- See rollback section
- Do not proceed

---

#### B. Verify No Old Syntax Remains

```sql
-- Check for Questions syntax
SELECT COUNT(*) AS old_syntax_count
FROM question_templates
WHERE statement::TEXT LIKE '%{@:%'
   OR statement::TEXT LIKE '%{#:%'
   OR variables::TEXT LIKE '%{@:%'
   OR variables::TEXT LIKE '%{#:%';
```

**Expected Result**:
```
 old_syntax_count
------------------
                0
```

**Required**: Count MUST be 0

**If count > 0**:
- Migration incomplete
- Check error logs
- Consider rollback

---

#### C. Inspect Converted Templates

```sql
-- View sample converted templates
SELECT
  id,
  type,
  left(statement::TEXT, 100) AS statement_preview,
  left(variables::TEXT, 100) AS variables_preview
FROM question_templates
LIMIT 5;
```

**Expected**: Should see `{{var}}`, `{{1-10}}`, `{{eval:expr}}` patterns

**Look for**:
- `{{varName}}` instead of `{@:varName}`
- `{{1-10}}` instead of `{#:1-10}`
- `{{eval:expr}}` instead of `{eval:expr}` (unchanged)

---

#### D. Verify Backup Exists

```sql
-- Check backup table
SELECT COUNT(*) AS backup_count
FROM question_templates_backup_20251117;
```

**Expected**: Should equal original template count (~70)

**Required**: Backup exists and has correct row count

---

### Step 5: Test Application

**Purpose**: Ensure questions generate correctly after migration

#### A. Re-run Test Script

```bash
node --import tsx scripts/test-question-generation.ts
```

**Expected**: Same as Step 2 - all tests should pass

**Required**:
- Success Rate: 100%
- No "unresolved variables" errors
- All question types work

---

#### B. Manual Testing (Optional but Recommended)

```bash
# Start development server
pnpm dev -- --port 5175

# Navigate to question creation page
# http://localhost:5175/questions/create

# Create a test question with variables
# Preview the question
# Verify variables are resolved (not showing as {{var}})
```

**Check**:
- Variables show actual values (e.g., "7" not "{{a}}")
- Random values generate correctly
- Preview doesn't show raw syntax

---

### Step 6: Monitor for Issues

**Purpose**: Catch any edge cases not covered by tests

#### First Hour
- [ ] Check application error logs
- [ ] Test question generation from UI
- [ ] Verify no user reports of issues
- [ ] Monitor database for errors

#### First 24 Hours
- [ ] Question generation success rate = 100%
- [ ] No template-related errors in logs
- [ ] Performance metrics stable or improved
- [ ] No regression reports from users

#### First Week
- [ ] Stable operation confirmed
- [ ] Ready to remove adapter (Phase 3)
- [ ] Consider archiving backup

---

## Validation Queries

Quick reference for validation:

```sql
-- 1. Migration status
SELECT status, error_message
FROM migration_metadata
WHERE migration_name = 'unify_template_syntax_to_markdown'
ORDER BY started_at DESC LIMIT 1;

-- 2. No old syntax
SELECT COUNT(*) FROM question_templates
WHERE statement::TEXT LIKE '%{@:%' OR statement::TEXT LIKE '%{#:%';
-- Must return: 0

-- 3. Backup exists
SELECT COUNT(*) FROM question_templates_backup_20251117;
-- Should return: ~70

-- 4. Sample templates
SELECT id, type, statement
FROM question_templates
ORDER BY created_at DESC LIMIT 3;
-- Should show {{var}} syntax

-- 5. Conversion functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%markdown%' OR routine_name LIKE '%rollback%';
-- Should return: 4 functions
```

---

## Rollback Procedure

### When to Rollback

Rollback if:
- Migration status = 'failed'
- Old syntax still exists (validation query shows count > 0)
- Test script fails after migration
- Application shows template errors
- Any unexpected behavior

### Quick Rollback (Within 1 Hour)

**Option A: Use Rollback Function** (RECOMMENDED)

```sql
-- Connect to database
psql -h localhost -p 54322 -U postgres -d postgres

-- Execute rollback
SELECT rollback_template_syntax_migration();

-- Expected output:
-- rollback_template_syntax_migration
-- -----------------------------------
-- Rollback completed successfully
```

**What this does**:
1. Truncates `question_templates` table
2. Restores from `question_templates_backup_20251117`
3. Updates migration status to 'rolled_back'
4. Preserves backup for investigation

---

**Option B: Manual Rollback** (if function fails)

```sql
BEGIN;

-- Restore from backup
TRUNCATE question_templates;
INSERT INTO question_templates
SELECT * FROM question_templates_backup_20251117;

-- Update migration status
UPDATE migration_metadata
SET status = 'rolled_back',
    error_message = 'Manual rollback performed'
WHERE migration_name = 'unify_template_syntax_to_markdown'
  AND status = 'completed';

COMMIT;
```

---

### Verify Rollback Success

```sql
-- Check old syntax is back
SELECT COUNT(*) FROM question_templates
WHERE statement::TEXT LIKE '%{@:%' OR statement::TEXT LIKE '%{#:%';
-- Should return: ~70 (original count)

-- Check migration status
SELECT status FROM migration_metadata
WHERE migration_name = 'unify_template_syntax_to_markdown'
ORDER BY started_at DESC LIMIT 1;
-- Should return: 'rolled_back'
```

---

### After Rollback

1. **Adapter Still Works**: Syntax adapter continues functioning
2. **No Data Loss**: All templates restored to original state
3. **Investigate**: Review error logs to understand what went wrong
4. **Report**: Share error details with team
5. **Fix & Retry**: Address issue, then retry migration when ready

---

## Post-Execution Tasks

### Immediately After Migration (Within 1 Hour)

- [ ] All validation queries passed
- [ ] Test script passes (100% success rate)
- [ ] Application tested manually
- [ ] No errors in logs
- [ ] Document completion time

### Day 1 Monitoring

- [ ] Check error logs hourly
- [ ] Monitor question generation success rate
- [ ] Watch for user reports of issues
- [ ] Verify performance metrics
- [ ] Document any anomalies

### Week 1 Validation

- [ ] Stable operation confirmed (no issues)
- [ ] Performance improved or stable
- [ ] No regression reports
- [ ] Ready to proceed to Phase 3
- [ ] Document success

### Week 2+ Cleanup

- [ ] Archive backup to cold storage (optional)
- [ ] Consider dropping backup table (after 1 month)
- [ ] Remove conversion functions (optional, keep for reference)
- [ ] Proceed to Phase 3: Remove syntax adapter

---

## Troubleshooting

### Issue: Docker Won't Start

**Symptoms**: `pnpm db:start` fails, Docker errors

**Solutions**:
1. Check Docker Desktop is running
2. Restart Docker Desktop
3. Run `docker system prune -a` (WARNING: removes all unused containers)
4. Check disk space (need at least 5GB free)
5. Reboot computer if all else fails

---

### Issue: Test Script Fails Before Migration

**Symptoms**: Tests fail in Step 2, before migration executed

**Solutions**:
1. Check Supabase is running: `docker ps | grep supabase`
2. Check database has templates: `SELECT COUNT(*) FROM question_templates;`
3. Check syntax adapter is working (should be in current code)
4. Review test error messages for clues
5. If templates already migrated: Skip to Step 4 (validation)

---

### Issue: Migration Fails (Status = 'failed')

**Symptoms**: Step 4A shows `status = 'failed'`

**Solutions**:
1. Check `error_message` field in `migration_metadata`
2. If syntax error: Verify PL/pgSQL functions use `:=` not `=`
3. If permission error: Check database user has CREATE TABLE rights
4. Rollback using procedure above
5. Fix issue and retry migration

---

### Issue: Old Syntax Still Exists After Migration

**Symptoms**: Step 4B shows count > 0

**Solutions**:
1. Check migration actually ran: `SELECT * FROM migration_metadata`
2. Check for edge cases: Templates with unusual syntax
3. Run conversion manually on affected templates
4. Consider rollback if many templates affected
5. Contact team with affected template IDs

---

### Issue: Test Script Fails After Migration

**Symptoms**: Step 5A shows test failures

**Solutions**:
1. Check which templates are failing
2. Inspect failed templates for conversion issues
3. Check if it's a test script issue vs actual problem
4. Try manual testing (Step 5B)
5. If widespread: Consider rollback
6. If isolated: May be acceptable to fix templates manually

---

### Issue: Application Shows Unresolved Variables

**Symptoms**: Questions show `{{var}}` instead of values

**Possible Causes**:
1. Frontend cached old data (refresh browser)
2. Adapter interfering with resolved values (shouldn't happen)
3. Conversion incomplete (check validation queries)
4. Bug in shared library (unlikely)

**Solutions**:
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear application cache
3. Check database templates are actually converted
4. Test with fresh question generation
5. If persistent: Rollback and investigate

---

## Success Metrics

### Immediate Success (Within 1 Hour)

✅ **Pass**: All these conditions met
- Migration status = 'completed'
- Old syntax count = 0
- Backup exists with correct row count
- Test script: 100% pass rate
- No application errors
- Manual testing successful

❌ **Fail**: Any of these occur
- Migration status = 'failed'
- Old syntax remains (count > 0)
- Test script fails
- Application errors
- Users report issues

---

### Day 1 Success (24 Hours)

✅ **Pass**:
- Question generation success rate = 100%
- Zero template-related errors in logs
- No user-reported issues
- Performance metrics stable or improved

---

### Week 1 Success (Validation Period)

✅ **Pass**:
- No regressions discovered
- Stable operation confirmed
- Ready to proceed to Phase 3
- Team approves adapter removal

---

## Next Steps After Successful Migration

### Phase 3 Planning (After Week 1 Validation)

Once Phase 2 is confirmed successful:

1. **Remove Syntax Adapter** (Phase 3)
   - Remove `syntax-adapter.ts` (300 lines)
   - Remove `syntax-adapter.test.ts` (464 lines)
   - Update `variable-resolver.ts` (remove adapter calls)
   - Update `content-resolver.ts` (remove adapter calls)
   - Update documentation

2. **Cleanup Database**
   - Archive backup: `pg_dump question_templates_backup_20251117`
   - Drop backup table after 1 month: `DROP TABLE question_templates_backup_20251117`
   - Remove conversion functions (optional, can keep for reference)

3. **Update Documentation**
   - Mark Phase 2 as COMPLETED
   - Update architecture docs
   - Remove adapter references from guides
   - Document performance improvements

---

## Contact & Support

### If You Need Help

1. **Review Documentation**:
   - This guide (`.claude/PHASE2-EXECUTION-GUIDE.md`)
   - `.claude/migration-progress-phase2.md`
   - `.claude/template-system-status.md`

2. **Check Migration Logs**:
   ```sql
   SELECT * FROM migration_metadata
   WHERE migration_name = 'unify_template_syntax_to_markdown';
   ```

3. **Use Rollback**: Don't hesitate to rollback if unsure
   - Better safe than sorry
   - Rollback is quick and safe
   - Can always retry after investigation

4. **Document Issues**: Capture error messages, logs, and context

---

## Final Checklist

Before marking Phase 2 as COMPLETE:

- [ ] Migration executed successfully
- [ ] All validation queries passed
- [ ] Test script: 100% pass rate
- [ ] Application tested manually
- [ ] No errors in logs (24 hours)
- [ ] Performance metrics confirmed
- [ ] Backup exists and verified
- [ ] Rollback procedure tested (optional)
- [ ] Documentation updated
- [ ] Team notified of success
- [ ] Ready for Phase 3 planning

---

**END OF EXECUTION GUIDE**

For questions or issues, refer to:
1. This guide for execution steps
2. `.claude/migration-progress-phase2.md` for detailed migration info
3. `.claude/template-system-status.md` for overall project status
4. Migration logs in `migration_metadata` table
