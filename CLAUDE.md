# CLAUDE.md

Guide essentiel pour Claude Code - UbuMaths.

> **Documentation detaillee** : [docs/claude/](docs/claude/)

---

## Project Overview

Application educative de mathematiques pour eleves francophones.

- **Langue** : UI en francais, code/comments en anglais
- **Stack** : Svelte 5 (runes) | TypeScript (strict) | Tailwind CSS 4 | Shadcn-svelte | MathLive | Supabase (free tier) | Vercel | pnpm

---

## Quick Start

```bash
# Development
pnpm dev -- --port 5175    # TOUJOURS utiliser port 5175 (Claude)
pnpm build                 # Build production

# Quality checks
pnpm check                 # Type checking (full)
pnpm check:fast            # TypeScript only (incremental, faster)
pnpm lint                  # ESLint (cached)
pnpm format                # Prettier

# Tests
pnpm test:unit             # Unit tests (Vitest)
pnpm test:triggers         # Database triggers (Docker required)

# Database
pnpm db:start              # Start Supabase local
pnpm db:migrate            # Push migrations

# Release
pnpm release               # Create release (main branch only)
```

**Ports** : 5175 (Claude) | 5173 (User - NE PAS UTILISER) | 54321 (Supabase local)

---

## Code Quality Status

| Check      | Status                         |
| ---------- | ------------------------------ |
| Build      | 0 errors                       |
| ESLint     | 0 errors (29 warnings)         |
| TypeScript | 0 errors                       |
| Tests      | 2,430/2,454 (99.0%)            |
| Security   | CSRF, XSS, 100% Zod validation |

**Standard** : Maintenir 0 errors obligatoire.

---

## Essential Rules (CRITICAL)

### 1. Always Validate Input with Zod

```typescript
import { z } from 'zod';
const schema = z.object({
	userId: z.string().uuid(),
	amount: z.number().int().positive().max(1000)
});
const validation = schema.safeParse(await request.json());
if (!validation.success) throw error(400, validation.error.issues[0].message);
```

