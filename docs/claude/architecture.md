# Architecture

Référence synthétique pour Claude : **structure**, **routing & data fetching**, **SSR/hydratation** (dont la contrainte Safari TDZ). Détail : [docs/architecture/](../architecture/) · règles condensées dans [CLAUDE.md](../../CLAUDE.md).

---

## Project Structure

```
src/
├── hooks.server.ts          # handle = sequence(requestId, maintenance, supabase, …) → peuple locals
├── hooks.client.ts          # error monitoring client
├── app.d.ts                 # App.Locals (user, profile, supabase, safeGetSession…)
├── routes/
│   ├── +layout.server.ts    # racine SSR : vérifie l'auth (getUser), expose cookies/user/profile
│   ├── +layout.ts           # racine universel : crée le client Supabase (import DYNAMIQUE, cf. TDZ)
│   ├── (public)/            # pages publiques (auth, legal, demos, glossaire, games…) — pas d'auth
│   ├── (protected)/        # auth REQUISE (garde dans (protected)/+layout.server.ts)
│   └── api/                 # endpoints REST (+server.ts), validés Zod
└── lib/
    ├── components/          # composants UI (ui/ = Shadcn, MySelect/MyCheckbox custom…)
    ├── server/             # code server-only : auth.ts, middleware/, validation/ (Zod), errorMonitoring…
    ├── stores/              # état partagé runes (toaster.svelte, caches…)
    ├── utils/ · types/      # helpers · types (database.ts auto-généré, database-helpers.ts dérivés)
    ├── questions/ · mathAST/ # système de questions & AST symbolique (cf. plus bas)
    └── geometry-core/ · constructions-v2/ · games/ · srs/ · spreadsheet/ · whiteboard/ …
```

**Ordre dans un fichier** : Imports → Types → Constantes → Variables → Functions → Component (cf. CLAUDE.md).

---

## Route groups

Les parenthèses créent des **layout groups** SvelteKit : elles n'apparaissent **pas** dans l'URL (`(protected)/dashboard/+page.svelte` → `/dashboard`).

| Groupe         | Sens                                   | Garde                                                                 |
| -------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `(public)/`    | pas d'auth (login, legal, démos, jeux) | aucune                                                                |
| `(protected)/` | **auth requise**                       | `(protected)/+layout.server.ts` : `requireAuth(user)` + statut profil |
| `api/`         | endpoints REST `+server.ts`            | par endpoint (`requireRoles(locals, [...])`), validation **Zod**      |

