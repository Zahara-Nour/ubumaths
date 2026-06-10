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

### Saisies — `skill_attempts` (double régime — refonte per-template 2026-06-10)

| Column          | Type          | Notes                                                                                                          |
| --------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| `id`            | `UUID` PK     | Default `gen_random_uuid()`.                                                                                   |
| `student_id`    | `UUID` FK     | → `profiles(id)` ON DELETE CASCADE.                                                                            |
| `skill_id`      | `UUID` FK     | **Nullable depuis refonte** → `skills(id)` ON DELETE RESTRICT. Famille competence uniquement.                  |
| `template_id`   | `UUID` FK     | Nullable → `question_templates(id)` ON DELETE SET NULL. **Pivot Famille knowledge** (per-template).            |
| `success`       | `BOOLEAN`     | NULLable. Famille knowledge uniquement.                                                                        |
| `grade`         | `SMALLINT`    | NULLable. Famille knowledge uniquement : 1=Again, 2=Hard, 3=Good, 4=Easy (FSRS). NULL pour Famille B.          |
| `code`          | `TEXT`        | NULLable. Famille competence uniquement : `'plus'` \| `'minus'`.                                               |
| `task_id`       | `UUID` FK     | NULLable → `evaluation_tasks(id)` ON DELETE CASCADE. Famille competence.                                       |
| `source`        | `TEXT`        | NOT NULL. `'auto'` \| `'srs'` \| `'teacher'` \| `'student_self'`. `'srs'` ajouté 2026-06-10.                   |
| `source_ref`    | `UUID`        | NULLable. Référence libre vers l'origine (session, assignment, ...).                                           |
| `with_help`     | `BOOLEAN`     | NOT NULL DEFAULT `FALSE`. Décision 58 — ignoré dans la règle d'acquisition.                                    |
| `phase_blocage` | `TEXT`        | NULLable. BO 2026 cycle 3 : `'comprendre'` \| `'modeliser'` \| `'calculer'` \| `'repondre'` \| `'regulation'`. |
| `created_at`    | `TIMESTAMPTZ` | Default `NOW()`.                                                                                               |

CHECK `chk_attempt_family_regime` (**refonte 2026-06-10**) : XOR strict

- Famille A : `template_id NOT NULL AND success NOT NULL AND skill_id NULL AND code NULL AND task_id NULL` (grade libre)
- Famille B : `skill_id NOT NULL AND code NOT NULL AND task_id NOT NULL AND template_id NULL AND success NULL AND grade NULL`

CHECK `chk_attempt_grade_range` : `grade IS NULL OR grade BETWEEN 1 AND 4`.

**Mapping (success ↔ grade) côté application** :

- Monde 1 (quiz interactif) : `success=true → grade=3 (Good)` ; `success=false → grade=1 (Again)`.
- Monde 2 (review SRS) : grade transmis brut ; `success = (grade >= 2)`.

**Immutable** : pas de policy UPDATE/DELETE hors admin (décision 72).

Index notable : `idx_skill_attempts_student_template_time(student_id, template_id, created_at DESC) WHERE template_id IS NOT NULL` — couvre les queries de `update_student_skill_state_a` (JOIN `question_template_skills` à la lecture).

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

Vue plate de `student_skill_state_a` (les colonnes telles quelles).

**Refonte 2026-06-10** : la colonne calculée `to_review` (basée sur le seuil arbitraire 30 jours) a été **supprimée** et remplacée par un badge FSRS-agrégé calculé à la lecture côté serveur via `srs_card_stats`. Voir `src/lib/server/srs/capacity-badge.ts` (`computeCapacityBadges`).

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

