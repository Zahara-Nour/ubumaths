# Database Schema

This document tracks the high-level structure of the UbuMaths Supabase database.
It is **not** exhaustive — the source of truth is `supabase/migrations/`. Add a
new section here whenever you introduce a feature-level table cluster (chat,
game, kanban, etc.).

## Conventions

- All tables use `UUID` primary keys (`gen_random_uuid()` default).
- All timestamps are `TIMESTAMPTZ`.
- `updated_at` columns are bumped by the shared trigger function
  `update_updated_at_column()` (defined in `001_initial_schema.sql`).
- Row Level Security is enabled on every public table. SECURITY DEFINER helper
  functions live in `public` with `SET search_path = public, pg_temp`.

---

## Kanban

Introduced by `supabase/migrations/20260526190624_create_kanban_tables.sql`.

Lightweight Trello-style organisation tool available to students and teachers.

### Tables

#### `kanban_boards`

| Column       | Type          | Notes                                                                 |
| ------------ | ------------- | --------------------------------------------------------------------- |
| `id`         | `UUID` PK     | Default `gen_random_uuid()`.                                          |
| `owner_id`   | `UUID` FK     | -> `profiles(id)` ON DELETE CASCADE. Always set.                      |
| `class_id`   | `UUID` FK     | -> `classes(id)` ON DELETE CASCADE. NULL for personal boards.         |
| `title`      | `TEXT`        | NOT NULL, `char_length BETWEEN 1 AND 200`.                            |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`.                                                      |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. Bumped by trigger `update_kanban_boards_updated_at`. |

Two flavours:

- **Personal** (`class_id IS NULL`): private to `owner_id`, any role.
- **Class** (`class_id IS NOT NULL`): owned by the class teacher (enforced at
  API level — RLS only checks `is_class_teacher(class_id)` on INSERT). Students
  enrolled in the class can read the board and manage its cards.

Indexes:

- `idx_kanban_boards_owner` on `owner_id`.
- `idx_kanban_boards_class` on `class_id` (partial: `WHERE class_id IS NOT NULL`).

#### `kanban_columns`

| Column       | Type               | Notes                                           |
| ------------ | ------------------ | ----------------------------------------------- |
| `id`         | `UUID` PK          |                                                 |
| `board_id`   | `UUID` FK          | -> `kanban_boards(id)` ON DELETE CASCADE.       |
| `title`      | `TEXT`             | NOT NULL, `char_length BETWEEN 1 AND 100`.      |
| `position`   | `DOUBLE PRECISION` | NOT NULL. Fractional indexing for O(1) reorder. |
| `created_at` | `TIMESTAMPTZ`      | Default `NOW()`.                                |

Indexes: `idx_kanban_columns_board` on `board_id`.

#### `kanban_cards`

| Column        | Type               | Notes                                                                |
| ------------- | ------------------ | -------------------------------------------------------------------- |
| `id`          | `UUID` PK          |                                                                      |
| `column_id`   | `UUID` FK          | -> `kanban_columns(id)` ON DELETE CASCADE.                           |
| `title`       | `TEXT`             | NOT NULL, `char_length BETWEEN 1 AND 200`.                           |
| `description` | `TEXT`             | Nullable. ubumark/markdown. Length capped at 50000 chars by API Zod. |
| `position`    | `DOUBLE PRECISION` | NOT NULL. Fractional indexing.                                       |
| `created_at`  | `TIMESTAMPTZ`      |                                                                      |
| `updated_at`  | `TIMESTAMPTZ`      | Bumped by trigger `update_kanban_cards_updated_at`.                  |

Indexes: `idx_kanban_cards_column` on `column_id`.

### Helper functions

- `is_class_member(p_class_id UUID) RETURNS BOOLEAN` — SECURITY DEFINER, STABLE.
  TRUE if `auth.uid()` is in `class_members.student_id` for the given class.
  Granted to `authenticated`.
- `can_access_kanban_board(p_board_id UUID) RETURNS BOOLEAN` — SECURITY DEFINER,
  STABLE. TRUE if the caller is the board owner, OR the board is a class board
  and the caller is teacher / member of that class.
- `can_access_kanban_column(p_column_id UUID) RETURNS BOOLEAN` — SECURITY
  DEFINER, STABLE. Wrapper that resolves the column to its board and delegates
  to `can_access_kanban_board`.

All three pin `search_path = public, pg_temp` per the security hardening policy
(see `20260523215052_harden_function_search_path.sql`).

### Row Level Security

| Table            | SELECT                                    | INSERT                                                     | UPDATE                                | DELETE           |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------- | ---------------- |
| `kanban_boards`  | owner OR (class board AND teacher/member) | `owner_id = auth.uid()` AND (no class OR teacher of class) | owner only                            | owner only       |
| `kanban_columns` | `can_access_kanban_board(board_id)`       | board owner only                                           | board owner only                      | board owner only |
| `kanban_cards`   | `can_access_kanban_column(column_id)`     | `can_access_kanban_column(column_id)`                      | `can_access_kanban_column(column_id)` | as INSERT        |

The card policies are intentionally permissive — for class boards we want
students (class members) to freely create / edit / move / delete cards while
columns and the board itself stay locked to the teacher.

### TypeScript types

Until the migration is pushed and `pnpm db:types` is re-run, the row interfaces
live as stopgap definitions in `src/lib/types/database-helpers.ts` under the
`Kanban Types (STOPGAP)` section. After regeneration, swap each interface for
a `Tables<'kanban_boards'>` alias and keep the `*Insert` / `*Update` and
`KanbanBoardWithCounts` composite types in place.

---

## Compétences (référentiel d'évaluation — Phase 1, 2026-06-09)

Introduit par trois migrations couplées :

- `supabase/migrations/20260609120000_competence_referentiel_schema.sql` — tables + RLS + indexes + VIEW
- `supabase/migrations/20260609120001_competence_referentiel_functions.sql` — fonctions PL/pgSQL + trigger
- `supabase/migrations/20260609120002_competence_referentiel_seeds.sql` — seeds 6ᵉ (généré par `scripts/generate-competence-seeds.ts`)

Spec : `docs/wip/skills-referentiel-design.md` (décisions actées 57-72). Types métier : `src/lib/types/skills.ts` + aliases dans `src/lib/types/database-helpers.ts`.

### Deux familles de skills

| Famille                                | Code DB `family` | Hiérarchie                                                                                  | 6ᵉ V1 (volume)                               |
| -------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **A — Connaissances et savoir-faire**  | `'knowledge'`    | `skill_themes` → `skill_objectives` → `skills` (4 capacités ordonnées)                      | 6 thèmes / 18 objectifs / 72 capacités       |
| **B — Compétences math transversales** | `'competence'`   | `math_competences` (6) → `math_competence_subdimensions` (A/B/C/D) → `skills` (observables) | 6 compétences / 22 sous-dim / 56 observables |

Asymétrie volontaire : en famille `knowledge` l'élève voit l'objectif (2ᵉ niveau) ; en famille `competence` il voit la compétence math elle-même (1ᵉʳ niveau). Cf. design doc §1.

### Tables référentiel (lecture publique authentifiée — décision Q3 partagé global)

#### `skill_themes`

| Column            | Type          | Notes                                                                |
| ----------------- | ------------- | -------------------------------------------------------------------- |
| `id`              | `UUID` PK     | Default `gen_random_uuid()`.                                         |
| `niveau_scolaire` | `TEXT`        | NOT NULL. `'6e'` pour V1 ; `'5e'`, ..., `'terminale-spe'` plus tard. |
| `name`            | `TEXT`        | NOT NULL. UNIQUE par `niveau_scolaire`.                              |
| `description`     | `TEXT`        | NULLable.                                                            |
| `display_order`   | `INTEGER`     | NOT NULL.                                                            |
| `bo_reference`    | `TEXT`        | NULLable. Citation libre BO pour traçabilité.                        |
| `created_at`      | `TIMESTAMPTZ` | Default `NOW()`.                                                     |
| `updated_at`      | `TIMESTAMPTZ` | Default `NOW()`.                                                     |

#### `skill_objectives`

| Column          | Type          | Notes                                   |
| --------------- | ------------- | --------------------------------------- |
| `id`            | `UUID` PK     | Default `gen_random_uuid()`.            |
| `theme_id`      | `UUID` FK     | → `skill_themes(id)` ON DELETE CASCADE. |
| `name`          | `TEXT`        | NOT NULL. UNIQUE par `theme_id`.        |
| `description`   | `TEXT`        | NULLable.                               |
| `display_order` | `INTEGER`     | NOT NULL.                               |
| `created_at`    | `TIMESTAMPTZ` | Default `NOW()`.                        |
| `updated_at`    | `TIMESTAMPTZ` | Default `NOW()`.                        |

#### `skills` — unité de saisie polymorphe (famille knowledge OU competence)

| Column              | Type          | Notes                                                                                                 |
| ------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| `id`                | `UUID` PK     | Default `gen_random_uuid()`.                                                                          |
| `objective_id`      | `UUID` FK     | NULLable → `skill_objectives(id)`. Set ssi famille knowledge.                                         |
| `subdimension_id`   | `UUID` FK     | NULLable → `math_competence_subdimensions(id)`. Set ssi famille competence.                           |
| `family`            | `TEXT`        | **GENERATED** STORED : `CASE WHEN objective_id IS NOT NULL THEN 'knowledge' ELSE 'competence' END`.   |
| `name`              | `TEXT`        | NOT NULL. Famille A : nom court capacité ; famille B : énoncé élève 1ʳᵉ personne.                     |
| `teacher_grid_text` | `TEXT`        | NULLable. Famille B : grille enseignant (reformulation observable opérationnelle).                    |
| `knowledge_type`    | `TEXT`        | NULLable. Famille knowledge uniquement : `'automatisme'` \| `'capacite_attendue'` (rubrique BO 2026). |
| `observable_code`   | `TEXT`        | NULLable. Famille competence uniquement : code court `'A1'`, `'B3'`, ...                              |
| `niveau_scolaire`   | `TEXT`        | NULLable. Famille A : `'6e'` ; famille B : `'college'`.                                               |
| `display_order`     | `INTEGER`     | NOT NULL. Famille A : rang 1-4 sous l'objectif ; famille B : ordre dans la sous-dim.                  |
| `created_at`        | `TIMESTAMPTZ` | Default `NOW()`.                                                                                      |
| `updated_at`        | `TIMESTAMPTZ` | Default `NOW()`.                                                                                      |

CHECK constraints :

- `chk_skill_family` : `(objective_id IS NOT NULL) <> (subdimension_id IS NOT NULL)` (XOR strict).
- `chk_skill_knowledge_rang` : famille knowledge → `display_order BETWEEN 1 AND 4 AND knowledge_type IS NOT NULL`.
- `chk_skill_competence_code` : famille competence → `observable_code IS NOT NULL`.

Partial unique indexes : `(objective_id, display_order)` famille A, `(subdimension_id, observable_code)` famille B.

#### `math_competences`

| Column              | Type          | Notes                                                                       |
| ------------------- | ------------- | --------------------------------------------------------------------------- |
| `id`                | `UUID` PK     | Default `gen_random_uuid()`.                                                |
| `code`              | `TEXT`        | NOT NULL UNIQUE. Snake-case sans accents : `'chercher'`, `'modeliser'`, ... |
| `name`              | `TEXT`        | NOT NULL. Libellé affiché (`Chercher`, `Modéliser`, ...).                   |
| `description`       | `TEXT`        | NULLable. Vocabulaire BO/IGÉSR.                                             |
| `gloss_for_student` | `TEXT`        | NOT NULL. Glose pédagogique visible élève (ex. « essayer des pistes »).     |
| `display_order`     | `INTEGER`     | NOT NULL.                                                                   |
| `created_at`        | `TIMESTAMPTZ` | Default `NOW()`.                                                            |
| `updated_at`        | `TIMESTAMPTZ` | Default `NOW()`.                                                            |

#### `math_competence_subdimensions`

| Column               | Type          | Notes                                                               |
| -------------------- | ------------- | ------------------------------------------------------------------- |
| `id`                 | `UUID` PK     | Default `gen_random_uuid()`.                                        |
| `math_competence_id` | `UUID` FK     | → `math_competences(id)` ON DELETE CASCADE.                         |
| `letter`             | `CHAR(1)`     | NOT NULL CHECK in (`'A'`,`'B'`,`'C'`,`'D'`). UNIQUE par compétence. |
| `name`               | `TEXT`        | NOT NULL. Ex. « S'approprier le problème ».                         |
| `description`        | `TEXT`        | NULLable.                                                           |
| `display_order`      | `INTEGER`     | NOT NULL.                                                           |
| `created_at`         | `TIMESTAMPTZ` | Default `NOW()`.                                                    |
| `updated_at`         | `TIMESTAMPTZ` | Default `NOW()`.                                                    |

Pas d'état propre (décision 50) — sert au regroupement structurel des observables.

### Junction tagging templates ↔ skills

#### `question_template_skills`

| Column        | Type          | Notes                                         |
| ------------- | ------------- | --------------------------------------------- |
| `template_id` | `UUID` FK     | → `question_templates(id)` ON DELETE CASCADE. |
| `skill_id`    | `UUID` FK     | → `skills(id)` ON DELETE RESTRICT.            |
| `created_at`  | `TIMESTAMPTZ` | Default `NOW()`.                              |

PK composite `(template_id, skill_id)`. Décision 59 — tagging au niveau **template** (pas instance) ; toutes les instances héritent du tag.

### Tâches d'évaluation famille competence

#### `evaluation_tasks`

| Column            | Type          | Notes                                                                                   |
| ----------------- | ------------- | --------------------------------------------------------------------------------------- |
| `id`              | `UUID` PK     | Default `gen_random_uuid()`.                                                            |
| `teacher_id`      | `UUID` FK     | → `profiles(id)` ON DELETE CASCADE.                                                     |
| `class_id`        | `UUID` FK     | NULLable → `classes(id)` ON DELETE SET NULL.                                            |
| `niveau_scolaire` | `TEXT`        | NOT NULL.                                                                               |
| `name`            | `TEXT`        | NOT NULL.                                                                               |
| `description`     | `TEXT`        | NULLable.                                                                               |
| `assessment_id`   | `UUID` FK     | NULLable → `assessments(id)` ON DELETE SET NULL. Lien optionnel à une source existante. |
| `exercise_id`     | `UUID` FK     | NULLable → `exercises(id)` ON DELETE SET NULL. Idem.                                    |
| `worksheet_id`    | `UUID` FK     | NULLable → `worksheets(id)` ON DELETE SET NULL. Idem.                                   |
| `task_date`       | `DATE`        | NULLable.                                                                               |
| `created_at`      | `TIMESTAMPTZ` | Default `NOW()`.                                                                        |
| `updated_at`      | `TIMESTAMPTZ` | Default `NOW()`.                                                                        |

CHECK `chk_evaluation_task_source` : au plus 1 parmi `assessment_id`/`exercise_id`/`worksheet_id` non-null (décision 71 — polymorphisme via 3 FK distinctes).

#### `evaluation_task_perimeter`

| Column       | Type          | Notes                                                                |
| ------------ | ------------- | -------------------------------------------------------------------- |
| `task_id`    | `UUID` FK     | → `evaluation_tasks(id)` ON DELETE CASCADE.                          |
| `skill_id`   | `UUID` FK     | → `skills(id)` ON DELETE RESTRICT. Doit être famille `'competence'`. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`.                                                     |

