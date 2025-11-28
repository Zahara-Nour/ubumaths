# Export Questions for Review - Phase 1 Complete

**Date:** 2025-11-27
**Status:** ✅ Complete
**Script:** `scripts/export-questions-for-review.ts`

---

## Summary

Successfully created an export script that transforms all 633 questions from `.claude/old-questions.json` into a structured file system for manual review.

## Results

### Overall Statistics

- **Total Questions:** 633
- **Successfully Transformed:** 633 (100%)
- **With Warnings:** 398 (62.9%)
- **Failed:** 0 (0%)

### Structure

- **Themes:** 12
- **Domains:** 44
- **Subdomains:** 136
- **Level Files Created:** 633 (one per question at its level)

### Breakdown by Theme

| Theme            | Domains | Subdomains | Questions |
| ---------------- | ------- | ---------- | --------- |
| Entiers          | 7       | 33         | 228       |
| Décimaux         | 5       | 18         | 83        |
| Relatifs         | 3       | 9          | 36        |
| Fractions        | 3       | 13         | 58        |
| Puissances       | 2       | 7          | 21        |
| Grandeurs        | 6       | 14         | 45        |
| Racines carré    | 2       | 5          | 10        |
| Probabilités     | 1       | 1          | 2         |
| Proportionnalité | 4       | 9          | 28        |
| Calcul littéral  | 3       | 11         | 68        |
| Fonctions        | 5       | 10         | 39        |
| Suites           | 3       | 6          | 15        |

---

## Output Structure

```
data/migration-output/export-2025-11-27/
├── manifest.json           # Index of all exported files with full structure
├── summary.md              # Human-readable summary (statistics, structure)
├── by-category/
│   └── {theme}/{domain}/{subdomain}/
│       └── level-{n}.json  # One file per level containing:
│                           #   - Original question
│                           #   - Transformed template
│                           #   - Warnings/errors
│                           #   - Statistics
└── reports/
    ├── success.md          # 235 questions with no warnings/errors
    ├── warnings.md         # 398 questions with warnings
    └── errors.md           # 0 questions with errors
```

---

## Key Features

### 1. Transformation

Each question is transformed using `transformQuestion()` from `question-transformer.ts`:

- Converts old TinyMath format to new QuestionTemplate format
- Detects question type automatically
- Converts TinyCAS syntax to new variable syntax
- Maps validation options
- Converts correction formats
- Tracks conversion statistics

### 2. Organization

Questions are organized by their `_migration` metadata:

- `theme` → top-level category (e.g., "Entiers")
- `domain` → second-level category (e.g., "Apprivoiser")
- `subdomain` → third-level category (e.g., "Ecriture")
- `level` → difficulty/progression level (0-based)

### 3. JSON Output Format

Each `level-{n}.json` file contains an array with one question object:

```json
{
	"theme": "Entiers",
	"domain": "Apprivoiser",
	"subdomain": "Ecriture",
	"level": 0,
	"globalIndex": 0,
	"question": {
		/* original question */
	},
	"transformed": {
		/* new format */
	},
	"warnings": [],
	"errors": [],
	"stats": {
		/* transformation stats */
	}
}
```

### 4. Reports

- **success.md**: Questions that transformed perfectly (no warnings)
- **warnings.md**: Questions that need review (common: unknown options, missing solutions)
- **errors.md**: Questions that failed transformation (0 in this run)

---

## Common Warnings Found

1. **Unknown Options** (most common):
   - `require-no-extraneous-brackets`
   - `exp-no-spaces`
   - `require-correct-spaces`
   - `no-shuffle-choices`

2. **Missing Solutions**:
   - Some questions have no `solutionss` array

3. **Complex Patterns**:
   - Some variable expressions use complex patterns that may need manual review

---

## Script Implementation Details

### Input Processing

1. Read `.claude/old-questions.json`
2. Parse as `QuestionWithMigration[]`
3. Extract `_migration` metadata from each question

