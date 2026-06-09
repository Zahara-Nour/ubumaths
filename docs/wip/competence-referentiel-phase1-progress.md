# Phase 1 — Migration SQL Supabase : référentiel de compétences

> **Démarré** : 2026-06-09
> **Statut** : en cours
> **Spec** : `docs/wip/skills-referentiel-design.md` (72 décisions actées, dont 58-72 cette session)
> **Famille A** : `referentiel/6e-savoirs.md` (18 items × 4 capacités = 72 capacités, 6ᵉ uniquement V1)
> **Famille B** : `referentiel/college-competences.md` (6 compétences × 22 sous-dimensions / 56 observables, collège partagé V1)

## Décisions de cadrage (validées 2026-06-09)

| #         | Choix                                                                                     | Justification                                                                       |
| --------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Migration | **3 fichiers séparés** (schema / functions / seeds)                                       | Reviewabilité, isolation des rollbacks, séparation des concerns                     |
| Seeds     | **Script TS + SQL committé** (`scripts/generate-competence-seeds.ts` + migration générée) | Reproductible, moins de typos, regenerable si refonte du ref                        |
| Tests     | **TS via supabase locale** (`pnpm db:start`)                                              | Couverture triggers/fonctions/VIEW/RLS sans pgTAP (cf. `feedback_no-trigger-tests`) |

## Constats codebase (vérifiés 2026-06-09)

- `class_members(class_id, student_id)` n'a PAS de colonne `role` → tous les membres sont des étudiants
- Prof responsable d'une classe : `classes.teacher_id = profile_id`
- `profiles.role` enum `user_role` (student/teacher/admin)
- Tables existantes : `assessments` (082), `exercises` (001), `worksheets` (20250123), `question_templates` (070)

## Plan d'exécution

### 1.1 — Schéma DB + RLS + indexes (`supabase/migrations/20260609120000_competence_referentiel_schema.sql`)

Agent : `supabase-expert` (Opus)
Statut : **✅ terminée 2026-06-09**

**Livré** (~860 lignes après ajout des policies admin) :

- 11 tables + 1 VIEW + 38 policies RLS (26 user + 12 admin) + 20 indexes
- Famille knowledge : `skill_themes`, `skill_objectives`, `skills` (avec `family` GENERATED + `knowledge_type` + partial unique index par objectif)
- Famille competence : `math_competences`, `math_competence_subdimensions` + `skills` partagée
- Évaluation : `evaluation_tasks` (3 FK distinctes assessment/exercise/worksheet + CHECK ≤ 1), `evaluation_task_perimeter`
- Saisies : `skill_attempts` (double régime CHECK XOR famille, immutable hors admin)
- Junction : `question_template_skills (template_id, skill_id)` PK composite
- Caches : `student_skill_state_a` (sans `to_review` ni `needs_reinforcement`), `student_observable_state`, `student_competence_level`
- VIEW : `student_skill_state_a_v` (avec `to_review = is_acquired AND last_success_at < NOW() - INTERVAL '30 days'`)
- RLS Q3 = lecture publique authentifiée du référentiel ; scope élève via `auth.uid()` ; scope prof via `classes.teacher_id` JOIN `class_members.student_id` ; périmètre tâche visible élèves de la classe ; admin override via `is_admin()`

**Arbitrages tranchés en cours de réalisation** :

- Élève voit le périmètre `evaluation_task_perimeter` : **OUI** (transparence, cohérent cadre formatif)
- Policies admin sur toutes les tables via `is_admin()` (déjà défini dans codebase) : **OUI**

**Écarts assumés par rapport au §7 du design doc** :

- `UNIQUE NULLS NOT DISTINCT (objective_id, display_order)` → remplacé par **partial unique index** `WHERE objective_id IS NOT NULL` (juste : `display_order` famille B ne doit pas être contraint par objectif null)
- `observable_code` unicité non spécifiée → **partial unique index** `(subdimension_id, observable_code) WHERE subdimension_id IS NOT NULL`
- `skill_attempts.task_id ON DELETE CASCADE` (cohérent : tâche supprimée → attempts supprimés)
- `evaluation_tasks.class_id ON DELETE SET NULL` (tâche survit, rattachable au prof)

