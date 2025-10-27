# CLAUDE.md

Guide essentiel pour Claude Code lors du développement d'UbuMaths.

> **📚 Documentation complète** : Voir [/docs/README.md](docs/README.md)

---

## 🎯 Project Overview

Application éducative de mathématiques pour élèves francophones.

**Langue** : UI en français, code/comments en anglais
**Stack** : Svelte 5 (runes) • TypeScript (strict) • Tailwind CSS 4 • Shadcn-svelte • MathLive • Supabase • Vercel • pnpm

---

## 🚀 Quick Start

```bash
pnpm dev              # Démarre le serveur dev
pnpm build            # Build production
pnpm check            # Type checking
pnpm lint             # Vérification format/lint
pnpm format           # Formatage code
pnpm test:unit        # Tests unitaires (Vitest)
pnpm db:migrate       # Push migrations Supabase
pnpm release          # Créer une release (main branch)
```

### Ports de développement

- **5173** : Port utilisateur (NE PAS UTILISER)
- **5175** : Port Claude (TOUJOURS UTILISER : `pnpm dev -- --port 5175`)

---

## 📊 Code Quality

**🎯 Current Status** (Updated: 2025-10-27 - Post-Audit)

- ✅ **Build**: Passing, no errors
- ✅ **Prettier**: All files formatted
- ✅ **ESLint (Production)**: 0 errors in main codebase
- ✅ **ESLint (Tests)**: 0 errors (was 57) - **NEW: All test file errors fixed!**
- ✅ **TypeScript (Production)**: 0 errors in main codebase
- ✅ **Test Suite**: 2,064/2,088 passing (98.8% pass rate, 24 skipped)
- ⚠️ **ESLint (Warnings)**: 29 warnings (legitimate Svelte reactivity patterns)

**Achievement**: 100% error-free codebase + fixed all 57 test file type errors

**Security** (NEW):

- ✅ **CSRF Protection**: Implemented in hooks.server.ts (origin validation)
- ✅ **XSS Prevention**: DOMPurify sanitization on all user-generated content
- ✅ **Admin Authorization**: Role checks added to all admin API endpoints
- ✅ **AI Chatbot**: Rate limited (5 req/15min) + authenticated

**Performance** (NEW):

- ✅ **Assessment Results**: 90% faster (3.6s → 0.4s load time)
- ✅ **Database Indexes**: 13 new indexes for hot paths
- ✅ **N+1 Queries**: Eliminated in assessment results (244 → 6 queries, 97% reduction)

**Standards**:

- **Avant commit**: Automatique via `lint-staged` hook
- **Nouveau code**: Maintenir 0 errors obligatoire
- **Tests**: All new code must have tests, 100% pass rate required

### 🚨 IMPORTANT: Efficient Linting Strategy

**NEVER** run `pnpm eslint . --no-cache` or full uncached lint - it takes ~30s.

**✅ DO** (Fast & Efficient):

```bash
# 1. After making changes - lint ONLY changed files
pnpm eslint path/to/changed/file.ts --cache

# 2. Before major steps - lint specific directory
pnpm eslint src/lib/exercises/ --cache

# 3. Final verification - full cached lint (3-5s)
pnpm lint  # Uses --cache by default now
```

**Why?**

- ESLint cache makes subsequent runs **6-10x faster** (30s → 3-5s)
- Linting specific files is **instant** (~0.5s)
- `lint-staged` runs automatically on commit (only staged files)

**Pre-commit Hook**:

- Automatically runs `lint-staged` on `git commit`
- Lints & formats only staged files (~1-2s)
- Auto-fixes issues when possible
- **Blocks commit** if errors remain

