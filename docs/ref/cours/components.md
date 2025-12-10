# UI Components - Cours System

Complete reference for all Svelte components used in the chapter and template systems.

---

## Table of Contents

1. [Component Overview](#component-overview)
2. [Student Components](#student-components)
3. [Teacher Components](#teacher-components)
4. [Template Components](#template-components)
5. [Shared Utilities](#shared-utilities)

---

## Component Overview

### Directory Structure

```
src/lib/components/
├── cours/                          # Chapter components
│   ├── index.ts                    # Barrel exports
│   ├── ChapterCard.svelte          # Chapter card for lists
│   ├── ChapterQuiz.svelte          # Quiz container
│   ├── QuizQuestion.svelte         # Single quiz question
│   ├── QuizSummary.svelte          # Quiz results summary
│   ├── ChecklistSection.svelte     # Checklist with progress
│   ├── DocumentCard.svelte         # Document card
│   ├── ChapterProgressIndicator.svelte  # Progress visualization
│   └── teacher/                    # Teacher-only components
│       ├── index.ts
│       ├── ChapterEditor.svelte    # Chapter create/edit form
│       ├── ChecklistEditor.svelte  # Checklist management
│       ├── StudentProgressTable.svelte  # Progress overview
│       └── DocumentUpload.svelte   # File upload
└── templates/                      # Template components
    ├── index.ts
    ├── TemplateGallery.svelte      # Template list with filters
    ├── TemplateCard.svelte         # Template preview card
    ├── TemplateEditor.svelte       # Template create/edit form
    ├── TemplateInstantiationDialog.svelte  # Instantiation modal
    ├── TemplateMigrationDialog.svelte      # Migration preview
    ├── TemplateVersionHistory.svelte       # Version timeline
    └── ChapterTemplateIndicator.svelte     # Update badge
```

---

## Student Components

### ChapterCard

Displays a chapter summary card in the student chapter list.

**Location**: `src/lib/components/cours/ChapterCard.svelte`

**Props**:

```typescript
interface Props {
	chapter: ClassChapter;
	documentCount?: number;
	quizQuestionCount?: number;
	checklistItemCount?: number;
	exerciseCount?: number;
	progress?: ChapterProgress;
}
```

**Usage**:

```svelte
<script lang="ts">
	import { ChapterCard } from '$lib/components/cours';
</script>

<ChapterCard
	{chapter}
	documentCount={3}
	quizQuestionCount={5}
	checklistItemCount={8}
	progress={studentProgress}
/>
```

**Features**:

- Chapter title and description
- Color-coded border based on `chapter.color`
- Icon display (Lucide icon)
- Content counts (docs, quiz, checklist, exercises)
- Progress indicator when progress data provided
- Link to chapter detail page

---

### ChapterQuiz

Container component for the chapter quiz experience.

**Location**: `src/lib/components/cours/ChapterQuiz.svelte`

**Props**:

```typescript
interface Props {
	questions: (ChapterQuizQuestion & {
		template?: QuestionTemplate;
		bestResult?: ChapterQuizResult | null;
		attemptsCount?: number;
	})[];
	chapterId: string;
	onAnswerSubmit?: (questionId: string, isCorrect: boolean, answer: string) => void;
}
```

**Usage**:

```svelte
<ChapterQuiz questions={quizQuestions} chapterId={chapter.id} onAnswerSubmit={handleAnswerSubmit} />
```

**Features**:

- Sequential question display
- Progress bar showing questions completed
- Tracks time spent per question
- Shows best result for previously answered questions
- Calls `onAnswerSubmit` callback for each answer

---

### QuizQuestion

Single quiz question with True/False answer options.

**Location**: `src/lib/components/cours/QuizQuestion.svelte`

**Props**:

```typescript
interface Props {
	question: ChapterQuizQuestion & { template?: QuestionTemplate };
	questionNumber: number;
	totalQuestions: number;
	previousResult?: ChapterQuizResult | null;
	onAnswer: (isCorrect: boolean, answer: string) => void;
}
```

**Usage**:

```svelte
<QuizQuestion
	question={currentQuestion}
	questionNumber={1}
	totalQuestions={5}
	{previousResult}
	onAnswer={handleAnswer}
/>
```

**Features**:

- Displays question content (with math rendering support)
- True/False buttons
- Shows explanation after answer
- Indicates if previously answered correctly
- Tracks time from display to answer

---

### QuizSummary

Summary displayed after completing a quiz.

**Location**: `src/lib/components/cours/QuizSummary.svelte`

**Props**:

```typescript
interface Props {
	totalQuestions: number;
	correctAnswers: number;
	totalPoints: number;
	maxPoints: number;
	onRetry?: () => void;
	onClose?: () => void;
}
```

**Features**:

- Score display (X/Y correct, percentage)
- Points earned
- Visual feedback (colors based on score)
- Retry and close buttons

---

### ChecklistSection

Checklist items with toggle functionality for students.

**Location**: `src/lib/components/cours/ChecklistSection.svelte`

**Props**:

```typescript
interface Props {
	items: (ChapterChecklistItem & {
		isCompleted: boolean;
		completedAt: string | null;
	})[];
	readonly?: boolean;
	onToggle?: (itemId: string, isCompleted: boolean) => void;
}
```

**Usage**:

```svelte
<ChecklistSection items={checklistItemsWithProgress} onToggle={handleChecklistToggle} />
```

**Features**:

- Uses `MyCheckbox` component (project standard)
- Shows completion timestamp
- Progress summary at top
- Optional readonly mode for teacher view

---

### DocumentCard

Card for displaying and accessing chapter documents.

**Location**: `src/lib/components/cours/DocumentCard.svelte`

**Props**:

```typescript
interface Props {
	document: ChapterDocument;
	downloadUrl?: string;
	onView?: () => void;
	onDownload?: () => void;
}
```

**Features**:

- Document title and description
- File type icon based on MIME type
- File size display
- View/Download buttons
- Thumbnail preview for images
- Google Drive indicator for external links

---

### ChapterProgressIndicator

Visual progress indicator for chapter completion.

**Location**: `src/lib/components/cours/ChapterProgressIndicator.svelte`

**Props**:

```typescript
interface Props {
	progress: ChapterProgress;
	size?: 'sm' | 'md' | 'lg';
	showLabels?: boolean;
}
```

**Features**:

- Circular or bar progress visualization
- Shows checklist and quiz progress separately
- Color-coded based on completion percentage
- Configurable size

---

## Teacher Components

### ChapterEditor

Form for creating and editing chapters.

**Location**: `src/lib/components/cours/teacher/ChapterEditor.svelte`

**Props**:

```typescript
interface Props {
	chapter?: ClassChapter;
	classId: string;
	mode: 'create' | 'edit';
	onSave?: (data: CreateChapterInput | UpdateChapterInput) => void;
	onCancel?: () => void;
}
```

**Usage**:

```svelte
<ChapterEditor {classId} mode="create" onSave={handleSave} onCancel={handleCancel} />
```

**Features**:

- Title and description inputs
- Color picker using `MySelect`
- Icon picker using `MySelect`
- Visibility toggle using `MyCheckbox`
- Form validation with error messages

---

### ChecklistEditor

Management interface for chapter checklist items.

**Location**: `src/lib/components/cours/teacher/ChecklistEditor.svelte`

**Props**:

```typescript
interface Props {
	items: ChapterChecklistItem[];
	chapterId: string;
	onAdd?: (content: string, description?: string) => void;
	onUpdate?: (itemId: string, content: string, description?: string) => void;
	onDelete?: (itemId: string) => void;
	onReorder?: (items: { id: string; displayOrder: number }[]) => void;
}
```

**Features**:

- Add new checklist items
- Inline editing
- Delete confirmation
- Drag-and-drop reordering
- Description expand/collapse

---

### StudentProgressTable

Table showing student progress across the chapter.

**Location**: `src/lib/components/cours/teacher/StudentProgressTable.svelte`

**Props**:

```typescript
interface Props {
	students: {
		id: string;
		fullName: string;
		checklistProgress: number;
		quizScore: number;
		lastActivityAt: string | null;
	}[];
	sortBy?: 'name' | 'checklist' | 'quiz' | 'lastActivity';
	sortDir?: 'asc' | 'desc';
	onSort?: (field: string) => void;
}
```

**Features**:

- Student name column
- Checklist completion percentage
- Quiz score percentage
- Last activity timestamp
- Sortable columns
- Color-coded progress cells

---

### DocumentUpload

File upload component with drag-and-drop support.

**Location**: `src/lib/components/cours/teacher/DocumentUpload.svelte`

**Props**:

```typescript
interface Props {
	chapterId: string;
	acceptedTypes?: string[];
	maxSizeBytes?: number;
	onUpload?: (file: File, metadata: { title: string; description?: string }) => void;
	onGoogleDrive?: (url: string, metadata: { title: string; description?: string }) => void;
}
```

**Features**:

- Drag-and-drop zone
- File type validation
- Size validation (default 100MB)
- Preview before upload
- Title and description inputs
- Google Drive URL input tab
- Upload progress indicator

---

## Template Components

### TemplateGallery

Gallery view with filtering for templates.

**Location**: `src/lib/components/templates/TemplateGallery.svelte`

**Props**:

```typescript
interface Props {
	templates: TemplateSummary[];
	loading?: boolean;
	filters?: {
		status?: TemplateStatus;
		grades?: string[];
		search?: string;
		ownOnly?: boolean;
	};
	onFilterChange?: (filters: typeof filters) => void;
	onSelect?: (templateId: string) => void;
}
```

**Features**:

- Grid layout of template cards
- Search by title
- Filter by status (draft/published/archived)
- Filter by grade levels
- Toggle own templates only
- Loading state
- Empty state message

---

### TemplateCard

Preview card for a single template.

**Location**: `src/lib/components/templates/TemplateCard.svelte`

**Props**:

```typescript
interface Props {
	template: TemplateSummary;
	showActions?: boolean;
	onEdit?: () => void;
	onInstantiate?: () => void;
	onDelete?: () => void;
}
```

**Features**:

- Template title and description
- Status badge (Brouillon/Publie/Archive)
- Public/Private indicator
- Grade level badges
- Content counts
- Instantiation count
- Creator name
- Color-coded border
- Action buttons (edit, instantiate, delete)

---

### TemplateEditor

Form for creating and editing templates.

**Location**: `src/lib/components/templates/TemplateEditor.svelte`

**Props**:

```typescript
interface Props {
	template?: ChapterTemplate;
	mode: 'create' | 'edit';
	onSave?: (data: CreateChapterTemplateInput | UpdateChapterTemplateInput) => void;
	onPublish?: (isPublic: boolean) => void;
	onCancel?: () => void;
}
```

**Features**:

- Title and description inputs
- Grade level multi-select using `MySelect`
- Color and icon pickers
- Content snapshot editor
- Publish button (validates content exists)
- Draft/Published status display

---

### TemplateInstantiationDialog

Modal dialog for instantiating a template into a chapter.

**Location**: `src/lib/components/templates/TemplateInstantiationDialog.svelte`

**Props**:

```typescript
interface Props {
	open: boolean;
	template: TemplateSummary | null;
	classes: { id: string; name: string }[];
	onInstantiate?: (data: InstantiateTemplateInput) => void;
	onClose?: () => void;
}
```

**Usage**:

```svelte
<TemplateInstantiationDialog
	bind:open={dialogOpen}
	template={selectedTemplate}
	classes={teacherClasses}
	onInstantiate={handleInstantiate}
/>
```

**Features**:

- Template preview (title, description, content counts)
- Class selector using `MySelect`
- Optional title override
- Visibility toggle using `MyCheckbox`
- Loading state during instantiation

---

### TemplateMigrationDialog

Preview and confirm template migration.

**Location**: `src/lib/components/templates/TemplateMigrationDialog.svelte`

**Props**:

```typescript
interface Props {
	open: boolean;
	preview: MigrationPreview | null;
	loading?: boolean;
	onMigrate?: () => void;
	onClose?: () => void;
}
```

**Features**:

- Version comparison (from -> to)
- Diff summary (added/removed/modified counts)
- Change summary text
- Detailed diff display per content type
- Confirm/Cancel buttons

---

### TemplateVersionHistory

Timeline view of template versions.

**Location**: `src/lib/components/templates/TemplateVersionHistory.svelte`

**Props**:

```typescript
interface Props {
	versions: ChapterTemplateVersion[];
	currentVersion: number;
	onViewVersion?: (versionNumber: number) => void;
	onRevertTo?: (versionNumber: number) => void;
}
```

**Features**:

- Vertical timeline layout
- Version number and creation date
- Change summary for each version
- Diff statistics badges
- View version content button
- Revert button (creates new version with old content)

---

### ChapterTemplateIndicator

Badge indicating template connection and updates.

**Location**: `src/lib/components/templates/ChapterTemplateIndicator.svelte`

**Props**:

```typescript
interface Props {
	instantiation: InstantiationWithStatus | null;
	onMigrate?: () => void;
	onDetach?: () => void;
}
```

**Usage**:

```svelte
<ChapterTemplateIndicator
	instantiation={templateInstantiation}
	onMigrate={handleMigrate}
	onDetach={handleDetach}
/>
```

**Features**:

- Template name display
- Current version badge
- Update available indicator (animated badge)
- "Migrate" button when update available
- "Detach" button to disconnect from template
- Detached state display
- Dropdown menu with actions (Svelte 5 `builders={[builder]}` pattern)

---

## Shared Utilities

### Helper Functions

```typescript
// From src/lib/types/chapters.ts
import {
	calculateProgressPercentage,
	getProgressColor,
	getChapterColorClasses,
	formatFileSize,
	getFileTypeLabel
} from '$lib/types/chapters';

// From src/lib/types/chapter-templates.ts
import {
	hasContent,
	getContentCounts,
	formatGrades,
	getStatusLabel,
	getStatusColorClasses
} from '$lib/types/chapter-templates';
```

### Color Constants

```typescript
const CHAPTER_COLORS = [
	'slate',
	'red',
	'orange',
	'amber',
	'yellow',
	'lime',
	'green',
	'emerald',
	'teal',
	'cyan',
	'sky',
	'blue',
	'indigo',
	'violet',
	'purple',
	'fuchsia',
	'pink',
	'rose'
];

const CHAPTER_ICONS = [
	'book',
	'calculator',
	'compass',
	'lightbulb',
	'target',
	'star',
	'trophy',
	'flag',
	'rocket',
	'puzzle',
	'brain',
	'chart-bar',
	'chart-line',
	'percent',
	'sigma',
	'pi',
	'square-root',
	'ruler',
	'shapes',
	'cube'
];
```

### Import Patterns

```svelte
<script lang="ts">
	// Student components
	import {
		ChapterCard,
		ChapterQuiz,
		QuizQuestion,
		QuizSummary,
		ChecklistSection,
		DocumentCard,
		ChapterProgressIndicator
	} from '$lib/components/cours';

	// Teacher components
	import {
		ChapterEditor,
		ChecklistEditor,
		StudentProgressTable,
		DocumentUpload
	} from '$lib/components/cours/teacher';

	// Template components
	import {
		TemplateGallery,
		TemplateCard,
		TemplateEditor,
		TemplateInstantiationDialog,
		TemplateMigrationDialog,
		TemplateVersionHistory,
		ChapterTemplateIndicator
	} from '$lib/components/templates';
</script>
```
