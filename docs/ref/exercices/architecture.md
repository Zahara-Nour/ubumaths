# Exercises System - Architecture Documentation

> **Last Updated**: 2025-12-21
>
> **Status**: Production-ready
>
> **Related**: [Index](./index.md) | [Database Schema](./database-schema.md) | [API Reference](./api-reference.md)

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Layer Architecture](#layer-architecture)
- [Data Flow Patterns](#data-flow-patterns)
- [Parameterization Engine](#parameterization-engine)
- [Security Architecture](#security-architecture)
- [Performance Optimizations](#performance-optimizations)
- [Integration Points](#integration-points)
- [Key Implementation Patterns](#key-implementation-patterns)
- [File Structure](#file-structure)

---

## System Overview

The Exercises System is a complete solution for creating, managing, assigning, and tracking mathematical practice exercises. It implements a **template-instance pattern** where exercises can be either static or parameterized (generating unique instances with different values).

### Core Capabilities

| Capability              | Description                                        |
| ----------------------- | -------------------------------------------------- |
| **Exercise Management** | Full CRUD with markdown + LaTeX support            |
| **Parameterization**    | Variable-based templates with 3 distribution modes |
| **Assignment System**   | Flexible targeting: student, class, or public      |
| **Completion Tracking** | View counts, completion status, progress stats     |
| **Full-Text Search**    | French-language search with GIN indexes            |
| **Import/Export**       | JSON and Markdown format support                   |

### Design Principles

1. **Separation of Concerns**: Clear boundaries between server logic, validation, types, and UI
2. **Type Safety**: Zod validation at API boundaries, TypeScript throughout
3. **Performance First**: Batch queries, proper indexing, optimistic UI
4. **Security by Default**: RLS policies, ownership checks, input validation
5. **Pedagogical Flexibility**: Multiple distribution modes for different use cases

---

## Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                  │
│                              (Svelte 5 + Runes)                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │   Teacher Pages     │  │   Student Pages     │  │    Components       │ │
│  │  ├─ List/Create     │  │  ├─ Assigned List   │  │  ├─ ExerciseDisplay │ │
│  │  ├─ Edit/Delete     │  │  └─ Exercise View   │  │  ├─ ExerciseForm    │ │
│  │  └─ Assign          │  │                     │  │  ├─ MarkdownEditor  │ │
│  └─────────────────────┘  └─────────────────────┘  │  └─ MarkdownRenderer│ │
│                                                     └─────────────────────┘ │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTP/JSON
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│                         (SvelteKit +server.ts)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  /api/exercises/*                                                    │   │
│  │  ├─ CRUD: GET/POST/PUT/DELETE                                       │   │
│  │  ├─ Assignment: /[id]/assign                                        │   │
│  │  ├─ Completion: /[id]/complete, /[id]/view                          │   │
│  │  ├─ Stats: /[id]/stats                                              │   │
│  │  └─ Import/Export: /import, /export                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVER LOGIC LAYER                                 │
│                          ($lib/server/*)                                    │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────┐   │
│  │   exercises.ts    │  │ exercise-         │  │   validation/         │   │
│  │  ├─ CRUD ops      │  │ assignments.ts    │  │   exercises.ts        │   │
│  │  ├─ Teacher list  │  │  ├─ Create/Bulk   │  │  ├─ createSchema      │   │
│  │  └─ Instance gen  │  │  ├─ Completion    │  │  ├─ updateSchema      │   │
│  │                   │  │  ├─ Stats         │  │  ├─ assignSchema      │   │
│  │                   │  │  └─ Access check  │  │  └─ querySchema       │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ SQL + RPC
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE LAYER                                     │
│                            (Supabase)                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Tables:                    Views:                 Functions:        │   │
│  │  ├─ exercises              └─ assigned_exercises   ├─ student_has_   │   │
│  │  ├─ exercise_assignments      _with_details        │  exercise_access│   │
│  │  └─ exercise_completions                          ├─ get_student_   │   │
│  │                                                    │  exercises      │   │
│  │  RLS Policies:              Indexes:               ├─ get_teacher_   │   │
│  │  ├─ Teacher ownership      ├─ FTS (French)        │  assignment_stats│   │
│  │  ├─ Student access         ├─ Foreign keys        └─ get_assignment_│   │
│  │  └─ Completion management  └─ Filtering              completion_stats│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Parameterization Engine Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PARAMETERIZATION ENGINE                               │
│                      ($lib/exercises/generator/)                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  instance-generator.ts                                               │   │
│  │  ├─ generateExerciseInstance()                                      │   │
│  │  ├─ generateMultipleInstances()                                     │   │
│  │  ├─ generateStudentSeed()                                           │   │
│  │  └─ generateGroupSeed()                                             │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  $lib/ubumark/parameterization/                                     │   │
│  │  ├─ resolver/variable-resolver.ts → Resolve variable expressions   │   │
│  │  ├─ resolver/text-resolver.ts     → Replace {{}} in content        │   │
│  │  ├─ resolver/random-generator.ts  → Seeded random number generation│   │
│  │  └─ parser/eval-parser.ts         → Parse {{eval:...}} expressions │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Resolution Pipeline:                                                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│  │ Variable │ -> │ Random   │ -> │ Eval     │ -> │ Text     │            │
│  │ Ordering │    │ Generate │    │ Execute  │    │ Replace  │            │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Architecture

### 1. Frontend Layer (Svelte 5)

**Location**: `src/routes/(protected)/dashboard/*/exercises/`

**Responsibilities**:

- User interface rendering with Svelte 5 runes
- Form handling and validation feedback
- Optimistic UI updates
- Client-side instance generation for preview

**Key Components**:

| Component          | Location                     | Purpose                            |
| ------------------ | ---------------------------- | ---------------------------------- |
| `ExerciseDisplay`  | `$lib/components/exercises/` | Main rendering with mode switching |
| `ExerciseForm`     | `$lib/components/exercises/` | Create/edit with markdown editor   |
| `MarkdownRenderer` | `$lib/components/markdown/`  | AST-based markdown rendering       |
| `MarkdownEditor`   | `$lib/components/exercises/` | Live preview editing               |

**State Management Pattern**:

```typescript
// Svelte 5 runes pattern
let exercises = $state<Exercise[]>([]);
let loading = $state(false);
let filters = $state({ search: '', difficulty: null });

// Derived state
let filteredExercises = $derived(exercises.filter((e) => matchesFilters(e, filters)));

// Effects for side effects
$effect(() => {
	if (filters.search) {
		debouncedSearch(filters.search);
	}
});
```

### 2. API Layer (SvelteKit Routes)

**Location**: `src/routes/api/exercises/`

**Responsibilities**:

- HTTP request handling
- Authentication/authorization checks
- Input validation via Zod schemas
- Response formatting

**Route Structure**:

```
src/routes/api/exercises/
├── +server.ts              # GET (list), POST (create)
├── assigned/
│   └── +server.ts          # GET (student's exercises)
├── [id]/
│   ├── +server.ts          # GET, PUT, DELETE (single)
│   ├── access/
│   │   └── +server.ts      # GET (check access)
│   ├── assign/
│   │   └── +server.ts      # GET (list), POST (create)
│   ├── complete/
│   │   └── +server.ts      # POST, DELETE (toggle)
│   ├── stats/
│   │   └── +server.ts      # GET (completion stats)
│   └── view/
│       └── +server.ts      # POST (track view)
├── import/
│   └── +server.ts          # POST (import)
└── export/
    └── +server.ts          # POST (export)
```

**Request Processing Pattern**:

```typescript
// Standard API route pattern
export async function POST({ request, locals }) {
	// 1. Authentication check
	await requireRole(locals, 'teacher');

	// 2. Parse and validate input
	const body = await request.json();
	const validation = createExerciseSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// 3. Execute business logic
	const result = await createExercise(locals.supabase, validation.data, locals.user.id);

	// 4. Return response
	return json({ data: result, error: null });
}
```

### 3. Server Logic Layer

**Location**: `src/lib/server/`

**Responsibilities**:

- Business logic implementation
- Database queries and transactions
- Access control enforcement
- Statistics calculations

**Key Files**:

| File                      | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `exercises.ts`            | Core CRUD operations, teacher queries, instance generation |
| `exercise-assignments.ts` | Assignment creation, completion tracking, access checks    |
| `validation/exercises.ts` | Zod schemas for all inputs                                 |

**Function Categories**:

```typescript
// exercises.ts
export async function getExercises(supabase, filters, pagination);
export async function getExercise(supabase, id);
export async function createExercise(supabase, data, userId);
export async function updateExercise(supabase, id, updates, userId);
export async function deleteExercise(supabase, id, userId);
export async function getTeacherExercises(supabase, teacherId, filters, pagination);
export async function generateExerciseInstanceServer(supabase, exerciseId, userId, options);

// exercise-assignments.ts
export async function createExerciseAssignment(supabase, data, userId);
export async function createBulkAssignments(supabase, data, userId);
export async function getAssignmentsForStudent(supabase, studentId, filters, pagination);
export async function markExerciseAsViewed(supabase, exerciseId, studentId, assignmentId);
export async function markExerciseAsComplete(supabase, exerciseId, studentId, assignmentId);
export async function studentHasAccess(supabase, exerciseId, studentId);
export async function getAssignmentStats(supabase, teacherId);
export async function getExerciseCompletionStats(supabase, exerciseId);
```

### 4. Database Layer (Supabase)

**Location**: `supabase/migrations/`

**Responsibilities**:

- Data persistence
- Row-level security (RLS)
- Full-text search
- Aggregate functions

**Schema Overview**:

```sql
-- Core tables
exercises              -- Exercise templates
exercise_assignments   -- Who sees what
exercise_completions   -- Progress tracking

-- View for optimized queries
assigned_exercises_with_details

-- Security-definer functions
student_has_exercise_access(exercise_id, student_id)
get_student_exercises(student_id)
get_teacher_assignment_stats(teacher_id)
get_assignment_completion_stats(assignment_id)
```

---

## Data Flow Patterns

### 1. Exercise Creation Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Teacher    │     │  API Route   │     │   Server     │
│   Browser    │     │  +server.ts  │     │  exercises   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ POST /api/exercises│                    │
       │ {title, statement, │                    │
       │  variables, ...}   │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │ requireRole()      │
       │                    │ validateSchema()   │
       │                    │                    │
       │                    │ createExercise()   │
       │                    │───────────────────>│
       │                    │                    │
       │                    │                    │ Supabase INSERT
       │                    │                    │ (RLS: created_by = auth.uid())
       │                    │                    │
       │                    │   Exercise data    │
       │                    │<───────────────────│
       │                    │                    │
       │  {data: Exercise}  │                    │
       │<───────────────────│                    │
       │                    │                    │
```

### 2. Assignment Flow (Teacher to Students)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Teacher    │     │  API Route   │     │   Server     │     │   Database   │
│   Browser    │     │  +server.ts  │     │ assignments  │     │   Supabase   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ POST /[id]/assign  │                    │                    │
       │ {students: [...],  │                    │                    │
       │  classes: [...]}   │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ Validate bulk      │                    │
       │                    │ assignment schema  │                    │
       │                    │                    │                    │
       │                    │ createBulkAssign() │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │ Check ownership    │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │ Build assignments  │
       │                    │                    │ array              │
       │                    │                    │                    │
       │                    │                    │ Atomic INSERT      │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │   Created count    │
       │                    │                    │<───────────────────│
       │                    │                    │                    │
       │                    │ {count: N}         │                    │
       │                    │<───────────────────│                    │
       │                    │                    │                    │
       │ {count: N}         │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
```

### 3. Student Exercise Access Flow (Optimized)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Student    │     │  API Route   │     │   Server     │     │   Database   │
│   Browser    │     │  +server.ts  │     │ assignments  │     │   Supabase   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ GET /assigned      │                    │                    │
       │ ?show_completed=   │                    │                    │
       │  false&limit=20    │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ getAssignmentsFor  │                    │
       │                    │ Student()          │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │ 1. RPC: get_student│
       │                    │                    │    _exercises()    │
       │                    │                    │───────────────────>│
       │                    │                    │    Exercise IDs    │
       │                    │                    │<───────────────────│
       │                    │                    │                    │
       │                    │                    │ 2. Batch: exercises│
       │                    │                    │    WHERE id IN (...│
       │                    │                    │───────────────────>│
       │                    │                    │    Exercise data   │
       │                    │                    │<───────────────────│
       │                    │                    │                    │
       │                    │                    │ 3. Batch: assign-  │
       │                    │                    │    ments IN (...)  │
       │                    │                    │───────────────────>│
       │                    │                    │    Assignments     │
       │                    │                    │<───────────────────│
       │                    │                    │                    │
       │                    │                    │ 4. Batch: complet- │
       │                    │                    │    ions IN (...)   │
       │                    │                    │───────────────────>│
       │                    │                    │    Completions     │
       │                    │                    │<───────────────────│
       │                    │                    │                    │
       │                    │                    │ 5. Enrich in       │
       │                    │                    │    memory (Map)    │
       │                    │                    │                    │
       │                    │                    │ 6. Sort by         │
       │                    │                    │    deadline urgency│
       │                    │                    │                    │
       │                    │  Paginated result  │                    │
       │                    │<───────────────────│                    │
       │                    │                    │                    │
       │ {data: [...],      │                    │                    │
       │  total, hasMore}   │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
```

### 4. Instance Generation Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        Instance Generation Pipeline                        │
└───────────────────────────────────────────────────────────────────────────┘

Input: Exercise Template + Options (seed, userId, groupId)
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 1. SEED DETERMINATION                                                      │
│                                                                           │
│    if (mode === 'on_demand')                                              │
│        seed = Math.random() * 1000000                                     │
│    else if (mode === 'per_student')                                       │
│        seed = hash(exerciseId + ':student:' + userId)                     │
│    else if (mode === 'per_group')                                         │
│        seed = hash(exerciseId + ':group:' + groupId)                      │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 2. PARAMETERIZATION CHECK                                                  │
│                                                                           │
│    if (!exercise.variables || exercise.variables.length === 0)            │
│        return passthrough (static exercise)                               │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 3. CIRCULAR DEPENDENCY DETECTION                                           │
│                                                                           │
│    Build dependency graph from variable expressions                        │
│    Check for cycles: a → b → a                                            │
│    Return error if circular dependency found                               │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 4. VARIABLE RESOLUTION (in declaration order)                              │
│                                                                           │
│    For each variable:                                                      │
│    ├─ {{1..10}}        → Generate random int with seeded RNG              │
│    ├─ {{1..10!5}}      → Generate random int excluding 5                  │
│    ├─ {{0.5..9.5:0.1}} → Generate random decimal with step                │
│    ├─ {{eval:a+b}}     → Evaluate expression with resolved vars           │
│    └─ {{varName}}      → Look up already-resolved variable                │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 5. TEXT RESOLUTION                                                         │
│                                                                           │
│    Replace all {{varName}} in statement_md and solution_md                │
│    with resolved values from step 4                                       │
│                                                                           │
│    Input:  'Calculer ${{a}} + {{b}} = ?$'                                 │
│    Output: 'Calculer $7 + 3 = ?$'                                         │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 6. OPTIONAL AST PARSING                                                    │
│                                                                           │
│    if (options.parseAST)                                                  │
│        Parse resolved markdown to AST for rich rendering                  │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
Output: ExerciseInstance {
    exerciseId, seed, resolvedVariables,
    statement_md, solution_md,
    statement_ast?, solution_ast?,
    generatedAt, distributionMode
}
```

---

## Parameterization Engine

### Variable Expression Syntax

| Syntax         | Example         | Description                         |
| -------------- | --------------- | ----------------------------------- |
| Random integer | `{{1..10}}`     | Integer in range [1, 10]            |
| Random decimal | `{{0..1:0.1}}`  | Decimal with step: 0, 0.1, ..., 1.0 |
| Exclusions     | `{{1..10!5,7}}` | Integer excluding 5 and 7           |
| Expression     | `{{eval:a+b}}`  | JavaScript expression               |
| Reference      | `{{varName}}`   | Previously defined variable         |

### Seeded Random Number Generation

```typescript
// Java-style string hash for reproducibility
function hashStringToNumber(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char; // hash * 31 + char
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

// Seed generation for different modes
function generateStudentSeed(exerciseId: string, studentId: string): number {
	return hashStringToNumber(`${exerciseId}:student:${studentId}`);
}

function generateGroupSeed(exerciseId: string, groupId: string): number {
	return hashStringToNumber(`${exerciseId}:group:${groupId}`);
}
```

### Distribution Modes

| Mode          | Seed Source              | Use Case              | Student Experience      |
| ------------- | ------------------------ | --------------------- | ----------------------- |
| `on_demand`   | `Math.random()`          | Infinite practice     | New values each refresh |
| `per_student` | `hash(exercise+student)` | Personalized homework | Same values always      |
| `per_group`   | `hash(exercise+group)`   | Class work            | Same as classmates      |

### Expression Evaluation Safety

Expressions are evaluated in a sandboxed context:

- Only `Math` functions available
- No access to `window`, `document`, etc.
- Previously resolved variables as scope

```typescript
// Example safe evaluation
const scope = {
	a: 7,
	b: 3,
	Math: Math
};
const result = new Function(...Object.keys(scope), `return ${expression}`)(...Object.values(scope));
```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authorization Matrix                          │
├─────────────────────┬───────────┬───────────┬───────────────────┤
│ Operation           │ Teacher   │ Student   │ Condition          │
├─────────────────────┼───────────┼───────────┼───────────────────┤
│ List exercises      │ Own only  │ N/A       │ created_by = uid  │
│ Create exercise     │ ✓         │ ✗         │                   │
│ Update exercise     │ ✓         │ ✗         │ created_by = uid  │
│ Delete exercise     │ ✓         │ ✗         │ created_by = uid  │
│ Create assignment   │ ✓         │ ✗         │ owns exercise     │
│ View assigned       │ N/A       │ ✓         │ has access        │
│ Mark complete       │ N/A       │ ✓         │ has access        │
│ View stats          │ ✓         │ ✗         │ owns exercise     │
└─────────────────────┴───────────┴───────────┴───────────────────┘
```

### Row-Level Security (RLS) Policies

```sql
-- Teachers see their own exercises
CREATE POLICY "Teachers see own exercises"
ON exercises FOR SELECT
USING (created_by = auth.uid());

-- Students see accessible exercises
CREATE POLICY "Students see accessible exercises"
ON exercises FOR SELECT
USING (
  is_public = TRUE
  OR student_has_exercise_access(id, auth.uid())
);

-- Students see their assignments
CREATE POLICY "Students see their assignments"
ON exercise_assignments FOR SELECT
USING (
  is_active = TRUE AND (
    student_id = auth.uid()
    OR class_id IN (
      SELECT class_id FROM class_members
      WHERE student_id = auth.uid()
    )
    OR assigned_to_type = 'public'
  )
);

-- Students manage their own completions
CREATE POLICY "Students manage completions"
ON exercise_completions FOR ALL
USING (student_id = auth.uid())
WITH CHECK (
  student_id = auth.uid()
  AND student_has_exercise_access(exercise_id, auth.uid())
);
```

### Input Validation (Zod Schemas)

```typescript
// All inputs validated with strict bounds
const createExerciseSchema = z.object({
	title: z.string().max(500).optional(),
	statement_md: z.string().min(1).max(50000),
	solution_md: z.string().min(1).max(50000),
	difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
	tags: z.array(z.string().max(50)).max(20).default([]),
	grade_levels: z.array(z.string()).max(7).optional(),
	variables: z.array(variableSchema).max(50).optional(),
	distribution_mode: distributionModeSchema.default('on_demand'),
	is_public: z.boolean().default(false)
});

// Numeric bounds prevent resource exhaustion
const listExercisesQuerySchema = z.object({
	page: z.coerce.number().int().positive().max(1000).default(1),
	limit: z.coerce.number().int().positive().max(100).default(50)
});
```

---

## Performance Optimizations

### 1. N+1 Query Prevention

```typescript
// BAD: N+1 queries
for (const exercise of exercises) {
  const assignment = await getAssignment(exercise.id);  // N queries!
  const completion = await getCompletion(exercise.id);  // N more!
}

// GOOD: Batch queries with Map lookup
async function getAssignmentsForStudent(supabase, studentId, filters) {
  // Step 1: Get all exercise IDs (1 query)
  const { data: exerciseIds } = await callRpc('get_student_exercises', {...});

  // Step 2: Batch fetch exercises (1 query)
  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .in('id', exerciseIds);

  // Step 3: Batch fetch assignments (1 query)
  const { data: assignments } = await supabase
    .from('exercise_assignments')
    .select('*')
    .in('exercise_id', exerciseIds);

  // Step 4: Batch fetch completions (1 query)
  const { data: completions } = await supabase
    .from('exercise_completions')
    .select('*')
    .in('exercise_id', exerciseIds);

  // Step 5: Build O(1) lookup maps
  const assignmentMap = new Map(assignments.map(a => [a.exercise_id, a]));
  const completionMap = new Map(completions.map(c => [c.exercise_id, c]));

  // Step 6: Enrich in memory (no DB calls!)
  return exercises.map(e => ({
    ...e,
    assignment: assignmentMap.get(e.id),
    completion: completionMap.get(e.id)
  }));
}
```

### 2. Database Indexes

```sql
-- Full-text search (French language)
CREATE INDEX idx_exercises_fulltext ON exercises
USING gin(to_tsvector('french',
  coalesce(title, '') || ' ' ||
  coalesce(statement_md, '') || ' ' ||
  coalesce(solution_md, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
));

-- Assignment lookups (8 indexes)
CREATE INDEX idx_ea_exercise ON exercise_assignments(exercise_id);
CREATE INDEX idx_ea_student ON exercise_assignments(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_ea_class ON exercise_assignments(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_ea_assigned_by ON exercise_assignments(assigned_by);
CREATE INDEX idx_ea_active ON exercise_assignments(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ea_deadline ON exercise_assignments(optional_deadline) WHERE optional_deadline IS NOT NULL;
CREATE INDEX idx_ea_teacher_active ON exercise_assignments(assigned_by, is_active) WHERE is_active = TRUE;

-- Completion lookups (6 indexes)
CREATE INDEX idx_ec_exercise ON exercise_completions(exercise_id);
CREATE INDEX idx_ec_student ON exercise_completions(student_id);
CREATE INDEX idx_ec_completed ON exercise_completions(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_ec_last_viewed ON exercise_completions(last_viewed_at DESC);
CREATE INDEX idx_ec_student_completed ON exercise_completions(student_id, completed_at) WHERE completed_at IS NOT NULL;
```

### 3. Client-Side Optimizations

```typescript
// Debounced search (300ms)
const debouncedSearch = debounce((query: string) => {
	goto(`?search=${encodeURIComponent(query)}`);
}, 300);

// Pagination (50 items default)
const { data } = await getExercises(filters, { page: 1, limit: 50 });

// Selective column fetching for lists
const { data } = await supabase
	.from('exercises')
	.select('id, title, difficulty, tags, updated_at') // Not statement_md!
	.eq('created_by', teacherId);

// AST caching in MarkdownRenderer
const cache = new LRUCache<string, DocumentNode>({ max: 100 });
```

### 4. Optimistic UI

```typescript
// Immediate UI feedback, then sync with server
async function toggleCompletion(exerciseId: string) {
	// Optimistic update
	exercise.completion = { ...exercise.completion, completed_at: new Date().toISOString() };

	try {
		// Server sync
		await fetch(`/api/exercises/${exerciseId}/complete`, { method: 'POST' });
	} catch (error) {
		// Revert on failure
		exercise.completion = { ...exercise.completion, completed_at: null };
		toaster.error('Failed to update');
	}
}
```

---

## Integration Points

### 1. Markdown Rendering (Ubumark Library)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Markdown Rendering Pipeline                   │
│                                                                 │
│  Raw Markdown                                                   │
│  "Calculate ${{a}} + {{b}}$"                                    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────┐                                       │
│  │ Parameterization    │  (if exercise has variables)          │
│  │ Variable Resolution │                                       │
│  └──────────┬──────────┘                                       │
│             │                                                   │
│         ▼                                                       │
│  Resolved Markdown                                              │
│  "Calculate $7 + 3$"                                            │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────┐                                       │
│  │ Markdown Parser     │  parseMarkdown()                      │
│  │ (with math extract) │                                       │
│  └──────────┬──────────┘                                       │
│             │                                                   │
│         ▼                                                       │
│  AST (DocumentNode)                                             │
│  { type: 'document', children: [...] }                         │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────┐                                       │
│  │ MarkdownRenderer    │  Svelte component                     │
│  │ Node Components     │                                       │
│  └──────────┬──────────┘                                       │
│             │                                                   │
│         ▼                                                       │
│  ┌─────────────────────┐                                       │
│  │ MathLive            │  For math expressions                 │
│  │ (read-only/editable)│                                       │
│  └─────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Storage Integration (Exercise Images)

```typescript
// Image upload to Supabase Storage
const bucket = 'exercise-images';
const path = `${userId}/${exerciseId}/${filename}`;

// Upload
await supabase.storage.from(bucket).upload(path, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

// Automatic cleanup on exercise deletion (trigger)
CREATE TRIGGER trigger_delete_exercise_images
  AFTER DELETE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION delete_exercise_images();
```

### 3. Class System Integration

```sql
-- Assignment to class resolves via class_members
SELECT student_id FROM class_members WHERE class_id = 'class-123';

-- Access check includes class membership
student_has_exercise_access() checks:
  1. exercise.is_public = TRUE
  2. Direct assignment (student_id = user)
  3. Class assignment (class_id in user's class_members)
  4. Public assignment (assigned_to_type = 'public')
```

---

## Key Implementation Patterns

### 1. Type-Safe Untyped Tables

```typescript
// Helper for tables not yet in generated types
function fromUnknownTable(supabase: TypedSupabaseClient, table: string): any {
	return (supabase as any).from(table);
}

function callUnknownRpc(supabase: TypedSupabaseClient, fn: string, args: object): any {
	return (supabase as any).rpc(fn, args);
}

// Usage
const { data } = await fromUnknownTable(supabase, 'exercise_assignments')
	.select('*')
	.eq('exercise_id', exerciseId);
```

### 2. Atomic Bulk Operations

```typescript
// Supabase INSERT with array is atomic
async function createBulkAssignments(supabase, data, userId) {
	const assignments = [];

	// Build assignment objects
	for (const studentId of data.students || []) {
		assignments.push({
			exercise_id: data.exercise_id,
			assigned_by: userId,
			assigned_to_type: 'student',
			student_id: studentId,
			optional_deadline: data.optional_deadline,
			notes: data.notes
		});
	}

	// Atomic insert - all or nothing
	const { data: created, error } = await fromUnknownTable(supabase, 'exercise_assignments')
		.insert(assignments)
		.select();

	if (error) throw error;
	return { count: created.length };
}
```

### 3. UPSERT Pattern for Completions

```typescript
async function markExerciseAsViewed(supabase, exerciseId, studentId, assignmentId) {
	const { data: existing } = await fromUnknownTable(supabase, 'exercise_completions')
		.select('id, view_count')
		.eq('exercise_id', exerciseId)
		.eq('student_id', studentId)
		.single();

	if (existing) {
		// Update: increment view_count
		return await fromUnknownTable(supabase, 'exercise_completions')
			.update({
				view_count: existing.view_count + 1,
				last_viewed_at: new Date().toISOString()
			})
			.eq('id', existing.id)
			.select()
			.single();
	} else {
		// Insert: first view
		return await fromUnknownTable(supabase, 'exercise_completions')
			.insert({
				exercise_id: exerciseId,
				student_id: studentId,
				assignment_id: assignmentId,
				view_count: 1,
				last_viewed_at: new Date().toISOString()
			})
			.select()
			.single();
	}
}
```

### 4. Component Mode Pattern

```svelte
<!-- ExerciseDisplay.svelte -->
<script lang="ts">
	interface Props {
		exercise: Exercise;
		mode?: 'template' | 'instance';
		userId?: string;
		groupId?: string;
		showSolution?: boolean;
	}

	let { exercise, mode = 'instance', userId, groupId, showSolution = $bindable(false) } = $props();

	let currentInstance = $state<ExerciseInstance | null>(null);

	function generateInstance() {
		if (mode === 'template') {
			// Teacher preview: random seed each time
			const result = generateExerciseInstance(exercise, {
				seed: Math.floor(Math.random() * 1000000)
			});
			currentInstance = result.instance;
		} else {
			// Student view: seed based on distribution mode
			let seed: number | undefined;

			if (exercise.distribution_mode === 'per_student' && userId) {
				seed = generateStudentSeed(exercise.id, userId);
			} else if (exercise.distribution_mode === 'per_group' && groupId) {
				seed = generateGroupSeed(exercise.id, groupId);
			}
			// on_demand: seed stays undefined (random)

			const result = generateExerciseInstance(exercise, { seed });
			currentInstance = result.instance;
		}
	}

	$effect(() => {
		if (exercise.variables?.length) {
			generateInstance();
		}
	});
</script>
```

---

## File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── exercises/
│   │   │   ├── ExerciseDisplay.svelte        # Main display component
│   │   │   ├── ExerciseForm.svelte           # Create/edit form
│   │   │   ├── ExerciseMarkdownEditor.svelte # Editor with preview
│   │   │   ├── ExerciseParameterizationEditor.svelte
│   │   │   ├── ExportDialog.svelte
│   │   │   ├── ImportDialog.svelte
│   │   │   ├── LaTeXImportDialog.svelte
│   │   │   └── ImageUploader.svelte
│   │   └── markdown/
│   │       ├── MarkdownRenderer.svelte       # AST renderer
│   │       └── nodes/                        # Node components
│   │
│   ├── ubumark/
│   │   ├── parser/                           # Markdown → AST
│   │   ├── parameterization/
│   │   │   ├── resolver/variable-resolver.ts # Resolve variables
│   │   │   ├── resolver/text-resolver.ts     # Replace {{}} in text
│   │   │   ├── resolver/random-generator.ts  # Seeded RNG
│   │   │   └── parser/eval-parser.ts         # Eval expressions
│   │   └── types/
│   │
│   ├── exercises/
│   │   ├── types.ts                          # ~2250 lines of types
│   │   └── generator/
│   │       └── instance-generator.ts         # Instance generation
│   │
│   └── server/
│       ├── exercises.ts                      # Core CRUD
│       ├── exercise-assignments.ts           # Assignments & completions
│       └── validation/
│           └── exercises.ts                  # Zod schemas
│
├── routes/
│   ├── api/exercises/                        # API endpoints
│   │   ├── +server.ts
│   │   ├── assigned/+server.ts
│   │   ├── [id]/+server.ts
│   │   ├── [id]/assign/+server.ts
│   │   ├── [id]/complete/+server.ts
│   │   ├── [id]/view/+server.ts
│   │   ├── [id]/stats/+server.ts
│   │   ├── import/+server.ts
│   │   └── export/+server.ts
│   │
│   └── (protected)/dashboard/
│       ├── teacher/exercises/                # Teacher pages
│       │   ├── +page.svelte
│       │   ├── +page.server.ts
│       │   ├── new/+page.svelte
│       │   ├── [id]/+page.svelte
│       │   └── [id]/assign/+page.svelte
│       │
│       └── student/exercises/                # Student pages
│           ├── +page.svelte
│           ├── +page.server.ts
│           └── [id]/+page.svelte
│
supabase/migrations/
├── 20251026080000_create_exercises_table.sql
├── 20251026120000_add_exercise_sharing_and_templates.sql
├── 20251026153000_add_exercise_parameterization.sql
├── 20251027005912_create_exercise_assignments.sql
├── 20251027010000_add_exercise_fulltext_search.sql
├── 20251027010100_add_exercise_cleanup_triggers.sql
├── 20251027021000_add_exercise_completion_stats_function.sql
├── 20251031160000_create_exercise_assignments_tables.sql
└── 20251031160100_cleanup_duplicate_exercise_indexes.sql
```

---

## Summary

The Exercises System is a production-ready feature implementing:

1. **Template-Instance Pattern**: Exercises can be static or parameterized, with instances generated using seeded randomness for reproducibility.

2. **Three-Tier Assignment**: Flexible targeting (student, class, public) with proper cascade handling.

3. **Security by Design**: RLS policies enforce ownership and access, with Zod validation at all API boundaries.

4. **Performance Optimized**: Batch queries prevent N+1, 17 database indexes ensure fast lookups, client-side caching reduces redundant operations.

5. **Clean Architecture**: Clear separation between UI, API, server logic, and database layers with well-defined interfaces.

6. **Pedagogical Flexibility**: Distribution modes support different teaching scenarios (practice, homework, class work).
