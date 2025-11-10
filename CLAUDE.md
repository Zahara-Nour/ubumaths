# CLAUDE.md

Guide essentiel pour Claude Code lors du développement d'UbuMaths.

> **📚 Documentation détaillée** : Voir [docs/claude/](docs/claude/) pour architecture, best practices, et quality standards

---

## 🎯 Project Overview

Application éducative de mathématiques pour élèves francophones.

**Langue** : UI en français, code/comments en anglais
**Stack** : Svelte 5 (runes) • TypeScript (strict) • Tailwind CSS 4 • Shadcn-svelte • MathLive • Supabase • Vercel • pnpm

---

## 🚀 Quick Start

```bash
# Development
pnpm dev -- --port 5175    # TOUJOURS utiliser port 5175 (Claude)
pnpm build                 # Build production

# Quality checks
pnpm check                 # Type checking (TypeScript + Svelte) - full check
pnpm check:fast            # TypeScript only (incremental, much faster)
pnpm check:changed         # Check only changed files since HEAD
pnpm check:staged          # Check only staged files (for pre-commit)
pnpm lint                  # ESLint (cached, fast)
pnpm format                # Prettier formatting

# Tests
pnpm test:unit             # Unit tests (Vitest)
pnpm test:triggers         # Database triggers (Docker required)

# Database
pnpm db:start              # Start Supabase local (Docker)
pnpm db:stop               # Stop Supabase local
pnpm db:migrate            # Push migrations to Supabase

# Release
pnpm release               # Create release (main branch only)
```

### Ports de développement

- **5175** : Port Claude ✅ TOUJOURS UTILISER
- **5173** : Port utilisateur ❌ NE PAS UTILISER
- **54321** : Supabase local (tests de triggers)

---

## 📊 Code Quality Standards

**Current Status** (Updated: 2025-10-28)

- ✅ **Build**: Passing, 0 errors
- ✅ **ESLint**: 0 errors (29 warnings - legitimate Svelte patterns)
- ✅ **TypeScript**: 0 errors in production + tests
- ✅ **Tests**: 2,430/2,454 passing (99.0% pass rate)
- ✅ **Security**: CSRF, XSS protection, 100% API validation with Zod

**Standards** : Maintenir 0 errors obligatoire • Tests requis • Pre-commit hook automatique

**📖 Détails** : [docs/claude/quality-standards.md](docs/claude/quality-standards.md)

---

## ⚡ Essential Rules

### 🚨 CRITICAL: Always Validate Input with Zod

**❌ NEVER** accept user input without validation:

```typescript
const body = await request.json();
const { userId, amount } = body; // ❌ CRITICAL SECURITY VIOLATION
```

**✅ ALWAYS** use Zod schemas:

```typescript
import { z } from 'zod';

const schema = z.object({
	userId: z.string().uuid(),
	amount: z.number().int().positive().max(1000)
});

const validation = schema.safeParse(await request.json());
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
const { userId, amount } = validation.data; // ✅ Type-safe AND validated
```

