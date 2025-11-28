# ExerciseDisplay Component - Usage Examples

This document demonstrates how to use the updated `ExerciseDisplay` component with support for both template and instance modes.

---

## Basic Usage

### 1. Static Exercise (No Variables)

```svelte
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { Exercise } from '$lib/exercises/types';

	const staticExercise: Exercise = {
		id: 'ex-static-123',
		statement_md: 'Calculate $2 + 3$.',
		solution_md: 'The answer is $5$.',
		distribution_mode: 'on_demand',
		difficulty: 1,
		tags: ['addition'],
		created_by: 'teacher-id',
		created_at: '2025-01-15',
		updated_at: '2025-01-15'
	};
</script>

<ExerciseDisplay exercise={staticExercise} />
```

**Result**: Displays the exercise as-is with a "Show/Hide Solution" button.

---

## Parameterized Exercises

### 2. Teacher Preview Mode (Template)

Shows a sample instance with ability to regenerate different values.

```svelte
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { Exercise } from '$lib/exercises/types';

	const paramExercise: Exercise = {
		id: 'ex-param-456',
		variables: [
			{ name: 'a', expression: '{{1..10}}' },
			{ name: 'b', expression: '{{1..10}}' },
			{ name: 'sum', expression: '{{eval:a+b}}' }
		],
		statement_md: 'Calculate ${{a}} + {{b}}$.',
		solution_md: 'The answer is ${{sum}}$.',
		distribution_mode: 'on_demand',
		difficulty: 1,
		tags: ['addition'],
		created_by: 'teacher-id',
		created_at: '2025-01-15',
		updated_at: '2025-01-15'
	};
</script>

<ExerciseDisplay exercise={paramExercise} mode="template" />
```

**Result**:

- Blue banner: "Aperçu du template"
- Button: "🎲 Autres valeurs" to regenerate instance
- Variable values table in collapsed details section
- Shows resolved content (e.g., "Calculate $7 + 3$")

---

### 3. Student View - On-Demand Mode (Practice)

Generates new instance each time, with "Try New Problem" button.

```svelte
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';

	// Same paramExercise as above with distribution_mode: 'on_demand'
</script>

<ExerciseDisplay exercise={paramExercise} mode="instance" />
```

**Result**:

- "🎲 Nouveau problème" button at top right
- Each click generates a fresh instance with new values
- No variable details shown (student view)

---

### 4. Student View - Per-Student Mode (Homework)

Each student sees consistent values based on their userId.

```svelte
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { Exercise } from '$lib/exercises/types';

	const homeworkExercise: Exercise = {
		id: 'ex-homework-789',
		variables: [{ name: 'x', expression: '{{1..100}}' }],
		statement_md: 'Solve for $y$ if $x + y = 100$ and $x = {{x}}$.',
		solution_md: 'Since $x = {{x}}$, we have $y = {{eval:100-x}}$.',
		distribution_mode: 'per_student',
		difficulty: 2,
		tags: ['algebra', 'equations'],
		created_by: 'teacher-id',
		created_at: '2025-01-15',
		updated_at: '2025-01-15'
	};

	const currentUserId = 'student-uuid-123';
</script>

<ExerciseDisplay exercise={homeworkExercise} mode="instance" userId={currentUserId} />
```

**Result**:

- Instance is generated once based on `userId`
- Same student always sees same values (deterministic seed)
- No regeneration button (values should be consistent)

---

### 5. Student View - Per-Group Mode (Class Work)

All students in a group see the same instance.

```svelte
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { Exercise } from '$lib/exercises/types';

	const classExercise: Exercise = {
		id: 'ex-class-999',
		variables: [{ name: 'n', expression: '{{1..20}}' }],
		statement_md: 'Find the prime factorization of ${{n}}$.',
		solution_md: '...',
		distribution_mode: 'per_group',
		difficulty: 3,
		tags: ['number-theory'],
		created_by: 'teacher-id',
		created_at: '2025-01-15',
		updated_at: '2025-01-15'
	};

	const assignmentId = 'assignment-uuid-456';
</script>

<ExerciseDisplay exercise={classExercise} mode="instance" groupId={assignmentId} />
```

**Result**:

