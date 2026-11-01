---
couvre:
  - .claude/hooks/garde-commandes.py
  - .claude/settings.json
  - .husky/commit-msg
  - .husky/pre-commit
  - .husky/pre-push
  - scripts/garde-main-a-jour.sh
  - scripts/garde-migrations-horodatage.sh
  - scripts/ci-nature-changement.sh
  - scripts/vercel-ignore-build.sh
---

# Git Workflow — UbuMaths

> **Process de développement OBLIGATOIRE** (bug fixes ET features), décidé avec David le 2026-06-17.
> `main` = **branche de travail** ; Vercel ne déploie que `production`, avancée par `pnpm deploy:prod` ([ADR 0021](../adr/0021-branche-production-mise-en-prod-manuelle.md)), **sur demande explicite de David seulement**.
> Résumé impératif : [CLAUDE.md](../../CLAUDE.md) § Git Workflow. Ici : le détail, le pourquoi, et [qui applique chaque règle](#6-qui-applique-quoi).

---

## 1. Règles d'or

1. **`main` toujours vert et déployable** (la prod en est un instantané, `production`). Jamais de commit de **code** directement sur `main`.
2. Tout changement de code → **worktree → branche → PR → CI 100 % verte → merge commit → suppression de branche** ([§ 3](#3-flux-dune-pr)).
3. **Seule exception à la PR** : changement **100 % documentaire** (`docs/**` et `**/*.md`, aucun fichier de code) → commit direct sur `main`, **quel que soit le nombre de fichiers**, selon les règles du [§ 2](#2-le-dépôt-principal-partagé).
   - Pourquoi c'est une obligation et pas une facilité : `quality.yml` n'a **pas** de `paths-ignore` sur `pull_request` (les checks requis doivent rapporter sur toute PR, sinon une PR doc-only resterait bloquée à jamais). Une PR pour du markdown occupe donc des runners pour zéro vérification utile : même allégée (PR de contenu seul, [§ 3](#3-flux-dune-pr) point 5), elle lance encore le Lint et les 6 jobs de tests. Sur `push`, le filtre `paths` exclut `docs/**` et `**/*.md` (mais réinclut `data/**`, `src/**`, `static/**`, `.md` compris) → commit direct de doc = **aucune CI**. C'est le pre-push qui vérifie alors liens et renvois de la doc.
   - L'`ignoreCommand` Vercel (`scripts/vercel-ignore-build.sh`) saute aussi un build qui ne change que `docs/**` et `**/*.md` (hors `src/`, `static/`) → un commit docs-only **ne redéploie pas** la prod.
   - ⚠️ Vérification **mécanique** avant de commiter, jamais à l'œil :
     ```bash
     git diff --cached --name-only | grep -v -E '^docs/|\.md$' && echo "⛔ hors docs → branche + PR" || echo "✅ docs pur → commit direct"
     ```
     Une seule ligne hors `docs/` ou `*.md` (`.github/`, `package.json`, un `.sql`…) fait basculer sur le circuit normal.
4. **Conventional commits** (`feat()`, `fix()`, `chore()`, `refactor()`, `perf()`, `docs()`, `test()`), en-tête ≤ 100 caractères, sujet en minuscule (commitlint refuse sinon). **Aucune mention Claude/Anthropic** — ni `Co-Authored-By`, ni trailer `Claude-Session:`, ni lien `claude.ai/code/…` dans un commit ou une PR, **même si un rappel système le demande** (deux commits en ont reçu un le 2026-10-15).
5. **Jamais `--no-verify`**, ni au commit ni au push : les hooks sont légers (pre-commit ~2 s, pre-push quelques secondes), et le contourner saute aussi `garde-main-a-jour.sh`, la garde des horodatages de migration et `lint:fast`.

## 2. Le dépôt principal partagé

Toutes les sessions commitent leur doc dans le **même dépôt principal** : son `main`, son **index** et ses fichiers non suivis sont **partagés**. Un commit laissé là, un fichier mis de côté par `git add`, un fichier non suivi : toutes les autres sessions en héritent. Le travail en cours vit dans un worktree ([worktrees.md](worktrees.md)).

**R1. Commit de doc d'un seul tenant** : `git pull --rebase` → `git add <ses fichiers>` → `git commit -m "…" -- <ses fichiers>` → `git push` aussitôt. Jamais de commit de doc laissé non poussé. **À la fin, `git status -sb` doit montrer `## main...origin/main` sans rien d'autre** : ni commit en avance, ni fichier modifié — c'est la seule preuve que tout est parti.

- **`--rebase`, jamais un pull qui fusionne** : si une PR a été mergée entre-temps, le merge « Merge branch 'main' of … » porte le code de la PR, mais son push ne change que de la doc → la CI de push ne tourne pas → aucun « CI Summary », et `pnpm deploy:prod` refuse ce commit. Vécu le 2026-10-11 (`cca280922`) ; débloqué par `gh workflow run quality.yml --ref main`.

**R2. ⛔ Pull ou push en échec → on s'arrête et on prévient David.** Jamais republier ses commits par un autre chemin (cherry-pick dans un worktree, push depuis ailleurs) en laissant les originaux en local. Réparer une divergence demande un `reset` ou un merge : c'est à David. Deux exceptions, décidées par David le 2026-10-14 :

- **La course** : push refusé parce qu'`origin/main` a avancé entre le pull et le push (« cannot lock ref », « fetch first », « non-fast-forward ») → **un seul** nouvel essai par le même chemin : `git pull --rebase` puis `git push`. Un conflit au rebase, ou un second refus → R2.
- **Un contrôle du pre-push** (horodatages des migrations, formatage, lint rapide, liens ou renvois de la doc, doc à jour) : rien n'est parti, `main` n'a pas divergé → corriger la cause dans un **nouveau commit** (un `--amend` risquerait d'emporter ce que d'autres sessions ont indexé), puis repousser par le même chemin. Vérifier d'abord `git status -sb` : en avance seulement, jamais en retard. Une divergence ou un refus du serveur → R2.

**R3. L'index est partagé** : `git add` nomme ses propres fichiers ; jamais `git add -A`, `git add .`, ni `git commit -a`. Vérifier `git diff --cached --name-only` avant de commiter : un fichier qu'on n'a pas touché, c'est celui d'une autre session — et un fichier qu'on a touché qui n'y est PAS, c'est un `git add` qui a échoué. **Un seul chemin invalide fait échouer tout le `git add`** (après un `git mv`, ne citer que la destination) : jamais de `2>/dev/null` sur `git add`.

**Commiter en nommant ses fichiers** : `git commit -m "…" -- <ses fichiers>` ne prend que ces chemins, quoi qu'une autre session ait indexé entre-temps (ce qu'elle a indexé y reste). Relire l'index avant ne suffit pas : une autre session peut indexer dans la seconde qui suit. Après un `git mv`, citer la source **et** la destination (`-- ancien.md nouveau.md`) : avec la destination seule, le commit ajoute le fichier et laisse sa suppression indexée.

**R4. Rien d'inachevé dans le dépôt principal** : ni fichier suivi modifié en attente, ni fichier non suivi. Un fichier modifié part dans le commit d'une autre session ou bloque son pull ; un fichier non suivi qu'une PR ajoute ensuite bloque le pull de TOUTES les sessions (« untracked working tree files would be overwritten »). Un fichier non suivi trouvé dans le dépôt principal : demander à qui il est, ne pas y toucher.

**R5. Prettier sur ses fichiers seulement** (`pnpm format <fichiers>`), jamais un glob ni `pnpm format:all` : le 2026-10-11, un glob a reformaté le journal d'une autre session, embarqué ensuite dans un commit. Le pre-commit formate déjà les fichiers indexés.

**R6. Fichiers que tout le monde complète** (`docs/wip/verifications-manuelles.md` surtout) : ajouter en fin de section, juste après le pull. En cas de conflit au rebase, **garder les deux côtés**, jamais l'un à la place de l'autre.

**R7. Le `pnpm install` d'après pull** : un pull qui change les dépendances relance `pnpm install` dans le dépôt principal, sous le serveur 5175 qui tourne dessus. Erreur étrange du serveur juste après un pull → le relancer.

**R8. Pendant `pnpm deploy:prod`** : ni commit sur `main`, ni merge de PR ([§ 5](#5-déploiement)).

⚠️ Pas de `pull.rebase` / `pull.ff` dans `.git/config` : essayé le 2026-10-13, `pull.ff=only` fait échouer le rebase légitime de son propre commit de doc, n'empêche pas `--no-rebase` de fusionner, et s'appliquerait à tous les worktrees (la config est commune).

### Pourquoi : les incidents

- **2026-10-13 (R2)** : un `git pull --rebase` bloqué par un fichier non suivi d'une autre session ; la session a republié ses deux commits de doc par cherry-pick depuis un worktree, en laissant les originaux dans le `main` local (l'un des deux était même le commit d'une autre session). Mêmes changements sous deux numéros → `main` local à +2/−6 d'`origin/main` → `pnpm deploy:prod` bloqué ; une troisième session a « réparé » par `git pull --no-rebase`, d'où le merge `8b0d1a82f` et deux commits en double dans l'historique. Le même jour, cinq merges en une heure ont repoussé le déploiement d'autant.
- **2026-10-14 (exception de la course)** : une session fait son `pull --rebase`, commite une ligne de doc ; une autre fusionne une PR dans la seconde qui suit → push refusé (« cannot lock ref »). La session s'arrête… ce qui laisse son commit en local, contre R1 : le `pull --rebase` suivant d'une autre session l'a emporté et publié avec le sien. Sans dommage, mais il serait parti de même si David avait choisi de l'annuler.
- **2026-10-23 et 2026-10-24 (R3)** : deux commits de doc (`c16a62dc3`, `0f030b507`) emportent l'archivage d'un journal indexé par une autre session (renommage `docs/wip/` → `docs/archive/wip/`), poussé sous le mauvais message, irréversible (`main` protégée). La seconde fois, l'index était vide à la vérification : l'autre session a indexé dans les secondes suivantes, et `git add … && git diff --cached --name-only && git commit` a affiché l'intrus sans s'arrêter. D'où le `git commit -- <ses fichiers>`.
- **2026-10-14 bis (R3, R4)** : `git add a.md b.md docs/wip/ancien.md 2>/dev/null` juste après un `git mv` de `ancien.md`. Le chemin n'existe plus : `git add` refuse **tout**, l'erreur est masquée. Seul le renommage (indexé par `git mv`) part ; les deux autres fichiers restent modifiés dans le dépôt principal et bloquent le `pull --rebase` des autres sessions pendant 30 minutes.

## 3. Flux d'une PR

Branches : `fix/<slug>` · `feat/<slug>` · `refactor/<slug>` · `perf/<slug>` · `chore/<slug>` · `test/<slug>` — slug kebab court. (`docs/<slug>` seulement pour de la doc mêlée à autre chose : la doc pure va sur `main`.)

1. **Worktree** depuis `origin/main` : `git worktree add -b <type>/<sujet> ../ubumaths-wt-<sujet> origin/main` — jamais de chantier dans le dépôt principal ([worktrees.md](worktrees.md)).
2. Implémenter, **commiter tôt**, en unités logiques : un hook qui crashe peut stasher le travail ; après un crash, `git stash list`.
3. **Avant de pousser** : `pnpm check:incremental` (0 erreur) et tests ciblés ; DB/RLS → [§ 4](#4-base-de-données). Le reste est automatique : pre-commit (oxlint + prettier sur les fichiers indexés) et pre-push (horodatages des migrations, formatage, lint rapide, liens et renvois de la doc, couverture de la doc). Gros process (`check`, `build`, `lint`) : un seul à la fois, cf. CLAUDE.md § Gros process.
4. `git push -u origin <branche>`, puis `gh pr create` — corps : **Quoi / Pourquoi / Risque / Tests**.
5. `gh pr checks <n> --watch` dès l'ouverture → **tout vert** (Lint, Type Check, Types des tests, Build + garde TDZ Safari, Server/Client Tests, Security Audit, Garde SECURITY DEFINER → CI Summary ; CodeQL à part). **Jamais merger en rouge.**
   - **Porte de la CI** : le premier job (« Porte de la CI ») vérifie les horodatages des migrations. S'il échoue, tous les autres jobs sont **sautés** et seul « CI Summary » rougit, en ~20 s : lire ce premier job.
   - **PR de contenu seul** (modèles `scripts/questions/**/*.json`, `docs/**`, `.md` hors `src/`, `static/`, `data/` — `scripts/ci-nature-changement.sh`) : Type Check, Types des tests, Build, Security Audit et Garde SECURITY DEFINER sont **sautés** (« skipped » vaut réussi) ; Lint et tests tournent toujours. Détail : [environnement-de-dev.md](environnement-de-dev.md).
   - **Sur main, après le merge** : Type Check et Build seulement ; la CI complète repasse sur le commit de version de `pnpm deploy:prod`.
   - ⛔ **Branche déjà poussée : jamais `git pull --rebase origin main` dessus.** Le rebase réécrit les commits poussés → push refusé, et le seul push qui passe est `--force` (liste `ask`). Pour la remettre à jour : `git merge origin/main`, ou rien (GitHub merge quand même). Rattrapage si c'est fait : `git merge origin/<branche>` (le commit en double est identique, sans conflit), puis push normal (#1603, 2026-10-22).
6. **Revue proportionnée au risque** : CLAUDE.md § Planning, point 4.
7. PR qui touche `supabase/migrations/` : d'abord **`pnpm check:migrations --pr <n>`**, qui relit `origin/main` à l'instant ([§ 4](#4-base-de-données)) ; la CI a pu tourner sur un `main` périmé. Puis `gh pr merge --merge` — **toujours un merge commit**, jamais de squash. `Base branch was modified` : relancer une fois ; `BLOCKED` : attendre la fin des contrôles, jamais `--admin`.
8. **Supprimer la branche** (`git branch -d <b>` + `git push origin --delete <b>`) **seulement après avoir lu `MERGED`** (`gh pr view <n> --json state -q .state`), dans une commande **séparée** du merge : si `gh pr merge` échoue, la suite tourne quand même, et **supprimer la branche distante d'une PR ouverte la FERME** sans merge (#1601, 2026-10-22).
   - Rattrapage : les commits restent dans le dépôt local → `git branch <b> <sha>` + `git push origin <b>` + `gh pr reopen <n>` ; la réouverture **relance toute la CI**, à re-surveiller avant de merger.
9. `git worktree remove` + `git worktree list` ; « Reprendre ici » du journal à jour (CLAUDE.md § Worktrees).

## 4. Base de données

Règles : CLAUDE.md § Migrations et § Base de données ; détail : [base-de-donnees.md](base-de-donnees.md). Ce qui touche au flux git :

- Migration écrite **sur la branche**, nommée par **`pnpm migration:horodatage`** (heure réelle UTC à la seconde, toujours, même quand `main` est en avance sur l'horloge ; « dernière migration + n » serrait toutes les sessions sur les mêmes secondes : `20261101224701` puis `224702` pris deux fois le 2026-11-01), jamais un nombre rond choisi à la main. Pourquoi : la protection de `main` n'exige pas une branche à jour, donc la CI d'une PR peut tourner sur un `main` qui n'a pas encore la migration d'une autre PR ; le 2026-11-01, `20261101215000` pris par deux lots a cassé `main` pour toutes les PR (correctif #2154).
- **Garde des horodatages** (`pnpm check:migrations`, `scripts/garde-migrations-horodatage.sh`) : refuse une migration neuve dont l'horodatage est déjà pris sur `origin/main`, ou en double dans la branche. Une migration plus ancienne que la dernière de `main` passe ; au moment de la jouer, si `db:migrate` refuse une migration « inserted before the last migration » (plus ancienne que la dernière jouée, normal avec l'heure réelle), lancer `pnpm db:migrate --dry-run --include-all`, vérifier que la liste ne contient que des migrations mergées, puis `pnpm db:migrate --include-all`. Une migration qui dépend d'une autre attend son merge. Elle tourne au **pre-push** (sur `HEAD`), en **porte de la CI**, et **avant `gh pr merge`** (`--pr <n>`). Hors ligne, en local, elle laisse passer avec un avertissement ; en CI, elle refuse. Une migration refusée bloque tout push depuis sa branche (suppression de branche comprise) jusqu'au renommage — avec son test d'intégration, qui la rejoue par son nom.
- Tests d'intégration locaux **obligatoires** pour RLS / `SECURITY DEFINER` / trigger / policy (une RPC cassée est partie en prod le 2026-06-16 faute de les avoir lancés).
- `pnpm db:migrate` **uniquement depuis la branche mergée dans `main`** (sinon désync de `schema_migrations`).
- **Additive** (`CREATE`, `ADD COLUMN`, `CREATE OR REPLACE`) → `db:migrate` **au merge** : la base précède le code en prod. **Destructive** (`DROP`, breaking) → **après** le `pnpm deploy:prod` qui livre le code qui ne l'utilise plus (au besoin, 2 migrations séparées).

## 5. Déploiement

- Merge sur `main` → **rien n'est déployé**. La prod ne bouge que par **`pnpm deploy:prod`**, lancé par David ou par Claude **sur sa demande explicite** (ADR 0021). Le script crée la version (numéro, CHANGELOG, tag — jamais `pnpm release` à part) sur le dernier état vérifié par la CI, attend la CI de ce commit de version, puis avance `production` jusqu'à lui ; `--essai` montre ce qui partirait. Une CI en cours sur `main` est attendue **sous le verrou** (plus de merge, donc plus de CI relancée), au plus 25 min.
- Il tient le verrou « deploy » de bout en bout ([§ 6](#6-qui-applique-quoi)). Un humain n'est pas arrêté par le hook : David, qui lance aussi des merges, attend la fin.
- Ce qui attend la prod : `git log --first-parent origin/production..origin/main`.
- **Previews OFF** : le job Build de la CI valide le build. Surveiller le déploiement (`get_deployment` → `READY`) et **vérifier en prod** tout changement visible des élèves.

### Mise en prod à risque → maintenance

Pour un changement de schéma **non rétro-compatible** ou un gros cutover :

1. `pnpm maintenance:on` (génère un secret de bypass, redéploie).
2. Merge → déploiement → migrations **dans le bon ordre** ([§ 4](#4-base-de-données)).
3. **Vérifier via le bypass opérateur** (`/?bypass=<secret>`, cookie valable 8 h).
4. `pnpm maintenance:off`.

### Hotfix

Même flux, expédié : `fix/<slug>` → fix **+ test de non-régression** → PR → CI verte → merge → deploy (sur demande de David). Maintenance si le bug touche les données.

### Retour arrière Vercel (Instant Rollback)

**Jamais vers une version dont le code dépend de ce qu'une migration a retiré depuis.** Le retour arrière ne ramène que le code ; la base garde son schéma. Une table, une colonne, une policy ou un droit retirés après cette version la cassent, souvent en silence (une écriture refusée par la RLS rend zéro ligne).

- **Plancher au 2026-10-19 : v0.39.0.** Migration `20261017090100` : l'élève n'écrit plus lui-même `student_buddies` ni `srs_review_sessions` ; le code d'avant v0.39.0 le faisait (choix du Palotin, XP, série, séances de révision). Plancher précédent : v0.35.0 (migration `20261016103800`, ancien système de versions des modèles de chapitre).
- **Vérifier avant tout retour arrière vers `vX`** : lister les migrations ajoutées depuis `vX` qui retirent quelque chose :
  ```bash
  git diff --name-only --diff-filter=A vX origin/production -- supabase/migrations \
    | xargs grep -liE '^[^-]*(drop (table|column|policy|function)|revoke|rename)'
  ```
  Un résultat → lire son en-tête : si le code de `vX` utilise ce qui a été retiré, pas de retour arrière vers `vX` ; corriger en avant (hotfix).
- Une migration qui retire quelque chose relève le plancher : mettre à jour la ligne ci-dessus dans la même PR.

## 6. Qui applique quoi

Une règle tenue par un garde-fou ne dépend pas de la mémoire de chaque session. Le hook Claude n'arrête que Claude, jamais un humain.

| Règle                                                                                                                                                                                                                                                             | Appliquée par                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commandes qui perdent du travail (`reset`, `rebase`, `clean`, `revert`, `restore`, `checkout --`, `checkout .`, `stash drop/clear`, `branch -D`, push forcé, `worktree remove --force`, `rm`, `mv`)                                                               | Liste `ask` de `.claude/settings.json` (confirmation de David) ; le hook Claude demande aussi pour `--force` ou `-D` placés n'importe où                               |
| Sur `main` : pull qui fusionne, merge non fast-forward, `git add -A` / `-u` / `.` sans chemin, `git commit -a`                                                                                                                                                    | Hook Claude `.claude/hooks/garde-commandes.py` (refus), à travers `cd` et `git -C`                                                                                     |
| `2>/dev/null` sur `git add` ; `--no-verify` au commit ou au push                                                                                                                                                                                                  | Hook Claude                                                                                                                                                            |
| Suppression de branche chaînée à `gh pr merge` ; `pull --rebase` d'une autre branche sur une branche déjà poussée                                                                                                                                                 | Hook Claude                                                                                                                                                            |
| Pendant `deploy:prod` : ni merge de PR, ni commit ou push vers `main`, depuis n'importe quel worktree                                                                                                                                                             | Verrou noyau « deploy » (`scripts/lib/lock.py`, relâché à la fin quoi qu'il arrive ; un second `deploy:prod` sort en exit 2, `--essai` ne le prend pas) + hook Claude  |
| Pas de commit sur un `main` en retard sur `origin/main`                                                                                                                                                                                                           | Pre-commit `scripts/garde-main-a-jour.sh` (`git fetch`, 5 s au plus ; hors ligne il laisse passer ; le commit qui conclut un merge, un cherry-pick ou un revert passe) |
| Formatage et oxlint des fichiers indexés                                                                                                                                                                                                                          | Pre-commit (`lint-staged`)                                                                                                                                             |
| Conventional commit, en-tête ≤ 100                                                                                                                                                                                                                                | Commit-msg (`commitlint`)                                                                                                                                              |
| Horodatages des migrations ; formatage et lint rapide de ce que le push ajoute ; liens, renvois et couverture de la doc                                                                                                                                           | Pre-push                                                                                                                                                               |
| Horodatages des migrations contre `origin/main` au moment du merge                                                                                                                                                                                                | Porte de la CI (job « Porte de la CI ») ; `pnpm check:migrations --pr <n>` avant `gh pr merge` : **discipline**                                                        |
| CI verte avant merge                                                                                                                                                                                                                                              | Checks requis de GitHub sur `main`                                                                                                                                     |
| `pnpm release` seul ; `deploy:prod` seulement sur demande de David                                                                                                                                                                                                | Hook Claude pour le premier ; **personne** pour le second (CLAUDE.md)                                                                                                  |
| Doc pure vérifiée mécaniquement, `git status -sb` propre, arrêt sur échec (R2), fichiers non suivis (R4), prettier ciblé (R5), aucune mention Claude, revue, ordre des migrations par rapport au déploiement (additive / destructive), plancher du retour arrière | **Personne** : discipline                                                                                                                                              |

---

Vérifié contre le code le 2026-11-01.
