# Architecture - Cahier de Texte

Architecture technique detaillee du systeme de cahier de texte.

## Vue d'ensemble

Le systeme suit l'architecture SvelteKit standard avec separation claire entre:

- **Routes** : Pages et actions
- **Server** : Logique metier et acces DB
- **Composants** : UI reutilisables
- **Types** : Contrats TypeScript

---

## Structure des fichiers

```
src/
├── lib/
│   ├── components/journal/
│   │   ├── index.ts                      # Re-exports
│   │   ├── JournalWeekGrid.svelte        # Grille hebdomadaire (7 jours)
│   │   ├── JournalDatePicker.svelte      # Navigation prev/next/today
│   │   ├── JournalEntryCard.svelte       # Carte resume entree
│   │   └── HomeworkCard.svelte           # Carte devoir avec countdown
│   │
│   ├── server/
│   │   ├── journal.ts                    # Fonctions CRUD + queries
│   │   ├── journal.test.ts               # Tests unitaires (mocked)
│   │   └── validation/
│   │       ├── journal.ts                # Schemas Zod
│   │       └── journal.test.ts           # Tests validation
│   │
│   └── types/
│       ├── journal.ts                    # Types application (camelCase)
│       └── database.ts                   # Types DB generes (snake_case)
│
├── routes/(protected)/dashboard/
│   ├── teacher/cahier-texte/
│   │   ├── +page.svelte                  # Vue principale enseignant
│   │   ├── +page.server.ts               # Load: classes + week view
│   │   └── [classId]/[date]/
│   │       ├── +page.svelte              # Editeur entree
│   │       └── +page.server.ts           # Actions: create/update/delete/publish
│   │
│   └── student/cahier-texte/
│       ├── +page.svelte                  # Vue principale eleve
│       ├── +page.server.ts               # Load: entrees + devoirs
│       └── [entryId]/
│           ├── +page.svelte              # Detail entree (lecture seule)
│           └── +page.server.ts           # Load: entree + classe + prof
│
supabase/migrations/
└── 20260104200000_create_journal_entries.sql   # Schema + RLS + indexes
```

---

## Routes - Detail

### Teacher Routes

#### `/dashboard/teacher/cahier-texte`

**But** : Vue hebdomadaire pour gerer les entrees de journal

**Load function** (`+page.server.ts:28-74`):

```typescript
export const load: PageServerLoad = async ({ locals, url }) => {
	// 1. Authentification enseignant
	const { user } = await requireRole(locals, 'teacher');

	// 2. Charger les classes de l'enseignant
	const classes = await locals.supabase
		.from('classes')
		.select('id, name, level, is_active')
		.eq('teacher_id', user.id);

	// 3. Determiner la semaine (URL param ou courante)
	const weekStart = url.searchParams.get('week') || getWeekStart();

	// 4. Charger la vue semaine pour la classe selectionnee
	const weekView = await getJournalEntriesForWeek(supabase, classId, weekStart);

	return { classes, selectedClassId, weekStart, weekView };
};
```

**URL Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `week` | `YYYY-MM-DD` | Lundi courant | Debut de semaine |
| `class` | UUID | Premier classe | Classe selectionnee |

**Page** (`+page.svelte`):

- Selecteur de classe (`MySelect`)
- Navigation semaine (`JournalDatePicker`)
- Grille 7 jours (`JournalWeekGrid`)
- Click sur jour → navigation vers editeur

---

#### `/dashboard/teacher/cahier-texte/[classId]/[date]`

**But** : Creer/modifier une entree de journal

**Load function** (`+page.server.ts:34-97`):

```typescript
export const load: PageServerLoad = async ({ locals, params }) => {
	// 1. Valider parametres URL
	uuidSchema.safeParse(params.classId);
	dateParamSchema.safeParse(params.date);

	// 2. Verifier propriete de la classe
	const classData = await supabase
		.from('classes')
		.select('id, name, level')
		.eq('id', classId)
		.eq('teacher_id', user.id);

	// 3. Charger entree existante (si elle existe)
	const existingEntry = await supabase
		.from('class_journal_entries')
		.select('*')
		.eq('class_id', classId)
		.eq('entry_date', date);

	return { classData, entry, entryDate };
};
```

**Form Actions** (`+page.server.ts:99-273`):

| Action      | HTTP | Description               |
| ----------- | ---- | ------------------------- |
| `?/create`  | POST | Creer nouvelle entree     |
| `?/update`  | POST | Modifier entree existante |
| `?/delete`  | POST | Supprimer entree          |
| `?/publish` | POST | Toggle publication        |