PK composite `(task_id, skill_id)`. Trigger BEFORE INSERT/UPDATE `check_perimeter_skill_is_competence()` rejette les skills famille knowledge (M2 patch sécurité).

### Saisies — `skill_attempts` (double régime)

| Column          | Type          | Notes                                                                                                          |
| --------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| `id`            | `UUID` PK     | Default `gen_random_uuid()`.                                                                                   |
| `student_id`    | `UUID` FK     | → `profiles(id)` ON DELETE CASCADE.                                                                            |
| `skill_id`      | `UUID` FK     | → `skills(id)` ON DELETE RESTRICT.                                                                             |
| `success`       | `BOOLEAN`     | NULLable. Famille knowledge uniquement.                                                                        |
| `template_id`   | `UUID` FK     | NULLable → `question_templates(id)` ON DELETE SET NULL. Famille knowledge.                                     |
| `code`          | `TEXT`        | NULLable. Famille competence uniquement : `'plus'` \| `'minus'`.                                               |
| `task_id`       | `UUID` FK     | NULLable → `evaluation_tasks(id)` ON DELETE CASCADE. Famille competence.                                       |
| `source`        | `TEXT`        | NOT NULL. `'auto'` \| `'teacher'` \| `'student_self'`.                                                         |
| `source_ref`    | `UUID`        | NULLable. Référence libre vers l'origine (session, assignment, ...).                                           |
| `with_help`     | `BOOLEAN`     | NOT NULL DEFAULT `FALSE`. Décision 58 — ignoré dans la règle d'acquisition.                                    |
| `phase_blocage` | `TEXT`        | NULLable. BO 2026 cycle 3 : `'comprendre'` \| `'modeliser'` \| `'calculer'` \| `'repondre'` \| `'regulation'`. |
| `created_at`    | `TIMESTAMPTZ` | Default `NOW()`.                                                                                               |

