# Chapter Templates Guide

Complete guide to the chapter templates system, including lifecycle management, versioning, instantiation, and migration.

---

## Table of Contents

1. [Concept Overview](#concept-overview)
2. [Template Lifecycle](#template-lifecycle)
3. [Versioning System](#versioning-system)
4. [Content Snapshot](#content-snapshot)
5. [Instantiation Flow](#instantiation-flow)
6. [Migration Process](#migration-process)
7. [Detachment](#detachment)
8. [Best Practices](#best-practices)

---

## Concept Overview

### What Are Chapter Templates?

Chapter templates are reusable chapter structures that enable teachers to:

- **Create once, use many times**: Define a chapter structure and instantiate it across multiple classes
- **Share with others**: Publish templates publicly for other teachers to use
- **Update consistently**: When the template is updated, instantiated chapters can be migrated
- **Track versions**: Full history of changes with diffs

### Key Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  TEMPLATE                                                                    │
│  ────────                                                                    │
│  ┌─────────────────────┐                                                     │
│  │ chapter_templates   │                                                     │
│  │                     │                                                     │
│  │ - title             │                                                     │
│  │ - description       │                                                     │
│  │ - status            │─────┬─────────────────────────────────────────────┐ │
│  │ - is_public         │     │                                             │ │
│  │ - grades[]          │     │                                             │ │
│  │ - content_snapshot  │     │  VERSIONS                                   │ │
│  │ - current_version   │     │  ────────                                   │ │
│  └──────────┬──────────┘     │                                             │ │
│             │                │  ┌──────────────────────────────────────┐   │ │
│             │                │  │ chapter_template_versions            │   │ │
│             │                │  │                                      │   │ │
│             │                │  │ v1: Initial version                  │   │ │
│             │                │  │ v2: Added quiz questions             │   │ │
│             │                │  │ v3: Fixed checklist items            │   │ │
│             │                │  │ v4: Current                          │   │ │
│             │                │  └──────────────────────────────────────┘   │ │
│             │                │                                             │ │
│             │                └─────────────────────────────────────────────┘ │
│             │                                                                │
│  INSTANTIATIONS                                                              │
│  ──────────────                                                              │
│             │                                                                │
│             ├──────────────────┐                                             │
│             │                  │                                             │
│             ▼                  ▼                                             │
│  ┌─────────────────┐  ┌─────────────────┐                                   │
│  │ Chapter A       │  │ Chapter B       │                                   │
│  │ (Class Math-6A) │  │ (Class Math-6B) │                                   │
│  │                 │  │                 │                                   │
│  │ template_v: 4   │  │ template_v: 2   │ ← Update available!              │
│  │ is_detached: no │  │ is_detached: no │                                   │
│  └─────────────────┘  └─────────────────┘                                   │
│                                                                              │
│  ┌─────────────────┐                                                         │
│  │ Chapter C       │                                                         │
│  │ (Class Math-5A) │                                                         │
│  │                 │                                                         │
│  │ is_detached: yes│ ← No longer receives updates                           │
│  └─────────────────┘                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Template Lifecycle

### Status States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   ┌─────────┐         ┌───────────┐         ┌───────────┐                   │
│   │  DRAFT  │────────▶│ PUBLISHED │────────▶│ ARCHIVED  │                   │
│   │         │         │           │         │           │                   │
│   │ Editable│  Publish│ Locked    │ Archive │ Hidden    │                   │
│   │ Private │         │ Public or │         │ Preserved │                   │
│   │         │         │ Private   │         │           │                   │
│   └─────────┘         └───────────┘         └───────────┘                   │
│        │                    │                                                │
│        │                    │                                                │
│        │  Can create        │  Can create                                    │
│        │  new version       │  new version                                   │
│        ▼                    ▼                                                │
│   ┌─────────────────────────────────────────┐                               │
│   │          VERSION N+1                     │                               │
│   │          (new content snapshot)          │                               │
│   └─────────────────────────────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Status Descriptions

| Status        | Description          | Editable     | Visible                     | Can Instantiate |
| ------------- | -------------------- | ------------ | --------------------------- | --------------- |
| **Draft**     | Work in progress     | Yes          | Creator only                | No              |
| **Published** | Ready for use        | Version only | Creator + Public (optional) | Yes             |
| **Archived**  | No longer maintained | No           | Creator only                | No              |

### Transition Rules

```typescript
// Draft → Published
// Requires: content_snapshot has at least one item
await publishTemplate(templateId, isPublic);

// Published → Archived
// Note: Existing instantiations remain linked
await archiveTemplate(templateId);

// Archived → Published
// Re-publish to make available again
await publishTemplate(templateId, isPublic);
```

---

## Versioning System

### How Versions Work

1. **Version 1**: Created automatically when template is first created
2. **New versions**: Created when content is updated (published templates)
3. **Content snapshot**: Full copy of template content at each version
4. **Diff**: Computed difference from previous version

### Version Structure

```typescript
interface ChapterTemplateVersion {
	id: string;
	templateId: string;
	versionNumber: number; // 1, 2, 3, ...
	createdBy: string;
	contentSnapshot: TemplateContentSnapshot;
	changeSummary: string | null; // Human-readable
	diff: TemplateDiff | null; // Structured diff
	createdAt: string;
}
```

### Creating New Versions

```typescript
// Only for published templates
await createTemplateVersion(
	templateId,
	newContentSnapshot,
	'Added 3 quiz questions for chapter review',
	userId,
	supabase
);

// This also updates:
// - chapter_templates.content_snapshot
// - chapter_templates.current_version
```

### Diff Structure

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
		quizQuestionsAdded: number;
		quizQuestionsRemoved: number;
		quizQuestionsModified: number;
		checklistItemsAdded: number;
		checklistItemsRemoved: number;
		checklistItemsModified: number;
		exercisesAdded: number;
		exercisesRemoved: number;
		exercisesModified: number;
	};
}

interface DiffEntry<T> {
	type: 'added' | 'removed' | 'modified';
	item: T;
	previousItem?: T; // For 'modified' type
}
```

---

## Content Snapshot

### Snapshot Structure

```typescript
interface TemplateContentSnapshot {
	documents: TemplateDocumentSnapshot[];
	quizQuestions: TemplateQuizQuestionSnapshot[];
	checklistItems: TemplateChecklistItemSnapshot[];
	exercises: TemplateExerciseSnapshot[];
}
```

### Document Snapshot

```typescript
interface TemplateDocumentSnapshot {
	title: string;
	description: string | null;
	documentUrl: string; // External URL or Google Drive
	sourceType: 'external_url' | 'google_drive';
	mimeType: string | null;
	displayOrder: number;
}
```

**Note**: Templates only support external URLs and Google Drive links, not file uploads. This avoids storage duplication when templates are instantiated.

### Quiz Question Snapshot

```typescript
interface TemplateQuizQuestionSnapshot {
	questionTemplateId: string; // Reference to existing question_templates
	pointsOverride: number | null;
	displayOrder: number;
}
```

### Checklist Item Snapshot

```typescript
interface TemplateChecklistItemSnapshot {
	content: string; // The checklist text
	description: string | null;
	displayOrder: number;
}
```

### Exercise Snapshot

```typescript
interface TemplateExerciseSnapshot {
	exerciseId: string; // Reference to existing exercises
	displayOrder: number;
}
```

### Limits

| Content Type    | Maximum Items |
| --------------- | ------------- |
| Documents       | 50            |
| Quiz Questions  | 100           |
| Checklist Items | 50            |
| Exercises       | 50            |

---

## Instantiation Flow

### Overview

Instantiation creates a new chapter from a template, copying all content:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  TEMPLATE                           INSTANTIATION                           │
│  ────────                           ─────────────                           │
│                                                                              │
│  ┌─────────────────┐               ┌─────────────────────┐                  │
│  │ Template        │               │ chapter_template_   │                  │
│  │ v4              │──creates────▶│ instantiations      │                  │
│  │ (content_snap)  │               │                     │                  │
│  └─────────────────┘               │ template_version: 4 │                  │
│                                    │ chapter_id: xyz     │                  │
│                                    │ is_detached: false  │                  │
│                                    └──────────┬──────────┘                  │
│                                               │                              │
│                                               │                              │
│  CREATED CHAPTER                              │                              │
│  ───────────────                              │                              │
│                                               ▼                              │
│  ┌─────────────────┐     ┌─────────────────────────────────────────────┐   │
│  │ class_chapters  │     │                                             │   │
│  │                 │◄────│  Content Created:                           │   │
│  │ - title         │     │  - chapter_documents (Google Drive links)   │   │
│  │ - description   │     │  - chapter_quiz_questions                   │   │
│  │ - is_visible    │     │  - chapter_checklist_items                  │   │
│  │ - color/icon    │     │  - chapter_exercises                        │   │
│  └─────────────────┘     │                                             │   │
│                          └─────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Instantiation API

```typescript
const result = await instantiateTemplate(
  {
    templateId: 'template-uuid',
    classId: 'class-uuid',
    title: 'Custom Title',    // Optional, defaults to template title
    isVisible: false          // Optional, default false
  },
  userId,
  supabase
);

// Result
{
  data: {
    chapterId: 'new-chapter-uuid',
    instantiation: {
      id: 'instantiation-uuid',
      templateId: 'template-uuid',
      templateVersion: 4,
      chapterId: 'new-chapter-uuid',
      currentTemplateVersion: 4,
      isDetached: false,
      instantiatedAt: '2025-12-10T...',
      lastMigratedAt: null
    }
  },
  error: null
}
```

### What Gets Copied

| Template Content   | Chapter Content                                    |
| ------------------ | -------------------------------------------------- |
| `title`            | `class_chapters.title`                             |
| `description`      | `class_chapters.description`                       |
| `color`            | `class_chapters.color`                             |
| `icon`             | `class_chapters.icon`                              |
| `documents[]`      | `chapter_documents` rows (Google Drive links only) |
| `quizQuestions[]`  | `chapter_quiz_questions` rows                      |
| `checklistItems[]` | `chapter_checklist_items` rows                     |
| `exercises[]`      | `chapter_exercises` rows                           |

---

## Migration Process

### Checking for Updates

```typescript
const result = await checkForTemplateUpdates(chapterId, supabase);

// Result
{
  data: {
    hasUpdate: true,
    latestVersion: 5
  },
  error: null
}
```

### Migration Preview

Before migrating, get a preview of changes:

```typescript
const preview = await getMigrationPreview(
  chapterId,
  targetVersion,  // Optional, defaults to latest
  supabase
);

// Result
{
  data: {
    instantiationId: 'inst-uuid',
    chapterId: 'chapter-uuid',
    fromVersion: 2,
    toVersion: 5,
    changeSummary: 'Added quiz questions, updated checklist',
    hasChanges: true,
    diff: {
      documents: [],
      quizQuestions: [
        { type: 'added', item: {...} },
        { type: 'added', item: {...} }
      ],
      checklistItems: [
        { type: 'modified', item: {...}, previousItem: {...} }
      ],
      exercises: [],
      stats: {
        quizQuestionsAdded: 2,
        checklistItemsModified: 1,
        // ...
      }
    }
  },
  error: null
}
```

### Executing Migration

```typescript
const result = await migrateChapterToVersion(
	chapterId,
	5, // Target version
	supabase
);
```

**Migration Process**:

1. **Delete existing content** (preserving student progress where possible)
2. **Apply new version's content snapshot**
3. **Update instantiation record**

**Important**: Student quiz results and checklist progress may be affected:

- Quiz results are preserved if question still exists
- Checklist progress is reset for modified/removed items

---

## Detachment

### When to Detach

Detach a chapter from its template when:

- You want to customize this chapter independently
- You no longer want to receive template updates
- The template will be archived/deleted

### Detachment API

```typescript
await detachChapterFromTemplate(chapterId, supabase);
```

**What Happens**:

1. `is_detached` set to `true` on instantiation record
2. Chapter keeps current content
3. No more update notifications
4. Template reference preserved for history

### Detached State

```typescript
interface DetachedInstantiation {
	id: string;
	templateId: string | null; // Preserved for history
	templateVersion: number; // Version at detachment
	chapterId: string;
	currentTemplateVersion: null; // NULL indicates detached
	isDetached: true;
	instantiatedAt: string;
	lastMigratedAt: string | null;
}
```

---

## Best Practices

### Template Creation

1. **Start with draft**: Create and refine before publishing
2. **Add all content before publishing**: Changes after publishing create new versions
3. **Use descriptive titles**: Help other teachers find your template
4. **Set appropriate grades**: Enable filtering by target audience
5. **Write good change summaries**: Help users understand what changed in each version

### Template Publishing

1. **Test with instantiation**: Create a test chapter before making public
2. **Consider public vs private**: Public templates help the community
3. **Archive don't delete**: Keep history for existing instantiations

### Template Usage

1. **Check for updates regularly**: Keep chapters in sync
2. **Review diffs before migrating**: Understand what will change
3. **Detach when customizing**: Avoid conflicts with template updates
4. **Keep original template reference**: Helpful for comparing changes

### Version Management

1. **Group related changes**: One version per logical change set
2. **Write meaningful summaries**: Future you will thank you
3. **Don't version typo fixes**: Combine with larger changes

### Example Workflow

```
1. Create Template (Draft)
   └── Add basic structure, test content

2. Refine Content
   └── Add documents, quiz questions, checklist items

3. Publish Template (v1)
   └── Make available for instantiation

4. Instantiate into classes
   └── Math-6A, Math-6B, Math-6C

5. Discover improvement needed
   └── Add 2 more quiz questions

6. Create new version (v2)
   └── Write summary: "Added review questions"

7. Migrate chapters as needed
   └── Each teacher decides when to update
```