- All students in this assignment see the same value for `n`
- Seed is generated from `exerciseId + assignmentId`
- No regeneration button

---

## Advanced Features

### 6. Two-way Binding for Solution Toggle

Control solution visibility from parent component.

```svelte
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';

	let showSolution = $state(false);
</script>

<div>
	<p>Solution visible: {showSolution ? 'Yes' : 'No'}</p>

	<ExerciseDisplay exercise={paramExercise} bind:showSolution />

	<!-- External toggle -->
	<button onclick={() => (showSolution = !showSolution)}> Toggle Solution Externally </button>
</div>
```

---

## Error Handling

### 7. Circular Dependency Error

```svelte
<script lang="ts">
	const badExercise: Exercise = {
		id: 'ex-circular',
		variables: [
			{ name: 'a', expression: '{{b}}' },
			{ name: 'b', expression: '{{a}}' } // Circular!
		],
		statement_md: '{{a}} + {{b}}',
		solution_md: 'N/A'
		// ... other fields
	};
</script>

<ExerciseDisplay exercise={badExercise} />
```

**Result**:
Red error banner displays:

```
Erreur de génération
Circular dependency detected: a → b → a
```

---

### 8. Missing Required IDs

```svelte
<script lang="ts">
	const perStudentEx: Exercise = {
		// ... distribution_mode: 'per_student'
	};
</script>

<!-- Missing userId! -->
<ExerciseDisplay exercise={perStudentEx} mode="instance" />
```

**Result**:
Red error banner displays:

```
Erreur de génération
Mode per_student nécessite userId
```

---

## Responsive Design

The component is fully responsive:

- **Mobile (< 640px)**: Buttons stack vertically, prose scales down
- **Tablet (640px - 1024px)**: Horizontal button layout
- **Desktop (> 1024px)**: Full layout with optimal spacing

---

## Accessibility

The component includes:

- ✅ Semantic HTML (`<details>`, `<summary>`, `<table>`)
- ✅ ARIA-friendly error messages
- ✅ Keyboard navigation for buttons
- ✅ Screen reader friendly labels
- ✅ Sufficient color contrast (dark mode support)

---

## Integration with Exercise Bank

### Typical Teacher Flow

```svelte
<!-- routes/(protected)/dashboard/teacher/exercises/[id]/+page.svelte -->
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const exercise = data.exercise;
</script>

<div class="container mx-auto p-6">
	<h1 class="mb-6 text-2xl font-bold">{exercise.title || 'Exercice'}</h1>

	<!-- Teacher always sees template mode -->
	<ExerciseDisplay {exercise} mode="template" />
</div>
```

### Typical Student Flow

```svelte
<!-- routes/(protected)/dashboard/student/practice/[exerciseId]/+page.svelte -->
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();
	const exercise = data.exercise;
	const userId = $page.data.session?.user?.id;
</script>

<div class="container mx-auto p-6">
	<h1 class="mb-6 text-2xl font-bold">Pratique</h1>

	<!-- Student sees instance mode -->
	<ExerciseDisplay {exercise} mode="instance" {userId} />
</div>
```

---

## Performance Tips

1. **Static exercises**: No overhead, renders directly
2. **Parameterized exercises**: Instance generation is fast (<1ms for simple expressions)
3. **Markdown rendering**: Handled by MarkdownRenderer component with efficient parsing
4. **Re-renders**: Component uses `$derived` for efficient reactivity

---

## Component Props Reference

| Prop           | Type                       | Default      | Description                               |
| -------------- | -------------------------- | ------------ | ----------------------------------------- |
| `exercise`     | `Exercise`                 | **required** | Exercise template to display              |
| `mode`         | `'template' \| 'instance'` | `'instance'` | Display mode (teacher vs student)         |
| `userId`       | `string \| undefined`      | `undefined`  | Student ID for per-student seeding        |
| `groupId`      | `string \| undefined`      | `undefined`  | Group/assignment ID for per-group seeding |
| `showSolution` | `boolean`                  | `false`      | Initial solution visibility (bindable)    |

---

## Next Steps

- **Export functionality**: Add "Export as PDF" button
- **Print view**: Optimize layout for printing
- **Accessibility audit**: Full WCAG 2.1 AA compliance
- **Animation**: Smooth transitions when regenerating instances
