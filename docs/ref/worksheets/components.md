# Worksheets UI Components

Svelte components for the worksheets system.

**Location:** `src/lib/components/worksheets/`

---

## Component Overview

| Component                        | Purpose                            |
| -------------------------------- | ---------------------------------- |
| `PdfPreview.svelte`              | PDF generation and preview         |
| `ExerciseList.svelte`            | Exercise management with drag-drop |
| `SectionManager.svelte`          | Section CRUD operations            |
| `ExerciseSelector.svelte`        | Search and add exercises           |
| `ExerciseConfigModal.svelte`     | Configure exercise variants        |
| `ExercisePreview.svelte`         | Preview exercise content           |
| `VariantPreview.svelte`          | Compare variant outputs            |
| `MetadataCards.svelte`           | Display worksheet metadata         |
| `TemplateSelector.svelte`        | Choose PDF template                |
| `TypstEditor.svelte`             | Edit Typst templates               |
| `CorrectionManager.svelte`       | Manage correction release          |
| `CorrectionSettings.svelte`      | Configure correction settings      |
| `WorksheetAssignmentForm.svelte` | Assign worksheet to class          |

---

## PdfPreview.svelte

Main PDF generation interface with single and batch modes.

### Props

```typescript
interface Props {
	worksheet: WorksheetWithRelations; // Worksheet with exercises
	classId?: string; // Optional class for batch
	students?: Array<{
		// Students for batch generation
		id: string;
		first_name: string | null;
		last_name: string | null;
	}>;
}
```

### State

```typescript
let typst = $state<TypstCompiler | null>(null);
let isTypstLoading = $state(true);
let mode = $state<'worksheet' | 'correction'>('worksheet');
let selectedStudentId = $state<string | null>(null);
let pdfUrl = $state<string | null>(null);
let svgContent = $state<string>('');

// Batch state
let isBatchGenerating = $state(false);
let batchProgress = $state(0);
let batchTotal = $state(0);
```

### Features

- **Single Preview**: Generate PDF for one student or generic preview
- **Batch Generation**: Generate ZIP with PDFs for all students
- **Mode Toggle**: Switch between worksheet and correction modes
- **SVG Preview**: Live preview without full PDF compilation
- **Download/Print**: Direct download or print dialog

### Usage

```svelte
<PdfPreview worksheet={worksheetWithExercises} classId="class-uuid" students={classStudents} />
```

---

## ExerciseList.svelte

Manages exercises with drag-and-drop reordering.

### Props

```typescript
interface Props {
	worksheetId: string;
	exercises: WorksheetExerciseWithExercise[];
	sections: WorksheetSectionRow[];
	readonly?: boolean;
	onUpdate?: () => void;
}
```

### Features

- **Drag and Drop**: Reorder exercises within and between sections
- **Points Display**: Show point allocation per exercise
- **Variant Badges**: Visual indicator of variant mode
- **Edit Modal**: Configure exercise settings inline
- **Delete**: Remove exercise with confirmation

### Events

- `update`: Fired after reorder or configuration change

### Usage

```svelte
<ExerciseList
	worksheetId={worksheet.id}
	exercises={worksheet.exercises}
	sections={worksheet.sections}
	onUpdate={refreshWorksheet}
/>
```

---

## SectionManager.svelte

CRUD operations for worksheet sections.

### Props

```typescript
interface Props {
	worksheetId: string;
	sections: WorksheetSectionRow[];
	onUpdate?: () => void;
}
```

### Features

- **Add Section**: Create new section with title and instructions
- **Edit Section**: Modify title, instructions, points
- **Reorder**: Drag sections to change order
- **Delete**: Remove section (exercises move to no-section)

---

## ExerciseSelector.svelte

Search and add exercises from the exercise bank.

### Props

```typescript
interface Props {
	worksheetId: string;
	existingExerciseIds: string[]; // Prevent duplicates
	onAdd?: (exerciseId: string) => void;
}
```

### Features

- **Search**: Filter by title, tags, keywords
- **Filters**: By difficulty, grade level, subject
- **Preview**: See exercise content before adding
- **Multi-select**: Add multiple exercises at once
- **Duplicate Prevention**: Already-added exercises are marked

---

## ExerciseConfigModal.svelte

Configure variant settings for an exercise.

### Props

```typescript
interface Props {
	exercise: WorksheetExerciseWithExercise;
	open: boolean;
	onClose: () => void;
	onSave: (config: WorksheetExerciseUpdate) => void;
}
```

### Features

- **Variant Mode**: Select none/individual/n_versions/group
- **Mode Settings**: Configure n_versions count or group size
- **Parameter Overrides**: Force specific values
- **Points**: Set point allocation
- **Custom Instructions**: Add exercise-specific instructions

### Variant Mode UI

```svelte
<MySelect
	type="single"
	bind:value={variantMode}
	items={[
		{ value: 'none', label: 'Identique pour tous' },
		{ value: 'individual', label: 'Unique par eleve' },
		{ value: 'n_versions', label: 'Versions limitees (A, B, C...)' },
		{ value: 'group', label: 'Par groupes' }
	]}
/>

{#if variantMode === 'n_versions'}
	<Input type="number" bind:value={nVersions} min={2} max={50} />
{:else if variantMode === 'group'}
	<Input type="number" bind:value={groupSize} min={2} max={100} />
{/if}
```

