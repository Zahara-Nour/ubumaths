# CLAUDE.md — UbuMaths

Guide essentiel pour Claude Code. Doc détaillée : [docs/claude/](docs/claude/).

---

## Contexte (toujours en tête)

- Application éducative de mathématiques, élèves francophones. **UI en français. Identifiants et noms de symboles en anglais ; commentaires en français.**
  - Tranché par David le 2026-09-12. L'ancienne formulation disait « code &
    commentaires en anglais », alors que le dépôt compte ~4700 lignes de
    commentaires français dans 713 fichiers : la règle réelle est celle
    ci-dessus. Un commentaire explique _pourquoi_, et c'est David qui le relit.
  - Donc : `const targetClasses`, pas `const classesVisees` — mais le
    commentaire au-dessus reste en français.
- ⚠️ **PRODUCTION LIVE** : `main` est déployé en prod (Vercel). Vraies données d'**élèves mineurs** → **RGPD, prudence maximale** sur tout ce qui touche données / auth / social.
- **Modèle mono-professeur** : un seul prof (+ admin), des élèves dans ses classes ou hors-classe. L'**école = frontière sociale / safeguarding** ; la classe = sous-groupe d'organisation.
- **Stack** : Svelte 5 (runes) · TypeScript (strict) · Tailwind 4 · Shadcn-svelte · MathLive · Supabase (Postgres + Auth + RLS, **EU / eu-west-3**) · Vercel · pnpm.

---

## ⚠️ Contrainte mémoire (OOM) — LIRE

Machine à faible RAM. **NE JAMAIS lancer sur tout le projet** (ça crashe) :
`pnpm check` · `pnpm check:fast` · `svelte-check` (sans `--incremental`) · `pnpm build` · `pnpm lint` · `npx tsc --noEmit` (en plus, faux positifs `$lib`).

