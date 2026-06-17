# Git Workflow — UbuMaths

> **Process de développement OBLIGATOIRE** (bug fixes ET features), décidé avec David le 2026-06-17.
> `main` = **production** (Vercel y déploie la prod). Référencé depuis `CLAUDE.md`.
> Outils disponibles : `gh`, `vercel`, `supabase` (CLI) + MCP Supabase/Vercel — Claude prend en charge branche → PR → CI → merge → déploiement → vérif.

---

## 1. Règles d'or

1. **`main` = prod, toujours vert et déployable.** Jamais de commit de **code** directement sur `main`.
2. Tout changement de code → **branche → PR → CI 100 % verte → merge commit → suppression de branche**.
3. **Seule exception au PR** : pure doc/typo (**≤ 2 fichiers `.md`**) → commit direct sur `main` autorisé. (L'`ignoreCommand` Vercel exclut `docs/**` et `**/*.md` → un commit docs-only **ne redéploie pas** la prod.)
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

## 4. Checks locaux (contrainte mémoire / OOM)

- Le **hook pre-commit OOM** sur cette machine → `git commit --no-verify`, **MAIS compenser** :
  - `pnpm exec prettier --write <fichiers modifiés>` (sinon le job **Lint** CI casse sur `prettier --check`).
  - Fichiers `.svelte` → MCP `svelte-autofixer`.
- **Avant de pousser** : `pnpm check:incremental` (memory-safe, **0 erreur exigée**).
- **eslint = CI-only** (il OOM en local). On accepte le round-trip CI ; `npx eslint <fichiers>` seulement si la machine tient.
- **INTERDIT** (OOM) : `pnpm check` / `pnpm build` / `pnpm lint` / `svelte-check` sur tout le projet.

## 5. Base de données / migrations (chemin à haut risque)

- Migration écrite **sur la branche**.
- **Tests d'intégration OBLIGATOIRES** pour **RLS / fonctions `SECURITY DEFINER` / triggers / policies** :
  `pnpm db:start` (ou `db:reset`) **+** `pnpm test:integration <ciblé>` → **doivent passer**.
  _(C'est ce qui a manqué et a laissé partir une RPC cassée en prod le 2026-06-16.)_
- Changement de **schéma pur** (colonne / index / table sans logique) : `pnpm db:reset` doit réussir **+** `pnpm db:types` régénéré et commité.
- ❌ **JAMAIS** valider une fonction `SECURITY DEFINER` par un smoke-test avec `auth.uid()` NULL — le garde sort **avant** la vraie requête (faux positif).
- **Timing migration ↔ déploiement** :
  - **Additive** (`CREATE`, `ADD COLUMN`, `CREATE OR REPLACE`) → `pnpm db:migrate` **avant/avec** le déploiement (le code peut s'y appuyer).
  - **Destructive** (`DROP`, breaking) → `db:migrate` **après** que le code qui l'utilisait soit déployé (au besoin, 2 migrations séparées).
- `pnpm db:migrate` **uniquement depuis la branche mergée dans `main`** (sinon désync de l'historique `schema_migrations`).

## 6. PR, revue & merge

- `gh pr checks <n> --watch` → **tout vert** avant merge (Lint, Type Check, Build, Server/Client Tests, Analyze/CodeQL).
- Revue par agents :
  - `code-reviewer` sur tout changement substantiel.
  - **`security-auditor` OBLIGATOIRE** dès qu'il y a auth / RLS / API sensible / migration.
- **Merge = merge commit** (`gh pr merge --merge`) → préserve l'historique granulaire. Squash réservé à une suite de fixups bruités.

## 7. Déploiement & vérification

- Merge sur `main` → Vercel **build + déploie la prod** (`VERCEL_ENV=production`). **Previews OFF** : le **job Build CI** (+ garde TDZ Safari) valide le build, pas besoin de preview.
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
- ❌ Laisser du travail non commité : un hook pre-commit qui crashe le **stashe** (→ perdu). Commit tôt ; après un crash de hook, **vérifier `git stash list`**.
- ❌ Merger en CI rouge.
- ❌ Pousser une migration que le code déployé ne supporte pas (ordre additive/destructive).
- ❌ `pnpm db:migrate` depuis une branche non mergée.
