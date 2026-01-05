# Composants - Cahier de Texte

Reference complete des composants Svelte pour le systeme de cahier de texte.

---

## Vue d'ensemble

| Composant         | Fichier                    | Description                 |
| ----------------- | -------------------------- | --------------------------- |
| JournalWeekGrid   | `JournalWeekGrid.svelte`   | Grille 7 jours avec statuts |
| JournalDatePicker | `JournalDatePicker.svelte` | Navigation semaine          |
| JournalEntryCard  | `JournalEntryCard.svelte`  | Carte resume entree         |
| HomeworkCard      | `HomeworkCard.svelte`      | Carte devoir avec countdown |

**Localisation**: `src/lib/components/journal/`

**Import**:

```typescript
import {
	JournalWeekGrid,
	JournalDatePicker,
	JournalEntryCard,
	HomeworkCard
} from '$lib/components/journal';
```

---

## JournalWeekGrid

Grille hebdomadaire affichant 7 jours avec indicateurs d'etat des entrees.

### Props

```typescript
interface Props {
	/** Jours de la semaine avec entrees */
	days: JournalWeekDay[];

	/** Callback au clic sur un jour */
	onDayClick?: (date: Date) => void;

	/** Mode lecture seule (pas de clic, pas de bouton ajouter) */
	readonly?: boolean;

	/** Classes CSS additionnelles */
	className?: string;
}
```

### Type `JournalWeekDay`

```typescript
interface JournalWeekDay {
	date: Date;
	dayOfWeek: number; // 0=dimanche, 6=samedi
	isToday: boolean;
	isWeekend: boolean;
	entry?: ClassJournalEntry; // Entree si existe
	hasScheduledClass?: boolean; // Cours prevu ce jour
}
```

### Etats visuels

| Etat   | Badge    | Couleur | Condition                 |
| ------ | -------- | ------- | ------------------------- |
| Vide   | "Vide"   | gris    | Pas d'entree              |
| Prevu  | "Prevu"  | orange  | Entree sans contenu cours |
| Fait   | "Fait"   | vert    | Entree avec contenu cours |
| Publie | "Publie" | bleu    | `is_published = true`     |

### Comportement

- **Week-ends**: Grises, non cliquables
- **Aujourd'hui**: Ring bleu, badge "Aujourd'hui"
- **Cours prevu**: Indicateur calendrier si `hasScheduledClass`
- **Click**: Appelle `onDayClick(date)` sauf si readonly/weekend

### Exemple

```svelte
<script lang="ts">
	import { JournalWeekGrid } from '$lib/components/journal';
	import type { JournalWeekDay } from '$lib/types/journal';

	let days: JournalWeekDay[] = $props();

	function handleDayClick(date: Date) {
		const dateStr = date.toISOString().split('T')[0];
		goto(`/dashboard/teacher/cahier-texte/${classId}/${dateStr}`);
	}
</script>

<JournalWeekGrid {days} onDayClick={handleDayClick} />
```

### Legende

Le composant inclut une legende en bas:

- Point orange: Prevu
- Point vert: Fait
- Point bleu: Publie

---

## JournalDatePicker

Navigation entre semaines avec boutons previous/next/today.

### Props

```typescript
interface Props {
	/** Debut de la semaine (lundi) */
	weekStart: Date;

	/** Naviguer semaine precedente */
	onPrevious: () => void;

	/** Naviguer semaine suivante */
	onNext: () => void;

	/** Naviguer semaine courante */
	onToday: () => void;

	/** Est-ce la semaine courante? */
	isCurrentWeek: boolean;
}
```

### Comportement

- **Bouton gauche**: Appelle `onPrevious()`
- **Bouton central**: Affiche la plage de dates OU "Aujourd'hui"
  - Si `isCurrentWeek`: affiche "15 - 21 janv. 2024"
  - Sinon: affiche "Aujourd'hui" (cliquable)
- **Bouton droit**: Appelle `onNext()`

### Format de date

