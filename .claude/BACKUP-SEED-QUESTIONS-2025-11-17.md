# Backup of Seed Questions - 2025-11-17

## Purpose
Backup and deletion of seed questions from local database in preparation for Projet 2 Phase 3 (TinyMath migration).

## Execution Details

- **Date**: 2025-11-17
- **Environment**: Local Supabase database (Docker)
- **Backup Table**: `question_templates_backup_seed`
- **Main Table**: `question_templates` (now empty)

## Statistics Before Deletion

### Total Count
- **10 questions** backed up and deleted

### By Question Type
- `algebraic_transform`: 2 questions
- `fill_in_blanks`: 1 question
- `multiple_choice`: 1 question
- `numerical_decimal`: 1 question
- `numerical_exact`: 4 questions
- `numerical_rounded`: 1 question

### By Theme
- Algèbre: 3 questions
- Arithmétique: 5 questions
- Géométrie: 1 question
- Non catégorisé: 1 question

### By Level
- Level 1: 3 questions
- Level 2: 3 questions
- Level 3: 2 questions
- Level 4: 1 question
- Level 5: 1 question

## Current State

| Table Name | Row Count | Status |
|------------|-----------|--------|
| `question_templates` | 0 | ✅ Empty (ready for TinyMath migration) |
| `question_templates_backup_seed` | 10 | ✅ Backup complete |

## How to Restore (if needed)

```sql
-- Restore all questions from backup
INSERT INTO question_templates
SELECT
  id, title, theme, level, type,
  question_json, answer_json, solution_json,
  metadata, is_public, created_at, updated_at
FROM question_templates_backup_seed;

-- Verify restoration
SELECT COUNT(*) FROM question_templates;
```

## SQL Backup Commands Used

```sql
-- Create backup table
CREATE TABLE question_templates_backup_seed AS
SELECT * FROM question_templates;

-- Add metadata
ALTER TABLE question_templates_backup_seed
ADD COLUMN backup_date TIMESTAMPTZ DEFAULT NOW();

-- Add documentation
COMMENT ON TABLE question_templates_backup_seed IS
'Backup of seed questions before deletion on 2025-11-17 for Projet 2 Phase 3';

-- Delete from main table
DELETE FROM question_templates;
```

## Notes

### Local Database Only
This backup was performed on the **local Supabase database** only. The production database still has the original seed questions (approximately 71 questions based on earlier analysis).

### Production Database
When ready to perform this operation on production:
1. Create a similar backup table in production
2. Export backup to file for extra safety: `pg_dump -t question_templates_backup_seed`
3. Verify backup before deletion
4. Execute deletion
5. Document in production environment

### TinyMath Migration
The `question_templates` table is now empty and ready to receive questions from the TinyMath migration pipeline (Projet 2 Phase 3).

## Related Documentation
- **Migration Plan**: `docs/migration/migration-plan.md`
- **Database Schema**: `docs/architecture/database-schema.md`
- **Projet 2 Phases**: See migration documentation

## Success Criteria - All Met ✅

- [x] Backup table created with all data (10 questions)
- [x] All questions deleted from main table (0 remaining)
- [x] Statistics documented before deletion
- [x] Backup documentation created
- [x] Database ready for TinyMath migration
- [x] Restoration procedure documented

## Verification Commands

```sql
-- Check current state
SELECT
  'question_templates' as table_name,
  COUNT(*) as row_count
FROM question_templates
UNION ALL
SELECT
  'question_templates_backup_seed' as table_name,
  COUNT(*) as row_count
FROM question_templates_backup_seed;

-- View backup metadata
SELECT
  table_name,
  obj_description(oid) as description
FROM pg_class
WHERE relname = 'question_templates_backup_seed';
```

## Next Steps

1. ✅ Local database prepared
2. 🔄 Continue with TinyMath migration pipeline
3. ⏸️ Production backup/deletion (when ready for production deployment)
4. ⏸️ Import TinyMath questions via migration scripts

---

**Backup completed successfully** - Database is now ready for TinyMath content migration.
