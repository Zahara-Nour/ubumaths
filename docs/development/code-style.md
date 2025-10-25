# 🎨 Style de code

Standards de code et conventions pour UbuMaths.

---

## 📋 Principes généraux

### 1. Clarity over Cleverness

Préférer du code explicite et compréhensible plutôt que des solutions trop astucieuses.

```typescript
// ✅ BON : Clair et explicite
function isAdult(age: number): boolean {
	return age >= 18;
}

// ❌ MAUVAIS : Trop clever
const isAdult = (age: number) => !!(age - 18 + 1);
```

### 2. Early Returns

Utiliser des early returns pour réduire la complexité.

```typescript
// ✅ BON : Early returns
function processUser(user: User | null) {
	if (!user) return;
	if (!user.isActive) return;

	// Logique principale
	updateUserData(user);
}

// ❌ MAUVAIS : Nested conditions
function processUser(user: User | null) {
	if (user) {
		if (user.isActive) {
			updateUserData(user);
		}
	}
}
```

### 3. Noms descriptifs

Utiliser des noms clairs qui expliquent l'intention.

```typescript
// ✅ BON : Noms descriptifs
const hasUnreadMessages = messages.some((m) => !m.isRead);
const filteredStudents = students.filter((s) => s.grade >= 10);

// ❌ MAUVAIS : Noms cryptiques
const x = messages.some((m) => !m.isRead);
const temp = students.filter((s) => s.grade >= 10);
```

---

## 🔧 TypeScript

### Types stricts

```typescript
// ✅ BON : Types explicites
interface Student {
	id: string;
	name: string;
	grade: number;
}

function getStudent(id: string): Student | null {
	// ...
}

// ❌ MAUVAIS : any partout
function getStudent(id: any): any {
	// ...
}
```

### Utiliser const et let

```typescript
// ✅ BON : const par défaut
const API_URL = 'https://api.example.com';
const students = await fetchStudents();

// ❌ MAUVAIS : var ou let inutile
var API_URL = 'https://api.example.com';
let students = await fetchStudents(); // Ne change jamais
```

---

## 🎭 Svelte 5 Patterns

### Runes

```svelte
<script lang="ts">
	// ✅ BON : Utiliser runes
	let count = $state(0);
	let doubled = $derived(count * 2);

	// ❌ MAUVAIS : Anciennes APIs
	let count = 0;
	$: doubled = count * 2;
</script>
```

### Props

```svelte
<script lang="ts">
	// ✅ BON : $props()
	let {
		student,
		onUpdate
	}: {
		student: Student;
		onUpdate: (s: Student) => void;
	} = $props();

	// ❌ MAUVAIS : export let
	export let student: Student;
	export let onUpdate: (s: Student) => void;
</script>
```

### Event Handlers

```svelte
<script lang="ts">
	// ✅ BON : Préfixer avec "handle"
	function handleSubmit() {
		// ...
	}

	function handleDelete() {
		// ...
	}
</script>

<!-- Lowercase events (Svelte 5) -->
<button onclick={handleSubmit}>Submit</button>
<button onclick={handleDelete}>Delete</button>
```

---

## 📂 Organisation des fichiers

### Structure d'un composant

```svelte
<script lang="ts">
	// 1. Imports
	import { Button } from '$lib/components/ui/button';
	import type { Student } from '$lib/types/student';

	// 2. Types
	interface Props {
		student: Student;
		onSave: (s: Student) => void;
	}

	// 3. Props
	let { student, onSave }: Props = $props();

	// 4. State
	let isEditing = $state(false);

	// 5. Derived
	let displayName = $derived(`${student.firstName} ${student.lastName}`);

	// 6. Functions
	function handleEdit() {
		isEditing = true;
	}

	function handleSave() {
		onSave(student);
		isEditing = false;
	}
</script>

<!-- 7. Markup -->
<div class="student-card">
	{#if isEditing}
		<!-- Edit mode -->
	{:else}
		<!-- View mode -->
	{/if}
</div>

<!-- 8. Styles (si nécessaire) -->
<style>
	.student-card {
		/* ... */
	}
</style>
```

### Structure d'un module