### 1.2 — Fonctions PL/pgSQL + triggers (`supabase/migrations/20260609120001_competence_referentiel_functions.sql`)

Agent : `supabase-expert` (Opus)
Statut : **✅ terminée 2026-06-09**

**Livré** (1193 lignes) :

- 6 fonctions `compute_<competence>_level()` — règles conjonctives strictement alignées sur `college-competences.md`
- 1 dispatcher `compute_competence_level(student_id, math_competence_id)`
- 3 update cache : `update_student_skill_state_a`, `update_student_observable_state` (+ cascade), `update_student_competence_level`
- 1 fonction trigger `skill_attempts_after_insert()` qui dispatch sur `success` vs `code`
- 1 trigger `trg_skill_attempts_after_insert` (AFTER INSERT FOR EACH ROW)
- Toutes les fonctions `SECURITY DEFINER` avec `SET search_path = public, pg_temp`
- GRANT EXECUTE sur les 10 fonctions à `authenticated`

**Garde-fous §6.4 implémentés** :

- `task_count < 2` → force `niveau = 'insuffisante'`, `missing_for_next = ["needs_more_tasks"]`
- `task_count < 3` → cap `'tres_bonne'` à `'satisfaisante'`, `missing_for_next = ["confirm_with_third_task"]`

**Format `missing_for_next`** : utilise des marqueurs synthétiques pour les conditions « N parmi M » :

- `A*`, `B*`, `D*` : « au moins 1 observable de cette sous-dimension »
- `A1|A2|A3` ou `B2-5` : « parmi cette liste »
- `C2|C3` : alternative
- `needs_more_tasks`, `confirm_with_third_task` : garde-fous §6.4

**Signalements pédagogiques** (lecture stricte de `college-competences.md`, à confirmer si on veut assouplir) :

