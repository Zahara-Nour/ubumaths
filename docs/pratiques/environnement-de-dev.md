---
couvre:
  - '.github/workflows/**'
  - .github/dependabot.yml
  - '.husky/*'
  - .lintstagedrc.js
  - vercel.json
  - svelte.config.js
  - vite.config.ts
  - .nvmrc
  - .claude/settings.json
  - '.claude/hooks/**'
  - scripts/gros-process.sh
  - scripts/check-incremental.sh
  - scripts/cliquet-types-tests.ts
  - scripts/deploy-prod.sh
  - scripts/release.ts
  - scripts/lint-fast.sh
  - scripts/lint-fast-fichiers.sh
  - scripts/with-db-lock.sh
  - scripts/ci-version-seule.sh
  - scripts/vercel-ignore-build.sh
  - scripts/releve-web-vitals.ts
  - scripts/check-production-health.ts
---

# Environnement de dev : la carte

> Ce qui est en place autour du code, pourquoi, et où lire le détail. C'est une **carte** : elle
> renvoie aux docs qui font foi au lieu de les recopier. Écrite le 2026-10-11.
> Tenue à jour par la garde `pnpm docs:check-a-jour` : modifier un fichier de l'en-tête `couvre:`
> réclame une mise à jour de cette page (liste dans `scripts/doc-a-jour.config.ts`).

## En une minute

```
worktree frère ──► commit ──► push ──► PR ──► CI (quality.yml) ──► merge sur main ──► … ──► pnpm deploy:prod ──► Vercel
                  pre-commit   pre-push         « CI Summary » vert     (ne déploie rien)    (David seul décide)   branche production
```

1. **Un chantier = un worktree frère** (`../ubumaths-wt-<sujet>`), une branche, une session.
2. **Commit** : husky lance `lint-staged` (oxlint + prettier sur les fichiers indexés, ~2 s) puis
   commitlint (header ≤ 100 caractères, conventional commits).
3. **Push** : le hook pre-push vérifie le formatage, `lint:fast`, les liens et renvois de la doc, et la
   couverture doc.
4. **PR → CI 100 % verte → `gh pr merge --merge` → branche supprimée.** Un merge sur `main` ne
   déploie **rien**.
5. **Mise en prod** : `pnpm deploy:prod`, **uniquement sur demande de David** (ADR 0021). Il crée la
   version, attend sa CI, puis avance la branche `production`, que Vercel construit.

Détail : [git-workflow.md](git-workflow.md) · [worktrees.md](worktrees.md) ·
[ADR 0021](../adr/0021-branche-production-mise-en-prod-manuelle.md).

## Local : Mac mini M6, 24 Go

**Un gros process à la fois.** `pnpm check`, `pnpm build`, `pnpm lint` et `check:incremental`
passent sous le même verrou noyau (`flock`, nom `typecheck`) via `scripts/gros-process.sh` ; tous les
`db:*` locaux et `test:integration` passent sous le verrou `supabase` (`scripts/with-db-lock.sh`). Les
deux sont partagés entre worktrees ; un second lanceur sort en **exit 2** en nommant le détenteur. Pas
de verrou en CI ni sur Vercel. Pourquoi et mesures : [worktrees.md](worktrees.md),
[mesures-mac-mini.md](mesures-mac-mini.md).

**Typecheck du quotidien : `pnpm check:incremental`**, moteur **tsgo** (TypeScript 7) depuis le
2026-10-10 : ~18 s, ~20 s à froid (`FRESH=1`), au lieu de ~45 s / ~80 s. **La CI garde le moteur
classique** (`pnpm check`), qui fait foi : sur 1 812 erreurs comparées, les deux moteurs concordent
à 2 près, dont un vrai angle mort de tsgo (type des fonctions exposées d'un composant Svelte passé
à `render`). Rejoue le dernier verdict si rien n'a changé (`FORCE=1` pour forcer). En-tête de
`scripts/check-incremental.sh`.

