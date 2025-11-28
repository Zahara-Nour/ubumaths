# Phase 2: Template Syntax Unification - Database Migration

## Overview

This document describes Phase 2 of the Template System Unification project, which migrates all template syntax in the database from Questions format (single-brace/hybrid) to pure Markdown format (double-brace).

**Migration File**: `supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql`

## Background

### Phase 1 Status (Complete)

- Implemented runtime syntax adapter to convert between formats
- Fixed critical bug where templates weren't being resolved
- Performance overhead: <5ms per conversion
- Status: Production ready, 57 tests passing

### Phase 2 Goal

Eliminate the need for runtime conversion by migrating all database content to use consistent Markdown syntax.

## Current State Analysis

### Mixed Syntax in Database

Our analysis revealed THREE different syntax patterns in the current database:

1. **Pure Questions Syntax** (single-brace):

   ```json
   {
   	"expression": "{#:1..10}",
   	"answer": "{eval:{@:a}+{@:b}}"
   }
   ```

2. **Hybrid Syntax** (double-brace with @: prefix):

   ```json
   {
   	"statement": "Calculate {{@:num1}} + {{@:num2}}"
   }
   ```

3. **Pure Markdown Syntax** (double-brace, desired):
   ```json
   {
   	"statement": "Calculate {{num1}} + {{num2}}"
   }
   ```

### Affected Tables and Columns

**Primary Table**: `question_templates`

- `statement` (JSONB) - Array of content objects with `content` field
- `variables` (JSONB) - Array of variable objects with `expression` field
- `answer` (JSONB) - Can be string or array
- `choices` (JSONB) - Array of strings for multiple choice
- `correction` (JSONB) - Array of content objects
- `exercise_instruction` (TEXT) - Simple text field

**Estimated Impact**: 71+ seed templates plus any user-created templates

## Migration Strategy

### Conversion Rules

| Current Syntax           | Target Syntax             | Description                 |
| ------------------------ | ------------------------- | --------------------------- |
| `{@:varName}`            | `{{varName}}`             | Variable reference          |
| `{{@:varName}}`          | `{{varName}}`             | Hybrid variable (remove @:) |
| `{#:1..10}`              | `{{1..10}}`               | Random range                |
| `{#:min-max!exc}`        | `{{min-max!exc}}`         | Random with exclusions      |
| `{eval:expression}`      | `{{eval:expression}}`     | Evaluation                  |
| `{#color:palette.index}` | `{{color:palette.index}}` | Color reference             |

### Implementation Approach

1. **Conversion Functions**: PL/pgSQL functions that handle:
   - Nested braces correctly
   - JSONB structure preservation
   - Recursive conversion for arrays and objects
   - Edge cases (NULL, empty strings, malformed syntax)

2. **Backup System**:
   - Creates timestamped backup table
   - Stores metadata in `migration_metadata` table
   - Enables full rollback capability

3. **Validation**:
   - Verifies no Questions syntax remains
   - Counts converted templates
   - Provides detailed error messages if issues found

## Migration Execution

### Pre-Migration Checklist

