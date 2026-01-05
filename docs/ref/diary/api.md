# API - Cahier de Texte

Reference complete des fonctions serveur et schemas de validation pour le systeme de cahier de texte.

---

## Vue d'ensemble

| Module             | Fichier                                | Description    |
| ------------------ | -------------------------------------- | -------------- |
| Server Functions   | `src/lib/server/journal.ts`            | CRUD + queries |
| Validation Schemas | `src/lib/server/validation/journal.ts` | Zod schemas    |

---

## Fonctions Serveur

### CRUD - Enseignant

#### `createJournalEntry`

Cree une nouvelle entree de journal.

```typescript
async function createJournalEntry(
	supabase: SupabaseClient<Database>,
	teacherId: string,
	input: CreateJournalEntryInput
): Promise<OperationResult<ClassJournalEntry>>;
```

**Parametres**:
| Param | Type | Description |
|-------|------|-------------|
| `supabase` | SupabaseClient | Client Supabase authentifie |
| `teacherId` | string (UUID) | ID de l'enseignant |
| `input` | CreateJournalEntryInput | Donnees de l'entree |

**Input Schema**:

```typescript
{
  classId: string;              // UUID de la classe
  entryDate: string;            // YYYY-MM-DD
  lessonContent?: string;       // Contenu cours (Ubumark)
  homeworkContent?: string;     // Devoirs (Ubumark)
  homeworkDueDate?: string;     // YYYY-MM-DD
  isPublished?: boolean;        // default: false
}
```

**Retour**:

```typescript
{
	data: ClassJournalEntry | null;
	error: Error | null;
}
```

**Erreurs**:
| Code | Message | Cause |
|------|---------|-------|
| - | "Vous n'etes pas autorise..." | Enseignant n'est pas proprio de la classe |
| 23505 | "Une entree existe deja..." | Duplicate (class_id, entry_date) |

**Exemple**:

```typescript
const result = await createJournalEntry(supabase, userId, {
	classId: '33333333-3333-4333-8333-333333333333',
	entryDate: '2024-01-15',
	lessonContent: '<p>Chapitre 5: Les fractions</p>',
	homeworkContent: '<p>Exercices 1-5 page 42</p>',
	homeworkDueDate: '2024-01-20',
	isPublished: false
});

if (result.error) {
	console.error(result.error.message);
} else {
	console.log('Created:', result.data.id);
}
```

---

#### `updateJournalEntry`

Met a jour une entree existante.

```typescript
async function updateJournalEntry(
	supabase: SupabaseClient<Database>,
	entryId: string,
	teacherId: string,
	input: UpdateJournalEntryInput
): Promise<OperationResult<ClassJournalEntry>>;
```

**Parametres**:
| Param | Type | Description |
|-------|------|-------------|
| `supabase` | SupabaseClient | Client Supabase authentifie |
| `entryId` | string (UUID) | ID de l'entree a modifier |
| `teacherId` | string (UUID) | ID de l'enseignant (verification) |
| `input` | UpdateJournalEntryInput | Champs a modifier |

**Input Schema** (tous optionnels, au moins un requis):

```typescript
{
  entryDate?: string;           // YYYY-MM-DD
  lessonContent?: string | null;
  homeworkContent?: string | null;
  homeworkDueDate?: string | null;
  isPublished?: boolean;
}
```

**Erreurs**:
| Code | Message | Cause |
|------|---------|-------|
| - | "Entree introuvable ou..." | Entry not found ou pas proprio |
| 23505 | "Une entree existe deja..." | Nouvelle date deja prise |

---

#### `deleteJournalEntry`

Supprime une entree.

```typescript
async function deleteJournalEntry(
	supabase: SupabaseClient<Database>,
	entryId: string,
	teacherId: string
): Promise<{ error: Error | null }>;
```

**Parametres**:
| Param | Type | Description |
|-------|------|-------------|
| `supabase` | SupabaseClient | Client Supabase authentifie |
| `entryId` | string (UUID) | ID de l'entree a supprimer |
| `teacherId` | string (UUID) | ID de l'enseignant (verification) |

**Note**: La suppression est silencieuse si l'entree n'existe pas.

---

### Queries - Enseignant

#### `getJournalEntriesForWeek`

Recupere la vue hebdomadaire pour une classe.

```typescript
async function getJournalEntriesForWeek(
	supabase: SupabaseClient<Database>,
	classId: string,
	weekStart: string // YYYY-MM-DD (lundi)
): Promise<OperationResult<JournalWeekView>>;
```

**Retour**:

```typescript
interface JournalWeekView {
	weekStart: Date;
	weekEnd: Date;
	days: JournalWeekDay[]; // 7 jours
	classId: string;
	className: string;
	classLevel: string;
}

interface JournalWeekDay {
	date: Date;
	dayOfWeek: number; // 0=dim, 6=sam
	isToday: boolean;
	isWeekend: boolean;
	entry?: ClassJournalEntry;
	hasScheduledClass?: boolean; // depuis class_schedules
}
```

