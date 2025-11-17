# Comprehensive Migration Test Plan

## Template Syntax Unification - Phase 2.2

**Migration File**: `supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql`
**Test Date**: 2025-11-17
**Tester**: Claude Code (Test Automator)

---

## Executive Summary

This document provides a complete testing strategy for the template syntax migration from Questions format to Markdown format. The migration affects 71+ seed templates and any user-created templates in production.

**CRITICAL**: Docker must be running before executing these tests.

---

## Prerequisites

### System Requirements

- [ ] Docker Desktop installed and running
- [ ] Local Supabase running (`pnpm db:start`)
- [ ] PostgreSQL client tools installed
- [ ] Seed data loaded (migrations 071 and 075)

### Verification Commands

```bash
# Check Docker is running
docker ps

# Start Supabase
pnpm db:start

# Verify Supabase is running
curl http://localhost:54321/rest/v1/ -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" 2>/dev/null && echo "✓ Supabase running" || echo "✗ Supabase not running"

# Check template count
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT COUNT(*) as template_count FROM question_templates;"
```

---

## Test Suite 1: Function Validation (13 Test Cases)

**File**: `scripts/test-template-migration.sql`
**Purpose**: Validate conversion logic with unit tests
**Duration**: ~5 seconds
**Risk**: Low (runs in transaction, auto-rollback)

### Execution

```bash
# Run test script
psql -h localhost -p 54322 -U postgres -d postgres -f scripts/test-template-migration.sql
```

### Expected Results

All 13 tests should pass:

```
✓ Test 1: Simple variable ({@:a} → {{a}})
✓ Test 2: Hybrid variable ({{@:num1}} → {{num1}})
✓ Test 3: Random expression ({#:1-10} → {{1-10}})
✓ Test 4: Nested random ({#:1-{@:max}} → {{1-{{max}}}})
✓ Test 5: Eval expression ({eval:a+b} → {{eval:a+b}})
✓ Test 6: Complex eval ({eval:({@:a}+{@:b})/{@:c}} → {{eval:({{a}}+{{b}})/{{c}}}})
✓ Test 7: Mixed LaTeX content
✓ Test 8: Random with exclusions ({#:1-10!5,7} → {{1-10!5,7}})
✓ Test 9: Color reference ({#color:red_palette.2} → {{color:red_palette.2}})
✓ Test 10: Already converted (idempotence)
✓ Test 11: NULL input
✓ Test 12: Empty string
✓ Test 13: Real seed example

Total Tests: 13
Passed: 13
Failed: 0
Success Rate: 100%
```

### Failure Actions

If any test fails:

1. **DO NOT PROCEED** with migration
2. Document the failure case
3. Analyze the conversion function logic
4. Fix the function
5. Re-run all tests

---

## Test Suite 2: Real Data Validation

### Test 2.1: Pre-Migration Analysis

**Purpose**: Understand current data state

```sql
-- Count templates with Questions syntax
SELECT
  COUNT(*) as total_templates,
  COUNT(*) FILTER (WHERE statement::TEXT LIKE '%{@:%') as has_variable_syntax,
  COUNT(*) FILTER (WHERE statement::TEXT LIKE '%{#:%') as has_random_syntax,
  COUNT(*) FILTER (WHERE statement::TEXT LIKE '%{eval:%') as has_eval_syntax,
  COUNT(*) FILTER (WHERE statement::TEXT LIKE '%{{@:%') as has_hybrid_syntax
FROM question_templates;
```

**Expected Results**:

- `total_templates`: 71+ (from seed data)
- `has_variable_syntax`: >0 (seed uses {@:var})
- `has_random_syntax`: >0 (seed uses {#:1-10})
- `has_eval_syntax`: >0 (seed uses {eval:expr})
- `has_hybrid_syntax`: 0 (old seed data doesn't use hybrid)

### Test 2.2: Sample Data Inspection

```sql
-- View sample templates before conversion
SELECT
  id,
  type,
  substring(statement::TEXT FROM 1 FOR 100) as statement_sample,
  substring(variables::TEXT FROM 1 FOR 100) as variables_sample,
  substring(answer::TEXT FROM 1 FOR 80) as answer_sample
FROM question_templates
WHERE
  statement::TEXT LIKE '%{@:%' OR
  variables::TEXT LIKE '%{#:%'
LIMIT 5;
```

**Expected**: Should show Questions syntax clearly

### Test 2.3: Specific Pattern Analysis

```sql
-- Analyze specific patterns in database
SELECT
  'Single-brace variable' as pattern,
  COUNT(*) as count
FROM question_templates
WHERE statement::TEXT ~ '\{@:\w+\}'

UNION ALL

SELECT
  'Random expression',
  COUNT(*)
FROM question_templates
WHERE statement::TEXT ~ '\{#:[0-9-]+\}'

UNION ALL

SELECT
  'Eval expression',
  COUNT(*)
FROM question_templates
WHERE statement::TEXT ~ '\{eval:[^}]+\}'

UNION ALL

SELECT
  'Nested braces',
  COUNT(*)
FROM question_templates
WHERE statement::TEXT ~ '\{#:[^}]*\{[^}]*\}[^}]*\}';
```

---

## Test Suite 3: Migration Execution (Dry Run)

**Purpose**: Test migration in isolated transaction
**Risk**: Low (transaction-based, auto-rollback)

### Test 3.1: Dry Run Migration

Create test script: `scripts/migration-dry-run.sql`

```sql
BEGIN;

-- Import migration functions
\i supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql

-- Don't commit - just analyze results
ROLLBACK;
```

**ISSUE**: The migration has a `COMMIT` at the end. We need a transaction-safe version.

### Test 3.2: Modified Test Version

```bash
# Create transaction-wrapped version
sed '/^COMMIT;/d' supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql > /tmp/migration-test.sql
echo "ROLLBACK;" >> /tmp/migration-test.sql

# Run in transaction
psql -h localhost -p 54322 -U postgres -d postgres < /tmp/migration-test.sql
```

### Test 3.3: Validate Results in Transaction

Within the same transaction (before ROLLBACK):

```sql
-- Check conversion completeness
SELECT COUNT(*) as remaining_questions_syntax
FROM question_templates
WHERE
  statement::TEXT LIKE '%{@:%' OR
  statement::TEXT LIKE '%{#:%' OR
  statement::TEXT LIKE '%{eval:%';
-- Expected: 0

-- Check samples converted correctly
SELECT
  substring(statement::TEXT FROM 1 FOR 100) as converted_statement
FROM question_templates
LIMIT 3;
-- Expected: Should show {{var}}, {{1-10}}, {{eval:expr}} syntax
```

---

## Test Suite 4: Edge Cases

### Test 4.1: NULL Values

```sql
-- Create test template with NULL fields
INSERT INTO question_templates (type, statement, variables)
VALUES ('numerical_exact', NULL, NULL);

-- Run conversion
UPDATE question_templates
SET statement = convert_questions_to_markdown_syntax(statement::TEXT)::JSONB
WHERE id = (SELECT id FROM question_templates WHERE statement IS NULL LIMIT 1);

-- Verify NULL preserved
SELECT statement FROM question_templates WHERE statement IS NULL;
-- Expected: Should still return row
```

### Test 4.2: Empty Strings

```sql
-- Test empty string conversion
SELECT convert_questions_to_markdown_syntax('') as result;
-- Expected: '' (empty string)

-- Test whitespace-only
SELECT convert_questions_to_markdown_syntax('   ') as result;
-- Expected: '   ' (unchanged)
```

### Test 4.3: Malformed Syntax

```sql
-- Test unmatched braces
SELECT convert_questions_to_markdown_syntax('{@:unclosed') as result;
-- Expected: Should not crash, return original or safely handle

-- Test invalid patterns
SELECT convert_questions_to_markdown_syntax('{@:123invalid}') as result;
-- Expected: Should handle gracefully
```

### Test 4.4: Very Long Text

```sql
-- Test with large content (LaTeX proof with many variables)
SELECT convert_questions_to_markdown_syntax(repeat('{@:var}', 100)) as result;
-- Expected: Should convert all occurrences, not timeout
```

### Test 4.5: Idempotence (Already Converted)

```sql
-- Test that already-converted syntax is not re-converted
SELECT convert_questions_to_markdown_syntax('{{a}} + {{b}} = {{eval:{{a}}+{{b}}}}') as result;
-- Expected: '{{a}} + {{b}} = {{eval:{{a}}+{{b}}}}' (unchanged)
```

### Test 4.6: LaTeX Braces Interference

```sql
-- Test LaTeX with curly braces doesn't interfere
SELECT convert_questions_to_markdown_syntax('$$\frac{{@:num}}{{@:den}}$$') as result;
-- Expected: '$$\frac{{num}}{{den}}$$' (only variables converted)
```

---

## Test Suite 5: Question Generation Integration

**Purpose**: Verify templates still generate valid questions after migration

### Prerequisites

```bash
# Build the application
pnpm build

# Or run dev server
pnpm dev -- --port 5175
```

### Test 5.1: Generate Question from Migrated Template

Create test script: `scripts/test-question-generation.ts`

```typescript
import { supabaseServiceRole } from '$lib/server/supabase';
import { generateQuestionInstance } from '$lib/questions/generator';

async function testQuestionGeneration() {
	console.log('Testing question generation after migration...\n');

	// Get a migrated template
	const { data: template, error } = await supabaseServiceRole
		.from('question_templates')
		.select('*')
		.eq('type', 'numerical_exact')
		.limit(1)
		.single();

	if (error) {
		console.error('❌ Failed to fetch template:', error);
		return false;
	}

	console.log('Template ID:', template.id);
	console.log('Statement:', JSON.stringify(template.statement, null, 2));
	console.log('Variables:', JSON.stringify(template.variables, null, 2));

	// Generate instance
	try {
		const instance = await generateQuestionInstance(template);
		console.log('\n✅ Generation successful!');
		console.log('Generated statement:', instance.statement);
		console.log('Resolved variables:', instance.variables);
		console.log('Answer:', instance.answer);
		return true;
	} catch (err) {
		console.error('\n❌ Generation failed:', err);
		return false;
	}
}

testQuestionGeneration();
```

**Execution**:

```bash
node --import tsx scripts/test-question-generation.ts
```

### Test 5.2: Validate Multiple Question Types

Test all 6 question types:

- numerical_exact
- numerical_decimal
- numerical_rounded
- algebraic_transform
- multiple_choice
- open_ended

Expected: All should generate without errors

---

## Test Suite 6: Rollback Validation

**Purpose**: Ensure rollback capability works correctly

### Test 6.1: Test Rollback Function

```sql
BEGIN;

-- Run migration (skip this if already run)
\i supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql

-- Verify conversion happened
SELECT COUNT(*) FROM question_templates
WHERE statement::TEXT LIKE '%{{%}}%';
-- Expected: >0

-- Execute rollback
SELECT rollback_template_syntax_migration();

-- Verify Questions syntax restored
SELECT COUNT(*) FROM question_templates
WHERE statement::TEXT LIKE '%{@:%';
-- Expected: >0 (original syntax back)

ROLLBACK; -- Clean up test
```

### Test 6.2: Verify Data Integrity After Rollback

```sql
-- After rollback, check data matches original
SELECT
  b.id,
  b.statement::TEXT as original_statement,
  q.statement::TEXT as current_statement,
  (b.statement = q.statement) as matches
FROM question_templates_backup_20251117 b
JOIN question_templates q ON q.id = b.id
WHERE NOT (b.statement = q.statement);
-- Expected: 0 rows (all should match)
```

---

## Test Suite 7: Performance Testing

### Test 7.1: Migration Duration

```sql
-- Create performance test with timing
BEGIN;

SELECT NOW() as migration_start;

\i supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql

SELECT NOW() as migration_end;

-- Calculate duration
SELECT
  migration_end - migration_start as duration,
  (SELECT COUNT(*) FROM question_templates) as templates_migrated,
  EXTRACT(EPOCH FROM (migration_end - migration_start)) as seconds
FROM (
  SELECT NOW() as migration_end,
         (SELECT started_at FROM migration_metadata
          WHERE migration_name = 'unify_template_syntax_to_markdown'
          LIMIT 1) as migration_start
) t;

ROLLBACK;
```

**Performance Targets**:

- 71 templates: < 2 seconds
- 100 templates: < 5 seconds
- 1000 templates: < 30 seconds

### Test 7.2: Query Performance After Migration

```sql
-- Measure query performance
EXPLAIN ANALYZE
SELECT * FROM question_templates
WHERE statement::TEXT LIKE '%{{%}}%';

-- Compare with backup table
EXPLAIN ANALYZE
SELECT * FROM question_templates_backup_20251117
WHERE statement::TEXT LIKE '%{@:%';
```

### Test 7.3: Index Effectiveness

```sql
-- Verify GIN indexes created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'question_templates'
  AND indexname LIKE '%gin%';
-- Expected: idx_question_templates_statement_gin exists
```

---

## Test Suite 8: Integration Tests

### Test 8.1: Full Application Workflow

**Manual Test Steps**:

1. Start application: `pnpm dev -- --port 5175`
2. Log in as teacher
3. Navigate to exercise creation
4. Create new exercise with migrated template
5. Assign to class
6. Log in as student
7. Complete exercise
8. Verify question renders correctly
9. Submit answer
10. Check answer validation works

**Expected**: No errors, normal functionality

### Test 8.2: API Endpoint Testing

```bash
# Test question generation API
curl -X POST http://localhost:5175/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"template_id": "UUID_HERE"}' \
  | jq .

# Expected: Valid question instance with resolved variables
```

### Test 8.3: Template CRUD Operations

Test that migrated templates can still be:

- Created (new templates use Markdown syntax)
- Read (old templates converted, display correctly)
- Updated (updates preserve Markdown syntax)
- Deleted (deletion works normally)

---

## Test Suite 9: Security & Data Integrity

### Test 9.1: Backup Verification

```sql
-- Verify backup table structure matches
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('question_templates', 'question_templates_backup_20251117')
ORDER BY table_name, ordinal_position;
-- Expected: Identical schemas

-- Verify backup data completeness
SELECT
  (SELECT COUNT(*) FROM question_templates) as current_count,
  (SELECT COUNT(*) FROM question_templates_backup_20251117) as backup_count;
-- Expected: Same count
```

### Test 9.2: Migration Metadata

```sql
-- Check migration tracking
SELECT
  migration_name,
  migration_version,
  started_at,
  completed_at,
  status,
  rows_affected,
  backup_info,
  error_message
FROM migration_metadata
WHERE migration_name = 'unify_template_syntax_to_markdown'
ORDER BY started_at DESC
LIMIT 1;

-- Expected status: 'completed'
-- Expected error_message: NULL
```

### Test 9.3: SQL Injection Prevention

```sql
-- Test that conversion doesn't introduce SQL injection vectors
SELECT convert_questions_to_markdown_syntax(
  '{@:test}'' OR 1=1 --'
) as result;
-- Expected: Safe output, no SQL execution
```

---

## Test Suite 10: Cleanup & Documentation

### Test 10.1: Verify Migration Metadata

```sql
-- Check all migration records
SELECT * FROM migration_metadata
WHERE migration_name = 'unify_template_syntax_to_markdown'
ORDER BY started_at DESC;
```

### Test 10.2: Document Findings

After all tests complete, document:

- Total templates migrated
- Any edge cases found
- Performance metrics
- Any failures or warnings
- Recommendations

---

## Go/No-Go Decision Criteria

### ✅ GO - Proceed with Production Migration

All of the following must be true:

- [ ] All 13 unit tests pass (100%)
- [ ] All real data converts successfully (0 errors)
- [ ] Question generation works for all question types
- [ ] Rollback successfully restores original data
- [ ] Performance < 5 seconds for 100 templates
- [ ] No SQL injection or security issues
- [ ] Integration tests pass
- [ ] Edge cases handled gracefully

### ⚠️ GO WITH CAUTION

If any of these are true:

- [ ] 1-2 minor edge cases fail (can be fixed in production)
- [ ] Performance slightly over target (but < 10 seconds)
- [ ] Non-critical warnings in logs

### ❌ NO-GO - Do Not Proceed

If any of these are true:

- [ ] Any unit test fails
- [ ] Data corruption detected
- [ ] Rollback fails
- [ ] Question generation broken
- [ ] Security issues found
- [ ] Performance > 30 seconds

---

## Execution Checklist

### Pre-Execution (Before Starting Tests)

- [ ] Docker running
- [ ] Supabase local started
- [ ] Seed data loaded
- [ ] Backup of production database created
- [ ] Team notified of testing

### During Testing

- [ ] Test Suite 1: Function validation ✅ / ❌
- [ ] Test Suite 2: Real data validation ✅ / ❌
- [ ] Test Suite 3: Migration execution (dry run) ✅ / ❌
- [ ] Test Suite 4: Edge cases ✅ / ❌
- [ ] Test Suite 5: Question generation ✅ / ❌
- [ ] Test Suite 6: Rollback validation ✅ / ❌
- [ ] Test Suite 7: Performance testing ✅ / ❌
- [ ] Test Suite 8: Integration tests ✅ / ❌
- [ ] Test Suite 9: Security & integrity ✅ / ❌

### Post-Testing

- [ ] Generate test report
- [ ] Document any issues found
- [ ] Make go/no-go recommendation
- [ ] Update migration plan if needed
- [ ] Communicate results to team

---

## Test Results Summary

**To be filled after execution**

### Overall Status

- **Status**: [ PENDING / PASS / FAIL ]
- **Tests Run**: 0 / 80+
- **Tests Passed**: 0
- **Tests Failed**: 0
- **Success Rate**: 0%

### Performance Metrics

- **Migration Duration**: N/A
- **Templates Migrated**: 0
- **Throughput**: 0 templates/second

### Issues Found

1. (None yet - pending test execution)

### Recommendation

- [ ] ✅ APPROVED - Ready for production
- [ ] ⚠️ APPROVED WITH CONDITIONS - (list conditions)
- [ ] ❌ REJECTED - Do not proceed (list reasons)

---

## Next Steps

### If APPROVED

1. Schedule production migration window
2. Notify all stakeholders
3. Execute migration: `pnpm db:migrate`
4. Monitor for 24 hours
5. Remove adapter code if stable
6. Drop backup table after 1 week

### If REJECTED

1. Document all failure reasons
2. Fix conversion functions
3. Re-run all tests
4. Iterate until all tests pass

---

## Appendix: Quick Reference Commands

```bash
# Start testing environment
docker ps && pnpm db:start

# Run function tests
psql -h localhost -p 54322 -U postgres -d postgres -f scripts/test-template-migration.sql

# Count templates
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT COUNT(*) FROM question_templates;"

# View sample data
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT id, type, substring(statement::TEXT FROM 1 FOR 50) FROM question_templates LIMIT 3;"

# Execute migration (DRY RUN)
sed '/^COMMIT;/d' supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql > /tmp/migration-test.sql && echo "ROLLBACK;" >> /tmp/migration-test.sql && psql -h localhost -p 54322 -U postgres -d postgres < /tmp/migration-test.sql

# Test rollback
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT rollback_template_syntax_migration();"

# Stop Supabase
pnpm db:stop
```

---

**Test Plan Version**: 1.0
**Created**: 2025-11-17
**Last Updated**: 2025-11-17
**Owner**: Claude Code (Test Automator Agent)