**Cliquet des types des tests : `pnpm types:cliquet`.** `pnpm check` exclut les tests ; ce cliquet
les vérifie (tsgo), fichier par fichier, contre `tests/cliquet-types-tests.json`. **À 0 depuis le
2026-10-10** (#1047) : toute erreur de type dans un test fait échouer la CI (job « Types des tests »).
Un fichier qui perd des erreurs fait aussi échouer : `pnpm types:cliquet --maj` abaisse le cliquet.

**`pnpm lint:fast`** (~2,5 s) rejoue toutes les règles de niveau erreur d'eslint sans le service
TypeScript (`eslint.fast.config.js`), plus oxlint, la parité des variables d'environnement avec
`.github/ci.env` et la garde des `render` attendus. Eslint complet : 530 s, en CI.

Ses fichiers (`scripts/lint-fast-fichiers.sh`) : à la main, ce qui diffère d'`origin/main` **plus
les fichiers non suivis** (un fichier tout neuf est relu avant son premier commit) ; au pre-push
(`--push`), **seulement les fichiers des commits qui partent**. Le dépôt principal est partagé : le
brouillon `.ts` non suivi d'une session y bloquait le push de doc de toutes les autres
(2026-10-18), alors qu'un fichier non suivi ne part pas et que la CI ne le voit pas.

**Hooks husky** (`.husky/`) :

| Hook         | Ce qu'il fait                                                                                                                                                                                                                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | `scripts/garde-main-a-jour.sh` : sur `main`, refuse le commit si `origin/main` a des commits que le `main` local n'a pas (`git fetch` d'abord, laisse passer hors ligne). Puis `pnpm lint-staged` (`.lintstagedrc.js`) : oxlint (`--fix` sur JS/TS, sans `--fix` sur `.svelte`) + prettier ; prettier seul sur json/md/css/html. Bloque sur une _erreur_ oxlint seulement. |
| `commit-msg` | commitlint, sur **toutes** les branches (les commits de branche arrivent tels quels sur main).                                                                                                                                                                                                                                                                             |
| `pre-push`   | `pnpm format:check` (fichiers suivis seulement) → `lint:fast --push` (fichiers des commits poussés seulement) → `docs:check-links` → `docs:check-refs --strict` → `docs:check-a-jour --couverture` (bloquants), puis `docs:check-a-jour --depuis origin/main` (avertissement).                                                                                             |

Le pre-push est le seul filet des commits de doc poussés directement sur `main`, que la CI de push
ignore. `--no-verify` n'a plus de raison d'être (le hook Claude le refuse).

⚠️ **Un worktree sans `pnpm install` n'a AUCUN hook** : husky s'installe par le script `prepare`.
`.env` et `node_modules` ne suivent pas non plus le worktree ([worktrees.md](worktrees.md)).

**Ports.** 5173 = le serveur de David, jamais touché · 5175 = dépôt principal · 5176 et suivants =
worktrees. Toujours `pnpm dev --port <n> --strictPort` (sans `--` : il ferait ignorer le port).
`pnpm kill:servers` est interdit depuis un worktree (il tue 5173 et Supabase).

**Tester depuis le MacBook (Tailscale).** Pas d'adresse `http://100.x.x.x:<port>` : hors `localhost`,
SvelteKit pose les cookies en `Secure`, le navigateur jette le cookie de session et la connexion
« ne fait rien » (côté serveur : « login successful » puis « Profile missing »). Passer par un
tunnel SSH lancé **depuis le MacBook**, puis ouvrir `http://localhost:<port>` :
`ssh -L <port>:localhost:<port> -L 54321:localhost:54321 david@100.79.226.105` (54321 = Supabase
local, pour les appels du navigateur). Le serveur n'a pas besoin de `--host`. Comptes locaux :
`supabase/seed/dev_accounts.sql` (`teacher@local.test` / `local-teacher`…). Sous `pnpm dev`, les
connexions depuis `localhost` ne passent pas par le limiteur de connexion (`skipsLoginRateLimit`,
`docs/systeme/auth.md`) : sessions et scripts Playwright peuvent se connecter sans compter. Depuis
une autre IP (téléphone sur le réseau local) ou dans un build (`pnpm preview`), le limiteur
s'applique : 5 essais par IP en 15 min, table `rate_limits` locale.

**Supabase local.** Une seule pile pour tout le dépôt (ports 54321-54329, `project_id` figé), d'où le
verrou `supabase`. CLI = devDependency exacte, lancée par `pnpm db:*` ou `pnpm exec supabase`.
`pnpm db:reset && pnpm db:seed-riche` remplit la base locale avec le contenu de la prod (lu en lecture
seule) et **30 élèves fictifs** : aucune ligne d'un utilisateur autre que le prof ou l'admin n'est
copiée, **jamais de données d'élèves en local** (`scripts/db-seed-riche/index.ts`).

**Claude Code** ([.claude/README.md](../../.claude/README.md)) :

- `.claude/settings.json` : liste `ask` (commandes qui perdent du travail : `git reset`, `rebase`,
  `clean`, `restore`, push forcé, `rm`, `mv`…), **seule source** de ces confirmations. Revue le
  2026-10-10 et gardée en entier.
- `.claude/hooks/garde-commandes.py` (PreToolUse sur Bash) : refuse les interdits qui dépendent des
  arguments ou du dossier (port 5173, `pnpm dev` sans `--strictPort`, `kill:servers` depuis un
  worktree, CLI Supabase directe, `--no-verify` au commit comme au push, `pnpm release` seul,
  `tsc --noEmit`, `svelte-check` nu, `git -C ""`, `2>/dev/null` sur `git add`, suppression de
  branche chaînée à `gh pr merge`, `pull --rebase` d'une autre branche sur une branche déjà
  poussée) et demande confirmation pour un `--force` ou un `-D` placé n'importe où.
  Sur `main` (partagé par toutes les sessions) : refuse un pull qui fusionne, un merge non
  fast-forward, `git add -A` / `.`, `git commit -a` ; pendant un `deploy:prod` (verrou « deploy »),
  refuse `gh pr merge` et les commits ou pushes vers `main`
  ([git-workflow.md § 2](git-workflow.md#2-le-dépôt-principal-partagé)).
  `deploy:prod` n'y est plus soumis (décision de David, 2026-10-10) : la règle vit dans CLAUDE.md.
- Agents : [.claude/agents/README.md](../../.claude/agents/README.md). Skills du projet
  (`.claude/skills/`) et skills personnels (`~/.claude/skills/`) : [skills-claude.md](skills-claude.md).

## GitHub

| Workflow                    | Déclencheur                                                           | Rôle                                                                                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `quality.yml`               | toute PR sur main ; push sur main hors doc pure ; manuel              | **La CI** : lint (+ gardes CSS, barils, doc, `render`), typecheck classique, types des tests, build (+ garde chunk < 100 Ko, Safari), tests serveur (4 shards) et client (2 shards), audit, garde SECURITY DEFINER → **CI Summary**. |
| `nightly-integration.yml`   | chaque nuit 02:17 UTC ; PR touchant la base ou ce qu'atteint la suite | `test:integration` contre un Supabase local ; job `paths-filter` qui vérifie que le filtre suit les imports. Jamais check obligatoire.                                                                                               |
| `nightly-pyodide.yml`       | chaque nuit 03:00 UTC ; manuel                                        | tests Pyodide réels (`*-real.svelte.test.ts`), exclus de la CI.                                                                                                                                                                      |
| `codeql.yml`                | push sur main hors doc ; lundi 04:00 UTC                              | analyse de sécurité `security-extended`. Pas sur les PR : il bloquait l'auto-merge sans être requis.                                                                                                                                 |
| `production-health.yml`     | chaque jour 06:00 UTC ; manuel                                        | appelle les pages publiques du sitemap (`scripts/check-production-health.ts`), ouvre / commente / referme l'issue « Pages publiques en échec ».                                                                                      |
| `web-vitals.yml`            | le 1er du mois 06:00 UTC ; manuel                                     | relevé Speed Insights 28 j (`scripts/releve-web-vitals.ts`) publié en issue « Core Web Vitals — relevé AAAA-MM ».                                                                                                                    |
| `release.yml`               | push d'un tag `v*`                                                    | publie la GitHub Release, notes tirées du CHANGELOG.                                                                                                                                                                                 |
| `dependabot-auto-merge.yml` | PR de Dependabot (`pull_request_target`)                              | active l'auto-merge (merge commit) des montées patch et mineures ; les majeures restent à relire. Durci le 2026-10-11 : auteur de la PR et dépôt d'origine vérifiés, `fetch-metadata` épinglé par SHA.                               |
| `bundle-analyze.yml`        | manuel                                                                | build `ANALYZE=1`, treemap du bundle en artefact.                                                                                                                                                                                    |

- **Raccourci du commit de version** : sur un `chore(release): …` qui ne change que la version et
  le CHANGELOG, posé sur un état vert, `scripts/ci-version-seule.sh` fait sauter les jobs lourds.
- **CI de main jamais annulée** (chaque commit de main doit avoir son verdict) ; sur une branche, un
  run périmé est annulé par le suivant.
- **Règle de merge** : CI 100 % verte (« CI Summary » et les checks exigés par la protection de
  `main`), merge commit (`--merge`), branche supprimée seulement une fois l'état `MERGED` vérifié.
  La branche `production` est protégée : ni force-push, ni suppression.
- **Dependabot** (`.github/dependabot.yml`) : npm et GitHub Actions, **mensuel** (lundi 06:00 Paris),
  5 PR au plus ; patch + mineures groupées en une PR, chaque majeure à part.
- **Délai de 3 jours avant toute nouvelle version** (2026-10-11) : `cooldown` de Dependabot et
  `minimumReleaseAge` de pnpm (`pnpm-workspace.yaml`). Une version piégée est presque toujours
  retirée en quelques heures. Correctif urgent plus récent : `minimumReleaseAgeExclude`.
  ⚠️ pnpm 12 vérifie **aussi le lockfile** contre ce délai, même avec `--frozen-lockfile` : une
  version de moins de 3 jours entrée dans `pnpm-lock.yaml` fait échouer l'installation partout
  (CI, worktrees, Vercel). Mesuré le 2026-10-11 : `mathlive@0.111.1` (#1081) a cassé
  l'installation de `main`, débloquée par une exception datée.
- **Versions retenues exprès** (2026-10-12) — ne pas les monter sans relire la raison :
  `typescript-eslint` **8.71.0 exacte** (#1188) : la 8.71.1 voit à tort les props `$bindable` comme
  « only used as a type » (6 erreurs, bug amont sveltejs/eslint-plugin-svelte#1607) ; on libère
  quand une version corrigée passe `pnpm lint` complet. `prettier` 3.9.9 et
  `prettier-plugin-svelte` 4.1.1 **exactes** (#1179) : une montée reformate des centaines de
  fichiers, elle se fait dans sa propre PR. `typst` reste en 0.6.1-rc5 tant qu'aucune nouveauté
  n'est nécessaire. Une PR Dependabot qui touche l'une d'elles échoue en CI ou se ferme.
- **Routines cloud claude.ai** (agents sur cron, gérées sur claude.ai/code/routines) : tri des CI
  échouées chaque nuit (03:30 UTC, PR `ci-fix/*` ou issue), audit sécurité / dépendances le lundi (PR
  `deps/security-audit-<date>`), scan de secrets quotidien (issue sans valeur en clair), hygiène des
  PR et branches le vendredi (lecture seule, une issue). Jamais de push sur `main`. **Limite : pas de
  secrets en cloud**, ni connecteurs MCP : tout ce qui demande un jeton (base, Vercel) reste en local
  ou en GitHub Action.
- **Jeton `gh` local** : il lui faut le droit `workflow` pour merger une PR qui touche
  `.github/workflows/`.
- **Secret `VERCEL_TOKEN`** (Action `web-vitals.yml`) : portée **équipe** (« All Projects »), pas
  projet — un jeton projet fait répondre `User not found (404)` à la CLI. **Expire le 2027-10-11.**

## Vercel et Supabase

**Vercel, plan Hobby.**

- Seule la branche `production` déploie (`git.deploymentEnabled` de `vercel.json`), avancée par
  `pnpm deploy:prod` (`scripts/deploy-prod.sh`) : dernier commit de main vert → `pnpm release`
  (numéro, CHANGELOG, tag, via `commit-and-tag-version`) → CI de la version → avance rapide de
  `production`. Jamais de mise en prod automatique (ADR 0021). `--essai` montre ce qui partirait.
- `scripts/vercel-ignore-build.sh` (`ignoreCommand`) saute la doc seule et les commits dépassés par
  la pointe ; un redéploiement se construit toujours (`pnpm maintenance:on|off`).
- Quotas qui ont dicté ces choix : 100 déploiements par jour (un déploiement annulé **compte**),
  10 Go de stockage de déploiements, un build à la fois. Rétention des déploiements passée à
  **1 jour** le 2026-10-10 (réglage du tableau de bord).
- Région des fonctions : **`cdg1`**, imposée par `svelte.config.js` (`regions: ['cdg1']`, runtime
  `nodejs22.x`) ; le `iad1` des réglages du projet n'est qu'un défaut remplacé. Fluid Compute actif.
- `vercel.json` pose les en-têtes de cache : 30 jours pour `/fonts/` et `/upsilon-simulator/`, 1 jour
  (+ `stale-while-revalidate` 7 jours) pour les images, sons et CSS de `static/`.
- `vercel.json` déclare **deux crons** : `/api/cron/riddle-of-the-day`, chaque jour à 00:05 UTC
  (énigme du jour), et `/api/cron/deleted-account-files`, le dimanche à 04:00 UTC (fichiers des
  comptes supprimés) — voir [serveur.md](../systeme/serveur.md). Vercel les appelle en GET
  avec `Bearer CRON_SECRET` (variable définie en Production) ; ils ne tournent que sur le
  déploiement de production.
- Speed Insights est branché dans `src/routes/+layout.svelte` ; relevé mensuel et diagnostic :
  [core-web-vitals.md](core-web-vitals.md). Erreurs de prod : [observabilite-erreurs-prod.md](observabilite-erreurs-prod.md).

**Supabase** : projet EU (eu-west-3, ADR 0003).

- Migrations dans `supabase/migrations/`, poussées par `pnpm db:migrate` aux **quatre conditions** de
  CLAUDE.md ; une migration destructive ne passe **jamais** sans David. Additive : au merge ;
  destructive : après le `deploy:prod` qui livre le code qui n'en dépend plus.
- `pnpm db:types` génère `database.ts` **depuis la production** : une fonction SQL et le code qui
  l'appelle demandent deux PR.
- Interroger la prod : MCP Supabase en **lecture seule**.
- Détail : [base-de-donnees.md](base-de-donnees.md), [rls-echecs-silencieux.md](rls-echecs-silencieux.md),
  [procedure-restauration.md](procedure-restauration.md).

## Décisions d'outillage

| Date       | Décision                                                                              | Pourquoi                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-14 | CodeQL ne tourne plus sur un commit 100 % doc                                         | analyse d'un arbre de code identique ; le cron du lundi rescanne tout.                                                     |
| 2026-09-29 | pnpm 12, CLI Supabase en devDependency exacte (#512)                                  | une seule version de la CLI, la même en CI et sur les postes.                                                              |
| 2026-09-29 | intégration chaque nuit et sur les PR concernées, filtre `paths` vérifié (#515, #516) | la suite exige un vrai Supabase ; le filtre évite de la lancer sur toutes les PR.                                          |
| 2026-09-30 | images Docker de Supabase en cache dans la CI (#563)                                  | quota de téléchargement par IP partagé entre runners (`toomanyrequests`).                                                  |
| 2026-10-01 | plus d'aperçus Vercel pour les branches (#569)                                        | chaque déploiement, même annulé, mangeait le quota quotidien.                                                              |
| 2026-10-03 | garde SECURITY DEFINER bloquante, en job court (#723)                                 | une fonction qui contourne la RLS doit être justifiée avant le merge.                                                      |
| 2026-10-10 | ignore step : pointe seule, doc sautée (#1003)                                        | ~45 builds de prod par jour, stockage à 100 %.                                                                             |
| 2026-10-10 | CI de main jamais annulée, cache prettier (#1004)                                     | des runs de main annulés laissaient des commits sans verdict ; prettier prenait 162 s sur 220.                             |
| 2026-10-10 | **prod manuelle par la branche `production`** (ADR 0021, #1005 → #1007)               | quotas du plan gratuit, et David veut décider de chaque mise à jour du site.                                               |
| 2026-10-10 | rétention des déploiements Vercel à 1 jour                                            | le stock de 10 Go se remplissait en 3 jours.                                                                               |
| 2026-10-10 | tests client sur deux navigateurs (#1012)                                             | Chromium tombait sous 234 fichiers (« Browser connection was closed »).                                                    |
| 2026-10-10 | **`check`, `build`, `lint` sous le verrou des gros process** (#1013)                  | un seul gros process à la fois, y compris entre worktrees.                                                                 |
| 2026-10-10 | commitlint sur toutes les branches, `.nvmrc` en CI (#1016)                            | des titres trop longs arrivaient sur main par les branches.                                                                |
| 2026-10-10 | **`commit-and-tag-version` 12 remplace `standard-version`** (#1017)                   | `standard-version` abandonné depuis 2022 ; la 13 plante sur notre configuration.                                           |
| 2026-10-10 | **tsgo en local, moteur classique en CI** (#1023)                                     | 18 s au lieu de ~45 s ; la CI garde le moteur sans angle mort connu.                                                       |
| 2026-10-10 | **cliquet des types des tests** (#1023), ramené à 0 (#1047)                           | 1 819 erreurs dans les tests, invisibles à `pnpm check` : un test pouvait fabriquer une forme que l'app ne produit jamais. |
| 2026-10-10 | liste `ask` seule source des confirmations, hook pour le reste (#1045)                | deux sources divergeaient ; `ask` ne voit qu'un début de commande.                                                         |
| 2026-10-10 | garde « code modifié ⇒ doc modifiée » et couverture (#1049)                           | une doc n'est revue que si un changement la réclame.                                                                       |
| 2026-10-10 | `db:seed-riche` : base locale = contenu de prod + élèves fictifs                      | travailler sur des données réalistes sans aucune donnée d'élève.                                                           |
| 2026-10-11 | **préchargement réservé au CSS** (#1073)                                              | 94 modulepreload volaient la bande passante aux CSS : FCP p75 de l'accueil à 3,4 s pour un TTFB de 0,5 s.                  |
| 2026-10-11 | **relevé Core Web Vitals mensuel en GitHub Action, pas en routine cloud** (#1074)     | il faut `VERCEL_TOKEN`, et l'environnement cloud n'a pas de secrets.                                                       |
| 2026-10-11 | **auto-merge Dependabot durci, 3 jours d'âge minimal des versions**                   | le workflow tourne avec un jeton en écriture : `github.actor` se contourne depuis un fork, et un tag d'action se déplace.  |

## Écarts connus

- `CLAUDE.md` §Gros process, ligne « Machine » : `check:incremental` 44 s à chaud / 82 s à froid
  (mesure du 2026-09-29, moteur `--incremental`), alors que la puce suivante donne ~18 s / ~20 s
  (tsgo, 2026-10-10).
- `CLAUDE.md` §Worktrees : le verrou `typecheck` est attribué au seul `check:incremental` ; il couvre
  aussi `check`, `build`, `lint` et `types:cliquet` depuis le 2026-10-10.
- `quality.yml`, commentaire de `concurrency` : « chaque commit de main part en prod » — vrai avant
  l'ADR 0021, plus maintenant (la règle « jamais annulé » reste juste : chaque commit doit avoir son
  verdict).
- `.versionrc.json` : l'en-tête du CHANGELOG renvoie encore à `standard-version`.
- `scripts/check-incremental.sh` : les commentaires parlent tour à tour de « guard 2 » et
  « guard 3 » pour le rejeu du verdict.
- Routines cloud : la mémoire de Claude notait au 2026-09-30 que les droits d'écriture GitHub de
  l'environnement cloud restaient à confirmer.
