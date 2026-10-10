# CLAUDE.md — UbuMaths

Guide essentiel pour Claude Code. Doc détaillée : [docs/README.md](docs/README.md) — `docs/systeme/` (ce que fait le code) · `docs/pratiques/` (comment travailler).

---

## Contexte (toujours en tête)

- Application éducative de mathématiques, élèves francophones. **UI en français. Identifiants et noms de symboles en anglais ; commentaires en français** — `const targetClasses`, mais le commentaire au-dessus reste en français. (Tranché le 2026-09-12 : le dépôt compte ~4700 lignes de commentaires français dans 713 fichiers.)
- ⚠️ **PRODUCTION LIVE** : la branche `production` est déployée en prod (Vercel), avancée à la main par `pnpm deploy:prod` ([ADR 0021](docs/adr/0021-branche-production-mise-en-prod-manuelle.md)). Vraies données d'**élèves mineurs** → **RGPD, prudence maximale** sur tout ce qui touche données / auth / social.
- **Modèle mono-professeur** : un seul prof (+ admin), des élèves dans ses classes ou hors-classe. L'**école = frontière sociale / safeguarding** ; la classe = sous-groupe d'organisation.
- **Vocabulaire du domaine : [CONTEXT.md](CONTEXT.md)** (un terme, un sens ; termes bannis). **Décisions figées : [docs/adr/](docs/adr/)** — les lire avant de proposer une architecture ; une décision listée ne se re-propose pas sans le dire.
- **Stack** : Svelte 5 (runes) · TypeScript (strict) · Tailwind 4 · Shadcn-svelte · MathLive · Supabase (Postgres + Auth + RLS, **EU / eu-west-3**) · Vercel · pnpm.

---

## ⚠️ Gros process : un seul à la fois — LIRE

Machine : **Mac mini Apple M6, 24 Go**. Mesuré le 2026-09-29, **swap +0 partout** (détail : [étape 5](docs/pratiques/mesures-mac-mini.md)) : `pnpm check` 82 s (plus gros process 5,3 Go) · `pnpm build` 64 s (5,7 Go) · `pnpm lint` 530 s (4,1 Go) · `check:incremental` 44 s à chaud, 82 s à cache froid · `test:integration` 180 s.

