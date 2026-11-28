---
couvre:
  - src/lib/utils/enhance-stay-on-page.ts
---

# Best Practices

Référence synthétique pour Claude : **Svelte 5 runes**, **TypeScript**, **SvelteKit patterns**, **organisation du code**. Règles non négociables dans [CLAUDE.md](../../CLAUDE.md). Tests/Zod : [quality-standards.md](qualite.md).

---

## Svelte 5 Runes

> ⚠️ Règle n°3 CLAUDE.md : runes **uniquement**. Jamais `export let`, jamais `$:`.

### Primitives

```svelte
<script lang="ts">
	// State: réactivité locale
	let count = $state(0);
	let isOpen = $state(false);

	// Derived: valeur calculée — jamais de $:
	let doubled = $derived(count * 2);
	let label = $derived(isOpen ? 'Fermer' : 'Ouvrir');

	// Props: interface typée + déstructuration
	interface Props {
		title: string;
		maxItems?: number;
		onclose?: () => void;
	}
	let { title, maxItems = 10, onclose }: Props = $props();

	// Bindable: liaison bidirectionnelle
	interface BindableProps {
		value: string[];
	}
	let { value = $bindable([]) }: BindableProps = $props();
</script>
```

Exemple réel — `GradeBadgeSelector.svelte` :

```svelte
<script lang="ts">
	interface Props {
		value: GradeCode[];
		maxSelections?: number;
		onchange?: (value: GradeCode[]) => void;
		restrictTo?: GradeCode[];
	}

	let { value = $bindable([]), maxSelections, onchange, restrictTo }: Props = $props();

	let isModalOpen = $state(false);
	let pendingSelection = $state<GradeCode[]>([]);
</script>
```

### $effect — réservé aux side-effects

`$effect` sert uniquement à synchroniser avec des APIs extérieures (DOM, timers, subscriptions). **Ne pas l'utiliser pour de la logique dérivée** — utiliser `$derived` à la place.

```svelte
<script lang="ts">
	import { untrack } from 'svelte';

	let inputRef: HTMLInputElement | null = $state(null);
	let autoFocus = $state(false);

	// ✅ Side-effect légitime : interaction DOM
	$effect(() => {
		if (autoFocus && inputRef) {
			inputRef.focus();
		}
	});

	// ✅ untrack() pour lire un état sans créer de dépendance réactive
	// (cf. ConstructionPlayer.svelte, MultiClassStudentSelector.svelte)
	let data = $state<string[]>([]);
	$effect(() => {
		// trigger sur `autoFocus` uniquement, pas sur `data`
		if (autoFocus) {
			untrack(() => {
				console.log('current data:', data);
			});
		}
	});

	// ✅ Nettoyage (cleanup) — toujours retourner une fonction si on subscribe
	$effect(() => {
		const handler = () => console.log('resized');
		window.addEventListener('resize', handler);
		return () => window.removeEventListener('resize', handler);
	});
</script>
```

### Modèle de réactivité

```
event (onclick, oninput…) → handler → maj $state → DOM mis à jour
```

- Les handlers sont des **fonctions minuscules** en Svelte 5 : `onclick`, `oninput`, `onchange`, `onsubmit`.
- `$derived` se recalcule automatiquement quand ses dépendances changent.
- `$effect` s'exécute **après** le rendu ; ne pas l'utiliser pour contrôler le rendu.

### Snippets (remplacent les slots)

```svelte
<!-- Composant parent -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

{@render children?.()}
```

Exemple réel — `(protected)/+layout.svelte` :

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<PomodoroEffects />
{@render children?.()}
```

### Module-level state partagé

Pour du state partagé entre toutes les instances d'un composant, utiliser `<script module>` avec `SvelteSet` / `SvelteMap` (pas des primitives JS nues) — exemple réel `UserAvatar.svelte` :

```svelte
<script lang="ts" module>
	import { SvelteSet } from 'svelte/reactivity';
	// Partagé entre toutes les instances ; SvelteSet déclenche la réactivité
	const failedUrls = new SvelteSet<string>();
