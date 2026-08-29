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

## Mono-teacher RLS model

A single `teacher` (+ a single `admin`); see the mono-teacher refactor
(`20260618093000_*`, `20260620090000_*`). The class-scoped authorization helpers
all **delegate to `is_teacher_or_admin()`**, so they are **admin-inclusive**:

| Helper                         | Body (prod)                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `is_teacher_or_admin()`        | `EXISTS (… profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))`                                |
| `is_class_teacher(p_class_id)` | `RETURN is_teacher_or_admin()` — the `p_class_id` arg is ignored (every class belongs to the sole teacher) |
| `is_my_student(p_student_id)`  | delegates to `is_teacher_or_admin()` plus an enrolment (`class_members`) check                             |

Two consequences worth knowing (security-audit notes):

- **`student_warnings` insert/delete are admin-inclusive.** The policies
  `teachers_insert_own_class_warnings` / `teachers_delete_own_warnings` are
  `is_class_teacher(class_id) AND created_by = auth.uid()`; since
  `is_class_teacher` → `is_teacher_or_admin()`, an admin (not just the teacher)
  may create/delete the warnings they authored.
- **Student-scoped `SECURITY DEFINER` RPCs check class membership without a
  `status = 'active'` filter.** e.g. `draw_multiple_vip_cards` authorizes via
  `EXISTS (… class_members WHERE student_id = p_student_id)`. In mono-teacher this
  only widens the sole teacher's reach (any enrolled student, regardless of
  membership status).

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

## Référentiel — contenus et compétences (fusion 2026-08-29)

Deux référentiels coexistaient : `curriculum_themes/objectives/points` pour le
suivi du programme et `skill_themes/skill_objectives/skills` (famille A) pour
l'acquisition, sans clé étrangère entre les deux. La fusion les réduit à **un
seul arbre par niveau** ; la famille B (compétences mathématiques) reste à côté,
transversale.

Migrations : `20260829100000_refonte_referentiel_fusion.sql` ·
`20260830080000_regime_acquisition_et_listes_automatismes.sql` ·
`20260830085000_curriculum_point_code.sql` ·
`20260831090000_curriculum_point_code_auto.sql` ·
`20260831093000_curriculum_point_delete_guard.sql`.

Spec : `docs/wip/refonte-referentiel-progress.md` (décisions 1-14). Historique
famille A : `docs/wip/skills-referentiel-design.md` (décisions 57-72), dont la
décision 57 (« exactement 4 capacités par objectif ») est la cause racine du
dédoublement — c'est elle que `rang` nullable dissout.

### Deux référentiels, deux usages

|            | Arbre de contenus                                                   | Compétences mathématiques                                            |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Hiérarchie | `curriculum_themes` → `curriculum_objectives` → `curriculum_points` | `math_competences` → `math_competence_subdimensions` → `observables` |
| Portée     | par niveau (`grade`)                                                | transversale, non découpée par niveau                                |
| Sert à     | couverture du programme **et** acquisition de l'élève               | évaluation par compétences (`+`/`−`, règle conjonctive)              |
| Saisie     | `skill_attempts.template_id` (réussite auto)                        | `skill_attempts.observable_id` (jugement du prof)                    |
| Cache      | `student_point_state`                                               | `student_observable_state` → `student_competence_level`              |
| Volume     | 6ᵉ : 6/20/95 · 1ʳᵉ spé : 6/14/153                                   | 6 compétences / 22 sous-dim / 56 observables                         |

### Arbre de contenus (lecture publique authentifiée, écriture prof/admin)

#### `curriculum_themes`