```typescript
// 1. Imports
import type { User } from '$lib/types/user';
import { supabase } from '$lib/supabase';

// 2. Types
export interface CreateUserParams {
	email: string;
	name: string;
}

// 3. Constants
const MAX_RETRIES = 3;

// 4. Variables (si nécessaire)
let cache: Map<string, User> = new Map();

// 5. Functions
export async function createUser(params: CreateUserParams): Promise<User> {
	// ...
}

export async function getUser(id: string): Promise<User | null> {
	// ...
}
```

---

## 🎨 Tailwind CSS

### Classes sémantiques

```svelte
<!-- ✅ BON : Classes sémantiques -->
<div class="border-border bg-background text-foreground">
	<h1 class="text-2xl font-bold">Title</h1>
</div>

<!-- ❌ MAUVAIS : Couleurs hardcodées -->
<div class="border-gray-300 bg-white text-black">
	<h1 class="text-2xl font-bold">Title</h1>
</div>
```

### Ordre des classes

Ordre recommandé : Layout → Typography → Colors → Effects

```svelte
<div
	class="flex flex-col gap-4 rounded-lg bg-primary p-4 text-lg font-bold text-primary-foreground shadow-md"
>
	<!-- Layout → Typography → Colors → Effects -->
</div>
```

### Responsive design

```svelte
<!-- Mobile-first approach -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
	<!-- Cards -->
</div>
```

---

## 🚫 Anti-patterns à éviter

### 1. Mutation directe de props

```svelte
<script lang="ts">
	let { value }: { value: number } = $props();

	// ❌ MAUVAIS : Mutation directe
	function increment() {
		value++; // Error!
	}

	// ✅ BON : Callback
	let {
		value,
		onChange
	}: {
		value: number;
		onChange: (n: number) => void;
	} = $props();

	function increment() {
		onChange(value + 1);
	}
</script>
```

### 2. Logique complexe dans template

```svelte
<script lang="ts">
	// ✅ BON : Logique dans script
	let activeStudentCount = $derived(
		students.filter((s) => s.isActive).sort((a, b) => a.name.localeCompare(b.name)).length
	);
</script>

<!-- ❌ MAUVAIS : Logique dans template -->
<div>
	{students.filter((s) => s.isActive).sort((a, b) => a.name.localeCompare(b.name)).length} students
</div>

<div>{activeStudentCount} students</div>
```

### 3. Console.log oubliés

```typescript
// ❌ MAUVAIS : Console.log en production
function processData(data: Data) {
	console.log('Processing:', data); // À enlever!
	return transform(data);
}

// ✅ BON : Utiliser un logger ou enlever
function processData(data: Data) {
	return transform(data);
}
```

---

## ⚙️ Configuration ESLint

### Règles désactivées

Certaines règles ESLint sont désactivées car elles produisent de faux positifs pour des patterns légitimes :

```javascript
// eslint.config.js
rules: {
  // ❌ Désactivé : Nécessaire pour canvas/WebGL (MathGraph32, MathLive)
  'svelte/no-dom-manipulating': 'off',

  // ❌ Désactivé : Nécessaire pour le rendu Markdown sanitisé
  'svelte/no-at-html-tags': 'off',

  // ⚠️ Warning : Parfois $state est plus approprié que les wrappers Svelte
  'svelte/prefer-svelte-reactivity': 'warn',

  // ⚠️ Warning : Parfois $state + $effect est plus clair que $derived
  'svelte/prefer-writable-derived': 'warn',

  // ❌ Désactivé : On utilise des string literals statiques (safe)
  'svelte/no-navigation-without-resolve': 'off'
}
```

### Cas d'usage légitimes

**DOM Manipulation** : Requis pour :