</script>
```

### Anti-patterns interdits

```svelte
<!-- ❌ Svelte 4 — jamais -->
<script>
	export let title; // → let { title } = $props()
	$: doubled = x * 2; // → let doubled = $derived(x * 2)
	$: {
		doSomething(x);
	} // → $effect(() => { doSomething(x); })
</script>

<!-- ❌ svelte:component inutile en Svelte 5 -->
<svelte:component this={MyComp} /> // → <MyComp />
```

---

## TypeScript

### Imports `#lib` et `#tests`

`src/lib` s'importe par `#lib/…`, `tests` par `#tests/…` : des **imports de sous-chemin** (champ `imports` de `package.json`), qui remplacent l'alias `$lib` retiré par SvelteKit 3.

- **Extension toujours écrite** : `#lib/utils/logger.ts`, `#lib/stores/toaster.svelte.ts`, `#lib/components/ui/button/index.ts`, `#lib/components/navigation/BackLink.svelte`. Sans extension, ni Node ni TypeScript ne trouvent le fichier.
- `tsconfig.json` déclare les mêmes chemins dans `paths` : sans eux, `pnpm check:incremental` (tsgo) ne relie pas `#lib/…/X.svelte` au composant et le type en composant générique (props en `any`).
- Les scripts lancés par `tsx` les résolvent sans configuration (Node lit `package.json`).
- **Branche partie avant #2826** (encore en `$lib`) : après `git merge origin/main`, `pnpm migrer:diese` convertit les imports des fichiers de la branche (modifiés depuis `origin/main` + non suivis), extension comprise ; `--essai` montre sans écrire, des fichiers en argument restreignent la liste. Un import dont le fichier n'existe pas est signalé (préfixe seul changé).

### Jamais `any`

```typescript
// ❌
function process(data: any) { ... }

// ✅ unknown + type guard
function process(data: unknown) {
  if (isProfile(data)) { /* typé */ }
}

// ✅ type guard
function isProfile(v: unknown): v is Profile {
  return typeof v === 'object' && v !== null && 'role' in v;
}
```

### Types de base de données

- `Database`, `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`, `Json` → importer depuis `#lib/types/database.ts` (auto-généré, **ne jamais y toucher**).
- Alias de tables, unions, interfaces composites → **uniquement** dans `#lib/types/database-helpers.ts`.

```typescript
// ✅ Alias dans database-helpers.ts
import type { Tables } from '#lib/types/database.ts';
export type Profile = Tables<'profiles'>;
export type ProfileRole = 'teacher' | 'student' | 'admin';

// ✅ Importation dans le code applicatif
import type { Profile } from '#lib/types/database-helpers.ts';
```

---

## Organisation d'un fichier

Ordre **obligatoire** dans tout fichier `.ts` ou `<script lang="ts">` :

```
1. Imports
2. Types / interfaces
3. Constantes (module-level, immutables)
4. Variables ($state, $derived, let locaux)
5. Functions (helpers, handlers)
6. (dans .svelte) markup
```

```svelte
<script lang="ts">
	// 1. Imports
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import type { GradeCode } from '#lib/types/grades.ts';

	// 2. Types
	interface Props {
		value: GradeCode[];
		disabled?: boolean;
	}

	// 3. Constantes
	const MAX_VISIBLE = 5;

	// 4. Props + state
	let { value = $bindable([]), disabled = false }: Props = $props();
	let isOpen = $state(false);
	let filtered = $derived(value.slice(0, MAX_VISIBLE));

	// 5. Functions
	function handleToggle() {
		isOpen = !isOpen;
	}
</script>

<!-- 6. Markup -->
<button onclick={handleToggle}>…</button>
```

---

## Supabase — clients SSR-compatibles

> ⚠️ Jamais de client Supabase créé au chargement d'un module (singleton non SSR, sans cookies) : `locals.supabase` ou `data.supabase`. Doc complète : [database.md](base-de-donnees.md).

