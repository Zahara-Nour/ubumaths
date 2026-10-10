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
4. **Conventional commits** (`feat()`, `fix()`, `chore()`, `refactor()`, `perf()`, `docs()`, `test()`). **Aucune mention Claude/Anthropic.**

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
9. Revue (voir §6).
10. `gh pr merge --merge` (merge commit).
11. **Supprimer la branche** : `git branch -d <b>` + `git push origin --delete <b>`.

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

## 10. Interdits (leçons gravées — sessions 2026-06-16/17)

- ❌ Smoke-test d'une fonction `SECURITY DEFINER` avec `auth.uid()` NULL.
- ❌ Laisser du travail non commité : un hook qui crashe peut le **stasher** (→ perdu). Commit tôt ; après un crash de hook, **vérifier `git stash list`**. (Le pre-commit est désormais léger — oxlint + prettier — donc ce risque a fortement baissé.)
- ❌ Merger en CI rouge.
- ❌ Pousser une migration que le code déployé ne supporte pas (ordre additive/destructive).
- ❌ `pnpm db:migrate` depuis une branche non mergée.

---

Vérifié contre le code le 2026-10-10.
