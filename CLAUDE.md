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

- ✅ Prettier passing, build succeeds
- ⚠️ ~280 ESLint warnings non-bloquants (types complexes, tests)
- **Avant commit** : `pnpm format`
- **Nouveau code** : Corriger les ESLint errors

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
  export let myProp;  // ❌ Use $props()
  $: computed = x * 2;  // ❌ Use $derived()
  $: { /* effect */ }  // ❌ Use $effect()
</script>

<!-- UI Components -->
<Select.Root>  <!-- ❌ Shadcn Select buggy -->
  <Select.Trigger />
</Select.Root>
```

### ✅ DO

```svelte
<script>
  let { myProp } = $props();  // ✅ Svelte 5 runes
  let computed = $derived(x * 2);
  $effect(() => { /* effect */ });
</script>

<!-- UI Components -->
<select class="...">  <!-- ✅ Native HTML select -->
  <option>Option 1</option>
</select>
```

---

## 🎨 UI Components (Shadcn-svelte)

**Docs** : https://www.shadcn-svelte.com/docs
**Location** : `src/lib/components/ui/`

**Disponibles** : Button, Input, Textarea, Dropdown Menu, Avatar, Tabs, Separator

**⚠️ NE PAS utiliser** : Shadcn Select (utiliser `<select>` HTML natif)

**Ajouter un composant** : `npx shadcn-svelte@latest add <component>`

### Patterns importants

```svelte
<!-- Event handlers -->
<Button onclick={handleClick}>  <!-- ✅ lowercase -->

<!-- Imports -->
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

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

| Feature | Documentation |
|---------|--------------|
| Questions | [docs/features/questions/](docs/features/questions/) |
| Assessments | [docs/features/assessments/](docs/features/assessments/) |
| SRS/Flashcards | [docs/features/srs-flashcards/](docs/features/srs-flashcards/) |
| Riddles | [docs/features/riddles/](docs/features/riddles/) |
| Geometry | [docs/features/geometry/](docs/features/geometry/) |
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
