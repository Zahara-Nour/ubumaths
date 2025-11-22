# Exercise Import/Export System

> **📖 Core Project Guidelines**: See **[CLAUDE.md](../../../CLAUDE.md)** for project structure and development workflows.
>
> **🏠 Exercise Bank**: See **[README.md](./README.md)** for the main Exercise Bank System documentation.

This document provides comprehensive documentation for the Exercise Import/Export feature.

---

## Overview

The Import/Export system allows teachers to share exercises across UbuMaths instances, create backups, and collaborate on exercise content. The system supports two formats:

- **JSON** - Structured data format for programmatic use and bulk operations
- **Markdown** - Human-readable format with YAML frontmatter for easy editing

**Status**: ✅ **Complete** (Phase 1) - All duplicate strategies implemented

**Location**: `/dashboard/teacher/exercises` (teacher-only)

**Version**: 1.0

**Latest Update**: 2025-10-26 - All 3 duplicate handling strategies fully working (skip, replace, create-copy)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Export Formats](#export-formats)
- [Import Process](#import-process)
- [Duplicate Detection](#duplicate-detection)
- [Validation](#validation)
- [API Reference](#api-reference)
- [File Structure](#file-structure)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Exporting Exercises

1. Navigate to `/dashboard/teacher/exercises`
2. Select one or more exercises (checkbox)
3. Click "Exporter" button in the toolbar
4. Choose format (JSON or Markdown)
5. Click "Télécharger"

**Result**: Downloads a `.json` or `.md` file with the exercise data.

### Importing Exercises

1. Navigate to `/dashboard/teacher/exercises`
2. Click "Importer" button in the toolbar
3. Select format (JSON or Markdown)
4. Choose file or paste content
5. Select duplicate handling strategy:
   - **Ignorer** (skip) - Skip duplicates ✅
   - **Remplacer** (replace) - Replace existing exercise ✅
   - **Créer une copie** (create-copy) - Create new with modified title ✅
6. Click "Importer"

**Result**: Exercises are imported and appear in your exercise list.

---

## Export Formats

### JSON Format

Structured JSON format ideal for programmatic use and bulk operations.

#### Single Exercise

```json
{
	"version": "1.0",
	"difficulty": 2,
	"tags": ["algèbre", "équations"],
	"statement_md": "Résoudre l'équation suivante :\n\n$$x^2 - 5x + 6 = 0$$",
	"solution_md": "**Méthode de factorisation** :\n\n$$(x - 2)(x - 3) = 0$$\n\nDonc $x = 2$ ou $x = 3$",
	"title": "Équation du second degré",
	"source": "Livre de mathématiques 3ème",
	"grade_levels": ["3", "2"],
	"topic": "Algèbre"
}
```

#### Multiple Exercises (Array)

```json
[
	{
		"version": "1.0",
		"difficulty": 1,
		"tags": ["géométrie"],
		"statement_md": "Calculer le périmètre d'un carré de côté 5 cm.",
		"solution_md": "$P = 4 \\times 5 = 20$ cm"
	},
	{
		"version": "1.0",
		"difficulty": 2,
		"tags": ["algèbre"],
		"statement_md": "Résoudre : $2x + 3 = 7$",
		"solution_md": "$x = 2$"
	}
]
```

**Fields**:

| Field          | Type        | Required | Description                                 |
| -------------- | ----------- | -------- | ------------------------------------------- |
| `version`      | string      | ✅       | Format version (always "1.0")               |
| `difficulty`   | 1 \| 2 \| 3 | ✅       | 1=Easy, 2=Medium, 3=Hard                    |
| `tags`         | string[]    | ✅       | Category tags (can be empty array)          |
| `statement_md` | string      | ✅       | Exercise statement (markdown with LaTeX)    |
| `solution_md`  | string      | ✅       | Exercise solution (markdown with LaTeX)     |
| `title`        | string      | ❌       | Exercise title                              |
| `source`       | string      | ❌       | Source reference (textbook, etc.)           |
| `grade_levels` | string[]    | ❌       | Target grade levels (e.g., ["6", "5", "4"]) |
| `topic`        | string      | ❌       | Math topic/domain                           |

**Notes**:

- All strings are trimmed during validation
- Empty strings in `statement_md` or `solution_md` are rejected
- `difficulty` must be exactly 1, 2, or 3
- Markdown supports LaTeX with `$...$` (inline) and `$$...$$` (block)

### Markdown Format

Human-readable format with YAML frontmatter, ideal for version control and manual editing.

```markdown
---
version: '1.0'
difficulty: 2
tags:
  - algèbre
  - équations
title: 'Équation du second degré'
source: 'Livre de mathématiques 3ème'
grade_levels:
  - '3'
  - '2'
topic: 'Algèbre'
---

# Énoncé

Résoudre l'équation suivante :

$$x^2 - 5x + 6 = 0$$

# Solution

**Méthode de factorisation** :

$$(x - 2)(x - 3) = 0$$

Donc $x = 2$ ou $x = 3$
```

**Structure**:

1. **Frontmatter** (YAML between `---` delimiters)
   - Contains metadata (title, difficulty, tags, etc.)
   - Required fields: `version`, `difficulty`, `tags`
   - Optional fields can be omitted

2. **Énoncé Section** (Required)
   - Must start with `# Énoncé` heading
   - Contains the exercise statement
   - Supports full markdown with LaTeX

3. **Solution Section** (Required)
   - Must start with `# Solution` heading
   - Contains the exercise solution
   - Supports full markdown with LaTeX

**LaTeX Examples**:

```markdown
# Énoncé

Inline math: Calculer $\frac{x^2 + 2x}{3}$ pour $x = 6$.

Block math:

$$
\int_0^\pi \sin(x) dx = 2
$$

Multiple lines:

$$
\begin{align}
f(x) &= x^2 + 2x + 1 \\
     &= (x + 1)^2
\end{align}
$$
```

---

## Import Process

### Step-by-Step Flow

1. **File Selection**
   - Upload file (`.json` or `.md`)
   - Or paste content directly

2. **Format Detection**
   - JSON: Detects `{` or `[` at start
   - Markdown: Detects `---` frontmatter delimiter

3. **Parsing**
   - **JSON**: `JSON.parse()` → object or array
   - **Markdown**: Extract YAML frontmatter + parse sections

4. **Validation** (if enabled)
   - Validate against Zod schema
   - Check required fields
   - Validate data types and ranges
   - Trim whitespace

5. **Duplicate Detection**
   - Compute SHA-256 hash of `title + statement_md`
   - Query database for matching hash
   - Apply duplicate strategy

6. **Database Insert**
   - Create new exercise record
   - Link to current user as `created_by`
   - Auto-generate timestamps

7. **Result**
   - Return statistics: imported, skipped, failed
   - Return error messages for failures

### Import Options

```typescript
interface ImportOptions {
	onDuplicate?: 'skip' | 'replace' | 'create-copy'; // Default: 'skip'
	validate?: boolean; // Default: true
}
```

**Duplicate Strategies**:

- **`skip`** ✅ (Implemented)
  - If duplicate found, skip import
  - Return existing exercise ID
  - Count as "skipped"
  - No changes to existing exercise

- **`replace`** ✅ (Implemented)
  - If duplicate found, update existing record
  - **Ownership verification**: Only allows replace if user owns the exercise
  - Rejects with error if user doesn't own the duplicate
  - Preserves original `created_by` and `created_at`
  - Updates `updated_at` timestamp
  - All content fields are replaced with new values

- **`create-copy`** ✅ (Implemented)
  - If duplicate found, create new exercise with modified title
  - Appends " (copie)" to title for first duplicate
  - Incremental numbering for subsequent duplicates: " (copie 2)", " (copie 3)", etc.
  - Searches for existing "copie N" suffixes to find next available number
  - Count as "imported"
  - Creates completely new record (new ID, timestamps)

**Validation**:

- **Enabled** (default): Validates all fields before import
  - Rejects invalid data with detailed error messages
  - Prevents corrupted data in database

- **Disabled**: Skip validation (use with caution)
  - Useful for importing from trusted sources
  - Faster bulk imports
  - May insert invalid data

---

## Duplicate Detection

The system uses content-based hashing to detect duplicate exercises.

### Hash Computation

```typescript
// Compute hash from title + statement
const hashInput = `${exercise.title || ''}|||${exercise.statement_md}`;
const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
```

**Why this approach?**

- **Title + Statement** - Uniquely identifies exercise content
- **Solution not included** - Allows different solution approaches
- **SHA-256** - Fast, collision-resistant
- **Deterministic** - Same input always produces same hash

### Database Query

```sql
-- Check for duplicate by hash
SELECT id, title, statement_md
FROM exercises
WHERE content_hash = $1
  AND created_by = $2
LIMIT 100;
```

**Notes**:

- Only checks exercises created by same user
- Returns up to 100 matches (edge case handling)
- First match is used for duplicate decision

### Duplicate Strategy Examples

**Skip Strategy**:

```typescript
// First import: Creates new exercise
await importExerciseFromJSON(supabase, exerciseData, userId, { onDuplicate: 'skip' });
// Result: { success: true, exerciseId: 'ex-1', skipped: false }

// Second import (duplicate): Skips
await importExerciseFromJSON(supabase, exerciseData, userId, { onDuplicate: 'skip' });
// Result: { success: true, exerciseId: 'ex-1', skipped: true }
```

**Replace Strategy**:

```typescript
// Import duplicate with replace (user owns exercise)
await importExerciseFromJSON(supabase, updatedExercise, userId, { onDuplicate: 'replace' });
// Result: { success: true, exerciseId: 'ex-1', skipped: false }
// Effect: Exercise 'ex-1' content is updated, created_at preserved

// Import duplicate with replace (user doesn't own exercise)
await importExerciseFromJSON(supabase, updatedExercise, differentUserId, {
	onDuplicate: 'replace'
});
// Result: { success: false, error: 'Cannot replace exercise owned by another user' }
```

**Create-Copy Strategy**:

```typescript
// Original exercise: "Équations du premier degré"
await importExerciseFromJSON(supabase, exerciseData, userId, { onDuplicate: 'skip' });

// First duplicate: "Équations du premier degré (copie)"
await importExerciseFromJSON(supabase, exerciseData, userId, { onDuplicate: 'create-copy' });

// Second duplicate: "Équations du premier degré (copie 2)"
await importExerciseFromJSON(supabase, exerciseData, userId, { onDuplicate: 'create-copy' });

// Third duplicate: "Équations du premier degré (copie 3)"
await importExerciseFromJSON(supabase, exerciseData, userId, { onDuplicate: 'create-copy' });
// Each creates a completely new exercise with unique ID
```

### Edge Cases

**Whitespace differences**:

- All strings are trimmed during validation
- Extra newlines/spaces don't affect hash
- Example: `"  Title  "` → `"Title"`

**LaTeX formatting**:

- LaTeX is preserved exactly as written
- `$x^2$` ≠ `$ x^2 $` (different hashes)
- Recommendation: Use consistent LaTeX formatting

**Null vs. undefined**:

- `title: null` and `title: undefined` both hash as `""` (empty string)
- No difference for duplicate detection

---

## Validation

The system uses Zod schemas for runtime validation.

### Validation Rules

#### Required Fields

```typescript
{
  version: '1.0',                    // Must be exactly "1.0"
  difficulty: 1 | 2 | 3,             // Integer 1, 2, or 3
  tags: string[],                    // Array (can be empty)
  statement_md: string,              // Non-empty after trim
  solution_md: string                // Non-empty after trim
}
```

#### Optional Fields

```typescript
{
  title?: string,                    // Trimmed, no min length
  source?: string,                   // Trimmed, no min length
  grade_levels?: string[],           // Array of strings
  topic?: string                     // Trimmed, no min length
}
```

### Validation Errors

Error messages include field path and description:

```typescript
// Example error
{
  success: false,
  error: "difficulty: Expected 1 | 2 | 3, received 5; statement_md: String must contain at least 1 character(s)"
}
```

**Common Errors**:

| Error Message                                  | Cause                    | Fix                         |
| ---------------------------------------------- | ------------------------ | --------------------------- |
| `difficulty: Expected 1 \| 2 \| 3, received 5` | Invalid difficulty value | Use 1, 2, or 3              |
| `statement_md: String must contain at least 1` | Empty statement          | Provide non-empty statement |
| `tags: Expected array, received string`        | Tags is not array        | Use `[]` or `["tag1"]`      |
| `version: Expected "1.0", received "2.0"`      | Wrong version            | Use version "1.0"           |
| `estimated_time: Number must be positive`      | Negative or zero time    | Use positive number         |

### Skipping Validation

```typescript
// Import without validation (use with caution!)
await importExerciseFromJSON(supabase, data, userId, {
	validate: false
});
```

**Use cases**:

- Importing from trusted source
- Performance-critical bulk imports
- Data migration from legacy system

**Risks**:

- May insert invalid data
- Database constraints still apply
- May cause runtime errors later

---

## API Reference

### Export Endpoints

#### `POST /api/exercises/export`

Export exercises to JSON or Markdown format.

**Request**:

```typescript
{
  format: 'json' | 'markdown',
  exerciseIds: string[],              // Array of exercise IDs
  options?: {
    pretty?: boolean                  // Pretty-print JSON (default: true)
  }
}
```

**Response**:

```typescript
{
  success: true,
  data: string,                       // JSON string or Markdown content
  filename: string,                   // Suggested filename
  count: number                       // Number of exercises exported
}
```

**Example**:

```typescript
// Export as JSON
const response = await fetch('/api/exercises/export', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		format: 'json',
		exerciseIds: ['ex-1', 'ex-2'],
		options: { pretty: true }
	})
});

const { data, filename } = await response.json();
// data: '[{...}, {...}]'
// filename: 'exercises-2025-01-26.json'
```

**Error Response**:

```typescript
{
  success: false,
  error: string                       // Error message
}
```

**Status Codes**:

- `200` - Success
- `400` - Invalid request (missing fields, invalid format)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not a teacher)
- `500` - Server error

### Import Endpoints

#### `POST /api/exercises/import`

Import exercises from JSON or Markdown format.

**Request**:

```typescript
{
  format: 'json' | 'markdown',
  content: string | object,           // File content or parsed JSON
  options?: {
    on_duplicate?: 'skip' | 'replace' | 'create-copy',
    validate?: boolean                // Default: true
  }
}
```

**Response**:

```typescript
{
  success: boolean,
  imported: number,                   // Successfully imported
  skipped: number,                    // Skipped duplicates
  failed: number,                     // Failed imports
  importedIds: string[],              // IDs of imported exercises
  errors: Array<{                     // Error details
    index: number,                    // Exercise index in array
    error: string                     // Error message
  }>
}
```

**Example - Single Exercise**:

```typescript
const response = await fetch('/api/exercises/import', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		format: 'json',
		content: {
			version: '1.0',
			difficulty: 2,
			tags: ['algèbre'],
			statement_md: 'Résoudre: $x^2 = 4$',
			solution_md: '$x = \\pm 2$'
		},
		options: {
			on_duplicate: 'skip',
			validate: true
		}
	})
});

const result = await response.json();
// { success: true, imported: 1, skipped: 0, failed: 0, ... }
```

**Example - Multiple Exercises**:

```typescript
const response = await fetch('/api/exercises/import', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		format: 'json',
		content: [
			{ version: '1.0', difficulty: 1, tags: [], statement_md: 'Q1', solution_md: 'A1' },
			{ version: '1.0', difficulty: 2, tags: [], statement_md: 'Q2', solution_md: 'A2' }
		],
		options: { on_duplicate: 'skip' }
	})
});

const result = await response.json();
// { success: true, imported: 2, skipped: 0, failed: 0, importedIds: ['ex-1', 'ex-2'], ... }
```

**Example - Markdown**:

```typescript
const markdownContent = `---
version: "1.0"
difficulty: 2
tags: []
---

# Énoncé

Question here

# Solution

Answer here
`;

const response = await fetch('/api/exercises/import', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		format: 'markdown',
		content: markdownContent
	})
});
```

**Error Response**:

```typescript
{
  success: false,
  imported: 0,
  skipped: 0,
  failed: 1,
  importedIds: [],
  errors: [{
    index: 0,
    error: 'difficulty: Expected 1 | 2 | 3, received 5'
  }]
}
```

**Status Codes**:

- `200` - Success (even if some imports failed - check `success` field)
- `400` - Invalid request format
- `401` - Unauthorized
- `403` - Forbidden (teachers only)
- `500` - Server error

---

## File Structure

### Project Files

```
src/lib/exercises/
├── types.ts                          # TypeScript types
├── validation.ts                     # Zod validation schemas
├── markdown-frontmatter.ts           # Markdown parsing/serialization
├── markdown-frontmatter.test.ts      # Markdown tests (17 tests)
└── validation.test.ts                # Validation tests (14 tests)

src/lib/server/
├── exercise-import-export.ts         # Server-side import/export functions
└── exercise-import-export.test.ts    # Server tests (20 tests)

src/lib/components/exercises/
├── ExportDialog.svelte               # Export UI component
└── ImportDialog.svelte               # Import UI component

src/routes/api/exercises/
├── export/
│   └── +server.ts                    # Export API endpoint
└── import/
    └── +server.ts                    # Import API endpoint

docs/features/exercises/
├── README.md                         # Main exercises documentation
└── import-export.md                  # This file
```

### Type Definitions

**`src/lib/exercises/types.ts`**:

```typescript
/**
 * Exercise export format (clean JSON representation)
 */
export interface ExerciseExport {
	version: '1.0';

	// Metadata
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];

	// Content
	statement_md: string;
	solution_md: string;

	// Additional metadata
	grade_levels?: string[];
	topic?: string;
}

/**
 * Exercise frontmatter (YAML in markdown files)
 */
export interface ExerciseFrontmatter {
	version: '1.0';
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];
	grade_levels?: string[];
	topic?: string;
}

/**
 * Import options
 */
export interface ImportOptions {
	onDuplicate?: 'skip' | 'replace' | 'create-copy';
	validate?: boolean;
}

/**
 * Import result (single exercise)
 */
export interface ImportResult {
	success: boolean;
	exerciseId?: string;
	skipped?: boolean;
	error?: string;
}

/**
 * Bulk import result (multiple exercises)
 */
export interface BulkImportResult {
	success: boolean;
	imported: number;
	skipped: number;
	failed: number;
	importedIds: string[];
	errors: Array<{
		index: number;
		error: string;
	}>;
}
```

---

## Best Practices

### Exporting

✅ **DO**:

- Export related exercises together
- Use JSON for bulk exports (faster parsing)
- Use Markdown for version control (git-friendly)
- Include metadata (title, source, tags) for better organization
- Test exported files before sharing

❌ **DON'T**:

- Export exercises with sensitive information
- Share exercises without permission
- Export corrupted/incomplete exercises
- Mix different export formats in same batch

### Importing

✅ **DO**:

- Review imported content before use
- Use "skip" duplicate strategy by default
- Keep validation enabled for untrusted sources
- Test imports on development instance first
- Backup database before large imports

❌ **DON'T**:

- Disable validation for untrusted sources
- Import without reviewing content first
- Use "replace" on production without backup
- Import exercises from unknown sources
- Ignore error messages

### File Management

✅ **DO**:

- Use descriptive filenames: `algebra-grade3-2025-01-26.json`
- Store exports in version control for collaboration
- Organize exports by subject, grade, or topic
- Compress large export files (`.zip`, `.tar.gz`)
- Document export metadata (date, author, purpose)

❌ **DON'T**:

- Use generic filenames: `export.json`
- Store exports in public repositories
- Mix exports from different versions
- Overwrite existing export files
- Forget to update export documentation

### Collaboration

✅ **DO**:

- Share exports via secure channels
- Document exercise sources and authors
- Version exports using git tags
- Review imported content before publishing
- Coordinate with team on duplicate handling

❌ **DON'T**:

- Share exports publicly without permission
- Remove author attribution
- Import without team review
- Overwrite collaborator's work
- Forget to communicate changes

---

## Troubleshooting

### Common Issues

#### 1. Import fails with "Invalid JSON"

**Cause**: Malformed JSON syntax

**Symptoms**:

```
Error: Invalid JSON content
```

**Solutions**:

- Validate JSON at [jsonlint.com](https://jsonlint.com)
- Check for missing commas, quotes, or brackets
- Ensure proper UTF-8 encoding
- Remove trailing commas (not valid in JSON)

**Example Fix**:

```json
// ❌ Invalid (trailing comma)
{
  "title": "Exercise",
  "difficulty": 2,
}

// ✅ Valid
{
  "title": "Exercise",
  "difficulty": 2
}
```

#### 2. Markdown import fails with "Missing frontmatter"

**Cause**: Missing or invalid YAML frontmatter delimiters

**Symptoms**:

```
Error: Invalid frontmatter: missing delimiters (---)
```

**Solutions**:

- Ensure file starts with `---` on first line
- Ensure second `---` delimiter is present
- Check YAML syntax between delimiters
- Ensure newline after second `---`

**Example Fix**:

```markdown
❌ Invalid (no delimiters)
version: "1.0"
difficulty: 2

# Énoncé

...

## ✅ Valid

version: "1.0"
difficulty: 2

---

# Énoncé

...
```

#### 3. Validation error: "difficulty: Expected 1 | 2 | 3"

**Cause**: Invalid difficulty value

**Symptoms**:

```
Error: difficulty: Expected 1 | 2 | 3, received 5
```

**Solutions**:

- Use only 1 (easy), 2 (medium), or 3 (hard)
- Ensure difficulty is a number, not a string
- Check for typos in JSON

**Example Fix**:

```json
// ❌ Invalid
{ "difficulty": 5 }
{ "difficulty": "2" }

// ✅ Valid
{ "difficulty": 2 }
```

#### 4. LaTeX not rendering after import

**Cause**: Escaped backslashes in JSON

**Symptoms**:

- Formulas display as raw LaTeX
- Double backslashes visible: `\\frac`

**Solutions**:

- Use single backslash in markdown format
- Use double backslash in JSON format
- Check JSON escaping

**Example**:

```json
// JSON format (escaped)
{
	"solution_md": "$x = \\\\pm 2$"
}
```

```markdown
<!-- Markdown format (not escaped) -->

# Solution

$x = \pm 2$
```

#### 5. All imports skipped (0 imported, N skipped)

**Cause**: All exercises are duplicates

**Symptoms**:

```json
{
	"success": true,
	"imported": 0,
	"skipped": 5,
	"failed": 0
}
```

**Solutions**:

- Change duplicate strategy to "create-copy" (when implemented)
- Modify title or statement to make unique
- Check if exercises were previously imported
- Verify `created_by` user (duplicates only checked per user)

#### 6. Import succeeds but exercises not visible

**Cause**: Exercises belong to different user

**Symptoms**:

- Import reports success
- Exercises don't appear in list
- Database contains records

**Solutions**:

- Verify logged-in user
- Check `created_by` field in database
- Ensure exercises page filters correctly
- Refresh browser cache

**Query to check**:

```sql
SELECT id, title, created_by
FROM exercises
ORDER BY created_at DESC
LIMIT 10;
```

#### 7. "Empty statement" error on import

**Cause**: Statement is whitespace-only or empty

**Symptoms**:

```
Error: statement_md: String must contain at least 1 character(s)
```

**Solutions**:

- Ensure statement has visible content
- Remove whitespace-only sections
- Check for empty `# Énoncé` sections in markdown

**Example Fix**:

```markdown
## ❌ Invalid (empty statement)

version: "1.0"
difficulty: 2
tags: []

---

# Énoncé

# Solution

Answer here

## ✅ Valid

version: "1.0"
difficulty: 2
tags: []

---

# Énoncé

Question here

# Solution

Answer here
```

#### 8. "Missing Solution section" error

**Cause**: Markdown missing `# Solution` heading

**Symptoms**:

```
Error: Missing "# Solution" heading in markdown body
```

**Solutions**:

- Add `# Solution` heading
- Ensure exact text: `# Solution` (not `## Solution` or `# Solutions`)
- Check for typos in heading

**Example Fix**:

```markdown
❌ Invalid (wrong heading level)

# Énoncé

Question

## Solution <!-- Should be # Solution -->

Answer

✅ Valid

# Énoncé

Question

# Solution

Answer
```

---

## Recent Fixes & Improvements

### Math Extractor Regex Bug (Fixed 2025-10-26)

**Issue**: Inline math extraction was failing due to unescaped `$` in regex pattern.

**Symptoms**:

- Inline math `$x^2$` not rendering correctly
- 20 test failures in math-extractor tests
- Math formulas appearing as raw LaTeX text

**Root Cause**:

The regex pattern had an unescaped `$` character:

```typescript
// ❌ BEFORE (incorrect - unescaped $ at start and end)
const INLINE_MATH_REGEX = /(?<!\\)$([^$\n]+)$/g;

// ✅ AFTER (correct - properly escaped \$)
const INLINE_MATH_REGEX = /(?<!\\)\$([^$\n]+)\$/g;
```

**Impact**:

- All 26 math-extractor tests now passing ✅
- Inline math extraction working correctly
- No impact on block math (`$$...$$`)

**Verification**:

```bash
pnpm vitest run src/lib/exercises/parser/math-extractor.test.ts
# Result: ✅ 26 tests passing
```

### Duplicate Handling Strategies (Completed 2025-10-26)

**Implemented Features**:

- ✅ `skip` strategy - Skip duplicates (original implementation)
- ✅ `replace` strategy - Replace existing with ownership verification
- ✅ `create-copy` strategy - Create new with incremental title numbering

**Testing**:

All 23 import/export tests passing, including:

- Skip duplicate detection
- Replace with ownership check
- Create-copy with incremental numbering ("copie", "copie 2", etc.)
- Error handling for unauthorized replace attempts
- Mixed import results (success/skip/error)

---

## Testing

### Unit Tests

The import/export system has comprehensive test coverage:

**Test Files**:

- `src/lib/exercises/validation.test.ts` - 14 tests
- `src/lib/exercises/markdown-frontmatter.test.ts` - 17 tests
- `src/lib/server/exercise-import-export.test.ts` - 23 tests ✅

**Total Coverage**: 54 tests (all passing)

**Test Categories**:

1. **Validation Tests** (`validation.test.ts`)
   - Valid exercise export validation
   - Invalid field rejection
   - Whitespace trimming
   - Optional field handling
   - Array validation

2. **Markdown Tests** (`markdown-frontmatter.test.ts`)
   - YAML frontmatter parsing
   - Markdown serialization
   - Round-trip conversion
   - LaTeX preservation
   - Error handling

3. **Import/Export Tests** (`exercise-import-export.test.ts`)
   - JSON export/import (single and bulk)
   - Markdown export/import with frontmatter
   - **Duplicate detection** with SHA-256 hashing
   - **All 3 duplicate strategies**: skip, replace, create-copy ✅
   - **Replace strategy**: Ownership verification
   - **Create-copy strategy**: Incremental title generation
   - Validation integration
   - Error handling for invalid data
   - Bulk imports with mixed results
   - Filename generation and sanitization

**Running Tests**:

```bash
# Run all import/export tests
pnpm vitest run src/lib/exercises/ src/lib/server/exercise-import-export.test.ts

# Run specific test file
pnpm vitest run src/lib/exercises/validation.test.ts

# Run with coverage
pnpm vitest run --coverage
```

**Example Test**:

```typescript
it('should import valid JSON exercise', async () => {
	const jsonData = {
		version: '1.0',
		difficulty: 2,
		tags: ['test'],
		statement_md: 'Question',
		solution_md: 'Answer',
		title: 'Imported Exercise'
	};

	const result = await importExerciseFromJSON(mockSupabase, jsonData, 'user-123');

	expect(result.success).toBe(true);
	expect(result.exerciseId).toBeDefined();
	expect(result.error).toBeUndefined();
});
```

---

## Future Enhancements

Planned improvements for the import/export system:

### Phase 2: Templates (Planned)

- **System Templates** - Pre-built exercise templates
- **Template Library** - Browse and use community templates
- **Template Export** - Share templates with other teachers

### Phase 3: Public Library (Planned)

- **Public Exercises** - Mark exercises as public for sharing
- **Exercise Discovery** - Browse public exercises by other teachers
- **Favorites** - Bookmark exercises for later use
- **Duplicate to Library** - Copy public exercises to your collection

### Additional Features

- **Batch Operations** - Export/import entire exercise sets
- **Version Control** - Track changes to imported exercises
- **Conflict Resolution** - UI for resolving duplicate conflicts
- **Import Preview** - Preview exercises before import
- **Export Options** - Custom export formats (PDF, DOCX)
- **Compression** - Auto-compress large exports
- **Statistics** - Import/export history and analytics

---

## Related Documentation

- **[Exercise Bank System](./README.md)** - Main documentation
- **[Database Schema](../../architecture/database-schema.md)** - Exercise table structure
- **[API Reference](./api.md)** - Complete API documentation (planned)

---

**Questions or Issues?**

If you encounter problems with import/export, please:

1. Check this troubleshooting guide
2. Review the test files for examples
3. Check the console for detailed error messages
4. Report issues to the development team
