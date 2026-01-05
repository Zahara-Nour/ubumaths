# Grade System - Technical Guide

> Complete technical reference for the UbuMaths Grade System, supporting the French educational structure from CP to Terminale.

## Table of Contents

| Document                                        | Description                                   |
| ----------------------------------------------- | --------------------------------------------- |
| [Architecture Overview](#architecture-overview) | System design and data flow                   |
| [Types Reference](./types.md)                   | GradeCode, GradeInfo, constants               |
| [Validation Schemas](./validation.md)           | Zod schemas for API validation                |
| [Utility Functions](./utils.md)                 | Parsing, formatting, access control functions |
| [Access Control Model](./access-control.md)     | Prerequisite-based permission system          |
| [Tutor Adaptations](./tutor-adaptations.md)     | AI tutor grade-level adaptations              |

---

## Architecture Overview

### Design Principles

1. **Single Source of Truth**: All grade definitions in `$lib/types/grades.ts`
2. **Canonical Codes**: Internal storage uses canonical codes (e.g., `'6'`, `'1_SPE'`)
3. **Flexible Input**: User input normalized via `parseGradeCode()`
4. **Type Safety**: `GradeCode` union type ensures compile-time validation
5. **Zod Validation**: Runtime validation at all API boundaries
6. **Prerequisite Model**: Access control based on educational progression

### File Structure

```
src/lib/
├── types/
│   └── grades.ts              # Type definitions, constants, metadata
├── utils/
│   └── grades.ts              # Utility functions (parsing, formatting, access)
├── server/validation/
│   └── grades.ts              # Zod validation schemas
├── config/
│   └── tutor-grade-adaptations.ts  # AI tutor configuration per grade
└── components/
    └── GradeBadgeSelector.svelte   # UI component for grade selection
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                      │
│                    "sixieme", "6eme", "6e", "6ème"                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION LAYER                                     │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐  │
│  │ gradeFlexibleSchema │───▶│   parseGradeCode()  │───▶│  GradeCode: '6' │  │
│  │    (Zod schema)     │    │ (normalization)     │    │  (canonical)    │  │
│  └─────────────────────┘    └─────────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                                   │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐  │
│  │  GradeCode[] types  │    │ getAccessibleGrades │    │ formatGradeFor  │  │
│  │  (compile-time)     │    │ (access control)    │    │ Display()       │  │
│  └─────────────────────┘    └─────────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                                      │
│         grades: string[]  (stored as canonical codes in PostgreSQL)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## French Educational System

### Grade Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FRENCH SCHOOL SYSTEM                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  PRIMARY (Primaire)           MIDDLE (College)         HIGH SCHOOL (Lycee)   │
│  ═══════════════════          ════════════════         ══════════════════    │
│                                                                               │
│  ┌────┐ ┌────┐ ┌────┐         ┌───┐ ┌───┐ ┌───┐ ┌───┐        ┌───┐          │
│  │ CP │→│CE1 │→│CE2 │         │ 6 │→│ 5 │→│ 4 │→│ 3 │───────▶│ 2 │          │
│  └────┘ └────┘ └────┘         └───┘ └───┘ └───┘ └───┘        └─┬─┘          │
│      │                                                          │            │
│      ▼                                                          ▼            │
│  ┌────┐ ┌────┐                              ┌─────────────────────────────┐  │
│  │CM1 │→│CM2 │─────────────────────────────▶│      BRANCHING POINT        │  │
│  └────┘ └────┘                              │                             │  │
│                                             │  ┌───────┐ ┌───────┐ ┌────┐ │  │
│                                             │  │1_GEN  │ │1_SPE  │ │1_ST│ │  │
│                                             │  └───┬───┘ └───┬───┘ └──┬─┘ │  │
│                                             │      │         │        │   │  │
│                                             │      ▼         ▼        ▼   │  │
│                                             │  ┌───────┐ ┌───────┐ ┌────┐ │  │
│                                             │  │T_GEN  │ │T_SPE  │ │T_ST│ │  │
│                                             │  └───────┘ │T_EXP  │ └────┘ │  │
│                                             │            │T_COMP │        │  │
│                                             │            └───────┘        │  │
│                                             └─────────────────────────────┘  │
│                                                                               │
│  Cycle 2       Cycle 3        Cycle 4            Seconde   Cycle Terminal    │
│  ════════      ════════       ═══════            ═══════   ══════════════    │
│  CP,CE1,CE2    CM1,CM2,6      5,4,3                2       1ere + Terminale  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### The 18 Grade Codes

| Code     | Display Name          | Short     | Level   | Year | Track     | Maths Intensity |
| -------- | --------------------- | --------- | ------- | ---- | --------- | --------------- |
| `CP`     | CP                    | CP        | primary | 1    | -         | basic           |
| `CE1`    | CE1                   | CE1       | primary | 2    | -         | basic           |
| `CE2`    | CE2                   | CE2       | primary | 3    | -         | basic           |
| `CM1`    | CM1                   | CM1       | primary | 4    | -         | standard        |
| `CM2`    | CM2                   | CM2       | primary | 5    | -         | standard        |
| `6`      | 6eme                  | 6e        | middle  | 6    | -         | standard        |
| `5`      | 5eme                  | 5e        | middle  | 7    | -         | standard        |
| `4`      | 4eme                  | 4e        | middle  | 8    | -         | standard        |
| `3`      | 3eme                  | 3e        | middle  | 9    | -         | standard        |
| `2`      | 2nde                  | 2nde      | high    | 10   | general   | standard        |
| `1_GEN`  | 1ere generale         | 1ere G    | high    | 11   | general   | standard        |
| `1_SPE`  | 1ere Specialite Maths | 1ere Spe  | high    | 11   | spe_maths | advanced        |
| `1_STMG` | 1ere STMG             | 1ere STMG | high    | 11   | stmg      | basic           |
| `T_GEN`  | Terminale generale    | Term G    | high    | 12   | general   | standard        |
| `T_SPE`  | Terminale Specialite  | Term Spe  | high    | 12   | spe_maths | advanced        |
| `T_EXP`  | Terminale Maths Exp   | Term Exp  | high    | 12   | spe_maths | expert          |
| `T_COMP` | Terminale Maths Comp  | Term Comp | high    | 12   | general   | advanced        |
| `T_STMG` | Terminale STMG        | Term STMG | high    | 12   | stmg      | basic           |

### High School Tracks Explained

| Track       | Description                                             | Math Level |
| ----------- | ------------------------------------------------------- | ---------- |
| `general`   | General track without math specialization               | Standard   |
| `spe_maths` | Mathematics specialization (Specialite Maths)           | Advanced   |
| `stmg`      | Sciences et Technologies du Management et de la Gestion | Basic      |

**Special Terminale Options:**

- `T_EXP` (Maths Expert): Additional option for T_SPE students
- `T_COMP` (Maths Complementaires): Option for T_GEN students who want more math

---

## Quick Reference

### Import Patterns

```typescript
// Types and constants
import { GRADE_CODES, GRADES, type GradeCode, type GradeInfo } from '$lib/types/grades';

// Utility functions
import {
	parseGradeCode,
	formatGradeForDisplay,
	getAccessibleGrades,
	hasAccessToGrade
} from '$lib/utils/grades';

// Validation schemas
import {
	gradeCodeSchema,
	gradeFlexibleSchema,
	gradeArraySchema,
	gradeCommaSeparatedSchema
} from '$lib/server/validation/grades';
```

### Common Use Cases

#### 1. Parse User Input

```typescript
import { parseGradeCode } from '$lib/utils/grades';

const grade = parseGradeCode('sixieme'); // Returns: '6'
const grade2 = parseGradeCode('6eme'); // Returns: '6'
const grade3 = parseGradeCode('invalid'); // Returns: null
```

#### 2. Validate API Input

```typescript
import { gradeFlexibleSchema } from '$lib/server/validation/grades';

const result = gradeFlexibleSchema.safeParse('6eme');
if (result.success) {
	const grade: GradeCode = result.data; // '6'
}
```

#### 3. Check Access Permission

```typescript
import { hasAccessToGrade } from '$lib/utils/grades';

// Can a 6eme student access CM2 content?
hasAccessToGrade('6', 'CM2'); // true (CM2 is prerequisite)

// Can a 6eme student access 5eme content?
hasAccessToGrade('6', '5'); // false (5 comes after 6)
```

#### 4. Format for Display

```typescript
import { formatGradeForDisplay, formatGradeShort } from '$lib/utils/grades';

formatGradeForDisplay('6'); // '6eme' (with proper accent)
formatGradeShort('1_SPE'); // '1ere Spe'
```

#### 5. Get Grade Metadata

```typescript
import { GRADES } from '$lib/types/grades';

const info = GRADES['6'];
// {
//   code: '6',
//   displayName: '6eme',
//   shortName: '6e',
//   level: 'middle',
//   schoolYear: 6,
//   mathsIntensity: 'standard',
//   prerequisites: ['CM2']
// }
```

---

## Database Integration

### Storage Format

Grades are stored as `string[]` in PostgreSQL:

```sql
-- Example: exercises table
CREATE TABLE exercises (
  id UUID PRIMARY KEY,
  grades TEXT[] DEFAULT '{}',
  -- ...
);

-- Example query
SELECT * FROM exercises WHERE 'CM2' = ANY(grades);
```

### Database Functions

```sql
-- Validate grade array
SELECT is_valid_grade_array(ARRAY['6', '5', '4']);  -- true

-- Normalize grades
SELECT normalize_grade_array(ARRAY['6eme', 'cinquieme']);  -- {'6', '5'}

-- Get pedagogical cycle
SELECT get_cycle_for_grade('CM1');  -- 'Cycle 3'
```

### Tables Using Grades

| Table                | Column   | Type           | Usage                      |
| -------------------- | -------- | -------------- | -------------------------- |
| `exercises`          | `grades` | `string[]`     | Target grades for exercise |
| `question_templates` | `grades` | `string[]`     | Applicable grades          |
| `chapter_templates`  | `grades` | `string[]`     | Chapter grade levels       |
| `worksheets`         | `grades` | `string[]`     | Worksheet grade levels     |
| `classes`            | `grade`  | `string\|null` | Class grade level          |
| `rag_documents`      | `grades` | `string[]`     | Document applicable grades |

---

## Type Safety

### Boundary Crossing Pattern

When data crosses the DB/App boundary, use type assertions after Zod validation:

```typescript
// In converter function (e.g., dbTemplateToApp)
export function dbTemplateToApp(db: DbChapterTemplate): ChapterTemplate {
	return {
		// ... other fields
		grades: db.grades as GradeCode[] // Safe: Zod validated on insert
		// ...
	};
}
```

### DB Types vs App Types

```typescript
// DB type (from database.ts - auto-generated)
interface DbChapterTemplate {
	grades: string[]; // Raw database type
}

// App type (in chapter-templates.ts)
interface ChapterTemplate {
	grades: GradeCode[]; // Typed for application use
}
```

---

## Test Coverage

The Grade System has comprehensive test coverage:

| File                         | Tests | Coverage           |
| ---------------------------- | ----- | ------------------ |
| `grades.test.ts` (types)     | 15+   | Cycles, helpers    |
| `grades.test.ts` (utils)     | 100+  | All functions      |
| `GradeBadgeSelector.test.ts` | 30+   | Component behavior |

Run tests:

```bash
pnpm test:client src/lib/types/grades.test.ts
pnpm test:client src/lib/utils/grades.test.ts
```

---

## Related Documentation

- [Authentication](../auth/README.md) - User role and grade assignment
- [Exercises](../exercices/README.md) - Exercise grade targeting
- [TutorBot](../tutorbot/README.md) - Grade-adapted AI responses
- [Worksheets](../worksheets/README.md) - Worksheet grade configuration