| Fonction                              | Type           | Rôle                                                                                                                                                            |
| ------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compute_chercher_level`              | `STABLE` def   | Règle conjonctive Chercher → `(niveau, validated, missing)`.                                                                                                    |
| `compute_calculer_level`              | `STABLE` def   | Règle conjonctive Calculer.                                                                                                                                     |
| `compute_raisonner_level`             | `STABLE` def   | Règle conjonctive Raisonner.                                                                                                                                    |
| `compute_communiquer_level`           | `STABLE` def   | Règle conjonctive Communiquer.                                                                                                                                  |
| `compute_modeliser_level`             | `STABLE` def   | Règle conjonctive Modéliser.                                                                                                                                    |
| `compute_representer_level`           | `STABLE` def   | Règle conjonctive Représenter.                                                                                                                                  |
| `compute_competence_level`            | `STABLE` def   | Dispatcher : appelle la fonction `compute_<code>_level` selon `math_competences.code`.                                                                          |
| `update_student_skill_state_a`        | `VOLATILE` def | Recalcule la ligne cache famille A. **Refonte 2026-06-10** : query JOIN `question_template_skills` (skill_id NULL en régime A).                                 |
| `update_student_observable_state`     | `VOLATILE` def | Recalcule la ligne cache observable + cascade vers `update_student_competence_level`.                                                                           |
| `update_student_competence_level`     | `VOLATILE` def | UPSERT cache compétence avec garde-fous §6.4.                                                                                                                   |
| `skill_attempts_after_insert`         | `trigger`      | **Refonte 2026-06-10** : Famille A boucle sur `question_template_skills` et appelle `update_student_skill_state_a` pour chaque skill tagué. Famille B inchangé. |
| `check_perimeter_skill_is_competence` | `trigger`      | Rejette skill_id famille knowledge dans `evaluation_task_perimeter` (M2).                                                                                       |

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

---

## SRS / FSRS — Spaced Repetition System (refonte 2026-06-10)

Le système SRS est greffé sur `question_templates` via `srs_cards`. Algorithme FSRS-6 (cf. `src/lib/srs/fsrs.ts`). Détail architectural complet : `docs/ref/srs/architecture.md`.

### Tables existantes (depuis migration 080, étendues 2026-06-10)

#### `srs_decks` (extension 2026-06-10)

Ajout d'une colonne :

| Column            | Type      | Notes                                                                                |
| ----------------- | --------- | ------------------------------------------------------------------------------------ |
| `is_auto_managed` | `BOOLEAN` | NOT NULL DEFAULT `FALSE`. `TRUE` = deck Programme géré par le système (1 par élève). |

Index UNIQUE partiel `uq_srs_decks_one_programme_per_owner ON (owner_id) WHERE is_auto_managed = TRUE` — garantit 1 seul Programme par élève. Permet `ON CONFLICT DO NOTHING` côté helper.

RLS : les policies UPDATE/DELETE refusent les decks `is_auto_managed = TRUE` côté élève (l'élève ne peut ni modifier ni supprimer son Programme). Lecture autorisée.

#### `srs_cards` (extension 2026-06-10)

Ajout d'une colonne :

| Column       | Type   | Notes                                                                                                                   |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `section_id` | `UUID` | NULLable FK → `srs_deck_sections(id)` ON DELETE SET NULL. NULL = carte "Non rangée". Toujours NULL dans deck Programme. |

Index UNIQUE partiel `uq_srs_cards_deck_template ON (deck_id, template_id) WHERE template_id IS NOT NULL AND card_type = 'template'` — empêche les doublons de cartes template-based dans un même deck. Permet `ON CONFLICT DO NOTHING` côté helper.

RLS : INSERT/UPDATE/DELETE refusés sur les cartes des decks `is_auto_managed = TRUE` côté élève.

#### `srs_deck_sections` (nouvelle table — sous-sections manuelles)

| Column          | Type          | Notes                                                |
| --------------- | ------------- | ---------------------------------------------------- |
| `id`            | `UUID` PK     | Default `gen_random_uuid()`.                         |
| `deck_id`       | `UUID` FK     | → `srs_decks(id)` ON DELETE CASCADE.                 |
| `name`          | `TEXT`        | NOT NULL. Length 1-50 chars.                         |
| `description`   | `TEXT`        | NULLable.                                            |
| `display_order` | `INTEGER`     | NOT NULL DEFAULT `0`.                                |
| `created_at`    | `TIMESTAMPTZ` | Default `NOW()`.                                     |
| `updated_at`    | `TIMESTAMPTZ` | Default `NOW()`. Trigger `update_updated_at_column`. |

UNIQUE `(deck_id, name)`. Index `(deck_id, display_order)`.

RLS : owner du deck uniquement, ET deck non-assigné, ET deck non-auto-managé (le Programme refuse les sections manuelles).

### Couplage `skill_attempts` ↔ `srs_card_stats`

`skill_attempts` est la **source unique des faits**. Toute interaction écrit ici (Monde 1 quiz interactif source='auto', Monde 2 review SRS source='srs').

Les caches dérivés sont :

- `student_skill_state_a` (Référentiel famille A — règles BO §6.1) — recalculé par trigger PG sur INSERT `skill_attempts`.
- `srs_card_stats` (FSRS-6 — état D/S/R par template) — UPSERT côté API en TypeScript (avant l'INSERT `skill_attempts`). FSRS n'est pas porté en PL/pgSQL.

Le deck Programme est auto-géré : la fonction TypeScript `ensureProgrammeDeckCard` ajoute idempotemment une carte au Programme pour chaque template **tagué famille A** rencontré par l'élève.

### Badges UI dérivés

Les badges affichés à l'élève côté `/dashboard/student/objectifs/[id]` agrègent l'état FSRS de tous les templates tagués sur une capacité :

- 🆘 **À remédier** : ≥ 1 template avec `next_review <= NOW() AND state IN ('learning', 'relearning')`
- 🔁 **À renforcer** : ≥ 1 template avec `next_review <= NOW() AND state = 'review'`
- ⏳ **En apprentissage** : ≥ 1 template avec `next_review > NOW() AND state IN ('learning', 'relearning')` (ou `state = 'new'`)
- ✅ **Acquise en mémoire** : ≥ 1 template avec `next_review > NOW() AND state = 'review'`

Helper : `src/lib/server/srs/capacity-badge.ts` (fonctions pures `templateToBadge` + `worstBadge` + `aggregateBadge`).

Cohabitation avec le verdict BO formel `is_acquired` : les deux sont affichés côte à côte. Le badge FSRS pilote la révision dynamique ; `is_acquired` reste le verdict BO formel (LSU, bulletin).

### Trigger PG vs FSRS TypeScript

Le trigger `skill_attempts_after_insert` ne touche **pas** à `srs_card_stats` (FSRS reste 100% TypeScript). FSRS est mis à jour par les endpoints `/api/skill-attempts/+server.ts` et `/api/srs/review/submit/+server.ts` **avant** l'INSERT `skill_attempts`. Stratégie fail-loud : si FSRS échoue, l'INSERT skill_attempts n'a pas lieu — évite la désynchro durable.

### Migrations

- `20260610100000_refonte_skill_attempts_per_template.sql` — refonte skill_attempts, trigger, VIEW.
- `20260610100100_srs_deck_sections.sql` — nouvelle table + colonnes is_auto_managed/section_id + RLS.
- `20260610150000_followup_p0_uniques_and_checks.sql` — UNIQUE index Programme + CHECK grade en famille B (audit code-reviewer P0 #3 + #4).
- `20260610200000_seed_programme_decks.sql` — seed rétroactif des Programme decks pour élèves existants (cold start FSRS — décision 8).
- `20260610220000_app_config_table.sql` — table générique `app_config` (clé/valeur) + helper `app_is_anti_fraud_enabled()`. Premier usage : feature flag `anti_fraud_enabled='false'`.
- `20260610220100_srs_anti_fraud_flags.sql` — table `srs_anti_fraud_flags` (élève × capacité × type signal), RLS prof-via-class_members, dédoublonnage côté app.

### Anti-fraud SRS (livré 2026-06-10)

Table `srs_anti_fraud_flags` — drapeaux de suspicion générés par le runner TS `runAntiFraudJob` :

| Colonne                     | Type               | Notes                             |
| --------------------------- | ------------------ | --------------------------------- |
| `id`                        | UUID PK            | gen_random_uuid                   |
| `student_id`                | UUID FK            | → profiles                        |
| `capacity_skill_id`         | UUID FK NULL       | → skills (famille A)              |
| `flag_type`                 | TEXT CHECK         | 6 valeurs (5 signaux + composite) |
| `severity`                  | SMALLINT CHECK 1-5 | drive le badge UI                 |
| `score`                     | REAL CHECK 0..1    | tri DESC dans liste prof          |
| `window_start/end`          | TIMESTAMPTZ        | fenêtre 7 j glissante             |
| `sample_size`               | INTEGER            | nombre de reviews analysées       |
| `details`                   | JSONB              | breakdown du signal               |
| `resolved`                  | BOOLEAN            | soft delete par prof              |
| `resolved_by / resolved_at` | UUID + TIMESTAMPTZ | cohérence garantie par CHECK      |

Voir [`docs/ref/srs/anti-fraud.md`](../ref/srs/anti-fraud.md) pour la liste des signaux, le score composite, et la procédure d'activation.

Table `app_config` — feature flags globaux :

| Colonne                   | Type               | Notes                        |
| ------------------------- | ------------------ | ---------------------------- |
| `key`                     | TEXT PK            | feature flag name            |
| `value`                   | TEXT               | string brut, casté côté code |
| `description`             | TEXT               | doc                          |
| `updated_at / updated_by` | TIMESTAMPTZ + UUID | audit                        |

RLS : SELECT tout authenticated, écriture admin uniquement.

### Audits

- `docs/wip/srs-fsrs-security-audit-findings.md` — audit sécurité security-auditor (5 findings, 3 P2 traités, 2 P1 documentés pour V2 dont la spec anti-fraud).
- Perf : 3 findings traités (cf. commit `9389de4bc`), 2 reportés V2 (refonte PL/pgSQL update_student_skill_state_a + RPC ensureProgrammeDeck).