```
15 - 21 janv. 2024        // Meme mois
28 janv. - 3 fevr. 2024   // Mois differents
```

### Exemple

```svelte
<script lang="ts">
	import { JournalDatePicker } from '$lib/components/journal';

	let weekStart = $state(new Date('2024-01-15'));

	function goToPreviousWeek() {
		const current = new Date(weekStart);
		current.setDate(current.getDate() - 7);
		weekStart = current;
	}

	function goToNextWeek() {
		const current = new Date(weekStart);
		current.setDate(current.getDate() + 7);
		weekStart = current;
	}

	function goToCurrentWeek() {
		// Calcul du lundi de la semaine courante
		const now = new Date();
		const day = now.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		now.setDate(now.getDate() + diff);
		weekStart = now;
	}

	let isCurrentWeek = $derived(/* calcul */);
</script>

<JournalDatePicker
	{weekStart}
	onPrevious={goToPreviousWeek}
	onNext={goToNextWeek}
	onToday={goToCurrentWeek}
	{isCurrentWeek}
/>
```

---

## JournalEntryCard

Carte resume pour une entree de journal (utilisee dans les listes).

### Props

```typescript
interface Props {
	/** Entree a afficher */
	entry: JournalEntryWithClass;

	/** Afficher le nom de la classe */
	showClass?: boolean;

	/** Callback au clic */
	onclick?: () => void;
}
```

### Affichage

- Titre: Date formatee (ex: "Lundi 15 janvier")
- Sous-titre: Classe + niveau (si `showClass`)
- Badges: "Cours" (si lesson), "Devoirs" (si homework)
- Preview: Contenu tronque (150 caracteres)
- Footer: Bouton "Voir le detail"

### Exemple

```svelte
<script lang="ts">
	import { JournalEntryCard } from '$lib/components/journal';

	let entries = $props();
</script>

{#each entries as entry (entry.id)}
	<JournalEntryCard {entry} showClass={true} onclick={() => goto(`/entry/${entry.id}`)} />
{/each}
```

---

## HomeworkCard

Carte affichant un devoir avec countdown jusqu'a la date limite.

### Props

```typescript
interface Props {
	/** Devoir a afficher */
	homework: UpcomingHomework;

	/** Callback au clic */
	onclick?: () => void;
}
```

### Type `UpcomingHomework`

```typescript
interface UpcomingHomework {
	id: string;
	classId: string;
	className: string;
	classLevel: string;
	entryDate: string; // Date ou le devoir a ete donne
	homeworkContent: string; // Contenu (HTML)
	homeworkDueDate: string; // Date limite
	daysUntilDue: number; // Calcule cote serveur
}
```

### Countdown

| Valeur `daysUntilDue` | Affichage                | Style       |
| --------------------- | ------------------------ | ----------- |
| < 0                   | "En retard de X jour(s)" | Destructive |
| 0                     | "Aujourd'hui"            | Urgent      |
| 1                     | "Demain"                 | Urgent      |
| 2                     | "Dans 2 jours"           | Urgent      |
| > 2                   | "Dans X jours"           | Normal      |

### Affichage

- Header: Nom classe + niveau
- Badge: "En retard" / "Urgent" / "Devoir"
- Contenu: Preview tronquee (150 caracteres)
- Footer: "Donne le X" + "Dans X jours"
- Date limite: "A rendre : 20 janv. 2024"

### Styles conditionnels

- Bordure orange si urgent (<= 2 jours)
- Bordure rouge si en retard (< 0 jours)

### Exemple

```svelte
<script lang="ts">
	import { HomeworkCard } from '$lib/components/journal';

	let homeworks = $props();
</script>

<div class="space-y-3">
	{#each homeworks as homework (homework.id)}
		<HomeworkCard {homework} onclick={() => goto(`/entry/${homework.id}`)} />
	{/each}
</div>
```

---

## Composants externes utilises

### Shadcn-svelte

