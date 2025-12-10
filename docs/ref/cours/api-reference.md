# API Reference - Cours System

Complete API documentation for chapter and template server functions, form actions, and validation schemas.

---

## Table of Contents

1. [Server Functions](#server-functions)
   - [Chapter Functions](#chapter-functions)
   - [Template Functions](#template-functions)
2. [Form Actions](#form-actions)
   - [Teacher Chapter Actions](#teacher-chapter-actions)
   - [Student Actions](#student-actions)
   - [Template Actions](#template-actions)
3. [Validation Schemas](#validation-schemas)
4. [Error Handling](#error-handling)

---

## Server Functions

### Location

- **Chapters**: `src/lib/server/chapters.ts`
- **Templates**: `src/lib/server/chapter-templates.ts`

### Return Types

```typescript
interface OperationResult<T> {
	data: T | null;
	error: Error | null;
}

interface ListResult<T> {
	data: T[];
	error: Error | null;
	count: number;
}
```

---

## Chapter Functions

### Teacher Functions - Chapters

#### `getTeacherChapters`

Get all chapters for a teacher, optionally filtered by class.

```typescript
async function getTeacherChapters(
	teacherId: string,
	supabase: SupabaseClient<Database>,
	classId?: string
): Promise<ListResult<ChapterSummary>>;
```

**Returns**: Chapters with content counts (`documentCount`, `quizQuestionCount`, `checklistItemCount`, `exerciseCount`)

---

#### `createChapter`

Create a new chapter.

```typescript
async function createChapter(
	data: CreateChapterInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ClassChapter>>;
```

**Input Schema**:

```typescript
const createChapterSchema = z.object({
	classId: uuidSchema,
	title: z.string().trim().min(1).max(200),
	description: z.string().trim().max(2000).optional().nullable(),
	displayOrder: z.number().int().min(0).max(1000).optional(),
	isVisible: z.boolean().default(true),
	color: chapterColorSchema.optional().nullable(),
	icon: chapterIconSchema.optional().nullable()
});
```

---

#### `updateChapter`

Update an existing chapter.

```typescript
async function updateChapter(
	chapterId: string,
	data: UpdateChapterInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ClassChapter>>;
```

---

#### `deleteChapter`

Delete a chapter. Documents are moved to orphaned storage via trigger.

```typescript
async function deleteChapter(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }>;
```

---

#### `reorderChapters`

Reorder chapters within a class.

```typescript
async function reorderChapters(
	classId: string,
	orderUpdates: OrderUpdate[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }>;
```

---

### Teacher Functions - Documents

#### `addChapterDocument`

Add a document to a chapter (upload or Google Drive).

```typescript
async function addChapterDocument(
	chapterId: string,
	data: CreateDocumentInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterDocument>>;
```

**Input Schema** (discriminated union):

```typescript
const createDocumentSchema = z.discriminatedUnion('sourceType', [
	// Upload
	z.object({
		sourceType: z.literal('upload'),
		chapterId: uuidSchema,
		title: z.string().trim().min(1).max(200),
		description: z.string().trim().max(1000).optional().nullable(),
		storagePath: z.string().min(1),
		fileName: z.string().min(1).max(500),
		mimeType: z.string().min(1).max(100),
		fileSize: z
			.number()
			.int()
			.min(1)
			.max(100 * 1024 * 1024),
		displayOrder: displayOrderSchema.optional()
	}),
	// Google Drive
	z.object({
		sourceType: z.literal('google_drive'),
		chapterId: uuidSchema,
		title: z.string().trim().min(1).max(200),
		description: z.string().trim().max(1000).optional().nullable(),
		googleFileId: z.string().min(1),
		googleDriveUrl: z.string().url(),
		fileName: z.string().max(500).optional().nullable(),
		mimeType: z.string().max(100).optional().nullable(),
		thumbnailUrl: z.string().url().optional().nullable(),
		displayOrder: displayOrderSchema.optional()
	})
]);
```

---

#### `updateChapterDocument` / `deleteChapterDocument` / `reorderDocuments`

Standard CRUD operations for documents.

---

### Teacher Functions - Quiz

#### `addQuizQuestion`

Link a question template to a chapter quiz.

```typescript
async function addQuizQuestion(
	chapterId: string,
	questionTemplateId: string,
	supabase: SupabaseClient<Database>,
	displayOrder?: number
): Promise<OperationResult<ChapterQuizQuestion>>;
```

---

#### `removeQuizQuestion` / `reorderQuizQuestions`

Remove or reorder quiz questions.

---

### Teacher Functions - Checklist

#### `addChecklistItem`

Add a checklist item for student self-assessment.

```typescript
async function addChecklistItem(
	chapterId: string,
	data: CreateChecklistItemInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterChecklistItem>>;
```

**Input Schema**:

```typescript
const createChecklistItemSchema = z.object({
	chapterId: uuidSchema,
	content: z.string().trim().min(1).max(500),
	description: z.string().trim().max(1000).optional().nullable(),
	displayOrder: displayOrderSchema.optional()
});
```

---

#### `updateChecklistItem` / `deleteChecklistItem` / `reorderChecklistItems`

Standard CRUD operations for checklist items.

---

### Teacher Functions - Exercises

#### `linkExercise`

Link an existing exercise to a chapter.

```typescript
async function linkExercise(
	chapterId: string,
	exerciseId: string,
	supabase: SupabaseClient<Database>,
	displayOrder?: number
): Promise<OperationResult<ChapterExercise>>;
```

---

#### `unlinkExercise` / `reorderExercises`

Remove or reorder exercise links.

---

### Teacher Functions - Progress Tracking

#### `getStudentChecklistProgress`

Get checklist progress for all students (or specific student).

```typescript
async function getStudentChecklistProgress(
	chapterId: string,
	supabase: SupabaseClient<Database>,
	studentId?: string
): Promise<
	ListResult<{
		studentId: string;
		items: (ChapterChecklistItem & {
			isCompleted: boolean;
			completedAt: string | null;
		})[];
	}>
>;
```

---

#### `getChapterQuizResults`

Get quiz results grouped by student.

```typescript
async function getChapterQuizResults(
	chapterId: string,
	supabase: SupabaseClient<Database>,
	studentId?: string
): Promise<
	ListResult<{
		studentId: string;
		results: ChapterQuizResult[];
		totalCorrect: number;
		totalAttempted: number;
	}>
>;
```

---

### Student Functions

#### `getStudentChapters`

Get visible chapters for a student.

```typescript
async function getStudentChapters(
	studentId: string,
	supabase: SupabaseClient<Database>,
	classId?: string
): Promise<ListResult<ClassChapter>>;
```

---

#### `getChapterWithContent`

Get chapter with full content and student progress.

```typescript
async function getChapterWithContent(
	chapterId: string,
	studentId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<StudentChapterView>>;
```

**Returns**:

```typescript
interface StudentChapterView extends ChapterWithContent {
	progress: ChapterProgress;
	checklistItemsWithProgress: (ChapterChecklistItem & {
		isCompleted: boolean;
		completedAt: string | null;
	})[];
	quizQuestionsWithResults: (ChapterQuizQuestion & {
		bestResult: ChapterQuizResult | null;
		attemptsCount: number;
	})[];
}
```

---

#### `submitQuizAnswer`

Submit a quiz answer. **Integrates with SRS** if question is in student's deck.

```typescript
async function submitQuizAnswer(
	studentId: string,
	quizQuestionId: string,
	isCorrect: boolean,
	timeSpentSeconds: number,
	supabase: SupabaseClient<Database>,
	submittedAnswer: string = ''
): Promise<OperationResult<ChapterQuizResult>>;
```

**SRS Integration**: If the `questionTemplateId` exists in the student's `srs_card_stats`, the function updates the card using FSRS algorithm:

- Correct answer: `Grade.GOOD` (3)
- Incorrect answer: `Grade.AGAIN` (1)

---

#### `toggleChecklistItem`

Toggle a checklist item completion status.

```typescript
async function toggleChecklistItem(
	studentId: string,
	checklistItemId: string,
	isCompleted: boolean,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<StudentChecklistProgress>>;
```

---

## Template Functions

### CRUD Operations

#### `createChapterTemplate`

Create a new template from scratch.

```typescript
async function createChapterTemplate(
	input: CreateChapterTemplateInput,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>>;
```

**Input Schema**:

```typescript
const createChapterTemplateSchema = z.object({
	title: z.string().trim().min(1).max(200),
	description: z.string().trim().max(2000).optional().nullable(),
	grades: gradesArraySchema.default([]), // ['6', '5', '4', '3', '2', '1', 'T']
	color: chapterColorSchema.optional().nullable(),
	icon: chapterIconSchema.optional().nullable(),
	contentSnapshot: templateContentSnapshotSchema.optional()
});
```

---

#### `createTemplateFromChapter`

Create a template from an existing chapter.

```typescript
async function createTemplateFromChapter(
	input: CreateTemplateFromChapterInput,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>>;
```

---

#### `getChapterTemplate` / `updateChapterTemplate` / `deleteChapterTemplate`

Standard CRUD operations. Note: `deleteChapterTemplate` archives instead of hard deleting.

---

#### `listChapterTemplates`

List templates with filters and pagination.

```typescript
async function listChapterTemplates(
	query: ListTemplatesQuery,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<ListResult<TemplateSummary>>;
```

**Query Schema**:

```typescript
const listTemplatesQuerySchema = paginationSchema.extend({
	status: z.enum(['draft', 'published', 'archived']).optional(),
	grades: z.string().optional(), // comma-separated
	search: z.string().max(100).optional(),
	ownOnly: z.string().transform((v) => v === 'true'),
	publicOnly: z.string().transform((v) => v === 'true'),
	sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'instantiationCount']).optional(),
	sortDir: z.enum(['asc', 'desc']).optional()
});
```

---

### Publishing Operations

#### `publishTemplate`

Publish a template (validates content exists).

```typescript
async function publishTemplate(
	templateId: string,
	isPublic: boolean,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>>;
```

---

#### `archiveTemplate`

Archive a template.

```typescript
async function archiveTemplate(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>>;
```

---

### Version Operations

#### `createTemplateVersion`

Create a new version with computed diff.

```typescript
async function createTemplateVersion(
	templateId: string,
	contentSnapshot: TemplateContentSnapshot,
	changeSummary: string | null,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplateVersion>>;
```

---

#### `getTemplateVersions` / `getTemplateVersion`

Get version history or specific version.

---

#### `computeDiff`

Compute diff between two content snapshots.

```typescript
function computeDiff(
	oldSnapshot: TemplateContentSnapshot,
	newSnapshot: TemplateContentSnapshot
): TemplateDiff;
```

**Returns**:

```typescript
interface TemplateDiff {
	documents: DiffEntry<TemplateDocumentSnapshot>[];
	quizQuestions: DiffEntry<TemplateQuizQuestionSnapshot>[];
	checklistItems: DiffEntry<TemplateChecklistItemSnapshot>[];
	exercises: DiffEntry<TemplateExerciseSnapshot>[];
	stats: {
		documentsAdded: number;
		documentsRemoved: number;
		documentsModified: number;
		// ... same for other content types
	};
}
```

---

### Instantiation Operations

#### `instantiateTemplate`

Create a chapter from a template.

```typescript
async function instantiateTemplate(
	input: InstantiateTemplateInput,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<
	OperationResult<{
		chapterId: string;
		instantiation: ChapterTemplateInstantiation;
	}>
>;
```

**Input Schema**:

```typescript
const instantiateTemplateSchema = z.object({
	templateId: uuidSchema,
	classId: uuidSchema,
	title: z.string().trim().min(1).max(200).optional(),
	isVisible: z.boolean().default(false)
});
```

---

### Migration Operations

#### `checkForTemplateUpdates`

Check if a chapter's template has updates.

```typescript
async function checkForTemplateUpdates(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<
	OperationResult<{
		hasUpdate: boolean;
		latestVersion: number | null;
	}>
>;
```

---

#### `getMigrationPreview`

Get preview of what will change during migration.

```typescript
async function getMigrationPreview(
	chapterId: string,
	targetVersion: number | undefined,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<MigrationPreview>>;
```

---

#### `migrateChapterToVersion`

Migrate a chapter to a new template version.

```typescript
async function migrateChapterToVersion(
	chapterId: string,
	targetVersion: number,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }>;
```

**Process**:

1. Clear existing chapter content
2. Apply new version's content snapshot
3. Update instantiation record

---

#### `detachChapterFromTemplate`

Detach a chapter from its template (no more updates).

```typescript
async function detachChapterFromTemplate(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }>;
```

---

## Form Actions

### Teacher Chapter Actions

**Location**: `src/routes/(protected)/dashboard/teacher/cours/[classId]/+page.server.ts`

| Action                    | Description                  |
| ------------------------- | ---------------------------- |
| `create`                  | Create new chapter           |
| `update`                  | Update chapter metadata      |
| `delete`                  | Delete chapter               |
| `reorder`                 | Reorder chapters             |
| `toggleVisibility`        | Toggle chapter visibility    |
| `instantiateFromTemplate` | Create chapter from template |

**Location**: `src/routes/(protected)/dashboard/teacher/cours/[classId]/[chapterId]/+page.server.ts`

| Action                   | Description                 |
| ------------------------ | --------------------------- |
| `addChecklistItem`       | Add checklist item          |
| `updateChecklistItem`    | Update checklist item       |
| `deleteChecklistItem`    | Delete checklist item       |
| `reorderChecklistItems`  | Reorder checklist items     |
| `addQuizQuestion`        | Add quiz question           |
| `removeQuizQuestion`     | Remove quiz question        |
| `reorderQuizQuestions`   | Reorder quiz questions      |
| `linkExercise`           | Link exercise               |
| `unlinkExercise`         | Unlink exercise             |
| `uploadDocument`         | Upload document             |
| `addGoogleDriveDocument` | Add Google Drive link       |
| `deleteDocument`         | Delete document             |
| `migrateToVersion`       | Migrate to template version |
| `detachFromTemplate`     | Detach from template        |

---

### Student Actions

**Location**: `src/routes/(protected)/dashboard/student/cours/[chapterId]/+page.server.ts`

| Action             | Description           |
| ------------------ | --------------------- |
| `submitQuizAnswer` | Submit quiz answer    |
| `toggleChecklist`  | Toggle checklist item |

---

### Template Actions

**Location**: `src/routes/(protected)/dashboard/teacher/templates/+page.server.ts`

| Action   | Description      |
| -------- | ---------------- |
| `delete` | Archive template |

**Location**: `src/routes/(protected)/dashboard/teacher/templates/new/+page.server.ts`

| Action              | Description         |
| ------------------- | ------------------- |
| `create`            | Create template     |
| `createFromChapter` | Create from chapter |

**Location**: `src/routes/(protected)/dashboard/teacher/templates/[templateId]/+page.server.ts`

| Action    | Description      |
| --------- | ---------------- |
| `update`  | Update template  |
| `publish` | Publish template |
| `archive` | Archive template |

---

## Validation Schemas

### Common Schemas

```typescript
// Display order (0-1000)
const displayOrderSchema = z.number().int().min(0).max(1000);

// Chapter icons (Lucide names)
const chapterIconSchema = z.enum([
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
]);

// Chapter colors (Tailwind names)
const chapterColorSchema = z.enum([
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
]);

// Grade levels (French system)
const gradeLevelSchema = z.enum(['6', '5', '4', '3', '2', '1', 'T']);
```

### Content Snapshot Schema

```typescript
const templateContentSnapshotSchema = z.object({
	documents: z
		.array(
			z.object({
				title: z.string().trim().min(1).max(200),
				description: z.string().trim().max(1000).nullable(),
				documentUrl: z.string().url(),
				sourceType: z.enum(['external_url', 'google_drive']),
				mimeType: z.string().max(100).nullable(),
				displayOrder: displayOrderSchema
			})
		)
		.max(50),

	quizQuestions: z
		.array(
			z.object({
				questionTemplateId: uuidSchema,
				pointsOverride: z.number().int().min(0).max(100).nullable(),
				displayOrder: displayOrderSchema
			})
		)
		.max(100),

	checklistItems: z
		.array(
			z.object({
				content: z.string().trim().min(1).max(500),
				description: z.string().trim().max(1000).nullable(),
				displayOrder: displayOrderSchema
			})
		)
		.max(50),

	exercises: z
		.array(
			z.object({
				exerciseId: uuidSchema,
				displayOrder: displayOrderSchema
			})
		)
		.max(50)
});
```

---

## Error Handling

### Common Error Patterns

```typescript
// Validation error
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}

// Database error
if (result.error) {
	throw error(500, result.error.message);
}

// Not found
if (!result.data) {
	throw error(404, 'Chapter not found');
}

// Permission denied (handled by RLS)
// Returns empty result or throws from database
```

### Error Messages (French)

All validation schemas include French error messages:

```typescript
const createChapterSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre est trop long (max 200 caracteres)')
});
```