| Column                      | Type          | Notes                                                                                                         |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`                        | `UUID` PK     | Default `gen_random_uuid()`.                                                                                  |
| `grade`                     | `TEXT`        | NOT NULL. CHECK sur la liste fermée (`'CP'`…`'6'`…`'1_SPE'`, `'T_SPE'`, …).                                   |
| `name`                      | `TEXT`        | NOT NULL, non blanc. UNIQUE par `grade`.                                                                      |
| `display_order`             | `INTEGER`     | NOT NULL DEFAULT `0`.                                                                                         |
| `code`                      | `TEXT`        | NULLable. **Jamais renseigné** (0/12 en base) — lu par `class-knowledge.ts`, qui reçoit donc toujours `null`. |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Default `NOW()`.                                                                                              |

#### `curriculum_objectives`

| Column                      | Type          | Notes                                        |
| --------------------------- | ------------- | -------------------------------------------- |
| `id`                        | `UUID` PK     | Default `gen_random_uuid()`.                 |
| `theme_id`                  | `UUID` FK     | → `curriculum_themes(id)` ON DELETE CASCADE. |
| `name`                      | `TEXT`        | NOT NULL, non blanc. UNIQUE par `theme_id`.  |
| `description`               | `TEXT`        | NULLable.                                    |
| `display_order`             | `INTEGER`     | NOT NULL DEFAULT `0`.                        |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Default `NOW()`.                             |

#### `curriculum_points` — le grain unique

Couverture du programme, tagging de ressources et acquisition élève s'accrochent
tous ici (il absorbe les 72 capacités famille A).

| Column                      | Type          | Notes                                                                                                                                                                                                                                                       |
| --------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                        | `UUID` PK     | Default `gen_random_uuid()`.                                                                                                                                                                                                                                |
| `objective_id`              | `UUID` FK     | NOT NULL → `curriculum_objectives(id)` ON DELETE CASCADE. Le changer **déplace** le point (code et historique suivent).                                                                                                                                     |
| `code`                      | `TEXT`        | **NOT NULL, UNIQUE**, attribué par trigger. `<PRÉFIXE>-<NNN>` où préfixe = grade sans underscore (`1SPE-047`, `6-012`). Seul identifiant lisible **et** stable d'un environnement à l'autre.                                                                |
| `name`                      | `TEXT`        | NOT NULL, non blanc. UNIQUE par `objective_id`.                                                                                                                                                                                                             |
| `kind`                      | `TEXT`        | NOT NULL. `'connaissance'` \| `'savoir_faire'` \| `'demonstration'` — les trois rubriques du BO lycée.                                                                                                                                                      |
| `exigence`                  | `TEXT`        | NOT NULL DEFAULT `'attendu'`. `'attendu'` \| `'approfondissement'`.                                                                                                                                                                                         |
| `regime_acquisition`        | `TEXT`        | NOT NULL DEFAULT `'diversite'`. `'fluence'` \| `'diversite'` — **ce qui prouve la maîtrise**, pas la provenance du point.                                                                                                                                   |
| `rang`                      | `SMALLINT`    | NULLable, 1-4. UNIQUE partiel `(objective_id, rang) WHERE rang IS NOT NULL`. NULL → l'objectif s'affiche en liste ; 1-4 → échelle descriptive style référentiel 2016. **C'est le geste central de la fusion** : l'échelle reste possible sans être imposée. |
| `display_order`             | `INTEGER`     | NOT NULL DEFAULT `0`.                                                                                                                                                                                                                                       |
| `archived_at`               | `TIMESTAMPTZ` | NULLable. Le point sort des vues, du tagging et de la couverture ; son historique reste.                                                                                                                                                                    |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Default `NOW()`.                                                                                                                                                                                                                                            |

**Régimes d'acquisition** (seuils inchangés depuis le design doc §6.1) :

- `fluence` — ≥ 5 réussites **et** ≥ 3 sur les 5 dernières. Le geste doit être
  rapide, fiable, et le **rester**.
- `diversite` — ≥ 2 templates distincts réussis **et** aucun échec sur les 3
  dernières. La maîtrise se prouve sur des cas **variés**.

#### `curriculum_point_automatismes`

| Column       | Type          | Notes                                                             |
| ------------ | ------------- | ----------------------------------------------------------------- |
| `point_id`   | `UUID` FK     | PK composite. → `curriculum_points(id)` ON DELETE CASCADE.        |
| `grade`      | `TEXT`        | PK composite. NOT NULL, même CHECK que `curriculum_themes.grade`. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`.                                                  |

« Automatisme » n'est **pas** une propriété du point : c'est une liste publiée
par un programme. Un point de seconde peut figurer dans la liste de 1ʳᵉ _et_
celle de terminale — un booléen ne saurait ni l'exprimer, ni dire pour quel
examen. Croise `regime_acquisition` sans s'y confondre : un point hors liste BO
peut parfaitement se mesurer en fluence.

### Compétences mathématiques (famille B)

