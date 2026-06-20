# WIP — Retrait de `teacher_id` du cluster « classe assignée à un prof » (mono-prof)

> Branche : `refactor/mono-teacher-drop-class-teacher-id`
> Démarré : 2026-06-19. Crash-recovery doc.

## Objectif

Finir le passage mono-prof : supprimer la dimension multi-prof portée par
`teacher_id` sur le **cluster classes** (les classes ne sont plus « assignées à
un prof »). Propriété désormais portée par le **rôle** (`is_teacher_or_admin()`),
pas par `teacher_id = auth.uid()`. **Permissions effectives inchangées** (un seul
prof possède déjà tout) → refactor, pas élargissement de droits.

Décidé avec David (spec Phase 0 validée) : **Cluster 1 uniquement**.
Recos suivies : retirer les params `p_teacher_id` des RPC de classes + inclure
le housekeeping (drop RPC mortes + simplif `admin/classes`) dans cette PR.

## Périmètre — 6 tables (colonne `teacher_id` retirée)

`classes`, `class_chapters`, `class_journal_entries`, `class_schedules`,
`game_timeslots`, `evaluation_tasks` — + 6 FK, + trigger/fonction
`set_chapter_teacher_id`.

**Hors périmètre (gardent `teacher_id` = tampon propriétaire)** :
`google_classroom_courses`, `google_integrations`, `orphaned_documents`,
`rag_documents`, `teacher_vip_card_overrides`.
⚠️ Mais les **fonctions** qui _joignent_ `classes.teacher_id` (ex.
`get_teacher_override_impact`) doivent être réécrites (le JOIN classes change),
même si leur propre colonne `teacher_id` reste.

## Modèle cible / règles de réécriture