**Logique**:

1. Charge les infos de la classe
2. Charge les entrees de la semaine
3. Charge l'emploi du temps (class_schedules)
4. Construit le tableau de 7 jours avec indicateurs

---

#### `getTeacherJournalEntries`

Liste les entrees d'un enseignant (avec pagination).

```typescript
async function getTeacherJournalEntries(
	supabase: SupabaseClient<Database>,
	teacherId: string,
	classId?: string, // filtre optionnel
	limit: number = 50
): Promise<ListResult<JournalEntryWithClass>>;
```

**Retour**:

```typescript
{
  data: JournalEntryWithClass[];  // Entrees avec infos classe
  error: Error | null;
  count: number;
}
```

---

#### `getJournalStatistics`

Statistiques pour une classe.

```typescript
async function getJournalStatistics(
	supabase: SupabaseClient<Database>,
	classId: string
): Promise<OperationResult<JournalStatistics>>;
```

**Retour**:

```typescript
interface JournalStatistics {
	totalEntries: number;
	publishedEntries: number;
	entriesWithHomework: number;
	lastEntryDate: string | null;
	entriesThisMonth: number;
	entriesThisWeek: number;
}
```

---

### Queries - Eleve

#### `getUpcomingHomework`

Devoirs a venir pour un eleve.

```typescript
async function getUpcomingHomework(
	supabase: SupabaseClient<Database>,
	studentId: string,
	daysAhead: number = 14
): Promise<ListResult<UpcomingHomework>>;
```

**Parametres**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `studentId` | UUID | - | ID de l'eleve |
| `daysAhead` | number | 14 | Jours a regarder (1-90) |

**Retour**:

```typescript
interface UpcomingHomework {
	id: string;
	classId: string;
	className: string;
	classLevel: string;
	entryDate: string; // Quand assigne
	homeworkContent: string;
	homeworkDueDate: string; // Quand rendre
	daysUntilDue: number; // Calcule
}
```

**Filtres appliques**:

- Classes avec membership actif
- Entrees publiees (`is_published = true`)
- Date entree <= aujourd'hui
- Homework content non null
- Homework due date dans la plage

---

#### `getNextClassDate`

Prochaine date de cours pour une classe.

```typescript
async function getNextClassDate(
	supabase: SupabaseClient<Database>,
	classId: string,
	fromDate?: string // YYYY-MM-DD, default: today
): Promise<OperationResult<string>>;
```

**Logique**:

1. Charge l'emploi du temps (class_schedules)
2. Parcourt les 30 prochains jours
3. Retourne la premiere date correspondant a un jour de cours

**Retour**: `YYYY-MM-DD` ou `null` si pas trouve.

---

## Schemas de Validation

### Schemas de base

#### `dateSchema`

```typescript
export const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD attendu)')
	.refine(
		(date) => {
			const parsed = new Date(date);
			if (isNaN(parsed.getTime())) return false;
			// Verifie que la date n'a pas ete auto-corrigee
			// Ex: 2024-02-30 -> 2024-03-01 invalide
			return parsed.toISOString().startsWith(date);
		},
		{ message: 'Date invalide' }
	);
```

---

### `createJournalEntrySchema`

```typescript
export const createJournalEntrySchema = z
	.object({
		classId: uuidSchema.describe('ID de la classe'),
		entryDate: dateSchema.describe('Date de la seance'),
		lessonContent: z
			.string()
			.trim()
			.max(50000, 'Le contenu du cours est trop long (max 50000 caracteres)')
			.optional()
			.nullable(),
		homeworkContent: z
			.string()
			.trim()
			.max(50000, 'Le contenu du devoir est trop long (max 50000 caracteres)')
			.optional()
			.nullable(),
		homeworkDueDate: dateSchema.optional().nullable(),
		isPublished: z.boolean().default(false)
	})
	.refine(
		(data) => {
			// Si homework_due_date est defini, homework_content doit l'etre aussi
			if (data.homeworkDueDate && !data.homeworkContent) {
				return false;
			}
			return true;
		},
		{
			message: 'Une date limite requiert un contenu de devoir',
			path: ['homeworkDueDate']
		}
	)
	.refine(
		(data) => {
			// homework_due_date doit etre >= entry_date
			if (data.homeworkDueDate && data.entryDate) {
				const entryDate = new Date(data.entryDate);
				const dueDate = new Date(data.homeworkDueDate);
				return dueDate >= entryDate;
			}
			return true;
		},
		{
			message: "La date limite doit etre posterieure ou egale a la date de l'entree",
			path: ['homeworkDueDate']
		}
	);

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
```

---

### `updateJournalEntrySchema`