- À la place : **`pnpm check:incremental`** (TS + Svelte, ~40 s à cache chaud, memory-safe, **0 erreur exigée**). ⚠️ **~10 min après une édition** (le cache est invalidé) → grouper toutes les corrections avant de relancer. Le script **refuse** un 2ᵉ run concurrent (verrou, exit 2) et **rejoue** le résultat précédent si rien n'a changé depuis (`FORCE=1` pour passer outre).
- **eslint complet OOM en local → CI-only.** Mais **`pnpm lint:fast`** (~2,5 s, 272 Mo) rejoue les 3 règles qui font rougir le job Lint — `no-unused-vars` via oxlint, plus `supabase/require-error-check` et `custom/require-zod-validation` via `eslint.fast.config.js`, une config sans `projectService` — sur les fichiers modifiés. Lancé automatiquement au `pre-push`. Ne pas lancer `pnpm lint` / `lint:all` en local.
- Le **hook pre-commit est léger** : `.lintstagedrc.js` lance `oxlint` (Rust, ~0 RAM) + `prettier` sur les fichiers staged (~2 s, **pas d'OOM**) → **`--no-verify` n'est plus nécessaire**. oxlint bloque sur _erreurs_ seulement (warnings non bloquants). eslint complet (`.svelte` + règle Zod) et les tests restent **en CI** ; le typecheck reste hors hook → `pnpm check:incremental` avant de pousser.
- ⚠️ Si un hook crashe, il peut **stasher** le travail non commité (→ perdu) : commit tôt, et après un crash vérifie `git stash list`. (L'ancien hook OOMait via `eslint --fix` type-aware + `vitest related`, d'où le `--no-verify` historique.)

---

## Commandes

```bash
pnpm dev --port 5175 --strictPort   # dev (TOUJOURS 5175 ; 5173 = user, NE PAS utiliser)
pnpm check:incremental              # TS + Svelte (memory-safe, 0 erreur exigée)
pnpm lint:fast                      # lint des fichiers modifiés (~2,5 s ; évite l'aller-retour CI)
pnpm format "src/**/*.{ts,svelte}"  # prettier --write

pnpm test:server <path>             # tests serveur (fichier ciblé)
pnpm test:client <path>             # tests client (*.svelte.test.ts)
pnpm test:integration               # intégration + DB (Supabase local)

pnpm db:start / db:reset            # Supabase local (reset = recrée depuis le baseline)
pnpm db:migrate / db:types          # push migrations → EU / régénère database.ts (cf. §Migrations)
pnpm maintenance:on / :off          # mode maintenance prod (releases à risque)
pnpm release                        # tag de version + CHANGELOG (sur main ; feat → mineur, cf. scripts/release.ts)
```

⚠️ **`pnpm dev -- --port 5175` ne marche pas** — le script est `vite dev`, donc le
`--` en trop devient un argument que vite ignore, port compris : le serveur
démarre sur **5173**, le port de l'utilisateur. Mesuré le 2026-09-10. Sans
`--strictPort`, un 5175 déjà pris fait dériver vite sur un autre port en
silence.

---

## Git Workflow (OBLIGATOIRE)

> **Process complet** : [docs/claude/git-workflow.md](docs/claude/git-workflow.md)

`main` = **production**. Tout changement de **code** : **branche → PR → CI 100 % verte → `gh pr merge --merge` → suppression de branche**. **Jamais de code direct sur `main`**.

**Changement 100 % documentaire : commit DIRECT sur `main`, sans branche ni PR — quel que soit le nombre de fichiers.** Ce n'est pas une permission, c'est une obligation : sur `pull_request` la CI n'a **pas** de `paths-ignore` (les checks requis doivent rapporter), donc une PR pour du markdown relance les 12 jobs pour rien. Sur `push`, `paths-ignore` couvre `**/*.md` et `docs/**` → un commit docs-only ne déclenche **aucune** CI et ne redéploie pas la prod.

⚠️ **Le test est mécanique, pas une impression** — avant de commiter directement :

```bash
git diff --cached --name-only | grep -v -E '^docs/|\.md$' && echo "⛔ hors docs → branche + PR" || echo "✅ docs pur → commit direct"
```

Une seule ligne hors `docs/` ou `*.md` (y compris `.github/`, `package.json`, un `.sql`) → **branche + PR**, comme tout changement de code. Plafond de 2 fichiers levé par David le 2026-09-14 : il était arbitraire, le raisonnement est le même à 2 qu'à 20.

- **CI verte avant merge** (`gh pr checks <n> --watch`). Jamais merger en rouge.
- **Conventional commits**, **header ≤ 100 caractères** (commitlint), **aucune mention Claude/Anthropic** (David = seul auteur).
- **Migrations** : additive → `db:migrate` avant/avec le deploy ; destructive → après. Uniquement depuis la branche mergée.
- **Push, PR et merge : autonomes** dès que la CI est verte. Pas besoin de me demander.
  - ⚠️ **La CI passe au vert → tu merges, immédiatement.** C'est un automatisme, pas une
    décision à réévaluer. Ne t'invente aucune exception : ni « je préfère te laisser
    trancher », ni « je viens d'annoncer que je ne le ferais pas », ni « la PR est
    grosse ». Surveille la CI **dès l'ouverture de la PR** (tâche de fond), pas quand
    on te le rappelle. Annoncer la commande de merge à ma place au lieu de l'exécuter,
    c'est ne pas respecter la consigne.

### Migrations : preuves, pas approbation

Je ne sais **pas lire une migration RLS**. Me demander « approuves-tu ? » me
transfère une responsabilité que je ne peux pas assumer : ce n'est pas un
contrôle, c'est une formalité. Ne me la demande donc plus.

**Pose-moi la question d'accès, en français, AVANT d'écrire du SQL** : « qui
pourra lire quoi, qu'il ne pouvait pas lire avant ? ». Ça, je sais y répondre —
c'est une question de produit.

Ensuite, `db:migrate` est **autonome** si les quatre conditions sont réunies :

1. la question d'accès a été posée et tranchée par moi ;
2. des tests d'intégration existent, et **tu as vérifié qu'ils échouent sans la
   migration** (un test qui passe sans prouver ce qu'il prétend est pire que
   pas de test) ;
3. `security-auditor` est passé, sans finding bloquant ;
4. la migration est **additive** et son rollback est écrit en commentaire.

Une seule condition manquante → tu t'arrêtes et tu me le dis.

**Exception absolue : les migrations destructives** (`DROP`, `DELETE`, toute
altération qui perd de la donnée). Là, aucun test ne rattrape l'erreur, et la
base contient des données d'élèves mineurs. Tu t'arrêtes toujours, et tu
m'expliques **en français ce qui va être perdu**.

⚠️ **Avant tout `DROP` : inventaire des USAGES, pas seulement des données.** Deux
vérifications distinctes, dans cet ordre :

1. **Usages** — `grep -rn "<objet supprimé>" src` pour chaque table et colonne
   visée. **Y compris dans les chaînes de caractères ET dans les schémas Zod** —
   deux angles morts, les deux déjà payés en prod :

   - les jointures PostgREST (`.select('*, ma_table(...)')`) sont du texte ;
   - un **schéma de réponse** (`z.object({ tags: z.array(...) })`) nomme la
     colonne comme une clé d'objet ordinaire. Le 2026-09-09, `worksheets.tags`
     supprimée mais toujours exigée par `worksheetResponseSchema` a fait
     répondre 500 à trois routes, et la page annonçait « Aucune feuille trouvée »
     — un message qui accuse la base d'être vide.

   Les deux sont invisibles au typecheck, au lint ET aux tests unitaires, dont
   les mocks ne touchent jamais la base. **Zéro référence, ou on ne supprime
   pas.**

2. **Données** — requête de réconciliation prouvant que tout ce que porte
   l'ancienne forme existe dans la nouvelle.

Le grep se colle dans le message : soit la preuve y est, soit elle n'a pas été
faite. Le 2026-09-08 j'ai fait la 2 sans la 1 — six requêtes cassées en
production, sur les listes d'exercices, les pages Python et l'export admin.

Je peux te demander « explique-moi cette migration » à tout moment : tu me dis
qui gagne quel accès et ce qui casserait si elle était fausse — pas le SQL, ses
conséquences.

---

## Worktrees

> Règles complètes : [docs/claude/worktrees.md](docs/claude/worktrees.md)

Un chantier = un worktree **frère** du dépôt :
`git worktree add -b <type>/<sujet> ../ubumaths-wt-<sujet> origin/main`, puis
`cp ../ubumaths/.env ../ubumaths/.env.local . && pnpm install --prefer-offline`
(5,2 s ; `.env` et `node_modules` ne suivent pas le worktree).

- **Le dépôt principal reste sur `main`** — commits 100 % doc, `release`,
  `db:migrate` d'après-merge, lecture. **Jamais de chantier dedans.**
- **Un worktree = une branche = une session.** Annoncer `git worktree list` +
  `pwd` au premier message.
- ⚠️ **Un worktree n'isole ni la RAM, ni Supabase local, ni les ports** — et deux
  sessions ne se voient pas. Deux verrous partagés — tenus par le
  noyau (`flock`), donc jamais périmés — s'en chargent : `typecheck`
  (`check:incremental`) et `supabase` (tous les `db:*`
  locaux et `test:integration`). Un refus sort en **exit 2** et nomme le worktree
  détenteur : **ça s'attend, ça ne se contourne pas.**
- ⛔ **`pnpm kill:servers` interdit depuis un worktree** : il tue 5173 (le
  serveur de David) et Supabase. Kill ciblé sur son propre port.
- `docs/wip/<sujet>-progress.md` **commité au premier commit** — non suivi, il
  est invisible des autres sessions et meurt avec le worktree.
- Fin de vie dès la PR mergée : `git worktree remove` + `git branch -d` +
  `git worktree list` pour vérifier.

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

### ⚠️ La RLS échoue en SILENCE — lire [rls-echecs-silencieux.md](docs/ref/rls-echecs-silencieux.md)

**Une opération refusée par la RLS ne rend pas d'erreur : elle rend zéro ligne.**
Donc `if (error) throw` ne peut PAS se déclencher sur un refus, et une absence
ressemble à un vide légitime. Quatre conséquences, toutes payées le 2026-09-15 :

1. **Écriture** : `.delete()`/`.update()` refusé affecte 0 ligne sans erreur →
   toujours `.select()` et vérifier les lignes rendues. Un écran a annoncé avoir
   supprimé une amitié signalée entre deux mineurs sans rien supprimer.
2. **Jointure `!inner`** sous RLS : la ligne PARENTE disparaît quand l'enfant est
   masqué → rangs et totaux faux, sans log. Préférer un `SECURITY DEFINER`.
3. **Une garde centralisée ne protège que ce qui passe par elle.** Chercher
   `grep "from('<table>')"` en plus du nom de la fonction : trois endroits
   refaisaient la requête à la main, invisibles au grep sur `is_class_member`.
4. **Les policies permissives se combinent en OU.** Une seule `using (true)`
   rend inutiles toutes les autres, qui restent correctes et sans effet.

⚠️ **Retirer une policy est aussi risqué qu'en ouvrir une.** Poser la question
d'accès EN MIROIR (« qui ne pourra plus lire ce qu'il lisait ? »), et la MESURER
sur les données réelles — une policy qui paraît redondante peut être la seule
qui fonctionne.