- Canvas 2D/WebGL dans les démos de géométrie
- Intégration MathLive (éditeur d'équations)
- Bibliothèque MathGraph32

**{@html} Tags** : Utilisé pour :

- Rendu de contenu Markdown dans les énigmes et défis
- Affichage de HTML sanitisé (toujours passer par sanitize())

**$state vs Wrappers** : Préférer $state quand :

- La performance est critique
- L'objet est petit et local au composant
- La complexité des wrappers n'apporte pas de valeur

---

## 📊 État du Linting

### Statut actuel

**58 problèmes** (34 erreurs, 24 warnings)

**Réduction de 93.2%** depuis le début du projet (~853 erreurs initiales)

### Historique des corrections

#### Phase 1 : Nettoyage ESLint (~795 erreurs corrigées)

**Regex escapes** (2 erreurs)

- Correction des échappements inutiles dans les classes de caractères
- `src/lib/utils/passwordStrength.ts`

**Missing keys** (7 erreurs)

- Ajout de keys uniques dans tous les blocs `{#each}`
- Fichiers concernés :
  - `src/routes/(protected)/dashboard/admin/notifications/+page.svelte`
  - `src/routes/(protected)/dashboard/admin/questions/[id]/preview/+page.svelte`
  - `src/routes/(protected)/dashboard/teacher/assessments/new/+page.svelte`
  - `src/routes/(protected)/dashboard/teacher/notifications/+page.svelte`

**Unused variables** (2 erreurs)

- Préfixage avec underscore selon la convention
- Fichiers concernés :
  - `src/routes/(protected)/dashboard/revisions/create/+page.svelte`
  - `src/routes/(protected)/dashboard/teacher/assessments/[id]/assign/+page.server.ts`

**Unused expressions** (3 erreurs)

- Utilisation de l'opérateur `void` pour les triggers réactifs intentionnels
- `src/routes/(protected)/dashboard/teacher/message-templates/+page.svelte`

**Type safety - `any` → `unknown`** (20 erreurs)

- Remplacement de `any` par `unknown` pour une meilleure sécurité de type
- 8 fichiers modifiés (admin, teacher, navadra routes)

**Configuration ESLint** (24 erreurs → warnings/supprimées)

- Désactivation de règles trop strictes pour des patterns légitimes
- Documentation des cas d'usage

### Erreurs restantes (34 erreurs, 24 warnings)

#### Erreurs acceptables

**Patterns légitimes** (2 erreurs)

- DOM manipulation pour Canvas/WebGL (MathGraph32, géométrie)
- `{@html}` pour rendu Markdown sanitisé (énigmes, défis)

**Code legacy** (32 erreurs)

- Ancien code nécessitant une refactorisation majeure
- À corriger progressivement lors de la maintenance
- Types manquants, patterns Svelte 4, variables non utilisées

#### Warnings acceptables (24 warnings)

- `svelte/prefer-svelte-reactivity`: Parfois $state est plus performant
- `svelte/prefer-writable-derived`: Parfois $state + $effect est plus clair
- Warnings de type: À corriger progressivement

### Recommandations

**Pour le nouveau code** :

- ✅ Corriger toutes les erreurs ESLint
- ✅ Utiliser `unknown` au lieu de `any`
- ✅ Ajouter des keys à tous les `{#each}`
- ✅ Préfixer les variables non utilisées avec `_`
- ✅ Utiliser les runes Svelte 5

**Pour le code legacy** :

- 🔄 Corriger progressivement lors de la maintenance
- 🔄 Prioriser les erreurs de sécurité de type
- 🔄 Documenter les exceptions légitimes

---

## ✅ Checklist avant commit

- [ ] Code formaté avec Prettier (`pnpm format`)
- [ ] Pas d'erreurs TypeScript (`pnpm check`)
- [ ] Tests unitaires passent (`pnpm test:unit`)
- [ ] Lint passé (`pnpm lint`) - 58 problèmes max acceptés
- [ ] Pas de `console.log` oubliés
- [ ] Noms de variables/fonctions descriptifs
- [ ] Early returns utilisés
- [ ] Types explicites (pas de `any`, utiliser `unknown`)
- [ ] Components Svelte 5 (runes, pas export let)
- [ ] Event handlers préfixés avec "handle"
- [ ] Classes Tailwind sémantiques
- [ ] Keys ajoutées à tous les `{#each}` blocs

---

## 📚 Ressources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Svelte 5 Docs](https://svelte.dev/docs/svelte/overview)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)

---

[← Retour au développement](README.md)