```typescript
export const updateJournalEntrySchema = z
	.object({
		entryDate: dateSchema.optional(),
		lessonContent: z.string().trim().max(50000, '...').optional().nullable(),
		homeworkContent: z.string().trim().max(50000, '...').optional().nullable(),
		homeworkDueDate: dateSchema.optional().nullable(),
		isPublished: z.boolean().optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Au moins un champ doit etre fourni pour la mise a jour'
	})
	.refine(
		(data) => {
			// Si on definit homeworkDueDate et on supprime homeworkContent -> erreur
			if (data.homeworkDueDate && data.homeworkContent === null) {
				return false;
			}
			return true;
		},
		{
			message: 'Impossible de definir une date limite sans contenu de devoir',
			path: ['homeworkDueDate']
		}
	);
```

---

### Schemas de Query

#### `listJournalEntriesQuerySchema`

```typescript
export const listJournalEntriesQuerySchema = paginationSchema.extend({
	classId: uuidSchema.optional(),
	teacherId: uuidSchema.optional(),
	startDate: dateSchema.optional(),
	endDate: dateSchema.optional(),
	publishedOnly: z
		.string()
		.optional()
		.transform((val) => val === 'true')
});
```

#### `weekViewQuerySchema`

```typescript
export const weekViewQuerySchema = z.object({
	classId: uuidSchema.describe('ID de la classe'),
	weekStart: dateSchema.describe('Debut de la semaine (lundi)'),
	weekEnd: dateSchema.describe('Fin de la semaine (dimanche)').optional()
});
```

#### `upcomingHomeworkQuerySchema`

```typescript
export const upcomingHomeworkQuerySchema = z.object({
	studentId: uuidSchema.describe("ID de l'eleve"),
	daysAhead: z
		.number()
		.int('Le nombre de jours doit etre un entier')
		.min(1, 'Le nombre de jours doit etre au moins 1')
		.max(90, 'Le nombre de jours ne peut pas depasser 90')
		.default(14)
});
```

---

## Form Actions

### `/dashboard/teacher/cahier-texte/[classId]/[date]`

| Action      | Method | Description               |
| ----------- | ------ | ------------------------- |
| `?/create`  | POST   | Creer nouvelle entree     |
| `?/update`  | POST   | Modifier entree existante |
| `?/delete`  | POST   | Supprimer entree          |
| `?/publish` | POST   | Toggle publication        |

#### Action `create`

```typescript
// FormData attendu
{
  lessonContent: string;
  homeworkContent: string;
  homeworkDueDate: string;  // YYYY-MM-DD ou vide
  isPublished: 'true' | 'false';
}

// Retour succes
{ success: true, action: 'create', entryId: string }

// Retour erreur
{ error: string, action: 'create' }
```

#### Action `update`

```typescript
// FormData attendu
{
  entryId: string;  // UUID (hidden field)
  lessonContent: string;
  homeworkContent: string;
  homeworkDueDate: string;
  isPublished: 'true' | 'false';
}

// Retour succes
{ success: true, action: 'update' }
```

#### Action `delete`

```typescript
// FormData attendu
{
	entryId: string; // UUID (hidden field)
}

// Comportement: redirect vers /dashboard/teacher/cahier-texte?class={classId}
```

#### Action `publish`

```typescript
// FormData attendu
{
  entryId: string;
  isPublished: 'true' | 'false';  // Nouvelle valeur
}

// Retour succes
{ success: true, action: 'publish', isPublished: boolean }
```

---

## Helpers de Validation

```typescript
// Valider creation
export function validateCreateJournalEntry(data: unknown) {
	return createJournalEntrySchema.safeParse(data);
}

// Valider update
export function validateUpdateJournalEntry(data: unknown) {
	return updateJournalEntrySchema.safeParse(data);
}

// Valider query params (liste)
export function validateListJournalEntriesQuery(params: URLSearchParams) {
	return listJournalEntriesQuerySchema.safeParse(Object.fromEntries(params));
}

// Valider week view query
export function validateWeekViewQuery(params: URLSearchParams) {
	return weekViewQuerySchema.safeParse(Object.fromEntries(params));
}

// Valider upcoming homework query
export function validateUpcomingHomeworkQuery(data: unknown) {
	return upcomingHomeworkQuerySchema.safeParse(data);
}
```

---

## Types de Retour

### `OperationResult<T>`

```typescript
interface OperationResult<T> {
	data: T | null;
	error: Error | null;
}
```

### `ListResult<T>`

```typescript
interface ListResult<T> {
	data: T[];
	error: Error | null;
	count: number;
}
```

---

## Constantes

```typescript
// Longueur max contenu (lesson + homework)
const MAX_CONTENT_LENGTH = 50000;

// Jours a l'avance pour devoirs (default)
const UPCOMING_HOMEWORK_DAYS = 14;

// Jours max pour recherche prochaine date cours
const MAX_NEXT_CLASS_SEARCH_DAYS = 30;
```