⚠️ **`db:types` génère depuis la PRODUCTION** : une RPC pas encore en prod
n'existe pas dans `database.ts`. Livrer une fonction SQL + le code qui l'appelle
demande donc **deux PR** — la migration d'abord, `db:migrate`, `db:types`, puis
le code.

---

## Quand utiliser un agent

- **Travail direct** (pas d'agent) si : bug ciblé 1-2 fichiers connus · modif < 20 lignes · investigation (Read/Grep) · faisable en < 5 min.
- **Agent** si : > 3 étapes ET code important ET plusieurs fichiers ET expertise spécialisée. Ne pas hésiter à utiliser **Opus**. Plafonner les briefs (max N lignes / M fichiers).
- **Interdit aux agents** : lancer build/lint/check/format (cf. OOM) ; tourner > 5 min sans résultat concret.

(Liste complète : `.claude/agents/README.md`.)

---

## Planning (plans multi-phases)

> **Architecture des tests** : [docs/ref/tests/architecture.md](docs/ref/tests/architecture.md) — le workflow TDD collaboratif, lui, est décrit ci-dessous (points 1 à 3).

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

| Doc                                                                     | Contenu                                    |
| ----------------------------------------------------------------------- | ------------------------------------------ |
| [git-workflow.md](docs/claude/git-workflow.md)                          | **Workflow git OBLIGATOIRE**               |
| [worktrees.md](docs/claude/worktrees.md)                                | **Worktrees** : règles + verrous partagés  |
| [architecture.md](docs/claude/architecture.md)                          | Structure, routing, perf                   |
| [best-practices.md](docs/claude/best-practices.md)                      | Svelte 5, TypeScript                       |
| [ui-components.md](docs/claude/ui-components.md)                        | Shadcn, MySelect, Tailwind                 |
| [database.md](docs/claude/database.md)                                  | Supabase, migrations                       |
| [quality-standards.md](docs/claude/quality-standards.md)                | Tests, linting, Zod                        |
| [observabilite-erreurs-prod.md](docs/ref/observabilite-erreurs-prod.md) | **Lire les erreurs de prod** (Vercel, 7 j) |
| [warning-svelte.md](docs/ref/warning-svelte.md)                         | `svelte-ignore` légitime vs dette a11y     |
| [css-color-tokens.md](docs/ref/css-color-tokens.md)                     | `var(--color-*)`, jamais `hsl(var(--x))`   |
| [realtime.md](docs/claude/realtime.md)                                  | Realtime, chat, présence                   |
| [docs/ref/tests/](docs/ref/tests/)                                      | Architecture des tests + TDD               |

Toute la doc : [docs/](docs/).

---

**Rappel** : code explicite et simple > astuces clever.
