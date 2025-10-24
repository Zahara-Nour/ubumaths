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
const hasUnreadMessages = messages.some(m => !m.isRead);
const filteredStudents = students.filter(s => s.grade >= 10);

// ❌ MAUVAIS : Noms cryptiques
const x = messages.some(m => !m.isRead);
const temp = students.filter(s => s.grade >= 10);
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
  let { student, onUpdate }: {
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
<div class="bg-background text-foreground border-border">
  <h1 class="text-2xl font-bold">Title</h1>
</div>

<!-- ❌ MAUVAIS : Couleurs hardcodées -->
<div class="bg-white text-black border-gray-300">
  <h1 class="text-2xl font-bold">Title</h1>
</div>
```

### Ordre des classes

Ordre recommandé : Layout → Typography → Colors → Effects

```svelte
<div class="flex flex-col gap-4 p-4 text-lg font-bold bg-primary text-primary-foreground rounded-lg shadow-md">
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
  let { value, onChange }: {
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
<!-- ❌ MAUVAIS : Logique dans template -->
<div>
  {students.filter(s => s.isActive).sort((a, b) => a.name.localeCompare(b.name)).length} students
</div>

<script lang="ts">
  // ✅ BON : Logique dans script
  let activeStudentCount = $derived(
    students.filter(s => s.isActive).sort((a, b) => a.name.localeCompare(b.name)).length
  );
</script>

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

## ✅ Checklist avant commit

- [ ] Code formaté avec Prettier (`pnpm format`)
- [ ] Pas d'erreurs TypeScript (`pnpm check`)
- [ ] Tests unitaires passent (`pnpm test:unit`)
- [ ] Pas de `console.log` oubliés
- [ ] Noms de variables/fonctions descriptifs
- [ ] Early returns utilisés
- [ ] Types explicites (pas de `any`)
- [ ] Components Svelte 5 (runes, pas export let)
- [ ] Event handlers préfixés avec "handle"
- [ ] Classes Tailwind sémantiques

---

## 📚 Ressources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Svelte 5 Docs](https://svelte.dev/docs/svelte/overview)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)

---

[← Retour au développement](README.md)