- **`pnpm check`, `pnpm build`, `pnpm lint` : autorisés, UN SEUL gros process à la fois.** Ils passent sous le **même verrou** que `check:incremental` (`scripts/gros-process.sh`, depuis le 2026-10-10) : un second gros process sort en **exit 2** en nommant le détenteur, ça s'attend. Pas de verrou en CI ni sur Vercel.
- **eslint complet autorisé en local, en arrière-plan** (`pnpm lint`, 530 s à froid : trop près de la coupure à 10 min du premier plan ; avec son cache ESLint, les passages suivants ne relisent que les fichiers changés).
- **Déconseillés — limite de Node, pas de la RAM** : `npx tsc --noEmit` (et l'ancien script `check:fast`, retiré le 2026-10-10) et `svelte-check` sans `--tsgo` ni `--incremental` meurent sur le **tas par défaut de Node (~4 Go)** : `JavaScript heap out of memory`, exit 134, en 44-47 s, swap +0 (mesuré le 2026-09-29). Plus de RAM n'y change rien. `tsc --noEmit` donne en plus des faux positifs `$lib`.
- **Le check du quotidien : `pnpm check:incremental`** (TS + Svelte, **0 erreur exigée**) : moteur **tsgo** (TypeScript 7) depuis le 2026-10-10, **~18 s, ~20 s à froid** (`FRESH=1`), plus gros process 6 Go. La CI garde le moteur classique (`pnpm check`), qui **fait foi** en cas de désaccord : tsgo a un angle mort mesuré (type des fonctions exposées d'un composant Svelte). Verrou : un 2ᵉ run concurrent sort en **exit 2** ; si rien n'a changé, le résultat précédent est rejoué (`FORCE=1` pour passer outre).
- **`pnpm lint:fast`** (~2,5 s, contre 530 s pour eslint complet — le motif est la **durée**) rejoue toutes les règles de niveau **erreur** de la config complète, sans `projectService` (`eslint.fast.config.js` en dérive : la liste ne peut plus diverger de la CI ; seule `svelte/no-unused-props`, qui exige les types, reste vue par la CI seule). Élargi le 2026-10-07, après un échec CI sur `no-fallthrough` invisible à l'ancien `lint:fast`. Lancé au `pre-push`.
- **Hook pre-commit léger** (`oxlint` + `prettier` sur les fichiers staged, ~2 s — motif : la **durée**, un eslint complet prend 530 s) → **`--no-verify` n'est plus nécessaire**. oxlint ne bloque que sur les _erreurs_. eslint complet et les tests restent **en CI** ; le typecheck reste hors hook → `check:incremental` avant de pousser.
- ⚠️ Si un hook crashe, il peut **stasher** le travail non commité (→ perdu) : commiter tôt, et après un crash vérifier `git stash list`.

---

## Commandes

```bash
pnpm dev --port 5175 --strictPort   # dev (TOUJOURS 5175 ; 5173 = user, NE PAS utiliser)
pnpm check:incremental              # TS + Svelte (tsgo, ~18 s, 0 erreur exigée)
pnpm types:cliquet                  # types des tests : cliquet par fichier (--maj après corrections)
pnpm lint:fast                      # lint des fichiers modifiés (~2,5 s ; évite l'aller-retour CI)
pnpm format "src/**/*.{ts,svelte}"  # prettier --write

pnpm test:server <path>             # tests serveur (fichier ciblé)
pnpm test:client <path>             # tests client (*.svelte.test.ts)
pnpm test:integration               # intégration + DB (Supabase local)

pnpm db:start / db:reset            # Supabase local (reset = recrée depuis le baseline)
pnpm db:migrate / db:types          # push migrations → EU / régénère database.ts (cf. §Migrations)
pnpm db:reset && pnpm db:seed-riche # base locale remplie : contenu de la prod + 30 élèves fictifs (eleveNN@local.test / local-eleve)
pnpm maintenance:on / :off          # mode maintenance prod (releases à risque)
pnpm deploy:prod                    # mise en prod : version (CHANGELOG, tag) + branche production (sur demande de David)
```

⚠️ **`pnpm dev -- --port 5175` ne marche pas** — le `--` en trop devient un argument que vite ignore, port compris : le serveur démarre sur **5173**, celui de David (mesuré le 2026-09-10). Sans `--strictPort`, un 5175 déjà pris fait dériver vite en silence.

---

## Git Workflow (OBLIGATOIRE)

> **Process complet** : [docs/pratiques/git-workflow.md](docs/pratiques/git-workflow.md)

`main` = **branche de travail** ; la prod suit la branche `production`. Tout changement de **code** : **branche → PR → CI 100 % verte → `gh pr merge --merge` → suppression de branche**. **Jamais de code direct sur `main`**.

**Changement 100 % documentaire : commit DIRECT sur `main`, sans branche ni PR — quel que soit le nombre de fichiers.** Ce n'est pas une permission, c'est une obligation : sur `pull_request` la CI n'a pas de `paths-ignore`, donc une PR pour du markdown relance les 12 jobs pour rien ; sur `push`, le filtre `paths` de `quality.yml` exclut `**/*.md` et `docs/**` (mais réinclut `src/**`, `static/**` et `data/**`).

⚠️ **Le test est mécanique, pas une impression** — avant de commiter directement :

```bash
git diff --cached --name-only | grep -v -E '^docs/|\.md$' && echo "⛔ hors docs → branche + PR" || echo "✅ docs pur → commit direct"
```

Une seule ligne hors `docs/` ou `*.md` (y compris `.github/`, `package.json`, un `.sql`) → **branche + PR**. (Plafond de 2 fichiers levé le 2026-09-14 : le raisonnement est le même à 2 qu'à 20.)

⚠️ **Aucun test ne lit `docs/`** (2026-10-08 : un commit de doc a passé `docs/wip/arbre-notions/arbre-notions.json` en .15 sans CI, et le test du seed a cassé sur toutes les PR suivantes). Un fichier dont dépend un test vit sous `tests/fixtures/` ou `tests/integration/fixtures/` (copie figée, mise à jour avec la migration ou le code qui la justifie) ; garde : `src/lib/__tests__/tests-sans-lecture-de-docs.test.ts`. Les **données de travail** lues par des scripts et des tests (`data/corrections/`, `data/relecture/`) vivent sous `data/`, hors `docs/` : tout push qui touche `data/` déclenche la CI.

- **CI verte avant merge** (`gh pr checks <n> --watch`). Jamais merger en rouge.
- **Conventional commits**, **header ≤ 100 caractères** (commitlint), **aucune mention Claude/Anthropic** (David = seul auteur).
- **Migrations** : additive → `db:migrate` au merge (la base peut précéder le code en prod) ; destructive → seulement après le `deploy:prod` qui livre le code qui n'en dépend plus. Uniquement depuis la branche mergée.
- ⛔ **Mise en prod = `pnpm deploy:prod`, UNIQUEMENT sur demande explicite de David** (ADR 0021). Un merge ne déploie plus rien : ne jamais lancer `deploy:prod` de sa propre initiative, même CI verte. Il crée aussi la version (`pnpm release`) : plus de `pnpm release` à part. `pnpm deploy:prod --essai` montre ce qui partirait.
- **Push, PR et merge : autonomes** dès que la CI est verte. Pas besoin de me demander.
- ⚠️ **La CI passe au vert → tu merges, immédiatement.** C'est un automatisme, pas une décision à réévaluer. Aucune exception inventée : ni « je préfère te laisser trancher », ni « je viens d'annoncer que je ne le ferais pas », ni « la PR est grosse ». Surveille la CI **dès l'ouverture de la PR** (tâche de fond). Annoncer la commande de merge à ma place au lieu de l'exécuter, c'est ne pas respecter la consigne.

### Migrations : preuves, pas approbation

Je ne sais **pas lire une migration RLS**. Me demander « approuves-tu ? » me transfère une responsabilité que je ne peux pas assumer : ce n'est pas un contrôle, c'est une formalité. **Ne me la demande plus.**

**Pose-moi la question d'accès, en français, AVANT d'écrire du SQL** : « qui pourra lire quoi, qu'il ne pouvait pas lire avant ? ». Ça, je sais y répondre — c'est une question de produit.

Ensuite, `db:migrate` est **autonome** si les quatre conditions sont réunies :

1. la question d'accès a été posée et tranchée par moi ;
2. des tests d'intégration existent, et **tu as vérifié qu'ils échouent sans la migration** (un test qui passe sans prouver ce qu'il prétend est pire que pas de test) ;
3. `security-auditor` est passé, sans finding bloquant ;
4. la migration est **additive** et son rollback est écrit en commentaire.

**Une seule condition manquante → tu t'arrêtes et tu me le dis.**

⛔ **Exception absolue : les migrations destructives** (`DROP`, `DELETE`, toute altération qui perd de la donnée). Aucun test ne rattrape l'erreur, et la base contient des données d'élèves mineurs. Tu t'arrêtes **toujours**, et tu m'expliques **en français ce qui va être perdu**.

⚠️ **Avant tout `DROP` : inventaire des USAGES, pas seulement des données.** Deux vérifications, dans cet ordre :

1. **Usages** — `grep -rn "<objet supprimé>" src` pour chaque table et colonne visée, **y compris dans les chaînes de caractères ET dans les schémas Zod**. Deux angles morts déjà payés en prod : les jointures PostgREST (`.select('*, ma_table(...)')`) sont du texte, et un schéma de réponse nomme la colonne comme une clé ordinaire (`worksheets.tags` supprimée mais toujours exigée par `worksheetResponseSchema` → 500 sur trois routes, et la page annonçait « Aucune feuille trouvée »). Invisibles au typecheck, au lint et aux tests unitaires, dont les mocks ne touchent jamais la base. **Zéro référence, ou on ne supprime pas.**
2. **Données** — requête de réconciliation prouvant que tout ce que porte l'ancienne forme existe dans la nouvelle.

**Le grep se colle dans le message** : soit la preuve y est, soit elle n'a pas été faite. Le 2026-09-08, la 2 faite sans la 1 → six requêtes cassées en production.

Je peux demander « explique-moi cette migration » à tout moment : tu me dis qui gagne quel accès et ce qui casserait si elle était fausse — pas le SQL, ses conséquences.

---

## Worktrees

> Règles complètes : [docs/pratiques/worktrees.md](docs/pratiques/worktrees.md)

Un chantier = un worktree **frère** du dépôt :

```bash
git worktree add -b <type>/<sujet> ../ubumaths-wt-<sujet> origin/main
cp ../ubumaths/.env ../ubumaths/.env.local . && pnpm install --prefer-offline
```

(`.env` et `node_modules` ne suivent pas le worktree.)

- **Le dépôt principal reste sur `main`** — commits 100 % doc, `release`, `db:migrate` d'après-merge, lecture. **Jamais de chantier dedans.**
- **Un worktree = une branche = une session.** Annoncer `git worktree list` + `pwd` au premier message.
- ⚠️ **Un worktree n'isole ni la RAM, ni Supabase local, ni les ports** — et deux sessions ne se voient pas. Deux verrous partagés, tenus par le noyau (`flock`) donc jamais périmés : `typecheck` (`check:incremental`) et `supabase` (tous les `db:*` locaux et `test:integration`). Un refus sort en **exit 2** et nomme le worktree détenteur : **ça s'attend, ça ne se contourne pas.**
- ⛔ **`pnpm kill:servers` interdit depuis un worktree** : il tue 5173 (le serveur de David) et Supabase. Kill ciblé sur son propre port.
- `docs/wip/<sujet>-progress.md` **commité au premier commit** — non suivi, il est invisible des autres sessions et meurt avec le worktree.
- Fin de vie dès la PR mergée : `git worktree remove` + `git branch -d` + `git worktree list` pour vérifier.

---

## Règles de code (non négociables)

**0. Ne JAMAIS supprimer un fichier non suivi par git** (`rm`/`mv`) sans demander. `git status` d'abord ; si untracked dans la cible → STOP et demander.

**1. Valider toute entrée avec Zod** (`request.json()`, query params) — bornes numériques `.min()`/`.max()`, limites de tableaux, UUID :

```typescript
const schema = z.object({
	userId: z.string().uuid(),
	amount: z.number().int().positive().max(1000)
});
const v = schema.safeParse(await request.json());
if (!v.success) throw error(400, v.error.issues[0].message);
```

→ [qualite.md](docs/pratiques/qualite.md#input-validation-with-zod)

**2. MySelect & MyCheckbox** — jamais Shadcn Select/Checkbox direct ni `<select>`/`<input type="checkbox">` natifs. → [composants-ui.md](docs/pratiques/composants-ui.md)

```svelte
<MySelect type="single" bind:value={selected} {items} />
<MyCheckbox bind:checked={isEnabled} label="Enable" />
```

**3. Svelte 5 runes uniquement** — `$state` / `$derived` / `$props`, jamais `export let` ni `$:`. Réactivité : **event → handler → maj du state → maj du DOM**. `$effect` réservé aux side-effects. → [svelte-typescript.md](docs/pratiques/svelte-typescript.md#svelte-5-runes)

**4. Jamais `any`** — types propres, `unknown` + type guards, ou types de `$lib/types/database`.

**5. Après création/modif d'un `.svelte` → `pnpm svelte:autofix <fichier>`** systématiquement (ou l'outil MCP `svelte-autofixer` s'il est configuré — il ne l'est pas dans `.mcp.json`).

**6. Types dérivés dans `database-helpers.ts`** — `database.ts` est auto-généré (`pnpm db:types`), **ne JAMAIS y ajouter de type**. `Database`/`Tables`/`Json` → `$lib/types/database` ; alias, unions, composites → `$lib/types/database-helpers`.

---

## Base de données

> **Détails** : [pratiques/base-de-donnees.md](docs/pratiques/base-de-donnees.md) · schéma : [systeme/base-de-donnees.md](docs/systeme/base-de-donnees.md) (à maj après changement de schéma)

- Migration `.sql` dans `supabase/migrations/` (`<timestamp>_<description>.sql`). **Jamais** modifier le schéma via le Dashboard Supabase.
- **CLI Supabase = devDependency du projet** (version exacte dans `package.json`), aucune CLI globale : les scripts `pnpm db:*` la trouvent seuls ; à la main, `pnpm exec supabase …` (jamais `supabase …` ni `npx supabase`).
- **Tests d'intégration locaux OBLIGATOIRES** pour toute RLS / fonction `SECURITY DEFINER` / trigger / policy (`db:start` + `test:integration`). **JAMAIS** valider par un smoke-test `auth.uid()` NULL : le garde sort avant la requête → faux positif.
- Après push : `pnpm db:types` (+ commit). **Interroger la prod** : MCP Supabase **read-only** (EU).
- ⚠️ **`db:types` génère depuis la PRODUCTION** : une RPC pas encore en prod n'existe pas dans `database.ts`. Livrer une fonction SQL + le code qui l'appelle demande donc **deux PR** — la migration d'abord, `db:migrate`, `db:types`, puis le code.

### ⚠️ La RLS échoue en SILENCE — lire [rls-echecs-silencieux.md](docs/pratiques/rls-echecs-silencieux.md)

**Une opération refusée par la RLS ne rend pas d'erreur : elle rend zéro ligne.** Donc `if (error) throw` ne peut PAS se déclencher sur un refus, et une absence ressemble à un vide légitime. Quatre conséquences, toutes payées le 2026-09-15 :

1. **Écriture** — `.delete()`/`.update()` refusé affecte 0 ligne sans erreur → toujours `.select()` et vérifier les lignes rendues. Un écran a annoncé avoir supprimé une amitié signalée entre deux mineurs sans rien supprimer.
2. **Jointure `!inner`** — la ligne PARENTE disparaît quand l'enfant est masqué → rangs et totaux faux, sans log. Préférer un `SECURITY DEFINER`.
3. **Une garde centralisée ne protège que ce qui passe par elle** — greper `from('<table>')` en plus du nom de la fonction : trois endroits refaisaient la requête à la main.
4. **Les policies permissives se combinent en OU** — une seule `using (true)` rend inutiles toutes les autres, qui restent correctes et sans effet.

⚠️ **Retirer une policy est aussi risqué qu'en ouvrir une.** Poser la question d'accès EN MIROIR (« qui ne pourra plus lire ce qu'il lisait ? ») et la MESURER sur les données réelles — une policy qui paraît redondante peut être la seule qui fonctionne.

---

## Quand utiliser un agent

- **Travail direct** (pas d'agent) si : bug ciblé 1-2 fichiers connus · modif < 20 lignes · investigation (Read/Grep) · faisable en < 5 min.
- **Agent** si : > 3 étapes ET code important ET plusieurs fichiers ET expertise spécialisée. Ne pas hésiter à utiliser **Opus**. Plafonner les briefs (max N lignes / M fichiers).
- **Agents autorisés** : `pnpm check:incremental` (verrouillé) et les tests ciblés. ⛔ **Réservés à la session principale** : `pnpm check`, `pnpm build`, `pnpm lint` complets — verrouillés depuis le 2026-10-10, mais longs et lourds : un agent ne doit pas tenir le verrou à la place de la session.

(Liste complète : `.claude/agents/README.md`.)

---

## Planning (plans multi-phases)

> **Architecture des tests** : [docs/pratiques/tests.md](docs/pratiques/tests.md) — le workflow TDD collaboratif est décrit ci-dessous (points 1 à 3).

1. **Phase 0 — Spécification TDD** : proposer les comportements en français (cas nominal / limite / erreur), **attendre validation** avant de coder.
2. **Agents ET modèles spécifiés** par tâche (Opus sans hésiter).
3. **Tests d'abord** (doivent échouer) → implémentation → tests passent.
4. **`code-reviewer`** en fin de phase ; **`security-auditor`** si auth/RLS/API ; **performance** si requêtes DB lourdes.
5. **Doc de progression** `docs/wip/<feature>-progress.md` (crash-recovery) entre phases ; lister les docs produits à la fin.
6. **Exécution autonome** : ne pas s'arrêter au premier échec, corriger automatiquement (`debugger`/Opus si > 2 tentatives).

**Definition of Done** (avant d'ouvrir/merger la PR) :

- [ ] Code fonctionnel + tests passent (intégration locale si DB/RLS)
- [ ] `pnpm svelte:autofix` sur les `.svelte` modifiés · `pnpm check:incremental` = 0 erreur
- [ ] Tests ajoutés ou touchés : `pnpm types:cliquet` tenu (un nouveau test naît typé ; une erreur corrigée → `--maj`)
- [ ] `code-reviewer` (+ `security-auditor` si applicable)
- [ ] Zod sur les entrées · pas de `any` · MySelect/MyCheckbox · runes only

---

## Structure & patterns

```
src/lib/{components,server,stores,utils,types}/   server/ = code serveur (validation/ = Zod)
src/routes/{(public),(protected),api}/            (protected) = auth requise ; api = +server.ts
```

- **Ordre dans un fichier** : Imports → Types → Constantes → Variables → Functions → Components.
- Toasts : `import { toaster } from '$lib/stores/toaster.svelte'` puis `toaster.success('Message')` (`.error` / `.warning` / `.info`).
- Handlers en minuscule (Svelte 5) : `<Button onclick={handleClick}>`.
- Optimistic UI · Debouncing · Realtime → [architecture-generale.md](docs/systeme/architecture-generale.md) · [realtime.md](docs/systeme/realtime.md)

---

## Documentation

> **Carte complète : [docs/README.md](docs/README.md)** — chaque module de `src/lib` → sa doc. `docs/systeme/` décrit ce que fait le code ; `docs/pratiques/` décrit comment travailler ; `docs/wip/` = chantiers vivants seulement ; `docs/archive/` = le reste.
> **Fin de chantier = versement** : ce qui est durable passe dans `docs/systeme/`, puis le journal wip est archivé.

| Doc                                                                           | Contenu                                            |
| ----------------------------------------------------------------------------- | -------------------------------------------------- |
| [CONTEXT.md](CONTEXT.md)                                                      | **Glossaire du domaine** (unique)                  |
| [docs/adr/](docs/adr/)                                                        | **Décisions d'architecture figées**                |
| [git-workflow.md](docs/pratiques/git-workflow.md)                             | **Workflow git OBLIGATOIRE**                       |
| [worktrees.md](docs/pratiques/worktrees.md)                                   | **Worktrees** : règles + verrous partagés          |
| [skills-claude.md](docs/pratiques/skills-claude.md)                           | **Mode d'emploi** des skills et commandes          |
| [commandes.md](docs/pratiques/commandes.md)                                   | Scripts pnpm                                       |
| [svelte-typescript.md](docs/pratiques/svelte-typescript.md)                   | Svelte 5, TypeScript                               |
| [composants-ui.md](docs/pratiques/composants-ui.md)                           | Shadcn, MySelect, Tailwind                         |
| [pratiques/base-de-donnees.md](docs/pratiques/base-de-donnees.md)             | Supabase, migrations                               |
| [qualite.md](docs/pratiques/qualite.md) · [tests.md](docs/pratiques/tests.md) | Linting, Zod · architecture des tests + TDD        |
| [rls-echecs-silencieux.md](docs/pratiques/rls-echecs-silencieux.md)           | **La RLS échoue en silence**                       |
| [notation-unites.md](docs/pratiques/notation-unites.md)                       | **Écrire une grandeur** : `~3[m.s^-1]~`, affichage |
| [fiches-exercices.md](docs/pratiques/fiches-exercices.md)                     | **Créer des fiches** : démarche, choix, pièges PDF |
| [observabilite-erreurs-prod.md](docs/pratiques/observabilite-erreurs-prod.md) | **Lire les erreurs de prod** (Vercel, 7 j)         |
| [warning-svelte.md](docs/pratiques/warning-svelte.md)                         | `svelte-ignore` légitime vs dette a11y             |
| [css-color-tokens.md](docs/pratiques/css-color-tokens.md)                     | `var(--color-*)`, jamais `hsl(var(--x))`           |
| [architecture-generale.md](docs/systeme/architecture-generale.md)             | Structure, routing, perf                           |
| [systeme/base-de-donnees.md](docs/systeme/base-de-donnees.md)                 | Schéma de la base                                  |
| [panel-simplifications.md](docs/systeme/mathast/panel-simplifications.md)     | **Ce que `simplify` et les 4 intentions rendent**  |
| [convention-equivalence.md](docs/systeme/mathast/convention-equivalence.md)   | **Ce que `areEquivalent` veut dire** (domaines)    |
| [realtime.md](docs/systeme/realtime.md)                                       | Realtime, chat, présence                           |

---

**Rappel** : code explicite et simple > astuces clever.
