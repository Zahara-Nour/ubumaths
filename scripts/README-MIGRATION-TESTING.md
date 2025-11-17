# Migration Testing Quick Start

## Overview

This directory contains comprehensive testing tools for the template syntax migration (Phase 2.2).

**Migration**: Convert all templates from Questions syntax to Markdown syntax
**Status**: ⏳ READY TO TEST (requires Docker)

---

## Quick Start

### 1. Prerequisites

```bash
# Ensure Docker Desktop is running
docker ps

# If not running, start Docker Desktop application
# Then verify: docker ps
```

### 2. Start Supabase

```bash
pnpm db:start

# Wait for Supabase to fully start (~30 seconds)
# Look for: "Started supabase local development setup."
```

### 3. Run All Tests

```bash
# Run automated test suite (38+ tests)
./scripts/run-all-migration-tests.sh
```

**Expected Duration**: 30-60 seconds

**Output**:

- ✅ **APPROVED - READY FOR PRODUCTION** (all tests pass)
- ⚠️ **APPROVED WITH CAUTION** (minor issues)
- ❌ **REJECTED - DO NOT PROCEED** (failures found)

### 4. Optional: Test Question Generation

```bash
# After migration dry-run, test question generation
node --import tsx scripts/test-question-generation.ts
```

---

## What Gets Tested

### Automated Test Suite (`run-all-migration-tests.sh`)

1. **Pre-Flight Checks** (5 checks)
   - Docker running
   - Supabase running
   - Database connection
   - Table exists
   - Seed data present

2. **Function Unit Tests** (13 tests)
   - Simple variable conversion
   - Hybrid variable conversion
   - Random expressions
   - Nested expressions
   - Eval expressions
   - Color references
   - Idempotence
   - NULL/empty handling

3. **Pre-Migration Analysis** (3 tests)
   - Count templates with Questions syntax
   - Verify no Markdown syntax yet
   - Inspect sample data

4. **Migration Dry Run** (5 tests)
   - Transaction-wrapped execution
   - Conversion completeness
   - Rollback verification

5. **Edge Cases** (6 tests)
   - NULL handling
   - Empty strings
   - Idempotence
   - LaTeX interference
   - Nested expressions
   - Complex eval

6. **Performance Testing** (2 tests)
   - Single template conversion speed
   - Full migration time estimate

7. **Backup & Rollback** (3 tests)
   - Backup table creation
   - Rollback function exists
   - Data restoration

**Total**: 38+ automated tests

### Question Generation Tests (`test-question-generation.ts`)

Tests all 6 question types:

- numerical_exact
- numerical_decimal
- numerical_rounded
- algebraic_transform
- multiple_choice
- open_ended

Validates:

- Variable resolution
- Statement rendering
- Answer computation
- No unresolved syntax
- LaTeX rendering

---

## Files in This Directory

### Test Scripts

- **`run-all-migration-tests.sh`** - Main automated test runner (run this!)
- **`test-template-migration.sql`** - 13 unit tests for conversion functions
- **`test-question-generation.ts`** - Post-migration question generation tests

### Documentation

- **`comprehensive-migration-test.md`** - Complete test plan (80+ pages)
- **`MIGRATION-TEST-REPORT.md`** - Test results report (auto-updated)
- **`README-MIGRATION-TESTING.md`** - This file (quick start guide)

### Migration Files

- **`../supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql`** - The migration
- **`../docs/migrations/phase2-template-syntax-unification.md`** - Migration documentation

---

## Interpreting Results

### ✅ All Tests Pass

**Output will show**:

```
========================================
✓ APPROVED - READY FOR PRODUCTION
========================================

All tests passed successfully!

Next steps:
1. Review test results above
2. Create production database backup
3. Schedule maintenance window
4. Execute migration: pnpm db:migrate
5. Monitor for 24 hours
```

**Action**: Safe to proceed with production migration

### ⚠️ Approved with Caution

**Output will show**:

```
========================================
⚠ APPROVED WITH CAUTION
========================================

Most tests passed but some issues found.
Review failures carefully before proceeding.
```

**Action**: Review failures, assess risk, consider fixing before proceeding

### ❌ Tests Failed

**Output will show**:

```
========================================
✗ REJECTED - DO NOT PROCEED
========================================

Too many test failures. Do not run migration.

Actions required:
1. Review failed tests above
2. Fix conversion functions
3. Re-run tests until all pass
```

**Action**: DO NOT proceed with migration. Fix issues first.

---

## Common Issues

### "Docker is not running"

**Problem**: Docker Desktop not started
**Solution**:

```bash
# Start Docker Desktop application
# Wait for it to fully start
# Then re-run tests
```

### "Supabase is not running"

**Problem**: Supabase local not started
**Solution**:

```bash
pnpm db:start
# Wait ~30 seconds for full startup
# Then re-run tests
```

### "No templates found in database"

**Problem**: Seed data not loaded
**Solution**:

```bash
# Apply all migrations including seed data
pnpm db:migrate
# Then re-run tests
```

### "Cannot connect to database"

**Problem**: Supabase not fully started or port conflict
**Solution**:

```bash
# Stop and restart Supabase
pnpm db:stop
pnpm db:start
# Wait for full startup
# Then re-run tests
```

---

## Manual Testing (Alternative)

If automated tests fail to run, you can test manually:

### 1. Test Conversion Functions

```bash
psql -h localhost -p 54322 -U postgres -d postgres -f scripts/test-template-migration.sql
```

Look for: "All tests passed!"

### 2. Check Current Data

```bash
psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT COUNT(*) as total_templates,
       COUNT(*) FILTER (WHERE statement::TEXT LIKE '%{@:%') as questions_syntax
FROM question_templates;
"
```

### 3. Dry Run Migration

```bash
# Create transaction-wrapped version
sed '/^COMMIT;/d' supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql > /tmp/migration-test.sql
echo "ROLLBACK;" >> /tmp/migration-test.sql

# Run in transaction (will rollback)
psql -h localhost -p 54322 -U postgres -d postgres < /tmp/migration-test.sql
```

### 4. Verify Rollback

```bash
psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT COUNT(*) FROM question_templates
WHERE statement::TEXT LIKE '%{@:%';
"
```

Should return same count as step 2.

---

## After Tests Complete

### If Tests Pass

1. **Review Results**
   - Check `scripts/MIGRATION-TEST-REPORT.md`
   - Verify all test suites passed

2. **Production Readiness**
   - Create production database backup
   - Schedule maintenance window (5-10 minutes)
   - Notify team

3. **Execute Migration**

   ```bash
   # Production
   pnpm db:migrate
   ```

4. **Post-Migration**
   - Verify conversion: Check no Questions syntax remains
   - Test question generation in app
   - Monitor error logs for 24 hours

### If Tests Fail

1. **Document Failures**
   - Which tests failed?
   - What were the error messages?
   - Any patterns in failures?

2. **Debug**
   - Review conversion function logic
   - Check edge cases
   - Test with smaller dataset

3. **Fix and Retry**
   - Update conversion functions
   - Re-run all tests
   - Iterate until all pass

---

## Support

**Created**: 2025-11-17
**Author**: Claude Code (Test Automator Agent)

For detailed information:

- **Test Plan**: `comprehensive-migration-test.md`
- **Test Report**: `MIGRATION-TEST-REPORT.md`
- **Migration Docs**: `../docs/migrations/phase2-template-syntax-unification.md`

---

## Checklist

Before starting tests:

- [ ] Docker Desktop running (`docker ps` works)
- [ ] Supabase local started (`pnpm db:start`)
- [ ] Seed data loaded (71+ templates in database)

Run tests:

- [ ] Execute `./scripts/run-all-migration-tests.sh`
- [ ] Review output (APPROVED / REJECTED)
- [ ] Optionally: Run `node --import tsx scripts/test-question-generation.ts`

If approved:

- [ ] Create production backup
- [ ] Schedule maintenance window
- [ ] Execute `pnpm db:migrate`
- [ ] Monitor for 24 hours

If rejected:

- [ ] Document failures
- [ ] Fix issues
- [ ] Re-run tests
- [ ] Repeat until approved

---

**Quick Command Reference**

```bash
# Start everything
docker ps && pnpm db:start

# Run all tests
./scripts/run-all-migration-tests.sh

# Test question generation
node --import tsx scripts/test-question-generation.ts

# Stop Supabase
pnpm db:stop
```
