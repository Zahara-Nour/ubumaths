# Types TypeScript - Cahier de Texte

Reference complete des types et interfaces TypeScript pour le systeme de cahier de texte.

**Fichier source**: `src/lib/types/journal.ts`

---

## Types Database

Types generes depuis le schema PostgreSQL (snake_case).

### `DbClassJournalEntry`

```typescript
// Type de ligne database
export type DbClassJournalEntry = Database['public']['Tables']['class_journal_entries']['Row'];

// Equivalent a:
interface DbClassJournalEntry {
	id: string; // UUID
	class_id: string; // UUID FK
	teacher_id: string; // UUID FK
	entry_date: string; // DATE (YYYY-MM-DD)
	lesson_content: string | null;
	homework_content: string | null;
	homework_due_date: string | null;
	is_published: boolean;
	created_at: string; // TIMESTAMPTZ
	updated_at: string; // TIMESTAMPTZ
}
```

### `DbClassJournalEntryInsert`

```typescript
// Type pour INSERT
export type DbClassJournalEntryInsert =
	Database['public']['Tables']['class_journal_entries']['Insert'];

// Equivalent a:
interface DbClassJournalEntryInsert {
	id?: string; // auto-generated
	class_id: string; // required
	teacher_id: string; // required
	entry_date: string; // required
	lesson_content?: string | null;
	homework_content?: string | null;
	homework_due_date?: string | null;
	is_published?: boolean; // default: false
	created_at?: string; // auto-set
	updated_at?: string; // auto-set
}
```

### `DbClassJournalEntryUpdate`

```typescript
// Type pour UPDATE
export type DbClassJournalEntryUpdate =
	Database['public']['Tables']['class_journal_entries']['Update'];

// Equivalent a:
interface DbClassJournalEntryUpdate {
	id?: string;
	class_id?: string;
	teacher_id?: string;
	entry_date?: string;
	lesson_content?: string | null;
	homework_content?: string | null;
	homework_due_date?: string | null;
	is_published?: boolean;
	created_at?: string;
	updated_at?: string;
}
```

---

## Types Application

Types utilises dans l'application (camelCase).

### `ClassJournalEntry`

Entree de journal au format application.

```typescript
/**
 * Entree de journal (format application)
 *
 * Represente ce qui s'est passe dans un cours a une date donnee:
 * - lessonContent: Contenu de la seance (format Ubumark)
 * - homeworkContent: Devoirs a faire (format Ubumark)
 * - homeworkDueDate: Date limite optionnelle
 * - isPublished: Visible par les eleves (+ entry_date <= today)
 */
export interface ClassJournalEntry {
	id: string;
	classId: string;
	teacherId: string;
	entryDate: string; // DATE format YYYY-MM-DD
	lessonContent: string | null;
	homeworkContent: string | null;
	homeworkDueDate: string | null;
	isPublished: boolean;
	createdAt: string;
	updatedAt: string;
}
```

### `JournalEntryWithClass`

Entree avec informations de classe (pour listes enseignant).

```typescript
/**
 * Entree avec infos classe supplementaires
 */
export interface JournalEntryWithClass extends ClassJournalEntry {
	className: string;
	classLevel: string;
}
```

---

## Types Vue Hebdomadaire

### `JournalWeekDay`

Un jour dans la vue semaine.

```typescript
/**
 * Represente un jour dans la vue hebdomadaire
 */
export interface JournalWeekDay {
	/** Date object pour ce jour */
	date: Date;

	/** Jour de la semaine (0 = Dimanche, 6 = Samedi) */
	dayOfWeek: number;

	/** Est-ce aujourd'hui? */
	isToday: boolean;

	/** Est-ce un jour de week-end? */
	isWeekend: boolean;

	/** Entree pour ce jour (si elle existe) */
	entry?: ClassJournalEntry;

	/** Y a-t-il un cours prevu ce jour? (depuis class_schedules) */
	hasScheduledClass?: boolean;
}
```

### `JournalWeekView`

Vue complete d'une semaine pour une classe.

```typescript
/**
 * Vue semaine pour une classe specifique
 * Utilisee par les enseignants pour voir/editer les entrees
 */
export interface JournalWeekView {
	/** Debut de la semaine (lundi) */
	weekStart: Date;

	/** Fin de la semaine (dimanche) */
	weekEnd: Date;

	/** Jours de la semaine avec entrees */
	days: JournalWeekDay[];

	/** Informations classe */
	classId: string;
	className: string;
	classLevel: string;
}
```