CHECK `chk_attempt_family_regime` : XOR strict entre régimes (famille A : `success` + `template_id` ; famille B : `code` + `task_id`). **Immutable** (pas de policy UPDATE/DELETE hors admin — décision 72).

### Caches (recalculés par trigger `trg_skill_attempts_after_insert`)

#### `student_skill_state_a`

| Column                        | Type          | Notes                                                                  |
| ----------------------------- | ------------- | ---------------------------------------------------------------------- |
| `student_id`                  | `UUID`        | PK composite avec `skill_id`. FK → `profiles(id)`.                     |
| `skill_id`                    | `UUID`        | PK composite. FK → `skills(id)` (famille knowledge).                   |
| `is_acquired`                 | `BOOLEAN`     | NOT NULL DEFAULT `FALSE`.                                              |
| `total_successes`             | `INTEGER`     | NOT NULL DEFAULT `0`.                                                  |
| `distinct_template_successes` | `INTEGER`     | NOT NULL DEFAULT `0`. Pour la règle `capacite_attendue` (décision 60). |
| `last_success_at`             | `TIMESTAMPTZ` | NULLable.                                                              |
| `last_attempt_at`             | `TIMESTAMPTZ` | NULLable.                                                              |
| `needs_remediation`           | `BOOLEAN`     | NOT NULL DEFAULT `FALSE`. 🆘 : ≥ 2 échecs récents (décisions 63-64).   |
| `created_at`                  | `TIMESTAMPTZ` | Default `NOW()`.                                                       |
| `updated_at`                  | `TIMESTAMPTZ` | Default `NOW()`.                                                       |