La garde `(protected)/+layout.server.ts` tourne **avant** toute route enfant, impossible à contourner : `requireAuth` (redirige `/login` si `user` null), profil obligatoire (sinon 500 + `logError`), puis **deny-by-default** sur `profile.status` (`pending` → `/auth/pending-approval` ; tout ce qui n'est pas `approved` → `signOut()` + redirect). Accès par rôle plus fin **dans** l'endpoint/la page via `requireRoles`.

> Détail rôles/redirections : [docs/architecture/](../architecture/).

---

## Routing & data fetching

**`locals` est la source unique d'auth.** `hooks.server.ts` peuple `event.locals` une fois par requête (`userProfileHandle` charge `user` + `profile`). Les `load` lisent `locals` — **pas besoin de `await parent()`** dans les enfants.

```typescript
// (protected)/.../+page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals; // user/profile garantis sous (protected)
	const { data, error: e } = await supabase
		.from('schools')
		.select('*')
		.eq('id', profile.school_id)
		.single();
	if (e) throw error(500, 'Failed to load school');
	return { school: data };
};
```

**API endpoint** (`api/.../+server.ts`) : garde de rôle + Zod sur l'entrée, puis requête via `locals.supabase`.

```typescript
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);
	const supabase = locals.supabase;
	// … requête + json(...)
};
```

- `GET` = lecture ; mutations en `POST`/`PATCH`/`DELETE`. Toute entrée externe validée Zod (`safeParse` → `error(400)`) — cf. [quality-standards.md](quality-standards.md#input-validation-with-zod).
- Le client Supabase utilisé par les composants vient de `+layout.ts` (`data.supabase`), authentifié par cookies en SSR / localStorage en navigateur.

---

## SSR & hydratation

Double `load` racine, dans l'ordre :

1. **`+layout.server.ts`** (server only) : `safeGetSession()` → `getUser()` (vérifié), renvoie `cookies`, `user`, `profile`.
2. **`+layout.ts`** (universel : SSR puis hydratation navigateur) : reçoit `data`, crée le client Supabase (`createServerClient` via cookies en SSR / `createBrowserClient` en navigateur), `depends('supabase:auth')`.

**Flux auth réactif** : `onAuthStateChange` (navigateur) ne consomme **jamais** la session du callback (non vérifiée) → il appelle `invalidate('supabase:auth')`, ce qui ré-exécute le `load` racine et re-vérifie côté serveur. `SIGNED_IN` même utilisateur (HMR/refocus) et `TOKEN_REFRESHED` < 30 min sont **throttlés** via `sessionStorage` pour éviter des reloads inutiles (3-5 requêtes DB chacun).

### ⚠️ Contrainte critique — Safari/WebKit TDZ (root layout)

Le **chunk du root layout doit rester < 100 KB**, sinon iPad/Safari lève `Cannot access 'universal' before initialization` (WebKit bug [#242740](https://bugs.webkit.org/show_bug.cgi?id=242740), chaîne d'imports statiques trop complexe dans le module d'entrée de route).

- **`@supabase/ssr` est importé DYNAMIQUEMENT** dans `src/routes/+layout.ts` (`await import('@supabase/ssr')`), jamais en import statique. Idem `$app/navigation` (`invalidate`) chargé dynamiquement.
- **Garde CI** (`.github/workflows/quality.yml`) : après `pnpm build`, vérifie `nodes/0.*.js` ≤ `102400` octets → **fail si dépassé**.
- **NE JAMAIS** ajouter d'import statique de lib lourde dans `+layout.ts`.

> Détail : [docs/ref/safari-webkit-tdz.md](../ref/safari-webkit-tdz.md).

---

## Dev server

**Toujours `--port 5175`** ; `5173` est réservé à l'utilisateur, **ne pas l'utiliser**.

```bash
pnpm dev -- --port 5175
```

---

## Performance patterns

**Optimistic UI + debouncing** — pour les updates serveur fréquentes (compteurs, quantités) : MAJ optimiste immédiate + envoi serveur batché (fenêtre de debounce ~500 ms), rollback sur erreur. Réel dans `src/routes/(protected)/dashboard/teacher/gamification/rewards/+page.svelte` (cache teacher + `debouncedUpdate*`), aussi `dashboard/student/inventory/`.

```typescript
function debouncedUpdate(id: string, delta: number) {
	optimistic[id] = (optimistic[id] ?? 0) + delta; // 1. feedback UI instantané
	clearTimeout(timers[id]);
	timers[id] = setTimeout(async () => {
		try {
			await updateServer(id, optimistic[id]); // 2. envoi batché
		} catch {
			optimistic[id] = 0; // rollback
			toaster.error('Échec de la mise à jour');
		}
	}, 500);
}
```

Réactivité = **event → handler → maj du state → maj du DOM** (runes ; `$effect` réservé aux side-effects). Autres leviers : index DB sur les chemins chauds, élimination des N+1 (joins), RPC PostgreSQL pour les agrégations.

---

## Question/template system (pointeur)

Système métier volumineux — **ne pas deep-diver ici** :

- **`src/lib/questions/`** (~70 fichiers) — banque de questions / templates. API publique : `src/lib/questions/index.ts` (`generateInstance`, `resolveVariables`, `random-generator`…) ; génération dans `generator/` (`instance-generator`, `variable-resolver`, `correction-generator`, `condition-evaluator`…). Agent dédié : **`pedagogy-expert`**.
- **`src/lib/mathAST/`** (~700 fichiers) — AST symbolique : parsing, normalize, pattern matching (`P`/`tryMatch`/`parsePattern`), `cosmetic-transforms`, génération LaTeX, paliers pédagogiques. Invariants structurels stricts → agent dédié : **`mathast-expert`**.

---

> Voir aussi : [best-practices.md](best-practices.md) (Svelte 5, TS) · [database.md](database.md) · [ui-components.md](ui-components.md) · [realtime.md](realtime.md) · [git-workflow.md](git-workflow.md).