**📖 Complete Guide** : [docs/claude/quality-standards.md#input-validation-with-zod](docs/claude/quality-standards.md#input-validation-with-zod)

---

### 🧩 CRITICAL: Always Use MySelect Component

**✅ Use** : `import MySelect from '$lib/components/MySelect.svelte';`
**❌ NEVER use** : Shadcn-svelte Select or native `<select>` elements

```svelte
<script>
	let selectedValue = $state('option1');
	const items = [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' }
	];
</script>

<MySelect type="single" bind:value={selectedValue} {items} />
```

**Why?** SSR-compatible, consistent API, Svelte 5 runes.
**📖 Complete Guide** : [docs/claude/ui-components.md#myselect-component](docs/claude/ui-components.md#myselect-component)

---

### ☑️ CRITICAL: Always Use MyCheckbox Component

**✅ Use** : `import MyCheckbox from '$lib/components/MyCheckbox.svelte';`
**❌ NEVER use** : Shadcn-svelte Checkbox directly or native `<input type="checkbox">` elements

```svelte
<script>
	let isEnabled = $state(false);
</script>

<MyCheckbox bind:checked={isEnabled} label="Enable notifications" />
<MyCheckbox bind:checked={isTest} disabled label="Test account" />
<MyCheckbox bind:checked={agree} required label="I agree to terms" />
```

**Why?** Consistent API, Svelte 5 runes, wraps Shadcn-svelte Checkbox with label management.
**Props** : `checked` (bindable), `disabled`, `required`, `label`, `onCheckedChange`
**📖 Complete Guide** : [docs/claude/ui-components.md#mycheckbox-component](docs/claude/ui-components.md#mycheckbox-component)

---

### 💾 Svelte 5 Runes (Not Svelte 4)

**✅ DO** (Svelte 5):

```svelte
<script>
	let count = $state(0); // Reactive state
	let doubled = $derived(count * 2); // Computed value
	let { title, count = 0 } = $props(); // Component props

	$effect(() => {
		console.log(`count: ${count}`); // Side effects
	});
</script>
```

**❌ DON'T** (Svelte 4 - deprecated):

```svelte
<script>
	export let myProp; // ❌ Use $props()
	$: computed = x * 2; // ❌ Use $derived()
	$: {
		/* effect */
	} // ❌ Use $effect()
</script>
```

**📖 Complete Guide** : [docs/claude/best-practices.md#svelte-5-runes](docs/claude/best-practices.md#svelte-5-runes)

---

### 🚫 TypeScript: Never Use `any` Type

**❌ NEVER**:

```typescript
const data: any = fetchData(); // ❌ Disables type checking
function handleEvent(event: any) {} // ❌ Hides bugs
```

**✅ ALWAYS use proper types**:

```typescript
import type { Database } from '$lib/types/database';
type User = Database['public']['Tables']['users']['Row'];

const data: User = fetchData(); // ✅ Type-safe
function handleEvent(event: MouseEvent) {} // ✅ Specific type

// For unknown types, use 'unknown' + type guards
const data: unknown = fetchData();
if (isUser(data)) {
	/* now data is User */
}
```

**Why?** `@typescript-eslint/no-explicit-any` is enforced. Fixed 209 violations in 2025-10-27.
**📖 Alternatives** : [docs/claude/best-practices.md#typescript-best-practices](docs/claude/best-practices.md#typescript-best-practices)

---

## 🤖 CRITICAL: Agent Usage Policy

**RÈGLE ABSOLUE** : Claude doit TOUJOURS déléguer aux agents spécialisés. Ne JAMAIS faire directement ce qu'un agent devrait faire.

### 🔍 Explore Agent - `subagent_type=Explore`

**QUAND UTILISER** (OBLIGATOIRE):

- Comprendre comment une fonctionnalité fonctionne
- Chercher où quelque chose est implémenté (sauf si fichier précis connu)
- Découvrir la structure du code
- Trouver des patterns ou conventions
- Analyser l'architecture
- Répondre à "Comment marche X ?" ou "Où est implémenté Y ?"

**❌ NE JAMAIS faire directement**:

```bash
# ❌ INTERDIT
pnpm exec grep -r "pattern" src/
find src/ -name "*.svelte"
```

**✅ TOUJOURS utiliser**:

```typescript
// ✅ OBLIGATOIRE
Task tool with subagent_type=Explore
```

**EXEMPLES**:

- User: "Où sont gérées les erreurs client ?" → Explore agent
- User: "Comment fonctionne l'authentification ?" → Explore agent
- User: "Quelle est la structure du codebase ?" → Explore agent

---

### 🎨 Frontend Developer Agent - `subagent_type=frontend-developer`

**QUAND UTILISER** (OBLIGATOIRE):

- Créer/modifier des composants Svelte
- Implémenter des interfaces utilisateur
- Améliorer l'UX/UI
- Créer des layouts responsive
- Intégrer Shadcn-svelte, Tailwind, Bits UI
- Travailler sur des formulaires/modals/cartes
- Améliorer l'accessibilité visuelle

**❌ NE JAMAIS faire directement**:

```svelte
<!-- ❌ INTERDIT de créer/modifier directement -->
<script>
	let count = $state(0);
</script>

<Button onclick={() => count++}>Click</Button>
```

**✅ TOUJOURS utiliser**:

```typescript
// ✅ OBLIGATOIRE pour tout travail UI
Task tool with subagent_type=frontend-developer
```

**EXEMPLES**:

- User: "Crée un composant carte pour afficher les stats" → frontend-developer
- User: "Le formulaire n'est pas user-friendly" → frontend-developer
- User: "Le sidebar ne marche pas sur mobile" → frontend-developer
- Après avoir créé un endpoint API → frontend-developer (proactif)

---

### 🔧 Backend Developer Agent - `subagent_type=backend-developer`

**QUAND UTILISER** (OBLIGATOIRE):

- Créer/modifier des endpoints API (+server.ts)
- Implémenter des fonctions de chargement serveur (+page.server.ts)
- Créer des form actions
- Optimiser des requêtes database
- Implémenter auth/authorization logic
- Gérer uploads de fichiers
- Implémenter caching
- Debug de performance serveur

**❌ NE JAMAIS faire directement**:

```typescript
// ❌ INTERDIT de créer directement
// src/routes/api/students/+server.ts
export async function GET({ request }) {
	// ...
}
```

**✅ TOUJOURS utiliser**:

```typescript
// ✅ OBLIGATOIRE pour backend
Task tool with subagent_type=backend-developer
```

**EXEMPLES**:

- User: "Crée un endpoint pour récupérer les résultats paginés" → backend-developer
- User: "Cette requête est trop lente" → backend-developer
- User: "Ajoute une action pour créer des devoirs" → backend-developer

---

### 💾 Supabase Expert Agent - `subagent_type=supabase-expert`

**QUAND UTILISER** (OBLIGATOIRE):

- Créer/modifier des migrations database
- Designer un schéma de tables
- Créer/réviser des RLS policies
- Optimiser des relations database
- Analyser des problèmes d'import/sync
- Troubleshooting database
- Auditer la sécurité database

**❌ NE JAMAIS faire directement**:

```sql
-- ❌ INTERDIT de créer directement
-- supabase/migrations/20250131000000_add_table.sql
CREATE TABLE public.new_table (...);
```

**✅ TOUJOURS utiliser**:

```typescript
// ✅ OBLIGATOIRE pour database
Task tool with subagent_type=supabase-expert
```

**EXEMPLES**:

- User: "Ajoute une table pour suivre la progression" → supabase-expert
- User: "Révise les RLS policies sur class_members" → supabase-expert
- Après avoir terminé une feature avec nouvelle table → supabase-expert (proactif)

---

### ✅ Code Reviewer Agent - `subagent_type=code-reviewer`

**QUAND UTILISER** (OBLIGATOIRE - PROACTIF):

- **TOUJOURS** après avoir écrit une fonction/composant/feature
- **TOUJOURS** après un bug fix
- **TOUJOURS** après un refactoring
- **SANS ATTENDRE** que l'utilisateur le demande

**❌ NE JAMAIS**:

- Envoyer du code sans review
- Attendre que l'utilisateur demande une review

**✅ TOUJOURS utiliser**:

```typescript
// ✅ OBLIGATOIRE après code significatif
Task tool with subagent_type=code-reviewer
```

**EXEMPLES**:

- Claude: "J'ai implémenté la fonction de validation" → code-reviewer (auto)
- Claude: "J'ai fixé le bug d'avatar" → code-reviewer (auto)
- User: "Crée une utility pour valider les téléphones" → implémenter → code-reviewer (auto)

---

### 🧪 Test Automator Agent - `subagent_type=test-automator`

**QUAND UTILISER** (OBLIGATOIRE):

- Créer des tests pour nouvelle feature
- Améliorer la couverture de tests
- Fixer des tests qui échouent
- Créer des tests E2E
- Auditer la qualité des tests

**EXEMPLES**:

- User: "J'ai ajouté une fonction de parsing math" → test-automator
- User: "Le module enrollment a été mis à jour, vérifie" → test-automator
- Après nouvelle feature → test-automator (proactif)

---

### 🔒 Security Auditor Agent - `subagent_type=security-auditor`

**QUAND UTILISER** (OBLIGATOIRE - PROACTIF):

- **TOUJOURS** après auth/OAuth implementation
- **TOUJOURS** après création d'endpoints API sensibles
- **TOUJOURS** après ajout de dépendances
- **TOUJOURS** après manipulation de données utilisateur
- **TOUJOURS** après file upload systems

**EXEMPLES**:

- User: "J'ai implémenté Google OAuth login" → security-auditor (auto)
- User: "Voici les nouveaux endpoints pour les records étudiants" → security-auditor (auto)
- User: "J'ajoute le package 'axios'" → security-auditor (auto)

---

### 🚀 Commit Manager Agent - `subagent_type=commit-manager`

**QUAND UTILISER** (OBLIGATOIRE):

- User dit "commit", "ready to commit", "prépare un commit"
- User demande de bump une version
- User dit "c'est prêt à être commité"

**❌ NE JAMAIS**:

```bash
# ❌ INTERDIT de commiter directement
git add .
git commit -m "message"
```

**✅ TOUJOURS utiliser**:

```typescript
// ✅ OBLIGATOIRE pour commits
Task tool with subagent_type=commit-manager
```

---

### 📚 Documentation Writer Agent - `subagent_type=documentation-writer`

**QUAND UTILISER** (OBLIGATOIRE - PROACTIF):

- **TOUJOURS** après nouvelle feature
- **TOUJOURS** après changement de schéma database
- **TOUJOURS** après création de middleware
- User demande explicitement de documenter

**EXEMPLES**:

- User: "J'ai implémenté le tracking de progression" → documentation-writer (auto)
- User: "J'ai modifié la table class_members" → documentation-writer (auto)

---

### ⚡ Performance Optimizer Agent - `subagent_type=performance-optimizer`

**QUAND UTILISER**:

- User signale des lenteurs
- Avant déploiement majeur
- Après migrations database
- User demande optimization

---

### 🔧 TypeScript Expert Agent - `subagent_type=typescript-expert`

**QUAND UTILISER**:

- Erreurs TypeScript complexes
- Design de types avancés (generics, conditional types)
- Migration JS → TS
- Optimisation de configuration TS

---

### 📐 API Designer Agent - `subagent_type=api-designer`

**QUAND UTILISER**:

- Designer de nouveaux endpoints REST
- Refactoring d'API structure
- Review d'architecture API
- Questions sur pagination/filtering

---

### 🐛 Debugger Agent - `subagent_type=debugger`

**QUAND UTILISER**:

- Erreurs runtime
- Erreurs TypeScript
- Build failures
- Tests qui échouent
- Comportement inattendu

---

### 🎯 Règle d'Or

**SI** la tâche nécessite :

- Plus de 3 étapes
- OU touche du code important
- OU modifie plusieurs fichiers
- OU nécessite expertise spécialisée

**ALORS** → Agent obligatoire

**AUCUNE EXCEPTION**

---

## 🗃️ Database (Supabase)

### Migration Workflow

1. **Claude crée** `.sql` dans `supabase/migrations/` (format: `<timestamp>_<description>.sql`)
2. **User push** via `pnpm db:migrate`
3. **Update** `src/lib/types/database.ts` et `docs/architecture/database-schema.md`

**Important** : NE PAS modifier le schéma dans Supabase Dashboard. Toujours créer migrations timestampées.

**📖 Complete Guide** : [docs/claude/database.md](docs/claude/database.md)

---

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable components (Shadcn, MySelect)
│   ├── server/         # Server-only utilities
│   │   └── validation/ # Zod schemas (REQUIRED for all endpoints)
│   ├── stores/         # Shared state (Svelte stores)
│   ├── utils/          # Shared utilities
│   └── types/          # TypeScript types
├── routes/
│   ├── (public)/       # Public routes (no auth)
│   ├── (protected)/    # Protected routes (auth required)
│   ├── api/            # API endpoints (+server.ts)
│   └── +layout.svelte
└── app.html
```

**File Order** : Imports → Types → Constants → Variables → Functions → Components

**📖 Complete Guide** : [docs/claude/architecture.md](docs/claude/architecture.md)

---

## 📚 Documentation

### For Claude Code

- **[Architecture](docs/claude/architecture.md)** - Structure, routing, data fetching, performance
- **[Best Practices](docs/claude/best-practices.md)** - Svelte 5, TypeScript, anti-patterns
- **[UI Components](docs/claude/ui-components.md)** - Shadcn, MySelect, Tailwind
- **[Database](docs/claude/database.md)** - Supabase, migrations, schema
- **[Quality Standards](docs/claude/quality-standards.md)** - Tests, linting, Zod validation ⭐

### For Users (Complete Documentation)

- **[Master Index](docs/README.md)** - Complete documentation index
- **[Features](docs/features/)** - Questions, Assessments, SRS, Riddles, Error Monitoring
- **[Architecture](docs/architecture/)** - Components, routing, database schema
- **[Guides](docs/guides/)** - Student import, creating exercises
- **[Development](docs/development/)** - Git workflow, version management, migrations

---

## 🎯 Common Patterns

### Toast Notifications

```typescript
import { toaster } from '$lib/stores/toaster.svelte';
toaster.success('Message'); // error, warning, info
```

### Event Handlers (lowercase)

```svelte
<Button onclick={handleClick}>Click me</Button>
```

### Optimistic UI + Debouncing

```typescript
let optimistic = $state<Record<string, number>>({});
let debounceTimer: ReturnType<typeof setTimeout>;

function handleUpdate(id: string, delta: number) {
	optimistic[id] = (optimistic[id] || 0) + delta;

	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		await updateServer(id, optimistic[id]);
		optimistic[id] = 0;
	}, 500);
}
```

**📖 Complete Guide** : [docs/claude/architecture.md#performance-patterns](docs/claude/architecture.md#performance-patterns)

---

## 🔄 Realtime Communication (Supabase)

**Architecture** : Migrated from custom WebSocket to Supabase Realtime (Nov 2025)

### Three Methods

1. **postgres_changes** (DB-backed, ~300ms, COUNTS toward quota)
   - Friend presence, notifications
   - Use when: Need persistence + JOINs + RLS
2. **Broadcast API** (Ephemeral, ~50ms, FREE)
   - Typing indicators, live cursors
   - Use when: Instant feedback, no persistence
3. **Hybrid** (Both methods)
   - Chat messages: Broadcast (50ms UX) + postgres_changes (300ms reliability)
   - Best of both worlds

### Critical Constants

```typescript
// BILLING CRITICAL - DO NOT CHANGE without recalculating quota
const HEARTBEAT_INTERVAL = 180000; // 180 seconds (3 minutes)
// Calculation: 200 users × 8h × 20 days = ~640K messages/month (32% of 2M free tier)
```

### Usage Pattern

```typescript
import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';

// Initialize (once)
supabaseRealtimeManager.init(supabase, userId);

// Create & subscribe to channel
const channel = supabaseRealtimeManager.createChannel('my-channel');
channel.on('postgres_changes', { event: 'INSERT', table: 'notifications' }, callback);
await supabaseRealtimeManager.subscribeChannel('my-channel');

// Cleanup
await supabaseRealtimeManager.unsubscribeChannel('my-channel');
```

### Specialized Stores

- **presenceManager** - Friend online/offline status (postgres_changes)
- **notificationsRealtimeManager** - New notification alerts (postgres_changes)
- **chatStore** - Hybrid chat (Broadcast + postgres_changes with deduplication)

**📖 Complete Guide** : [docs/architecture/supabase-realtime.md](docs/architecture/supabase-realtime.md)

---

### Chat Message Reporting

```typescript
import { chatStore } from '$lib/stores/chat.svelte';

// Report a message
const success = await chatStore.reportMessage(messageId, 'inappropriate', 'Optional details here');

if (success) {
	toaster.success('Message signalé');
} else {
	toaster.error('Échec du signalement');
}
```

### Creating 1-on-1 Chats

```typescript
// Create or get existing chat with a friend
const conversationId = await chatStore.create1on1Chat(friendId);

if (conversationId) {
	chatStore.setActiveConversation(conversationId);
} else {
	toaster.error('Impossible de créer le chat (vous devez être amis)');
}
```

### Using Chat with Presence

```typescript
import { presenceManager } from '$lib/stores/presence.svelte';
import { chatStore } from '$lib/stores/chat.svelte';

// Initialize both stores
presenceManager.init(supabase, userId);
chatStore.init(supabase, userId);

// Get friend online status in chat UI
const status = presenceManager.getFriendPresence(friendId);
// Returns: 'online' | 'offline'
```

---

## ✅ Pre-Commit Checklist

Before committing code with API endpoints or forms:

- [ ] All `request.json()` calls have Zod validation
- [ ] All query parameters are validated
- [ ] All numeric inputs have bounds (`.min()`, `.max()`, `.finite()`)
- [ ] All arrays have size limits (`.max()`)
- [ ] All UUIDs validated (`.uuid()`)
- [ ] Tests exist and pass (`pnpm test:unit`)
- [ ] No `any` types used
- [ ] Using MySelect (not Shadcn Select or `<select>`)
- [ ] Svelte 5 runes (not Svelte 4 patterns)
- [ ] Lint passes (`pnpm lint`)

**Note** : Pre-commit hook automatically runs `lint-staged` on `git commit`.

---

**Remember** : Préférer le code explicite et simple plutôt que les astuces clever.

**📖 Full Documentation** : [docs/claude/](docs/claude/) • [docs/README.md](docs/README.md)

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