**Trois contextes, trois patterns :**

### 1. Hook serveur (`hooks.server.ts`)

Crée un client par requête avec gestion des cookies :

```typescript
// src/lib/server/supabase.ts — appelé depuis hooks.server.ts
import { createServerClient } from '@supabase/ssr';

event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	cookies: {
		getAll: () => event.cookies.getAll(),
		setAll: (cookiesToSet) => {
			cookiesToSet.forEach(({ name, value, options }) =>
				event.cookies.set(name, value, { ...options, path: '/' })
			);
		}
	}
});
```

### 2. `+layout.ts` (universel, SSR + browser)

Import **dynamique** obligatoire pour éviter le bug WebKit TDZ (voir [docs/pratiques/safari-webkit-tdz.md](safari-webkit-tdz.md)) :

```typescript
// src/routes/+layout.ts
export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	// ⚠️ Import dynamique — NE PAS passer en import statique (chunk > 100 KB → bug Safari)
	const { createBrowserClient, createServerClient, isBrowser } = await import('@supabase/ssr');

	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, { global: { fetch } })
		: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch },
				cookies: { getAll: () => data.cookies }
			});

	return { supabase, user: data.user, profile: data.profile };
};
```

### 3. `+page.server.ts` / `+layout.server.ts` — `event.locals`

`user` et `profile` sont chargés en amont par `userProfileHandle` (dans `hooks.server.ts`) et disponibles directement dans `locals` :

```typescript
// src/routes/(protected)/python-notebook/+page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = locals; // déjà vérifiés par le hook
	if (!user || !profile) throw error(401, 'Non autorisé');

	const { data, error: dbErr } = await locals.supabase
		.from('python_notebooks')
		.select('id, title, updated_at')
		.eq('author_id', user.id);

	if (dbErr) throw error(500, 'Erreur de chargement');
	return { notebooks: data ?? [] };
};
```

`(protected)/+layout.server.ts` appelle `requireUserOrRedirect(user)` puis renvoie `{ user, profile, consentStatus }` — les routes enfants héritent via `parent()` **ou** via `locals` directement.

---

## Toaster (notifications)

```typescript
import { toaster } from '#lib/stores/toaster.svelte.ts';

toaster.success('Sauvegardé');
toaster.error('Erreur lors de la sauvegarde');
toaster.warning('Session bientôt expirée');
toaster.info('Mise à jour disponible');
```

---

## Composants UI — règles obligatoires

> Règle n°2 CLAUDE.md : jamais `<select>` natif ni Shadcn `Select` direct.

```svelte
<!-- ✅ -->
<MySelect type="single" bind:value={selected} {items} />
<MyCheckbox bind:checked={isEnabled} label="Activer" />

<!-- ❌ -->
<select bind:value={selected}>…</select>
<input type="checkbox" bind:checked={isEnabled} />
```

Composants : `src/lib/components/MySelect.svelte` · `src/lib/components/MyCheckbox.svelte`.

---

## Contexte Svelte

Passer le contexte via **fonctions** (pas de valeur nue — la valeur nue ne réagit pas aux mises à jour) :

```typescript
// ✅ Producteur — fonctions getter
setContext('deck', { getStore: () => deckStore });

// ✅ Consommateur
const { getStore } = getContext<{ getStore: () => DeckStore }>('deck');
const store = getStore();
```

---

## SvelteKit — form actions et `use:enhance`

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<form
	method="POST"
	action="?/updateChecklistItem"
	use:enhance={() => {
		// retourner une fonction pour override le comportement par défaut
		return async ({ update }) => {
			await update({ reset: false });
		};
	}}
>
	…