**Details** : [quality-standards.md#input-validation-with-zod](docs/claude/quality-standards.md#input-validation-with-zod)

### 2. Always Use MySelect & MyCheckbox Components

```svelte
<!-- MySelect -->
<MySelect type="single" bind:value={selected} {items} />

<!-- MyCheckbox -->
<MyCheckbox bind:checked={isEnabled} label="Enable" />
```

**NEVER use** : Shadcn-svelte Select/Checkbox directly, native `<select>` or `<input type="checkbox">`
**Details** : [ui-components.md](docs/claude/ui-components.md)

### 3. Svelte 5 Runes Only

```svelte
let count = $state(0);              // NOT: let count = 0
let doubled = $derived(count * 2);  // NOT: $: doubled = count * 2
let { title } = $props();           // NOT: export let title
$effect(() => { /* ... */ });       // NOT: $: { /* ... */ }
```

**Details** : [best-practices.md#svelte-5-runes](docs/claude/best-practices.md#svelte-5-runes)

### 4. Never Use `any` Type

Use proper types, `unknown` with type guards, or Database types from `$lib/types/database`.

---

## Agent Reference (OBLIGATOIRE)

**Regle** : TOUJOURS deleguer aux agents specialises. Ne JAMAIS faire directement ce qu'un agent peut faire.

| Agent                   | Trigger                                | Cas d'usage                                |
| ----------------------- | -------------------------------------- | ------------------------------------------ |
| `Explore`               | "Comment marche X ?", "Ou est Y ?"     | Architecture, recherche code, patterns     |
| `frontend-developer`    | Composants Svelte, UI/UX               | Creer/modifier UI, layouts, formulaires    |
| `backend-developer`     | +server.ts, +page.server.ts            | API endpoints, form actions, auth logic    |
| `supabase-expert`       | Migrations, RLS, schema                | Database design, policies, troubleshooting |
| `code-reviewer`         | **PROACTIF** apres chaque code         | Review qualite, best practices             |
| `test-automator`        | Tests, couverture                      | Creer/fixer tests, E2E                     |
| `security-auditor`      | **PROACTIF** apres auth/API sensible   | Audit securite, vulnerabilites             |
| `commit-manager`        | Commits complexes (features, refactor) | Analyser changes, message structure        |
| `documentation-writer`  | **PROACTIF** apres features            | Documenter code, API, features             |
| `performance-optimizer` | Lenteurs, avant deploy                 | Optimiser queries, bundle, load            |
| `typescript-expert`     | Erreurs TS complexes                   | Types avances, generics                    |
| `api-designer`          | Nouveaux endpoints REST                | Architecture API, pagination               |
| `debugger`              | Erreurs, comportement inattendu        | Debug runtime, build, tests                |

### Commits : Agent vs Direct

| Situation                                       | Methode                             |
| ----------------------------------------------- | ----------------------------------- |
| Docs, typos, <5 fichiers evidents               | `git add -A && git commit -m "..."` |
| Features, refactoring, multi-fichiers complexes | `commit-manager` agent              |

### Regle d'Or

**SI** : >3 etapes OU code important OU plusieurs fichiers OU expertise specialisee
**ALORS** : Agent obligatoire. **EXCEPTION** : commits simples (voir ci-dessus).

---

## Planning & Execution Policy

### Chaque plan doit inclure

1. **Agents specifies** pour chaque phase
2. **Code Review** (`code-reviewer`) a la fin de chaque phase
3. **Commit** apres validation (direct ou agent selon complexite)
4. **Security Audit** si auth/API sensible
5. **Performance Audit** si requetes DB lourdes
6. **Quality Checks** (`pnpm lint`, `pnpm check`) a la FIN du plan uniquement
7. **Documentation de progression** tout au long de l'implementation

**IMPORTANT** : Les agents ne doivent PAS executer de commandes lint/format/check. Ces verifications sont faites une seule fois a la fin du plan.

### Documentation de reprise (obligatoire)

Produire des documents de progression pour permettre la reprise en cas de crash :

- **Quand** : Apres chaque phase significative ou commit
- **Ou** : `docs/wip/` (work in progress)
- **Contenu** : Etat actuel, decisions prises, prochaines etapes, fichiers modifies
- **A la fin du plan** : Lister explicitement tous les documents produits

Format suggere : `docs/wip/<feature>-progress.md`

### Execution autonome

- NE JAMAIS s'arreter au premier echec
- Analyser et corriger automatiquement
- Utiliser `debugger` agent si erreur persistante (>2 tentatives)
- Continuer jusqu'a completion totale

### Checklist de validation (avant de terminer une phase)

- [ ] Code fonctionnel
- [ ] Tests passent
- [ ] Code review effectue
- [ ] Security/Performance audit si applicable
- [ ] Commit cree

---

## Database (Supabase)

### Migration Workflow

1. Creer `.sql` dans `supabase/migrations/` (format: `<timestamp>_<description>.sql`)
2. User push via `pnpm db:migrate`
3. Update `src/lib/types/database.ts` et `docs/architecture/database-schema.md`

**Important** : NE PAS modifier le schema dans Supabase Dashboard.
**Details** : [database.md](docs/claude/database.md)

---

## Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable components (Shadcn, MySelect)
│   ├── server/         # Server-only (validation/ = Zod schemas)
│   ├── stores/         # Shared state
│   ├── utils/          # Shared utilities
│   └── types/          # TypeScript types
├── routes/
│   ├── (public)/       # Public routes
│   ├── (protected)/    # Auth required
│   └── api/            # API endpoints (+server.ts)
└── app.html
```

**File Order** : Imports → Types → Constants → Variables → Functions → Components

---

## Common Patterns

```typescript
// Toast notifications
import { toaster } from '$lib/stores/toaster.svelte';
toaster.success('Message'); // error, warning, info

// Event handlers (lowercase in Svelte 5)
<Button onclick={handleClick}>Click</Button>
```

**Optimistic UI, Debouncing, Realtime** : [architecture.md](docs/claude/architecture.md) | [realtime.md](docs/claude/realtime.md)

---

## Pre-Commit Checklist (Mental Review)

Verifier mentalement avant chaque commit (NE PAS executer de commandes lint/format/check) :

- [ ] Zod validation on all `request.json()` and query params
- [ ] Numeric bounds (`.min()`, `.max()`), array limits, UUID validation
- [ ] No `any` types
- [ ] MySelect/MyCheckbox (not Shadcn/native)
- [ ] Svelte 5 runes only
- [ ] Tests exist for new code

Note: `pnpm lint` et `pnpm check` sont executes a la fin du plan uniquement.

---

## Documentation Links

### For Claude Code

| Doc                                                      | Content                           |
| -------------------------------------------------------- | --------------------------------- |
| [architecture.md](docs/claude/architecture.md)           | Structure, routing, performance   |
| [best-practices.md](docs/claude/best-practices.md)       | Svelte 5, TypeScript              |
| [ui-components.md](docs/claude/ui-components.md)         | Shadcn, MySelect, Tailwind        |
| [database.md](docs/claude/database.md)                   | Supabase, migrations              |
| [quality-standards.md](docs/claude/quality-standards.md) | Tests, linting, Zod               |
| [realtime.md](docs/claude/realtime.md)                   | Supabase Realtime, chat, presence |

### For Users

[docs/README.md](docs/README.md) - Index complet

---

**Remember** : Code explicite et simple > astuces clever.