**Page** (`+page.svelte`):

- Breadcrumb navigation
- RichTextEditor pour contenu cours
- RichTextEditor pour devoirs
- Date picker pour date limite
- Toggle publication
- Boutons save/delete

---

### Student Routes

#### `/dashboard/student/cahier-texte`

**But** : Vue hebdomadaire + devoirs a venir

**Load function** (`+page.server.ts:46-211`):

```typescript
export const load: PageServerLoad = async ({ locals, url }) => {
	// 1. Authentification eleve
	const { user } = await requireRole(locals, 'student');

	// 2. Charger les classes de l'eleve (memberships actifs)
	const memberships = await supabase
		.from('class_members')
		.select('class_id, classes!inner(id, name, level)')
		.eq('student_id', user.id)
		.eq('status', 'active');

	// 3. Charger entrees publiees de la semaine
	const entries = await supabase
		.from('class_journal_entries')
		.select('...')
		.in('class_id', classIds)
		.eq('is_published', true)
		.lte('entry_date', today)
		.gte('entry_date', weekStart)
		.lte('entry_date', weekEnd);

	// 4. Charger devoirs a venir (14 jours)
	const homework = await getUpcomingHomework(supabase, user.id, 14);

	return { classes, weekStart, days, weekEntries, upcomingHomework };
};
```

**Contraintes de securite**:

- Seules les entrees `is_published = true` visibles
- Seules les entrees `entry_date <= today` visibles
- Seules les classes avec `status = 'active'` visibles

**Page** (`+page.svelte`):

- Layout 2/3 + 1/3 (entries + sidebar devoirs)
- Filtre classe optionnel (si plusieurs)
- Navigation semaine
- Cards cliquables vers detail

---

#### `/dashboard/student/cahier-texte/[entryId]`

**But** : Detail d'une entree (lecture seule)

**Load function** (`+page.server.ts:20-108`):

```typescript
export const load: PageServerLoad = async ({ locals, params }) => {
	// 1. Valider UUID
	uuidSchema.safeParse(params.entryId);

	// 2. Verifier membership actif
	const memberships = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', user.id)
		.eq('status', 'active');

	// 3. Charger entree (verifications multiples)
	const entry = await supabase
		.from('class_journal_entries')
		.select('..., classes!inner(...), profiles!inner(...)')
		.eq('id', entryId)
		.in('class_id', classIds)
		.eq('is_published', true)
		.lte('entry_date', today);

	return { entry, classData, teacherName };
};
```

**Page** (`+page.svelte`):

- Affichage contenu cours (transformMathHtml)
- Affichage devoirs avec countdown
- Nom du professeur
- Navigation retour

---

## Flux de donnees

### Teacher: Creer une entree

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Click day  │───►│  Navigate to     │───►│  +page.server   │
│  in grid    │    │  /[classId]/     │    │  load()         │
│             │    │  [date]          │    │  - verify owner │
└─────────────┘    └──────────────────┘    └─────────────────┘
                                                    │
                                                    ▼
                   ┌──────────────────┐    ┌─────────────────┐
                   │  Display form    │◄───│  Return data    │
                   │  RichTextEditor  │    │  (classData,    │
                   │  x2              │    │   entry: null)  │
                   └──────────────────┘    └─────────────────┘
                           │
                           ▼ (submit)
                   ┌──────────────────┐
                   │  FormData        │
                   │  - lessonContent │
                   │  - homeworkContent│
                   │  - homeworkDueDate│
                   │  - isPublished   │
                   └──────────────────┘
                           │
                           ▼
                   ┌──────────────────┐    ┌─────────────────┐
                   │  action:create   │───►│  Validate Zod   │
                   │  +page.server.ts │    │  createSchema   │
                   └──────────────────┘    └─────────────────┘
                                                    │
                                                    ▼
                   ┌──────────────────┐    ┌─────────────────┐
                   │  Supabase        │◄───│  createJournal  │
                   │  INSERT          │    │  Entry()        │
                   └──────────────────┘    └─────────────────┘
                           │
                           ▼
                   ┌──────────────────┐
                   │  Return success  │
                   │  Toast message   │
                   └──────────────────┘
