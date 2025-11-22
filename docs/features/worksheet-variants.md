# Worksheet Variant Generation System

## Overview

The worksheet variant generation system allows teachers to create parameterized worksheets that generate unique instances for each student. This ensures every student gets different numbers while maintaining the same problem structure and difficulty.

## Features

### Variant Modes

The system supports four variant generation modes:

1. **none** - All students receive identical worksheets
2. **individual** - Each student gets a unique variant based on their ID
3. **n_versions** - Limited number of versions (A, B, C, etc.)
4. **group** - Students are grouped with same variants within groups

### Parameterization System

Exercises can include parameterized variables using the following syntax:

- **Variables**: `{{variableName}}`
- **Random numbers**: `{{random:1-10}}` or `{{1-10}}`
- **Evaluated expressions**: `{{eval:a+b}}`
- **Variable chaining**: Variables can reference other variables

Example exercise with parameters:

```markdown
Variables:

- a: {{random:1-10}}
- b: {{random:1-10}}
- sum: {{eval:a+b}}

Statement: Calculate {{a}} + {{b}}
Solution: {{a}} + {{b}} = {{sum}}
```

### Deterministic Generation

- Each student-worksheet pair generates the same variant every time
- Seeds are calculated based on worksheet ID and student ID
- Ensures consistent results across sessions

## API Endpoints

### Preview Endpoint

**POST** `/api/worksheets/{id}/preview`

Generate a preview of what a specific student will see.

Request body:

```json
{
	"studentId": "uuid", // Optional
	"variantSeed": 12345 // Optional custom seed
}
```

Response:

```json
{
  "instanceData": {
    "exercises": [...],
    "variant_info": {
      "seed": 12345,
      "version": "A",
      "group_id": "G1"
    }
  },
  "worksheet": {...},
  "student": {...},
  "metadata": {...}
}
```

### Instances Endpoint

**POST** `/api/worksheets/{id}/instances`

Generate instances for all students in a class.

Request body:

```json
{
	"classId": "uuid"
}
```

Response:

```json
{
  "message": "Successfully created 25 worksheet instances",
  "created": 25,
  "skipped": 0,
  "total": 25,
  "worksheet": {...},
  "class": {...}
}
```

**GET** `/api/worksheets/{id}/instances`

List all generated instances for a worksheet.

Query parameters:

- `classId` - Filter by class
- `status` - Filter by status (generated, in_progress, submitted, graded)
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

## UI Components

### VariantPreview Component

Located at `src/lib/components/worksheets/VariantPreview.svelte`

Features:

- Preview variants for specific students
- Compare different variants side-by-side
- Show/hide generated parameters
- Generate instances for entire class
- Custom seed input for testing

Usage:

```svelte
<VariantPreview worksheetId={worksheet.id} classId={selectedClass} students={classStudents} />
```

## Implementation Details

### Instance Generator

The core generation logic is in `src/lib/server/worksheets/instance-generator.ts`.

Key functions:

#### generateWorksheetInstance

Generates a complete worksheet instance for a student.

```typescript
function generateWorksheetInstance(params: {
	worksheetId: string;
	studentId: string;
	exercises: WorksheetExerciseWithExercise[];
	config: WorksheetConfig;
}): InstanceData;
```

#### generatePreviewInstance

Generates a preview with optional custom seed.

```typescript
function generatePreviewInstance(params: {
	worksheetId: string;
	exercises: WorksheetExerciseWithExercise[];
	config: WorksheetConfig;
	studentId?: string;
	variantSeed?: number;
}): InstanceData;
```

### Seed Generation

Seeds are generated deterministically based on:

- Worksheet ID
- Student ID
- Variant mode configuration

This ensures the same student always gets the same variant for a given worksheet.

### Exercise Shuffling

The system supports two types of shuffling:

- **shuffle_exercises**: Randomize all exercise order
- **shuffle_within_sections**: Randomize only within sections

Shuffling uses the same seed system for consistency.

## Database Schema

### worksheet_instances Table

Stores generated instances for tracking and retrieval:

```sql
CREATE TABLE worksheet_instances (
  id UUID PRIMARY KEY,
  worksheet_id UUID REFERENCES worksheets(id),
  student_id UUID REFERENCES profiles(id),
  instance_data JSONB NOT NULL, -- Contains resolved exercises
  variant_seed INTEGER NOT NULL,
  variant_version TEXT,
  status instance_status DEFAULT 'generated',
  generated_at TIMESTAMPTZ,
  accessed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0
);
```

### Instance Data Structure

```typescript
interface InstanceData {
	exercises: ResolvedExercise[];
	exercise_order?: number[];
	variant_info?: {
		seed: number;
		version?: string;
		group_id?: string;
	};
}

interface ResolvedExercise {
	exercise_id: string;
	position: number;
	parameters: Record<string, number | string>;
	statement: string; // With variables resolved
	solution: string; // With variables resolved
}
```

## Testing

The system includes comprehensive tests in `instance-generator.test.ts`:

- Parameter resolution
- Deterministic generation
- Different variant modes
- Exercise shuffling
- Edge cases and error handling

Run tests:

```bash
pnpm test:unit src/lib/server/worksheets/instance-generator.test.ts
```

## Best Practices

1. **Variable Naming**: Use descriptive variable names (e.g., `numerator`, `denominator` instead of `a`, `b`)

2. **Expression Complexity**: Keep eval expressions simple for better performance

3. **Seed Ranges**: Use appropriate random ranges to avoid edge cases

4. **Preview Testing**: Always preview variants before assigning to students

5. **Version Control**: Use `n_versions` mode for exams where you want limited distinct versions

## Security Considerations

- Only teachers can generate instances
- Students can only access their own instances
- Variant seeds are kept server-side
- Input validation on all parameters

## Future Enhancements

- [ ] Support for more complex mathematical expressions
- [ ] Variable dependencies visualization
- [ ] Bulk variant preview for entire class
- [ ] Export variants to PDF
- [ ] Analytics on variant difficulty distribution