### Transformation

For each question:

1. Call `transformQuestion(question, globalIndex)`
2. Collect result (template, warnings, errors, stats)
3. Create `ExportedQuestion` object
4. Track structure (themes/domains/subdomains/levels)

### File Organization

1. Group questions by `theme/domain/subdomain/level`
2. Write one JSON file per group
3. Sanitize filenames (spaces → underscores, lowercase)
4. Create directories recursively

### Manifest Generation

1. Build complete structure tree
2. Count questions per category
3. Include paths to all files
4. Write as `manifest.json`

### Report Generation

1. Filter questions by status (success/warnings/errors)
2. Generate markdown tables
3. Include details for warnings and errors

---

## Usage

### Running the Script

```bash
pnpm tsx scripts/export-questions-for-review.ts
```

### Reviewing Output

1. **Start with summary.md** for overview
2. **Check manifest.json** for structure
3. **Review warnings.md** for issues
4. **Browse by-category/** for individual questions

---

## Next Steps

1. **Manual Review**: Review questions with warnings
2. **Fix Unknown Options**: Map remaining validation options
3. **Phase 2**: Implement image migration integration
4. **Phase 3**: Implement custom validation rules
5. **Phase 4**: Import into database

---

## Technical Decisions

### Why One File Per Level?

Initially considered grouping all levels in one file per subdomain, but chose one file per level because:

- Easier to review individual questions
- More granular organization
- Simpler to process in later phases
- Each file corresponds to exactly one question

### Why Include Both Original and Transformed?

Including both formats allows:

- Manual comparison during review
- Debugging transformation issues
- Preserving original data for reference
- Verifying conversion accuracy

### Why Generate Reports?

Reports provide:

- Quick identification of problem areas
- Statistics for tracking progress
- Documentation for manual review
- Clear actionable items

---

## Files Created

### Script

- **Path:** `/Users/david/Coding/js/ubumaths/scripts/export-questions-for-review.ts`
- **Lines:** ~550
- **Language:** TypeScript
- **Dependencies:**
  - `node:fs/promises` (readFile, writeFile, mkdir)
  - `node:path` (join, dirname)
  - `../src/lib/migration/old-question-types`
  - `../src/lib/migration/question-transformer`
  - `../src/lib/questions/types`

### Output

- **Base Directory:** `/Users/david/Coding/js/ubumaths/data/migration-output/export-2025-11-27/`
- **Total Files:** 637
  - 633 category JSON files (by-category/)
  - 1 manifest.json
  - 1 summary.md
  - 3 report files (reports/)

---

## Verification

### Script Execution

```bash
✓ Loaded 633 questions
✓ Transformed 633 questions
  Success: 633
  Warnings: 398
  Errors: 0
✓ Wrote 633 category files
✓ Wrote manifest to: data/migration-output/export-2025-11-27/manifest.json
✓ Wrote summary to: data/migration-output/export-2025-11-27/summary.md
✓ Wrote 3 report files to: data/migration-output/export-2025-11-27/reports
```

### File Counts

```bash
$ find data/migration-output/export-2025-11-27/by-category -name "*.json" | wc -l
633

$ wc -l data/migration-output/export-2025-11-27/reports/*.md
    3 errors.md
  240 success.md
 3767 warnings.md
 4010 total
```

### Sample Output

Verified:

- ✅ manifest.json has correct structure
- ✅ summary.md has readable statistics
- ✅ warnings.md lists issues clearly
- ✅ errors.md is empty (0 failures)
- ✅ level-\*.json files have correct format
- ✅ All questions are accounted for

---

## Conclusion

The export script successfully:

1. ✅ Loaded all 633 questions
2. ✅ Transformed 100% with no errors
3. ✅ Organized by theme/domain/subdomain/level
4. ✅ Generated comprehensive reports
5. ✅ Created manifest and summary
6. ✅ Identified 398 questions needing review

**Ready for manual review phase.**