Inchangée par la fusion, hors renommage `skills` → **`observables`** (la table
n'héberge plus que la famille B, la colonne GENERATED `family` a disparu).

#### `math_competences`

| Column                      | Type          | Notes                                                                     |
| --------------------------- | ------------- | ------------------------------------------------------------------------- |
| `id`                        | `UUID` PK     | Default `gen_random_uuid()`.                                              |
| `code`                      | `TEXT`        | NOT NULL UNIQUE. Snake-case sans accents : `'chercher'`, `'modeliser'`, … |
| `name`                      | `TEXT`        | NOT NULL. Libellé affiché (`Chercher`, `Modéliser`, …).                   |
| `description`               | `TEXT`        | NULLable. Vocabulaire BO/IGÉSR.                                           |
| `gloss_for_student`         | `TEXT`        | NOT NULL. Glose visible élève (« essayer des pistes »).                   |
| `display_order`             | `INTEGER`     | NOT NULL.                                                                 |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Default `NOW()`.                                                          |

#### `math_competence_subdimensions`

| Column                      | Type          | Notes                                                               |
| --------------------------- | ------------- | ------------------------------------------------------------------- |
| `id`                        | `UUID` PK     | Default `gen_random_uuid()`.                                        |
| `math_competence_id`        | `UUID` FK     | → `math_competences(id)` ON DELETE CASCADE.                         |
| `letter`                    | `CHAR(1)`     | NOT NULL CHECK in (`'A'`,`'B'`,`'C'`,`'D'`). UNIQUE par compétence. |
| `name`                      | `TEXT`        | NOT NULL. Ex. « S'approprier le problème ».                         |
| `description`               | `TEXT`        | NULLable.                                                           |
| `display_order`             | `INTEGER`     | NOT NULL.                                                           |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Default `NOW()`.                                                    |

Pas d'état propre (décision 50) — regroupement structurel des observables.

#### `observables`

| Column                      | Type          | Notes                                                             |
| --------------------------- | ------------- | ----------------------------------------------------------------- |
| `id`                        | `UUID` PK     | Default `gen_random_uuid()`.                                      |
| `subdimension_id`           | `UUID` FK     | NOT NULL → `math_competence_subdimensions(id)`.                   |
| `observable_code`           | `TEXT`        | NOT NULL. Code court `'A1'`, `'B3'`, … UNIQUE par sous-dimension. |
| `name`                      | `TEXT`        | NOT NULL. Énoncé élève à la 1ʳᵉ personne.                         |
| `teacher_grid_text`         | `TEXT`        | NULLable. Grille enseignant (reformulation opérationnelle).       |
| `display_order`             | `INTEGER`     | NOT NULL.                                                         |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Default `NOW()`.                                                  |

### Jonctions de tagging

Une jonction par type de ressource (décision 5 — pas de polymorphisme manuel).
Toutes en PK composite.

| Table                           | Colonnes                   | ON DELETE                 | Rôle                                                                                              |
| ------------------------------- | -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| `question_template_points`      | `(template_id, point_id)`  | **RESTRICT** sur le point | Tagging au niveau template (décision 59) ; toutes les instances héritent. Pivot de l'acquisition. |
| `exercise_curriculum_points`    | `(exercise_id, point_id)`  | CASCADE                   | Exercices système tagués ; alimente la couverture automatique.                                    |
| `journal_entry_points`          | `(entry_id, point_id)`     | CASCADE                   | Couverture du cahier de texte (manuelle ou réconciliée depuis les exercices).                     |
| `curriculum_point_automatismes` | `(point_id, grade)`        | CASCADE                   | Cf. ci-dessus.                                                                                    |
| `evaluation_task_perimeter`     | `(task_id, observable_id)` | CASCADE / RESTRICT        | Périmètre d'une tâche d'évaluation famille B.                                                     |

Fiche, chapitre et évaluation ne sont **pas** tagués : leur couverture est
l'union **calculée** de celle de leurs exercices (décision 4).

### Tâches d'évaluation (famille compétence)

#### `evaluation_tasks`

| Column                                           | Type          | Notes                                                                                                      |
| ------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------- |
| `id`                                             | `UUID` PK     | Default `gen_random_uuid()`.                                                                               |
| `teacher_id`                                     | `UUID` FK     | → `profiles(id)` ON DELETE CASCADE.                                                                        |
| `class_id`                                       | `UUID` FK     | NULLable → `classes(id)` ON DELETE SET NULL.                                                               |
| `niveau_scolaire`                                | `TEXT`        | NOT NULL.                                                                                                  |
| `name` / `description`                           | `TEXT`        | `name` NOT NULL.                                                                                           |
| `assessment_id` / `exercise_id` / `worksheet_id` | `UUID` FK     | NULLables, ON DELETE SET NULL. CHECK `chk_evaluation_task_source` : **au plus un** non-null (décision 71). |
| `task_date`                                      | `DATE`        | NULLable.                                                                                                  |
| `created_at` / `updated_at`                      | `TIMESTAMPTZ` | Default `NOW()`.                                                                                           |

#### `evaluation_task_perimeter`

PK composite `(task_id, observable_id)`. Le trigger de garde
`check_perimeter_skill_is_competence()` a **disparu avec la fusion** : la
colonne pointe désormais `observables`, qui n'héberge que la famille B — la clé
étrangère suffit.

### Saisies — `skill_attempts`

| Column          | Type          | Notes                                                                                                                    |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`            | `UUID` PK     | Default `gen_random_uuid()`.                                                                                             |
| `student_id`    | `UUID` FK     | → `profiles(id)` ON DELETE CASCADE.                                                                                      |
| `template_id`   | `UUID` FK     | NULLable → `question_templates(id)`. **Pivot du régime contenus** : le point se retrouve via `question_template_points`. |
| `observable_id` | `UUID` FK     | NULLable → `observables(id)`. Régime compétences uniquement.                                                             |
| `success`       | `BOOLEAN`     | NULLable. Régime contenus uniquement.                                                                                    |
| `grade`         | `SMALLINT`    | NULLable, 1-4 (FSRS : Again/Hard/Good/Easy). Régime contenus.                                                            |
| `code`          | `TEXT`        | NULLable. Régime compétences : `'plus'` \| `'minus'`.                                                                    |
| `task_id`       | `UUID` FK     | NULLable → `evaluation_tasks(id)` ON DELETE CASCADE. Régime compétences.                                                 |
| `source`        | `TEXT`        | NOT NULL. `'auto'` \| `'srs'` \| `'teacher'` \| `'student_self'`.                                                        |
| `source_ref`    | `UUID`        | NULLable. Origine libre (session, assignment, …).                                                                        |
| `with_help`     | `BOOLEAN`     | NOT NULL DEFAULT `FALSE`. Décision 58 — ignoré dans la règle d'acquisition.                                              |
| `phase_blocage` | `TEXT`        | NULLable. BO cycle 3 : `'comprendre'` \| `'modeliser'` \| `'calculer'` \| `'repondre'` \| `'regulation'`.                |
| `created_at`    | `TIMESTAMPTZ` | Default `NOW()`.                                                                                                         |

XOR strict entre les deux régimes (CHECK `chk_attempt_family_regime`) :

- contenus : `template_id NOT NULL AND success NOT NULL AND observable_id NULL AND code NULL AND task_id NULL`
- compétences : `observable_id NOT NULL AND code NOT NULL AND task_id NOT NULL AND template_id NULL AND success NULL AND grade NULL`

**Mapping (success ↔ grade) côté application** — quiz interactif :
`success=true → grade=3`, `success=false → grade=1` ; review SRS : grade transmis
brut, `success = (grade >= 2)`.

**Immutable** : aucune policy UPDATE/DELETE hors admin (décision 72).

### Caches (recalculés par `trg_skill_attempts_after_insert`)

#### `student_point_state` (remplace `student_skill_state_a`)

| Column                                | Type          | Notes                                                                |
| ------------------------------------- | ------------- | -------------------------------------------------------------------- |
| `student_id`                          | `UUID`        | PK composite. FK → `profiles(id)`.                                   |
| `point_id`                            | `UUID`        | PK composite. FK → `curriculum_points(id)` ON DELETE CASCADE.        |
| `is_acquired`                         | `BOOLEAN`     | NOT NULL DEFAULT `FALSE`.                                            |
| `total_successes`                     | `INTEGER`     | NOT NULL DEFAULT `0`. Seuil du régime `fluence`.                     |
| `distinct_template_successes`         | `INTEGER`     | NOT NULL DEFAULT `0`. Seuil du régime `diversite`.                   |
| `last_success_at` / `last_attempt_at` | `TIMESTAMPTZ` | NULLables.                                                           |
| `needs_remediation`                   | `BOOLEAN`     | NOT NULL DEFAULT `FALSE`. 🆘 : ≥ 2 échecs récents (décisions 63-64). |
| `updated_at`                          | `TIMESTAMPTZ` | Default `NOW()`.                                                     |

Pas de colonne `to_review` (décision 70) — le badge est calculé à la lecture
depuis `srs_card_stats`, cf. `src/lib/server/srs/capacity-badge.ts`.
VIEW plate `student_point_state_v` (`security_invoker = on`).

#### `student_observable_state`

| Column                       | Type          | Notes                                                                                      |
| ---------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| `student_id`                 | `UUID`        | PK composite. FK → `profiles(id)`.                                                         |
| `observable_id`              | `UUID`        | PK composite. FK → `observables(id)`.                                                      |
| `count_plus` / `count_minus` | `INTEGER`     | NOT NULL DEFAULT `0`.                                                                      |
| `is_acquis`                  | `BOOLEAN`     | NOT NULL DEFAULT `FALSE`. `(count_plus ≥ 2) AND (count_plus > count_minus)` (décision 47). |
| `last_attempt_at`            | `TIMESTAMPTZ` | NULLable.                                                                                  |
| `updated_at`                 | `TIMESTAMPTZ` | Default `NOW()`.                                                                           |

#### `student_competence_level`

| Column                  | Type          | Notes                                                                                |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `student_id`            | `UUID`        | PK composite. FK → `profiles(id)`.                                                   |
| `math_competence_id`    | `UUID`        | PK composite. FK → `math_competences(id)`.                                           |
| `niveau`                | `TEXT`        | NOT NULL CHECK in (`'insuffisante'`,`'fragile'`,`'satisfaisante'`,`'tres_bonne'`).   |
| `validated_observables` | `JSONB`       | Codes observables acquis qui valident le niveau actuel.                              |
| `missing_for_next`      | `JSONB`       | Objets typés `{kind, code/letter/codes/name}` — exigences pour monter (décision 70). |
| `task_count`            | `INTEGER`     | NULLable. Tâches distinctes observées (garde-fou §6.4).                              |
| `last_recalc_at`        | `TIMESTAMPTZ` | NULLable.                                                                            |

### Fonctions PL/pgSQL

| Fonction                                      | Type           | Rôle                                                                                                                                                                                   |
| --------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next_curriculum_point_code(grade)`           | `VOLATILE` def | Prochain code libre du niveau. `pg_advisory_xact_lock` sur le préfixe pour sérialiser les attributions concurrentes.                                                                   |
| `assign_curriculum_point_code()`              | `trigger`      | BEFORE INSERT : remplit `code` s'il est vide, depuis le grade de l'objectif.                                                                                                           |
| `curriculum_point_reference_counts(point_id)` | `STABLE` def   | `{}` si le point est libre, sinon les compteurs non nuls par nature (questions, exercices, séances, élèves, listes, flags SRS).                                                        |
| `curriculum_referenced_points(grade)`         | `STABLE` def   | Les points d'un niveau qu'on ne peut plus supprimer sans perte — une requête pour tout l'arbre.                                                                                        |
| `update_student_point_state(student, point)`  | `VOLATILE` def | Recalcule le cache selon `regime_acquisition`. Retrouve les tentatives via `question_template_points` (pas de FK directe attempt → point). Supprime la ligne si plus aucune tentative. |
| `update_student_observable_state`             | `VOLATILE` def | Recalcule le cache observable, puis cascade vers le niveau de compétence.                                                                                                              |
| `update_student_competence_level`             | `VOLATILE` def | UPSERT du cache compétence avec les garde-fous §6.4.                                                                                                                                   |
| `compute_<code>_level` × 6                    | `STABLE` def   | Règle conjonctive par compétence (chercher, calculer, raisonner, communiquer, modeliser, representer).                                                                                 |
| `compute_competence_level`                    | `STABLE` def   | Dispatcher sur `math_competences.code`.                                                                                                                                                |
| `skill_attempts_after_insert`                 | `trigger`      | Régime contenus : boucle sur `question_template_points`. Régime compétences : cascade observable.                                                                                      |

Toutes `SECURITY DEFINER` avec `SET search_path = public, pg_temp` (décision 72),
sauf `assign_curriculum_point_code()` qui tourne en INVOKER — elle délègue le
comptage à `next_curriculum_point_code()`, DEFINER, pour que le maximum soit
calculé sur toute la table même si une RLS masquait des lignes à l'appelant.

### Triggers

| Trigger                           | Table               | Quand                      | Action                           |
| --------------------------------- | ------------------- | -------------------------- | -------------------------------- |
| `curriculum_points_assign_code`   | `curriculum_points` | BEFORE INSERT FOR EACH ROW | `assign_curriculum_point_code()` |
| `trg_skill_attempts_after_insert` | `skill_attempts`    | AFTER INSERT FOR EACH ROW  | `skill_attempts_after_insert()`  |

### Suppression d'un point — garde applicative

Cinq des six clés étrangères vers `curriculum_points` sont en `CASCADE`
(`exercise_curriculum_points`, `journal_entry_points`, `student_point_state`,
`curriculum_point_automatismes`, `srs_anti_fraud_flags`) ; seule
`question_template_points` est en `RESTRICT`. Une suppression effacerait donc
sans un mot la couverture du cahier de texte et l'acquisition des élèves.

`DELETE /api/teacher/curriculum/points/[pointId]` refuse en **409** dès qu'une
référence existe, en nommant laquelle. L'archivage (`archived_at`) est le geste
normal. Le comptage passe par la fonction DEFINER : compter sous les RLS de
l'appelant renverrait zéro là où un élève a de l'historique invisible du prof.

### Row Level Security

| Table / VIEW                 | SELECT                                           | INSERT                                                                                                     | UPDATE/DELETE                          |
| ---------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Arbre de contenus (3 tables) | Authentifiés (l'élève doit voir ses objectifs)   | `is_teacher_or_admin()`                                                                                    | `is_teacher_or_admin()`                |
| Famille B (3 tables)         | Authentifiés (Q3 = partagé global)               | Admin / service role                                                                                       | Admin                                  |
| Jonctions de tagging         | Idem référentiel                                 | Prof/admin                                                                                                 | Prof/admin                             |
| `skill_attempts`             | Élève propre (`student_id = auth.uid()`) OU prof | Élève propre + `code IS NULL AND task_id IS NULL` ; prof + `is_teacher_or_admin()` + ownership de la tâche | **Aucune** (immutable, admin override) |
| Caches `student_*`           | Idem `skill_attempts`                            | **Trigger uniquement**                                                                                     | Trigger uniquement                     |
| `evaluation_tasks`           | Prof créateur OU élèves de la classe ciblée      | Prof : `teacher_id = auth.uid() AND is_teacher_or_admin()`                                                 | Prof créateur                          |
| `evaluation_task_perimeter`  | Hérite via JOIN                                  | Prof créateur de la tâche                                                                                  | Prof créateur                          |

Les admins ont une policy `FOR ALL` qui surclasse. Le filtre `classes.is_active`
n'est **pas** appliqué (décision David 2026-06-09 : le prof garde l'accès
historique aux ex-élèves après archivage).

### Amorçage des niveaux

Les seeds (`20260621160000_seed_curriculum_6e.sql`,
`20260830090000_seed_curriculum_1re_spe.sql`) sont générés depuis les markdown
de `docs/wip/referentiel/` et **amorcent un niveau vide, une fois** : tout leur
corps est dans un `DO` gardé par `IF EXISTS (… WHERE grade = …) THEN RETURN`.

Passé l'amorçage, la page `/dashboard/teacher/programme` fait foi. Corriger le
markdown d'un niveau déjà en base ne produit plus rien — c'était l'inverse
jusqu'au 2026-08-31, et le rejeu défaisait le travail fait dans l'app.

### TypeScript types

Aliases dérivés dans `src/lib/types/database-helpers.ts` ; types métier (unions,
helpers UI) dans `src/lib/types/skills.ts`.

- Attempts : **toujours** le type discriminé `SkillAttempt`, pas
  `Tables<'skill_attempts'>` — il porte le XOR des deux régimes au niveau du type.
- `missing_for_next` : **toujours** casté en `MissingForNext` (objets discriminés
  par `kind`).
- Insertion d'un point : `pointInsert()` de `src/lib/server/curriculum.ts`.
  `code` est NOT NULL sans défaut, ce que Postgres ne distingue pas de « fourni
  par l'appelant » — le type généré l'exige donc, alors que c'est le trigger qui
  le remplit. Le cast vit là et nulle part ailleurs.

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

- `student_point_state` (arbre de contenus — règles §6.1, `regime_acquisition`) — recalculé par trigger PG sur INSERT `skill_attempts`.
- `srs_card_stats` (FSRS-6 — état D/S/R par template) — UPSERT côté API en TypeScript (avant l'INSERT `skill_attempts`). FSRS n'est pas porté en PL/pgSQL.

Le deck Programme est auto-géré : la fonction TypeScript `ensureProgrammeDeckCard` ajoute idempotemment une carte au Programme pour chaque template **tagué à un point de programme** (`question_template_points`) rencontré par l'élève.

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
- Perf : 3 findings traités (cf. commit `9389de4bc`), 2 reportés V2 (refonte PL/pgSQL `update_student_skill_state_a`, devenue `update_student_point_state` à la fusion 2026-08-29 + RPC ensureProgrammeDeck).

---

## Re-vérification serveur des soumissions Python (Phase 1b, 2026-08-27)

> ⚠️ **FEATURE NON DÉPLOYÉE — NO-GO (2026-08-27).** La migration a été poussée en prod, donc la table
> `python_submission_server_verdicts` et le balai `run_flag_stale_python_rechecks` **existent en prod
> mais sont INERTES** : rien n'écrit dedans, le balai n'est pas planifié, et le code de re-check
> (`recheck.ts`, câblage du submit) **n'est PAS sur `main`** (il vit sur la branche draft #83). Conservés
> tels quels (coût ~nul, réactivables). ROI jugé insuffisant vs le coût de productionisation Vercel —
> voir `docs/wip/python-server-recheck-progress.md`. Le reste de cette section décrit le schéma **tel
> qu'il est en prod**, pour référence.

Migration `20260827120000_python_submission_server_verification.sql`. Contexte
complet : `docs/wip/python-server-recheck-progress.md`. Le verdict Python est
aujourd'hui calculé **côté client** (Pyodide dans le navigateur de l'élève) →
l'élève peut forger `valid: true`. On rejoue côté **serveur de confiance**
(service_role, Pyodide-in-Node) les soumissions `is_correct=true` et on écrit un
**verdict serveur** que seul le prof/admin peut lire. Le mastery n'est **jamais**
modifié.

### Pourquoi une table dédiée (pas de colonnes `server_*`)

La RLS filtre les **lignes**, pas les **colonnes**. Le premier design masquait 4
colonnes `server_*` sur `python_exercise_submissions` via `REVOKE SELECT` +
re-`GRANT` colonne par colonne. **Il casse PostgREST** : un rôle sans SELECT
table-level reçoit `42501 permission denied for table` sur un `select('*')` — or
le endpoint submit fait `.select('*', {count:'exact', head:true})` **en tant
qu'élève à chaque soumission** → toutes les soumissions casseraient. Abandonné.

Design retenu : **table annexe** `python_submission_server_verdicts` (1:1 avec la
soumission). `python_exercise_submissions` reste **intacte** (aucune colonne,
aucun changement de grant). Le masquage à l'élève = **absence de policy SELECT
élève** sur la table annexe (RLS → 0 ligne, pas d'erreur qui fuit). Le prof lit
la table **directement** (plus de RPC `SECURITY DEFINER`).

### Table `python_submission_server_verdicts`

| Colonne                    | Type          | Notes                                                                                       |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `submission_id`            | `UUID` PK/FK  | -> `python_exercise_submissions(id)` ON DELETE CASCADE. 1:1.                                |
| `verification_status`      | `TEXT`        | NOT NULL DEFAULT `'pending'`. CHECK ∈ `pending / match / mismatch / indeterminate / error`. |
| `server_is_correct`        | `BOOLEAN`     | Verdict rejoué serveur. NULL tant que `pending`.                                            |
| `server_validation_result` | `JSONB`       | Verdict complet serveur (même forme que `validation_result`), pour le diff prof.            |
| `verified_at`              | `TIMESTAMPTZ` | Horodatage du verdict terminal. NULL tant que `pending`.                                    |
| `created_at`               | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()`. Base du balai stale-pending.                                      |

Sémantique du statut : `pending` = à rejouer ; `match` = serveur d'accord avec le
client ; `mismatch` = serveur **pas** d'accord (fraude possible → flag prof) ;
`indeterminate` = code non déterministe ou exercice édité après coup (jamais
classé fraude) ; `error` = échec d'exécution serveur. **Pas de `skipped`** : une
soumission hors périmètre (`is_correct=false`) n'a simplement **aucune ligne**.

### RLS

- **SELECT** : `CREATE POLICY "Teachers read python server verdicts" … FOR SELECT
TO authenticated USING (is_teacher_or_admin())`. Mono-prof → voit tout. **Aucune
  policy élève** → l'élève lit 0 ligne (pas d'erreur). C'est ce qui remplace le
  masquage colonne.
- **Écritures** : **aucune** policy INSERT/UPDATE/DELETE pour `authenticated` →
  élève **et** prof sont bloqués (`42501` à l'INSERT, 0 ligne à l'UPDATE). Le
  verdict est calculé serveur et immuable côté humain. Le `service_role` **bypass
  la RLS** et est l'unique writer. `GRANT ALL … TO anon, authenticated,
service_role` (convention `curriculum_*`) ; la RLS reste le vrai garde.

### Chemin de lecture prof (Phase 1c) — SELECT direct sous RLS

Les pages résultats (`/python-exercises/[id]/results` et `.../[student_id]`)
lisent déjà les soumissions par `exercise_id`/`student_id` sous leur propre RLS,
puis récupèrent les verdicts correspondants par `submission_id` :

```ts
// avec le client authenticated du prof (RLS is_teacher_or_admin → autorisé)
const { data } = await supabase
	.from('python_submission_server_verdicts')
	.select(
		'submission_id, verification_status, server_is_correct, server_validation_result, verified_at'
	)
	.in('submission_id', submissionIds); // les ids déjà chargés depuis la page
```

### Flux d'écriture `recheck.ts` (service_role)

1. **Upsert pending** au moment du submit (waitUntil) :
   `INSERT INTO python_submission_server_verdicts (submission_id) VALUES (<id>)`
   (`verification_status` prend le DEFAULT `'pending'`).
2. **Update terminal** après le replay Pyodide-in-Node :
   ```sql
   UPDATE public.python_submission_server_verdicts
      SET verification_status = <'match'|'mismatch'|'indeterminate'|'error'>,
          server_is_correct = <bool>,
          server_validation_result = <jsonb>,
          verified_at = now()
    WHERE submission_id = <id>;
   ```

⚠️ **Suivi hors-scope de cette migration** : le endpoint submit
(`src/routes/api/python-exercises/[id]/submit/+server.ts`) écrit encore
`verification_status` **sur la soumission** (colonne qui n'existe plus dans ce
design) — à migrer vers l'upsert de la table annexe (Phase 1b backend).

### Balai pg_cron (SQL) — `run_flag_stale_python_rechecks()`

Calqué sur `cleanup_stuck_job_runs()` : `start_job_run('flag_stale_python_rechecks', …)`
→ travail → `complete_job_run(…)`, `SECURITY DEFINER`, `OWNER TO postgres`. Il
**compte** (ne modifie rien) les verdicts `verification_status='pending' AND
created_at < now() - interval '1 hour'` et met le compte dans le metadata du job
run (monitoring via `admin_pg_cron_jobs` / `background_job_runs`). Les lignes
restent `pending` et idempotemment rejouables. **Le cron n'est pas planifié dans
la migration** (hors-migration comme les autres jobs) ; cadence visée ~horaire :

```sql
SELECT cron.schedule('flag_stale_python_rechecks', '15 * * * *',
                     'SELECT public.run_flag_stale_python_rechecks();');
```

### Tests

- `tests/integration/python-server-verification.test.ts` : (régression) l'élève
  peut TOUJOURS `select('*')` sur `python_exercise_submissions` (plus jamais 42501) ; (a) l'élève lit 0 ligne sur `python_submission_server_verdicts`,
  prof/admin OUI (SELECT direct RLS) ; (b) l'élève ne peut ni INSERT (42501) ni
  UPDATE (0 ligne) ; (c) `service_role` INSERT pending + UPDATE terminal +
  cascade delete ; (d) CHECK enum rejette `skipped` ; (e) le balai logge un run
  avec le bon compte. Contexte utilisateur réel partout (jamais de smoke-test
  `auth.uid()` NULL).