Note (décision 70) : pas de colonne `to_review` ici — calculée à la lecture via la VIEW ci-dessous.

#### VIEW `student_skill_state_a_v` (avec `security_invoker = on`)

Expose `student_skill_state_a` + colonne calculée `to_review = (is_acquired AND last_success_at < NOW() - INTERVAL '30 days')`. **Toujours lire via la VIEW**, jamais directement la table (sinon `to_review` manquant).

#### `student_observable_state`

| Column            | Type          | Notes                                                                                      |
| ----------------- | ------------- | ------------------------------------------------------------------------------------------ |
| `student_id`      | `UUID`        | PK composite. FK → `profiles(id)`.                                                         |
| `skill_id`        | `UUID`        | PK composite. FK → `skills(id)` (famille competence).                                      |
| `count_plus`      | `INTEGER`     | NOT NULL DEFAULT `0`.                                                                      |
| `count_minus`     | `INTEGER`     | NOT NULL DEFAULT `0`.                                                                      |
| `is_acquis`       | `BOOLEAN`     | NOT NULL DEFAULT `FALSE`. `(count_plus ≥ 2) AND (count_plus > count_minus)` (décision 47). |
| `last_attempt_at` | `TIMESTAMPTZ` | NULLable.                                                                                  |
| `updated_at`      | `TIMESTAMPTZ` | Default `NOW()`.                                                                           |

