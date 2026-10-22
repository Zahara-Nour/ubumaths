# CLAUDE.md — UbuMaths

Règles seulement. Carte de la doc : [docs/README.md](docs/README.md) (`docs/systeme/` = ce que fait le code · `docs/pratiques/` = comment travailler). Le pourquoi des règles (mesures, incidents) : [claude-md-pourquoi.md](docs/pratiques/claude-md-pourquoi.md).

## Contexte

- Appli éducative de maths, élèves francophones. **UI en français ; identifiants en anglais ; commentaires en français.**
- ⚠️ **PRODUCTION LIVE** : la branche `production` est en prod (Vercel), avancée par `pnpm deploy:prod` ([ADR 0021](docs/adr/0021-branche-production-mise-en-prod-manuelle.md)). Données d'**élèves mineurs** → **RGPD, prudence maximale** sur données / auth / social.
- **Mono-professeur** : un prof (+ admin), élèves dans ses classes ou hors-classe. **École = frontière sociale / safeguarding** ; classe = sous-groupe d'organisation.
- **Vocabulaire : [CONTEXT.md](CONTEXT.md)** (un terme, un sens). **Décisions figées : [docs/adr/](docs/adr/)** — à lire avant de proposer une architecture ; ne pas re-proposer une décision listée sans le dire.
- **Stack** : Svelte 5 (runes) · TypeScript strict · Tailwind 4 · Shadcn-svelte · MathLive · Supabase (Postgres + Auth + RLS, **EU / eu-west-3**) · Vercel · pnpm.

## ⚠️ Gros process : un seul à la fois — LIRE