---

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── components/     # Composants réutilisables
│   ├── server/         # Utilitaires server-only
│   ├── stores/         # État partagé
│   ├── utils/          # Utilitaires partagés
│   └── types/          # Types TypeScript
├── routes/
│   ├── (public)/       # Routes publiques
│   ├── (protected)/    # Routes protégées (auth auto)
│   ├── api/            # API endpoints
│   └── +layout.svelte
└── app.html
```

**Ordre des fichiers** : Imports → Types → Constants → Variables → Functions → Components

---

## ⚠️ Erreurs courantes à éviter

### ❌ DON'T

```svelte
<!-- Svelte 5 deprecations -->
<script>
	export let myProp; // ❌ Use $props()
	$: computed = x * 2; // ❌ Use $derived()
	$: {
		/* effect */
	} // ❌ Use $effect()
</script>
```

```typescript
// TypeScript anti-patterns
const data: any = fetchData(); // ❌ NEVER use 'any' type
const result: any = processUser(user); // ❌ Breaks type safety
function handleEvent(event: any) {} // ❌ Disables type checking
```

### ✅ DO

```svelte
<script>
	let { myProp } = $props(); // ✅ Svelte 5 runes
	let computed = $derived(x * 2);
	$effect(() => {
		/* effect */
	});
</script>
```

```typescript
// TypeScript best practices
import type { Database } from '$lib/types/database';
type User = Database['public']['Tables']['users']['Row'];

const data: User = fetchData(); // ✅ Use proper types from database
const result: ProcessedUser = processUser(user); // ✅ Define custom types
function handleEvent(event: MouseEvent) {} // ✅ Use specific types

// For truly unknown types, use 'unknown' and narrow with type guards
const data: unknown = fetchData();
if (isUser(data)) {
	// Now TypeScript knows data is User
}
```

**🚨 CRITICAL: Never use `any` type**

- **Project Standard**: `@typescript-eslint/no-explicit-any` is enforced
- **Why it matters**: `any` disables TypeScript's type checking and hides bugs
- **Impact**: Fixed 209 `any` violations in test files (2025-10-27)
- **Alternatives**: Use specific types, `unknown` with type guards, or generics
- **Reference**: [Type Safety Patterns](docs/development/type-safety-patterns.md)

---

## 🎨 UI Components

### Shadcn-svelte Components

**Docs** : https://www.shadcn-svelte.com/docs
**Location** : `src/lib/components/ui/`

**Disponibles** : Button, Input, Textarea, Dropdown Menu, Avatar, Tabs, Separator

**Ajouter un composant** : `npx shadcn-svelte@latest add <component>`

### MySelect Component (Select Dropdowns)

**Location** : `src/lib/components/MySelect.svelte`
**Built on** : Bits UI Select (SSR-compatible)

**✅ ALWAYS use MySelect** for all dropdown/select components

**❌ NEVER use** :

- Shadcn-svelte Select (`import * as Select from '$lib/components/ui/select'`)
- Native HTML `<select>` elements

**Why MySelect?** :

- SSR-compatible (unlike Shadcn Select)
- Consistent API across entire codebase
- Built on Bits UI Select (stable, well-tested)
- Accessible, keyboard navigation
- Svelte 5 runes compatible

**Usage** :

```svelte
<script>
	import MySelect from '$lib/components/MySelect.svelte';

	// Two-way binding with $state
	let selectedValue = $state('option1');

	const items = [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' },
		{ value: 'option3', label: 'Option 3', disabled: true }
	];
</script>

<MySelect
	type="single"
	bind:value={selectedValue}
	{items}
	placeholder="Select an option"
	triggerClass="h-9 w-40 rounded-md border" // Optional custom styling
/>
```

**Props** :

- `type`: `"single"` or `"multiple"` (Bits UI Select API)
- `value`: Bindable value (`bind:value`)
- `items`: Array of `{ value: string, label: string, disabled?: boolean }`
- `placeholder`: Optional placeholder text (default: "Select...")
- `triggerClass`: Optional CSS classes for trigger button
- `contentProps`: Optional props for Select.Content (Bits UI)

**Important** : Requires `export const prerender = false;` in `+page.ts` for SSR compatibility

**Standardization (2025-10-27)** : All 20 files using Select/select have been refactored to MySelect
**Documentation** : See [Component Architecture](docs/architecture/components.md)
**Référence** : `src/routes/(public)/games/mathemo/+page.svelte` (lines 26, 262-267)

### Patterns importants

```svelte
<!-- Event handlers -->
<Button onclick={handleClick}>  <!-- ✅ lowercase -->

