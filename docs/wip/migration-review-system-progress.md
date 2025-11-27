# Migration Review System - Progress

## Current State

- **Phase**: 0/6 (Completed)
- **Last action**: Fixed extraction script to preserve hierarchy
- **Commit**: (pending)

## Files Modified

- `scripts/migrate-questions-loader.ts` - Added `_migration` metadata to each question
- `src/lib/migration/old-question-types.ts` - Added `MigrationMetadata` and `QuestionWithMigration` types
- `.claude/old-questions.json` - Regenerated with 633 questions including hierarchy

## Decisions Made

1. **Hierarchy preservation**: Each question now has `_migration` object with:
   - `theme` - Top level category (e.g., "Entiers")
   - `domain` - Mid level (e.g., "Apprivoiser")
   - `subdomain` - Bottom level (e.g., "Ecriture")
   - `level` - Position in subdomain array (0-indexed)
   - `globalIndex` - Sequential counter (0-632)

2. **Type centralization**: Types defined in `old-question-types.ts` for reusability

## Statistics

- Total questions: 633
- Themes: 12
  - Entiers: 228
  - Décimaux: 83
  - Calcul littéral: 68
  - Fractions: 58
  - Grandeurs: 45
  - Fonctions: 39
  - Relatifs: 36
  - Proportionnalité: 28
  - Puissances: 21
  - Suites: 15
  - Racines carré: 10
  - Probabilités: 2

## Next Steps

- Phase 1: Create export script for review (`scripts/export-questions-for-review.ts`)
- Phase 2: Database schema for review workflow

## To Resume

1. Read this file to understand current state
2. Continue with Phase 1: Export script
3. Refer to plan: `.claude/plans/crispy-forging-glade.md`