---

## ExercisePreview.svelte

Preview exercise content with optional variable resolution.

### Props

```typescript
interface Props {
	exercise: {
		title: string;
		statement_md: string;
		solution_md: string | null;
		variables: unknown[] | null;
	};
	showSolution?: boolean;
	seed?: number; // For variant preview
}
```

### Features

- **Markdown Rendering**: Render statement and solution
- **Variable Preview**: Show resolved values
- **Math Support**: MathLive integration for equations

---

## VariantPreview.svelte

Compare exercise variants across different students.

### Props

```typescript
interface Props {
	exercise: WorksheetExerciseWithExercise;
	worksheetId: string;
	students: Array<{ id: string; name: string }>;
}
```

### Features

- **Side-by-side**: Compare multiple variants
- **Student Selection**: Choose specific students to compare
- **Parameter Display**: Show resolved parameters per variant

---

## MetadataCards.svelte

Display worksheet metadata in a card layout.

### Props

```typescript
interface Props {
	worksheet: WorksheetRow;
}
```

### Display

- Title and type with icon
- Status badge (draft/published/archived)
- Duration and total points
- Grade levels and tags
- Creation date

---

## TemplateSelector.svelte

Choose and preview PDF templates.

### Props

```typescript
interface Props {
	selectedId: string | null;
	onChange: (templateId: string) => void;
}
```

### Features

- **System Templates**: 11 built-in templates
- **Custom Templates**: User-created templates
- **Preview**: Live preview of template
- **Filter**: By worksheet type

---

## TypstEditor.svelte

Edit Typst template content.

### Props

```typescript
interface Props {
	content: string;
	onChange: (content: string) => void;
}
```

### Features

- **Syntax Highlighting**: Typst syntax highlighting
- **Live Preview**: Render preview as you type
- **Placeholder Reference**: Quick insert placeholders
- **Validation**: Check for Typst errors

---

## CorrectionManager.svelte

Manage correction release for assignments.

### Props

```typescript
interface Props {
	assignment: WorksheetAssignmentRow;
	onRelease: () => void;
}
```

### Features

- **Status Display**: Show current correction status
- **Manual Release**: Button to release corrections
- **Schedule Display**: Show scheduled release time
- **Mode Indicator**: manual/immediate/scheduled/after_due

---

## CorrectionSettings.svelte

Configure correction settings during assignment creation.

### Props

```typescript
interface Props {
  bind:mode: CorrectionReleaseMode;
  bind:releaseAt: Date | null;
  bind:showBeforeDue: boolean;
}
```

### Features

- **Mode Selection**: Choose release mode
- **Date Picker**: For scheduled release
- **Preview Toggle**: Allow solutions before due date

---

## WorksheetAssignmentForm.svelte

Complete form for assigning worksheet to class.

### Props

```typescript
interface Props {
	worksheetId: string;
	classes: Array<{ id: string; name: string }>;
	onSubmit: (data: WorksheetAssignmentInsert) => void;
}
```

### Form Fields

- Class selection
- Title override
- Instructions
- Availability dates (from/due/closes)
- Correction settings
- Late submission toggle
- Max attempts
- Time limit

---

## Common Patterns

### Loading States

```svelte
{#if isLoading}
	<div class="flex items-center justify-center py-8">
		<Loader2 class="h-8 w-8 animate-spin text-primary" />
		<span class="ml-2">Chargement...</span>
	</div>
{:else}
	<!-- Content -->
{/if}
```

### Error States

```svelte
{#if error}
	<div class="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
		<AlertCircle class="h-5 w-5 text-destructive" />
		<p class="text-destructive">{error}</p>
		<Button variant="outline" onclick={retry}>Reessayer</Button>
	</div>
{/if}
```

### Toast Notifications

```typescript
import { toaster } from '$lib/stores/toaster.svelte';

toaster.success('PDF genere avec succes');
toaster.error('Erreur lors de la generation');
```

### MySelect Usage

```svelte
<MySelect
	type="single"
	bind:value={selectedValue}
	items={[
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' }
	]}
/>
```

---

## File Structure

```
src/lib/components/worksheets/
├── PdfPreview.svelte
├── ExerciseList.svelte
├── SectionManager.svelte
├── ExerciseSelector.svelte
├── ExerciseConfigModal.svelte
├── ExercisePreview.svelte
├── VariantPreview.svelte
├── MetadataCards.svelte
├── TemplateSelector.svelte
├── TypstEditor.svelte
├── CorrectionManager.svelte
├── CorrectionSettings.svelte
└── WorksheetAssignmentForm.svelte
```

---

## Page Routes

Teacher dashboard pages using these components:

```
src/routes/(protected)/dashboard/teacher/worksheets/
├── +page.svelte           # List worksheets
├── new/+page.svelte       # Create worksheet
├── [id]/+page.svelte      # Edit worksheet (uses most components)
└── templates/
    ├── +page.svelte       # List templates
    └── [id]/+page.svelte  # Edit template
```
