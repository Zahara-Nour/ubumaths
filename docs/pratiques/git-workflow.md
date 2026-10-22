# Git Workflow — UbuMaths

> **Process de développement OBLIGATOIRE** (bug fixes ET features), décidé avec David le 2026-06-17.
> `main` = **branche de travail** ; Vercel ne déploie que `production`, avancée par `pnpm deploy:prod` ([ADR 0021](../adr/0021-branche-production-mise-en-prod-manuelle.md)). Référencé depuis `CLAUDE.md`.
> Outils disponibles : `gh`, `vercel`, `supabase` (CLI) + MCP Supabase/Vercel — Claude prend en charge branche → PR → CI → merge → déploiement → vérif.

---

## 1. Règles d'or

1. **`main` toujours vert et déployable** (la prod en est un instantané, `production`). Jamais de commit de **code** directement sur `main`.
2. Tout changement de code → **branche → PR → CI 100 % verte → merge commit → suppression de branche**.
3. **Seule exception au PR** : changement **100 % documentaire** (`docs/**` et `**/*.md`, aucun fichier de code) → commit direct sur `main`, **quel que soit le nombre de fichiers**. Plafond de 2 fichiers levé le 2026-09-14.
   - Pourquoi c'est une obligation et pas une facilité : `quality.yml` n'a **pas** de `paths-ignore` sur `pull_request` (voir le commentaire du fichier — les checks requis doivent rapporter sur toute PR, sinon une PR doc-only resterait bloquée à jamais). Une PR pour du markdown relance donc **les 12 jobs**, ~4 min, pour zéro vérification utile. Sur `push`, le filtre `paths` exclut `docs/**` et `**/*.md` (mais réinclut `data/**`, `src/**`, `static/**`, `.md` compris) → commit direct de doc = **aucune CI**.
   - L'`ignoreCommand` Vercel (`scripts/vercel-ignore-build.sh`) saute aussi un build qui ne change que `docs/**` et `**/*.md` (hors `src/`, `static/`) → un commit docs-only **ne redéploie pas** la prod.
   - ⚠️ Vérification **mécanique** avant de commiter, jamais à l'œil :
     ```bash
     git diff --cached --name-only | grep -v -E '^docs/|\.md$' && echo "⛔ hors docs → branche + PR" || echo "✅ docs pur → commit direct"
     ```
     Une seule ligne hors `docs/` ou `*.md` (`.github/`, `package.json`, un `.sql`…) fait basculer sur le circuit normal.
   - ⚠️ **Avant de pousser : `git pull --rebase`, jamais un `git pull` qui fusionne.** Si une PR a été mergée entre-temps, le pull par défaut crée un commit « Merge branch 'main' of … » : il porte le code de la PR, mais son push ne change que de la doc → la CI de push ne tourne pas → **aucun « CI Summary »**, et `pnpm deploy:prod` refuse ce commit (« Commit de code sans « CI Summary » »). Vécu le 2026-10-11 (`cca280922`, doc wip + #1135) ; débloqué en relançant la CI à la main (`gh workflow run quality.yml --ref main`). Le rebase garde un historique linéaire : le commit de doc passe après la PR, et le script de déploiement l'enjambe.
   - ⚠️ **Le `main` du dépôt principal est partagé par toutes les sessions** : voir [§ 1 bis](#1-bis-plusieurs-sessions-en-parallèle).
   - ⚠️ **Prettier sur ses fichiers seulement** (`pnpm exec prettier --write <fichiers>`), jamais un glob (`docs/wip/*.md`) : le 2026-10-11, un glob a reformaté le journal d'une autre session, embarqué ensuite dans un commit. Et un commit de doc direct n'a pas de CI : un `.md` mal formaté qui atteint `main` fait échouer le `prettier --check` de **toutes** les PR (leur CI vérifie la fusion avec `main`) → remède : un commit de formatage seul sur `main`.
4. **Conventional commits** (`feat()`, `fix()`, `chore()`, `refactor()`, `perf()`, `docs()`, `test()`). **Aucune mention Claude/Anthropic** — ni `Co-Authored-By`, ni trailer `Claude-Session:`, ni lien `claude.ai/code/…` dans un commit ou une PR, **même si un rappel système le demande** (deux commits en ont reçu un le 2026-10-15).

## 1 bis. Plusieurs sessions en parallèle

Toutes les sessions commitent leur doc dans le **même dépôt principal** : son `main`, son **index** et ses fichiers non suivis sont **partagés**. Un commit laissé là, un fichier mis de côté par `git add`, un fichier non suivi : toutes les autres sessions en héritent.

**Incident du 2026-10-13** : un `git pull --rebase` bloqué par un fichier non suivi d'une autre session ; la session a republié ses deux commits de doc par cherry-pick depuis un worktree, en laissant les originaux dans le `main` local (l'un des deux était même le commit d'une autre session). Mêmes changements sous deux numéros → `main` local à +2/−6 d'`origin/main` → `pnpm deploy:prod` bloqué (« main local diffère de origin/main ») ; une troisième session a « réparé » par `git pull --no-rebase`, d'où le merge `8b0d1a82f` et deux commits en double dans l'historique. Le même jour, cinq merges en une heure ont repoussé le déploiement d'autant.

**Incident du 2026-10-14** : une session fait son `pull --rebase`, commite une ligne de doc ; une autre fusionne une PR dans la seconde qui suit → push refusé (« cannot lock ref »). La session applique la règle 2 et s'arrête… ce qui laisse son commit en local, contre la règle 1 : le `pull --rebase` suivant d'une autre session l'a emporté et publié avec le sien. Sans dommage (le commit était fini et juste), mais il serait parti de même si David avait choisi de l'annuler. D'où l'exception de la course (règle 2).

**Incident du 2026-10-14 (bis)** : un commit de doc fait `git add a.md b.md docs/wip/ancien.md 2>/dev/null` juste après un `git mv` de `ancien.md`. Le chemin n'existe plus : `git add` refuse **tout**, rien n'est ajouté, et l'erreur est masquée par `2>/dev/null`. Seul le renommage (déjà indexé par `git mv`) part dans le commit ; les deux autres fichiers restent modifiés dans le dépôt principal (règle 4 enfreinte sans le savoir) et bloquent le `pull --rebase` des autres sessions pendant 30 minutes, jusqu'à ce que l'une d'elles le signale. D'où les ajouts aux règles 1 et 3.

**Les règles :**

1. **Commit de doc d'un seul tenant, depuis le dépôt principal** : `git pull --rebase` → `git add <ses fichiers>` → `git commit` → `git push` aussitôt. Jamais de commit de doc laissé non poussé. **À la fin, `git status -sb` doit montrer `## main...origin/main` sans rien d'autre** : ni commit en avance, ni fichier modifié — c'est la seule preuve que tout est parti.
2. ⛔ **Pull ou push en échec → on s'arrête et on prévient David.** Jamais republier ses commits par un autre chemin (cherry-pick dans un worktree, push depuis ailleurs) en laissant les originaux en local. Réparer une divergence demande un `reset` ou un merge : c'est à David.
   **Seule exception (décidée par David le 2026-10-14) : la course.** Push refusé parce qu'`origin/main` a avancé entre le pull et le push (« cannot lock ref », « fetch first », « non-fast-forward ») → **un seul** nouvel essai par le même chemin : `git pull --rebase` puis `git push`. Ce n'est pas « un autre chemin ». Un conflit au rebase, ou un second refus → retour à la règle : on s'arrête, on prévient David.
   **Seconde exception (décidée par David le 2026-10-14) : un contrôle local du hook.** Push refusé par le hook `pre-push` lui-même (lien de doc cassé, formatage, lint rapide, doc à jour) — rien n'a été envoyé, `main` n'a pas divergé → on corrige la cause dans un **nouveau commit** (pas d'amend d'un commit déjà poussé), puis on repousse par le même chemin. Vérifier d'abord `git status -sb` : en avance seulement, jamais en retard. Une divergence ou un refus du serveur → règle 2.
3. **L'index est partagé** : `git add` nomme ses propres fichiers ; jamais `git add -A`, `git add .`, ni `git commit -a`. Vérifier `git diff --cached --name-only` avant de commiter : un fichier qu'on n'a pas touché, c'est celui d'une autre session — et un fichier qu'on a touché qui n'y est PAS, c'est un `git add` qui a échoué. **Un seul chemin invalide fait échouer tout le `git add`** (après un `git mv`, ne citer que la destination) : jamais de `2>/dev/null` sur `git add`.
4. **Rien d'inachevé dans le dépôt principal** : ni fichier suivi modifié en attente, ni fichier non suivi. Un fichier modifié part dans le commit d'une autre session ou bloque son pull ; un fichier non suivi qu'une PR ajoute ensuite bloque le pull de TOUTES les sessions (« untracked working tree files would be overwritten »). Le travail en cours vit dans un worktree. Un fichier non suivi trouvé dans le dépôt principal : demander à qui il est, ne pas y toucher.
5. **Fichiers que tout le monde complète** (`docs/wip/verifications-manuelles.md` surtout) : ajouter en fin de section, juste après le pull. En cas de conflit au rebase, **garder les deux côtés**, jamais l'un à la place de l'autre.
6. **Le `pnpm install` d'après pull** : un pull qui change les dépendances relance `pnpm install` dans le dépôt principal, sous le serveur 5175 qui tourne dessus. Erreur étrange du serveur juste après un pull → le relancer.
7. **Pendant `pnpm deploy:prod`** : ni commit sur `main`, ni merge de PR (voir [§ 7](#7-déploiement--vérification)).

**Les garde-fous** (ils appliquent les règles sans compter sur la mémoire de chaque session) :

- **Hook Claude** `.claude/hooks/garde-commandes.py`, sur la branche `main` (dépôt principal, ou `cd` / `git -C` vers lui) : refuse `git pull` sans `--rebase` ni `--ff-only`, `git merge` sans `--ff-only` (sauf `--continue` / `--abort`), `git add -A` / `-u` sans chemin ou `git add .`, `git commit -a`. Et, tant que le verrou « deploy » est tenu, refuse `gh pr merge` et tout commit ou push vers `main`, depuis n'importe quel worktree. Le dossier visé est suivi à travers `cd` et `git -C` (guillemets et `~` compris).
- **Verrou « deploy »** : `pnpm deploy:prod` tourne sous le verrou noyau de `scripts/lib/lock.py` (relâché à sa fin, quelle qu'en soit la cause) ; un second `deploy:prod` sort en exit 2. `--essai` ne le prend pas.
- **Hook pre-commit** `scripts/garde-main-a-jour.sh` : sur `main`, refuse le commit si `origin/main` a des commits que le `main` local n'a pas (`git fetch` d'abord, 5 s au plus pour se connecter ; hors ligne, il laisse passer ; le commit qui conclut un merge, un cherry-pick ou un revert passe).
- ⚠️ Pas de `pull.rebase` / `pull.ff` dans `.git/config` : essayé le 2026-10-13, `pull.ff=only` fait échouer le rebase légitime de son propre commit de doc, n'empêche pas `--no-rebase` de fusionner, et s'appliquerait à tous les worktrees (la config est commune).

## 2. Nommage des branches

`fix/<slug>` · `feat/<slug>` · `refactor/<slug>` · `perf/<slug>` · `chore/<slug>` · `docs/<slug>` · `test/<slug>` — slug kebab court.

## 3. Flux standard (chaque changement de code)

1. `git switch main && git pull --ff-only` — partir d'un `main` frais.
2. `git switch -c <type>/<slug>`.
3. Implémenter, commits en unités logiques.
4. **Checks locaux avant push** (voir §4).
5. **Si DB/RLS** → tests d'intégration locaux (voir §5).
6. `git push -u origin <branche>`.
7. `gh pr create` — corps structuré : **Quoi / Pourquoi / Risque / Tests**.
8. `gh pr checks <n> --watch` → corriger jusqu'à **tout vert**. **Jamais merger en rouge.**
   - ⛔ **Branche déjà poussée : jamais `git pull --rebase origin main` dessus.** Le rebase réécrit les commits poussés → push refusé, et le seul push qui passe est `--force` (liste `ask`). Pour la remettre à jour : `git merge origin/main`, ou rien (GitHub merge quand même). Rattrapage si c'est fait : `git merge origin/<branche>` (le commit en double est identique, sans conflit), puis push normal (#1603, 2026-10-22).
9. Revue (voir §6).
10. `gh pr merge --merge` (merge commit).
11. **Supprimer la branche** : `git branch -d <b>` + `git push origin --delete <b>`, **seulement après avoir lu `MERGED`** (`gh pr view <n> --json state -q .state`), dans une commande **séparée** du merge.
    - ⛔ **Jamais `gh pr merge … ; git push origin --delete …` dans la même commande.** `gh pr merge` peut échouer (`Base branch was modified` quand `main` vient d'avancer, `BLOCKED` tant qu'un contrôle tourne) : la suite tourne quand même, et **supprimer la branche distante d'une PR ouverte la FERME** sans merge (#1601, 2026-10-22).
    - Rattrapage si c'est arrivé : les commits restent dans le dépôt local → `git branch <b> <sha>` + `git push origin <b>` + `gh pr reopen <n>` ; la réouverture **relance toute la CI**, à re-surveiller avant de merger.
    - `Base branch was modified` : relancer `gh pr merge --merge` (une fois) ; `BLOCKED` : attendre la fin des contrôles, ne pas passer `--admin`.

## 4. Checks locaux (un seul gros process à la fois)

- Le **hook pre-commit est léger** (`.lintstagedrc.js` → `oxlint` + `prettier` sur les fichiers staged, ~2 s — motif : la durée, un eslint complet prend 530 s) → **`--no-verify` n'est plus nécessaire**. oxlint bloque sur _erreurs_ seulement (warnings non bloquants) ; prettier garde le job **Lint** CI (`prettier --check`) vert.
- **Avant de pousser** : `pnpm check:incremental` (~18 s, moteur `--tsgo` depuis le 2026-10-10, **0 erreur exigée**).
- **eslint complet** : en CI, et autorisé en local **en arrière-plan** (`pnpm lint`, 530 s). Le hook utilise `oxlint` (Rust) pour le feedback rapide ; `pnpm lint:fast` (~2,5 s) avant de pousser.
- **Un seul gros process à la fois** : `pnpm check` / `pnpm build` / `pnpm lint` sont autorisés, sous le verrou de `scripts/gros-process.sh` (le même que `check:incremental`) (4 à 6 Go chacun, mesuré le 2026-09-29 sur Mac mini M6 24 Go, swap +0). `svelte-check` sans `--incremental` meurt sur le tas par défaut de Node (~4 Go), quelle que soit la RAM.

## 5. Base de données / migrations (chemin à haut risque)

- Migration écrite **sur la branche**.
- **Tests d'intégration OBLIGATOIRES** pour **RLS / fonctions `SECURITY DEFINER` / triggers / policies** :
  `pnpm db:start` (ou `db:reset`) **+** `pnpm test:integration <ciblé>` → **doivent passer**.
  _(C'est ce qui a manqué et a laissé partir une RPC cassée en prod le 2026-06-16.)_
- Changement de **schéma pur** (colonne / index / table sans logique) : `pnpm db:reset` doit réussir **+** `pnpm db:types` régénéré et commité.
- ❌ **JAMAIS** valider une fonction `SECURITY DEFINER` par un smoke-test avec `auth.uid()` NULL — le garde sort **avant** la vraie requête (faux positif).
- **Timing migration ↔ déploiement** :
  - **Additive** (`CREATE`, `ADD COLUMN`, `CREATE OR REPLACE`) → `pnpm db:migrate` **au merge** : la base précède le code en prod, sans risque.
  - **Destructive** (`DROP`, breaking) → `db:migrate` **après** le `pnpm deploy:prod` qui livre le code qui ne l'utilise plus (au besoin, 2 migrations séparées).
- `pnpm db:migrate` **uniquement depuis la branche mergée dans `main`** (sinon désync de l'historique `schema_migrations`).

## 6. PR, revue & merge

- `gh pr checks <n> --watch` → **tout vert** avant merge (Lint, Type Check, Types des tests, Build, Server/Client Tests, Security Audit, Garde SECURITY DEFINER → CI Summary ; CodeQL à part).
- Revue par agents :
  - `code-reviewer` sur tout changement substantiel.
  - **`security-auditor` OBLIGATOIRE** dès qu'il y a auth / RLS / API sensible / migration.
- **Merge = merge commit** (`gh pr merge --merge`) → préserve l'historique granulaire. Squash réservé à une suite de fixups bruités.

## 7. Déploiement & vérification

- Merge sur `main` → **rien n'est déployé**. La prod ne bouge que par **`pnpm deploy:prod`**, lancé par David ou par Claude **sur sa demande explicite** (ADR 0021). Le script crée la version (`pnpm release` : numéro, CHANGELOG, tag) sur le dernier état vérifié par la CI, attend la CI de ce commit de version, puis avance `production` jusqu'à lui ; `--essai` montre ce qui partirait.
  - Il tient le verrou « deploy » de bout en bout : le hook Claude refuse alors aux autres sessions `gh pr merge` et les commits ou pushes vers `main` ([§ 1 bis](#1-bis-plusieurs-sessions-en-parallèle)). Un humain n'est pas arrêté par le hook : David, qui lance aussi des merges, attend la fin.
- Ce qui attend la prod : `git log --first-parent origin/production..origin/main`.
- **Previews OFF** : le **job Build CI** (+ garde TDZ Safari) valide le build.
- Surveiller le déploiement (`get_deployment` → `READY`).
- **Vérifier en prod** tout changement user-facing (bypass si maintenance — voir §8).

## 8. Releases à risque → maintenance mode

Pour un changement de schéma **non rétro-compatible** ou un gros cutover :

1. `pnpm maintenance:on` (génère un secret de bypass, redéploie).
2. Merge → déploiement → migrations **dans le bon ordre** (§5).
3. **Vérifier via le bypass opérateur** (`/?bypass=<secret>`, cookie valable 8 h).
4. `pnpm maintenance:off`.

## 9. Hotfix prod urgent

Même flux, expédié : `fix/<slug>` depuis `main` → fix **+ test de non-régression** → PR → CI verte → merge → deploy. Maintenance mode si le bug impacte les données.

**Retour arrière Vercel (Instant Rollback) : jamais vers une version dont le code dépend de ce qu'une migration a retiré depuis.** Le retour arrière ne ramène que le code ; la base garde son schéma. Une table, une colonne, une policy ou un droit retirés après cette version la cassent, souvent en silence (une écriture refusée par la RLS rend zéro ligne).

- **Plancher au 2026-10-19 : v0.39.0.** Migration `20261017090100` : l'élève n'écrit plus lui-même `student_buddies` ni `srs_review_sessions` ; le code d'avant v0.39.0 le faisait (choix du Palotin, XP, série, séances de révision). Plancher précédent : v0.35.0 (migration `20261016103800`, ancien système de versions des modèles de chapitre).
- **Vérifier avant tout retour arrière vers `vX`** : lister les migrations ajoutées depuis `vX` qui retirent quelque chose :
  ```bash
  git diff --name-only --diff-filter=A vX origin/production -- supabase/migrations \
    | xargs grep -liE '^[^-]*(drop (table|column|policy|function)|revoke|rename)'
  ```
  Un résultat → lire son en-tête : si le code de `vX` utilise ce qui a été retiré, pas de retour arrière vers `vX` ; corriger en avant (§ 9).
- Une migration qui retire quelque chose relève le plancher : mettre à jour la ligne ci-dessus dans la même PR.

## 10. Interdits (leçons gravées — sessions 2026-06-16/17)

- ❌ Smoke-test d'une fonction `SECURITY DEFINER` avec `auth.uid()` NULL.
- ❌ Laisser du travail non commité : un hook qui crashe peut le **stasher** (→ perdu). Commit tôt ; après un crash de hook, **vérifier `git stash list`**. (Le pre-commit est désormais léger — oxlint + prettier — donc ce risque a fortement baissé.)
- ❌ Merger en CI rouge.
- ❌ Pousser une migration que le code déployé ne supporte pas (ordre additive/destructive).
- ❌ `pnpm db:migrate` depuis une branche non mergée.

---

Vérifié contre le code le 2026-10-10.