#### `student_competence_level`

| Column                  | Type          | Notes                                                                                                                                     |
| ----------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `student_id`            | `UUID`        | PK composite. FK → `profiles(id)`.                                                                                                        |
| `math_competence_id`    | `UUID`        | PK composite. FK → `math_competences(id)`.                                                                                                |
| `niveau`                | `TEXT`        | NOT NULL CHECK in (`'insuffisante'`,`'fragile'`,`'satisfaisante'`,`'tres_bonne'`).                                                        |
| `validated_observables` | `JSONB`       | Array de codes observables acquis qui valident le niveau actuel.                                                                          |
| `missing_for_next`      | `JSONB`       | Array d'objets typés `{kind, code/letter/codes/name}` — exigences pour passer au niveau supérieur (décision 70 + format typé 2026-06-09). |
| `task_count`            | `INTEGER`     | NULLable. Nombre distinct de tâches d'évaluation observées (garde-fou §6.4).                                                              |
| `last_recalc_at`        | `TIMESTAMPTZ` | NULLable.                                                                                                                                 |

### Fonctions PL/pgSQL

| Fonction                              | Type           | Rôle                                                                                   |
| ------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| `compute_chercher_level`              | `STABLE` def   | Règle conjonctive Chercher → `(niveau, validated, missing)`.                           |
| `compute_calculer_level`              | `STABLE` def   | Règle conjonctive Calculer.                                                            |
| `compute_raisonner_level`             | `STABLE` def   | Règle conjonctive Raisonner.                                                           |
| `compute_communiquer_level`           | `STABLE` def   | Règle conjonctive Communiquer.                                                         |
| `compute_modeliser_level`             | `STABLE` def   | Règle conjonctive Modéliser.                                                           |
| `compute_representer_level`           | `STABLE` def   | Règle conjonctive Représenter.                                                         |
| `compute_competence_level`            | `STABLE` def   | Dispatcher : appelle la fonction `compute_<code>_level` selon `math_competences.code`. |
| `update_student_skill_state_a`        | `VOLATILE` def | Recalcule la ligne cache famille A après INSERT skill_attempts.                        |
| `update_student_observable_state`     | `VOLATILE` def | Recalcule la ligne cache observable + cascade vers `update_student_competence_level`.  |
| `update_student_competence_level`     | `VOLATILE` def | UPSERT cache compétence avec garde-fous §6.4.                                          |
| `skill_attempts_after_insert`         | `trigger`      | Dispatch sur `NEW.success` (knowledge) vs `NEW.code` (competence).                     |
| `check_perimeter_skill_is_competence` | `trigger`      | Rejette skill_id famille knowledge dans `evaluation_task_perimeter` (M2).              |