---

## Types Vue Eleve

### `JournalDayView`

Vue simplifiee d'un jour pour les eleves.

```typescript
/**
 * Vue jour simplifiee avec infos basiques (pour eleves)
 */
export interface JournalDayView {
	/** Date object pour ce jour */
	date: Date;

	/** Nom court du jour (lun, mar, etc.) */
	dayOfWeek: string;

	/** Est-ce aujourd'hui? */
	isToday: boolean;

	/** Resumes des entrees pour ce jour (peut etre multi-classes) */
	entries: JournalDayEntry[];
}
```

### `JournalDayEntry`

Resume d'une entree pour la vue jour.

```typescript
/**
 * Resume d'entree pour vue jour
 */
export interface JournalDayEntry {
	id: string;
	hasLesson: boolean;
	hasHomework: boolean;
	homeworkDueDate: string | null;
	isPublished: boolean;
	className: string;
	classId: string;
}
```

### `UpcomingHomework`

Devoir a venir pour un eleve.

```typescript
/**
 * Devoir a venir (vue eleve)
 */
export interface UpcomingHomework {
	id: string;
	classId: string;
	className: string;
	classLevel: string;
	entryDate: string; // Quand le devoir a ete donne
	homeworkContent: string;
	homeworkDueDate: string; // Date limite
	daysUntilDue: number; // Calcule cote serveur
}
```

---

## Types Statistiques

### `JournalStatistics`

Statistiques pour le dashboard enseignant.

```typescript
/**
 * Statistiques des entrees de journal (dashboard enseignant)
 */
export interface JournalStatistics {
	/** Nombre total d'entrees pour cette classe */
	totalEntries: number;

	/** Nombre d'entrees publiees */
	publishedEntries: number;

	/** Nombre d'entrees avec devoirs */
	entriesWithHomework: number;

	/** Date de la derniere entree */
	lastEntryDate: string | null;

	/** Nombre d'entrees ce mois-ci */
	entriesThisMonth: number;

	/** Nombre d'entrees cette semaine */
	entriesThisWeek: number;
}
```

---

## Types Validation (Zod inferred)

### `CreateJournalEntryInput`

```typescript
// Infere du schema Zod
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

// Equivalent a:
interface CreateJournalEntryInput {
	classId: string; // UUID
	entryDate: string; // YYYY-MM-DD
	lessonContent?: string | null; // max 50000 chars
	homeworkContent?: string | null;
	homeworkDueDate?: string | null;
	isPublished: boolean; // default: false
}
```

### `UpdateJournalEntryInput`

```typescript
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;

// Equivalent a:
interface UpdateJournalEntryInput {
	entryDate?: string;
	lessonContent?: string | null;
	homeworkContent?: string | null;
	homeworkDueDate?: string | null;
	isPublished?: boolean;
}
// Contrainte: au moins un champ doit etre present
```

### `ListJournalEntriesQuery`

```typescript
export type ListJournalEntriesQuery = z.infer<typeof listJournalEntriesQuerySchema>;

interface ListJournalEntriesQuery {
	page?: number;
	limit?: number;
	classId?: string;
	teacherId?: string;
	startDate?: string;
	endDate?: string;
	publishedOnly?: boolean;
}
```

### `WeekViewQuery`

```typescript
export type WeekViewQuery = z.infer<typeof weekViewQuerySchema>;

interface WeekViewQuery {
	classId: string;
	weekStart: string;
	weekEnd?: string;
}
```

### `UpcomingHomeworkQuery`

```typescript
export type UpcomingHomeworkQuery = z.infer<typeof upcomingHomeworkQuerySchema>;

interface UpcomingHomeworkQuery {
	studentId: string;
	daysAhead: number; // 1-90, default: 14
}
```

---

## Types Operation

### `OperationResult<T>`

Resultat d'une operation unique.

```typescript
interface OperationResult<T> {
  data: T | null;
  error: Error | null;
}

// Usage:
const result: OperationResult<ClassJournalEntry> = await createJournalEntry(...);
if (result.error) {
  console.error(result.error.message);
} else {
  console.log(result.data);
}
```

### `ListResult<T>`

Resultat d'une liste avec compte.

