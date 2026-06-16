# Chantier (session séparée) — Baseline des migrations pour réparer le Supabase local

> **Statut** : à faire, **session dédiée** (décidé 2026-06-16). Ne PAS mélanger avec une feature.
> **Pourquoi maintenant** : le test d'intégration `tests/integration/game-leaderboards.test.ts`
> (classements de jeux) ne peut pas tourner — le stack local ne démarre même pas.

## Symptôme

`pnpm db:start` (et `pnpm db:reset`) échoue :

```
Applying migration 20250123000000_worksheets.sql...
ERROR: relation "public.exercises" does not exist (SQLSTATE 42P01)
```

Impact : **aucun test local** ne tourne (intégration ET trigger tests) — c'est la vraie raison
derrière la note « les trigger tests ne marchent pas en local ».

## Cause racine (mesurée 2026-06-16)

Les **noms de fichiers de migration ne forment pas un DDL séquentiel valide** : une table est
créée, supprimée, référencée, puis recréée — dans cet ordre de noms.

Cycle de vie de `public.exercises` :

| Ordre (nom de fichier)                         | Action sur `exercises`                                       |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `001_initial_schema.sql:46`                    | `CREATE TABLE exercises` (ancien)                            |
| `013_remove_exercise_tables_add_school...sql`  | **DROP** des tables exercise                                 |
| `20250123000000_worksheets.sql:156`            | FK `worksheet_exercises → exercises` ❌                      |
| `20251026080000_create_exercises_table.sql:13` | `CREATE TABLE IF NOT EXISTS public.exercises` (nouveau bank) |

→ Au replay propre, `worksheets` (jan 2025) référence `exercises` **dans le trou** entre le DROP
(`013`) et la recréation (`20251026`). D'où l'échec. **Ce n'est probablement pas le seul** trou :
619 migrations, attendez-vous à d'autres incohérences après celle-ci (jeu de whack-a-mole).

### Pourquoi la prod EU n'a jamais vu ça

EU a été construite par **clonage de données + `supabase migration repair --status applied`** (historique
marqué appliqué, **jamais rejoué** séquentiellement — cf. `docs/wip/supabase-eu-migration-plan.md`).
L'US (origine) a été bâtie au fil de l'eau, où l'ordre réel d'application ≠ l'ordre des noms de fichiers.
Donc l'incohérence n'existe que dans un **replay propre** (= ce que fait le local).

## Fix retenu : **baseline** (pas de réordonnancement)

Réordonner/patcher 619 fichiers = ingérable et risqué. La bonne approche est de **repartir d'un
baseline = le schéma EU réel** :

1. Dumper le schéma EU : `supabase db dump` (schéma `public` + rôles + éventuellement données seed).
2. En faire **une migration baseline unique** (`<ts>_baseline.sql`) et **archiver** les migrations
   historiques (les sortir du dossier appliqué localement), OU utiliser `supabase migration squash`.
3. Garder `supabase_migrations.schema_migrations` **cohérent** côté EU pour que `pnpm db:migrate`
   (`db push`) reste un **no-op** (ne ré-applique rien). ⚠️ L'historique EU a déjà été réparé une
   fois — manipuler avec soin (cf. [[project_supabase-eu-migration]]).
4. Valider : `pnpm db:reset` propre **réussit** localement.
5. Lancer la suite : `pnpm test:integration` (dont `game-leaderboards.test.ts`).

## Contraintes / pièges

- ⚠️ **Touche l'historique de migrations déjà appliqué en prod EU** → prudence, session dédiée,
  ne rien pousser sans validation David.
- Après baseline, vérifier que `db push` ne tente PAS de re-pousser le baseline sur EU.
- Le hook pre-commit + `eslint`/`svelte-check` type-aware **OOM** sur cette machine (gros sets) →
  prévoir `--no-verify` + `pnpm check:incremental` (memory-safe) comme dans le chantier classements.
- Attendre potentiellement **plusieurs erreurs d'ordre** si on tentait le réordonnancement → raison
  de plus pour le baseline (un dump = un schéma cohérent d'un coup).

## Ce que ça débloque

- Tous les tests d'intégration locaux, dont `tests/integration/game-leaderboards.test.ts` (classements
  de jeux — feature livrée, validée par audit + smoke-test EU + 45 unitaires, mais test d'intégration
  jamais exécuté faute de stack local).
