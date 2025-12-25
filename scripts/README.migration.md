# Question Migration Scripts

## Overview

This directory contains scripts for migrating questions from the old TinyMath system to the new UbuMaths v2 platform.

The migration is divided into 4 phases:

- **Phase 1**: Simple arithmetic questions (~560 questions)
- **Phase 2**: Intermediate questions with variables (~650 questions)
- **Phase 3**: Complex questions with images (~700 questions)
- **Phase 4**: Advanced questions with custom validation (~330 questions)

## Prerequisites

### 1. Environment Variables

Copy `.env.migration.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.migration.example .env
```

Required variables:

- `PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin access

### 2. Database Setup

Ensure the migration tracking tables exist:

```bash
# Run the migration to create tracking tables
pnpm db:migrate
```

### 3. Dependencies

Install required packages:

```bash
pnpm install
```

## Phase 1 Migration

### Running the Migration

```bash
# Full migration
pnpm migrate:phase1

# Dry run (no database changes)
pnpm migrate:phase1:dry

# Resume from last checkpoint
pnpm migrate:phase1:resume

# Rollback Phase 1
pnpm migrate:phase1:rollback

# Validate migrated questions
pnpm migrate:phase1:validate
```

### Command Line Options

```bash
# Process specific range
pnpm tsx scripts/migrate-questions-phase1.ts --from 100 --to 200

# Custom batch size
pnpm tsx scripts/migrate-questions-phase1.ts --batch 25

# Combine options
pnpm tsx scripts/migrate-questions-phase1.ts --dry-run --from 0 --to 10
```

### Phase 1 Criteria

Questions included in Phase 1 must meet ALL of these criteria:

✅ **Include**:

- Simple arithmetic operations
- Basic numerical questions
- No images required
- Simple variable substitution ($e[min;max])
- Standard validation options

❌ **Exclude**:

- Questions with images
- Complex test answers
- List-based random generation ($l{...})
- Complex nested evaluations (depth > 2)
- Custom validators

### Monitoring Progress

#### Check Migration State

The migration state is tracked in `.claude/migration-state.json`:

```bash
cat .claude/migration-state.json | jq '.phases."1"'
```

#### Check Database Status

```sql
-- Count by status
SELECT migration_status, COUNT(*)
FROM migration_tracking
WHERE phase = 1
GROUP BY migration_status;

-- View failed questions
SELECT old_question_index, old_description, conversion_errors
FROM migration_tracking
WHERE phase = 1 AND migration_status = 'failed';
```

#### View Reports

Reports are generated in `.claude/`:

```bash
# View latest migration report
cat .claude/migration-phase1-report.md

# View progress report
cat .claude/migration-progress.md
```

## Troubleshooting

### Common Issues

#### 1. "Missing environment variables"

Ensure `.env` file exists and contains required variables:

```bash
# Check if .env exists
ls -la .env

# Verify variables are set
grep SUPABASE .env
```

#### 2. "Could not find questions array in file"

The script expects the old questions file at:

```
extern/new-tinymath/apps/ubumaths/src/lib/questions/questions.ts
```

Verify the file exists and contains the questions export.

#### 3. "Database insert failed"

Check for:

- Duplicate questions (use --resume to skip processed)
- Database connection issues
- RLS policies (service role key required)

#### 4. Resume Not Working

The resume feature tracks progress in both:

1. Database (`migration_tracking` table)
2. State file (`.claude/migration-state.json`)

If inconsistent, you may need to:

- Reset state: Delete `.claude/migration-state.json`
- Or specify exact range: `--from X --to Y`

### Recovery Procedures

#### Partial Failure Recovery

If the migration fails partway through:

```bash
# 1. Check what was processed
pnpm tsx scripts/check-migration-status.ts

# 2. Resume from checkpoint
pnpm migrate:phase1:resume

# 3. Or retry specific range
pnpm tsx scripts/migrate-questions-phase1.ts --from 250 --to 500
```

#### Complete Rollback

To completely undo Phase 1:

```bash
# 1. Rollback migration
pnpm migrate:phase1:rollback

# 2. Verify rollback
SELECT COUNT(*) FROM question_templates
WHERE id IN (
  SELECT new_template_id FROM migration_tracking WHERE phase = 1
);
-- Should return 0
```

#### Manual Fixes

For specific failed questions:

1. Identify the question:

```sql
SELECT * FROM migration_tracking
WHERE old_question_index = 123;
```

2. Review the error in `conversion_errors`

3. Either:
   - Fix the transformer and retry
   - Manually create the question template
   - Mark as skipped if not compatible

## Validation

### Running Validation

```bash
# Validate all Phase 1 questions
pnpm migrate:phase1:validate

# Validate random sample
pnpm tsx scripts/validate-phase1-questions.ts --sample 100

# Verbose output
pnpm tsx scripts/validate-phase1-questions.ts --verbose
```

### Validation Checks

The validation script verifies:

1. **Template Structure**

   - Required fields present
   - Correct data types
   - Valid question type

2. **Instance Generation**

   - Variables can be processed
   - Answer can be generated
   - No runtime errors

3. **Type-Specific Rules**
   - Numerical questions have numeric answers
   - Multiple choice has valid choices
   - Fill-in-blanks has blank positions

### Failed Validation

If questions fail validation:

1. Check the error details in console output
2. Review the template in database
3. Fix transformer if systematic issue
4. Manually correct if one-off problem

## Performance Considerations

### Batch Size

Default batch size is 50. Adjust based on:

- Network latency to Supabase
- Available memory
- Desired checkpoint frequency

```bash
# Smaller batches (more checkpoints, slower)
pnpm tsx scripts/migrate-questions-phase1.ts --batch 10

# Larger batches (fewer checkpoints, faster)
pnpm tsx scripts/migrate-questions-phase1.ts --batch 100
```

### Processing Time

Typical performance:

- ~1-2 questions per second
- Phase 1 (~560 questions): 10-15 minutes
- Full validation: 5-10 minutes

### Resource Usage

The migration script:

- Uses single database connection
- Processes sequentially (no parallelization)
- Checkpoints every batch
- Low memory footprint (~100MB)

## Next Steps

After successful Phase 1 migration:

1. **Validate**: Run full validation suite
2. **Test**: Manual testing of generated questions
3. **Monitor**: Check for user-reported issues
4. **Document**: Update migration analysis with lessons learned
5. **Phase 2**: Prepare for intermediate questions migration

## Support

For issues or questions:

1. Check existing documentation in `.claude/`
2. Review migration analysis in `.claude/question-migration-analysis.md`
3. Contact the development team