</form>
```

---

## SvelteKit 3 — ce qui a changé chez nous

Passage de kit 2 à kit 3.2.0 le 2026-11-18 (#2825). Ce que le guide de migration ne dit pas, ou ce qui nous a coûté :

- **`goto`** : `keepFocus` et `noScroll` sont retirés (erreur en dev) → `reset: false`. Une route inconnue fait **rejeter** `goto` (kit 2 affichait une 404) : pour un lien venu des données (notification), passer par `gotoNotification`, qui retombe sur `location.assign`.
- **`data-sveltekit-noscroll` / `keepfocus`** sont ignorés → `data-sveltekit-reset="false"`.
- **`resolve('/x')`** attend un id de route ; un chemin s'écrit sans `/` (`resolve('shtam')`). Chemin porté par une variable → `resolvePath` (`#lib/navigation/resolve-path.ts`).
- **`pushState` / `replaceState` gardés** malgré la dépréciation : leur remplaçant `goto(url, { state, shallow: true })` déclenche les hooks de navigation (barre de chargement à chaque frappe de la recherche du catalogue, rechargement complet si une nouvelle version est en ligne). À rouvrir seulement si kit 4 les retire. **`replaceState` est asynchrone** et rejette quand le routeur n'est pas démarré : un `try/catch` synchrone ne voit pas l'échec → `.catch`.
- **`invalidateAll` → `refreshAll`**, **`json()` de kit → `Response.json`** (attention : `Response.json(undefined)` lève une `TypeError`, `json(undefined)` rendait un corps vide). Deux caches ont aussi une méthode `invalidateAll` (`teacherDashboardCache`, `studentDashboardCache`) : ce ne sont pas celles de kit.
- **`$env/*`** ne rend plus que les variables déclarées dans `src/env.ts` → on importe `$app/env/public` / `$app/env/private`. `$app/stores` → `$app/state`, `$app/environment` → `$app/env`.
- **`redirect()` vers une autre origine** exige `{ external }` : seule la connexion Google sort du site (liste blanche = origine Supabase).
- **`fail()` répond avec son vrai statut** (plus de 200) : lire le corps, pas `response.ok`.
- **`handleError` client** reçoit aussi les `error(...)` voulus, avec `kind` (`app`/`framework`/`unknown`) : ils ne sont pas journalisés.
- **CSRF** : un POST/PUT/PATCH/DELETE d'une autre origine **sans `Content-Type`** est refusé (nos crons Vercel sont en GET).
- **`page.url`** est en lecture seule : `new URL(page.url.href)` pour la modifier.
- **`use:enhance` : `update()` navigue** (succès comme échec) vers l'adresse de l'action privée de `?/save` ; sur une page dont l'adresse porte une recherche (`?class=…&week=…`, `?serie=…`, un jeton `?u=…&t=…`), cette recherche est **perdue**. Formulaire `action="?/…"` → `use:enhance={stayOnPage}` (`#lib/utils/enhance-stay-on-page.ts`) au lieu d'un `use:enhance` nu, ou `await update({ navigate: false })` dans un callback. Relevé des 91 formulaires et correctif du 2026-11-20 (5 pages cassées : verdict de `/dev/modeles`, cahier de texte, modèles de fiches, mot de passe, mot de passe parent).

---

## Anti-patterns clés (récapitulatif)

| ❌ À éviter                                         | ✅ Correct                                              |
| --------------------------------------------------- | ------------------------------------------------------- |
| `export let x`                                      | `let { x } = $props()`                                  |
| `$: doubled = x * 2`                                | `let doubled = $derived(x * 2)`                         |
| `$: { sideEffect(x); }`                             | `$effect(() => { sideEffect(x); })`                     |
| `<svelte:component this={C} />`                     | `<C />`                                                 |
| client Supabase global créé au chargement du module | `locals.supabase` (serveur) ou `data.supabase` (client) |
| Types dans `database.ts`                            | Types dans `database-helpers.ts`                        |
| `data: any`                                         | `data: unknown` + type guard                            |
| `<select>` / `<input type="checkbox">`              | `<MySelect>` / `<MyCheckbox>`                           |

---

> Voir aussi : [quality-standards.md](qualite.md) · [database.md](base-de-donnees.md) · [architecture.md](../systeme/architecture-generale.md) · [ui-components.md](composants-ui.md).

Vérifié contre le code le 2026-10-10.