1. Calculer Très bonne exige `≥ 3 de B` (Satisfaisante demandait déjà `≥ 2`) — cohérent et hiérarchisé
2. Calculer Fragile exige `≥ 1 de B` — donc `A1+D1` sans B reste **Insuffisante** (contre-intuitif mais cohérent avec « B = exécution = condition d'amorçage »)
3. Modéliser Satisfaisante exige strictement `A2 ET A3 ET B1` (pas un seuil)
4. Communiquer Très bonne exige strictement `A1 ET A2` (Satisfaisante n'exigeait que `≥ 1 de A`)
5. Représenter Satisfaisante exige `A2 ET B1 ET B2` (A1 non requis spécifiquement)
6. **Raisonner Fragile** : `≥ 1 parmi {A1, B1, D1}` ; `C1` seul sans rien d'autre → Insuffisante. **Restrictif** — vérifier si pédagogiquement souhaité.
7. **Raisonner Très bonne** : `B2 ET D2 ET ≥ 1 de C` ; le cœur est B2 (cas général), pas C2.

Tous ces points reproduisent fidèlement le cadre canonique `college-competences.md`. Si l'un te paraît à ajuster, on peut patcher cette migration ou la suivante.

### 1.3 — Seeds référentiel (`supabase/migrations/20260609120002_competence_referentiel_seeds.sql` + `scripts/generate-competence-seeds.ts`)

Agent : `backend-developer` (Sonnet)
Statut : **✅ terminée 2026-06-09**

**Livré** :

- Script `scripts/generate-competence-seeds.ts` (687 lignes) — parse `6e-savoirs.md` + `college-competences.md` et génère le SQL
- Migration `20260609120002_competence_referentiel_seeds.sql` (1686 lignes) — un bloc `DO $$ ... END $$` avec variables locales pour les FK
- Décomptes vérifiés : **6 thèmes / 18 objectifs / 72 capacités** (knowledge) + **6 compétences / 22 sous-dim / 56 observables** (competence)
- Idempotence à 2 couches : `IF var IS NULL THEN INSERT ... RETURNING id INTO var` (thèmes/objectifs/compétences/sous-dim) ; `INSERT ... WHERE NOT EXISTS` (skills, 128 guards)
- Item #4 (« Calcul mental ») bien sauté, numérotation 1-3 + 5-19 préservée

Ré-exécution si besoin : `pnpm tsx scripts/generate-competence-seeds.ts > supabase/migrations/20260609120002_competence_referentiel_seeds.sql`

### 1.4 — Types TypeScript (`src/lib/types/skills.ts`)

Agent : moi
Statut : **✅ terminée 2026-06-09**

**Livré** : `src/lib/types/skills.ts` (~210 lignes)

Types métier exportés (indépendants de `database.ts`) :

- `Family` (`'knowledge' | 'competence'`)
- `KnowledgeType` (`'automatisme' | 'capacite_attendue'`)
- `MathCompetenceCode` (6 valeurs)
- `MathCompetenceLevel` (`'insuffisante' | 'fragile' | 'satisfaisante' | 'tres_bonne'`)
- `SubdimensionLetter` (`'A' | 'B' | 'C' | 'D'`)
- `SkillSource` (`'auto' | 'teacher' | 'student_self'`)
- `SkillAttemptCode` (`'plus' | 'minus'`)
- `PhaseBlocage` (5 valeurs BO 2026)
- `ObjectiveLevel` (0..4)

Helpers : `getSkillFamily`, `isKnowledgeSkill`, `isCompetenceSkill`, `formatMathCompetenceLevel`, `getMathCompetenceLevelVisual`, `formatKnowledgeType`, `formatMathCompetenceCode`, `formatObjectiveLevel`, `getObjectiveLevelVisual`

**À FAIRE PAR DAVID** : lancer `pnpm db:migrate` puis `pnpm db:types` pour régénérer `src/lib/types/database.ts`. Puis ajouter (ou je le ferai) les aliases dans `database-helpers.ts` :

- `Skill = Tables<'skills'>`
- `SkillTheme = Tables<'skill_themes'>`
- `SkillObjective = Tables<'skill_objectives'>`
- `MathCompetence = Tables<'math_competences'>`
- `MathCompetenceSubdimension = Tables<'math_competence_subdimensions'>`
- `EvaluationTask = Tables<'evaluation_tasks'>`
- `EvaluationTaskPerimeter = Tables<'evaluation_task_perimeter'>`
- `SkillAttempt = Tables<'skill_attempts'>`
- `QuestionTemplateSkill = Tables<'question_template_skills'>`
- `StudentSkillStateA = Tables<'student_skill_state_a'>`
- `StudentObservableState = Tables<'student_observable_state'>`
- `StudentCompetenceLevel = Tables<'student_competence_level'>`

### 1.5 — Tests d'intégration (`tests/integration/competence-referentiel.test.ts`)

Agent : `test-automator` (Sonnet)
Statut : **✅ terminée 2026-06-09**

**Livré** :

- `tests/integration/competence-referentiel.test.ts` (1283 lignes)
- `tests/helpers/competence-referentiel.helpers.ts` (440 lignes)
- 13 `describe` / 38 `it`

Couverture :

- Trigger famille knowledge : 5 tests (success simple, ≥2 templates capacite_attendue, ≥5 succès automatisme, needs_remediation ≥2 échecs, seuil 2 échecs strict)
- Trigger famille competence : 4 tests (insert plus, consolidation 2+/1-, dominance 2+/3-, cascade vers competence_level)
- VIEW `to_review` : 3 tests (acquis > 30j, acquis récent, non acquis > 30j)
- 6 règles conjonctives : 12 tests (Très bonne + Insuffisante pour chaque compétence)
- Garde-fous §6.4 : 1 test (task_count < 3 → cap à satisfaisante)
- RLS scope élève : 4 tests
- RLS scope prof : 4 tests
- RLS référentiel : 5 tests (incluant anon)

**À FAIRE PAR DAVID** : lancer `pnpm db:start` + appliquer migrations puis `pnpm test:integration tests/integration/competence-referentiel.test.ts`

### 1.6 — Code review + security audit

Agents : `code-reviewer` + `security-auditor` (Opus, en parallèle)
Statut : **🟡 en cours — patches en application 2026-06-09**

**Rapports rendus** :

- code-reviewer : verdict « à patcher avant commit, pas à retravailler en profondeur ». Bugs principaux : B7 (assertion test laxiste), B9 + B10 (cleanup tests pollue les autres suites)
- security-auditor : **2 vulnérabilités critiques détectées** :
  - **C1** : VIEW `student_skill_state_a_v` sans `security_invoker=on` → n'importe quel élève peut lire le cache de tous les autres
  - **C2** : élève peut s'auto-déclarer `teacher_id` sur evaluation_tasks + insérer attempts famille B → gonfler artificiellement son verdict de compétences math
  - - risques modérés M1 (task_id ownership), M2 (trigger validate perimeter skill_id famille competence), M3 (test anon)

**Arbitrages tranchés par David** :

- Classes archivées : OUI, historique consultable pour le prof (pas de fix RLS, juste un commentaire SQL explicatif)
- Format `missing_for_next` : refactor vers objets typés `{kind, code/letter/codes/name}` (long terme mais maintenant pour V1)

**Patches en cours** (2 agents en parallèle) :

- `supabase-expert` : C1 + C2 + M1 + M2 + commentaire classes archivées + refactor missing_for_next dans les 6 fonctions
- `test-automator` : B7 + B9 + B10 + M3 + ajout 9 tests RLS manquants (D1 caches/VIEW, D2 caches prof, D3 immutabilité)

### 1.3 — Seeds référentiel (`supabase/migrations/<ts>_competence_referentiel_seeds.sql` + `scripts/generate-competence-seeds.ts`)

Agent : `pedagogy-expert` (Opus) pour le contenu pédagogique des MD ; moi pour le script TS et le SQL
Statut : à venir après 1.2

### 1.4 — Types TypeScript

Agent : `typescript-expert` (Sonnet)
Statut : à venir après 1.3

Fichiers :

- `src/lib/types/skills.ts` (types métier `Family`, `KnowledgeType`, `MathCompetenceLevel`, etc.)
- `src/lib/types/database-helpers.ts` (extension : helpers `getSkillFamily()`, `getMathCompetenceLevel()`, etc.)

### 1.5 — Tests d'intégration

Agent : `test-automator` (Sonnet) + `supabase-expert` pour fixtures SQL
Statut : à venir après 1.4

Couverture :

- INSERT skill_attempts famille A → `student_skill_state_a` à jour
- INSERT skill_attempts famille B → cascade `student_observable_state` puis `student_competence_level`
- VIEW `to_review` correct selon âge `last_success_at`
- 6 règles conjonctives sur scénarios connus (Chercher : 4 niveaux ; idem pour les 5 autres)
- RLS : élève voit ses données, pas celles d'un autre élève
- RLS : prof voit les attempts de ses élèves, pas ceux d'autres classes

### 1.6 — Code review + security audit

Agents : `code-reviewer` (Opus) + `security-auditor` (Opus) en parallèle
Statut : à venir après 1.5

### 1.7 — Quality checks + commits

Statut : à venir après 1.6

- `pnpm check:incremental` (seulement les fichiers TS modifiés)
- `npx eslint <fichiers TS modifiés>`
- Commits agrégés par étape (1.1, 1.2, 1.3, 1.4, 1.5, 1.7 review en commit unique si fixes)

## Fichiers à produire (récap)

```
supabase/migrations/
  <ts>_competence_referentiel_schema.sql       (étape 1.1)
  <ts>_competence_referentiel_functions.sql    (étape 1.2)
  <ts>_competence_referentiel_seeds.sql        (étape 1.3)
scripts/
  generate-competence-seeds.ts                  (étape 1.3, helper)
src/lib/types/
  skills.ts                                     (étape 1.4)
  database-helpers.ts                           (étape 1.4, extension)
tests/integration/
  competence-referentiel.test.ts                (étape 1.5)
docs/wip/
  competence-referentiel-phase1-progress.md    (ce fichier, mis à jour entre étapes)
```

## Historique d'exécution

- **2026-06-09 — démarrage** : doc de progression créé, plan validé par David (3 fichiers séparés / script TS pour seeds / tests via supabase locale).
