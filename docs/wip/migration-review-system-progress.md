# Migration Review System - Progress

## Current State

- **Status**: COMPLETED
- **All 6 phases finished**
- **Final commit**: 4257bfd6

## Commits

- 796dde34 (Phase 0 - Extraction)
- da107c15 (Phase 1 - Export)
- 0dafe6df (Phase 2 - DB Schema)
- ca126ee8 (Phase 3 - UI & API)
- f1d6bf1f (Phase 4 - Import/Rollback Scripts)
- 4257bfd6 (Phase 6 - Breadcrumb component fix)

## Completed Phases

### Phase 0: Extraction Script

- Modified `scripts/migrate-questions-loader.ts` to preserve hierarchy
- Added `_migration` metadata to each question
- Added `MigrationMetadata` types to `old-question-types.ts`
- Regenerated `.claude/old-questions.json` (633 questions)

### Phase 1: Export Script

- Created `scripts/export-questions-for-review.ts`
- Exports to `data/migration-output/export-YYYY-MM-DD/`
- 633 questions exported (100% success)
- 398 with warnings, 0 errors
- Generates manifest.json, summary.md, reports

### Phase 2: Database Schema

- Created migration `20251127120000_add_migration_review_workflow.sql`
- Added columns: theme, domain, subdomain, level, old_question_json, transformed_json
- Added review_status, reviewed_by, reviewed_at
- Created migration_review_tree view

### Phase 3: UI & API

- Created migration dashboard at `/dashboard/admin/migration`
- Created subdomain detail page with filtering
- Created components: MigrationTree, CategoryProgress, QuestionCard, QuestionCompareView, ReviewActions
- Created API endpoints: questions/[globalIndex], approve, reject, batch/approve
- 22/22 API tests passing

### Phase 4: Import/Rollback Scripts

- Created `scripts/import-questions-to-db.ts`
  - Supports dry-run, batch processing, approved-only modes
  - CLI options: --dry-run, --approved-only, --batch, --force
- Created `scripts/rollback-migration.ts`
  - Rollback by category (theme/domain/subdomain) or all
  - CLI options: --dry-run, --all, --theme, --domain, --subdomain, --force
- Added npm scripts for convenience

### Phase 5: Tests

- Verified existing tests pass (7126 passed, 425 pre-existing browser test failures)
- API endpoint tests: 22/22 passing

### Phase 6: Quality Checks

- Lint: 0 errors, 58 warnings (acceptable)
- Build: Successful (added missing breadcrumb component)
- TypeScript: Pre-existing errors in unrelated files (pdf-extractor, rag/search, documents)

## Statistics

- Total questions: 633
- Themes: 12 (Entiers: 228, Decimaux: 83, Calcul litteral: 68, etc.)

## Usage

```bash
# Export questions for review
pnpm tsx scripts/export-questions-for-review.ts

# Import approved questions to database
pnpm migration:import              # Import all
pnpm migration:import:dry          # Dry run
pnpm migration:import:approved     # Only approved questions

# Rollback imported questions
pnpm migration:rollback:dry --all  # Preview all rollback
pnpm migration:rollback --theme Entiers  # Rollback specific theme
pnpm migration:rollback:all        # Rollback everything
```

## UI Access

- Dashboard: `/dashboard/admin/migration`
- Subdomain detail: `/dashboard/admin/migration/[theme]/[domain]/[subdomain]`