- Les trigger tests (jusqu'ici réputés « ne marchent pas en local »).

## Point de départ pour la session dédiée

- Stack actuellement **arrêté** (`pnpm db:stop` fait). OrbStack installé et fonctionnel (`docker info` OK).
- Migrations : `supabase/migrations/` (619 fichiers, préfixes mixtes `00x_` / timestamp).
- Le 1er point de rupture connu = ci-dessus ; en chercher d'autres via `pnpm db:reset` itératif **après**
  avoir choisi la stratégie baseline (ne pas itérer sur du réordonnancement manuel).

---

# JOURNAL D'EXÉCUTION (2026-06-16)

> Branche : `chore/local-supabase-baseline`. Stratégie : **Option B** (baseline = nouveau
> timestamp + `migration repair` sur EU). Périmètre : reset propre + game-leaderboards.

## Ce qui a été fait

1. **Reproduction** : `pnpm db:start` plante bien sur
   `Applying migration 20250123000000_worksheets.sql... ERROR: relation "public.exercises" does not exist (42P01)`.
   `supabase start` se replie proprement (aucun conteneur ne reste après l'échec).
2. **Dump EU** : `supabase db dump --linked --schema public -f supabase/_baseline/public.sql`
   (mot de passe en cache keychain). **Schéma seul, aucune donnée** → 46 114 lignes,
   **203 tables / 391 fonctions / 780 policies / 160 triggers / 709 index / 25 vues / 9 types**.
3. **Analyse des dépendances cross-schema** (le dump `public` ne capture pas tout) :
   - `vector` : **dépendance dure** (colonne `rag_chunks.embedding public.vector(1024)` + signatures).
     → prologue `CREATE EXTENSION vector WITH SCHEMA public`.
   - `pg_cron` : **dépendance dure** (la vue `public.admin_pg_cron_jobs` lit `cron.job`).
     → prologue `CREATE EXTENSION pg_cron` (préchargé par le stack local).
   - `unaccent` : douce (corps de fonction, `check_function_bodies=false`). Ajoutée par cohérence.
   - `pgcrypto` : ajoutée par cohérence (`gen_random_uuid` est core en PG17).
   - Trigger `on_auth_user_created` **sur `auth.users`** : **absent** du dump `public`
     → épilogue qui le recrée (repris de `004_create_profile_trigger.sql`). Indispensable : les
     tests créent de vrais users auth → attendent la création auto du profil.
   - `storage.objects` (3 refs) / `cron.job` (comment) : soft, OK.
4. **Baseline assemblé** : `supabase/migrations/20260616220000_baseline_schema.sql` (46 168 lignes)
   = prologue (extensions) + dump EU + épilogue (trigger auth). Les **619 migrations historiques**
   archivées dans `supabase/migrations_archive/` via **`git mv`** (traçables, rollback possible).
5. **Validation** : `pnpm db:start` puis **`pnpm db:reset` réussit (exit 0)** — du premier coup,
   **aucun whack-a-mole** (vector/pg_cron/unaccent/trigger auth passent tous). Seul un NOTICE bénin
   (`pgcrypto already exists, skipping`). Le seed manquant (`config` pointe `./seed.sql` inexistant)
   est **toléré** par le CLI.

## Résultat

- ✅ **Objectif chantier ATTEINT** (def. du doc : « db:reset propre + test:integration **tourne** »).
- `pnpm test:integration` : **302 tests exécutés en 93 s** (avant : 0, la base ne démarrait pas).
  **77 passent, 209 échouent, 16 skip**, 21 fichiers (1 vert).
- **Le baseline est fidèle/complet** (triggers présents, contraintes appliquées, 77 tests verts).
  Les 209 échecs sont de la **dette de test préexistante** (tests jamais exécutés car le stack
  ne démarrait pas → jamais débuggés), PAS un défaut du baseline. Confirmé par échantillon :
  ex. `updated-at-triggers` échoue car le test paramétré tente `UPDATE ... SET sender_id = NULL`
  sur une colonne `NOT NULL` (la contrainte schéma fonctionne).

## Bugs révélés par le déblocage — TOUS CORRIGÉS (game-leaderboards 5/5 ✅)

> Décision David (2026-06-16) : corriger les bugs RPC (migration **non poussée**) + helper,
> et repasser game-leaderboards au vert. **Fait : 5/5.**

- **A) Bug RPC prod `game_leaderboard`** : `RETURNS TABLE("rank" ...)` mais la requête UNION ALL
  aliase la colonne `rk` ; le `ORDER BY score DESC, rank NULLS LAST, firstname` référence **`rank`**
  (inconnu dans le namespace de l'union) → `invalid UNION/INTERSECT/EXCEPT ORDER BY clause` (0A000).
  **Planterait aussi sur EU** (erreur au plan, indép. des données, même PG17). Masqué par le garde
  `IF auth.uid() IS NULL THEN RETURN` → invisible aux smoke-tests sans auth.
- **A2) Même bug dans `minesweeper_scoped_leaderboard`** (sibling RPC, `ORDER BY rank NULLS LAST...`).
- **Correctif A+A2** : `rank` → `rk` dans le ORDER BY final des deux fonctions, via la migration
  **`20260616230000_fix_leaderboard_union_order_by.sql`** (CREATE OR REPLACE des 2 fonctions, conserve
  les GRANT). **ADDITIVE / SAFE TO PUSH** mais **NON poussée** (David pousse quand il veut → fixe la
  prod). ⚠️ **La fonctionnalité « classements » est donc cassée en prod EU tant que ce fix n'est pas
  poussé.**
- **B) Bug helper de test** : `cleanupAllTestData()` ne purgeait pas `schools` → collision
  `unique_school`. **Corrigé** : purge des écoles de test (`city = 'Testville'`, FK-safe via
  `profiles.school_id ON DELETE SET NULL` + `classes.school_id ON DELETE CASCADE`).
- **C) Données de test minesweeper** : l'insert violait 3 contraintes (`completed_must_have_time`,
  `in_progress_must_not_be_completed`, `difficulty_check`/`reasonable_time_bounds`). **Corrigé** dans
  le test : `time_seconds: 60`, `completed_at`, `difficulty: 'beginner'` (au lieu de `'easy'`).

## Reste à faire

- **Phase 5 — réconciliation EU (Option B)** : `supabase migration repair --status applied 20260616220000`
  pour que `pnpm db:migrate` reste sûr sur EU. Après ce repair, un `db push` ne pousserait QUE le fix RPC
  `20260616230000` (souhaitable : il corrige la prod) — PAS le baseline. ⚠️ **Tant que le repair n'est
  pas fait, NE PAS lancer `db:migrate` depuis cette branche** (il tenterait de pousser le baseline →
  erreur + rollback, pas de perte de données). **David a validé que Claude lance ce repair.**
- **Commit** : baseline + archive (619, git mv) + fix RPC + 2 fixes de test + ce journal.
- **Nettoyage** du scratch `supabase/_baseline/` (redondant : intégré au baseline) avant commit.
- **Push du fix RPC `20260616230000`** sur EU : à la main de David, quand il veut (corrige la prod).