| Composant    | Usage                   |
| ------------ | ----------------------- |
| `Card`       | Conteneurs principaux   |
| `Badge`      | Statuts et indicateurs  |
| `Button`     | Navigation et actions   |
| `Breadcrumb` | Navigation hierarchique |
| `Label`      | Labels formulaires      |
| `Input`      | Champs date             |
| `Separator`  | Separation visuelle     |

### Internes

| Composant        | Usage                    |
| ---------------- | ------------------------ |
| `MySelect`       | Selection classe         |
| `MyCheckbox`     | Toggle publication       |
| `RichTextEditor` | Edition contenu Ubumark  |
| `ConfirmDialog`  | Confirmation suppression |

### Lucide-svelte

Icones utilisees:

- `BookOpen` - Cahier de texte
- `FileText` - Contenu cours
- `ClipboardList` - Devoirs
- `Calendar` - Dates
- `Clock` - Countdown
- `Globe` - Publie
- `EyeOff` - Non publie
- `Plus` - Ajouter
- `Save` - Sauvegarder
- `Trash2` - Supprimer
- `ArrowLeft` - Retour
- `ChevronLeft/Right` - Navigation
- `User` - Enseignant
- `AlertCircle` - Urgence

---

## Patterns Svelte 5

### Props avec $props()

```svelte
<script lang="ts">
	interface Props {
		days: JournalWeekDay[];
		onDayClick?: (date: Date) => void;
		readonly?: boolean;
	}

	let { days, onDayClick, readonly = false }: Props = $props();
</script>
```

### Valeurs derivees avec $derived

```svelte
<script lang="ts">
	let isCurrentWeek = $derived(data.days.some((d) => d.isToday));

	let dueDateCountdown = $derived.by(() => {
		const days = homework.daysUntilDue;
		if (days === 0) return "Aujourd'hui";
		if (days === 1) return 'Demain';
		return `Dans ${days} jours`;
	});
</script>
```

### Event handlers (lowercase)

```svelte
<Card.Root
  onclick={() => handleDayClick(day)}
  onkeydown={(e) => e.key === 'Enter' && handleDayClick(day)}
>
```

### Accessibilite

```svelte
<Card.Root
  role={isClickable ? 'button' : undefined}
  tabindex={isClickable ? 0 : -1}
>
```

---

## Styles et Tailwind

### Classes conditionnelles avec cn()

```svelte
<script lang="ts">
  import { cn } from '$lib/utils';
</script>

<Card.Root
  class={cn(
    'relative transition-all',
    day.isWeekend && 'opacity-50',
    isClickable && 'cursor-pointer hover:border-primary/50 hover:shadow-md',
    day.isToday && 'ring-2 ring-primary'
  )}
>
```

### Responsive

```svelte
<!-- Grille responsive -->
<div class="grid gap-4 md:grid-cols-5 lg:grid-cols-7">
	<!-- 1 col mobile, 5 cols tablet, 7 cols desktop -->
</div>
```

### Layout principal

```svelte
<!-- Layout 2/3 + 1/3 -->
<div class="grid gap-8 lg:grid-cols-3">
	<div class="lg:col-span-2">
		<!-- Contenu principal -->
	</div>
	<div class="lg:col-span-1">
		<!-- Sidebar -->
	</div>
</div>
```

---

## Rendu HTML securise

### transformMathHtml

Pour le contenu Ubumark (HTML + math), utiliser:

```svelte
<script lang="ts">
	import { transformMathHtml } from '$lib/utils/sanitize';

	let lessonHtml = $derived(transformMathHtml(entry.lessonContent || ''));
</script>

<div class="prose prose-sm max-w-none dark:prose-invert">
	{@html lessonHtml}
</div>
```

### Styles pour MathLive

```css
<style>
  :global(.math-inline-wrapper) {
    display: inline;
  }
  :global(.math-block-wrapper) {
    display: block;
    text-align: center;
    margin: 1rem 0;
  }
  :global(math-field) {
    font-size: inherit;
  }
</style>
```
