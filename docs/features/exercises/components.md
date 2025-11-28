# Exercise Feature - Components Reference

> **Last Updated**: 2025-10-27
>
> **Related Documentation**:
>
> - [Main Overview](./README.md)
> - [Architecture](./architecture.md)
> - [API Documentation](./api.md)

---

## Table of Contents

- [Overview](#overview)
- [Core Display Components](#core-display-components)
- [Editor Components](#editor-components)
- [Form Components](#form-components)
- [Import/Export Components](#importexport-components)
- [Utility Components](#utility-components)

---

## Overview

The Exercise Feature provides a library of reusable Svelte 5 components for displaying, editing, and managing exercises. All components use the runes syntax (`$state`, `$derived`, `$props`).

### Component Organization

```
src/lib/components/exercises/
├── ExerciseDisplay.svelte              # Display rendered exercise
├── ExerciseMarkdownEditor.svelte       # Markdown editor with toolbar
├── ExerciseMarkdownPreview.svelte      # Live preview with instance generation
├── ExerciseParameterizationEditor.svelte  # Variable management
├── ExerciseForm.svelte                 # Complete exercise create/edit form
├── ExportDialog.svelte                 # Export UI (JSON/Markdown)
└── ImportDialog.svelte                 # Import UI with duplicate handling
```

---

## Core Display Components

### ExerciseDisplay

Renders a resolved exercise instance with markdown, LaTeX math, and optional solution toggle.

**Location**: `/src/lib/components/exercises/ExerciseDisplay.svelte`

#### Props

```typescript
interface Props {
	/** Exercise to display (template or instance) */
	exercise: Exercise | ExerciseInstance;

	/** Display mode: 'template' shows raw {{var}}, 'instance' shows resolved values */
	mode?: 'template' | 'instance';

	/** User ID for per_student distribution mode */
	userId?: string;

	/** Group/Assignment ID for per_group distribution mode */
	groupId?: string;

	/** Whether to show the solution section */
	showSolution?: boolean; // $bindable

	/** Whether to parse content to AST (set false for performance) */
	parseAST?: boolean;

	/** Additional CSS classes */
	class?: string;
}
```

#### Events

None (uses `$bindable` for two-way binding on `showSolution`).

#### Usage

```svelte
<script lang="ts">
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { Exercise } from '$lib/exercises/types';

	let exercise: Exercise = $state({
		id: 'ex-123',
		variables: [
			{ name: 'a', expression: '{{1..10}}' },
			{ name: 'b', expression: '{{1..10}}' }
		],
		statement_md: 'Calculate ${{a}} + {{b}}$',
		solution_md: 'The answer is ${{eval:a+b}}$',
		distribution_mode: 'per_student',
		difficulty: 1,
		tags: ['addition']
		// ... other required fields
	});

	let showSolution = $state(false);
</script>

<!-- Display instance (resolved variables) -->
<ExerciseDisplay
	{exercise}
	mode="instance"
	userId={data.userId}
	bind:showSolution
	parseAST={true}
/>

<!-- Toggle solution visibility -->
<button onclick={() => (showSolution = !showSolution)}>
	{showSolution ? 'Hide' : 'Show'} Solution
</button>
```

#### Features

- **Automatic Instance Generation**: If `mode="instance"` and exercise has variables, generates instance with appropriate seed
- **Distribution Mode Support**:
  - `on_demand`: Random seed each time
  - `per_student`: Deterministic seed from `userId`
  - `per_group`: Deterministic seed from `groupId`
- **MathLive Integration**: Renders LaTeX math with `<math-field>` components
- **Responsive Design**: Adapts to mobile and desktop layouts
- **Theme Support**: Respects light/dark mode via CSS variables

#### Implementation Details

```svelte
<script lang="ts">
	import { generateExerciseInstance } from '$lib/exercises/generator/instance-generator';
	import { parseMarkdown } from '$lib/exercises/parser/markdown-parser';

	let {
		exercise,
		mode = 'instance',
		userId,
		groupId,
		showSolution = $bindable(false),
		parseAST = true
	} = $props();

	// Generate instance if in instance mode and exercise has variables
	let instance = $derived(() => {
		if (mode === 'template' || !exercise.variables || exercise.variables.length === 0) {
			return exercise; // No instance generation needed
		}

		// Determine seed based on distribution mode
		const seed = getSeed(exercise.distribution_mode, userId, groupId);
		const result = generateExerciseInstance(exercise, { seed, parseAST });

		if (result.success && result.instance) {
			return result.instance;
		}

		// Fallback to template if generation fails
		console.error('Instance generation failed:', result.errors);
		return exercise;
	});

	// Parse markdown to AST for rendering
	let statementAst = $derived(() => {
		if (parseAST) {
			return parseMarkdown(instance.statement_md);
		}
		return null;
	});

	let solutionAst = $derived(() => {
		if (parseAST && showSolution) {
			return parseMarkdown(instance.solution_md);
		}
		return null;
	});
</script>

<div class="exercise-display prose dark:prose-invert">
	<!-- Render statement -->
	{#if statementAst}
		{@html renderAstToHtml(statementAst)}
	{:else}
		{@html renderMarkdownToHtml(instance.statement_md)}
	{/if}

	<!-- Render solution if visible -->
	{#if showSolution}
		<div class="solution-section mt-6 border-t pt-6">
			<h3 class="text-lg font-semibold">Solution</h3>
			{#if solutionAst}
				{@html renderAstToHtml(solutionAst)}
			{:else}
				{@html renderMarkdownToHtml(instance.solution_md)}
			{/if}
		</div>
	{/if}
</div>
```

---

## Editor Components

### ExerciseMarkdownEditor

Split-view markdown editor with toolbar, syntax helpers, and live preview.

**Location**: `/src/lib/components/exercises/ExerciseMarkdownEditor.svelte`

#### Props

```typescript
interface Props {
	/** Markdown content */
	value?: string; // $bindable

	/** Placeholder text */
	placeholder?: string;

	/** Whether to show live preview pane */
	showPreview?: boolean;

	/** Supabase client for image upload */
	supabase?: SupabaseClient;

	/** User ID for image upload (required if supabase provided) */
	userId?: string;

	/** Additional CSS classes */
	class?: string;
}
```

#### Events

None (uses `$bindable` for two-way binding on `value`).

#### Usage

```svelte
<script lang="ts">
	import ExerciseMarkdownEditor from '$lib/components/exercises/ExerciseMarkdownEditor.svelte';

	let markdown = $state('# Exercice\n\nCalculez: $2 + 3$');
</script>

<ExerciseMarkdownEditor
	bind:value={markdown}
	placeholder="Écrivez votre exercice en markdown..."
	showPreview={true}
	supabase={data.supabase}
	userId={data.user.id}
/>
```

#### Toolbar Sections

**1. Text Formatting**:

- **Bold** (`**text**`): Wraps selection in bold markers
- **Italic** (`*text*`): Wraps selection in italic markers
- **Code** (`` `text` ``): Wraps selection in inline code markers

**2. Math**:

- **Inline Math** (`$formula$`): Inserts inline math delimiters
- **Block Math** (`$$\nformula\n$$`): Inserts block math with newlines
- **Templates**: Quick-insert for common formulas
  - Fraction: `\frac{a}{b}`
  - Square root: `\sqrt{x}`
  - Power: `x^{n}`
  - Sum: `\sum_{i=1}^{n}`
  - Integral: `\int_{a}^{b}`
  - Matrix: `\begin{pmatrix} a & b \\ c & d \end{pmatrix}`

**3. Structure**:

- **Headings**: `#`, `##`, `###` (H1, H2, H3)
- **Lists**:
  - Bullet: `- item`
  - Ordered: `1. item`
- **Table**: Inserts table template
- **Horizontal Rule**: `---`
- **Image**:
  - Upload button (opens file picker)
  - Inserts `![](url)` after upload

#### Image Upload

**Process**:

1. User clicks image upload button
2. File picker opens (accepts JPEG, PNG, GIF, SVG)
3. Validates file type and size (<5MB)
4. Uploads to Supabase Storage (`exercise-images` bucket)
5. Generates unique filename: `{timestamp}-{uuid}.{ext}`
6. Retrieves public URL
7. Inserts markdown at cursor: `![Description](publicUrl)`
8. Shows toast notification (success or error)

**Validation**:

```typescript
function validateImageFile(file: File): string | null {
	const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
	if (!validTypes.includes(file.type)) {
		return 'Le fichier doit être une image (JPEG, PNG, GIF, SVG)';
	}

	const maxSize = 5 * 1024 * 1024; // 5MB
	if (file.size > maxSize) {
		return "L'image ne doit pas dépasser 5 Mo";
	}

	return null; // Valid
}
```

#### Keyboard Shortcuts

- **Ctrl/Cmd + B**: Bold
- **Ctrl/Cmd + I**: Italic
- **Ctrl/Cmd + K**: Inline code
- **Tab**: Indent (in lists)
- **Shift + Tab**: Outdent (in lists)

#### Features

- **Syntax Highlighting**: None (plain textarea for simplicity)
- **Auto-indentation**: Preserves indentation on Enter
- **Undo/Redo**: Native browser support
- **Mobile Support**: Responsive toolbar, collapsible sections
- **Accessibility**: ARIA labels, keyboard navigation

---

### ExerciseParameterizationEditor

Variable editor for creating parameterized exercises.

**Location**: `/src/lib/components/exercises/ExerciseParameterizationEditor.svelte`

#### Props

```typescript
interface Props {
	/** Variable definitions */
	variables?: Variable[]; // $bindable

	/** Distribution mode */
	distributionMode?: DistributionMode; // $bindable

	/** Whether editor is in read-only mode */
	readonly?: boolean;

	/** Additional CSS classes */
	class?: string;
}
```

#### Events

None (uses `$bindable` for two-way binding).

#### Usage

```svelte
<script lang="ts">
	import ExerciseParameterizationEditor from '$lib/components/exercises/ExerciseParameterizationEditor.svelte';
	import type { Variable, DistributionMode } from '$lib/exercises/types';

	let variables = $state<Variable[]>([
		{ name: 'a', expression: '{{1..10}}' },
		{ name: 'b', expression: '{{1..10}}' },
		{ name: 'sum', expression: '{{eval:a+b}}' }
	]);

	let distributionMode = $state<DistributionMode>('per_student');
</script>

<ExerciseParameterizationEditor bind:variables bind:distributionMode />
```

#### Features

**1. Variable List**:

- Add/remove variables
- Drag-and-drop reordering (order matters for dependencies)
- Real-time validation
- Circular dependency detection

**2. Variable Fields**:

- **Name**: Variable identifier (alphanumeric + underscore)
- **Expression**: Parameterization syntax
  - Random: `{{1..20}}`, `{{0..1:0.1}}`
  - Reference: `{{varName}}`
  - Exclusion: `{{1..20!5,7}}`
  - Evaluation: `{{eval:a+b}}`

**3. Distribution Mode Selector**:

- **On Demand**: New instance each time (practice mode)
- **Per Student**: Unique instance per student (homework)
- **Per Group**: Shared instance (class work)

**4. Syntax Helpers**:

- Quick-insert buttons for common patterns
- Syntax reference tooltip
- Example values preview

**5. Validation**:

- Real-time syntax validation
- Dependency graph visualization
- Error messages in French

#### Validation Rules

```typescript
// Variable name validation
const validName = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
if (!validName.test(variable.name)) {
	errors.push('Nom invalide: lettres, chiffres et underscore seulement');
}

// Expression validation
const result = validateExpression(variable.expression);
if (!result.valid) {
	errors.push(result.error);
}

// Circular dependency check
const graph = buildDependencyGraph(variables);
const cycles = detectCycles(graph);
if (cycles.length > 0) {
	errors.push(`Dépendance circulaire: ${cycles.join(' → ')}`);
}
```

---

### ExerciseMarkdownPreview

Live preview component with instance regeneration for parameterized exercises.

**Location**: `/src/lib/components/exercises/ExerciseMarkdownPreview.svelte`

#### Props

```typescript
interface Props {
	/** Markdown content to preview */
	markdown: string;

	/** Variables for parameterization (optional) */
	variables?: Variable[];

	/** Distribution mode */
	distributionMode?: DistributionMode;

	/** Whether to show regenerate button (for on_demand mode) */
	showRegenerate?: boolean;

	/** Additional CSS classes */
	class?: string;
}
```

#### Usage

```svelte
<script lang="ts">
	import ExerciseMarkdownPreview from '$lib/components/exercises/ExerciseMarkdownPreview.svelte';

	let markdown = $state('Calculate {{a}} + {{b}} = {{eval:a+b}}');
	let variables = $state([
		{ name: 'a', expression: '{{1..10}}' },
		{ name: 'b', expression: '{{1..10}}' }
	]);
</script>

<ExerciseMarkdownPreview
	{markdown}
	{variables}
	distributionMode="on_demand"
	showRegenerate={true}
/>
```

#### Features

- **Auto-refresh**: Updates when markdown or variables change
- **Regenerate Button**: Generates new instance (for `on_demand` mode)
- **Seed Display**: Shows current seed (for debugging)
- **Error Display**: Shows validation errors if instance generation fails
- **Resolved Values**: Shows current variable values

---

## Form Components

### ExerciseForm

Complete form for creating or editing exercises.

**Location**: `/src/lib/components/exercises/ExerciseForm.svelte`

#### Props

```typescript
interface Props {
	/** Exercise to edit (undefined for create mode) */
	exercise?: Exercise;

	/** Form mode */
	mode: 'create' | 'edit';

	/** Supabase client */
	supabase: SupabaseClient;

	/** Current user ID */
	userId: string;

	/** Submit handler */
	onSubmit?: (exercise: ExerciseCreate | ExerciseUpdate) => Promise<void>;

	/** Cancel handler */
	onCancel?: () => void;
}
```

#### Usage

```svelte
<script lang="ts">
	import ExerciseForm from '$lib/components/exercises/ExerciseForm.svelte';
	import { goto } from '$app/navigation';

	async function handleSubmit(exercise: ExerciseCreate) {
		const { data, error } = await data.supabase
			.from('exercises')
			.insert(exercise)
			.select()
			.single();

		if (error) {
			toaster.error('Erreur lors de la création');
			return;
		}

		toaster.success('Exercice créé avec succès');
		goto(`/dashboard/teacher/exercises/${data.id}`);
	}
</script>

<ExerciseForm
	mode="create"
	supabase={data.supabase}
	userId={data.user.id}
	onSubmit={handleSubmit}
	onCancel={() => goto('/dashboard/teacher/exercises')}
/>
```

#### Form Sections

**1. Metadata**:

- Title (optional, max 200 chars)
- Source (optional, e.g., "Livre Sésamath 3ème, p. 42")
- Difficulty (required, 1-3)
- Tags (multi-select with autocomplete)
- Grade Levels (multi-select: 6, 5, 4, 3, 2, 1, T, SPE_1, SPE_2, etc.)
- Topic (select from predefined list)
- Estimated Time (minutes)

**2. Content**:

- Statement (required, markdown + LaTeX)
- Solution (required, markdown + LaTeX)
- Uses `ExerciseMarkdownEditor` with live preview

**3. Parameterization** (optional):

- Variables (array of `{ name, expression }`)
- Distribution Mode (on_demand, per_student, per_group)
- Uses `ExerciseParameterizationEditor`

**4. Sharing**:

- Is Public (checkbox, makes exercise visible in public library)

**5. Actions**:

- Save button (validates and submits)
- Cancel button (navigates back)
- Preview button (opens modal with `ExerciseDisplay`)

#### Validation

**Client-Side**:

```typescript
function validateForm(data: ExerciseCreate): ValidationResult {
	const errors: string[] = [];

	if (!data.statement_md || data.statement_md.trim() === '') {
		errors.push("L'énoncé est requis");
	}

	if (!data.solution_md || data.solution_md.trim() === '') {
		errors.push('La solution est requise');
	}

	if (!data.difficulty || !['1', '2', '3'].includes(data.difficulty)) {
		errors.push('La difficulté doit être 1, 2 ou 3');
	}

	if (data.variables && data.variables.length > 0) {
		const varValidation = validateVariables(data.variables);
		if (!varValidation.valid) {
			errors.push(...varValidation.errors);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
```

**Server-Side**: Uses Zod schemas (validation happens in API routes).

---

## Import/Export Components

### ExportDialog

Modal dialog for exporting exercises to JSON or Markdown format.

**Location**: `/src/lib/components/exercises/ExportDialog.svelte`

#### Props

```typescript
interface Props {
	/** Whether dialog is open */
	open?: boolean; // $bindable

	/** Exercise(s) to export */
	exercises: Exercise | Exercise[];

	/** Export format */
	format?: 'json' | 'markdown'; // $bindable

	/** Whether to include solutions */
	includeSolution?: boolean; // $bindable

	/** Export handler */
	onExport?: (format: 'json' | 'markdown', options: ExportOptions) => Promise<void>;
}
```

#### Usage

```svelte
<script lang="ts">
	import ExportDialog from '$lib/components/exercises/ExportDialog.svelte';
	import { exportExercises } from '$lib/exercises/services/export-service';

	let showDialog = $state(false);
	let selectedExercises = $state<Exercise[]>([
		/* ... */
	]);

	async function handleExport(format: 'json' | 'markdown', options: ExportOptions) {
		const blob = await exportExercises(selectedExercises, format, options);

		// Trigger download
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `exercises-${Date.now()}.${format === 'json' ? 'json' : 'md'}`;
		a.click();
		URL.revokeObjectURL(url);

		toaster.success('Export réussi');
		showDialog = false;
	}
</script>

<button onclick={() => (showDialog = true)}> Exporter les exercices </button>

<ExportDialog bind:open={showDialog} exercises={selectedExercises} onExport={handleExport} />
```

#### Features

- **Format Selector**: JSON or Markdown
- **Options**:
  - Include Solution (checkbox)
  - Pretty Print JSON (checkbox, JSON only)
- **Preview**: Shows first 10 lines of export
- **Download Button**: Triggers file download
- **Bulk Export**: Handles single or multiple exercises

---

### ImportDialog

Modal dialog for importing exercises from JSON or Markdown files.

**Location**: `/src/lib/components/exercises/ImportDialog.svelte`

#### Props

```typescript
interface Props {
	/** Whether dialog is open */
	open?: boolean; // $bindable

	/** Duplicate handling strategy */
	duplicateStrategy?: 'skip' | 'replace' | 'create-copy'; // $bindable

	/** Supabase client */
	supabase: SupabaseClient;

	/** Current user ID */
	userId: string;

	/** Import success handler */
	onSuccess?: (result: ImportResult) => void;
}
```

#### Usage

```svelte
<script lang="ts">
	import ImportDialog from '$lib/components/exercises/ImportDialog.svelte';
	import { goto, invalidateAll } from '$app/navigation';

	let showDialog = $state(false);

	function handleSuccess(result: ImportResult) {
		toaster.success(`${result.imported} exercice(s) importé(s)`);
		if (result.skipped > 0) {
			toaster.info(`${result.skipped} exercice(s) ignoré(s) (doublons)`);
		}
		if (result.failed > 0) {
			toaster.error(`${result.failed} exercice(s) échoué(s)`);
		}

		showDialog = false;
		invalidateAll(); // Refresh exercise list
	}
</script>

<button onclick={() => (showDialog = true)}> Importer des exercices </button>

<ImportDialog
	bind:open={showDialog}
	supabase={data.supabase}
	userId={data.user.id}
	onSuccess={handleSuccess}
/>
```

#### Features

**1. File Upload**:

- Drag-and-drop zone
- File picker button
- Accepts `.json` and `.md` files
- Multiple file support

**2. Duplicate Handling**:

- **Skip**: Don't import duplicates
- **Replace**: Update existing exercise (requires ownership)
- **Create Copy**: Import with "(copie)" suffix

**3. Validation**:

- File format validation
- Content structure validation
- Shows validation errors before import

**4. Preview**:

- Shows parsed exercises
- Indicates which are duplicates
- Shows validation status

**5. Progress**:

- Progress bar during import
- Real-time status updates
- Final summary (imported, skipped, failed)

#### Import Process

```typescript
async function handleImport(files: File[], strategy: 'skip' | 'replace' | 'create-copy') {
	const results: ImportResult[] = [];

	for (const file of files) {
		// 1. Read file
		const content = await file.text();

		// 2. Parse based on format
		const exercises = file.name.endsWith('.json')
			? parseJsonImport(content)
			: parseMarkdownImport(content);

		// 3. Validate exercises
		for (const exercise of exercises) {
			const validation = validateExercise(exercise);
			if (!validation.valid) {
				results.push({ success: false, error: validation.errors.join(', ') });
				continue;
			}

			// 4. Check for duplicates
			const hash = createContentHash(exercise.title, exercise.statement_md);
			const duplicate = await findDuplicate(hash);

			if (duplicate) {
				if (strategy === 'skip') {
					results.push({ success: false, skipped: true });
					continue;
				} else if (strategy === 'replace') {
					await updateExercise(duplicate.id, exercise);
					results.push({ success: true, replaced: true });
					continue;
				} else if (strategy === 'create-copy') {
					exercise.title = generateCopyTitle(exercise.title);
				}
			}

			// 5. Import exercise
			const { data, error } = await supabase
				.from('exercises')
				.insert({ ...exercise, created_by: userId })
				.select()
				.single();

			if (error) {
				results.push({ success: false, error: error.message });
			} else {
				results.push({ success: true, id: data.id });
			}
		}
	}

	return results;
}
```

---

## Utility Components

### ExerciseCard

Compact card view for exercise list.

**Props**:

```typescript
interface Props {
	exercise: Exercise;
	onClick?: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
}
```

**Features**:

- Shows title, difficulty, tags, grade levels
- Quick action buttons (view, edit, delete)
- Parameterization indicator badge
- Public indicator badge

---

### ExerciseListItem

Row view for exercise table.

**Props**:

```typescript
interface Props {
	exercise: Exercise;
	selected?: boolean;
	onSelect?: (selected: boolean) => void;
}
```

**Features**:

- Checkbox for bulk selection
- Sortable columns (title, difficulty, created date)
- Expandable preview
- Quick actions dropdown

---

### DifficultyBadge

Visual indicator for exercise difficulty.

**Props**:

```typescript
interface Props {
	difficulty: 1 | 2 | 3;
	size?: 'sm' | 'md' | 'lg';
}
```

**Rendering**:

- Difficulty 1: Green, "Facile"
- Difficulty 2: Orange, "Moyen"
- Difficulty 3: Red, "Difficile"

---

### DistributionModeBadge

Visual indicator for distribution mode.

**Props**:

```typescript
interface Props {
	mode: DistributionMode;
	size?: 'sm' | 'md' | 'lg';
}
```

**Rendering**:

- `on_demand`: Blue, "À la demande"
- `per_student`: Purple, "Par élève"
- `per_group`: Green, "Par groupe"

---

## Best Practices

### Component Usage

**1. Always Provide Required Props**:

```svelte
<!-- ❌ Bad: Missing required props -->
<ExerciseDisplay exercise={undefined} />

<!-- ✅ Good: All required props provided -->
<ExerciseDisplay exercise={myExercise} mode="instance" userId={data.user.id} />
```

**2. Use Bindable Props Correctly**:

```svelte
<!-- ❌ Bad: Not binding when component expects $bindable -->
<ExerciseMarkdownEditor value={markdown} />

<!-- ✅ Good: Using bind: directive -->
<ExerciseMarkdownEditor bind:value={markdown} />
```

**3. Handle Loading States**:

```svelte
{#if loading}
	<div class="animate-pulse">Loading...</div>
{:else if exercise}
	<ExerciseDisplay {exercise} mode="instance" />
{:else}
	<p>No exercise found</p>
{/if}
```

**4. Validate Before Submission**:

```svelte
<script>
	async function handleSubmit() {
		const validation = validateForm(formData);
		if (!validation.valid) {
			toaster.error(validation.errors[0]);
			return;
		}

		// Proceed with submission
		await onSubmit(formData);
	}
</script>
```

### Performance Tips

**1. Lazy Load Images**:

```svelte
<img src={imageUrl} loading="lazy" alt="..." />
```

**2. Debounce Live Preview**:

```typescript
let markdown = $state('');
let debouncedMarkdown = $state('');

$effect(() => {
	const timer = setTimeout(() => {
		debouncedMarkdown = markdown;
	}, 300);

	return () => clearTimeout(timer);
});
```

**3. Use `parseAST: false` When Not Needed**:

```svelte
<!-- For simple display without advanced formatting -->
<ExerciseDisplay {exercise} parseAST={false} />
```

---

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **ARIA Labels**: Descriptive labels for screen readers
- **Focus Management**: Logical focus order, visible focus indicators
- **Color Contrast**: 4.5:1 minimum contrast ratio
- **Semantic HTML**: Proper heading hierarchy, landmark regions

**Example**:

```svelte
<button
	onclick={handleClick}
	aria-label="Exporter les exercices sélectionnés"
	class="focus:ring-2 focus:ring-primary focus:outline-none"
>
	<span aria-hidden="true">📥</span> Exporter
</button>
```

---

## Summary

The Exercise Feature provides **7 main components** plus several utility components:

**Core Components**:

- `ExerciseDisplay` - Render exercises with parameterization support
- `ExerciseMarkdownEditor` - Full-featured markdown editor
- `ExerciseMarkdownPreview` - Live preview with instance generation
- `ExerciseParameterizationEditor` - Variable management UI
- `ExerciseForm` - Complete create/edit form

**Dialog Components**:

- `ExportDialog` - Export to JSON/Markdown
- `ImportDialog` - Import with duplicate handling

All components are:

- ✅ TypeScript-first with full type safety
- ✅ Svelte 5 runes syntax (`$state`, `$derived`, `$props`)
- ✅ Fully accessible (WCAG 2.1 AA)
- ✅ Theme-aware (light/dark mode)
- ✅ Mobile-responsive
- ✅ Production-tested

**Next Steps**: See [API Documentation](./api.md) for backend endpoints.
