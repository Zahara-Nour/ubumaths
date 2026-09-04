# CLAUDE.md — UbuMaths

Guide essentiel pour Claude Code. Doc détaillée : [docs/claude/](docs/claude/).

---

## Contexte (toujours en tête)

- Application éducative de mathématiques, élèves francophones. **UI en français, code & commentaires en anglais.**
- ⚠️ **PRODUCTION LIVE** : `main` est déployé en prod (Vercel). Vraies données d'**élèves mineurs** → **RGPD, prudence maximale** sur tout ce qui touche données / auth / social.
- **Modèle mono-professeur** : un seul prof (+ admin), des élèves dans ses classes ou hors-classe. L'**école = frontière sociale / safeguarding** ; la classe = sous-groupe d'organisation.
- **Stack** : Svelte 5 (runes) · TypeScript (strict) · Tailwind 4 · Shadcn-svelte · MathLive · Supabase (Postgres + Auth + RLS, **EU / eu-west-3**) · Vercel · pnpm.

---

## ⚠️ Contrainte mémoire (OOM) — LIRE

Machine à faible RAM. **NE JAMAIS lancer sur tout le projet** (ça crashe) :
`pnpm check` · `pnpm check:fast` · `svelte-check` (sans `--incremental`) · `pnpm build` · `pnpm lint` · `npx tsc --noEmit` (en plus, faux positifs `$lib`).