```

### Student: Voir les devoirs

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Navigate   │───►│  +page.server    │───►│  getUpcoming    │
│  cahier-    │    │  load()          │    │  Homework()     │
│  texte      │    │                  │    │                 │
└─────────────┘    └──────────────────┘    └─────────────────┘
                                                    │
                           ┌────────────────────────┘
                           ▼
                   ┌──────────────────┐
                   │  Query:          │
                   │  - class_members │
                   │  - join entries  │
                   │  - is_published  │
                   │  - date filters  │
                   │  - has homework  │
                   └──────────────────┘
                           │
                           ▼
                   ┌──────────────────┐
                   │  Calculate       │
                   │  daysUntilDue    │
                   │  for each entry  │
                   └──────────────────┘
                           │
                           ▼
                   ┌──────────────────┐
                   │  Render          │
                   │  HomeworkCard    │
                   │  components      │
                   └──────────────────┘
```

---

## Gestion des dates

### Semaine (navigation)

```typescript
// Obtenir le lundi de la semaine courante
function getWeekStart(date: Date = new Date()): string {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	const day = d.getDay();
	// Ajustement pour dimanche (0) -> lundi precedent
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	return d.toISOString().split('T')[0];
}
```

### Format de date

| Usage           | Format                               | Exemple                 |
| --------------- | ------------------------------------ | ----------------------- |
| URL             | `YYYY-MM-DD`                         | `2024-01-15`            |
| DB              | `DATE`                               | `2024-01-15`            |
| Display (long)  | `toLocaleDateString('fr-FR', {...})` | `Lundi 15 janvier 2024` |
| Display (short) | `toLocaleDateString('fr-FR', {...})` | `15 janv.`              |

---

## Gestion d'etat

### Server-side (SSR)

Tout le chargement de donnees se fait cote serveur via:

- `+page.server.ts` load functions
- Form actions pour les mutations

### Client-side (Svelte 5)

Etat local gere avec runes:

```svelte
<script lang="ts">
	// Props du serveur
	let { data, form }: Props = $props();

	// Etat local du formulaire
	let lessonContent = $state(data.entry?.lessonContent || '');
	let homeworkContent = $state(data.entry?.homeworkContent || '');
	let isSaving = $state(false);

	// Valeurs derivees
	let isEditing = $derived(!!data.entry);
	let formAction = $derived(isEditing ? '?/update' : '?/create');
</script>
```

### Navigation (URL state)

```svelte
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// Mettre a jour l'URL sans recharger
	function updateUrl(params: Record<string, string>) {
		const url = new URL($page.url);
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
		goto(url.toString(), { replaceState: true });
	}
</script>
```

---

## Patterns utilises

### 1. Progressive Enhancement

Formulaires fonctionnent sans JS grace a `use:enhance`:

```svelte
<form method="POST" action="?/create" use:enhance>
	<!-- Form controls -->
</form>
```

### 2. Optimistic UI

Non implemente - les mutations attendent la reponse serveur.

### 3. Type Transformation

Conversion automatique DB (snake_case) → App (camelCase):

```typescript
function convertJournalEntry(db: DbClassJournalEntry): ClassJournalEntry {
	return {
		id: db.id,
		classId: db.class_id, // snake → camel
		teacherId: db.teacher_id,
		entryDate: db.entry_date
		// ...
	};
}
```

### 4. Validation en couches

```
┌─────────────────────────────────────────┐
│  1. Client-side                         │
│     - HTML5 validation (min, max, etc.) │
│     - Immediate feedback                │
├─────────────────────────────────────────┤
│  2. Server-side (Zod)                   │
│     - Schema validation                 │
│     - Business rules                    │
├─────────────────────────────────────────┤
│  3. Database (RLS + constraints)        │
│     - UNIQUE constraints                │
│     - Foreign keys                      │
│     - Row Level Security                │
└─────────────────────────────────────────┘
```

---

## Tests

### Tests unitaires (`journal.test.ts`)

| Fonction               | Tests                                           |
| ---------------------- | ----------------------------------------------- |
| `createJournalEntry`   | Succes, pas proprio, duplicate, minimal         |
| `updateJournalEntry`   | Succes, not found, multi-fields, duplicate date |
| `deleteJournalEntry`   | Succes, error                                   |
| `getJournalStatistics` | Calculs corrects, no entries                    |

### Tests validation (`validation/journal.test.ts`)

- Format date YYYY-MM-DD
- Dates invalides (2024-02-30)
- Longueur contenu max
- Regles metier (due date >= entry date)

### Tests skipped (integration requise)

- `getJournalEntriesForWeek` - Queries complexes jointes
- `getTeacherJournalEntries` - Queries complexes jointes
- `getUpcomingHomework` - Multiple queries sequentielles
- `getNextClassDate` - Depend de class_schedules