```typescript
interface ListResult<T> {
  data: T[];
  error: Error | null;
  count: number;
}

// Usage:
const result: ListResult<JournalEntryWithClass> = await getTeacherJournalEntries(...);
console.log(`${result.count} entrees trouvees`);
result.data.forEach(entry => ...);
```

---

## Types Props Composants

### `JournalWeekGridProps`

```typescript
interface JournalWeekGridProps {
	days: JournalWeekDay[];
	onDayClick?: (date: Date) => void;
	readonly?: boolean;
	className?: string;
}
```

### `JournalDatePickerProps`

```typescript
interface JournalDatePickerProps {
	weekStart: Date;
	onPrevious: () => void;
	onNext: () => void;
	onToday: () => void;
	isCurrentWeek: boolean;
}
```

### `JournalEntryCardProps`

```typescript
interface JournalEntryCardProps {
	entry: JournalEntryWithClass;
	showClass?: boolean;
	onclick?: () => void;
}
```

### `HomeworkCardProps`

```typescript
interface HomeworkCardProps {
	homework: UpcomingHomework;
	onclick?: () => void;
}
```

---

## Types PageData (SvelteKit)

### Teacher Main Page

```typescript
// /dashboard/teacher/cahier-texte/+page.server.ts
interface PageData {
	classes: Array<{
		id: string;
		name: string;
		level: string;
		is_active: boolean;
	}>;
	selectedClassId: string | null;
	weekStart: string;
	weekView: JournalWeekView | null;
}
```

### Teacher Editor Page

```typescript
// /dashboard/teacher/cahier-texte/[classId]/[date]/+page.server.ts
interface PageData {
	classData: {
		id: string;
		name: string;
		level: string;
	};
	entry: ClassJournalEntry | null;
	entryDate: string;
}
```

### Student Main Page

```typescript
// /dashboard/student/cahier-texte/+page.server.ts
interface PageData {
	classes: Array<{
		id: string;
		name: string;
		level: string;
	}>;
	selectedClassId: string | null;
	weekStart: string;
	days: JournalDayView[];
	weekEntries: Array<{
		id: string;
		entryDate: string;
		lessonContent: string | null;
		homeworkContent: string | null;
		homeworkDueDate: string | null;
		className: string;
		classLevel: string;
		classId: string;
	}>;
	upcomingHomework: UpcomingHomework[];
}
```

### Student Detail Page

```typescript
// /dashboard/student/cahier-texte/[entryId]/+page.server.ts
interface PageData {
	entry: {
		id: string;
		entryDate: string;
		lessonContent: string | null;
		homeworkContent: string | null;
		homeworkDueDate: string | null;
		isPublished: boolean;
		createdAt: string;
		updatedAt: string;
	};
	classData: {
		id: string;
		name: string;
		level: string;
	};
	teacherName: string;
}
```

---

## Types ActionData (SvelteKit)

### Form Actions Results

```typescript
// /dashboard/teacher/cahier-texte/[classId]/[date]/+page.server.ts

type ActionData =
	| { success: true; action: 'create'; entryId: string }
	| { success: true; action: 'update' }
	| { success: true; action: 'publish'; isPublished: boolean }
	| { error: string; action: 'create' | 'update' | 'delete' | 'publish' }
	| null;
```

---

## Conversion Types

### `convertJournalEntry`

Fonction de conversion DB → App.

```typescript
function convertJournalEntry(db: DbClassJournalEntry): ClassJournalEntry {
	return {
		id: db.id,
		classId: db.class_id,
		teacherId: db.teacher_id,
		entryDate: db.entry_date,
		lessonContent: db.lesson_content,
		homeworkContent: db.homework_content,
		homeworkDueDate: db.homework_due_date,
		isPublished: db.is_published,
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}
```

---

## Declaration Module

Pour TypeScript strict, les types sont exportes:

```typescript
// src/lib/types/journal.ts
export type {
	DbClassJournalEntry,
	DbClassJournalEntryInsert,
	DbClassJournalEntryUpdate,
	ClassJournalEntry,
	JournalEntryWithClass,
	UpcomingHomework,
	JournalWeekDay,
	JournalWeekView,
	JournalDayView,
	JournalDayEntry,
	JournalStatistics
};
```

```typescript
// src/lib/server/validation/journal.ts
export type {
	CreateJournalEntryInput,
	UpdateJournalEntryInput,
	ListJournalEntriesQuery,
	WeekViewQuery,
	UpcomingHomeworkQuery
};
```