<!-- Imports -->
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import MySelect from '$lib/components/MySelect.svelte';

<!-- Toast notifications -->
import { toaster } from '$lib/stores/toaster.svelte';
toaster.success('Message');  // error, warning, info
```

---

## 🗃️ Database (Supabase)

### Workflow migrations

1. **Claude crée** `.sql` dans `supabase/migrations/` (format : `<timestamp>_<description>.sql`)
2. **User push** via `pnpm db:migrate`
3. **Update** `src/lib/types/database.ts` et `docs/architecture/database-schema.md`

**Important** :

- NE PAS modifier le schéma dans Supabase Dashboard
- Toujours créer migrations timestampées
- Garder la documentation synchronisée

---

## 💾 Svelte 5 Runes

```typescript
// État réactif
let count = $state(0);

// Valeurs dérivées
let doubled = $derived(count * 2);

// Effets de bord
$effect(() => {
	console.log(`count is ${count}`);
});

// Props de composant
let { title, count = 0 } = $props();

// Props bindables (two-way binding)
let { value = $bindable() } = $props();
```

**Anti-patterns** :

- ❌ `$:` reactive statements → Utiliser `$derived()` ou `$effect()`
- ❌ `export let` → Utiliser `$props()`
- ❌ `<svelte:component>` → Référence directe du composant

---

## ⚡ Performance Pattern : Optimistic UI + Debouncing

Pour les updates serveur fréquentes (compteurs, quantités) :

```typescript
let optimistic = $state<Record<string, number>>({});
let debounceTimer: ReturnType<typeof setTimeout>;

function handleUpdate(id: string, delta: number) {
	// 1. Update optimiste immédiat
	optimistic[id] = (optimistic[id] || 0) + delta;

	// 2. Debounce update serveur
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			await updateServer(id, optimistic[id]);
			optimistic[id] = 0; // Reset
		} catch (error) {
			optimistic[id] = 0; // Rollback on error
		}
	}, 500);
}
```

**Référence** : `src/routes/(protected)/dashboard/teacher/rewards/+page.svelte`

---

## 📚 Documentation

### Structure complète

- **Master index** : [docs/README.md](docs/README.md)
- **Features** : [docs/features/](docs/features/)
- **Architecture** : [docs/architecture/](docs/architecture/)
- **Guides** : [docs/guides/](docs/guides/)
- **Development** : [docs/development/](docs/development/)
- **Contributing** : [docs/contributing/](docs/contributing/)

### Documentation par feature

| Feature          | Documentation                                                      |
| ---------------- | ------------------------------------------------------------------ |
| Questions        | [docs/features/questions/](docs/features/questions/)               |
| Assessments      | [docs/features/assessments/](docs/features/assessments/)           |
| SRS/Flashcards   | [docs/features/srs-flashcards/](docs/features/srs-flashcards/)     |
| Riddles          | [docs/features/riddles/](docs/features/riddles/)                   |
| Geometry         | [docs/features/geometry/](docs/features/geometry/)                 |
| Error Monitoring | [docs/features/error-monitoring/](docs/features/error-monitoring/) |

### Documentation technique

- **Database Schema** : [docs/architecture/database-schema.md](docs/architecture/database-schema.md)
- **Git Workflow** : [docs/development/git-workflow.md](docs/development/git-workflow.md)
- **Version Management** : [docs/development/version-management.md](docs/development/version-management.md)
- **Student Import** : [docs/guides/student-import.md](docs/guides/student-import.md)

---

## 🤝 Contribution

Avant de contribuer, lire :

- [Guide de contribution](docs/contributing/README.md)
- **[Guide de documentation](docs/contributing/documentation-guide.md)** ⭐

---

**Remember** : Préférer le code explicite et simple plutôt que les astuces clever.
