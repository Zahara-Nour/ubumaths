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
