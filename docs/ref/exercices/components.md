# Exercises System - Components Reference

> **Last Updated**: 2025-12-21
>
> **Related**: [Index](./index.md) | [Types](./types.md) | [Parameterization](./parameterization.md)

---

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [Teacher Pages](#teacher-pages)
- [Student Pages](#student-pages)
- [Form Components](#form-components)
- [Utility Components](#utility-components)

---

## Overview

The exercises system uses Svelte 5 components with runes for state management. All components follow the project's Shadcn-svelte design system.

### Component Locations

```
src/lib/components/
├── FontSelector.svelte           # Font selection dropdown
├── ExerciseSkeleton.svelte       # Loading placeholder

src/lib/components/exercises/
├── ExerciseDisplay.svelte        # Main display component
├── ExerciseRichTextEditor.svelte # WYSIWYG editor for exercises
├── ExerciseForm.svelte           # Full exercise form
├── ExerciseMarkdownEditor.svelte # Markdown editor integration
├── ExerciseMarkdownPreview.svelte # Preview panel
├── ExerciseParameterizationEditor.svelte # Variable editor
├── ExerciseResourceEditor.svelte # Resource management
├── HintEditor.svelte             # Hint management
├── VariationEditor.svelte        # Variation management
├── GenericFunctionInput.svelte   # Generic function editor
├── ImportDialog.svelte           # Import exercises dialog
├── ExportDialog.svelte           # Export exercises dialog
├── LaTeXImportDialog.svelte      # LaTeX import dialog
├── ImageUploader.svelte          # Image upload component
├── ImageAlignmentSelector.svelte # Image alignment options
├── ImageSizeSelector.svelte      # Image size options
├── ImageAttributePanel.svelte    # Image attributes editor
└── ImageCaptionInput.svelte      # Image caption input

src/routes/(protected)/dashboard/teacher/exercises/
├── +page.svelte                  # Exercise list
├── +page.server.ts               # Data loading
├── new/+page.svelte              # Create form
├── [id]/+page.svelte             # View exercise
└── [id]/assign/+page.svelte      # Assignment interface

src/routes/(protected)/dashboard/student/exercises/
├── +page.svelte                  # Student exercise list
├── +page.server.ts               # Data loading
└── [id]/+page.svelte             # Exercise view
```

---

## Core Components

### ExerciseDisplay

Main component for rendering exercises with parameterization support.

**Location**: `src/lib/components/exercises/ExerciseDisplay.svelte`

**Props**:

```typescript
interface Props {
	exercise: Exercise; // Exercise template
	mode?: 'template' | 'instance'; // Display mode
	userId?: string; // For per_student seeding
	groupId?: string; // For per_group seeding
	showSolution?: boolean; // Solution visibility (bindable)
}
```

**Features**:

- Template mode: Teacher preview with regeneration button
- Instance mode: Student view with resolved variables
- Supports static and parameterized exercises
- On-demand mode: "Try New Problem" button
- Show/hide solution toggle
- Font selector for customizable display (persisted to localStorage)
- Renders markdown with MathLive via `MarkdownRenderer`

**Usage**:

```svelte
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { Exercise } from '$lib/exercises/types';

	let { exercise }: { exercise: Exercise } = $props();
	let showSolution = $state(false);
</script>

<!-- Teacher preview -->
<ExerciseDisplay {exercise} mode="template" bind:showSolution />

<!-- Student view -->
<ExerciseDisplay
	{exercise}
	mode="instance"
	userId={student.id}
	groupId={assignment?.id}
	bind:showSolution
/>
```

**Internal State**:

```typescript
let currentInstance = $state<ExerciseInstance | null>(null);
let generationError = $state<string | null>(null);
let isGenerating = $state(false);
```

**Instance Generation Logic**:

```typescript
function generateInstance() {
	// 1. Check if parameterized
	if (!exercise.variables || exercise.variables.length === 0) {
		currentInstance = null;
		return;
	}

	// 2. Determine seed based on distribution mode
	let seed: number | undefined;

	if (mode === 'template') {
		seed = Math.floor(Math.random() * 1000000);
	} else {
		if (exercise.distribution_mode === 'per_student' && userId) {
			seed = generateStudentSeed(exercise.id, userId);
		} else if (exercise.distribution_mode === 'per_group' && groupId) {
			seed = generateGroupSeed(exercise.id, groupId);
		} else {
			seed = undefined; // Random for on_demand
		}
	}

	// 3. Generate and handle result
	const result = generateExerciseInstance(exercise, { seed });
	// ...
}
```

---

### ExerciseSkeleton

Loading placeholder for exercise content.

**Location**: `src/lib/components/ExerciseSkeleton.svelte`

**Usage**:

```svelte
{#if loading}
	<ExerciseSkeleton />
{:else}
	<ExerciseDisplay {exercise} />
{/if}
```

---

## Teacher Pages

### Exercise List Page

**Location**: `src/routes/(protected)/dashboard/teacher/exercises/+page.svelte`

**Features**:

- Table/card view toggle
- Full-text search (debounced 300ms)
- Filters: topic, difficulty, tags, grade levels
- Sort by creation date, title, difficulty
- Quick actions: View, Edit, Assign, Duplicate, Delete
- Pagination (50 per page)

**State**:

```typescript
let searchQuery = $state('');
let difficulty = $state<1 | 2 | 3 | null>(null);
let selectedTopic = $state<string | null>(null);
let viewMode = $state<'table' | 'cards'>('table');
let loading = $state(false);
```

**Data Loading** (`+page.server.ts`):

```typescript
export async function load({ locals, url }) {
	const filters = {
		search: url.searchParams.get('search') || undefined,
		difficulty: url.searchParams.get('difficulty') as 1 | 2 | 3 | undefined,
		topic: url.searchParams.get('topic') || undefined
	};

	const { data: exercises } = await getTeacherExercises(locals.supabase, locals.user.id, filters, {
		page: 1,
		limit: 50
	});

	return { exercises };
}
```

---

### Create/Edit Form Page

**Location**: `src/routes/(protected)/dashboard/teacher/exercises/create/+page.svelte`

**Form Sections**:

1. **Metadata**: Title, source, difficulty, tags, grade levels, topic
2. **Content**: Split-view markdown editor with live preview
3. **Parameterization**: Variable editor with distribution mode
4. **Preview**: Instance preview with resolved variables

**Key Components Used**:

- `MySelect` for dropdowns
- Markdown editor with syntax helpers
- Variable editor for parameterization
- Live preview pane

---

### Assignment Page

**Location**: `src/routes/(protected)/dashboard/teacher/exercises/[id]/assign/+page.svelte`

**Features**:

- Select target type (student/class/public)
- Student/class picker with search
- Bulk assignment to multiple targets
- Optional deadline picker
- Notes field for instructions
- Preview of target students

**Assignment Flow**:

```
1. Select exercise
   ↓
2. Choose target type
   ↓
3. Select students/classes (if applicable)
   ↓
4. Set deadline & notes
   ↓
5. Confirm assignment
   ↓
6. API creates assignment record(s)
```

---

## Student Pages

### Student Exercise List

**Location**: `src/routes/(protected)/dashboard/student/exercises/+page.svelte`

**Features**:

- View all accessible exercises
- Filter by completion status
- Filter by assignment status
- Filter by deadline urgency
- Search by title/content
- Sort by deadline, assignment date, title

**Visual Indicators**:

- Target icon: Assigned
- Clock icon: Deadline badge (urgency color)
- Check icon: Completed
- Eye icon: View count
- Pin icon: Public library

**State**:

```typescript
let searchQuery = $state(data.filters.search);
let showCompleted = $state(data.filters.completed);
let loading = $state(false);

let sortedExercises = $derived(
	[...data.exercises].sort((a, b) => {
		// Incomplete assigned first, then by deadline urgency
	})
);
```

---

### Exercise View Page

**Location**: `src/routes/(protected)/dashboard/student/exercises/[id]/+page.svelte`

**Features**:

- Display resolved exercise statement
- Toggle solution visibility
- Mark complete/incomplete button
- View assignment details (deadline, notes)
- Regenerate button (on_demand mode only)
- Navigation: Previous/Next exercise

**Data Loading** (`+page.server.ts`):

```typescript
export async function load({ locals, params }) {
	// 1. Check access
	const hasAccess = await studentHasAccess(locals.supabase, params.id, locals.user.id);

	if (!hasAccess) {
		throw error(403, 'Access denied');
	}

	// 2. Load exercise with completion
	const { data: exercise } = await getExercise(locals.supabase, params.id);

	// 3. Record view
	await markExerciseAsViewed(locals.supabase, params.id, locals.user.id);

	return { exercise };
}
```

---

## Form Components

### ExerciseRichTextEditor

WYSIWYG editor wrapper for exercise content (statement and solution).

**Location**: `src/lib/components/exercises/ExerciseRichTextEditor.svelte`

**Props**:

```typescript
interface Props {
	/** Markdown content (bindable) */
	value?: string;
	/** Supabase client for image uploads */
	supabase?: SupabaseClient;
	/** User ID for image organization */
	userId?: string;
}
```

**Features**:

- WYSIWYG editing with markdown storage
- Image upload to Supabase `exercise-images` bucket
- Full toolbar with math formulas and templates
- Preview mode
- Supports all RichTextEditor features (templates, math, etc.)

**Usage**:

```svelte
<script lang="ts">
	import ExerciseRichTextEditor from '$lib/components/exercises/ExerciseRichTextEditor.svelte';
	let content = $state('');
</script>

<ExerciseRichTextEditor bind:value={content} {supabase} {userId} />
```

**Used in**: `ExerciseForm.svelte` for statement and solution editing.

---

### Variable Editor

Manages parameterization variables for exercises.

**Features**:

- Add/remove variables
- Name and expression inputs
- Dependency validation
- Expression preview
- Circular dependency detection

**State Management**:

```typescript
let variables = $state<Variable[]>([]);

function addVariable() {
	variables = [...variables, { name: '', expression: '' }];
}

function removeVariable(index: number) {
	variables = variables.filter((_, i) => i !== index);
}
```

### Distribution Mode Selector

Selects how instances are distributed.

```svelte
<MySelect
	type="single"
	bind:value={distributionMode}
	items={[
		{ value: 'on_demand', label: 'A la demande (pratique)' },
		{ value: 'per_student', label: 'Par eleve (devoir)' },
		{ value: 'per_group', label: 'Par groupe (travail de classe)' }
	]}
/>
```

---

## Utility Components

### MarkdownRenderer

Renders markdown with math support via MathLive.

**Location**: `src/lib/components/markdown/MarkdownRenderer.svelte`

**Usage**:

```svelte
<MarkdownRenderer content={exercise.statement_md} />
```

### FontSelector

Dropdown component for selecting exercise display font.

**Location**: `src/lib/components/FontSelector.svelte`

**Store**: `src/lib/stores/exerciseFont.svelte.ts`

**Available Fonts**:

| ID           | Label      | Category    |
| ------------ | ---------- | ----------- |
| `system`     | Systeme    | sans-serif  |
| `inter`      | Inter      | sans-serif  |
| `lora`       | Lora       | serif       |
| `georgia`    | Georgia    | serif       |
| `times`      | Times      | serif       |
| `comic`      | Comic Sans | sans-serif  |
| `excalifont` | Excalifont | handwritten |

**Usage**:

```svelte
<script>
	import FontSelector from '$lib/components/FontSelector.svelte';
</script>

<FontSelector />
```

**Store API**:

```typescript
import { exerciseFont } from '$lib/stores/exerciseFont.svelte';

// Get current font
exerciseFont.current; // 'inter'
exerciseFont.currentFont; // { id, label, family, category }

// Set font
exerciseFont.setFont('excalifont');

// Reset to default
exerciseFont.reset();
```

**CSS**: The font is applied via `--exercise-font-family` CSS variable to `.exercise-content` elements.

---

### Deadline Badge

Displays deadline with urgency coloring.

```svelte
{#if assignment?.optional_deadline}
	<Badge variant={getDeadlineVariant(assignment.optional_deadline)}>
		{formatDeadline(assignment.optional_deadline)}
	</Badge>
{/if}
```

### Completion Toggle

Toggle button for marking completion.

```svelte
<Button onclick={toggleCompletion} variant={isCompleted ? 'secondary' : 'default'}>
	{isCompleted ? 'Marquer incomplet' : 'Marquer termine'}
</Button>
```

---

## State Management Patterns

### Local State (Svelte 5 Runes)

```svelte
<script lang="ts">
	// Simple state
	let searchQuery = $state('');
	let loading = $state(false);

	// Derived state
	let filteredExercises = $derived(exercises.filter((e) => e.title?.includes(searchQuery)));

	// Effects
	$effect(() => {
		if (searchQuery) {
			debouncedSearch(searchQuery);
		}
	});
</script>
```

### URL State (Query Parameters)

```typescript
// Reading from URL
const search = url.searchParams.get('search');

// Updating URL
function updateFilters() {
	const params = new URLSearchParams();
	if (searchQuery) params.set('search', searchQuery);
	goto(`?${params.toString()}`);
}
```

### Server Data

```typescript
// +page.server.ts
export async function load({ locals }) {
  const { data } = await getTeacherExercises(locals.supabase, locals.user.id);
  return { exercises: data };
}

// +page.svelte
<script lang="ts">
  let { data } = $props();
  // data.exercises is available
</script>
```

---

## Accessibility

All exercise components follow accessibility best practices:

- Keyboard navigation for all interactive elements
- ARIA labels on buttons and controls
- Focus management for modals and dialogs
- Screen reader support for status updates
- Color contrast compliance for deadline indicators