- À la place : **`pnpm check:incremental`** (TS + Svelte, ~30 s, memory-safe, **0 erreur exigée**).
- **eslint OOM en local → CI-only.** Ne pas le lancer en local (on accepte le round-trip CI).
- Le **hook pre-commit est léger** : `.lintstagedrc.js` lance `oxlint` (Rust, ~0 RAM) + `prettier` sur les fichiers staged (~2 s, **pas d'OOM**) → **`--no-verify` n'est plus nécessaire**. oxlint bloque sur _erreurs_ seulement (warnings non bloquants). eslint complet (`.svelte` + règle Zod) et les tests restent **en CI** ; le typecheck reste hors hook → `pnpm check:incremental` avant de pousser.
- ⚠️ Si un hook crashe, il peut **stasher** le travail non commité (→ perdu) : commit tôt, et après un crash vérifie `git stash list`. (L'ancien hook OOMait via `eslint --fix` type-aware + `vitest related`, d'où le `--no-verify` historique.)

---

## Commandes

```bash
pnpm dev -- --port 5175             # dev (TOUJOURS port 5175 ; 5173 = user, NE PAS utiliser)
pnpm check:incremental              # TS + Svelte (memory-safe, 0 erreur exigée)
pnpm format "src/**/*.{ts,svelte}"  # prettier --write

pnpm test:server <path>             # tests serveur (fichier ciblé)
pnpm test:client <path>             # tests client (*.svelte.test.ts)
pnpm test:integration               # intégration + DB (Supabase local)

pnpm db:start / db:reset            # Supabase local (reset = recrée depuis le baseline)
pnpm db:migrate / db:types          # push migrations → EU / régénère database.ts (avec accord explicite)
pnpm maintenance:on / :off          # mode maintenance prod (releases à risque)
pnpm release                        # tag de version + CHANGELOG (standard-version, sur main)
```

---

## Git Workflow (OBLIGATOIRE)

> **Process complet** : [docs/claude/git-workflow.md](docs/claude/git-workflow.md)

`main` = **production**. Tout changement de **code** : **branche → PR → CI 100 % verte → `gh pr merge --merge` → suppression de branche**. **Jamais de code direct sur `main`** (seule exception : pure doc/typo ≤ 2 fichiers `.md`).

- **CI verte avant merge** (`gh pr checks <n> --watch`). Jamais merger en rouge.
- **Conventional commits**, **header ≤ 100 caractères** (commitlint), **aucune mention Claude/Anthropic** (David = seul auteur).
- **Migrations** : additive → `db:migrate` avant/avec le deploy ; destructive → après. Uniquement depuis la branche mergée.
- **Merge / déploiement prod et `db:migrate` : seulement avec mon accord explicite.**

---

## Règles de code (non négociables)

**0. Ne JAMAIS supprimer un fichier non suivi par git** (`rm`/`mv`) sans demander. `git status` d'abord ; si untracked dans la cible → STOP et demander.

**1. Valider toute entrée avec Zod** (`request.json()`, query params) — bornes numériques `.min()`/`.max()`, limites de tableaux, UUID :

```typescript
import { z } from 'zod';
const schema = z.object({
	userId: z.string().uuid(),
	amount: z.number().int().positive().max(1000)
});
const v = schema.safeParse(await request.json());
if (!v.success) throw error(400, v.error.issues[0].message);
```

→ [quality-standards.md](docs/claude/quality-standards.md#input-validation-with-zod)

**2. MySelect & MyCheckbox** — jamais Shadcn Select/Checkbox direct ni `<select>`/`<input type="checkbox">` natifs.

```svelte
<MySelect type="single" bind:value={selected} {items} />
<MyCheckbox bind:checked={isEnabled} label="Enable" />
```

→ [ui-components.md](docs/claude/ui-components.md)

**3. Svelte 5 runes uniquement** (jamais `export let` / `$:`) :

```ts
let count = $state(0); // pas: let count = 0
let doubled = $derived(count * 2); // pas: $: doubled = count * 2
let { title } = $props(); // pas: export let title
```

Réactivité : **event → handler → maj du state → maj du DOM**. `$effect` réservé aux cas particuliers (side-effects). → [best-practices.md](docs/claude/best-practices.md#svelte-5-runes)

**4. Jamais `any`** — types propres, `unknown` + type guards, ou types de `$lib/types/database`.

**5. Après création/modif d'un `.svelte` → `svelte-autofixer` (MCP)** systématiquement.

**6. Types dérivés dans `database-helpers.ts`** — `database.ts` est auto-généré (`pnpm db:types`), **ne JAMAIS y ajouter de type**.

- `Database`, `Tables`, `Json` → `$lib/types/database`
- alias / unions / composites → `$lib/types/database-helpers`

---

## Base de données

> **Détails** : [database.md](docs/claude/database.md) · schéma : [database-schema.md](docs/architecture/database-schema.md) (à maj après changement de schéma)

- Migration `.sql` dans `supabase/migrations/` (`<timestamp>_<description>.sql`). **Jamais** modifier le schéma via le Dashboard Supabase.
- **Tests d'intégration locaux OBLIGATOIRES** pour toute RLS / fonction `SECURITY DEFINER` / trigger / policy (`db:start` + `test:integration`). **JAMAIS** valider par un smoke-test `auth.uid()` NULL (le garde sort avant la requête → faux positif).
- Après push : `pnpm db:types` (+ commit). **Interroger la prod** : MCP Supabase **read-only** (EU).

---

## Quand utiliser un agent

- **Travail direct** (pas d'agent) si : bug ciblé 1-2 fichiers connus · modif < 20 lignes · investigation (Read/Grep) · faisable en < 5 min.
- **Agent** si : > 3 étapes ET code important ET plusieurs fichiers ET expertise spécialisée. Ne pas hésiter à utiliser **Opus**. Plafonner les briefs (max N lignes / M fichiers).
- **Interdit aux agents** : lancer build/lint/check/format (cf. OOM) ; tourner > 5 min sans résultat concret.

| Agent                                                                               | Cas d'usage                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `Explore`                                                                           | Architecture, recherche code, patterns                      |
| `frontend-developer` / `backend-developer`                                          | UI Svelte / `+server.ts`, `+page.server.ts`, auth           |
| `supabase-expert`                                                                   | Migrations, RLS, schéma                                     |
| `security-auditor`                                                                  | **Obligatoire** après auth / RLS / API sensible / migration |
| `code-reviewer` · `test-automator`                                                  | Revue qualité (proactif) · tests, couverture                |
| `mathast-expert` · `geometry-expert` · `pedagogy-expert`                            | Modules métier (`mathAST` / `geometry-core` / `questions`)  |
| `debugger` · `typescript-expert` · `performance-optimizer` · `documentation-writer` | Selon besoin                                                |

(Liste complète : `.claude/agents/README.md`.)

---

## Planning (plans multi-phases)

> **TDD collaboratif** : [docs/ref/tests/tdd.md](docs/ref/tests/tdd.md)

1. **Phase 0 — Spécification TDD** : proposer les comportements en français (cas nominal / limite / erreur), **attendre validation** avant de coder.
2. **Agents ET modèles spécifiés** par tâche (Opus sans hésiter).
3. **Tests d'abord** (doivent échouer) → implémentation → tests passent.
4. **`code-reviewer`** en fin de phase ; **`security-auditor`** si auth/RLS/API ; **performance** si requêtes DB lourdes.
5. **Doc de progression** `docs/wip/<feature>-progress.md` (crash-recovery) entre phases ; lister les docs produits à la fin.
6. **Exécution autonome** : ne pas s'arrêter au premier échec, corriger automatiquement (`debugger`/Opus si > 2 tentatives).

**Definition of Done** (avant d'ouvrir/merger la PR) :

- [ ] Code fonctionnel + tests passent (intégration locale si DB/RLS)
- [ ] `svelte-autofixer` sur les `.svelte` modifiés · `pnpm check:incremental` = 0 erreur
- [ ] `code-reviewer` (+ `security-auditor` si applicable)
- [ ] Zod sur les entrées · pas de `any` · MySelect/MyCheckbox · runes only

---

## Structure & patterns

```
src/lib/{components,server,stores,utils,types}/   server/ = code serveur (validation/ = Zod)
src/routes/{(public),(protected),api}/            (protected) = auth requise ; api = +server.ts
```

**Ordre dans un fichier** : Imports → Types → Constantes → Variables → Functions → Components.

```typescript
import { toaster } from '$lib/stores/toaster.svelte';
toaster.success('Message'); // .error / .warning / .info
// handlers en minuscule (Svelte 5) : <Button onclick={handleClick}>
```

Optimistic UI · Debouncing · Realtime → [architecture.md](docs/claude/architecture.md) · [realtime.md](docs/claude/realtime.md)

---

## Documentation

| Doc                                                      | Contenu                                  |
| -------------------------------------------------------- | ---------------------------------------- |
| [git-workflow.md](docs/claude/git-workflow.md)           | **Workflow git OBLIGATOIRE**             |
| [architecture.md](docs/claude/architecture.md)           | Structure, routing, perf                 |
| [best-practices.md](docs/claude/best-practices.md)       | Svelte 5, TypeScript                     |
| [ui-components.md](docs/claude/ui-components.md)         | Shadcn, MySelect, Tailwind               |
| [database.md](docs/claude/database.md)                   | Supabase, migrations                     |
| [quality-standards.md](docs/claude/quality-standards.md) | Tests, linting, Zod                      |
| [warning-svelte.md](docs/ref/warning-svelte.md)          | `svelte-ignore` légitime vs dette a11y   |
| [css-color-tokens.md](docs/ref/css-color-tokens.md)      | `var(--color-*)`, jamais `hsl(var(--x))` |
| [realtime.md](docs/claude/realtime.md)                   | Realtime, chat, présence                 |
| [docs/ref/tests/](docs/ref/tests/)                       | Architecture des tests + TDD             |

Index utilisateurs : [docs/README.md](docs/README.md).

---

**Rappel** : code explicite et simple > astuces clever.