- Helper `is_class_teacher(class_id)` : `classes.teacher_id = auth.uid()` → `is_teacher_or_admin()`.
- Helper `is_class_teacher_of(p_teacher_id)` : `c.teacher_id = p_teacher_id` (classe de l'élève) → check rôle de `p_teacher_id` (teacher/admin).
- Policies des 6 tables : tout prédicat `teacher_id = auth.uid()` → `is_teacher_or_admin()`. Policies `admins_*`/`Admins can…` (via `is_admin()`) redondantes une fois le prof couvert → consolider/supprimer.
- `is_admin()` = **admin uniquement** (le commentaire « admin or teacher » est FAUX). Ne pas s'y fier pour couvrir le prof.
- RPC de classes (`get_teacher_classes_with_data`, `_with_students`, `_for_messaging`, `get_teacher_assignment_stats`) : retirer le param `p_teacher_id` + la colonne `teacher_id` du RETURNS + le filtre `WHERE c.teacher_id = …` (mono-prof → toutes les classes).
- Fonctions `SECURITY DEFINER` diverses référant `c.teacher_id = auth.uid()` → `is_teacher_or_admin()`.
- Dead RPCs supprimées : `get_student_teachers`, `get_teacher_students` (0 appelant, bug latent `classes.archived`).

## Plan d'exécution (TDD)

- [x] **Phase 1 — Tests** : `ClassBuilder` ne passe plus `teacher_id` (fait). Tests RLS des 6 tables → en cours.
- [x] **Phase 2 — Migration SQL** : `20260620090000_drop_class_teacher_id_mono_teacher.sql`. **Applique proprement** (`db:reset` OK) + scan : 0 fonction référence encore une colonne supprimée.
  - §1 helpers (`is_class_teacher`→role, `is_class_teacher_of`→role).
  - §2 policies des 6 tables → `is_teacher_or_admin()`.
  - §2b **29 policies externes** sur d'autres tables qui sous-requêtaient `classes.teacher_id` (trouvées par l'erreur de dépendance `db:reset`) → role-based ; 2 policies `rag_*` réécrites à la main (système OR docs du prof si inscrit).
  - §2c **12 policies** sur chapter sub-tables + `evaluation_task_perimeter` (deps sur colonnes dénormalisées, trouvées via `pg_policies`).
  - §3 RPC de classes : param `p_teacher_id` retiré, `teacher_id` retiré du RETURNS.
  - §4 ~25 fonctions SECURITY DEFINER ; §4b **`award_weekly_reward` + `compute_daily_summary`** (ratées par l'agent, `teacher_id = auth.uid()` bare → role) trouvées par scan `pg_get_functiondef`.
  - §5 drop trigger `set_chapter_teacher_id`. §6 drop 6 colonnes. §7 drop dead RPCs.
  - ⚠️ **Régression évitée** : l'agent avait redéfini `get_allowed_recipients`/`validate_message_recipients` depuis le baseline (aurait cassé Option B : élève hors-classe ne pouvait plus écrire au prof). Blocs **retirés** ; les versions live (Option B 20260618093000) restent.
- [~] **Phase 3 — App + types** : en cours.
  - `database.ts` régénéré depuis le **LOCAL** (`supabase gen types --local`) — ⚠️ PAS `pnpm db:types` (qui pointe sur EU prod, pas encore migrée).
  - RPC call sites corrigés : `students.ts` (×2), `api/messages/recipients`, `exercise-assignments` (param `p_teacher_id` retiré).
  - `admin/classes` : suppr. fetch profs + embed `teacher:profiles!classes_teacher_id_fkey` + colonne UI « Enseignant » + bloc form ; `create` n'insère plus teacher_id. `svelte-autofixer` OK.
  - Server ownership-checks réécrits role-based : `stats/teacher-class-auth.ts`, `kanban.isClassTeacher`, `chapters.createChapter`.
  - **Tests d'infra réparés** (la suite passait par `classes.teacher_id → profiles ON DELETE CASCADE`, supprimé) : `insertTestClass`, `cleanupAllTestData` (+ purge explicite classes/eval), `createEvaluationTask`, `cleanupCompetenceTestData`, `game-leaderboards.createClass`, `ClassBuilder`, factory `class()`.
  - **RESTE** : `journal.ts` (~5 sites + mapper `db.teacher_id`), `notifications.ts`, `vip-card-queries.ts`, `admin/notifications`, caches client (`student-cache`/`teacher-cache`) + tout ce que `check:incremental` remonte. **Diagnostiquer 6 échecs résiduels** de la suite complète.
  - Suite intégration : 24→6 échecs (test-infra), les 3 fichiers ciblés repassent verts isolément.
- [~] **Phase 4 — Revue** :
  - `security-auditor` : **CLEAN** (0 Critical/High/Medium). RLS préservée, pas d'escalade, service-role non bypassé, frontières élève intactes. 2 notes Low (warnings admin-inclusive, filtre `status='active'` retiré dans qq fn VIP) → à documenter.
  - `code-reviewer` : **MUST-FIX M1** — ~139 refs dans ~55 fichiers route/page interrogent encore les colonnes supprimées (`.eq('teacher_id', user.id)`, `.select('teacher_id')`→garde `x.teacher_id !== user.id`, embeds `classes!inner(teacher_id)`). `check:incremental` ne les voit PAS (strings supabase non typées) ; la suite intégration ne couvre pas ces routes → 500 en prod sinon. **Sweep en cours** (agents par groupe + `api/google/**` à la main, KEEP google_classroom_courses).
  - Triage KEEP (ne PAS toucher) : `google_classroom_courses`, `google_integrations`, `rag_documents`, `orphaned_documents`, `teacher_vip_card_overrides`, params RPC `p_teacher_id` (award_achievement_manual, validate_riddle_attempt), `vip_activation_requests`.
  - **Sweep FAIT** : 5 agents `backend-developer` (chapters API ×18, teacher/cours ×3, teacher misc ×13, api marketplace/worksheets/etc ×17, python/student/misc ×~14) + `api/google/**` à la main (mixte KEEP/DROP) + `gamification/rewards` (oublié des lots). **Sweep source = 0 réf DROP restante**, `check:incremental` = **0 erreur**. Agents ont aussi trouvé un bug préexistant (`exercises` utilise `created_by`, pas `teacher_id`).
  - Student-facing (`student/+layout`, `student/cours`, `api/student/profile`) : embed `teacher:teacher_id` retiré → résolution du prof unique via `profiles.eq('role','teacher')`, shape identique.
  - **Tests** : 9 tests unitaires serveur cassés par le sweep (5 cas obsolètes « autre prof → 403 » à supprimer ; 4 mocks à recâbler : kanban `isClassTeacher`→profiles.role, shared-coursework DELETE). Réparés par `test-automator` (en cours).
  - **Tests réparés** (test-automator) : 5 cas obsolètes « autre prof → 403 » supprimés ; 4 mocks recâblés (kanban, shared-coursework DELETE). `pnpm test:server` complet = **31848 pass**, 1 seul échec **pré-existant** (`futureDateSchema > should accept today` — bug timezone UTC/local, hors-sujet ; session a passé minuit).
  - Polish reviewer S2 : params `teacherId` inutilisés de `journal.ts` → `_teacherId` (`argsIgnorePattern: '^_'`), JSDoc corrigée.

## État final (DoD)

- `check:incremental` = **0 erreur** (46 warnings pré-existants).
- Migration applique proprement (`db:reset`), 0 fonction référence une colonne supprimée.
- **Sweep source = 0 réf DROP** (≈55 fichiers route/page).
- Intégration verte sur DB propre (sauf 2 tests `admin-elevation` pré-existants = env local `PUBLIC_SUPABASE_URL` → prod).
- `test:server` complet vert (sauf 1 test date pré-existant).
- `security-auditor` CLEAN ; `code-reviewer` M1 (sweep) résolu.
- **109 fichiers** (+4404/−1109).

- [ ] **Phase 5 — PR** : branche → PR → CI verte. **STOP avant merge + `db:migrate` prod** (accord explicite de David requis ; release sous `maintenance:on` car destructif). ⚠️ eslint complet = CI-only (OOM local) : possible round-trip.
- À documenter (notes Low de l'audit) : warnings admin-inclusive + filtre `status='active'` retiré (qq fn VIP) → `database-schema.md`.

## Notes / pièges

- Trigger mono-prof interdit ≥ 2 comptes `teacher` → chaque test ne crée qu'UN teacher ; `cleanupAllTestData()` entre les tests.
- Membership élève via `class_members` (+ `is_class_student(class_id)`).
- plpgsql ne valide pas le corps à la création → une fonction oubliée ne bloque pas la migration mais casse au runtime → la suite d'intégration est le filet.