- [ ] **Backup Production Database**

  ```bash
  pg_dump -h [host] -U [user] -d [database] \
    --data-only -t question_templates \
    > backup_templates_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Test in Staging Environment**
  - Run migration on staging database
  - Test question generation
  - Verify all templates render correctly

- [ ] **Notify Team**
  - Schedule maintenance window (estimated: 5-10 minutes)
  - Prepare rollback plan

### Running the Migration

1. **Connect to Database**:

   ```bash
   psql -h [host] -U [user] -d [database]
   ```

2. **Run Migration**:

   ```bash
   \i supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql
   ```

   Or via Supabase CLI:

   ```bash
   pnpm db:migrate
   ```

3. **Verify Success**:

   ```sql
   -- Check migration status
   SELECT * FROM migration_metadata
   WHERE migration_name = 'unify_template_syntax_to_markdown'
   ORDER BY started_at DESC LIMIT 1;

   -- Verify no old syntax remains
   SELECT COUNT(*) FROM question_templates
   WHERE statement::TEXT LIKE '%{@:%'
      OR statement::TEXT LIKE '%{#:%'
      OR statement::TEXT LIKE '%{eval:%';
   -- Should return 0

   -- Sample converted templates
   SELECT id, statement->0->>'content' as sample_statement,
          variables->0->>'expression' as sample_variable
   FROM question_templates
   LIMIT 5;
   ```

### Post-Migration Tasks

1. **Application Code Updates**:

   ```typescript
   // Remove or comment out adapter usage in:
   // src/lib/questions/generator/variable-resolver.ts
   // src/lib/questions/generator/content-resolver.ts

   // Before (with adapter):
   const markdownExpression = convertToMarkdownSyntax(expression);

   // After (direct usage):
   // No conversion needed - database already in Markdown format
   ```

2. **Test Question Generation**:
   - Generate questions from various templates
   - Verify variables resolve correctly
   - Check that answers validate properly

3. **Monitor for Issues**:
   - Watch error logs for template-related issues
   - Monitor question generation success rate
   - Check user feedback

## Rollback Procedure

### Automatic Rollback

If issues are detected, rollback using the built-in function:

```sql
SELECT rollback_template_syntax_migration();
```

### Manual Rollback

If the rollback function fails:

```sql
BEGIN;
TRUNCATE question_templates;
INSERT INTO question_templates
SELECT * FROM question_templates_backup_20251117;
COMMIT;
```

### Verify Rollback

```sql
-- Check that old syntax is restored
SELECT COUNT(*) FROM question_templates
WHERE variables::TEXT LIKE '%{#:%';
-- Should return > 0
```

## Performance Considerations

### Migration Performance

- **Estimated Duration**: 2-5 seconds for 100 templates
- **Locking**: Uses row-level locks, minimal impact
- **CPU Usage**: Moderate (regex operations)
- **Memory**: Low (processes one row at a time)

### Post-Migration Benefits

- **Eliminated Runtime Overhead**: No more 5ms conversion per template
- **Simplified Codebase**: Remove 600+ lines of adapter code
- **Improved Maintainability**: Single syntax to support

## Risk Assessment

### Low Risk

- ✅ Full backup before migration
- ✅ Tested conversion functions
- ✅ Rollback capability
- ✅ Non-destructive (preserves original data in backup)

### Medium Risk

- ⚠️ Brief service disruption during migration (2-5 seconds)
- ⚠️ Potential edge cases in complex nested expressions

### Mitigation

- Run during low-traffic period
- Test thoroughly in staging
- Have rollback plan ready
- Monitor closely after deployment

## Success Metrics

### Immediate (Day 1)

- [ ] Zero Questions syntax in database
- [ ] All templates generate correctly
- [ ] No increase in error rate
- [ ] Performance improvement measurable

### Short-term (Week 1)

- [ ] No template-related bug reports
- [ ] Successful removal of adapter code
- [ ] Reduced code complexity metrics

### Long-term (Month 1)

- [ ] Simplified onboarding for new developers
- [ ] Easier template creation process
- [ ] Reduced maintenance burden

## Cleanup Timeline

### Week 1

- Monitor for issues
- Keep backup table and rollback function

### Week 2

- If stable, remove adapter code from application
- Update documentation to reflect new syntax only

### Month 1

- Drop backup table: `DROP TABLE question_templates_backup_20251117;`
- Remove conversion functions (optional, may keep for utility)

## Technical Details

### Conversion Function Logic

The migration uses sophisticated PL/pgSQL functions that:

1. **Handle Nested Braces**: Uses a brace counting algorithm to correctly match opening and closing braces
2. **Preserve JSONB Structure**: Recursively processes JSONB arrays and objects
3. **Process in Order**: Converts in specific order to avoid interference between patterns
4. **Maintain Data Integrity**: Never modifies data that doesn't match expected patterns

### Example Conversions

```sql
-- Simple variable
'{@:a}' → '{{a}}'

-- Hybrid variable (current seed data)
'{{@:num1}}' → '{{num1}}'

-- Nested expression
'{#:1-{@:max}}' → '{{1-{{max}}}}'

-- Complex eval
'{eval:({@:a}+{@:b})/{@:c}}' → '{{eval:({{a}}+{{b}})/{{c}}}}'

-- Multiple in one string
'Calculate {@:a} + {@:b} = {eval:{@:a}+{@:b}}'
→ 'Calculate {{a}} + {{b}} = {{eval:{{a}}+{{b}}}}'
```

## Contact & Support

**Migration Author**: Claude (Supabase Expert)
**Date**: 2025-11-17
**Phase**: 2 of Template System Unification

For issues or questions:

1. Check migration logs: `SELECT * FROM migration_metadata`
2. Review backup: `SELECT * FROM question_templates_backup_20251117`
3. Consult Phase 1 documentation: `.claude/template-system-status.md`

## Appendix: Quick Commands

```bash
# Backup before migration
pg_dump -h localhost -p 54322 -U postgres -d postgres \
  --data-only -t question_templates \
  > backup_templates_$(date +%Y%m%d_%H%M%S).sql

# Run migration
pnpm db:migrate

# Check status
psql -h localhost -p 54322 -U postgres -d postgres \
  -c "SELECT * FROM migration_metadata WHERE migration_name = 'unify_template_syntax_to_markdown'"

# Verify conversion
psql -h localhost -p 54322 -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM question_templates WHERE statement::TEXT LIKE '%{@:%'"

# Rollback if needed
psql -h localhost -p 54322 -U postgres -d postgres \
  -c "SELECT rollback_template_syntax_migration()"
```