Toutes `SECURITY DEFINER` avec `SET search_path = public, pg_temp` (décision 72 — anti schema-hijacking).

### Triggers

| Trigger                           | Table                       | Quand                     | Action                                  |
| --------------------------------- | --------------------------- | ------------------------- | --------------------------------------- |
| `trg_skill_attempts_after_insert` | `skill_attempts`            | AFTER INSERT FOR EACH ROW | `skill_attempts_after_insert()`         |
| `trg_perimeter_skill_family`      | `evaluation_task_perimeter` | BEFORE INSERT/UPDATE      | `check_perimeter_skill_is_competence()` |

### Row Level Security (décision 72)

| Table / VIEW                | SELECT                                                                    | INSERT                                                                                              | UPDATE/DELETE                               |
| --------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Référentiel (5 tables)      | Lecture publique authentifiée (Q3 = partagé global)                       | Admin / service role uniquement                                                                     | Admin uniquement                            |
| `question_template_skills`  | Idem référentiel                                                          | Admin uniquement (à étendre prof V2)                                                                | Admin uniquement                            |
| `skill_attempts`            | Élève propre (`student_id = auth.uid()`) OU prof via `classes.teacher_id` | Élève propre + `code IS NULL AND task_id IS NULL` ; prof + `is_teacher_or_admin()` + task ownership | **Aucune** (immutable, admin override only) |
| 3 caches `student_*`        | Idem `skill_attempts`                                                     | **Trigger uniquement** (pas accessible utilisateurs)                                                | Trigger uniquement                          |
| `evaluation_tasks`          | Prof créateur OU élèves de la classe ciblée                               | Prof : `teacher_id = auth.uid() AND is_teacher_or_admin()`                                          | Prof créateur uniquement                    |
| `evaluation_task_perimeter` | Hérite de `evaluation_tasks` via JOIN                                     | Prof créateur de la tâche                                                                           | Prof créateur de la tâche                   |

Tous les admins `is_admin()` ont une policy `FOR ALL` qui surclasse les règles ci-dessus. Note : le filtre `classes.is_active` n'est **pas** appliqué (décision David 2026-06-09 : un prof garde l'accès historique aux ex-élèves même après archivage).

### TypeScript types

Aliases derived dans `src/lib/types/database-helpers.ts` (section « Skills System »). Types métier stables (unions, helpers UI) dans `src/lib/types/skills.ts`.

Pour les attempts, **toujours** utiliser le type discriminé `SkillAttempt` (pas `Tables<'skill_attempts'>`) — il renforce le XOR famille au type level.

Pour les niveaux de compétence math, **toujours** caster `missing_for_next` en `MissingForNext` (alias de `MissingForNextItem[]`) — l'array contient des objets typés discriminés par `kind`.