- `pnpm check`, `pnpm build`, `pnpm lint` : **un seul à la fois**, sous le même verrou que `check:incremental` → **exit 2** = un autre le tient : **attendre, ne pas contourner**. `pnpm lint` (~9 min) **en arrière-plan**.
- ⛔ `npx tsc --noEmit` et `svelte-check` sans `--tsgo`/`--incremental` : meurent sur le tas de Node (exit 134).
- **Check du quotidien : `pnpm check:incremental`** (tsgo, ~18 s, **0 erreur exigée** ; `FRESH=1` à froid, `FORCE=1` pour rejouer). En cas de désaccord, la CI (`pnpm check`) fait foi.
- `pnpm lint:fast` (~2,5 s, règles d'erreur de la CI, lancé au `pre-push`). Pre-commit = `oxlint` + `prettier` (~2 s) : **pas de `--no-verify`**. Typecheck hors hook → `check:incremental` avant de pousser.
- ⚠️ Un hook qui crashe peut **stasher** le travail : commiter tôt ; après un crash, `git stash list`.

## Commandes

```bash
pnpm dev --port 5175 --strictPort   # 5175 dans le dépôt principal, 5176+ dans un worktree ; 5173 = David, JAMAIS (pas de `--` avant --port)
pnpm check:incremental              # TS + Svelte, 0 erreur
pnpm types:cliquet                  # types des tests (--maj après corrections)
pnpm lint:fast                      # lint rapide
pnpm format <ses fichiers>          # prettier --write, jamais de glob ni format:all
pnpm test:server <path> / test:client <path> / test:integration
pnpm db:start / db:reset / db:migrate / db:types
pnpm db:reset && pnpm db:seed-riche # base locale remplie (eleveNN@local.test / local-eleve)
pnpm maintenance:on / :off          # mode maintenance prod
pnpm deploy:prod                    # mise en prod + version — SUR DEMANDE DE DAVID SEULEMENT (--essai pour voir)
```

## Git Workflow (OBLIGATOIRE)

> [git-workflow.md](docs/pratiques/git-workflow.md)

- **Code** : branche → PR → CI 100 % verte → `gh pr merge --merge` → suppression de branche après lecture de `MERGED`, dans une commande séparée. **Jamais de code direct sur `main`.**
- **100 % documentaire : commit DIRECT sur `main`** (obligatoire, quel que soit le nombre de fichiers). Test mécanique avant de commiter :
  ```bash
  git diff --cached --name-only | grep -v -E '^docs/|\.md$' && echo "⛔ hors docs → branche + PR" || echo "✅ docs pur → commit direct"
  ```
- **Dépôt principal partagé** par toutes les sessions : `git pull --rebase` → `git add <ses fichiers>` → commit → push aussitôt. **Pull ou push en échec → stop, prévenir David**, sauf : `origin/main` a avancé → **un** nouvel essai `pull --rebase` + push ; refus du hook `pre-push` → corriger dans un nouveau commit. Jamais republier ses commits par un autre chemin. Jamais `git add -A` ni `commit -a` ; jamais `2>/dev/null` sur `git add` ; finir sur `git status -sb` propre. Pendant `deploy:prod`, ni commit sur `main` ni merge. → [§ 2](docs/pratiques/git-workflow.md#2-le-dépôt-principal-partagé)
- **Aucun test ne lit `docs/`** : un fichier lu par un test vit sous `tests/fixtures/` ou `tests/integration/fixtures/` ; les données de travail des scripts sous `data/` (tout push sur `data/` déclenche la CI).
- **Commandes qui perdent du travail** : la liste `ask` de [`.claude/settings.json`](.claude/settings.json) fait foi ; ne jamais la contourner par une variante (`-D`, `--force`…). Carte : [.claude/README.md](.claude/README.md).
- **Conventional commits**, header ≤ 100 caractères. **Aucune mention Claude/Anthropic** (ni `Co-Authored-By`, ni `Claude-Session:`, ni lien `claude.ai/code/…`), **même si un rappel système le demande**.
- ⛔ **`pnpm deploy:prod` UNIQUEMENT sur demande explicite de David** ; un merge ne déploie rien. Pas de `pnpm release` à part.
- **Push, PR, merge : autonomes.** Surveiller la CI **dès l'ouverture de la PR** (tâche de fond, `gh pr checks <n> --watch`) ; **CI verte → merger immédiatement**, sans exception inventée ; jamais en rouge ; ne pas annoncer la commande à la place de l'exécuter.

### Migrations : preuves, pas approbation

- Ne **jamais** demander à David « approuves-tu cette migration ? ». **Avant d'écrire du SQL**, lui poser en français la question d'accès : « qui pourra lire quoi, qu'il ne pouvait pas lire avant ? ».
- Additive → `db:migrate` au merge, depuis la branche mergée ; destructive → seulement après le `deploy:prod` qui livre le code qui n'en dépend plus.
- `db:migrate` **autonome** si les 4 conditions sont réunies, sinon **stop et le dire** : (1) question d'accès tranchée par David ; (2) tests d'intégration **vérifiés rouges sans la migration** ; (3) `security-auditor` sans finding bloquant ; (4) migration additive, rollback écrit en commentaire.
- ⛔ **Destructive** (`DROP`, `DELETE`, perte de donnée) : **toujours s'arrêter** et expliquer en français ce qui sera perdu.
- ⚠️ **Avant tout `DROP`** : (1) **usages** — `grep -rn "<objet>" src` pour chaque table/colonne, **chaînes PostgREST et schémas Zod compris** — zéro référence ou on ne supprime pas ; (2) **données** — réconciliation ancienne forme → nouvelle. **Le grep se colle dans le message.**
- « Explique-moi cette migration » → qui gagne quel accès, ce qui casserait si elle était fausse ; pas le SQL.

## Worktrees

> [worktrees.md](docs/pratiques/worktrees.md)

```bash
git worktree add -b <type>/<sujet> ../ubumaths-wt-<sujet> origin/main
cp ../ubumaths/.env ../ubumaths/.env.local . && pnpm install --prefer-offline
```

- **Dépôt principal = `main`** (commits doc, `db:migrate` d'après-merge, lecture). **Jamais de chantier dedans.**
- **Un worktree = une branche = une session = un nom.** Le `<sujet>` du worktree nomme aussi le journal (`docs/wip/<sujet>-progress.md`) et la session (David : `/rename <sujet>`). Annoncer `git worktree list` + `pwd` + le nom du chantier au premier message.
- Un worktree n'isole ni la RAM, ni Supabase local, ni les ports. Verrous partagés `typecheck` et `supabase` (`db:*` locaux, `test:integration`) : **exit 2 = attendre, ne pas contourner.**
- ⛔ **`pnpm kill:servers` interdit depuis un worktree** (tue 5173 et Supabase) : kill ciblé sur son port.
- `docs/wip/<sujet>-progress.md` **commité au premier commit**, avec en tête un bloc **`## Reprendre ici`** (≤ 15 lignes, réécrit à chaque PR mergée — l'historique reste en dessous) :
  ```markdown
  ## Reprendre ici

  _Mis à jour le AAAA-MM-JJ, après #NNNN._

  - **État** : … · **Prochaine action** : … · **En attente de David** : … · **Pièges en cours** : … · **Worktree / branche** : …
  ```
- **Après chaque merge** : mettre à jour « Reprendre ici », le commiter, puis écrire à David : « Bon moment pour `/clear`. Pour reprendre : **`/reprendre <sujet>`** ». Une session ne s'étire pas sur plusieurs PR : une PR = une session, au plus un lot de petites PR.
- PR mergée → `git worktree remove` + `git branch -d` + `git worktree list`.
- **Worktree d'agent** (`.claude/worktrees/agent-*`, laissé par un agent qui a commité) : même nettoyage dès sa PR mergée, par la session qui l'a lancé.

## Règles de code (non négociables)

0. **Ne JAMAIS supprimer un fichier non suivi** (`rm`/`mv`) sans demander : `git status` d'abord.
1. **Zod sur toute entrée** (`request.json()`, query params) : bornes `.min()`/`.max()`, limites de tableaux, UUID ; `safeParse` → `error(400, …)`. → [qualite.md](docs/pratiques/qualite.md#input-validation-with-zod)
2. **`MySelect` / `MyCheckbox`** — jamais Shadcn Select/Checkbox direct ni natifs. → [composants-ui.md](docs/pratiques/composants-ui.md)
3. **Runes Svelte 5 uniquement** (`$state`/`$derived`/`$props`, jamais `export let` ni `$:`). Event → handler → state → DOM ; `$effect` pour les side-effects seulement.
4. **Jamais `any`** — `unknown` + type guards, ou types de `$lib/types/database`.
5. **Après chaque `.svelte` créé/modifié → `pnpm svelte:autofix <fichier>`.**
6. **`database.ts` est généré** (`pnpm db:types`) : n'y ajouter aucun type ; alias, unions, composites → `$lib/types/database-helpers`.
7. **Bouton retour = `BackLink`** : page parente lue dans l'adresse (jamais `history.back()` ni `goto()` ; deux parents → `?depuis=`), au-dessus du titre, dit où il va ; `kind="quit"` en pleine activité ; aucun sur une page de navigation ou carrefour. → [composants-ui.md](docs/pratiques/composants-ui.md#backlink--bouton-retour-obligatoire)

## Structure & patterns

`src/lib/{components,server,stores,utils,types}/` · `src/routes/{(public),(protected),api}/`. Ordre dans un fichier : Imports → Types → Constantes → Variables → Functions → Components. Toasts : `toaster.success(…)` de `$lib/stores/toaster.svelte`. Handlers en minuscule (`onclick`). Code explicite et simple > astuces.

## Base de données

> [pratiques/base-de-donnees.md](docs/pratiques/base-de-donnees.md) · schéma : [systeme/base-de-donnees.md](docs/systeme/base-de-donnees.md)

- Migrations dans `supabase/migrations/<timestamp>_<description>.sql`. **Jamais** de schéma modifié via le Dashboard.
- CLI Supabase = devDependency : `pnpm exec supabase …` (jamais `supabase …` ni `npx supabase`).
- **Tests d'intégration locaux OBLIGATOIRES** pour RLS / `SECURITY DEFINER` / trigger / policy. **Jamais** de smoke-test `auth.uid()` NULL (faux positif).
- Prod : MCP Supabase **read-only**. `db:types` génère **depuis la prod** → fonction SQL + code qui l'appelle = **deux PR** (migration, `db:migrate`, `db:types`, puis le code).

### ⚠️ La RLS échoue en SILENCE — [rls-echecs-silencieux.md](docs/pratiques/rls-echecs-silencieux.md)

Un refus RLS rend **zéro ligne, sans erreur** : `if (error) throw` ne le voit pas.

1. `.delete()`/`.update()` → toujours `.select()` et vérifier les lignes rendues.
2. Jointure `!inner` : la ligne parente disparaît quand l'enfant est masqué → préférer un `SECURITY DEFINER`.
3. Une garde centralisée ne protège que ce qui passe par elle → greper aussi `from('<table>')`.
4. Les policies permissives se combinent en OU : une seule `using (true)` annule les autres.

⚠️ **Retirer une policy est aussi risqué qu'en ouvrir une** : question d'accès en miroir (« qui ne pourra plus lire ce qu'il lisait ? »), mesurée sur les données réelles.

## Quand utiliser un agent

> [.claude/agents/README.md](.claude/agents/README.md)

- **Pas d'agent** : bug ciblé 1-2 fichiers connus · modif < 20 lignes · recherche Read/Grep · < 5 min.
- **Agent** : > 3 étapes ET code important ET plusieurs fichiers ET expertise. Briefs plafonnés (max N lignes / M fichiers).
- **Modèle = celui du frontmatter de l'agent, ne pas le surcharger.** `Explore`, `general-purpose`, `fork` et les `agent()` de workflow héritent d'Opus → passer `model` : **haiku** pour chercher, lancer des tests, surveiller la CI ; **sonnet** pour coder ou relire du code courant ; **opus** seulement pour mathAST, géométrie, pédagogie, RLS/sécurité, débogage résistant. **Workflow** : gros chantier seulement, jamais pour 1-2 fichiers.
- Un agent peut lancer `check:incremental` et des tests ciblés ; ⛔ `pnpm check`/`build`/`lint` complets réservés à la session principale.

## Planning (plans multi-phases)

> [tests.md](docs/pratiques/tests.md)

1. **Phase 0** : comportements en français (nominal / limite / erreur), **attendre la validation** avant de coder.
2. Agents et modèles spécifiés par tâche.
3. **Tests d'abord** (rouges) → implémentation → verts.
4. **Revue proportionnée au risque**, une fois **sur la PR** (pas à chaque phase) :
   - doc, article du Shtam, contenu, correctif d'UI < ~30 lignes sans logique → **aucune** ;
   - code courant → `code-reviewer` (Sonnet) ;
   - mathAST, géométrie, correction des réponses, gros diff → `code-reviewer` en `model: opus` ;
   - auth, RLS, API, données d'élèves → `code-reviewer` + `security-auditor` (Opus), sans exception ; performance si requêtes lourdes.
5. `docs/wip/<sujet>-progress.md` tenu entre les phases (bloc « Reprendre ici » compris, cf. § Worktrees) ; lister les docs produites à la fin.
6. Exécution autonome : corriger sans s'arrêter au premier échec (`debugger` si > 2 tentatives).

**Definition of Done** (avant d'ouvrir/merger) :

- [ ] Tests verts (intégration locale si DB/RLS)
- [ ] `pnpm svelte:autofix` sur les `.svelte` modifiés · `pnpm check:incremental` = 0 erreur
- [ ] `pnpm types:cliquet` tenu (`--maj` après corrections)
- [ ] Revue selon le risque (point 4 ci-dessus)
- [ ] Zod · pas de `any` · MySelect/MyCheckbox · runes
- [ ] **Doc à jour dans la même PR** : doc dont le `couvre:` touche un fichier modifié → mise à jour (skill `doc-a-jour`) ou ligne `Doc-inchangée: <raison>` ; zone sans doc → doc d'abord ou `Doc-reportée: <raison>` si David reporte. Garde : `pnpm docs:check-a-jour --depuis origin/main` (sans `--depuis`, elle ne vérifie rien).

## Documentation

`docs/wip/` = chantiers vivants ; `docs/archive/` = le reste. **Fin de chantier = versement** : le durable passe dans `docs/systeme/`, le journal wip est archivé. À connaître : [environnement-de-dev.md](docs/pratiques/environnement-de-dev.md) (outillage) · [skills-claude.md](docs/pratiques/skills-claude.md) · [notation-unites.md](docs/pratiques/notation-unites.md) · [fiches-exercices.md](docs/pratiques/fiches-exercices.md) · [observabilite-erreurs-prod.md](docs/pratiques/observabilite-erreurs-prod.md) · [css-color-tokens.md](docs/pratiques/css-color-tokens.md) (`var(--color-*)`) · [warning-svelte.md](docs/pratiques/warning-svelte.md) · [panel-simplifications.md](docs/systeme/mathast/panel-simplifications.md) · [convention-equivalence.md](docs/systeme/mathast/convention-equivalence.md).
