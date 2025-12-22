# Exercise System Technical Guide

Complete technical documentation for the Exercise (Exercices) system in UbuMaths.

> **Important**: This documentation covers the **Exercise** system, which manages standalone mathematical exercises. Do not confuse with the **Questions** system used in assessments.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [Database Schema](#database-schema)
5. [Server Logic](#server-logic)
6. [API Endpoints](#api-endpoints)
7. [Instance Generation](#instance-generation)
8. [Variations System](#variations-system)
9. [Assignment System](#assignment-system)
10. [Sharing System](#sharing-system)
11. [Import/Export](#importexport)
12. [UI Components](#ui-components)
13. [Security & Authorization](#security--authorization)
14. [File Reference](#file-reference)

---

## Overview

The Exercise system is a comprehensive feature for creating, managing, distributing, and displaying mathematical exercises with support for:

- **Parameterization**: Variables with random value generation using `{{}}` syntax
- **Variations**: Multiple guidance levels (guided, intermediate, autonomous)
- **Rich Content**: Markdown with LaTeX math rendering via MathLive
- **Sharing**: Public library and private share tokens
- **Assignments**: Distribution to students and classes with tracking
- **Import/Export**: JSON and Markdown formats with version support

### Key Distinction: Exercises vs Questions

| Feature          | Exercises                    | Questions                   |
| ---------------- | ---------------------------- | --------------------------- |
| Purpose          | Standalone practice problems | Assessment items in tests   |
| Grading          | Self-paced, ungraded         | Graded with scoring         |
| Parameterization | Full variable support        | Limited                     |
| Variations       | Yes (guided, autonomous)     | No                          |
| Location         | `/dashboard/*/exercises/`    | `/dashboard/*/assessments/` |

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        TEACHER FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Create/Edit ──► ExerciseForm.svelte ──► POST/PUT /api/exercises│
│       │                                         │               │
│       ▼                                         ▼               │
│  Variables     Zod Validation ◄────────── exercises.ts          │
│  Variations         │                           │               │
│  Hints              ▼                           ▼               │
│              Database (exercises table)   RLS Policies          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        STUDENT FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  View Exercise ──► +page.server.ts ──► getExercise()            │
│       │                                    │                    │
│       ▼                                    ▼                    │
│  ExerciseDisplay   ◄─── instance ◄─── generateExerciseInstance()│
│       │                                    │                    │
│       ▼                                    ▼                    │
│  MarkdownRenderer  ◄─── resolved ◄─── resolveVariables()        │
│       │              markdown              │                    │
│       ▼                                    ▼                    │
│  MathLive          ◄─── LaTeX ◄───── resolveText()              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Overview

| Layer      | Files                                               | Responsibility                      |
| ---------- | --------------------------------------------------- | ----------------------------------- |
| Types      | `src/lib/exercises/types.ts`                        | TypeScript interfaces (2300+ lines) |
| Validation | `src/lib/server/validation/exercises.ts`            | Zod schemas for API                 |
| Server     | `src/lib/server/exercises.ts`                       | CRUD operations                     |
| Generator  | `src/lib/exercises/generator/instance-generator.ts` | Variable resolution                 |
| API        | `src/routes/api/exercises/**`                       | REST endpoints                      |
| Pages      | `src/routes/(protected)/dashboard/**/exercises/**`  | UI routes                           |
| Components | `src/lib/components/exercises/**`                   | Reusable UI                         |
| Database   | `supabase/migrations/*exercise*`                    | Schema, RLS, functions              |

---

## Data Model

### Core Exercise Interface

```typescript
interface Exercise {
	// Identity
	id: string; // UUID
	slug?: string; // URL-friendly identifier (topic-nanoid)

	// Metadata
	title?: string; // Display title
	source?: string; // Reference (e.g., "Livre 3e, p.42")
	difficulty: 1 | 2 | 3; // Easy, Medium, Hard
	tags: string[]; // Categorization
	grade_levels?: string[]; // e.g., ['3', '2', '1_SPE']
	topic?: string; // e.g., 'Algebre'

	// Content (legacy format)
	statement_md: string; // Markdown with LaTeX
	solution_md: string;

	// Parameterization
	variables?: Variable[]; // For dynamic content
	distribution_mode: 'on_demand' | 'per_student' | 'per_group';

	// Variations System (new format)
	shared?: SharedExerciseDefaults;
	variations?: ExerciseVariation[];

	// Math Parsing
	generic_functions?: string[]; // Custom function identifiers

	// Resources
	resources?: ExerciseResource[];

	// Sharing
	is_public?: boolean;

	// Audit
	created_at: string;
	updated_at: string;
	created_by: string; // Teacher UUID
}
```

### Variable System

```typescript
interface Variable {
	name: string; // Variable identifier (e.g., 'a', 'x1')
	expression: string; // Value expression
	displayOptions?: Record<string, any>;
}
```

**Expression Syntax**:
| Pattern | Example | Description |
|---------|---------|-------------|
| `{{min..max}}` | `{{1..10}}` | Random integer in range |
| `{{min..max:step}}` | `{{0.5..9.99:0.01}}` | Random decimal with step |
| `{{eval:expr}}` | `{{eval:a+b}}` | Computed from other variables |
| `{{varName}}` | `{{a}}` | Reference another variable |

### Distribution Modes

| Mode          | Seed Generation                   | Use Case                  |
| ------------- | --------------------------------- | ------------------------- |
| `on_demand`   | Random each time                  | Infinite practice         |
| `per_student` | Hash(exercise_id + student_id)    | Personalized homework     |
| `per_group`   | Hash(exercise_id + assignment_id) | Class work (same for all) |

### Exercise Instance

Generated from template with resolved values:

```typescript
interface ExerciseInstance {
	exerciseId: string;
	seed: number;
	resolvedVariables: ResolvedVariable[];
	statement_md: string; // Resolved content
	solution_md: string; // Resolved content
	statement_ast?: DocumentNode; // Optional parsed AST
	solution_ast?: DocumentNode;
	generatedAt: Date;
	distributionMode: DistributionMode;

	// For variations
	selectedVariationIndex?: number;
	selectedVariationLabel?: string;
	resolvedHints?: ExerciseHint[];
}
```

---

## Database Schema

### Tables

#### `exercises`

```sql
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE,
    title VARCHAR(255),
    source VARCHAR(255),
    difficulty INTEGER CHECK (difficulty IN (1, 2, 3)),
    tags TEXT[],
    statement_md TEXT NOT NULL,
    solution_md TEXT NOT NULL,
    variables JSONB,
    distribution_mode TEXT DEFAULT 'on_demand',
    is_public BOOLEAN DEFAULT FALSE,
    grade_levels TEXT[],
    topic VARCHAR(100),
    resources JSONB,
    generic_functions TEXT[],
    shared JSONB,                    -- Shared defaults for variations
    variations JSONB,                -- Variation array
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    fts_column TSVECTOR              -- Full-text search
);

-- Indexes
CREATE INDEX idx_exercises_created_by ON exercises(created_by);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX idx_exercises_topic ON exercises(topic);
CREATE INDEX idx_exercises_is_public ON exercises(is_public);
CREATE INDEX idx_exercises_fts ON exercises USING GIN(fts_column);
CREATE INDEX idx_exercises_slug ON exercises(slug);
```

#### `exercise_share_tokens`

```sql
CREATE TABLE exercise_share_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    token VARCHAR(16) NOT NULL UNIQUE,  -- Alphanumeric
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ
);
```

#### `exercise_assignments`

```sql
CREATE TABLE exercise_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    assigned_to_type TEXT CHECK (assigned_to_type IN ('student', 'class', 'public')),
    student_id UUID REFERENCES profiles(id),
    class_id UUID REFERENCES classes(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    optional_deadline TIMESTAMPTZ,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### `exercise_completions`

```sql
CREATE TABLE exercise_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES exercise_assignments(id) ON DELETE SET NULL,
    student_id UUID REFERENCES profiles(id),
    completed_at TIMESTAMPTZ,        -- NULL until marked complete
    last_viewed_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(exercise_id, student_id)
);
```

### RLS Policies

```sql
-- Teachers can manage their own exercises
CREATE POLICY "Teachers can manage own exercises"
    ON exercises FOR ALL
    USING (created_by = auth.uid());

-- Students can view assigned exercises
CREATE POLICY "Students can view assigned exercises"
    ON exercises FOR SELECT
    USING (student_has_exercise_access(id));

-- Anyone can read public exercises (including anonymous)
CREATE POLICY "Anyone can read public exercises"
    ON exercises FOR SELECT
    TO public
    USING (is_public = true);

-- Access via valid share token
CREATE POLICY "Access via share token"
    ON exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM exercise_share_tokens
            WHERE exercise_id = exercises.id
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );
```

### Database Functions

```sql
-- Check if student can access exercise
CREATE FUNCTION student_has_exercise_access(p_exercise_id UUID)
RETURNS BOOLEAN AS $$
    -- Direct assignment, class membership, or public
$$;

-- Get all exercises accessible to student
CREATE FUNCTION get_student_exercises(p_student_id UUID)
RETURNS SETOF UUID AS $$
    -- Returns exercise IDs
$$;

-- Get completion statistics
CREATE FUNCTION get_exercise_completion_stats(p_exercise_id UUID)
RETURNS TABLE(
    total_assigned INTEGER,
    total_viewed INTEGER,
    total_completed INTEGER,
    completion_rate NUMERIC,
    average_view_count NUMERIC
) AS $$
$$;
```

---

## Server Logic

### CRUD Operations (`src/lib/server/exercises.ts`)

```typescript
// Get exercises with filters and pagination
async function getExercises(
	supabase: SupabaseClient,
	filters: ExerciseFilters,
	pagination: PaginationOptions
): Promise<{ data; error; count; page; limit; totalPages }>;

// Get single exercise by ID
async function getExercise(supabase, id: string);

// Get single exercise by slug
async function getExerciseBySlug(supabase, slug: string);

// Create exercise (teachers only)
async function createExercise(
	supabase,
	exercise: Omit<ExerciseInsert, 'created_by'>,
	userId: string
);

// Update exercise (owner only)
async function updateExercise(supabase, id: string, updates: ExerciseUpdate, userId: string);

// Delete exercise (owner only)
async function deleteExercise(supabase, id: string, userId: string);

// Get teacher's exercises
async function getTeacherExercises(supabase, teacherId: string, filters, pagination);
```

### Assignment Operations (`src/lib/server/exercise-assignments.ts`)

```typescript
// Create single assignment
async function createExerciseAssignment(supabase, data: CreateExerciseAssignment, userId: string);

// Create bulk assignments (atomic transaction)
async function createBulkAssignments(supabase, data: BulkAssignmentData, userId: string);

// Get assignments for exercise (teacher view)
async function getAssignmentsForExercise(supabase, exerciseId, filters?, pagination?);

// Get assignments for student (with completions)
async function getAssignmentsForStudent(supabase, studentId, filters?, pagination?);

// Completion tracking
async function markExerciseAsViewed(supabase, exerciseId, studentId, assignmentId?);
async function markExerciseAsComplete(supabase, exerciseId, studentId);
async function markExerciseAsIncomplete(supabase, exerciseId, studentId);

// Statistics
async function getAssignmentStats(supabase, teacherId);
async function getExerciseCompletionStats(supabase, exerciseId);
async function getStudentProgress(supabase, studentId);
```

---

## API Endpoints

### Exercise CRUD

| Method | Endpoint              | Description                          | Auth              |
| ------ | --------------------- | ------------------------------------ | ----------------- |
| GET    | `/api/exercises`      | List exercises (paginated, filtered) | Teacher           |
| POST   | `/api/exercises`      | Create exercise                      | Teacher           |
| GET    | `/api/exercises/[id]` | Get single exercise                  | Teacher/Student\* |
| PUT    | `/api/exercises/[id]` | Update exercise                      | Owner             |
| DELETE | `/api/exercises/[id]` | Delete exercise                      | Owner             |

### Assignments

| Method | Endpoint                          | Description                  | Auth  |
| ------ | --------------------------------- | ---------------------------- | ----- |
| GET    | `/api/exercises/[id]/assign`      | Get assignments for exercise | Owner |
| POST   | `/api/exercises/[id]/assign`      | Create assignment(s)         | Owner |
| PATCH  | `/api/exercises/assignments/[id]` | Update assignment            | Owner |
| DELETE | `/api/exercises/assignments/[id]` | Delete assignment            | Owner |

### Sharing

| Method | Endpoint                              | Description        | Auth  |
| ------ | ------------------------------------- | ------------------ | ----- |
| GET    | `/api/exercises/[id]/share`           | List share tokens  | Owner |
| POST   | `/api/exercises/[id]/share`           | Create share token | Owner |
| DELETE | `/api/exercises/[id]/share/[tokenId]` | Revoke token       | Owner |

### Completion

| Method | Endpoint                       | Description   | Auth    |
| ------ | ------------------------------ | ------------- | ------- |
| POST   | `/api/exercises/[id]/view`     | Record view   | Student |
| POST   | `/api/exercises/[id]/complete` | Mark complete | Student |

### Request/Response Examples

**Create Exercise**:

```typescript
// POST /api/exercises
{
    "title": "Addition Practice",
    "difficulty": 1,
    "tags": ["addition", "arithmetic"],
    "grade_levels": ["6", "5"],
    "topic": "Calcul",
    "variations": [
        {
            "label": "guided",
            "statement_md": "Calculate ${{a}} + {{b}}$. {{hint:method}}",
            "solution_md": "The answer is ${{sum}}$",
            "variables": [
                { "name": "a", "expression": "{{1..20}}" },
                { "name": "b", "expression": "{{1..20}}" },
                { "name": "sum", "expression": "{{eval:a+b}}" }
            ],
            "hints": [
                {
                    "id": "method",
                    "type": "video",
                    "url": "https://...",
                    "title": "How to add"
                }
            ]
        },
        {
            "label": "autonomous",
            "statement_md": "Calculate ${{a}} + {{b}}$",
            "solution_md": "${{sum}}$"
        }
    ],
    "shared": {
        "variables": [
            { "name": "a", "expression": "{{1..20}}" },
            { "name": "b", "expression": "{{1..20}}" }
        ]
    },
    "distribution_mode": "per_student",
    "is_public": false
}
```

---

## Instance Generation

### Process

```
Exercise Template
       │
       ▼
┌──────────────────────┐
│ 1. Generate/use seed │
└──────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 2. Check if uses variations      │
│    (variations?.length > 0)      │
└──────────────────────────────────┘
       │
       ├── Yes ──────────────────────────────┐
       │                                     ▼
       │                    ┌───────────────────────────────┐
       │                    │ 3a. Select variation by seed  │
       │                    │ 3b. Merge shared + per-var    │
       │                    └───────────────────────────────┘
       │                                     │
       ▼                                     ▼
┌──────────────────────────────────────────────────────────┐
│ 4. Detect circular dependencies                          │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 5. Resolve variables (in declaration order)              │
│    - Random ranges: {{1..10}} → specific value           │
│    - Expressions: {{eval:a+b}} → computed value          │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 6. Replace {{varName}} in statement_md and solution_md   │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 7. (Optional) Parse markdown to AST                      │
└──────────────────────────────────────────────────────────┘
       │
       ▼
   ExerciseInstance
```

### Key Functions

```typescript
// Main generator
function generateExerciseInstance(
	exercise: Exercise,
	options?: {
		seed?: number;
		parseAST?: boolean;
		variationIndex?: number;
	}
): InstanceGenerationResult;

// Seed generation for per-student mode
function generateStudentSeed(exerciseId: string, studentId: string): number;

// Seed generation for per-group mode
function generateGroupSeed(exerciseId: string, groupId: string): number;

// Check if exercise has variables
function isParameterized(exercise: Exercise): boolean;

// Batch generation
function generateMultipleInstances(
	exercise: Exercise,
	count: number,
	baseSeed?: number
): InstanceGenerationResult[];
```

### Seed Determination

```typescript
// Server-side seed logic (generateExerciseInstanceServer)
if (options?.seed !== undefined) {
	seed = options.seed; // Override
} else {
	switch (exercise.distribution_mode) {
		case 'on_demand':
			seed = Math.random() * 1000000;
			break;
		case 'per_student':
			seed = generateStudentSeed(exerciseId, userId);
			break;
		case 'per_group':
			seed = generateGroupSeed(exerciseId, options.groupId);
			break;
	}
}
```

---

## Variations System

### Concept

Variations allow the same exercise to be presented with different levels of scaffolding:

| Level          | Description      | Features                                         |
| -------------- | ---------------- | ------------------------------------------------ |
| `guided`       | Maximum support  | Step-by-step hints, detailed prompts, video help |
| `intermediate` | Moderate support | Some hints available                             |
| `autonomous`   | Minimal support  | Just the problem statement                       |

### Data Structures

```typescript
interface ExerciseVariation {
	label: 'guided' | 'intermediate' | 'autonomous' | string;
	statement_md: string;
	solution_md: string;
	variables?: Variable[];
	hints?: ExerciseHint[];
}

interface SharedExerciseDefaults {
	variables?: Variable[];
	statement_md?: string;
	solution_md?: string;
}

interface ExerciseHint {
	id: string; // For {{hint:id}} reference
	type: 'video' | 'pdf' | 'link' | 'geogebra' | 'image';
	url: string;
	title: string;
	description?: string;
}
```

### Variable Merging

```typescript
// Per-variation variables override shared variables with same name
function mergeExerciseVariables(
	shared: Variable[] | undefined,
	perVariation: Variable[] | undefined
): Variable[] | undefined;

// Example:
// shared: [{ name: 'a', expression: '{{1..10}}' }]
// perVar: [{ name: 'a', expression: '{{5..15}}' }]
// result: [{ name: 'a', expression: '{{5..15}}' }]  // per-variation wins
```

### Hint Syntax

```markdown
In statement_md or solution_md:

{{hint:rappel-pythagore}}

This renders as an interactive button that reveals the hint.
```

---

## Assignment System

### Assignment Types

```typescript
type AssignmentTargetType = 'student' | 'class' | 'public';
```

| Type      | Target                | Access                    |
| --------- | --------------------- | ------------------------- |
| `student` | Specific student      | Only that student         |
| `class`   | All students in class | Via class membership      |
| `public`  | Everyone              | Any authenticated student |

### Completion Tracking

```typescript
interface ExerciseCompletion {
	exercise_id: string;
	student_id: string;
	completed_at: string | null; // NULL until complete
	view_count: number;
	last_viewed_at: string;
}
```

**States**:

1. **Not viewed**: No completion record exists
2. **Viewed**: Record exists, `completed_at = null`
3. **Completed**: Record exists, `completed_at` has timestamp

### Bulk Assignment (Atomic)

```typescript
// All assignments created or none (transaction)
const result = await createBulkAssignments(
	supabase,
	{
		exercise_id: 'ex-123',
		students: ['student-1', 'student-2'],
		classes: ['class-3eme-a'],
		make_public: false,
		optional_deadline: '2024-01-20T23:59:59Z',
		notes: 'Complete for homework'
	},
	teacherId
);
```

---

## Sharing System

### Public Exercises

- Toggle `is_public` flag on exercise
- Accessible at `/exercice/[slug]` without authentication
- Anonymous users can view (RLS policy allows)

### Share Tokens

For sharing private exercises without making them public:

```typescript
interface ExerciseShareToken {
	id: string;
	exercise_id: string;
	token: string; // 16-char alphanumeric
	created_by: string;
	expires_at: string | null; // NULL = never expires
	is_active: boolean;
	access_count: number;
	last_accessed_at: string | null;
}
```

**URL Format**:

```
/exercice/[slug]?token=[token]&variation=[label]&seed=[number]
```

### Token Lifecycle

1. **Create**: Teacher generates token via API
2. **Share**: Teacher sends URL with token
3. **Access**: Anyone with token can view exercise
4. **Track**: `access_count` and `last_accessed_at` updated
5. **Revoke**: Teacher can deactivate token

---

## Import/Export

### Export Formats

**JSON (v2.0)**:

```json
{
    "version": "2.0",
    "title": "Pythagore",
    "difficulty": 2,
    "tags": ["geometry"],
    "grade_levels": ["3"],
    "topic": "Geometrie",
    "statement_md": "...",
    "solution_md": "...",
    "variations": [...],
    "shared": {...}
}
```

**Markdown with YAML frontmatter**:

```markdown
---
version: '2.0'
title: Pythagore
difficulty: 2
tags: [geometry]
---

## Statement

In a right triangle...

## Solution

Using Pythagorean theorem...
```

### Import Options

```typescript
interface ImportOptions {
	onDuplicate: 'skip' | 'replace' | 'create-copy';
	validate?: boolean;
}
```

### LaTeX Import

The `LaTeXImportDialog` component supports importing exercises from LaTeX:

```typescript
const result = transpileLatex(latexContent);
// Returns: { statement, solution, warnings }
```

---

## UI Components

### Core Components

| Component                        | Location                | Purpose                              |
| -------------------------------- | ----------------------- | ------------------------------------ |
| `ExerciseForm.svelte`            | `components/exercises/` | Create/edit form (~940 lines)        |
| `ExerciseDisplay.svelte`         | `components/exercises/` | Render exercise with solution toggle |
| `VariationEditor.svelte`         | `components/exercises/` | Tabbed variation editing             |
| `ExerciseMarkdownEditor.svelte`  | `components/exercises/` | Markdown editing with preview        |
| `ExerciseMarkdownPreview.svelte` | `components/exercises/` | Live preview with math               |
| `HintEditor.svelte`              | `components/exercises/` | Edit hints for variations            |
| `ImageUploader.svelte`           | `components/exercises/` | Image upload to storage              |
| `ExportDialog.svelte`            | `components/exercises/` | Export exercises                     |
| `ImportDialog.svelte`            | `components/exercises/` | Import exercises                     |
| `LaTeXImportDialog.svelte`       | `components/exercises/` | Import from LaTeX                    |

### Page Routes

| Route                               | Role    | Purpose                     |
| ----------------------------------- | ------- | --------------------------- |
| `/dashboard/teacher/exercises`      | Teacher | List all exercises          |
| `/dashboard/teacher/exercises/new`  | Teacher | Create exercise             |
| `/dashboard/teacher/exercises/[id]` | Teacher | Edit exercise               |
| `/dashboard/student/exercises`      | Student | List assigned exercises     |
| `/dashboard/student/exercises/[id]` | Student | View exercise               |
| `/exercice/[slug]`                  | Public  | View public/shared exercise |

---

## Security & Authorization

### Authentication

All protected routes use `requireRole()` middleware:

```typescript
// In +page.server.ts or +server.ts
const { user } = await requireRole(locals, 'teacher');
```

### Authorization Patterns

**1. Ownership Validation**:

```typescript
// Before update/delete
if (exercise.created_by !== userId) {
	throw error(403, 'You can only modify your own exercises');
}
```

**2. RLS Policies** (enforced at database level):

- Teachers see/edit only their own exercises
- Students see only assigned or public exercises
- Anonymous users see only public exercises

**3. Share Token Validation**:

```typescript
// In public route
if (!exercise.is_public && !accessViaToken) {
	throw error(403, "Cet exercice n'est pas public");
}
```

### Input Validation

All API inputs validated with Zod:

```typescript
const validation = createExerciseSchema.safeParse(await request.json());
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
```

**Key validations**:

- UUID format for IDs
- String length limits (title: 200, statement: 50000)
- Array limits (tags: 20, variations: 10, hints: 20)
- URL format for resources
- Enum values for difficulty, types

---

## File Reference

### Types & Validation

| File                                     | Lines | Purpose                   |
| ---------------------------------------- | ----- | ------------------------- |
| `src/lib/exercises/types.ts`             | ~2330 | All TypeScript interfaces |
| `src/lib/server/validation/exercises.ts` | ~750  | Zod schemas               |
| `src/lib/exercises/validation.ts`        | ~200  | Export/import validation  |

### Server Logic

| File                                       | Lines | Purpose               |
| ------------------------------------------ | ----- | --------------------- |
| `src/lib/server/exercises.ts`              | ~630  | Core CRUD             |
| `src/lib/server/exercise-assignments.ts`   | ~1400 | Assignment management |
| `src/lib/server/exercise-share-tokens.ts`  | ~150  | Token management      |
| `src/lib/server/exercise-import-export.ts` | ~300  | Import/export         |

### Generator

| File                                                | Lines | Purpose             |
| --------------------------------------------------- | ----- | ------------------- |
| `src/lib/exercises/generator/instance-generator.ts` | ~625  | Instance generation |
| `src/lib/exercises/slug-generator.ts`               | ~50   | Slug generation     |

### API Routes

| File                                              | Purpose               |
| ------------------------------------------------- | --------------------- |
| `src/routes/api/exercises/+server.ts`             | GET/POST exercises    |
| `src/routes/api/exercises/[id]/+server.ts`        | GET/PUT/DELETE single |
| `src/routes/api/exercises/[id]/assign/+server.ts` | Assignment endpoints  |
| `src/routes/api/exercises/[id]/share/+server.ts`  | Share token endpoints |

### Database Migrations

| Migration                                               | Purpose                 |
| ------------------------------------------------------- | ----------------------- |
| `20251026080000_create_exercises_table.sql`             | Core table              |
| `20251026120000_add_exercise_sharing_and_templates.sql` | Sharing, templates      |
| `20251026153000_add_exercise_parameterization.sql`      | Variables, distribution |
| `20251027005912_create_exercise_assignments.sql`        | Assignment tables       |
| `20251218120000_add_exercise_variations.sql`            | Variations system       |
| `20251221141345_create_exercise_share_tokens.sql`       | Share tokens            |
| `20251222100000_add_public_exercises_anon_policy.sql`   | Anonymous access        |

---

## See Also

- [Improvements & Recommendations](./improvements.md)
- [UbuMark Parser](../ubumark/) - Markdown parsing system
- [Database Schema](../../architecture/database-schema.md)
